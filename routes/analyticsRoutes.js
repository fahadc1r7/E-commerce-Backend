const router = require("express").Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getRecommendations,
  exportOrdersData,
} = require("../controllers/analyticsController");

// Recommendations for the logged-in user (RapidMiner results, with a fallback)
router.get("/recommendations", protect, getRecommendations);

// Admin exports order data as CSV, which is the input for the RapidMiner process
router.get("/export/orders", protect, authorize("admin"), exportOrdersData);

module.exports = router;