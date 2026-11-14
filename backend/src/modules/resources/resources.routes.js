const express = require('express');
const router = express.Router();

const {
  getResources,
  getResourceById,
  updateResourceProgress,
  getStudentProgress,
  createResource,
  deleteResource,
} = require('./resources.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  createResourceSchema,
  updateProgressSchema,
} = require('../../validators/resource.validator');
const { ROLES } = require('../../utils/constants');

// Public or optionally authenticated to browse resources
router.get('/', requireAuth, getResources);
router.get('/progress/summary', requireAuth, getStudentProgress);
router.get('/:id', requireAuth, getResourceById);

// Student progress marking
router.put('/:id/progress', requireAuth, validate(updateProgressSchema), updateResourceProgress);

// TPO resource management
router.post('/', requireAuth, requireRole(ROLES.TPO), validate(createResourceSchema), createResource);
router.delete('/:id', requireAuth, requireRole(ROLES.TPO), deleteResource);

module.exports = router;
