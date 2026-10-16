const router = require("express").Router();
const { body, param } = require("express-validator");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
} = require("../controllers/orderController");

const idParam = param("id").isMongoId().withMessage("Invalid order id");

// Place an order (any logged-in user)
router.post(
  "/",
  protect,
  [
    body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
    body("items.*.product").isMongoId().withMessage("Invalid product id"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("quantity must be at least 1"),
    body("shippingAddress.street").optional().trim().escape(),
    body("shippingAddress.city").optional().trim().escape(),
    body("shippingAddress.state").optional().trim().escape(),
    body("shippingAddress.postalCode").optional().trim().escape(),
    body("shippingAddress.country").optional().trim().escape(),
  ],
  validate,
  createOrder
);

// Users get their own orders, admins get all orders (the controller checks the role)
router.get("/", protect, getOrders);

// One order: owner or admin
router.get("/:id", protect, [idParam], validate, getOrderById);

// Admin changes the status (pending, paid, shipped, delivered, cancelled)
router.put(
  "/:id/status",
  protect,
  authorize("admin"),
  [
    idParam,
    body("status")
      .isIn(["pending", "paid", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validate,
  updateOrderStatus
);

// Owner cancels their own pending order
router.put("/:id/cancel", protect, [idParam], validate, cancelOrder);

// Admin deletes an order
router.delete("/:id", protect, authorize("admin"), [idParam], validate, deleteOrder);

module.exports = router;