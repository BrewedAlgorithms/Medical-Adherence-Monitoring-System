const express = require('express');
const devController = require('../controllers/devController.js');

const router = express.Router();

router.delete('/delete-all-courses', devController.deleteAllCourses);
router.get('/delete-all-courses', devController.deleteAllCourses);

module.exports = router;
