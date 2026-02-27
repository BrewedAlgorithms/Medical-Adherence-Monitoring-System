/**
 * Runs database migrations on startup.
 * Creates all required tables from main.sql if they don't exist.
 * Ensures schema is up-to-date when using Docker with persisted volumes.
 */
const connection = require('./db.js');
const { waitForDatabase } = require('./db.js');

// Tables in dependency order (FKs reference earlier tables)
const migrations = [
  `CREATE TABLE IF NOT EXISTS Users (
    user_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    phone BIGINT NOT NULL UNIQUE,
    email VARCHAR(255),
    address VARCHAR(255),
    otp VARCHAR(10),
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    role ENUM('doctor', 'patient') NOT NULL DEFAULT 'patient',
    PRIMARY KEY (user_id),
    isprofilecomplete BOOL NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS AuthTokens (
    token_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    PRIMARY KEY (token_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS Courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    status ENUM('Ongoing', 'Completed', 'Terminated') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS MedicineCourses (
    medicine_course_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    status ENUM('Ongoing', 'Completed', 'Terminated') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    frequency CHAR(4),
    medtype CHAR(1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS MedicineIntakes (
    intake_id INT PRIMARY KEY AUTO_INCREMENT,
    medicine_course_id INT NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    beforeafter BOOL NOT NULL,
    taken_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_course_id) REFERENCES MedicineCourses(medicine_course_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS MediQuotes (
    medi_quote_id INT PRIMARY KEY AUTO_INCREMENT,
    quote VARCHAR(255),
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS QuoteOfTheDay (
    qotd_id INT PRIMARY KEY AUTO_INCREMENT,
    medi_quote_id INT,
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medi_quote_id) REFERENCES MediQuotes(medi_quote_id)
  )`,
  `CREATE TABLE IF NOT EXISTS PrescriptionImages (
    image_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS PrescriptionVoiceNotes (
    voice_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    voice_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS UserNotes (
    note_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    note VARCHAR(1000) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS MedicationTimes (
    time_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    morning_time TIME DEFAULT '08:00:00',
    afternoon_time TIME DEFAULT '13:00:00',
    evening_time TIME DEFAULT '18:00:00',
    night_time TIME DEFAULT '21:00:00',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (time_id),
    KEY idx_medication_times_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS PrescriptionDrafts (
    draft_id       INT PRIMARY KEY AUTO_INCREMENT,
    user_id        INT NOT NULL,
    image_url      VARCHAR(512) NOT NULL,
    extracted_data JSON NOT NULL,
    status         ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  )`,
];


async function runMigrations() {
  try {
    await waitForDatabase();
    for (const sql of migrations) {
      await new Promise((resolve, reject) => {
        connection.query(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('Migrations completed - all tables ensured');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

runMigrations();
