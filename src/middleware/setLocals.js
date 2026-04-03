module.exports = function setLocals(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.currentPath = req.path;
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  next();
};
