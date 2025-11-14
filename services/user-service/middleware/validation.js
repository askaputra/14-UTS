const Joi = require('joi');

// Skema registrasi user BARU
const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Skema login user BARU
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Skema tim BARU (INI YANG HILANG)
const teamSchema = Joi.object({
  name: Joi.string().min(2).max(50).required()
});

// Fungsi helper validasi
const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.details[0].message
    });
  }
  next();
};

// Ekspor BARU
module.exports = {
  validateUser: validateRequest(userSchema),
  validateLogin: validateRequest(loginSchema),
  validateTeam: validateRequest(teamSchema) // <-- SEKARANG validateTeam SUDAH ADA
};