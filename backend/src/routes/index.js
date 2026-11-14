const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const studentRoutes = require('../modules/students/students.routes');
const resourceRoutes = require('../modules/resources/resources.routes');
const assessmentRoutes = require('../modules/assessments/assessments.routes');
const resumeRoutes = require('../modules/resume/resume.routes');
const companyRoutes = require('../modules/companies/companies.routes');
const placementRoutes = require('../modules/placements/placements.routes');
const applicationRoutes = require('../modules/applications/applications.routes');

// Mount routes under /api/v1
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/resources', resourceRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/resumes', resumeRoutes);
router.use('/companies', companyRoutes);
router.use('/placements', placementRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;
