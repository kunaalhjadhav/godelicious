const prisma = require("../config/db");

// POST /api/venue-enquiries (CUSTOMER)
async function createEnquiry(req, res) {
  try {
    const { venueName, location, eventDate, guestCount, budget, contactPhone, notes } = req.body;

    if (!venueName || !location || !eventDate || !guestCount || !contactPhone) {
      return res.status(400).json({
        error: "venueName, location, eventDate, guestCount and contactPhone are required.",
      });
    }

    const enquiry = await prisma.venueEnquiry.create({
      data: {
        userId: req.user.id,
        venueName,
        location,
        eventDate: new Date(eventDate),
        guestCount: Number(guestCount),
        budget: budget !== undefined ? Number(budget) : null,
        contactPhone,
        notes,
      },
    });
    res.status(201).json({ enquiry });
  } catch (err) {
    console.error("createEnquiry error:", err);
    res.status(500).json({ error: "Could not submit venue enquiry." });
  }
}

// GET /api/venue-enquiries/my (CUSTOMER)
async function myEnquiries(req, res) {
  const enquiries = await prisma.venueEnquiry.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ enquiries });
}

// GET /api/venue-enquiries (ADMIN) - optional ?status= filter
async function listEnquiries(req, res) {
  const { status } = req.query;
  const enquiries = await prisma.venueEnquiry.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ enquiries });
}

// PATCH /api/venue-enquiries/:id (ADMIN) - approve or reject
// body: { status: "APPROVED" | "REJECTED", adminNote }
async function reviewEnquiry(req, res) {
  const { status, adminNote } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "status must be APPROVED or REJECTED." });
  }

  try {
    const enquiry = await prisma.venueEnquiry.update({
      where: { id: req.params.id },
      data: { status, adminNote },
    });
    res.json({ enquiry });
  } catch (err) {
    console.error("reviewEnquiry error:", err);
    res.status(404).json({ error: "Enquiry not found." });
  }
}

module.exports = { createEnquiry, myEnquiries, listEnquiries, reviewEnquiry };
