const fs = require("fs");
const path = require("path");
const Order = require("../models/order");
const Product = require("../models/product");

// RapidMiner writes its output here: columns userId,productId,rank
const RESULT_FILE = path.join(__dirname, "../data/recommendations.csv");

// Quote a CSV cell and block spreadsheet formula injection (=, +, -, @)
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

// Read RapidMiner results into Map<userId, [{productId, rank}]>
const loadRapidMinerResults = async () => {
  try {
    const text = await fs.promises.readFile(RESULT_FILE, "utf8");
    const map = new Map();
    text.split(/\r?\n/).slice(1).forEach((line) => {
      if (!line.trim()) return;
      const [u, p, r] = line.split(",").map((s) => s.replace(/"/g, "").trim());
      if (!map.has(u)) map.set(u, []);
      map.get(u).push({ productId: p, rank: Number(r) || 0 });
    });
    return map;
  } catch {
    return new Map(); // file missing means we use the fallback
  }
};

// Used for new users or when RapidMiner has nothing for this user
const fallbackRecommendations = async (userId) => {
  const orders = await Order.find({ user: userId, status: { $ne: "cancelled" } }).select("items.product");
  const bought = orders.flatMap((o) => o.items.map((i) => i.product));

  // 1) Other products in the categories the user already bought from
  if (bought.length) {
    const cats = await Product.distinct("category", { _id: { $in: bought } });
    const similar = await Product.find({
      category: { $in: cats }, _id: { $nin: bought }, stock: { $gt: 0 },
    }).limit(5);
    if (similar.length) return { source: "fallback-category", products: similar };
  }

  // 2) Best sellers across all users
  const top = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.product", sold: { $sum: "$items.quantity" } } },
    { $sort: { sold: -1 } },
    { $limit: 5 },
  ]);
  if (top.length) {
    const popular = await Product.find({ _id: { $in: top.map((t) => t._id) }, stock: { $gt: 0 } });
    if (popular.length) return { source: "fallback-popular", products: popular };
  }

  // 3) Newest products
  return { source: "fallback-newest", products: await Product.find({ stock: { $gt: 0 } }).sort("-createdAt").limit(5) };
};

// GET /api/analytics/recommendations  (logged-in user)
exports.getRecommendations = async (req, res, next) => {
  try {
    const results = await loadRapidMinerResults();
    const entries = (results.get(String(req.user._id)) || []).sort((a, b) => a.rank - b.rank);

    if (entries.length) {
      const ids = entries.map((e) => e.productId);
      const found = await Product.find({ _id: { $in: ids }, stock: { $gt: 0 } });
      // keep RapidMiner's ranking order
      const ordered = ids.map((id) => found.find((p) => String(p._id) === id)).filter(Boolean);
      if (ordered.length) return res.json({ success: true, source: "rapidminer", data: ordered });
    }

    const fb = await fallbackRecommendations(req.user._id);
    res.json({ success: true, source: fb.source, data: fb.products });
  } catch (err) { next(err); }
};

// GET /api/analytics/export/orders  (admin): CSV that RapidMiner reads
exports.exportOrdersData = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $ne: "cancelled" } })
      .populate("items.product", "category");

    const rows = ["userId,productId,productName,category,price,quantity"];
    orders.forEach((o) =>
      o.items.forEach((i) =>
        rows.push([o.user, i.product?._id, i.name, i.product?.category, i.price, i.quantity]
          .map(csvCell).join(","))
      )
    );

    res.header("Content-Type", "text/csv");
    res.attachment("orders_export.csv");
    res.send(rows.join("\n"));
  } catch (err) { next(err); }
};