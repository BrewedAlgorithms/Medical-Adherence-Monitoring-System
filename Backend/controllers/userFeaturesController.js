const connection = require("../db.js");

// ** db **

// drop database HealthMobi;
// create schema HealthMobi;
// use HealthMobi;

// -- CREATE TABLE STATEMENTS
// CREATE TABLE Users (
//   user_id INT NOT NULL AUTO_INCREMENT,
//   name VARCHAR(255),
//   phone BIGINT NOT NULL UNIQUE,
//   email VARCHAR(255),
//   address VARCHAR(255),
//   otp VARCHAR(10),
//   language VARCHAR(50) NOT NULL DEFAULT 'English',
//   role ENUM('doctor', 'patient') NOT NULL DEFAULT 'patient',
//   PRIMARY KEY (user_id),
//   isprofilecomplete bool not null default false
// );

// CREATE TABLE AuthTokens (
//   token_id INT NOT NULL AUTO_INCREMENT,
//   user_id INT NOT NULL,
//   auth_token VARCHAR(255) NOT NULL,
//   PRIMARY KEY (token_id),
//   FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
// );

// CREATE TABLE Courses (
//   course_id INT PRIMARY KEY AUTO_INCREMENT,
//   user_id INT NOT NULL,
//   doctor_id INT NOT NULL,
//   status ENUM('Ongoing', 'Completed', 'Terminated') NOT NULL,
//   start_date DATE NOT NULL,
//   end_date DATE,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
//   FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE
// );

// CREATE TABLE MedicineCourses (
//   medicine_course_id INT PRIMARY KEY AUTO_INCREMENT,
//   course_id INT NOT NULL,
//   medicine_name VARCHAR(255) NOT NULL,
//   status ENUM('Ongoing', 'Completed', 'Terminated') NOT NULL,
//   start_date DATE NOT NULL,
//   end_date DATE,
//   frequency CHAR(4),
//   medtype CHAR(1),
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
// );

// CREATE TABLE MedicineIntakes (
//   intake_id INT PRIMARY KEY AUTO_INCREMENT,
//   medicine_course_id INT NOT NULL,
//   scheduled_at TIMESTAMP NOT NULL,
//   beforeafter BOOL NOT NULL,
//   taken_at TIMESTAMP,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   FOREIGN KEY (medicine_course_id) REFERENCES MedicineCourses(medicine_course_id) ON DELETE CASCADE
// );

// CREATE TABLE MediQuotes (
//     medi_quote_id INT PRIMARY KEY AUTO_INCREMENT,
//     quote VARCHAR(255),
//     language ENUM('English', 'Hindi', 'Marathi') NOT NULL
// );

// CREATE TABLE QuoteOfTheDay (
//     qotd_id INT PRIMARY KEY AUTO_INCREMENT,
//     medi_quote_id INT,
//     language ENUM('English', 'Hindi', 'Marathi') NOT NULL,
//     last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//     FOREIGN KEY (medi_quote_id) REFERENCES MediQuotes(medi_quote_id)
// );

// CREATE TABLE PrescriptionImages (
//   image_id INT PRIMARY KEY AUTO_INCREMENT,
//   course_id INT NOT NULL,
//   image_url VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
// );

// CREATE TABLE PrescriptionVoiceNotes (
//   voice_id INT PRIMARY KEY AUTO_INCREMENT,
//   course_id INT NOT NULL,
//   voice_url VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
// );

// CREATE TABLE UserNotes (
//   note_id INT PRIMARY KEY AUTO_INCREMENT,
//   user_id INT NOT NULL unique,
//   note VARCHAR(1000) NOT NULL default '',
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
// );

// CREATE TABLE MedicationTimes (
//     time_id INT NOT NULL AUTO_INCREMENT,
//     user_id INT NOT NULL,
//     morning_time TIME DEFAULT '08:00:00',
//     afternoon_time TIME DEFAULT '13:00:00',
//     evening_time TIME DEFAULT '18:00:00',
//     night_time TIME DEFAULT '21:00:00',
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//     PRIMARY KEY (time_id),
//     KEY user_id (user_id)
// );




// -- TRUNCATE STATEMENTS
// -- TRUNCATE TABLE Users;
// -- TRUNCATE TABLE AuthTokens;
// -- TRUNCATE TABLE Courses;
// -- TRUNCATE TABLE MedicineCourses;
// -- TRUNCATE TABLE MedicineIntakes;
// -- TRUNCATE TABLE MediQuotes;
// -- TRUNCATE TABLE QuoteOfTheDay;
// -- TRUNCATE TABLE PrescriptionImages;
// -- TRUNCATE TABLE PrescriptionVoiceNotes;
// -- TRUNCATE TABLE UserNotes;
// -- TRUNCATE TABLE MedicationTimes;


