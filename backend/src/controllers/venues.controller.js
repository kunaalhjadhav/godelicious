const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { signToken } = require("../utils/jwt");
const { notifyVenueRequest, notifyVenueDecision, notifyNewVenuePartner } = require("../services/notify.service");

// ---------- helpers ----------
const parseList = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const cleanList = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 40) : undefined);

function shapeVenue(v) {
  return { ...v, eventTypes: parseList(v.eventTypes), services: parseList(v.services), foodOptions: parseList(v.foodOptions) };
}

// Event dates are calendar days. Store them as UTC midnight so a date never
// shifts a day depending on timezone.
function toDay(input) {
  const s = String(input).slice(0, 10);
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const toMinutes = (t) => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = toMinutes(aStart), ae = toMinutes(aEnd), bs = toMinutes(bStart), be = toMinutes(bEnd);
  if (as === null || ae === null || bs === null || be === null) return true; // no times = whole day
  return as < be && bs < ae;
}

async function myVenue(req) {
  const venue = await prisma.venue.findUnique({ where: { ownerId: req.user.id } });
  if (!venue) throw Object.assign(new Error("No venue is linked to this account."), { status: 404 });
  return venue;
}

// ---------- registration (public) ----------
// POST /api/venues/register
async function register(req, res) {
  try {
    const { venueName, name, email, password, phone, address, city, capacity } = req.body;
    if (!venueName || !name || !email || !password || !address) {
      return res.status(400).json({ error: "venueName, name, email, password and address are required." });
    }
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { user, venue } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, phone, passwordHash, role: "VENUE_PARTNER" } });
      const venue = await tx.venue.create({
        data: { ownerId: user.id, name: venueName, address, city, contactPhone: phone, capacity: capacity ? Number(capacity) : 100 },
      });
      return { user, venue };
    });
    notifyNewVenuePartner(venue.name);
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      venue: shapeVenue(venue),
    });
  } catch (err) {
    console.error("venue register error:", err);
    res.status(500).json({ error: "Could not register venue partner." });
  }
}

// ---------- owner portal ----------
// GET /api/venues/me
async function getMine(req, res) {
  try {
    const venue = await prisma.venue.findUnique({
      where: { ownerId: req.user.id },
      include: { tariffs: { orderBy: [{ eventType: "asc" }, { kind: "asc" }] }, blocks: { orderBy: { date: "asc" } } },
    });
    if (!venue) return res.status(404).json({ error: "No venue is linked to this account." });
    res.json({ venue: shapeVenue(venue) });
  } catch (err) {
    res.status(500).json({ error: "Could not load venue." });
  }
}

