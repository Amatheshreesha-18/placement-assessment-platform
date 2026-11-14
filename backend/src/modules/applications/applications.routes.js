const express = require('express');
const router = express.Router();

const {
  checkEligibility,
  applyForOpportunity,
  getMyApplications,
  getApplicationsForTpo,
  updateApplicationStatus,
} = require('./applications.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  applyOpportunitySchema,
  updateApplicationStatusSchema,
} = require('../../validators/placement.validator');
const { ROLES } = require('../../utils/constants');

router.use(requireAuth);

// Student application routes
router.get('/my-applications', getMyApplications);
router.get('/check-eligibility/:opportunityId', checkEligibility);
router.post('/apply', validate(applyOpportunitySchema), applyForOpportunity);

// TPO application management routes
router.get('/', requireRole(ROLES.TPO), getApplicationsForTpo);
router.get('/opportunity/:opportunityId', requireRole(ROLES.TPO), getApplicationsForTpo);
router.patch(
  '/:id/status',
  requireRole(ROLES.TPO),
  validate(updateApplicationStatusSchema),
  updateApplicationStatus
);

module.exports = router;
