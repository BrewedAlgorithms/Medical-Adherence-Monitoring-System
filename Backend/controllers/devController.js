const connection = require('../db.js');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');

const deleteAllCourses = (req, res) => {
  connection.query('DELETE FROM Courses', (err, result) => {
    if (err) {
      console.error('Error deleting courses:', err);
      return res.status(500).json({ error: err.message });
    }
    const deletedCount = result.affectedRows;
    console.log(`[DEV] Deleted ${deletedCount} course(s) and cascade-deleted related records`);
    res.json({
      message: 'All courses deleted',
      courses_deleted: deletedCount
    });
  });
};

const setIntakeIn1Min = (req, res) => {
  // Get today's date in IST
  const today = moment().format('YYYY-MM-DD');
  // Create moment object for 1 minute from now in IST
  const oneMinuteFromNowIST = moment().add(1, 'minute');
  
  // Convert IST time to UTC for MySQL storage
  // MySQL TIMESTAMP stores in UTC, so we need to convert IST to UTC before inserting
  const oneMinuteFromNowUTC = oneMinuteFromNowIST.clone().utc();
  const oneMinuteFromNowMySQL = oneMinuteFromNowUTC.format('YYYY-MM-DD HH:mm:ss');
  
  // First, find the first intake scheduled for today (across all users)
  // Order by scheduled_at ASC to get the earliest one
  // Note: DATE() function uses the timezone of the MySQL server
  // We need to compare dates properly - get all intakes and filter by IST date
  const findQuery = `
    SELECT mi.intake_id, mi.scheduled_at, mi.medicine_course_id,
           mc.medicine_name, c.user_id, c.course_id
    FROM MedicineIntakes mi
    JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
    JOIN Courses c ON mc.course_id = c.course_id
    WHERE mi.taken_at IS NULL
    ORDER BY mi.scheduled_at ASC
  `;
  
  connection.query(findQuery, [], (err, results) => {
    if (err) {
      console.error('[DEV] Error finding intake:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Filter results to find first intake scheduled for today (in IST)
    const todayIntakes = results.filter(intake => {
      const scheduledDate = moment(intake.scheduled_at).format('YYYY-MM-DD');
      return scheduledDate === today;
    });
    
    if (todayIntakes.length === 0) {
      return res.status(404).json({ 
        message: 'No upcoming intake found for today',
        date: today
      });
    }
    
    const intake = todayIntakes[0];
    const intakeId = intake.intake_id;
    const oldScheduledAt = moment(intake.scheduled_at).format('YYYY-MM-DD HH:mm:ss');
    
    // Update the intake to 1 minute from now (stored as UTC in MySQL)
    const updateQuery = `
      UPDATE MedicineIntakes 
      SET scheduled_at = ? 
      WHERE intake_id = ?
    `;
    
    connection.query(updateQuery, [oneMinuteFromNowMySQL, intakeId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('[DEV] Error updating intake:', updateErr);
        return res.status(500).json({ error: updateErr.message });
      }
      
      // Fetch the updated value to confirm what was actually stored
      connection.query(
        'SELECT scheduled_at FROM MedicineIntakes WHERE intake_id = ?',
        [intakeId],
        (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('[DEV] Error fetching updated intake:', fetchErr);
            // Still return success even if fetch fails
            return res.json({
              message: 'Intake scheduled time updated successfully',
              intake_id: intakeId,
              medicine_name: intake.medicine_name,
              user_id: intake.user_id,
              course_id: intake.course_id,
              old_scheduled_at: oldScheduledAt,
              new_scheduled_at_ist: oneMinuteFromNowIST.format('YYYY-MM-DD HH:mm:ss'),
              note: 'Please verify the actual stored time in database'
            });
          }
          
          // Convert the stored UTC time back to IST for display
          const updatedScheduledAt = moment(fetchResults[0].scheduled_at);
          const updatedScheduledAtIST = updatedScheduledAt.format('YYYY-MM-DD HH:mm:ss');
          
          console.log(`[DEV] Updated intake ${intakeId} from ${oldScheduledAt} to ${updatedScheduledAtIST} (IST)`);
          
          res.json({
            message: 'Intake scheduled time updated successfully',
            intake_id: intakeId,
            medicine_name: intake.medicine_name,
            user_id: intake.user_id,
            course_id: intake.course_id,
            old_scheduled_at: oldScheduledAt,
            new_scheduled_at: updatedScheduledAtIST,
            new_scheduled_at_ist: oneMinuteFromNowIST.format('YYYY-MM-DD HH:mm:ss'),
            new_scheduled_at_raw_utc: fetchResults[0].scheduled_at,
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
          });
        }
      );
    });
  });
};

module.exports = { deleteAllCourses, setIntakeIn1Min };
