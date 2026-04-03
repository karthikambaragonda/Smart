const User = require("../models/User");

module.exports = async function loadUser(req, res, next) {
  try {
    if (!req.session.userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(req.session.userId).select("-password");
    req.user = user || null;

    if (!user) {
      req.session.destroy(() => next());
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
