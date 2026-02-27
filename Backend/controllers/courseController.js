const { schedule } = require("node-cron");
const connection = require("../db.js");
const { authUser } = require("../middlewares/authUser.js");
const { use } = require("../routes/userFeaturesRoutes.js");
const { sendMessage } = require('../twilio.js');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');

const PHONE_NUMBER = "8055301261";

// *** db schema comments kept intact ***

const newCourse = (req, res) => {
  const { user_id, doctor_id, start_date, end_date, medicineCourses } = req.body;
  const status = "Ongoing";

  connection.query(
    "SELECT user_id FROM Users WHERE user_id = ?",
    [doctor_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error checking doctor ID" });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: "Doctor ID does not exist" });
      }

      // First, get the medication times
      connection.query(
        "SELECT * FROM MedicationTimes WHERE user_id = ?",
        [user_id],
        (err, timeResults) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error fetching medication times" });
          }

          // Check if medication times exist for the user
          if (timeResults.length === 0) {
            return res.status(400).json({ message: "No medication times found for this user" });
          }

          const usertimes = {
            morning_time: timeResults[0].morning_time,
            afternoon_time: timeResults[0].afternoon_time,
            evening_time: timeResults[0].evening_time,
            night_time: timeResults[0].night_time
          };

          // Now proceed with creating the course
          connection.query(
            "INSERT INTO Courses (user_id, doctor_id, status, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
            [user_id, doctor_id, status, start_date, end_date],
            (err, courseResults) => {
              if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error creating course" });
              }

              const course_id = courseResults.insertId;
              const medicineCourseValues = medicineCourses.map((medicineCourse) => [
                course_id,
                medicineCourse.medicine_name,
                status,
                medicineCourse.start_date,
                medicineCourse.end_date,
                medicineCourse.frequency,
                medicineCourse.medtype,
              ]);

              connection.query(
                "INSERT INTO MedicineCourses (course_id, medicine_name, status, start_date, end_date, frequency, medtype) VALUES ?",
                [medicineCourseValues],
                (err, medicineResults) => {
                  if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Error creating medicine courses" });
                  }

                  // Track whether all intakes are created
                  let pendingIntakeCreations = medicineCourseValues.length;
                  let anyIntakeErrors = false;

                  medicineCourseValues.forEach((medicineCourse, index) => {
                    let intakeValues = [];
                    let currentDate = new Date(medicineCourse[3]); // start_date
                    let endDate = new Date(medicineCourse[4]);     // end_date

                    while (currentDate <= endDate) {
                      const formattedDate = currentDate.toISOString().split("T")[0];

                      const times = [
                        { hour: usertimes.morning_time, flag: 0 },
                        { hour: usertimes.afternoon_time, flag: 1 },
                        { hour: usertimes.evening_time, flag: 2 },
                        { hour: usertimes.night_time, flag: 3 },
                      ];

                      times.forEach(({ hour, flag }) => {
                        if (medicineCourse[5][flag] === "1") {
                          const beforeafter = medicineCourse[6] === "0" ? 0 : 1;
                          const baseTime = moment(`${formattedDate} ${hour}`, 'YYYY-MM-DD HH:mm:ss');
                          if (beforeafter === 1) baseTime.add(30, 'minutes');
                          const datetime = baseTime.format('YYYY-MM-DD HH:mm:ss');
                          intakeValues.push([medicineResults.insertId + index, datetime, beforeafter]);
                        }
                      });

                      currentDate.setDate(currentDate.getDate() + 1);
                    }

                    if (intakeValues.length > 0) {
                      connection.query(
                        "INSERT INTO MedicineIntakes (medicine_course_id, scheduled_at, beforeafter) VALUES ?",
                        [intakeValues],
                        (err) => {
                          if (err) {
                            console.error(err);
                            anyIntakeErrors = true;
                          }

                          // Decrement pending count and check if all are done
                          pendingIntakeCreations--;
                          if (pendingIntakeCreations === 0) {
                            if (anyIntakeErrors) {
                              res.status(201).json({
                                message: "Course created with some errors in medicine intakes"
                              });
                            } else {
                              res.status(201).json({
                                message: "Course created successfully with all intakes"
                              });
                            }
                          }
                        }
                      );
                    } else {
                      // No intakes to create for this medicine
                      pendingIntakeCreations--;
                      if (pendingIntakeCreations === 0) {
                        res.status(201).json({
                          message: anyIntakeErrors
                            ? "Course created with some errors in medicine intakes"
                            : "Course created successfully with all intakes"
                        });
                      }
                    }
                  });

                  // Handle the case where there are no medicine courses
                  if (medicineCourseValues.length === 0) {
                    res.status(201).json({ message: "Course created with no medicine courses" });
                  }
                }
              );
            }
          );
        }
      );
    }
  );
};

