const router = require("express").Router();
const { body, param } = require("express-validator");
const { protect, authorize, optionalAuth } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const idParam = param("id").isMongoId().withMessage("Invalid product id");

const createRules = [
  body("name").trim().escape().notEmpty().withMessage("Name is required"),
  body("description").optional().trim().escape(),
  body("category").trim().escape().notEmpty().withMessage("Category is required"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a number >= 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock must be an integer >= 0"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*").optional().trim().escape(),
];

// On update every field is optional
const updateRules = [
  body("name").optional().trim().escape().notEmpty(),
  body("description").optional().trim().escape(),
  body("category").optional().trim().escape().notEmpty(),
  body("price").optional().isFloat({ min: 0 }),
  body("stock").optional().isInt({ min: 0 }),
  body("tags").optional().isArray(),
  body("tags.*").optional().trim().escape(),
];

// Public (guests allowed): list with search, filter and sort, and view one
router.get("/", optionalAuth, getProducts);
router.get("/:id", optionalAuth, [idParam], validate, getProductById);

// Admin only
router.post("/", protect, authorize("admin"), createRules, validate, createProduct);
router.put("/:id", protect, authorize("admin"), [idParam, ...updateRules], validate, updateProduct);
router.delete("/:id", protect, authorize("admin"), [idParam], validate, deleteProduct);

module.exports = router;