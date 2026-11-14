const { z } = require('zod');
const { APPLICATION_STATUS, OPPORTUNITY_STATUS } = require('../utils/constants');

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name is required').max(150),
  website: z.string().url().optional().nullable().or(z.literal('')),
  description: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal('')),
});

const createOpportunitySchema = z.object({
  company_id: z.string().uuid('Valid company ID is required'),
  title: z.string().min(2).max(150),
  job_role: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  ctc_package: z.string().optional().nullable(),
  min_cgpa: z.number().min(0).max(10).default(0),
  eligible_branches: z.array(z.string()).min(1, 'At least one eligible branch is required'),
  max_backlogs: z.number().int().min(0).default(0),
  required_skills: z.array(z.string()).default([]),
  graduation_year: z.number().int().min(2000).max(2100),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  status: z.nativeEnum(OPPORTUNITY_STATUS).default(OPPORTUNITY_STATUS.OPEN),
});

const applyOpportunitySchema = z.object({
  opportunity_id: z.string().uuid(),
  resume_id: z.string().uuid().optional().nullable(),
});

const updateApplicationStatusSchema = z.object({
  status: z.nativeEnum(APPLICATION_STATUS),
  remarks: z.string().optional().nullable(),
});

module.exports = {
  createCompanySchema,
  createOpportunitySchema,
  applyOpportunitySchema,
  updateApplicationStatusSchema,
};
