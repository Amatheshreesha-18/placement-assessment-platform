const express = require('express');
const router = express.Router();

const {
  getResumes,
  getResumeById,
  createResumeMetadata,
  updateResumeMetadata,
  uploadResumePdf,
  deleteResume,
} = require('./resume.controller');

const { requireAuth } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { uploadResume } = require('../../middleware/upload.middleware');
const { resumeMetadataSchema } = require('../../validators/resume.validator');

// All resume routes require authentication
router.use(requireAuth);

router.get('/', getResumes);
router.get('/:id', getResumeById);
router.post('/', validate(resumeMetadataSchema), createResumeMetadata);
router.put('/:id', validate(resumeMetadataSchema), updateResumeMetadata);
router.delete('/:id', deleteResume);

// PDF Upload routes
router.post('/upload', uploadResume.single('file'), uploadResumePdf);
router.put('/:id/upload', uploadResume.single('file'), uploadResumePdf);

module.exports = router;
