const cron = require('node-cron');
const connection = require('../db.js');
const { waitForDatabase } = require('../db.js');
const { sendMessage } = require('../twilio.js');
const { broadcastMessage, registerMessageHandler } = require('../socket.js');

// In-memory buffer to hold today's scheduled intakes
let todaysIntakes = [];

// Pre-computed batches for the day
let scheduledBatches = new Map(); // key: 'HH:MM:SS', value: array of intake indices

// Global variable to store the current box to intake mapping
let currentBoxToIntakeMapping = {};

// Track active notifications with timeout
let activeNotifications = new Map(); // key: intake_id, value: {timestamp, boxNumber}

// Constants
const NOTIFICATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const MAX_BATCH_SIZE = 4; // Maximum number of intakes to batch together
const PHONE_NUMBER = "8055301261"; // Default or from env

// Array of enabled box numbers (zero-based)
// Modify this array to enable/disable specific boxes
const ENABLED_BOXES = [1, 3]; // All boxes enabled by default

// Register a message handler to listen for client responses
registerMessageHandler((message, sender) => {
  // Check if this is a response to our medicine notification
  if (Array.isArray(message) && message.length) {
    console.log(`Received response array from client ${sender.id}:`, JSON.stringify(message));

    // Process responses:
    //   positive number → pill was taken from that box
    //   negative number → box was empty, pill could not be taken
    message.forEach(boxNumber => {
      if (boxNumber > 0) {
        // --- Pill taken flow (existing behavior) ---
        const intakeId = currentBoxToIntakeMapping[boxNumber];
        if (intakeId) {
          console.log(`Box ${boxNumber} was taken, corresponding to intake_id ${intakeId}`);
          markIntakeAsTaken(intakeId);

          // Remove from active notifications since it's been taken
          if (activeNotifications.has(intakeId)) {
            activeNotifications.delete(intakeId);
          }
        } else {
          console.log(`Received unknown box number: ${boxNumber}`);
        }
      } else if (boxNumber < 0) {
        // --- Empty box flow ---
        const actualBox = Math.abs(boxNumber);
        const intakeId = currentBoxToIntakeMapping[actualBox];
        if (intakeId) {
          // Look up the medicine name from today's in-memory intakes
          const intake = todaysIntakes.find(i => i.intake_id === intakeId);
          const medicineName = intake ? intake.medicine_name : 'your medicine';

          console.warn(`Box ${actualBox} is empty for intake_id ${intakeId} (${medicineName}). Sending refill notification.`);

          // Send WhatsApp refill alert — intake is NOT marked as taken
          sendMessage(
            `⚠️ Compartment ${actualBox} is empty! Please refill it with ${medicineName} so you can take your dose.`,
            PHONE_NUMBER
          );
        } else {
          console.log(`Received empty-box signal for unknown box: ${actualBox}`);
        }
      }
    });

    return true; // Message handled
  }
  return false; // Not handled by this handler
});

// Function to mark an intake as taken in the database
const markIntakeAsTaken = (intakeId) => {
  connection.query(
    `UPDATE MedicineIntakes SET taken_at = NOW() WHERE intake_id = ?`,
    [intakeId],
    (err, results) => {
      if (err) {
        console.error(`Error marking intake ${intakeId} as taken:`, err);
        return;
      }
      console.log(`Marked intake ${intakeId} as taken`);

      // Remove this intake from today's intakes to avoid duplicate notifications
      const intakeIndex = todaysIntakes.findIndex(intake => intake.intake_id === intakeId);
      if (intakeIndex !== -1) {
        // Update batches if this intake was part of any
        for (const [timeKey, indices] of scheduledBatches.entries()) {
          const indexInBatch = indices.indexOf(intakeIndex);
          if (indexInBatch !== -1) {
            // Remove this intake from the batch
            indices.splice(indexInBatch, 1);
            if (indices.length === 0) {
              // If batch is empty, remove it entirely
              scheduledBatches.delete(timeKey);
            } else {
              scheduledBatches.set(timeKey, indices);
            }
            break;
          }
        }

        // Mark the intake as taken in the in-memory array
        todaysIntakes[intakeIndex].taken_at = new Date();
      }

      // Remove from box mapping
      for (const [boxNum, id] of Object.entries(currentBoxToIntakeMapping)) {
        if (id === intakeId) {
          delete currentBoxToIntakeMapping[boxNum];
          break;
        }
      }
    }
  );
};

