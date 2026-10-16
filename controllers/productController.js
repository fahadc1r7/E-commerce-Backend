exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) query.name = { $regex: String(search), $options: "i" };
    if (category) query.category = String(category);
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    // e.g. ?sort=price or ?sort=-price
    const sortBy = sort ? String(sort).split(",").join(" ") : "-createdAt";
    const products = await Product.find(query).sort(sortBy)
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Product.countDocuments(query);
    res.json({ success: true, total, page: Number(page), data: products });
  } catch (err) { next(err); }
};