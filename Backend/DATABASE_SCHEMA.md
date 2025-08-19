# Medical Adherence Monitoring System - Database Schema Documentation

## 📋 Overview

The Medical Adherence Monitoring System uses MySQL as its primary database system. This document provides comprehensive documentation of the database schema, including table structures, relationships, constraints, and usage examples.

**Database Name:** `HealthMobi`

## 🗂️ Database Tables

### 1. Users Table
**Purpose:** Stores user information for both patients and doctors

```sql
CREATE TABLE Users (
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
);
```

**Columns:**
- `user_id` - Primary key, auto-incrementing unique identifier
- `name` - User's full name (nullable)
- `phone` - Unique phone number (required)
- `email` - Email address (nullable)
- `address` - Physical address (nullable)
- `otp` - One-time password for authentication (nullable)
- `language` - Preferred language (default: 'English')
- `role` - User role: 'doctor' or 'patient' (default: 'patient')
- `isprofilecomplete` - Profile completion status (default: FALSE)

**Constraints:**
- Primary Key: `user_id`
- Unique: `phone`
- Foreign Key References: Referenced by multiple tables

### 2. AuthTokens Table
**Purpose:** Manages authentication tokens for user sessions

```sql
CREATE TABLE AuthTokens (
  token_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  auth_token VARCHAR(255) NOT NULL,
  PRIMARY KEY (token_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

**Columns:**
- `token_id` - Primary key, auto-incrementing unique identifier
- `user_id` - Foreign key to Users table
- `auth_token` - Authentication token string

**Constraints:**
- Primary Key: `token_id`
- Foreign Key: `user_id` → `Users.user_id` (CASCADE DELETE)

### 3. Courses Table
**Purpose:** Represents medical treatment courses assigned by doctors to patients

```sql
CREATE TABLE Courses (
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
);
```

**Columns:**
- `course_id` - Primary key, auto-incrementing unique identifier
- `user_id` - Patient ID (foreign key to Users)
- `doctor_id` - Doctor ID (foreign key to Users)
- `status` - Course status: 'Ongoing', 'Completed', 'Terminated'
- `start_date` - Course start date (required)
- `end_date` - Course end date (nullable)
- `created_at` - Record creation timestamp
- `updated_at` - Record last update timestamp

**Constraints:**
- Primary Key: `course_id`
- Foreign Keys: 
  - `user_id` → `Users.user_id` (CASCADE DELETE)
  - `doctor_id` → `Users.user_id` (CASCADE DELETE)

### 4. MedicineCourses Table
**Purpose:** Defines specific medicines within a treatment course

```sql
CREATE TABLE MedicineCourses (
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
);
```

**Columns:**
- `medicine_course_id` - Primary key, auto-incrementing unique identifier
- `course_id` - Foreign key to Courses table
- `medicine_name` - Name of the medicine (required)
- `status` - Medicine course status: 'Ongoing', 'Completed', 'Terminated'
- `start_date` - Medicine start date (required)
- `end_date` - Medicine end date (nullable)
- `frequency` - Dosage frequency (4-character code)
- `medtype` - Medicine type (1-character code)
- `created_at` - Record creation timestamp
- `updated_at` - Record last update timestamp

**Constraints:**
- Primary Key: `medicine_course_id`
- Foreign Key: `course_id` → `Courses.course_id` (CASCADE DELETE)

### 5. MedicineIntakes Table
**Purpose:** Tracks individual medicine intake events

```sql
CREATE TABLE MedicineIntakes (
  intake_id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_course_id INT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  beforeafter BOOL NOT NULL,
  taken_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (medicine_course_id) REFERENCES MedicineCourses(medicine_course_id) ON DELETE CASCADE
);
```

**Columns:**
- `intake_id` - Primary key, auto-incrementing unique identifier
- `medicine_course_id` - Foreign key to MedicineCourses table
- `scheduled_at` - Scheduled intake time (required)
- `beforeafter` - Boolean indicating before/after meal
- `taken_at` - Actual intake time (nullable, set when medicine is taken)
- `created_at` - Record creation timestamp
- `updated_at` - Record last update timestamp

**Constraints:**
- Primary Key: `intake_id`
- Foreign Key: `medicine_course_id` → `MedicineCourses.medicine_course_id` (CASCADE DELETE)

### 6. MediQuotes Table
**Purpose:** Stores motivational medical quotes in multiple languages

```sql
CREATE TABLE MediQuotes (
    medi_quote_id INT PRIMARY KEY AUTO_INCREMENT,
    quote VARCHAR(255),
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL
);
```

**Columns:**
- `medi_quote_id` - Primary key, auto-incrementing unique identifier
- `quote` - The motivational quote text (nullable)
- `language` - Quote language: 'English', 'Hindi', 'Marathi'

**Constraints:**
- Primary Key: `medi_quote_id`
- Foreign Key References: Referenced by QuoteOfTheDay table

### 7. QuoteOfTheDay Table
**Purpose:** Manages daily motivational quotes for users

```sql
CREATE TABLE QuoteOfTheDay (
    qotd_id INT PRIMARY KEY AUTO_INCREMENT,
    medi_quote_id INT,
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medi_quote_id) REFERENCES MediQuotes(medi_quote_id)
);
```

**Columns:**
- `qotd_id` - Primary key, auto-incrementing unique identifier
- `medi_quote_id` - Foreign key to MediQuotes table
- `language` - Quote language: 'English', 'Hindi', 'Marathi'
- `last_updated` - Last update timestamp

**Constraints:**
- Primary Key: `qotd_id`
- Foreign Key: `medi_quote_id` → `MediQuotes.medi_quote_id`

### 8. PrescriptionImages Table
**Purpose:** Stores prescription images uploaded by users

```sql
CREATE TABLE PrescriptionImages (
  image_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);
