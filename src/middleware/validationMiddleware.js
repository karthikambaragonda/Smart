const { validationResult } = require("express-validator");

module.exports = function handleValidation(view, title) {
  return (req, res, next) => {
    const result = validationResult(req);

    if (result.isEmpty()) {
      return next();
    }

    return res.status(422).render(view, {
      title,
      errors: result.array(),
      formData: req.body
    });
  };
};
