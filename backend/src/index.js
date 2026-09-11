require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

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
const orderTypesRoutes = require("./routes/orderTypes.routes");
const addonsRoutes = require("./routes/addons.routes");
const brandPartnersRoutes = require("./routes/brandPartners.routes");
const offersRoutes = require("./routes/offers.routes");
const devicesRoutes = require("./routes/devices.routes");
const deliveryPartnersRoutes = require("./routes/deliveryPartners.routes");

const app = express();

// Sets a handful of standard security-related HTTP headers (hides the
// Express fingerprint, blocks MIME-sniffing, disables framing, etc).
// crossOriginResourcePolicy is relaxed so admin/web can load uploaded
// images/videos served from this same origin during local-disk fallback mode.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS - restrict to the admin dashboard's and app's origins in production.
// Placed before the rate limiters below so even a 429 response still carries
// CORS headers — otherwise the browser reports a confusing CORS error instead
// of the actual rate-limit message.
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

// General API rate limit — generous, just a backstop against abuse/scraping,
// not meant to interfere with normal traffic.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again in a few minutes." },
  })
);

// Tighter limit specifically on auth endpoints — these are the ones brute-force
// and credential-stuffing attacks actually target.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
app.use("/api/auth", authLimiter);
app.use("/api/brand-partners/register", authLimiter);

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
app.use("/api/order-types", orderTypesRoutes);
app.use("/api/addons", addonsRoutes);
app.use("/api/brand-partners", brandPartnersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/delivery-partners", deliveryPartnersRoutes);

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
