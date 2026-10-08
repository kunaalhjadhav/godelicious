const prisma = require("../config/db");
const { sendPushToUser } = require("./push.service");

// 10 reward points = Rs 1. Customers earn 1 point for every Rs 10 they pay
// (about 1% back), plus a one-time bonus for each side of a referral.
const POINTS_PER_RUPEE = 10;
const EARN_RUPEES_PER_POINT = 10;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid typos

function makeCode(name) {
  const letters = (name || "GD").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4).padEnd(4, "G");
  let tail = "";
  for (let i = 0; i < 3; i++) tail += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${letters}${tail}`;
}

// Gives the user a referral code the first time one is needed.
async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeCode(user.name);
    try {
      await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
      return code;
    } catch (err) {
      if (err.code !== "P2002") throw err; // only retry on a duplicate code
    }
  }
  throw new Error("Could not create a referral code.");
}

async function getBonusPoints() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return s?.referralBonusPoints ?? 1000;
}

// Called after an order is marked DELIVERED. Idempotent: an order only ever earns once.
async function awardForDelivered(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "DELIVERED") return;

  const already = await prisma.pointLog.findFirst({ where: { orderId, reason: "EARN_ORDER" } });
  if (already) return;

  const earned = Math.floor(order.totalAmount / EARN_RUPEES_PER_POINT);
  if (earned > 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: earned } } }),
      prisma.pointLog.create({ data: { userId: order.userId, points: earned, reason: "EARN_ORDER", orderId } }),
    ]);
    sendPushToUser(order.userId, {
      title: "Reward points added",
      body: `You earned ${earned} points on your delivered order.`,
      data: { type: "points" },
    }).catch(() => {});
  }

  // Referral bonus: the first delivered order of a referred friend pays out to both people.
  const user = await prisma.user.findUnique({ where: { id: order.userId } });
  if (user?.referredById && !user.referralPaid) {
    const bonus = await getBonusPoints();
    if (bonus > 0) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { loyaltyPoints: { increment: bonus }, referralPaid: true } }),
        prisma.pointLog.create({ data: { userId: user.id, points: bonus, reason: "REFERRAL_BONUS", orderId } }),
        prisma.user.update({ where: { id: user.referredById }, data: { loyaltyPoints: { increment: bonus } } }),
        prisma.pointLog.create({ data: { userId: user.referredById, points: bonus, reason: "REFERRAL_BONUS", orderId } }),
      ]);
      const rupees = Math.floor(bonus / POINTS_PER_RUPEE);
      sendPushToUser(user.referredById, {
        title: "Referral reward",
        body: `${user.name} placed their first order. You both got Rs ${rupees} in reward points.`,
        data: { type: "points" },
      }).catch(() => {});
    }
  }
}

// Called inside the cancel transaction: points a customer spent on a cancelled order go back.
async function refundPointsForCancelled(tx, order) {
  if (!order.pointsUsed || order.pointsUsed <= 0) return;
  const already = await tx.pointLog.findFirst({ where: { orderId: order.id, reason: "REFUND" } });
  if (already) return;
  await tx.user.update({ where: { id: order.userId }, data: { loyaltyPoints: { increment: order.pointsUsed } } });
  await tx.pointLog.create({ data: { userId: order.userId, points: order.pointsUsed, reason: "REFUND", orderId: order.id } });
}

module.exports = {
  POINTS_PER_RUPEE, EARN_RUPEES_PER_POINT,
  ensureReferralCode, awardForDelivered, refundPointsForCancelled,
};
