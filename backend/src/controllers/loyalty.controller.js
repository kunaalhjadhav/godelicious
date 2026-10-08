const prisma = require("../config/db");
const { POINTS_PER_RUPEE, ensureReferralCode } = require("../services/loyalty.service");

// GET /api/loyalty/me - points, referral code, recent history
async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found." });
  const referralCode = await ensureReferralCode(user);
  const [history, referredCount, settings] = await Promise.all([
    prisma.pointLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.user.count({ where: { referredById: user.id } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);
  const bonus = settings?.referralBonusPoints ?? 1000;
  res.json({
    points: user.loyaltyPoints,
    rupeeValue: Math.floor(user.loyaltyPoints / POINTS_PER_RUPEE),
    pointsPerRupee: POINTS_PER_RUPEE,
    referralCode,
    referralBonusRupees: Math.floor(bonus / POINTS_PER_RUPEE),
    referredCount,
    alreadyReferred: Boolean(user.referredById),
    history,
  });
}

// POST /api/loyalty/apply-referral { code } - only before your first order, once
async function applyReferral(req, res) {
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "Enter a referral code." });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.referredById) return res.status(400).json({ error: "You have already used a referral code." });
  const orderCount = await prisma.order.count({ where: { userId: user.id, status: { not: "CANCELLED" } } });
  if (orderCount > 0) return res.status(400).json({ error: "Referral codes can only be used before your first order." });

  const referrer = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!referrer) return res.status(404).json({ error: "That referral code was not found." });
  if (referrer.id === user.id) return res.status(400).json({ error: "You cannot use your own code." });

  await prisma.user.update({ where: { id: user.id }, data: { referredById: referrer.id } });
  res.json({ success: true, message: "Code applied. You and your friend get a reward after your first delivered order." });
}

module.exports = { me, applyReferral };
