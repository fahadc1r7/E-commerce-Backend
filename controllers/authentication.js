const jwt = require("jsonwebtoken");
const User = require("../models/user");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already registered" });

    // role is NOT taken from req.body, which prevents self-promotion to admin
    const user = await User.create({ name, email, password });
    res.status(201).json({ success: true, token: signToken(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, token: signToken(user) });
  } catch (err) { next(err); }
};