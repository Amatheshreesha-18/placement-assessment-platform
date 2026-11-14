const { z } = require('zod');
const { RESOURCE_CATEGORY, RESOURCE_DIFFICULTY } = require('../utils/constants');

const createResourceSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(RESOURCE_CATEGORY),
  difficulty: z.nativeEnum(RESOURCE_DIFFICULTY).default(RESOURCE_DIFFICULTY.MEDIUM),
  url: z.string().url('A valid URL is required'),
  type: z.string().default('article'),
});

const updateProgressSchema = z.object({
  is_completed: z.boolean(),
});

module.exports = {
  createResourceSchema,
  updateProgressSchema,
};