const addMedicineCourse = (req, res) => {
  const { course_id, medicine_name, status, start_date, end_date, frequency, medtype } =
    req.body;
  connection.query(
    "INSERT INTO MedicineCourses (course_id, medicine_name, status, start_date, end_date, frequency, medtype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [course_id, medicine_name, status, start_date, end_date, frequency, medtype],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error adding medicine course" });
      }
      res.status(201).json({ message: "Medicine course added" });
    }
  );
};


const getLast7DayMatrix = (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Get the current date and the date 7 days ago using moment with IST timezone
  const today = moment().endOf('day'); // End of today

  const sevenDaysAgo = moment(today).subtract(6, 'days').startOf('day'); // Start of 7 days ago (including today)

  const formattedToday = today.format('YYYY-MM-DD HH:mm:ss');
  const formattedSevenDaysAgo = sevenDaysAgo.format('YYYY-MM-DD HH:mm:ss');

  // Query to get all medication intakes for the user in the last 7 days
  const query = `
    SELECT 
      mi.scheduled_at,
      mi.taken_at
    FROM MedicineIntakes mi
    JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
    JOIN Courses c ON mc.course_id = c.course_id
    WHERE c.user_id = ? 
    AND mi.scheduled_at BETWEEN ? AND ?
    ORDER BY mi.scheduled_at ASC
  `;

  connection.query(query, [user_id, formattedSevenDaysAgo, formattedToday], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching medication data" });
    }

    // Initialize the result object with all 7 days
    const dayMatrix = {};

    // Create entries for each of the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = moment(today).subtract(i, 'days');
      const dateString = date.format('YYYY-MM-DD'); // YYYY-MM-DD format
      dayMatrix[`day${7 - i}`] = {
        date: dateString,
        total: 0,
        taken: 0,
        percentage: 0
      };
    }

    // Process each medication intake
    results.forEach(intake => {
      const intakeDate = moment(intake.scheduled_at);

      // Calculate which day this belongs to (1-7)
      const dayDiff = today.diff(intakeDate, 'days');
      const dayKey = `day${7 - dayDiff}`;

      // Only count if it's within our 7-day window
      if (dayDiff >= 0 && dayDiff < 7) {
        dayMatrix[dayKey].total++;
        if (intake.taken_at !== null) {
          dayMatrix[dayKey].taken++;
        }
      }
    });

    // Calculate percentages
    for (let i = 1; i <= 7; i++) {
      const dayKey = `day${i}`;
      if (dayMatrix[dayKey].total > 0) {
        dayMatrix[dayKey].percentage = Math.round((dayMatrix[dayKey].taken / dayMatrix[dayKey].total) * 100);
      } else {
        dayMatrix[dayKey].percentage = 0; // No medications scheduled for this day
      }
    }

    // Convert to the simplified format requested in the comments
    const simplifiedMatrix = {};
    for (let i = 1; i <= 7; i++) {
      const dayKey = `day${i}`;
      simplifiedMatrix[dayKey] = dayMatrix[dayKey].percentage;
    }

    res.status(200).json({
      adherenceMatrix: simplifiedMatrix,
      detailedMatrix: dayMatrix
    });
  });
};

