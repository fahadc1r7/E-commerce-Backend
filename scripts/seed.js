require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");

const products = [
  { name: "iPhone 15", category: "electronics", price: 799 },
  { name: "Wireless Earbuds", category: "electronics", price: 59 },
  { name: "Phone Charger", category: "electronics", price: 19 },
  { name: "Smart Watch", category: "electronics", price: 149 },
  { name: "Laptop", category: "electronics", price: 899 },
  { name: "Running Shoes", category: "fashion", price: 89 },
  { name: "Denim Jacket", category: "fashion", price: 69 },
  { name: "Backpack", category: "fashion", price: 45 },
];

// What each sample user buys (creates patterns for the recommender)
const patterns = [
  ["iPhone 15", "Wireless Earbuds", "Phone Charger"],
  ["iPhone 15", "Wireless Earbuds", "Smart Watch"],
  ["Laptop", "Phone Charger", "Wireless Earbuds"],
  ["Running Shoes", "Denim Jacket", "Backpack"],
  ["Running Shoes", "Backpack", "Smart Watch"],
  ["Denim Jacket", "Backpack", "Running Shoes"],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const byName = {};
  for (const p of products) {
    byName[p.name] =
      (await Product.findOne({ name: p.name })) ||
      (await Product.create({ ...p, stock: 50 }));
  }

  for (let i = 0; i < patterns.length; i++) {
    const email = `seed${i + 1}@test.com`;
    const user =
      (await User.findOne({ email })) ||
      (await User.create({ name: `Seed User ${i + 1}`, email, password: "123456" }));

    if (await Order.countDocuments({ user: user._id })) continue; // already seeded

    const items = patterns[i].map((name, idx) => ({
      product: byName[name]._id,
      name,
      price: byName[name].price,
      quantity: idx === 0 ? 2 : 1,
    }));
    const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
    await Order.create({ user: user._id, items, totalAmount, status: "delivered" });
  }

  console.log("Seed complete");
  await mongoose.disconnect();
})();