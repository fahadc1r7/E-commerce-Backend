const Product = require("../models/product");

// Escape regex special characters so users can't send heavy or malicious patterns
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only these fields can be set from the request body
const pick = (body) => {
  const allowed = ["name", "description", "category", "price", "stock", "tags"];
  const data = {};
  allowed.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });
  return data;
};

// GET /api/products?search=phone&category=electronics&minPrice=100&maxPrice=900&sort=-price&page=1&limit=10
exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const query = {};
    if (search) query.name = { $regex: escapeRegex(search), $options: "i" };
    if (category) query.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice && !isNaN(minPrice)) query.price.$gte = Number(minPrice);
      if (maxPrice && !isNaN(maxPrice)) query.price.$lte = Number(maxPrice);
    }

    // Only allow sorting by known fields: ?sort=price or ?sort=-price,name
    const allowedSort = ["name", "price", "category", "createdAt"];
    const sortBy = sort
      ? String(sort).split(",").filter((f) => allowedSort.includes(f.replace("-", ""))).join(" ")
      : "-createdAt";

    const products = await Product.find(query)
      .sort(sortBy || "-createdAt")
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Product.countDocuments(query);

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), data: products });
  } catch (err) { next(err); }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// POST /api/products (admin)
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(pick(req.body));
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

// PUT /api/products/:id (admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

// DELETE /api/products/:id (admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) { next(err); }
};