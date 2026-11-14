const { z } = require('zod');

const resumeMetadataSchema = z.object({
  title: z.string().min(1, 'Resume title is required').max(100),
  template_id: z.string().default('template-1'),
  resume_data: z.record(z.any()).optional().default({}),
});

module.exports = {
  resumeMetadataSchema,
};