// PUT /api/venues/me
async function updateMine(req, res) {
  try {
    const venue = await myVenue(req);
    const b = req.body;
    const data = {};
    for (const f of ["name", "description", "address", "city", "contactPhone", "imageUrl"]) if (b[f] !== undefined) data[f] = b[f] || null;
    if (data.name === null) delete data.name;
    if (data.address === null) delete data.address;
    if (b.capacity !== undefined) data.capacity = Math.max(1, Number(b.capacity) || 1);
    if (b.latitude !== undefined) data.latitude = b.latitude === "" || b.latitude === null ? null : Number(b.latitude);
    if (b.longitude !== undefined) data.longitude = b.longitude === "" || b.longitude === null ? null : Number(b.longitude);
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    for (const f of ["eventTypes", "services", "foodOptions"]) {
      const list = cleanList(b[f]);
      if (list) data[f] = JSON.stringify(list);
    }
    const updated = await prisma.venue.update({ where: { id: venue.id }, data });
    res.json({ venue: shapeVenue(updated) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update venue." });
  }
}

// Tariffs
async function addTariff(req, res) {
  try {
    const venue = await myVenue(req);
    const { eventType, label, kind, unit, price } = req.body;
    if (!label || price === undefined || price === "") return res.status(400).json({ error: "label and price are required." });
    const tariff = await prisma.venueTariff.create({
      data: {
        venueId: venue.id,
        eventType: eventType || "Any",
        label,
        kind: ["HALL", "FOOD", "SERVICE"].includes(kind) ? kind : "HALL",
        unit: ["EVENT", "DAY", "HOUR", "PLATE"].includes(unit) ? unit : "EVENT",
        price: Math.max(0, Number(price)),
      },
    });
    res.status(201).json({ tariff });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not add tariff." });
  }
}

async function updateTariff(req, res) {
  try {
    const venue = await myVenue(req);
    const existing = await prisma.venueTariff.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.venueId !== venue.id) return res.status(404).json({ error: "Tariff not found." });
    const { eventType, label, kind, unit, price, isActive } = req.body;
    const tariff = await prisma.venueTariff.update({
      where: { id: existing.id },
      data: {
        ...(eventType !== undefined && { eventType }),
        ...(label !== undefined && { label }),
        ...(["HALL", "FOOD", "SERVICE"].includes(kind) && { kind }),
        ...(["EVENT", "DAY", "HOUR", "PLATE"].includes(unit) && { unit }),
        ...(price !== undefined && { price: Math.max(0, Number(price)) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json({ tariff });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update tariff." });
  }
}

async function deleteTariff(req, res) {
  try {
    const venue = await myVenue(req);
    const existing = await prisma.venueTariff.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.venueId !== venue.id) return res.status(404).json({ error: "Tariff not found." });
    await prisma.venueTariff.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not delete tariff." });
  }
}

// Blocked dates
async function addBlock(req, res) {
  try {
    const venue = await myVenue(req);
    const date = toDay(req.body.date);
    if (!date) return res.status(400).json({ error: "A valid date is required." });
    const existing = await prisma.venueBlock.findFirst({ where: { venueId: venue.id, date } });
    if (existing) return res.json({ block: existing });
    const block = await prisma.venueBlock.create({ data: { venueId: venue.id, date, reason: req.body.reason || null } });
    res.status(201).json({ block });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not block date." });
  }
}

async function removeBlock(req, res) {
  try {
    const venue = await myVenue(req);
    const existing = await prisma.venueBlock.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.venueId !== venue.id) return res.status(404).json({ error: "Not found." });
    await prisma.venueBlock.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not unblock date." });
  }
}

// GET /api/venues/me/bookings  ?month=YYYY-MM (calendar) | ?status=
async function myBookings(req, res) {
  try {
    const venue = await myVenue(req);
    const { month, status } = req.query;
    const where = { venueId: venue.id };
    if (status) where.status = status;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      where.eventDate = { gte: start, lt: end };
    }
    const bookings = await prisma.venueBooking.findMany({
      where,
      include: { customer: { select: { name: true, phone: true, email: true } } },
      orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
      take: 500,
    });
    const blocks = await prisma.venueBlock.findMany({
      where: { venueId: venue.id, ...(where.eventDate ? { date: where.eventDate } : {}) },
      orderBy: { date: "asc" },
    });
    res.json({ bookings: bookings.map((b) => ({ ...b, services: parseList(b.services) })), blocks });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load bookings." });
  }
}

// PATCH /api/venues/me/bookings/:id  body: { status: ACCEPTED | REJECTED, quotedAmount, ownerNote }
async function decideBooking(req, res) {
  try {
    const venue = await myVenue(req);
    const { status, quotedAmount, ownerNote } = req.body;
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "status must be ACCEPTED or REJECTED." });
    }
    const booking = await prisma.venueBooking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.venueId !== venue.id) return res.status(404).json({ error: "Booking not found." });
    if (booking.status === "CANCELLED") return res.status(400).json({ error: "The customer already cancelled this request." });

    if (status === "ACCEPTED") {
      const clash = await prisma.venueBooking.findMany({
        where: { venueId: venue.id, status: "ACCEPTED", eventDate: booking.eventDate, id: { not: booking.id } },
      });
      if (clash.some((c) => overlaps(c.startTime, c.endTime, booking.startTime, booking.endTime))) {
        return res.status(409).json({ error: "You already have an accepted booking that overlaps this date/time." });
      }
      const blocked = await prisma.venueBlock.findFirst({ where: { venueId: venue.id, date: booking.eventDate } });
      if (blocked) return res.status(409).json({ error: "This date is blocked on your calendar. Unblock it first." });
    }

    const updated = await prisma.venueBooking.update({
      where: { id: booking.id },
      data: {
        status,
        ownerNote: ownerNote || null,
        quotedAmount: status === "ACCEPTED" && quotedAmount !== undefined && quotedAmount !== "" ? Number(quotedAmount) : null,
      },
    });
    notifyVenueDecision(updated.id);
    res.json({ booking: updated });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not update booking." });
  }
}

