const router = require("express").Router();
const { body, param } = require("express-validator");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  getMe, updateMe, changePassword, deleteMe,
  getAllUsers, getUserById, updateUserRole, deleteUser,
} = require("../controllers/userProfile");

const idParam = param("id").isMongoId().withMessage("Invalid user id");

// ---- Own profile (any logged-in user). These MUST come before "/:id" ----
router.get("/me", protect, getMe);

router.put(
  "/me",
  protect,
  [
    body("name").optional().trim().escape().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Invalid email"),
  ],
  validate,
  updateMe
);

router.put(
  "/me/password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  validate,
  changePassword
);

router.delete("/me", protect, deleteMe);

// ---- Admin only ----
router.get("/", protect, authorize("admin"), getAllUsers);
router.get("/:id", protect, authorize("admin"), [idParam], validate, getUserById);
router.put(
  "/:id/role",
  protect,
  authorize("admin"),
  [idParam, body("role").isIn(["admin", "user"]).withMessage("Role must be admin or user")],
  validate,
  updateUserRole
);
router.delete("/:id", protect, authorize("admin"), [idParam], validate, deleteUser);

module.exports = router;