/**
 * Runs database migrations on startup.
 * Ensures schema is up-to-date (e.g. MedicationTimes table) when using Docker with persisted volumes.
 */
const connection = require('./db.js');
const { waitForDatabase } = require('./db.js');

const migrations = [
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
    console.log('Migrations completed');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

runMigrations();