// Get today's schedule grouped by course ID
const getTodaysSchedule = (req, res) => {
  // Allow both query parameters and route parameters
  const user_id = req.body.user_id;

  // Allow specifying a date, default to today in IST
  const dateStr = req.query.date || moment().format('YYYY-MM-DD');

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Get current time for status determination
  const now = moment();
  console.log(now.format('YYYY-MM-DD HH:mm:ss'));

  // Query to get medication intakes for the specified user on the requested date
  const query = `SELECT mi.intake_id, mc.medicine_course_id, mc.course_id, mc.medicine_name, 
                mi.scheduled_at, mi.taken_at, mi.beforeafter, mc.medtype 
                FROM MedicineIntakes mi 
                JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id 
                JOIN Courses c ON mc.course_id = c.course_id 
                WHERE c.user_id = ? AND DATE(mi.scheduled_at) = ? 
                ORDER BY mi.scheduled_at ASC`;

  connection.query(query, [user_id, dateStr], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching schedule" });
    }

    // Process results without grouping by course
    let takenIntakes = 0;
    let missedIntakes = 0;
    let upcomingIntakes = 0;
    let takeNowIntakes = 0;

    const intakes = results.map(item => {
      const scheduledTime = moment(item.scheduled_at);

      // Add 30 minutes to scheduled time for TakeNow window
      const takeNowWindow = moment(scheduledTime).add(30, 'minutes');

      let status = 'Upcoming';

      if (item.taken_at) {
        status = 'Taken';
        takenIntakes++;
      } else if (now.isSameOrAfter(scheduledTime) && now.isSameOrBefore(takeNowWindow)) {
        status = 'TakeNow';
        takeNowIntakes++;
      } else if (now.isAfter(takeNowWindow)) {
        status = 'Missed';
        missedIntakes++;
      } else {
        upcomingIntakes++;
      }

      return {
        intake_id: item.intake_id,
        medicine_name: item.medicine_name,
        medicine_course_id: item.medicine_course_id,
        course_id: item.course_id,
        scheduled_at: moment(item.scheduled_at).format('YYYY-MM-DD HH:mm:ss'),
        taken_at: item.taken_at ? moment(item.taken_at).format('YYYY-MM-DD HH:mm:ss') : null,
        status: status,
        timing: item.beforeafter === 0 ? 'Before meal' : 'After meal',
        medtype: item.medtype === '0' ? 'Pill' : 'Liquid',
        pillcount: 1
      };
    });

    res.status(200).json({
      date: dateStr,
      total_intakes: results.length,
      taken_intakes: takenIntakes,
      missed_intakes: missedIntakes,
      upcoming_intakes: upcomingIntakes,
      take_now_intakes: takeNowIntakes,
      schedule: intakes
    });
  });
};

const deleteCourse = (req, res) => {
  const { course_id } = req.params;
  connection.query(
    "DELETE FROM Courses WHERE course_id = ?",
    [course_id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error deleting course" });
      }
      res.status(200).json({ message: "Course deleted" });
    }
  );
};

const getLifetimeMatrix = (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Get the current date and time using moment with IST timezone
  const now = moment();
  const formattedNow = now.format('YYYY-MM-DD HH:mm:ss');

  // Query to get all medication intakes for the user up until now
  const query = `
    SELECT 
      mi.scheduled_at,
      mi.taken_at,
      DATE(mi.scheduled_at) as intake_date
    FROM MedicineIntakes mi
    JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
    JOIN Courses c ON mc.course_id = c.course_id
    WHERE c.user_id = ? 
    AND mi.scheduled_at <= ?
    ORDER BY mi.scheduled_at ASC
  `;

  connection.query(query, [user_id, formattedNow], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching lifetime medication data" });
    }

    // Initialize counters and tracking objects
    const dateMatrix = {};
    let totalIntakes = 0;
    let takenIntakes = 0;

    // Process each medication intake
    results.forEach(intake => {
      const dateString = intake.intake_date;

      // Initialize the date entry if it doesn't exist
      if (!dateMatrix[dateString]) {
        dateMatrix[dateString] = {
          date: dateString,
          total: 0,
          taken: 0,
          percentage: 0
        };
      }

      // Update the date counts
      dateMatrix[dateString].total++;
      totalIntakes++;

      if (intake.taken_at !== null) {
        dateMatrix[dateString].taken++;
        takenIntakes++;
      }
    });

    // Calculate percentages for each date
    for (const date in dateMatrix) {
      if (dateMatrix[date].total > 0) {
        dateMatrix[date].percentage = Math.round((dateMatrix[date].taken / dateMatrix[date].total) * 100);
      }
    }

    // Calculate overall adherence percentage
    const overallPercentage = totalIntakes > 0 ? Math.round((takenIntakes / totalIntakes) * 100) : 0;

    // Get the first and last dates for the range
    const dates = Object.keys(dateMatrix).sort();

    // Count days with perfect adherence (100%)
    const perfectDays = Object.values(dateMatrix).filter(day => day.percentage === 100 && day.total > 0).length;

    // Count days with no adherence (0% but scheduled medications)
    const missedDays = Object.values(dateMatrix).filter(day => day.percentage === 0 && day.total > 0).length;

    res.status(200).json({
      lifetimeAdherence: {
        overallPercentage,
        totalDays: dates.length,
        perfectDays,
        missedDays,
        totalIntakes,
        takenIntakes
      },
      dailyBreakdown: dateMatrix
    });
  });
};