// Function to check if it's time to take medicine
const checkIntakeTimes = () => {
  const now = new Date();
  const timeKey = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  // Check if we have a batch scheduled for this exact time
  if (scheduledBatches.has(timeKey)) {
    const batchIndices = scheduledBatches.get(timeKey);
    if (batchIndices && batchIndices.length > 0) {
      sendNotificationForBatch(batchIndices);
      // Remove this batch from scheduled batches after sending notification
      scheduledBatches.delete(timeKey);
    }
  }

  // Check for expired notifications that need to be cleared
  checkExpiredNotifications();
};

// Function to check for expired notifications
const checkExpiredNotifications = () => {
  const now = Date.now();
  const expiredIntakeIds = [];

  // Find all notifications that have expired
  for (const [intakeId, data] of activeNotifications.entries()) {
    if (now - data.timestamp >= NOTIFICATION_TIMEOUT_MS) {
      expiredIntakeIds.push(intakeId);

      // Remove from box mapping
      const boxNum = data.boxNumber;
      if (currentBoxToIntakeMapping[boxNum] === intakeId) {
        console.log(`Box ${boxNum} for intake_id ${intakeId} expired after 30 minutes. Clearing mapping.`);
        delete currentBoxToIntakeMapping[boxNum];
      }

      // Send reminder SMS for missed medication
      const intakeIndex = todaysIntakes.findIndex(intake => intake.intake_id === intakeId);
      if (intakeIndex !== -1) {
        const missedIntake = todaysIntakes[intakeIndex];
        const beforeAfter = missedIntake.beforeafter ? 'after' : 'before';
        sendMessage(`REMINDER: You missed taking ${missedIntake.medicine_name} ${beforeAfter} meal. Please take it as soon as possible.`, PHONE_NUMBER);
      }
    }
  }

  // Delete all expired notifications
  expiredIntakeIds.forEach(id => {
    activeNotifications.delete(id);

    // Find the intake in todaysIntakes and mark it as missed
    const intakeIndex = todaysIntakes.findIndex(intake => intake.intake_id === id);
    if (intakeIndex !== -1) {
      todaysIntakes[intakeIndex].missed = true;
      console.log(`Marking intake_id ${id} as missed after 30 minute timeout`);
    }
  });

  // If we removed some box mappings and our current mapping is now empty, print a message
  if (expiredIntakeIds.length > 0 && Object.keys(currentBoxToIntakeMapping).length === 0) {
    console.log('All active box mappings have been cleared due to timeout');
  }
};

// Function to send notification for a batch of intakes
const sendNotificationForBatch = (indices) => {
  // Calculate effective batch size based on enabled boxes
  const effectiveBatchSize = Math.min(MAX_BATCH_SIZE, ENABLED_BOXES.length);
  if (effectiveBatchSize === 0) {
    console.log('No boxes are enabled, cannot send notifications');
    return;
  }

  // Process in chunks of effectiveBatchSize
  for (let i = 0; i < indices.length; i += effectiveBatchSize) {
    const currentBatchIndices = indices.slice(i, i + effectiveBatchSize);

    // Mark these intakes as notified to avoid duplicate notifications
    currentBatchIndices.forEach(index => {
      if (index < todaysIntakes.length) {
        todaysIntakes[index].notified = true;
      }
    });

    // Get intake IDs for the current batch
    const intakeIds = currentBatchIndices
      .filter(index => index < todaysIntakes.length)
      .map(index => todaysIntakes[index].intake_id);

    if (intakeIds.length === 0) continue;

    // Send notification with delay for subsequent batches
    setTimeout(() => {
      sendMedicineNotification(intakeIds);
    }, i > 0 ? 1000 : 0);
  }
};

