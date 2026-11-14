const { z } = require('zod');

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  usn: z.string().min(3).max(20).optional().nullable(),
  college: z.string().min(2).max(150).optional().nullable(),
  department: z.string().min(2).max(100).optional().nullable(),
  semester: z.number().int().min(1).max(8).optional().nullable(),
  cgpa: z.number().min(0).max(10).optional().nullable(),
  backlogs: z.number().int().min(0).default(0).optional(),
  graduation_year: z.number().int().min(2000).max(2100).optional().nullable(),
  github_url: z.string().url().optional().nullable().or(z.literal('')),
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')),
  portfolio_url: z.string().url().optional().nullable().or(z.literal('')),
});

const skillSchema = z.object({
  skill_name: z.string().min(1, 'Skill name is required').max(50),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
});

const projectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(150),
  description: z.string().max(1000).optional().nullable(),
  tech_stack: z.array(z.string()).default([]),
  github_link: z.string().url().optional().nullable().or(z.literal('')),
  live_link: z.string().url().optional().nullable().or(z.literal('')),
});

const certificationSchema = z.object({
  title: z.string().min(1, 'Certification title is required').max(150),
  issuer: z.string().min(1, 'Issuer name is required').max(150),
  issue_date: z.string().optional().nullable(),
  credential_url: z.string().url().optional().nullable().or(z.literal('')),
});

module.exports = {
  updateProfileSchema,
  skillSchema,
  projectSchema,
  certificationSchema,
};