```

**Columns:**
- `image_id` - Primary key, auto-incrementing unique identifier
- `course_id` - Foreign key to Courses table
- `image_url` - URL/path to the prescription image (required)
- `created_at` - Record creation timestamp

**Constraints:**
- Primary Key: `image_id`
- Foreign Key: `course_id` → `Courses.course_id` (CASCADE DELETE)

### 9. PrescriptionVoiceNotes Table
**Purpose:** Stores voice notes related to prescriptions

```sql
CREATE TABLE PrescriptionVoiceNotes (
  voice_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  voice_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);
```

**Columns:**
- `voice_id` - Primary key, auto-incrementing unique identifier
- `course_id` - Foreign key to Courses table
- `voice_url` - URL/path to the voice note file (required)
- `created_at` - Record creation timestamp

**Constraints:**
- Primary Key: `voice_id`
- Foreign Key: `course_id` → `Courses.course_id` (CASCADE DELETE)

### 10. UserNotes Table
**Purpose:** Stores personal notes for each user

```sql
CREATE TABLE UserNotes (
  note_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

**Columns:**
- `note_id` - Primary key, auto-incrementing unique identifier
- `user_id` - Foreign key to Users table (unique)
- `note` - User's personal note (default: empty string)
- `created_at` - Record creation timestamp
- `updated_at` - Record last update timestamp

**Constraints:**
- Primary Key: `note_id`
- Unique: `user_id`
- Foreign Key: `user_id` → `Users.user_id` (CASCADE DELETE)

## 🔗 Entity-Relationship Diagram

```
Users (1) ←→ (1) UserNotes
  ↓ (1)
  ↓ (1)
AuthTokens (1) ←→ (1) Users
  ↓ (1)
  ↓ (1)
Courses (1) ←→ (M) MedicineCourses
  ↓ (1)           ↓ (1)
  ↓ (1)           ↓ (M)
PrescriptionImages (M) ←→ (1) Courses
  ↓ (1)
  ↓ (1)
PrescriptionVoiceNotes (M) ←→ (1) Courses
  ↓ (1)
  ↓ (1)
MedicineIntakes (M) ←→ (1) MedicineCourses
  ↓ (1)
  ↓ (1)
MediQuotes (1) ←→ (M) QuoteOfTheDay
```

### Relationship Details:

1. **Users ↔ UserNotes**: One-to-One (1:1)
   - Each user has exactly one note record
   - Each note belongs to exactly one user

2. **Users ↔ AuthTokens**: One-to-Many (1:M)
   - One user can have multiple auth tokens
   - Each auth token belongs to one user

3. **Users ↔ Courses**: One-to-Many (1:M) [as patient]
   - One patient can have multiple courses
   - Each course belongs to one patient

4. **Users ↔ Courses**: One-to-Many (1:M) [as doctor]
   - One doctor can manage multiple courses
   - Each course is managed by one doctor

5. **Courses ↔ MedicineCourses**: One-to-Many (1:M)
   - One course can have multiple medicines
   - Each medicine belongs to one course

6. **MedicineCourses ↔ MedicineIntakes**: One-to-Many (1:M)
   - One medicine course can have multiple intake records
   - Each intake belongs to one medicine course

7. **Courses ↔ PrescriptionImages**: One-to-Many (1:M)
   - One course can have multiple prescription images
   - Each image belongs to one course

8. **Courses ↔ PrescriptionVoiceNotes**: One-to-Many (1:M)
   - One course can have multiple voice notes
   - Each voice note belongs to one course

9. **MediQuotes ↔ QuoteOfTheDay**: One-to-Many (1:M)
   - One quote can be used in multiple daily quote records
   - Each daily quote references one quote

## 📊 Sample Data and Usage Examples

### Sample Users
```sql
INSERT INTO Users (name, phone, email, address, language, role, isprofilecomplete) VALUES
('Dr. Sarah Johnson', 1234567890, 'sarah.johnson@healthcare.com', '123 Medical Center Dr', 'English', 'doctor', TRUE),
('John Smith', 9876543210, 'john.smith@email.com', '456 Oak Street', 'English', 'patient', TRUE),
('Maria Garcia', 5551234567, 'maria.garcia@email.com', '789 Pine Avenue', 'English', 'patient', FALSE);
```

### Sample Course
```sql
INSERT INTO Courses (user_id, doctor_id, status, start_date, end_date) VALUES
(2, 1, 'Ongoing', '2024-01-15', '2024-04-15');
```

### Sample Medicine Course
```sql
INSERT INTO MedicineCourses (course_id, medicine_name, status, start_date, end_date, frequency, medtype) VALUES
(1, 'Amoxicillin 500mg', 'Ongoing', '2024-01-15', '2024-02-15', 'BID', 'T');
```

### Sample Medicine Intakes
```sql
INSERT INTO MedicineIntakes (medicine_course_id, scheduled_at, beforeafter, taken_at) VALUES
(1, '2024-01-15 08:00:00', TRUE, '2024-01-15 08:05:00'),
(1, '2024-01-15 20:00:00', TRUE, NULL);
```

### Sample Quotes
```sql
INSERT INTO MediQuotes (quote, language) VALUES
('Health is wealth', 'English'),
('स्वास्थ्य ही धन है', 'Hindi'),
('आरोग्य म्हणजे संपत्ती', 'Marathi');
```

## 🔍 Common Queries and Usage Patterns

### 1. Get Patient's Active Courses
```sql
SELECT c.*, u.name as patient_name, d.name as doctor_name
FROM Courses c
JOIN Users u ON c.user_id = u.user_id
JOIN Users d ON c.doctor_id = d.user_id
WHERE c.status = 'Ongoing' AND c.user_id = ?;
```

### 2. Get Today's Medicine Schedule
```sql
SELECT mi.*, mc.medicine_name, mc.frequency
FROM MedicineIntakes mi
JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
WHERE DATE(mi.scheduled_at) = CURDATE()
AND mc.status = 'Ongoing';
```

### 3. Get Adherence Statistics
```sql
SELECT 
    COUNT(*) as total_scheduled,
    COUNT(taken_at) as total_taken,
    ROUND((COUNT(taken_at) / COUNT(*)) * 100, 2) as adherence_percentage
FROM MedicineIntakes mi
JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
WHERE mc.course_id = ? AND mi.scheduled_at >= ? AND mi.scheduled_at <= ?;
```

### 4. Get Quote of the Day
```sql
SELECT mq.quote, qotd.language
FROM QuoteOfTheDay qotd
JOIN MediQuotes mq ON qotd.medi_quote_id = mq.medi_quote_id
WHERE qotd.language = ?;
```

## 🛠️ Database Maintenance

### Indexes
The following indexes are recommended for optimal performance:

```sql
-- Users table indexes
CREATE INDEX idx_users_phone ON Users(phone);
CREATE INDEX idx_users_role ON Users(role);

-- Courses table indexes
CREATE INDEX idx_courses_user_id ON Courses(user_id);
CREATE INDEX idx_courses_doctor_id ON Courses(doctor_id);
CREATE INDEX idx_courses_status ON Courses(status);

-- MedicineCourses table indexes
CREATE INDEX idx_medicine_courses_course_id ON MedicineCourses(course_id);
CREATE INDEX idx_medicine_courses_status ON MedicineCourses(status);

-- MedicineIntakes table indexes
CREATE INDEX idx_medicine_intakes_medicine_course_id ON MedicineIntakes(medicine_course_id);
CREATE INDEX idx_medicine_intakes_scheduled_at ON MedicineIntakes(scheduled_at);
CREATE INDEX idx_medicine_intakes_taken_at ON MedicineIntakes(taken_at);
```

### Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Test restore procedures monthly

### Performance Monitoring
- Monitor query execution times
- Track table sizes and growth
- Monitor connection pool usage

## 📝 Notes for Developers

1. **Cascade Deletes**: Most foreign keys use CASCADE DELETE to maintain referential integrity
2. **Timestamps**: All tables with `created_at` and `updated_at` fields automatically maintain these timestamps
3. **Enums**: Use ENUM types for status fields to ensure data consistency
4. **Phone Numbers**: Stored as BIGINT to handle international numbers
5. **Language Support**: System supports English, Hindi, and Marathi languages
6. **File Storage**: Image and voice URLs should point to secure file storage locations

## 🔄 Data Flow

1. **User Registration**: User creates account → Users table
2. **Authentication**: User logs in → AuthTokens table
3. **Course Creation**: Doctor creates course → Courses table
4. **Medicine Assignment**: Medicines added to course → MedicineCourses table
5. **Schedule Generation**: System generates intake schedule → MedicineIntakes table
6. **Adherence Tracking**: User marks medicines as taken → MedicineIntakes.taken_at updated
7. **Media Upload**: Prescription images/voice notes → PrescriptionImages/PrescriptionVoiceNotes tables

This documentation should be updated whenever the database schema changes to maintain accuracy and help with team collaboration.
