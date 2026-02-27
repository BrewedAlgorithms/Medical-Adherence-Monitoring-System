const connection = require("../db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const io = require('socket.io-client');
require('dotenv').config();
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');

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

// ---------------------------------------------------------------------------
// PHASE 1: Upload prescription image, call AI, store result as a DRAFT.
//          Nothing is written to Courses / MedicineCourses / MedicineIntakes yet.
//          Returns { draft_id, extracted_data, image_url } so the client can
//          show the human the AI output for review / correction.
// ---------------------------------------------------------------------------
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
        // Increased to 60 seconds to accommodate image download and AI processing
        const timeout = setTimeout(() => {
          reject(new Error("Prescription extraction timed out"));
        }, 60000); // 60 second timeout

        // Listen for the extraction response
        socket.once('prescription_extracted', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });

        // Listen for errors from the extraction service
        socket.once('error', (errorData) => {
          clearTimeout(timeout);
          reject(new Error(errorData.message || "Prescription extraction failed"));
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

      // -----------------------------------------------------------------------
      // HUMAN-IN-THE-LOOP: Save AI output as a pending draft instead of
      // immediately committing to Courses / MedicineCourses / MedicineIntakes.
      // -----------------------------------------------------------------------
      const draftSql = `
        INSERT INTO PrescriptionDrafts (user_id, image_url, extracted_data, status)
        VALUES (?, ?, ?, 'pending')
      `;

      connection.query(draftSql, [user_id, imageUrl, JSON.stringify(extractionData)], (dbErr, draftResult) => {
        if (dbErr) {
          console.error("Failed to save prescription draft:", dbErr);
          return res.status(500).json({ error: `Failed to save draft: ${dbErr.message}` });
        }

        const draft_id = draftResult.insertId;
        console.log(`Prescription draft created with draft_id=${draft_id}`);

        return res.status(201).json({
          message: "Prescription extracted and saved as draft. Please review the extracted data.",
          draft_id,
          extracted_data: extractionData,
          image_url: imageUrl
        });
      });

    } catch (error) {
      // Clean up temp file if upload to Cloudinary fails
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => { });
      }
      console.error("Extraction or upload error:", error);
      res.status(500).json({ error: `Failed to process prescription: ${error.message}` });
    }
  });
};

// ---------------------------------------------------------------------------
// GET /prescriptionDraft/:draft_id
// Returns the draft row so the client can render a review / edit UI.
// ---------------------------------------------------------------------------
const getDraft = (req, res) => {
  const { draft_id } = req.params;

  const sql = `
    SELECT draft_id, user_id, image_url, extracted_data, status, created_at, updated_at
    FROM PrescriptionDrafts
    WHERE draft_id = ?
  `;

  connection.query(sql, [draft_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Draft not found" });

    const draft = rows[0];
    // extracted_data is stored as a JSON string; parse if needed
    if (typeof draft.extracted_data === 'string') {
      draft.extracted_data = JSON.parse(draft.extracted_data);
    }

    return res.status(200).json(draft);
  });
};

// ---------------------------------------------------------------------------
// PUT /prescriptionDraft/:draft_id
// Human submits corrections to the extracted data. Only pending drafts can
// be updated.
// ---------------------------------------------------------------------------
const updateDraft = (req, res) => {
  const { draft_id } = req.params;
  const { extracted_data } = req.body;

  if (!extracted_data) {
    return res.status(400).json({ error: "Missing extracted_data in request body" });
  }

  // Ensure it's a valid JSON object / non-empty
  let dataToStore;
  try {
    dataToStore = typeof extracted_data === 'string'
      ? JSON.parse(extracted_data)   // validate it is parseable
      : extracted_data;
  } catch (_) {
    return res.status(400).json({ error: "extracted_data must be valid JSON" });
  }

  const sql = `
    UPDATE PrescriptionDrafts
    SET extracted_data = ?, updated_at = CURRENT_TIMESTAMP
    WHERE draft_id = ? AND status = 'pending'
  `;

  connection.query(sql, [JSON.stringify(dataToStore), draft_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Draft not found or is no longer in 'pending' status and cannot be edited."
      });
    }

    return res.status(200).json({ message: "Draft updated successfully." });
  });
};

