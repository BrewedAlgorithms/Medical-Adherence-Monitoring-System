const express = require('express');
const courseController = require('../controllers/courseController.js');
const { authUser } = require('../middlewares/authUser.js');

const router = express.Router();


router.post('/new', authUser, courseController.newCourse);
router.post('/addMedicineCourse', authUser, courseController.addMedicineCourse);
router.get('/last-7-day-matrix', authUser, courseController.getLast7DayMatrix);
router.get('/todays-schedule', authUser, courseController.getTodaysSchedule);
router.delete('/:course_id', authUser, courseController.deleteCourse);
router.get('/lifetime-matrix', authUser, courseController.getLifetimeMatrix);
router.get('/medication-courses', authUser, courseController.getMedicationCourses);
router.post('/take-medicine', authUser, courseController.takeMedicine);
router.post('/today-intake/sync', authUser, courseController.syncTodayIntake);
router.put('/pill-stock', authUser, courseController.updatePillStock);

module.exports = router;