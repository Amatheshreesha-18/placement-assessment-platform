const express = require('express');
const router = express.Router();

const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
} = require('./companies.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { createCompanySchema } = require('../../validators/placement.validator');
const { ROLES } = require('../../utils/constants');

router.use(requireAuth);

router.get('/', getCompanies);
router.get('/:id', getCompanyById);

// TPO Management
router.post('/', requireRole(ROLES.TPO), validate(createCompanySchema), createCompany);
router.put('/:id', requireRole(ROLES.TPO), updateCompany);

module.exports = router;