const getMedicationCourses = (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  // Query to get all courses and their associated medicine courses for the user
  const query = `
    SELECT 
      c.course_id,
      c.doctor_id,
      c.status as course_status,
      c.start_date as course_start_date,
      c.end_date as course_end_date,
      c.created_at as course_created_at,
      c.updated_at as course_updated_at,
      mc.medicine_course_id,
      mc.medicine_name,
      mc.status as medicine_status,
      mc.start_date as medicine_start_date,
      mc.end_date as medicine_end_date,
      mc.frequency,
      mc.medtype,
      mc.pill_stock,
      mc.created_at as medicine_created_at,
      mc.updated_at as medicine_updated_at,
      (SELECT name FROM Users WHERE user_id = c.doctor_id) as doctor_name
    FROM Courses c
    LEFT JOIN MedicineCourses mc ON c.course_id = mc.course_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC, mc.created_at ASC
  `;

  connection.query(query, [user_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching medication courses" });
    }

    if (results.length === 0) {
      return res.status(200).json({
        message: "No medication courses found for this user",
        courses: []
      });
    }

    // Process the results to group medicine courses by their parent course
    const coursesMap = {};

    results.forEach(row => {
      // If this course hasn't been added to our map yet
      if (!coursesMap[row.course_id]) {
        coursesMap[row.course_id] = {
          course_id: row.course_id,
          doctor_id: row.doctor_id,
          doctor_name: row.doctor_name,
          status: row.course_status,
          start_date: row.course_start_date,
          end_date: row.course_end_date,
          created_at: row.course_created_at,
          updated_at: row.course_updated_at,
          medicine_courses: []
        };
      }

      // Add this medicine course to the parent course if it exists
      if (row.medicine_course_id) {
        coursesMap[row.course_id].medicine_courses.push({
          medicine_course_id: row.medicine_course_id,
          medicine_name: row.medicine_name,
          status: row.medicine_status,
          start_date: row.medicine_start_date,
          end_date: row.medicine_end_date,
          frequency: row.frequency,
          medtype: row.medtype,
          pill_stock: row.pill_stock,
          created_at: row.medicine_created_at,
          updated_at: row.medicine_updated_at
        });
      }
    });

    // Convert the map to an array
    const courses = Object.values(coursesMap);

    // Add adherence statistics for each medicine course
    const adherencePromises = courses.map(course => {
      return new Promise((resolve, reject) => {
        // For each medicine course, get adherence stats
        const medicinePromises = course.medicine_courses.map(medicine => {
          return new Promise((resolveInner, rejectInner) => {
            const adherenceQuery = `
              SELECT 
                COUNT(*) as total_intakes,
                SUM(CASE WHEN taken_at IS NOT NULL THEN 1 ELSE 0 END) as taken_intakes
              FROM MedicineIntakes
              WHERE medicine_course_id = ?
              AND scheduled_at <= NOW()
            `;

            connection.query(adherenceQuery, [medicine.medicine_course_id], (err, adherenceResults) => {
              if (err) {
                console.error(err);
                rejectInner(err);
              } else {
                const totalIntakes = adherenceResults[0].total_intakes || 0;
                const takenIntakes = adherenceResults[0].taken_intakes || 0;
                const adherencePercentage = totalIntakes > 0 ? Math.round((takenIntakes / totalIntakes) * 100) : 0;

                medicine.adherence = {
                  total_intakes: totalIntakes,
                  taken_intakes: parseInt(takenIntakes),
                  percentage: adherencePercentage
                };

                resolveInner();
              }
            });
          });
        });

        Promise.all(medicinePromises)
          .then(() => resolve())
          .catch(err => reject(err));
      });
    });

    // Wait for all adherence calculations to complete
    Promise.all(adherencePromises)
      .then(() => {
        res.status(200).json({
          courses: courses
        });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: "Error calculating adherence statistics" });
      });
  });
};

