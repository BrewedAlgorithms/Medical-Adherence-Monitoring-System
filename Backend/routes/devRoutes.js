const express = require('express');
const devController = require('../controllers/devController.js');

const router = express.Router();

router.delete('/delete-all-courses', devController.deleteAllCourses);
router.get('/delete-all-courses', devController.deleteAllCourses);
router.post('/intake-in-1min', devController.setIntakeIn1Min);
router.get('/intake-in-1min', devController.setIntakeIn1Min);
router.get('/intake-in-30sec', devController.setIntakeIn30Sec);
router.get('/intake-in-30sec/:count', devController.setIntakeIn30SecMultiple);

module.exports = router;
