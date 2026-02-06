const connection = require("../db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const io = require('socket.io-client');
require('dotenv').config();

const today = new Date().toISOString().split('T')[0];

// Connect to the AI server for prescription extraction
// In Docker, this should point to the prescription_extraction service name.
// Allow overriding via env for local/non-Docker setups.
const SERVER_URL = process.env.PRESCRIPTION_AI_URL || `http://localhost:3002`;
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure temporary local storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../temp');
    // Create the temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create multer instance
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

socket.on('connect', () => {
  console.log('Connected to prescription extraction service');
});

socket.on('connect_error', (error) => {
  console.error('Unable to connect to prescription extraction ai service');
});

const uploadPrescription = (req, res) => {
  const { user_id } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: "Missing required user_id" });
  }
  
  if (!socket.connected) {
    return res.status(500).json({ error: "Prescription extraction ai service is unavailable" });
  }

  // Handle the file upload using multer for temporary storage
  upload.single("prescription")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No prescription image uploaded" });

    try {
      // Upload file to Cloudinary
      const tempFilePath = req.file.path;
      const result = await cloudinary.uploader.upload(tempFilePath, {
        folder: "prescriptions",
        resource_type: "image"
      });
      const imageUrl = result.secure_url;
      
      // Remove temp file after uploading to Cloudinary
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Failed to delete temporary file:", err);
      });
      
      console.log("Prescription image uploaded to Cloudinary:", imageUrl);
      
      // Create a promise to handle the socket.io response
      const extractionPromise = new Promise((resolve, reject) => {
        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error("Prescription extraction timed out"));
        }, 30000); // 30 second timeout
        
        // Listen for the extraction response
        socket.once('prescription_extracted', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });
        
        // Send the image URL to the AI service
        socket.emit('prescription_extraction', imageUrl);
      });
      
      // Wait for the extraction results
      const extractionData = await extractionPromise;
      console.log("Prescription extraction data received:", extractionData);
      
      // Check if the AI server returned an error
      if (extractionData.error) {
        return res.status(400).json({ error: extractionData.error });
      }
      
      // Create the course with the extracted data
      const status = "Ongoing";
      const doctor_id = extractionData.doctor_id || 1; // Use the extracted doctor ID or default to 1
      
      connection.beginTransaction(async (transactionErr) => {
        if (transactionErr) {
          return res.status(500).json({ error: `Transaction error: ${transactionErr.message}` });
        }
        
        try {
          // 1. Create the course
          const createCourseResult = await queryAsync(
            "INSERT INTO Courses (user_id, doctor_id, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
            [
              user_id, 
              doctor_id, 
              status, 
              extractionData.start_date === null || !extractionData.start_date ? today : extractionData.start_date, 
              extractionData.end_date
            ]
          );
          
          const course_id = createCourseResult.insertId;
          
          // 2. Save the prescription image URL
          await queryAsync(
            "INSERT INTO PrescriptionImages (course_id, image_url) VALUES (?, ?)",
            [course_id, imageUrl]
          );
          
          // 3. Create medicine courses
          const medicineCourseValues = extractionData.medicineCourses.map(medicine => [
            course_id,
            medicine.medicine_name,
            status,
            medicine.start_date === null || !medicine.start_date ? today : medicine.start_date,
            medicine.end_date,
            medicine.frequency,
            medicine.medtype
          ]);
          
          const medicineCourseResult = await queryAsync(
            "INSERT INTO MedicineCourses (course_id, medicine_name, status, start_date, end_date, frequency, medtype) VALUES ?",
            [medicineCourseValues]
          );
          
          // 4. Create medicine intakes for each medicine course
          let medicineIntakesCreated = 0;
          
          for (let i = 0; i < extractionData.medicineCourses.length; i++) {
            const medicine = extractionData.medicineCourses[i];
            const medicine_course_id = medicineCourseResult.insertId + i;
            
            let intakeValues = [];
            let currentDate = new Date(medicine.start_date);
            let endDate = new Date(medicine.end_date);
            
            while (currentDate <= endDate) {
              const formattedDate = currentDate.toISOString().split("T")[0];
              
              const times = [
                { hour: "08:00:00", flag: 0 },
                { hour: "12:00:00", flag: 1 },
                { hour: "18:00:00", flag: 2 },
                { hour: "22:00:00", flag: 3 }
              ];
              
              times.forEach(({ hour, flag }) => {
                if (medicine.frequency[flag] === "1") {
                  const datetime = `${formattedDate} ${hour}`;
                  const beforeafter = medicine.medtype === "0" ? 0 : 1;
                  intakeValues.push([medicine_course_id, datetime, beforeafter]);
                }
              });
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            if (intakeValues.length > 0) {
              await queryAsync(
                "INSERT INTO MedicineIntakes (medicine_course_id, scheduled_at, beforeafter) VALUES ?",
                [intakeValues]
              );
              medicineIntakesCreated += intakeValues.length;
            }
          }
          
          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                res.status(500).json({ error: `Commit error: ${commitErr.message}` });
              });
            }
            
            res.status(201).json({
              message: "Prescription uploaded and processed successfully",
              course_id: course_id,
              medicines_created: medicineCourseValues.length,
              intakes_created: medicineIntakesCreated,
              prescription_image: imageUrl
            });
          });
          
        } catch (error) {
          connection.rollback(() => {
            console.error("Database error:", error);
            res.status(500).json({ error: `Database error: ${error.message}` });
          });
        }
      });
      
    } catch (error) {
      // Clean up temp file if upload to Cloudinary fails
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      console.error("Extraction or upload error:", error);
      res.status(500).json({ error: `Failed to process prescription: ${error.message}` });
    }
  });
};

// Helper function to promisify database queries
function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// Updated uploadVoiceNote function to use Cloudinary
const uploadVoiceNote = (req, res) => {
  const course_id = req.params.course_id;
  
  upload.single("voiceNote")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    try {
      // Upload to Cloudinary
      const tempFilePath = req.file.path;
      const result = await cloudinary.uploader.upload(tempFilePath, {
        folder: "voice_notes",
        resource_type: "auto"
      });
      const voiceUrl = result.secure_url;
      
      // Remove temp file after uploading to Cloudinary
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Failed to delete temporary file:", err);
      });
      
      const sql = "INSERT INTO PrescriptionVoiceNotes (course_id, voice_url) VALUES (?, ?)";
      connection.query(sql, [course_id, voiceUrl], (dbErr, result) => {
        if (dbErr) return res.status(500).json({ error: dbErr.message });

        res.json({ 
          message: "Voice note uploaded successfully", 
          file: {
            url: voiceUrl,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      });
    } catch (error) {
      // Clean up temp file if upload to Cloudinary fails
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }
      console.error("Cloudinary upload error:", error);
      res.status(500).json({ error: `Failed to upload voice note: ${error.message}` });
    }
  });
};

module.exports = {
  uploadPrescription,
  uploadVoiceNote,
};