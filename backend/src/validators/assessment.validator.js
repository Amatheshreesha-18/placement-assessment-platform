const { z } = require('zod');

const createAssessmentSchema = z.object({
  title: z.string().min(3, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  category: z.string().min(2),
  duration_minutes: z.number().int().min(1).max(300),
  total_marks: z.number().int().min(1),
  pass_marks: z.number().int().min(0),
  is_active: z.boolean().default(true),
});

const createQuestionSchema = z.object({
  assessment_id: z.string().uuid(),
  question_text: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(['A', 'B', 'C', 'D']),
  marks: z.number().int().min(1).default(1),
  explanation: z.string().optional().nullable(),
});

const submitAssessmentSchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      selected_option: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
    })
  ),
});

module.exports = {
  createAssessmentSchema,
  createQuestionSchema,
  submitAssessmentSchema,
};