// -- SELECT STATEMENTS
// SELECT * FROM Users;
// SELECT * FROM AuthTokens;
// SELECT * FROM Courses;
// SELECT * FROM MedicineCourses;
// SELECT * FROM MedicineIntakes;
// SELECT * FROM MediQuotes;
// SELECT * FROM QuoteOfTheDay;
// SELECT * FROM PrescriptionImages;
// SELECT * FROM PrescriptionVoiceNotes;
// SELECT * FROM UserNotes;
// SELECT * FROM MedicationTimes;




// ** db **

const updateUserNotes = (req, res) => {
    const { note, user_id } = req.body;

    if (!user_id || !note) {
        return res.status(400).json({ error: "user_id and note are required" });
    }

    const checkQuery = "SELECT note_id FROM UserNotes WHERE user_id = ?";
    connection.query(checkQuery, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (results.length > 0) {
            const updateQuery = "UPDATE UserNotes SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?";
            connection.query(updateQuery, [note, user_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to update note", details: err });
                }
                return res.status(200).json({ message: "Note updated successfully" });
            });
        } else {
            const insertQuery = "INSERT INTO UserNotes (user_id, note) VALUES (?, ?)";
            connection.query(insertQuery, [user_id, note], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to create note", details: err });
                }
                return res.status(201).json({ message: "Note created successfully" });
            });
        }
    });
};

// Get user notes
const getUserNotes = (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const query = "SELECT note FROM UserNotes WHERE user_id = ?";
    connection.query(query, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Note not found" });
        }

        return res.status(200).json(results[0]);
    });
}

// Get user profile
const getUserProfile = (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const query = "SELECT name, phone, email, address, language, role FROM Users WHERE user_id = ?";
    connection.query(query, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(results[0]);
    });
}


// Get user medication times
const getMedicationTimes = (req, res) => {
    // Usually user_id comes from auth middleware via req.user or res.locals.user
    // But aligning with other functions in this file, we get it from req.body
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    const query = "SELECT morning_time, afternoon_time, evening_time, night_time FROM MedicationTimes WHERE user_id = ?";
    connection.query(query, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Medication times not found for this user" });
        }

        return res.status(200).json(results[0]);
    });
};

// Update user medication times
const updateMedicationTimes = (req, res) => {
    const { user_id, morning_time, afternoon_time, evening_time, night_time } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
    }

    // Validate time format (HH:MM:SS or HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):?([0-5]\d)(:?([0-5]\d))?$/;

    if (morning_time && !timeRegex.test(morning_time)) return res.status(400).json({ error: "Invalid morning_time format. Use HH:MM:SS" });
    if (afternoon_time && !timeRegex.test(afternoon_time)) return res.status(400).json({ error: "Invalid afternoon_time format. Use HH:MM:SS" });
    if (evening_time && !timeRegex.test(evening_time)) return res.status(400).json({ error: "Invalid evening_time format. Use HH:MM:SS" });
    if (night_time && !timeRegex.test(night_time)) return res.status(400).json({ error: "Invalid night_time format. Use HH:MM:SS" });

    // Build dynamic update query
    let updates = [];
    let params = [];

    if (morning_time) { updates.push("morning_time = ?"); params.push(morning_time); }
    if (afternoon_time) { updates.push("afternoon_time = ?"); params.push(afternoon_time); }
    if (evening_time) { updates.push("evening_time = ?"); params.push(evening_time); }
    if (night_time) { updates.push("night_time = ?"); params.push(night_time); }

    if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update provided" });
    }

    // Add user_id to params for WHERE clause
    params.push(user_id);

    const checkQuery = "SELECT time_id FROM MedicationTimes WHERE user_id = ?";
    connection.query(checkQuery, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Database error", details: err });
        }

        if (results.length > 0) {
            const updateQuery = `UPDATE MedicationTimes SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
            connection.query(updateQuery, params, (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ error: "Failed to update medication times", details: updateErr });
                }
                return res.status(200).json({ message: "Medication times updated successfully" });
            });
        } else {
            // Edge case: if User was created before MedicationTimes table existed or it was deleted
            // Note: For INSERT we need all 4 values or rely on DB defaults if missing
            return res.status(404).json({ error: "Medication times record not found for this user. Please contact support." });
        }
    });
};

module.exports = {
    updateUserNotes,
    getUserNotes,
    getUserProfile,
    getMedicationTimes,
    updateMedicationTimes
};