// Function to send medicine notification
const sendMedicineNotification = (intakeIds) => {
  // Fetch medicine details for logging and mapping
  connection.query(
    `SELECT mi.intake_id, mc.medicine_name, mi.beforeafter
     FROM MedicineIntakes mi
     JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
     WHERE mi.intake_id IN (?)`,
    [intakeIds],
    (err, results) => {
      if (err) {
        console.error('Error fetching medicine details:', err);
        return;
      }

      // Create array of box numbers (zero-based index for the UI)
      const boxNumbers = [];

      // Reset the current mapping
      currentBoxToIntakeMapping = {};

      // Current timestamp for tracking expirations
      const now = Date.now();

      // Create the mapping and prepare the notification array
      // Only use enabled boxes
      let enabledBoxIndex = 0;
      results.forEach((medicine, i) => {
        // If we've used all enabled boxes, stop processing
        if (enabledBoxIndex >= ENABLED_BOXES.length) return;

        const boxNum = ENABLED_BOXES[enabledBoxIndex++];
        boxNumbers.push(boxNum);

        // Store mapping
        currentBoxToIntakeMapping[boxNum] = medicine.intake_id;

        // Track this notification with timestamp for timeout
        activeNotifications.set(medicine.intake_id, {
          timestamp: now,
          boxNumber: boxNum
        });

        // Log the mapping
        const beforeAfter = medicine.beforeafter ? 'after' : 'before';
        console.log(`Box ${boxNum} mapped to intake_id ${medicine.intake_id}: ${medicine.medicine_name} (${beforeAfter} meal)`);

        // Send SMS notification for this medicine
        const smsMessage = `Time to take ${medicine.medicine_name} ${beforeAfter} meal. Please take from box ${boxNum}.`;
        sendMessage(smsMessage, PHONE_NUMBER);
      });

      // Send notification with the box numbers (for app/socket notification)
      console.log(`Broadcasting medicine intake notification: ${JSON.stringify(boxNumbers)}`);
      broadcastMessage(JSON.stringify(boxNumbers));
    }
  );
};

// Pre-compute batches for the day based on scheduled times
const preComputeBatches = () => {
  // Clear existing batches
  scheduledBatches.clear();

  // Group intakes by their scheduled time (HH:MM:SS)
  todaysIntakes.forEach((intake, index) => {
    if (intake.taken_at) return; // Skip intakes that have already been taken

    const scheduledTime = new Date(intake.scheduled_at);
    const timeKey = `${scheduledTime.getHours().toString().padStart(2, '0')}:${scheduledTime.getMinutes().toString().padStart(2, '0')}:${scheduledTime.getSeconds().toString().padStart(2, '0')}`;

    // Add to the appropriate batch
    if (!scheduledBatches.has(timeKey)) {
      scheduledBatches.set(timeKey, []);
    }
    scheduledBatches.get(timeKey).push(index);
  });

  console.log(`Pre-computed ${scheduledBatches.size} batches for today's schedule`);
};

