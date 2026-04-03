require("dotenv").config();

const http = require("http");
const path = require("path");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const morgan = require("morgan");
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const setLocals = require("./middleware/setLocals");
const loadUser = require("./middleware/loadUser");
const { attachIo } = require("./services/socketService");
const { runPenaltySweep } = require("./services/penaltyService");
const { releaseExpiredTables } = require("./services/tableService");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

connectDB();
attachIo(io);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "partials/layout");

app.use(expressLayouts);
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "smart-campus-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8,
      httpOnly: true
    }
  })
);
app.use(flash());
app.use(loadUser);
app.use(setLocals);

app.use("/", require("./routes/indexRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/consumer", require("./routes/consumerRoutes"));
app.use("/staff", require("./routes/staffRoutes"));
app.use("/manager", require("./routes/managerRoutes"));

app.use((req, res) => {
  res.status(404).render("partials/error", {
    title: "Page Not Found",
    message: "The page you requested could not be found."
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).render("partials/error", {
    title: "Something Went Wrong",
    message: err.message || "An unexpected error occurred."
  });
});

setInterval(async () => {
  await runPenaltySweep();
  await releaseExpiredTables();
}, 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
