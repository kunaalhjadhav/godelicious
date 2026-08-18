require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const menuRoutes = require("./routes/menu.routes");
const ordersRoutes = require("./routes/orders.routes");
const venueRoutes = require("./routes/venue.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const couponsRoutes = require("./routes/coupons.routes");
const chatRoutes = require("./routes/chat.routes");
const bannersRoutes = require("./routes/banners.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const settingsRoutes = require("./routes/settings.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const brandsRoutes = require("./routes/brands.routes");
const paymentsRoutes = require("./routes/payments.routes");
const reportsRoutes = require("./routes/reports.routes");

const app = express();

// CORS - restrict to the admin dashboard's and app's origins in production
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Serves uploaded images directly, e.g. GET /uploads/169... .jpg
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/venue-enquiries", venueRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/coupons", couponsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/banners", bannersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reports", reportsRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// Central error handler (catches anything thrown/passed to next())
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Godelicious backend running on http://localhost:${PORT}`);
});
