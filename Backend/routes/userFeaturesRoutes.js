const express = require('express');
const { authUser } = require('../middlewares/authUser.js');
const userFeaturesRoutes = require('../controllers/userFeaturesController.js');

const router = express.Router();

router.post('/note', authUser, userFeaturesRoutes.updateUserNotes);
router.get('/note', authUser, userFeaturesRoutes.getUserNotes);
router.get('/profile', authUser, userFeaturesRoutes.getUserProfile);
router.get('/medication-times', authUser, userFeaturesRoutes.getMedicationTimes);
router.put('/medication-times', authUser, userFeaturesRoutes.updateMedicationTimes);


module.exports = router;