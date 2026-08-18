const prisma = require("../config/db");

// POST /api/reviews (CUSTOMER) - body: { orderId, rating, comment }
async function createReview(req, res) {
  const { orderId, rating, comment } = req.body;
  if (!orderId || !rating) return res.status(400).json({ error: "orderId and rating are required." });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be between 1 and 5." });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "This isn't your order." });
  if (order.status !== "DELIVERED") {
    return res.status(400).json({ error: "You can only review an order after it's delivered." });
  }

  try {
    const review = await prisma.review.create({
      data: { orderId, userId: req.user.id, rating: Number(rating), comment },
    });
    res.status(201).json({ review });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "You've already reviewed this order." });
    }
    console.error("createReview error:", err);
    res.status(500).json({ error: "Could not submit review." });
  }
}

// GET /api/reviews (ADMIN) - all reviews, most recent first
async function listReviews(req, res) {
  const reviews = await prisma.review.findMany({
    include: { user: { select: { name: true } }, order: { select: { id: true, totalAmount: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ reviews });
}

// GET /api/reviews/summary (public) - average rating + count, for display
async function reviewSummary(req, res) {
  const agg = await prisma.review.aggregate({ _avg: { rating: true }, _count: true });
  res.json({ averageRating: agg._avg.rating || 0, totalReviews: agg._count });
}

module.exports = { createReview, listReviews, reviewSummary };
