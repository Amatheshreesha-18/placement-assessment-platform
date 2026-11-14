const express = require('express');
const router = express.Router();

const {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  closeOpportunity,
} = require('./placements.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createOpportunitySchema } = require('../../validators/placement.validator');
const { ROLES } = require('../../utils/constants');

router.use(requireAuth);

router.get('/', getOpportunities);
router.get('/:id', getOpportunityById);

// TPO Management
router.post('/', requireRole(ROLES.TPO), validate(createOpportunitySchema), createOpportunity);
router.put('/:id', requireRole(ROLES.TPO), updateOpportunity);
router.patch('/:id/close', requireRole(ROLES.TPO), closeOpportunity);

module.exports = router;
