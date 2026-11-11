// Public live tracking for customers: /api/track/:token (the token is in the customer's link only)
const express = require("express");
const router = express.Router();
const prisma = require("../config/db");

router.get("/:token", async (req, res) => {
  const t = String(req.params.token || "");
  if (!/^[a-f0-9]{24}$/.test(t)) return res.status(404).json({ error: "Tracking link not found." });
  const o = await prisma.order.findUnique({
    where: { trackToken: t },
    include: { deliveryPartner: { select: { name: true, phone: true, vehicleType: true, vehicleNumber: true, lastLat: true, lastLng: true, lastSeenAt: true } } },
  });
  if (!o) return res.status(404).json({ error: "Tracking link not found." });
  const showRider = o.deliveryPartner && o.assignStatus === "ACCEPTED";
  const live = showRider && o.status === "OUT_FOR_DELIVERY";
  res.json({
    code: String(o.id).slice(0, 8).toUpperCase(),
    status: o.status, eventDate: o.eventDate, eventTime: o.eventTime,
    pickedUpAt: o.pickedUpAt, deliveredAt: o.deliveredAt,
    destination: o.latitude != null ? { lat: o.latitude, lng: o.longitude } : null,
    rider: showRider ? {
      name: o.deliveryPartner.name, phone: o.deliveryPartner.phone,
      vehicle: [o.deliveryPartner.vehicleType, o.deliveryPartner.vehicleNumber].filter(Boolean).join(" · ") || null,
      location: live && o.deliveryPartner.lastLat != null ? { lat: o.deliveryPartner.lastLat, lng: o.deliveryPartner.lastLng, at: o.deliveryPartner.lastSeenAt } : null,
    } : null,
  });
});

module.exports = router;
