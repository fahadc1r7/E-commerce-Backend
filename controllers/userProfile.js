const User = require("../models/user");

// GET /api/users/me: own profile
exports.getMe = async (req, res) => {
  // req.user is set by `protect`; the password is excluded by select:false
  res.json({ success: true, data: req.user });
};

// PUT /api/users/me: update own name and email (role can NEVER be changed here)
exports.updateMe = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;

    if (req.body.email) {
      const taken = await User.findOne({ email: req.body.email, _id: { $ne: req.user._id } });
      if (taken) return res.status(400).json({ success: false, message: "Email already in use" });
      updates.email = req.body.email;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PUT /api/users/me/password: change own password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save(); // save() runs the bcrypt pre-save hook; findByIdAndUpdate would not
    res.json({ success: true, message: "Password updated" });
  } catch (err) { next(err); }
};

// DELETE /api/users/me: delete own account
exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: "Account deleted" });
  } catch (err) { next(err); }
};

// ---------- Admin only ----------

// GET /api/users?page=1&limit=10
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const users = await User.find().sort("-createdAt").skip((page - 1) * limit).limit(limit);
    const total = await User.countDocuments();
    res.json({ success: true, total, page, data: users });
  } catch (err) { next(err); }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PUT /api/users/:id/role: promote or demote (this is how you make an admin through the API)
exports.updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === String(req.user._id))
      return res.status(400).json({ success: false, message: "Use DELETE /me to delete your own account" });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) { next(err); }
};