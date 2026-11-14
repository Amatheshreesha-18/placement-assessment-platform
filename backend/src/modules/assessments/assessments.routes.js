const express = require('express');
const router = express.Router();

const {
  getAssessments,
  getAssessmentById,
  startAttempt,
  getAttemptQuestions,
  submitAttempt,
  getAttemptResult,
  getAssessmentHistory,
  createAssessment,
  addQuestion,
} = require('./assessments.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createAssessmentSchema,
  createQuestionSchema,
  submitAssessmentSchema,
} = require('../../validators/assessment.validator');
const { ROLES } = require('../../utils/constants');

// All assessment actions require authentication
router.use(requireAuth);

// Student & TPO Assessment Browsing
router.get('/', getAssessments);
router.get('/history', getAssessmentHistory);
router.get('/history/:studentId', requireRole(ROLES.TPO), getAssessmentHistory);
router.get('/:id', getAssessmentById);

// Attempt Workflow
router.post('/:id/start', startAttempt);
router.get('/attempts/:attemptId/questions', getAttemptQuestions);
router.post('/attempts/submit', validate(submitAssessmentSchema), submitAttempt);
router.get('/attempts/:attemptId/result', getAttemptResult);

// TPO Management
router.post('/', requireRole(ROLES.TPO), validate(createAssessmentSchema), createAssessment);
router.post('/questions', requireRole(ROLES.TPO), validate(createQuestionSchema), addQuestion);

module.exports = router;
