const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const handleValidation = require("../middleware/validationMiddleware");
const { COLLEGE_DOMAIN } = require("../utils/constants");

const router = express.Router();

router.get("/register", authController.renderRegister);
router.get("/login", authController.renderLogin);
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 3, max: 60 }).withMessage("Enter your full name."),
    body("department").trim().isLength({ min: 2, max: 80 }).withMessage("Enter your department."),
    body("email")
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage("Enter a valid email address.")
      .custom((value) => value.endsWith(COLLEGE_DOMAIN))
      .withMessage(`Use your college email ending with ${COLLEGE_DOMAIN}.`),
    body("password")
      .isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
      })
      .withMessage("Password must include upper, lower, number, and symbol."),
    body("confirmPassword").custom((value, { req }) => value === req.body.password).withMessage("Passwords do not match.")
  ],
  handleValidation("auth/register", "Create Account"),
  authController.register
);
router.post(
  "/login",
  [
    body("email")
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage("Enter a valid email address.")
      .custom((value) => value.endsWith(COLLEGE_DOMAIN))
      .withMessage(`Use your college email ending with ${COLLEGE_DOMAIN}.`),
    body("password").notEmpty().withMessage("Password is required.")
  ],
  handleValidation("auth/login", "Sign In"),
  authController.login
);
router.post("/logout", authController.logout);

module.exports = router;
