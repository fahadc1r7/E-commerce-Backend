const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Requires a valid token
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Not authorized" });
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: "User not found" });
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Guest support: no token means role "guest", a bad token is rejected
exports.optionalAuth = async (req, res, next) => {
  if (!req.headers.authorization) { req.user = { role: "guest" }; return next(); }
  return exports.protect(req, res, next);
};

// Role check
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: "Forbidden" });
  next();
};