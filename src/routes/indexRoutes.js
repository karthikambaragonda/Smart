const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    title: "Smart Campus Food Ordering"
  });
});

module.exports = router;
