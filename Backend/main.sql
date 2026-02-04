
drop database HealthMobi;
create schema HealthMobi;
use HealthMobi;

-- CREATE TABLE STATEMENTS
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
  isprofilecomplete bool not null default false
);

CREATE TABLE AuthTokens (
  token_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  auth_token VARCHAR(255) NOT NULL,
  PRIMARY KEY (token_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE MediQuotes (
    medi_quote_id INT PRIMARY KEY AUTO_INCREMENT,
    quote VARCHAR(255),
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL
);

CREATE TABLE QuoteOfTheDay (
    qotd_id INT PRIMARY KEY AUTO_INCREMENT,
    medi_quote_id INT,
    language ENUM('English', 'Hindi', 'Marathi') NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medi_quote_id) REFERENCES MediQuotes(medi_quote_id)
);

CREATE TABLE PrescriptionImages (
  image_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);

CREATE TABLE PrescriptionVoiceNotes (
  voice_id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  voice_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE
);

CREATE TABLE UserNotes (
  note_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL unique,
  note VARCHAR(1000) NOT NULL default '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- INSERT INITIAL QUOTES
-- English Quotes
INSERT INTO MediQuotes (quote, language) VALUES 
('Health is the greatest gift, contentment the greatest wealth, faithfulness the best relationship.', 'English'),
('Take care of your body. It\'s the only place you have to live.', 'English'),
('The greatest wealth is health.', 'English'),
('Your body hears everything your mind says. Stay positive.', 'English'),
('Healing is a matter of time, but it is sometimes also a matter of opportunity.', 'English'),
('The first wealth is health.', 'English'),
('A healthy outside starts from the inside.', 'English'),
('Health is not valued until sickness comes.', 'English'),
('The best way to find out if you can trust somebody is to trust them.', 'English'),
('Wellness is the complete integration of body, mind, and spirit.', 'English');

-- Hindi Quotes
INSERT INTO MediQuotes (quote, language) VALUES 
('स्वास्थ्य सबसे बड़ा उपहार है, संतोष सबसे बड़ी संपत्ति है।', 'Hindi'),
('अपने शरीर की देखभाल करें। यही एकमात्र जगह है जहाँ आपको रहना है।', 'Hindi'),
('सबसे बड़ी संपत्ति स्वास्थ्य है।', 'Hindi'),
('आपका शरीर आपके मन की हर बात सुनता है। सकारात्मक रहें।', 'Hindi'),
('स्वास्थ्य तब तक महत्वपूर्ण नहीं लगता जब तक बीमारी नहीं आती।', 'Hindi'),
('स्वास्थ्य ही सबसे बड़ा धन है।', 'Hindi'),
('एक स्वस्थ बाहरी शरीर अंदर से शुरू होता है।', 'Hindi'),
('स्वास्थ्य समय की बात है, लेकिन कभी-कभी यह अवसर की भी बात है।', 'Hindi'),
('कल्याण शरीर, मन और आत्मा का पूर्ण एकीकरण है।', 'Hindi'),
('स्वस्थ रहें, खुश रहें।', 'Hindi');

-- Marathi Quotes
INSERT INTO MediQuotes (quote, language) VALUES 
('आरोग्य हे सर्वात मोठे देणगी आहे, समाधान हे सर्वात मोठे संपत्ती आहे।', 'Marathi'),
('तुमच्या शरीराची काळजी घ्या. ही एकमेव जागा आहे जिथे तुम्हाला राहावे लागेल।', 'Marathi'),
('सर्वात मोठी संपत्ती म्हणजे आरोग्य।', 'Marathi'),
('तुमचे शरीर तुमच्या मनाची प्रत्येक गोष्ट ऐकते। सकारात्मक रहा।', 'Marathi'),
('आरोग्य हे वेळेची बाब आहे, पण कधीकधी ते संधीचीही बाब आहे।', 'Marathi'),
('पहिली संपत्ती म्हणजे आरोग्य।', 'Marathi'),
('एक निरोगी बाहेरील शरीर आतून सुरू होते।', 'Marathi'),
('आरोग्याचे महत्त्व आजार येईपर्यंत समजत नाही।', 'Marathi'),
('कल्याण म्हणजे शरीर, मन आणि आत्म्याचे पूर्ण एकत्रीकरण।', 'Marathi'),
('निरोगी रहा, आनंदी रहा।', 'Marathi');

-- TRUNCATE STATEMENTS
-- TRUNCATE TABLE Users;
-- TRUNCATE TABLE AuthTokens;
-- TRUNCATE TABLE Courses;
-- TRUNCATE TABLE MedicineCourses;
-- TRUNCATE TABLE MedicineIntakes;
-- TRUNCATE TABLE MediQuotes;
-- TRUNCATE TABLE QuoteOfTheDay;
-- TRUNCATE TABLE PrescriptionImages;
-- TRUNCATE TABLE PrescriptionVoiceNotes;
-- TRUNCATE TABLE UserNotes;


-- SELECT STATEMENTS
SELECT * FROM Users;
SELECT * FROM AuthTokens;
SELECT * FROM Courses;
SELECT * FROM MedicineCourses;
SELECT * FROM MedicineIntakes;
SELECT * FROM MediQuotes;
SELECT * FROM QuoteOfTheDay;
SELECT * FROM PrescriptionImages;
SELECT * FROM PrescriptionVoiceNotes;
SELECT * FROM UserNotes;





