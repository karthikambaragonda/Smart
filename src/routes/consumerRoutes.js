const express = require("express");
const { body } = require("express-validator");

const controller = require("../controllers/consumerController");
const { ensureAuthenticated, ensureRole } = require("../middleware/authMiddleware");
const { CAMPUS_LOCATIONS, ORDER_TYPES } = require("../utils/constants");

const router = express.Router();

router.use(ensureAuthenticated, ensureRole(["consumer"]));

router.get("/dashboard", controller.renderDashboard);
router.get("/orders", controller.renderOrdersPage);
router.get("/orders/:id/thank-you", controller.renderThankYouPage);
router.post("/orders/:id/free-table", controller.freeTableFromThankYou);
router.get("/penalties", controller.renderPenaltiesPage);
router.get("/cart", controller.renderCart);
router.post(
  "/cart",
  [
    body("orderType").isIn(ORDER_TYPES).withMessage("Choose a valid order type."),
    body("deliveryLocation").custom((value, { req }) => {
      if (req.body.orderType === "delivery") {
        return CAMPUS_LOCATIONS.includes(value);
      }
      return true;
    }).withMessage("Choose a valid campus delivery location.")
  ],
  controller.addToCart
);
router.post("/orders/confirm", controller.confirmOrder);
router.post("/cart/cancel", controller.cancelCart);
router.post("/tables/book", controller.reserveTable);

module.exports = router;