// Function to load today's intakes into the buffer and prepare batches with retry logic
const loadTodaysIntakes = async (maxRetries = 5) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const results = await new Promise((resolve, reject) => {
        connection.query(
          `SELECT mi.*, mc.medicine_name 
           FROM MedicineIntakes mi
           JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
           WHERE DATE(mi.scheduled_at) = CURDATE() 
           AND mi.taken_at IS NULL
           ORDER BY mi.scheduled_at`,
          (err, results) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      // Reset the buffer with new data
      todaysIntakes = results.map(intake => ({
        ...intake,
        notified: false, // Add a flag to track if we've notified for this intake
        missed: false    // Add a flag to track if this intake was missed (timed out)
      }));

      console.log(`Loaded ${todaysIntakes.length} intakes for today`);
      console.log(`Using ${ENABLED_BOXES.length} enabled boxes: ${ENABLED_BOXES.join(', ')}`);

      // Clear any active notifications
      activeNotifications.clear();
      currentBoxToIntakeMapping = {};

      // Pre-compute the batches right after loading intakes
      preComputeBatches();

      return todaysIntakes;
    } catch (err) {
      lastError = err;
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s, 8s, 10s
          console.log(`Error loading today's intakes (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      // For other errors or max retries reached, throw
      throw err;
    }
  }

  // If we get here, all retries failed
  throw lastError;
};

// Function to refresh intakes without full reload (for mid-day updates)
const refreshIntakes = async () => {
  try {
    // First, update our local cache with any taken intakes from the database
    const takenIntakes = await new Promise((resolve, reject) => {
      connection.query(
        `SELECT intake_id FROM MedicineIntakes 
         WHERE DATE(scheduled_at) = CURDATE() 
         AND taken_at IS NOT NULL`,
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    // Mark those intakes as taken in our local cache
    const takenIds = new Set(takenIntakes.map(i => i.intake_id));
    let changed = false;

    todaysIntakes.forEach((intake, index) => {
      if (takenIds.has(intake.intake_id) && !intake.taken_at) {
        intake.taken_at = new Date(); // Mark as taken
        intake.notified = true;
        changed = true;

        // Remove from active notifications if it was being tracked
        if (activeNotifications.has(intake.intake_id)) {
          activeNotifications.delete(intake.intake_id);
        }
      }
    });

    // Check for new intakes
    const newIntakes = await new Promise((resolve, reject) => {
      const existingIds = todaysIntakes.map(i => i.intake_id);
      connection.query(
        `SELECT mi.*, mc.medicine_name 
         FROM MedicineIntakes mi
         JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
         WHERE DATE(mi.scheduled_at) = CURDATE() 
         AND mi.taken_at IS NULL
         ${existingIds.length ? `AND mi.intake_id NOT IN (${existingIds.join(',')})` : ''}
         ORDER BY mi.scheduled_at`,
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    // Add new intakes to our cache
    if (newIntakes.length > 0) {
      todaysIntakes = [
        ...todaysIntakes,
        ...newIntakes.map(intake => ({
          ...intake,
          notified: false,
          missed: false
        }))
      ];
      changed = true;
    }

    // If anything changed, recompute batches
    if (changed) {
      preComputeBatches();
    }

    return todaysIntakes;
  } catch (err) {
    console.error('Error refreshing intakes:', err);
    throw err;
  }
};

// Generate a report of missed medications
const generateMissedMedicationsReport = () => {
  // Find all intakes that were notified but not taken
  const missedIntakes = todaysIntakes.filter(intake =>
    (intake.notified || intake.missed) && !intake.taken_at
  );

  if (missedIntakes.length > 0) {
    console.log(`=== MISSED MEDICATIONS REPORT (${new Date().toLocaleString()}) ===`);

    // Prepare SMS message with missed medications
    let missedMedsMessage = "Daily medication report - Missed medications:\n";

    missedIntakes.forEach(intake => {
      const time = new Date(intake.scheduled_at).toLocaleTimeString();
      console.log(`- ${intake.medicine_name}: Scheduled for ${time}`);
      missedMedsMessage += `- ${intake.medicine_name}: Scheduled for ${time}\n`;
    });
    console.log('=== END OF REPORT ===');

    // Send the report via SMS
    sendMessage(missedMedsMessage, PHONE_NUMBER);
  }
};

// Function to set/update enabled boxes
const setEnabledBoxes = (boxArray) => {
  // Validate input
  if (!Array.isArray(boxArray) || boxArray.length === 0) {
    console.error('Invalid box array, must be a non-empty array of box numbers');
    return false;
  }

  // Update the enabled boxes
  ENABLED_BOXES.length = 0; // Clear the array
  boxArray.forEach(boxNum => ENABLED_BOXES.push(boxNum)); // Add new values

  console.log(`Updated enabled boxes: ${ENABLED_BOXES.join(', ')}`);
  return true;
};

// Function to update the phone number
const setPhoneNumber = (phoneNum) => {
  if (typeof phoneNum !== 'string' || !phoneNum.match(/^\+?[1-9]\d{1,14}$/)) {
    console.error('Invalid phone number format. Must be E.164 format.');
    return false;
  }

  // Update the phone number constant
  PHONE_NUMBER = phoneNum;
  console.log(`Updated phone number to: ${PHONE_NUMBER}`);
  return true;
};

// Schedule the daily refresh of the buffer at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Midnight: Refreshing today\'s medicine schedule');

  // Generate report of yesterday's missed medications before refreshing
  generateMissedMedicationsReport();

  await loadTodaysIntakes();
});

// Add a mid-day refresh to catch any new prescriptions or updates
cron.schedule('0 12 * * *', async () => {
  console.log('Noon: Refreshing today\'s medicine schedule');
  await refreshIntakes();
});

// Check intake times every second
cron.schedule('* * * * * *', () => {
  checkIntakeTimes();
});

// Initial load when server starts - wait for database first
(async () => {
  try {
    await waitForDatabase();
    await loadTodaysIntakes();
    console.log('Initial load of today\'s intakes completed');
    // Send initial notification that the system is up and running
    // sendMessage("Medication reminder system is active and monitoring your schedule.", PHONE_NUMBER);
  } catch (err) {
    console.error('Failed to load initial intakes:', err);
  }
})();

module.exports = {
  loadTodaysIntakes,
  refreshIntakes,
  checkIntakeTimes,
  generateMissedMedicationsReport,
  setEnabledBoxes,
  setPhoneNumber
};