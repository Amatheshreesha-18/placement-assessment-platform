const express = require('express');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  getCompletion,
  getSkills,
  addSkill,
  deleteSkill,
  getProjects,
  addProject,
  deleteProject,
  getCertifications,
  addCertification,
  deleteCertification,
  listStudents,
} = require('./students.controller');

const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const {
  updateProfileSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
} = require('../../validators/student.validator');
const { ROLES } = require('../../utils/constants');

// All student routes require authentication
router.use(requireAuth);

// TPO: List all students
router.get('/', requireRole(ROLES.TPO), listStudents);

// Student Profile (Authenticated student or TPO viewing a student profile)
router.get('/profile', getProfile);
router.get('/profile/completion', getCompletion);
router.get('/profile/:id', requireRole(ROLES.TPO), getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);

// Skills
router.get('/skills', getSkills);
router.post('/skills', validate(skillSchema), addSkill);
router.delete('/skills/:id', deleteSkill);

// Projects
router.get('/projects', getProjects);
router.post('/projects', validate(projectSchema), addProject);
router.delete('/projects/:id', deleteProject);

// Certifications
router.get('/certifications', getCertifications);
router.post('/certifications', validate(certificationSchema), addCertification);
router.delete('/certifications/:id', deleteCertification);

module.exports = router;
