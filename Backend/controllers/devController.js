const connection = require('../db.js');
const moment = require('moment-timezone');
const { loadTodaysIntakes } = require('../cronJobs/medicineIntakeNotifier.js');
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

  // Format IST time directly for MySQL (DB stores IST)
  const oneMinuteFromNowMySQL = oneMinuteFromNowIST.format('YYYY-MM-DD HH:mm:ss');

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
      const scheduledDate = moment.utc(intake.scheduled_at).format('YYYY-MM-DD');
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
    const oldScheduledAt = moment.utc(intake.scheduled_at).format('YYYY-MM-DD HH:mm:ss');

    // Update the intake to 1 minute from now
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
            const fallbackPayload = {
              message: 'Intake scheduled time updated successfully',
              intake_id: intakeId,
              medicine_name: intake.medicine_name,
              user_id: intake.user_id,
              course_id: intake.course_id,
              old_scheduled_at: oldScheduledAt,
              new_scheduled_at_ist: oneMinuteFromNowIST.format('YYYY-MM-DD HH:mm:ss'),
              note: 'Please verify the actual stored time in database'
            };
            loadTodaysIntakes()
              .then(() => res.json({ ...fallbackPayload, notifications_reloaded: true }))
              .catch(() => res.json({ ...fallbackPayload, notifications_reloaded: false }));
            return;
          }

          const updatedScheduledAtIST = moment.utc(fetchResults[0].scheduled_at).format('YYYY-MM-DD HH:mm:ss');

          console.log(`[DEV] Updated intake ${intakeId} from ${oldScheduledAt} to ${updatedScheduledAtIST} (IST)`);

          const payload = {
            message: 'Intake scheduled time updated successfully',
            intake_id: intakeId,
            medicine_name: intake.medicine_name,
            user_id: intake.user_id,
            course_id: intake.course_id,
            old_scheduled_at: oldScheduledAt,
            new_scheduled_at: updatedScheduledAtIST,
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
          };

          // Reload today's intakes in the notifier (same as startup) so the new time is used for notifications
          loadTodaysIntakes()
            .then(() => {
              console.log('[DEV] Notifications buffer reloaded after intake-in-1min');
              res.json({ ...payload, notifications_reloaded: true });
            })
            .catch((reloadErr) => {
              console.error('[DEV] Failed to reload notifications:', reloadErr);
              res.json({ ...payload, notifications_reloaded: false });
            });
        }
      );
    });
  });
};

const setIntakeIn30Sec = (req, res) => {
  const today = moment().format('YYYY-MM-DD');
  const thirtySecFromNowIST = moment().add(30, 'seconds');
  const thirtySecFromNowMySQL = thirtySecFromNowIST.format('YYYY-MM-DD HH:mm:ss');

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

    const todayIntakes = results.filter(intake => {
      const scheduledDate = moment.utc(intake.scheduled_at).format('YYYY-MM-DD');
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
    const oldScheduledAt = moment.utc(intake.scheduled_at).format('YYYY-MM-DD HH:mm:ss');

    const updateQuery = `
      UPDATE MedicineIntakes
      SET scheduled_at = ?
      WHERE intake_id = ?
    `;

    connection.query(updateQuery, [thirtySecFromNowMySQL, intakeId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('[DEV] Error updating intake:', updateErr);
        return res.status(500).json({ error: updateErr.message });
      }

      connection.query(
        'SELECT scheduled_at FROM MedicineIntakes WHERE intake_id = ?',
        [intakeId],
        (fetchErr, fetchResults) => {
          if (fetchErr) {
            console.error('[DEV] Error fetching updated intake:', fetchErr);
            const fallbackPayload = {
              message: 'Intake scheduled time updated successfully',
              intake_id: intakeId,
              medicine_name: intake.medicine_name,
              user_id: intake.user_id,
              course_id: intake.course_id,
              old_scheduled_at: oldScheduledAt,
              new_scheduled_at_ist: thirtySecFromNowIST.format('YYYY-MM-DD HH:mm:ss'),
              note: 'Please verify the actual stored time in database'
            };
            loadTodaysIntakes()
              .then(() => res.json({ ...fallbackPayload, notifications_reloaded: true }))
              .catch(() => res.json({ ...fallbackPayload, notifications_reloaded: false }));
            return;
          }

          const updatedScheduledAtIST = moment.utc(fetchResults[0].scheduled_at).format('YYYY-MM-DD HH:mm:ss');

          console.log(`[DEV] Updated intake ${intakeId} from ${oldScheduledAt} to ${updatedScheduledAtIST} (IST)`);

          const payload = {
            message: 'Intake scheduled time updated successfully',
            intake_id: intakeId,
            medicine_name: intake.medicine_name,
            user_id: intake.user_id,
            course_id: intake.course_id,
            old_scheduled_at: oldScheduledAt,
            new_scheduled_at: updatedScheduledAtIST,
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
          };

          loadTodaysIntakes()
            .then(() => {
              console.log('[DEV] Notifications buffer reloaded after intake-in-30sec');
              res.json({ ...payload, notifications_reloaded: true });
            })
            .catch((reloadErr) => {
              console.error('[DEV] Failed to reload notifications:', reloadErr);
              res.json({ ...payload, notifications_reloaded: false });
            });
        }
      );
    });
  });
};

