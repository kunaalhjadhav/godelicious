const express = require("express");
const router = express.Router();
const v = require("../controllers/venues.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

// Public
router.post("/register", v.register);
router.get("/", v.listVenues);

// Venue owner portal
router.get("/me", requireAuth, requireRole("VENUE_PARTNER"), v.getMine);
router.put("/me", requireAuth, requireRole("VENUE_PARTNER"), v.updateMine);
router.get("/me/dashboard", requireAuth, requireRole("VENUE_PARTNER"), v.myDashboard);
router.get("/me/bookings", requireAuth, requireRole("VENUE_PARTNER"), v.myBookings);
router.patch("/me/bookings/:id", requireAuth, requireRole("VENUE_PARTNER"), v.decideBooking);
router.post("/me/tariffs", requireAuth, requireRole("VENUE_PARTNER"), v.addTariff);
router.patch("/me/tariffs/:id", requireAuth, requireRole("VENUE_PARTNER"), v.updateTariff);
router.delete("/me/tariffs/:id", requireAuth, requireRole("VENUE_PARTNER"), v.deleteTariff);
router.post("/me/blocks", requireAuth, requireRole("VENUE_PARTNER"), v.addBlock);
router.delete("/me/blocks/:id", requireAuth, requireRole("VENUE_PARTNER"), v.removeBlock);

// Admin
router.get("/admin/all", requireAuth, requireRole("ADMIN", "STAFF"), v.adminList);
router.patch("/admin/:id", requireAuth, requireRole("ADMIN", "STAFF"), v.adminUpdate);

// Customer
router.get("/bookings/my", requireAuth, v.myCustomerBookings);
router.patch("/bookings/:id/cancel", requireAuth, v.cancelBooking);
router.get("/:id", v.getVenue);
router.post("/:id/bookings", requireAuth, requireRole("CUSTOMER"), v.createBooking);

module.exports = router;
