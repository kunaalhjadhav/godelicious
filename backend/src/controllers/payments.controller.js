const crypto = require("crypto");
const Razorpay = require("razorpay");
const prisma = require("../config/db");

// Instantiated lazily so the app doesn't crash on boot if keys aren't set yet
// (e.g. during initial local setup before you've created a Razorpay account).
function getClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay isn't configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env " +
      "(get test keys from your Razorpay dashboard under Settings > API Keys)."
    );
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payments/razorpay/create-order (CUSTOMER)
// body: { orderId } — the Godelicious Order must already exist (created via
// POST /api/orders with paymentMethod: "ONLINE") and belong to this user.
async function createRazorpayOrder(req, res) {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: "orderId is required." });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "This isn't your order." });
  if (order.paymentMethod !== "ONLINE") {
    return res.status(400).json({ error: "This order isn't set up for online payment." });
  }
  if (order.paymentStatus === "PAID") {
    return res.status(400).json({ error: "This order is already paid." });
  }

  try {
    const client = getClient();
    const rpOrder = await client.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: "INR",
      receipt: order.id,
    });

    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rpOrder.id } });

    res.json({
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // safe to expose — this is the public key, not the secret
    });
  } catch (err) {
    console.error("createRazorpayOrder error:", err.message);
    res.status(500).json({ error: err.message || "Could not create payment order." });
  }
}

// POST /api/payments/razorpay/verify (CUSTOMER)
// body: { orderId, razorpayPaymentId, razorpaySignature }
// Verifies the payment signature Razorpay's checkout widget hands back —
// this is the step that actually confirms payment happened; never trust
// a "payment succeeded" claim from the client without this check.
async function verifyRazorpayPayment(req, res) {
  const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!orderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ error: "orderId, razorpayPaymentId and razorpaySignature are required." });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (order.userId !== req.user.id) return res.status(403).json({ error: "This isn't your order." });
  if (!order.razorpayOrderId) return res.status(400).json({ error: "No payment was initiated for this order." });

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({ error: "Payment verification failed — signature mismatch." });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", razorpayPaymentId, razorpaySignature },
  });
  res.json({ order: updated });
}

module.exports = { createRazorpayOrder, verifyRazorpayPayment };
