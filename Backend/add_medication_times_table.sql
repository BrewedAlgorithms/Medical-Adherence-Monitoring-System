-- Migration: Add MedicationTimes table (required for complete-registration)
-- Run this on an existing database if you get "Error creating medication times"
-- Usage: mysql -u <user> -p HealthMobi < add_medication_times_table.sql

USE HealthMobi;

CREATE TABLE IF NOT EXISTS MedicationTimes (
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
);
