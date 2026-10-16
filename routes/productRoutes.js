router.get("/", optionalAuth, getProducts);
router.get("/:id", optionalAuth, getProductById);
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);