const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/managerController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(ensureAuthenticated, ensureRole(["manager"]));

router.get("/dashboard", controller.renderDashboard);
router.post(
  "/menu-items",
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Enter item name."),
    body("description").trim().isLength({ min: 4, max: 200 }).withMessage("Enter item description."),
    body("category").isIn(["breakfast", "lunch", "snacks", "dinner"]).withMessage("Choose a valid category."),
    body("price").isFloat({ min: 1 }).withMessage("Price must be greater than zero.")
  ],
  controller.createMenuItem
);
router.post(
  "/tables",
  [
    body("tableNumber").trim().notEmpty().withMessage("Enter table number."),
    body("seats").isInt({ min: 2, max: 12 }).withMessage("Seats must be between 2 and 12.")
  ],
  controller.createTable
);

module.exports = router;
