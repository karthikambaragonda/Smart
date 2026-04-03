const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/staffController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(ensureAuthenticated, ensureRole(["staff"]));

router.get("/dashboard", controller.renderDashboard);
router.post(
  "/orders/:id/status",
  [body("status").isIn(["placed", "preparing", "ready", "delivered", "cancelled", "penalised"]).withMessage("Choose a valid order status.")],
  controller.updateOrderStatus
);
router.post(
  "/tables/:id/status",
  [body("status").isIn(["available", "reserved", "occupied"]).withMessage("Choose a valid table status.")],
  controller.updateTableStatus
);

module.exports = router;