// GET /api/venues/me/dashboard
async function myDashboard(req, res) {
  try {
    const venue = await myVenue(req);
    const today = toDay(new Date().toISOString());
    const [pending, upcoming, accepted] = await Promise.all([
      prisma.venueBooking.count({ where: { venueId: venue.id, status: "PENDING" } }),
      prisma.venueBooking.findMany({
        where: { venueId: venue.id, status: { in: ["ACCEPTED", "PENDING"] }, eventDate: { gte: today } },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { eventDate: "asc" },
        take: 8,
      }),
      prisma.venueBooking.aggregate({ _sum: { quotedAmount: true }, _count: true, where: { venueId: venue.id, status: "ACCEPTED" } }),
    ]);
    res.json({
      venue: shapeVenue(venue),
      pendingCount: pending,
      acceptedCount: accepted._count,
      acceptedValue: accepted._sum.quotedAmount || 0,
      upcoming,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load dashboard." });
  }
}

// ---------- customer side ----------
// GET /api/venues  ?eventType= &city= &guests=
async function listVenues(req, res) {
  const { eventType, city, guests, q } = req.query;
  const venues = await prisma.venue.findMany({
    where: {
      isApproved: true, isActive: true,
      ...(city && { city: { contains: String(city), mode: "insensitive" } }),
      ...(guests && { capacity: { gte: Number(guests) } }),
    },
    include: { tariffs: { where: { isActive: true } } },
    orderBy: { createdAt: "desc" },
  });
  let shaped = venues.map((v) => {
    const sv = shapeVenue(v);
    const hall = v.tariffs.filter((t) => t.kind === "HALL").sort((a, b) => a.price - b.price);
    return { ...sv, startingFrom: hall.length ? hall[0].price : null, startingUnit: hall.length ? hall[0].unit : null };
  });
  if (eventType) shaped = shaped.filter((v) => v.eventTypes.includes(eventType));
  if (q) {
    const needle = String(q).toLowerCase();
    shaped = shaped.filter((v) => `${v.name} ${v.address || ""} ${v.city || ""}`.toLowerCase().includes(needle));
  }
  res.json({ venues: shaped });
}

// GET /api/venues/:id  — includes unavailable dates (accepted bookings + blocks)
async function getVenue(req, res) {
  const venue = await prisma.venue.findUnique({
    where: { id: req.params.id },
    include: { tariffs: { where: { isActive: true }, orderBy: [{ kind: "asc" }, { price: "asc" }] } },
  });
  if (!venue || !venue.isApproved || !venue.isActive) return res.status(404).json({ error: "Venue not found." });
  const today = toDay(new Date().toISOString());
  const [accepted, blocks] = await Promise.all([
    prisma.venueBooking.findMany({
      where: { venueId: venue.id, status: "ACCEPTED", eventDate: { gte: today } },
      select: { eventDate: true, startTime: true, endTime: true },
    }),
    prisma.venueBlock.findMany({ where: { venueId: venue.id, date: { gte: today } }, select: { date: true } }),
  ]);
  const { ownerId, ...publicVenue } = venue;
  res.json({
    venue: shapeVenue(publicVenue),
    unavailable: [
      ...blocks.map((b) => b.date.toISOString().slice(0, 10)),
      ...accepted.map((a) => a.eventDate.toISOString().slice(0, 10)),
    ],
  });
}

// POST /api/venues/:id/bookings (CUSTOMER)
async function createBooking(req, res) {
  try {
    const venue = await prisma.venue.findUnique({ where: { id: req.params.id } });
    if (!venue || !venue.isApproved || !venue.isActive) return res.status(404).json({ error: "Venue not found." });

    const { eventType, eventDate, startTime, endTime, guestCount, foodOption, services, contactPhone, notes } = req.body;
    if (!eventType || !eventDate || !guestCount || !contactPhone) {
      return res.status(400).json({ error: "eventType, eventDate, guestCount and contactPhone are required." });
    }
    const day = toDay(eventDate);
    const today = toDay(new Date().toISOString());
    if (!day || day < today) return res.status(400).json({ error: "Please choose a future date." });
    const guests = Number(guestCount);
    if (!(guests > 0)) return res.status(400).json({ error: "guestCount must be a positive number." });
    if (guests > venue.capacity) return res.status(400).json({ error: `This venue holds up to ${venue.capacity} guests.` });

    const blocked = await prisma.venueBlock.findFirst({ where: { venueId: venue.id, date: day } });
    if (blocked) return res.status(409).json({ error: "The venue is not available on that date." });
    const accepted = await prisma.venueBooking.findMany({ where: { venueId: venue.id, status: "ACCEPTED", eventDate: day } });
    if (accepted.some((a) => overlaps(a.startTime, a.endTime, startTime, endTime))) {
      return res.status(409).json({ error: "The venue is already booked at that time. Try another date or slot." });
    }

    const booking = await prisma.venueBooking.create({
      data: {
        venueId: venue.id, customerId: req.user.id, eventType, eventDate: day,
        startTime: startTime || null, endTime: endTime || null, guestCount: guests,
        foodOption: foodOption || null, services: JSON.stringify(cleanList(services) || []),
        contactPhone, notes: notes || null,
      },
    });
    notifyVenueRequest(booking.id);
    res.status(201).json({ booking });
  } catch (err) {
    console.error("createBooking error:", err);
    res.status(500).json({ error: "Could not send your request." });
  }
}

// GET /api/venues/bookings/my (CUSTOMER)
async function myCustomerBookings(req, res) {
  const bookings = await prisma.venueBooking.findMany({
    where: { customerId: req.user.id },
    include: { venue: { select: { id: true, name: true, address: true, contactPhone: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ bookings: bookings.map((b) => ({ ...b, services: parseList(b.services) })) });
}

// PATCH /api/venues/bookings/:id/cancel (CUSTOMER)
async function cancelBooking(req, res) {
  const b = await prisma.venueBooking.findUnique({ where: { id: req.params.id } });
  if (!b || b.customerId !== req.user.id) return res.status(404).json({ error: "Booking not found." });
  if (b.status === "REJECTED" || b.status === "CANCELLED") return res.status(400).json({ error: "This request is already closed." });
  const updated = await prisma.venueBooking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
  res.json({ booking: updated });
}

// ---------- admin ----------
// GET /api/venues/admin/all
async function adminList(req, res) {
  const venues = await prisma.venue.findMany({
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      _count: { select: { bookings: true, tariffs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ venues: venues.map(shapeVenue) });
}

// PATCH /api/venues/admin/:id  body: { isApproved, isActive }
async function adminUpdate(req, res) {
  try {
    const { isApproved, isActive } = req.body;
    const venue = await prisma.venue.update({
      where: { id: req.params.id },
      data: {
        ...(isApproved !== undefined && { isApproved: Boolean(isApproved) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json({ venue: shapeVenue(venue) });
  } catch (err) {
    res.status(404).json({ error: "Venue not found." });
  }
}

module.exports = {
  register, getMine, updateMine, addTariff, updateTariff, deleteTariff, addBlock, removeBlock,
  myBookings, decideBooking, myDashboard,
  listVenues, getVenue, createBooking, myCustomerBookings, cancelBooking,
  adminList, adminUpdate,
};
