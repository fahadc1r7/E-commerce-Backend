const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { register, login } = require("../controllers/authentication");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.post("/register",
  [body("name").trim().escape().notEmpty(),
   body("email").isEmail().normalizeEmail(),
   body("password").isLength({ min: 6 })],
  validate, register);

router.post("/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate, login);

module.exports = router;