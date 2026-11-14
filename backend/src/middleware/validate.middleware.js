/**
 * Generic Zod validation middleware generator
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // assign sanitized/parsed data back
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { validate };
