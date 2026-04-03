function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    req.flash("error", "Please sign in to continue.");
    return res.redirect("/auth/login");
  }

  next();
}

function ensureRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash("error", "You do not have permission to access that page.");
      return res.redirect("/");
    }

    next();
  };
}

module.exports = {
  ensureAuthenticated,
  ensureRole
};