const takeMedicine = (req, res) => {
  const { intake_id } = req.body;

  if (!intake_id) {
    return res.status(400).json({ message: "Intake ID is required" });
  }

  // Use moment.js for consistent timezone handling
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(currentTime);

  connection.query(
    "UPDATE MedicineIntakes SET taken_at = ? WHERE intake_id = ?",
    [currentTime, intake_id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error updating medication intake" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Intake not found" });
      }

      // Decrement pill stock and check for restock alert
      decrementAndCheckStock(intake_id);

      res.status(200).json({
        message: "Medication marked as taken",
        taken_at: currentTime
      });
    }
  );
};

const syncTodayIntake = (req, res) => {
  const { user_id } = req.body;
  const intakesData = req.body.intakes; // This should be a string in format "[[time, box nos], [time, box nos]]"

  if (!user_id || !intakesData) {
    return res.status(400).json({ message: "User ID and intakes data are required" });
  }

  try {
    // Parse the intakes data from string to actual 2D array
    const intakes = JSON.parse(intakesData);

    if (!Array.isArray(intakes) || intakes.some(item => !Array.isArray(item) || item.length !== 2)) {
      return res.status(400).json({ message: "Invalid intakes format. Expected format: [[time, box nos], [time, box nos]]" });
    }

    // Get today's date in YYYY-MM-DD format
    const today = moment().format('YYYY-MM-DD');

    // Process each intake record
    const processIntakes = async () => {
      let successCount = 0;
      let errorCount = 0;

      for (const [time, boxNos] of intakes) {
        // Format the time to match database format
        const scheduledTime = `${today} ${time}`;

        // Update the corresponding medicine intakes
        connection.query(
          `UPDATE MedicineIntakes mi
           JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
           JOIN Courses c ON mc.course_id = c.course_id
           SET mi.taken_at = NOW(), mi.box_number = ?
           WHERE c.user_id = ? 
           AND DATE(mi.scheduled_at) = ? 
           AND TIME(mi.scheduled_at) = ?
           AND mi.taken_at IS NULL`,
          [boxNos, user_id, today, time],
          (err, results) => {
            if (err) {
              errorCount++;
              console.error(`Error updating intake for time ${time}:`, err);
            } else if (results.affectedRows > 0) {
              successCount++;
              // Decrement pill stock for all affected intakes at this time
              connection.query(
                `SELECT mi.intake_id FROM MedicineIntakes mi
                 JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
                 JOIN Courses c ON mc.course_id = c.course_id
                 WHERE c.user_id = ? AND DATE(mi.scheduled_at) = ? AND TIME(mi.scheduled_at) = ?`,
                [user_id, today, time],
                (lookupErr, intakeRows) => {
                  if (!lookupErr && intakeRows) {
                    intakeRows.forEach(row => decrementAndCheckStock(row.intake_id));
                  }
                }
              );
            }

            // Check if all intakes have been processed
            if (successCount + errorCount === intakes.length) {
              return res.status(200).json({
                message: `Processed ${intakes.length} intake records with ${successCount} successful updates and ${errorCount} errors`,
                success: successCount,
                errors: errorCount
              });
            }
          }
        );
      }
    };

    processIntakes();

  } catch (error) {
    console.error("Error processing intakes data:", error);
    return res.status(500).json({ message: "Error processing intakes data" });
  }
};

