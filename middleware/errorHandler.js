module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Server error";

  // Mongoose validation error (e.g. price below 0)
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  // Invalid ObjectId
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  }
  // Duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    status = 400;
    message = `${Object.keys(err.keyValue)[0]} already exists`;
  }

  res.status(status).json({ success: false, message });
};