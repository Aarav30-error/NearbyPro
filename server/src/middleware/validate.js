export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = result.error.errors.map((issue) => {
        const field = issue.path.join('.') || 'value';
        return {
          field,
          message: issue.message,
        };
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace with parsed and stripped data
    req[source] = result.data;
    next();
  };
};

export default validate;
