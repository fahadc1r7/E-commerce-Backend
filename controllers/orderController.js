const Order = require("../models/order");
const Product = require("../models/product");

const isOwnerOrAdmin = (order, user) =>
  user.role === "admin" || order.user.equals(user._id);

// Put stock back (used when an order fails, is cancelled, etc.)
const restoreStock = (items) =>
  Promise.all(
    items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })
    )
  );

// POST /api/orders
exports.createOrder = async (req, res, next) => {
  const reserved = []; // items whose stock we already reduced, so we can undo on failure
  try {
    const { items, shippingAddress } = req.body;

    // Merge duplicate products: [{p1,1},{p1,2}] becomes p1 x 3
    const merged = new Map();
    for (const it of items) {
      const id = String(it.product);
      merged.set(id, (merged.get(id) || 0) + Number(it.quantity));
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const [productId, quantity] of merged) {
      // Atomic: reduces stock only if enough is available (prevents overselling)
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!product) {
        await restoreStock(reserved);
        const exists = await Product.exists({ _id: productId });
        return res.status(exists ? 400 : 404).json({
          success: false,
          message: exists ? "Insufficient stock for a product" : "Product not found",
        });
      }

      reserved.push({ product: product._id, quantity });
      // Name and price come from the DATABASE, never from the client
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
      });
      totalAmount += product.price * quantity;
    }

    const order = await Order.create({
      user: req.user._id, // always the logged-in user
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shippingAddress,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    await restoreStock(reserved);
    next(err);
  }
};

// GET /api/orders?status=pending&page=1&limit=10
// Users see their own orders, admins see all
exports.getOrders = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const query = req.user.role === "admin" ? {} : { user: req.user._id };
    if (req.query.status) query.status = String(req.query.status);

    const orders = await Order.find(query)
      .populate("user", "name email")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Order.countDocuments(query);

    res.json({ success: true, total, page, data: orders });
  } catch (err) { next(err); }
};

// GET /api/orders/:id  (owner or admin; this is also the "tracking" endpoint)
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product", "name category");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // order.user is not populated in the check below, so .equals works on the ObjectId
    const ownerId = order.user;
    if (req.user.role !== "admin" && !ownerId.equals(req.user._id))
      return res.status(403).json({ success: false, message: "Forbidden" });

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// PUT /api/orders/:id/status  (admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.status === "cancelled")
      return res.status(400).json({ success: false, message: "Cancelled orders cannot be changed" });

    const { status } = req.body;
    if (status === "cancelled") await restoreStock(order.items);

    order.status = status;
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// PUT /api/orders/:id/cancel  (owner cancels own pending order)
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (!isOwnerOrAdmin(order, req.user))
      return res.status(403).json({ success: false, message: "Forbidden" });

    if (order.status !== "pending")
      return res.status(400).json({ success: false, message: "Only pending orders can be cancelled" });

    await restoreStock(order.items);
    order.status = "cancelled";
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// DELETE /api/orders/:id  (admin)
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order deleted" });
  } catch (err) { next(err); }
};