const setIntakeIn30SecMultiple = (req, res) => {
  const count = parseInt(req.params.count, 10);
  if (isNaN(count) || count < 1) {
    return res.status(400).json({ error: 'count must be a positive integer' });
  }

  const today = moment().format('YYYY-MM-DD');
  const thirtySecFromNowIST = moment().add(30, 'seconds');
  const thirtySecFromNowMySQL = thirtySecFromNowIST.format('YYYY-MM-DD HH:mm:ss');

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
      console.error('[DEV] Error finding intakes:', err);
      return res.status(500).json({ error: err.message });
    }

    const todayIntakes = results.filter(intake => {
      const scheduledDate = moment.utc(intake.scheduled_at).format('YYYY-MM-DD');
      return scheduledDate === today;
    });

    if (todayIntakes.length === 0) {
      return res.status(404).json({
        message: 'No upcoming intakes found for today',
        date: today
      });
    }

    const intakesToUpdate = todayIntakes.slice(0, count);

    if (intakesToUpdate.length < count) {
      console.log(`[DEV] Requested ${count} intakes but only ${intakesToUpdate.length} available for today`);
    }

    // Update all selected intakes to 30 seconds from now
    const updatePromises = intakesToUpdate.map((intake, index) => {
      return new Promise((resolve, reject) => {
        const oldScheduledAt = moment.utc(intake.scheduled_at).format('YYYY-MM-DD HH:mm:ss');

        const updateQuery = `
          UPDATE MedicineIntakes
          SET scheduled_at = ?
          WHERE intake_id = ?
        `;

        connection.query(updateQuery, [thirtySecFromNowMySQL, intake.intake_id], (updateErr) => {
          if (updateErr) {
            console.error(`[DEV] Error updating intake ${intake.intake_id}:`, updateErr);
            return reject(updateErr);
          }

          connection.query(
            'SELECT scheduled_at FROM MedicineIntakes WHERE intake_id = ?',
            [intake.intake_id],
            (fetchErr, fetchResults) => {
              if (fetchErr) {
                return resolve({
                  intake_id: intake.intake_id,
                  medicine_name: intake.medicine_name,
                  user_id: intake.user_id,
                  course_id: intake.course_id,
                  old_scheduled_at: oldScheduledAt,
                  new_scheduled_at_ist: thirtySecFromNowIST.format('YYYY-MM-DD HH:mm:ss'),
                  note: 'Please verify the actual stored time in database'
                });
              }

              const updatedScheduledAtIST = moment.utc(fetchResults[0].scheduled_at).format('YYYY-MM-DD HH:mm:ss');

              console.log(`[DEV] Updated intake ${intake.intake_id} from ${oldScheduledAt} to ${updatedScheduledAtIST} (IST)`);

              resolve({
                intake_id: intake.intake_id,
                medicine_name: intake.medicine_name,
                user_id: intake.user_id,
                course_id: intake.course_id,
                old_scheduled_at: oldScheduledAt,
                new_scheduled_at: updatedScheduledAtIST,
                new_scheduled_at_ist: thirtySecFromNowIST.format('YYYY-MM-DD HH:mm:ss')
              });
            }
          );
        });
      });
    });

    Promise.all(updatePromises)
      .then((updatedIntakes) => {
        loadTodaysIntakes()
          .then(() => {
            console.log(`[DEV] Notifications buffer reloaded after intake-in-30sec/${count}`);
            res.json({
              message: `${updatedIntakes.length} intake(s) scheduled time updated successfully`,
              requested: count,
              updated: updatedIntakes.length,
              intakes: updatedIntakes,
              notifications_reloaded: true,
              updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
          })
          .catch((reloadErr) => {
            console.error('[DEV] Failed to reload notifications:', reloadErr);
            res.json({
              message: `${updatedIntakes.length} intake(s) scheduled time updated successfully`,
              requested: count,
              updated: updatedIntakes.length,
              intakes: updatedIntakes,
              notifications_reloaded: false,
              updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
          });
      })
      .catch((err) => {
        console.error('[DEV] Error updating multiple intakes:', err);
        res.status(500).json({ error: err.message });
      });
  });
};

module.exports = { deleteAllCourses, setIntakeIn1Min, setIntakeIn30Sec, setIntakeIn30SecMultiple };