// ---------------------------------------------------------------------------
// POST /prescriptionDraft/:draft_id/confirm
// Human has reviewed (and optionally corrected) the draft. This endpoint
// runs the original transaction: Courses → MedicineCourses → MedicineIntakes,
// then marks the draft as 'confirmed'.
// ---------------------------------------------------------------------------
const confirmPrescription = (req, res) => {
  const { draft_id } = req.params;

  // 1. Fetch the draft
  const fetchSql = `
    SELECT user_id, image_url, extracted_data, status
    FROM PrescriptionDrafts
    WHERE draft_id = ?
  `;

  connection.query(fetchSql, [draft_id], (fetchErr, rows) => {
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Draft not found" });

    const draft = rows[0];

    if (draft.status !== 'pending') {
      return res.status(409).json({
        error: `Draft is already '${draft.status}'. Only pending drafts can be confirmed.`
      });
    }

    let extractionData;
    try {
      extractionData = typeof draft.extracted_data === 'string'
        ? JSON.parse(draft.extracted_data)
        : draft.extracted_data;
    } catch (_) {
      return res.status(500).json({ error: "Draft contains malformed extracted_data." });
    }

    const { user_id, image_url: imageUrl } = draft;
    const status = "Ongoing";
    const doctor_id = extractionData.doctor_id || 1;

    // 2. Begin transaction to commit the prescription data
    connection.getConnection((connErr, txConn) => {
      if (connErr) {
        console.error("Failed to get DB connection for transaction:", connErr);
        return res.status(500).json({ error: `Transaction connection error: ${connErr.message}` });
      }

      txConn.beginTransaction(async (transactionErr) => {
        if (transactionErr) {
          txConn.release();
          return res.status(500).json({ error: `Transaction error: ${transactionErr.message}` });
        }

        try {
          // 2a. Create the course
          const createCourseResult = await queryAsyncWithConn(
            txConn,
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

          // 2b. Save the prescription image URL
          await queryAsyncWithConn(
            txConn,
            "INSERT INTO PrescriptionImages (course_id, image_url) VALUES (?, ?)",
            [course_id, imageUrl]
          );

          // 2c. Create medicine courses
          const medicineCourseValues = extractionData.medicineCourses.map(medicine => [
            course_id,
            medicine.medicine_name,
            status,
            medicine.start_date === null || !medicine.start_date ? today : medicine.start_date,
            medicine.end_date,
            medicine.frequency,
            medicine.medtype
          ]);

          const medicineCourseResult = await queryAsyncWithConn(
            txConn,
            "INSERT INTO MedicineCourses (course_id, medicine_name, status, start_date, end_date, frequency, medtype) VALUES ?",
            [medicineCourseValues]
          );

          // 2d. Fetch user's medication times
          const userTimesResult = await queryAsyncWithConn(
            txConn,
            "SELECT * FROM MedicationTimes WHERE user_id = ?",
            [user_id]
          );

          const usertimes = userTimesResult.length > 0 ? {
            morning_time: userTimesResult[0].morning_time,
            afternoon_time: userTimesResult[0].afternoon_time,
            evening_time: userTimesResult[0].evening_time,
            night_time: userTimesResult[0].night_time
          } : {
            morning_time: "08:00:00",
            afternoon_time: "12:00:00",
            evening_time: "18:00:00",
            night_time: "22:00:00"
          };

          // 2e. Create medicine intakes for each medicine course
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
                { hour: usertimes.morning_time, flag: 0 },
                { hour: usertimes.afternoon_time, flag: 1 },
                { hour: usertimes.evening_time, flag: 2 },
                { hour: usertimes.night_time, flag: 3 }
              ];

              times.forEach(({ hour, flag }) => {
                if (medicine.frequency[flag] === "1") {
                  const beforeafter = medicine.medtype === "0" ? 0 : 1;
                  const baseTime = moment(`${formattedDate} ${hour}`, 'YYYY-MM-DD HH:mm:ss');
                  if (beforeafter === 1) baseTime.add(30, 'minutes');
                  const datetime = baseTime.format('YYYY-MM-DD HH:mm:ss');
                  intakeValues.push([medicine_course_id, datetime, beforeafter]);
                }
              });

              currentDate.setDate(currentDate.getDate() + 1);
            }

            if (intakeValues.length > 0) {
              await queryAsyncWithConn(
                txConn,
                "INSERT INTO MedicineIntakes (medicine_course_id, scheduled_at, beforeafter) VALUES ?",
                [intakeValues]
              );
              medicineIntakesCreated += intakeValues.length;

              // Set default pill stock = provided in draft, OR total intakes for this medicine
              const initialStock = (medicine.pill_stock !== undefined && medicine.pill_stock !== null && !isNaN(medicine.pill_stock))
                ? parseInt(medicine.pill_stock)
                : intakeValues.length;

              await queryAsyncWithConn(
                txConn,
                "UPDATE MedicineCourses SET pill_stock = ? WHERE medicine_course_id = ?",
                [initialStock, medicine_course_id]
              );
            }
          }

          // 2f. Mark draft as confirmed
          await queryAsyncWithConn(
            txConn,
            "UPDATE PrescriptionDrafts SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE draft_id = ?",
            [draft_id]
          );

          txConn.commit((commitErr) => {
            if (commitErr) {
              return txConn.rollback(() => {
                txConn.release();
                res.status(500).json({ error: `Commit error: ${commitErr.message}` });
              });
            }

            txConn.release();
            res.status(201).json({
              message: "Prescription confirmed and processed successfully",
              course_id,
              medicines_created: medicineCourseValues.length,
              intakes_created: medicineIntakesCreated,
              prescription_image: imageUrl
            });
          });

        } catch (error) {
          txConn.rollback(() => {
            txConn.release();
            console.error("Database error during prescription confirm:", error);
            res.status(500).json({ error: `Database error: ${error.message}` });
          });
        }
      });
    });
  });
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function queryAsyncWithConn(conn, sql, params) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, result) => {
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
        fs.unlink(req.file.path, () => { });
      }
      console.error("Cloudinary upload error:", error);
      res.status(500).json({ error: `Failed to upload voice note: ${error.message}` });
    }
  });
};

module.exports = {
  uploadPrescription,
  getDraft,
  updateDraft,
  confirmPrescription,
  uploadVoiceNote,
};