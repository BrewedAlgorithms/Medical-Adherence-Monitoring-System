const express = require("express");
const mediaController = require("../controllers/mediaController");
const { authUser } = require('../middlewares/authUser.js');

const router = express.Router();

// Phase 1: Upload image → AI extract → save as pending draft
router.post("/uploadPrescription", authUser, mediaController.uploadPrescription);

// Phase 2: Human review lifecycle
router.get("/prescriptionDraft/:draft_id", authUser, mediaController.getDraft);
router.put("/prescriptionDraft/:draft_id", authUser, mediaController.updateDraft);
router.post("/prescriptionDraft/:draft_id/confirm", authUser, mediaController.confirmPrescription);

router.post("/uploadVoiceNote/:course_id", mediaController.uploadVoiceNote);

module.exports = router;
