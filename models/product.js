const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  tags: [String],
}, { timestamps: true });
productSchema.index({ name: "text", description: "text" });
module.exports = mongoose.model("Product", productSchema);