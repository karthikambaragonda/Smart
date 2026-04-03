const User = require("../models/User");

function renderRegister(req, res) {
  res.render("auth/register", {
    title: "Create Account",
    errors: [],
    formData: {}
  });
}

function renderLogin(req, res) {
  res.render("auth/login", {
    title: "Sign In",
    errors: [],
    formData: {}
  });
}

async function register(req, res, next) {
  try {
    const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });

    if (existingUser) {
      return res.status(409).render("auth/register", {
        title: "Create Account",
        errors: [{ msg: "An account with this SRU email already exists." }],
        formData: req.body
      });
    }

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      department: req.body.department,
      role: req.body.role === "consumer" ? "consumer" : "consumer"
    });

    req.session.userId = user._id.toString();
    req.flash("success", "Welcome to the Smart Campus Food Ordering System.");
    res.redirect("/consumer/dashboard");
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });

    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Sign In",
        errors: [{ msg: "Invalid email or password." }],
        formData: req.body
      });
    }

    if (user.blocked) {
      return res.status(403).render("auth/login", {
        title: "Sign In",
        errors: [{ msg: "Your account is currently blocked. Please contact campus canteen management." }],
        formData: req.body
      });
    }

    const isMatch = await user.comparePassword(req.body.password);

    if (!isMatch) {
      return res.status(401).render("auth/login", {
        title: "Sign In",
        errors: [{ msg: "Invalid email or password." }],
        formData: req.body
      });
    }

    req.session.userId = user._id.toString();
    req.flash("success", `Welcome back, ${user.name}.`);

    if (user.role === "staff") {
      return res.redirect("/staff/dashboard");
    }

    if (user.role === "manager") {
      return res.redirect("/manager/dashboard");
    }

    return res.redirect("/consumer/dashboard");
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
}

module.exports = {
  renderRegister,
  renderLogin,
  register,
  login,
  logout
};