/**
 * Decrement pill_stock for a medicine course after a pill is taken,
 * and send a WhatsApp restock alert if stock <= 2.
 */
const decrementAndCheckStock = (intakeId) => {
  // 1. Get the medicine_course_id for this intake
  connection.query(
    `SELECT mi.medicine_course_id, mc.medicine_name, mc.pill_stock
     FROM MedicineIntakes mi
     JOIN MedicineCourses mc ON mi.medicine_course_id = mc.medicine_course_id
     WHERE mi.intake_id = ?`,
    [intakeId],
    (err, rows) => {
      if (err || !rows || rows.length === 0) return;

      const { medicine_course_id, medicine_name, pill_stock } = rows[0];

      // 2. Decrement pill_stock (floor at 0)
      const newStock = Math.max(0, pill_stock - 1);
      connection.query(
        `UPDATE MedicineCourses SET pill_stock = ? WHERE medicine_course_id = ?`,
        [newStock, medicine_course_id],
        (updateErr) => {
          if (updateErr) {
            console.error(`Error decrementing pill_stock for medicine_course_id ${medicine_course_id}:`, updateErr);
            return;
          }

          console.log(`pill_stock for ${medicine_name} (id=${medicine_course_id}): ${pill_stock} → ${newStock}`);

          // 3. If stock <= 2 after taking, send restock alert
          if (newStock <= 2) {
            // Count remaining untaken intakes to tell user how many more pills they need
            connection.query(
              `SELECT COUNT(*) as remaining FROM MedicineIntakes
               WHERE medicine_course_id = ? AND taken_at IS NULL AND scheduled_at > NOW()`,
              [medicine_course_id],
              (countErr, countRows) => {
                const remaining = (!countErr && countRows && countRows[0]) ? countRows[0].remaining : '?';
                const msg = `⚠️ Low stock alert! You only have ${newStock} pill(s) of *${medicine_name}* left. You still need ${remaining} more pill(s) to complete the course. Please refill soon!`;
                console.log(`Restock alert: ${msg}`);
                sendMessage(msg, PHONE_NUMBER);
              }
            );
          }
        }
      );
    }
  );
};

/**
 * PUT /course/pill-stock
 * Update the pill stock for a specific medicine course.
 * Body: { medicine_course_id, pill_stock }
 */
const updatePillStock = (req, res) => {
  const { user_id, medicine_course_id, pill_stock } = req.body;

  if (!user_id || !medicine_course_id || pill_stock === undefined || pill_stock === null) {
    return res.status(400).json({ message: "user_id, medicine_course_id, and pill_stock are required" });
  }

  if (typeof pill_stock !== 'number' || pill_stock < 0 || !Number.isInteger(pill_stock)) {
    return res.status(400).json({ message: "pill_stock must be a non-negative integer" });
  }

  // Validate the medicine course belongs to the user
  connection.query(
    `SELECT mc.medicine_course_id FROM MedicineCourses mc
     JOIN Courses c ON mc.course_id = c.course_id
     WHERE mc.medicine_course_id = ? AND c.user_id = ?`,
    [medicine_course_id, user_id],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error validating medicine course" });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Medicine course not found for this user" });
      }

      connection.query(
        `UPDATE MedicineCourses SET pill_stock = ? WHERE medicine_course_id = ?`,
        [pill_stock, medicine_course_id],
        (updateErr, result) => {
          if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: "Error updating pill stock" });
          }

          res.status(200).json({
            message: "Pill stock updated successfully",
            medicine_course_id,
            pill_stock
          });
        }
      );
    }
  );
};

module.exports = {
  newCourse,
  addMedicineCourse,
  getLast7DayMatrix,
  getTodaysSchedule,
  deleteCourse,
  getLifetimeMatrix,
  getMedicationCourses,
  takeMedicine,
  syncTodayIntake,
  updatePillStock
};