const prisma = require("../config/db");
const { getBestsellers } = require("../services/bestsellers.service");
const { attachRatings } = require("../services/ratings.service");
const { istYmd, dateFromYmd, addDaysYmd, formatSlot } = require("../utils/ist");

const MIN_LEAD_HOURS = 15;
const FIRST_SLOT_MIN = 8 * 60;   // deliveries start at 8:00 AM
const LAST_SLOT_MIN = 21 * 60;   // and end at 9:00 PM

const OCCASIONS = [
  { key: "birthday", label: "Birthday", guests: 30, foodStyle: "veg" },
  { key: "wedding", label: "Wedding", guests: 120, foodStyle: "veg" },
  { key: "office", label: "Office lunch", guests: 25, foodStyle: "mixed" },
  { key: "housewarming", label: "Housewarming", guests: 50, foodStyle: "veg" },
];

// The earliest delivery slot a customer can still pick right now (15 hours of
// notice, half-hour slots between 8 AM and 9 PM), and when the window for the
// next morning's slots closes.
function leadTimeInfo(now = new Date()) {
  const earliestInstant = new Date(now.getTime() + MIN_LEAD_HOURS * 3600 * 1000);
  let ymd = istYmd(earliestInstant);
  const istMinutes = Math.floor(((earliestInstant.getTime() - dateFromYmd(ymd).getTime()) / 60000));
  let slotMin = Math.ceil(istMinutes / 30) * 30;
  if (slotMin < FIRST_SLOT_MIN) slotMin = FIRST_SLOT_MIN;
  if (slotMin > LAST_SLOT_MIN) { ymd = addDaysYmd(ymd, 1); slotMin = FIRST_SLOT_MIN; }

  const tomorrow = addDaysYmd(istYmd(now), 1);
  const firstTomorrow = new Date(dateFromYmd(tomorrow).getTime() + FIRST_SLOT_MIN * 60000);
  const cutoff = new Date(firstTomorrow.getTime() - MIN_LEAD_HOURS * 3600 * 1000);
  const tomorrowStillOpen = now < cutoff;

  const today = istYmd(now);
  const dayWord = ymd === today ? "today" : ymd === tomorrow ? "tomorrow" : ymd;
  const message = tomorrowStillOpen
    ? `Orders for tomorrow close today at ${formatSlot(Math.round((cutoff.getTime() - dateFromYmd(today).getTime()) / 60000))}`
    : `Earliest delivery now: ${dayWord} at ${formatSlot(slotMin)}`;

  return { leadHours: MIN_LEAD_HOURS, tomorrowStillOpen, earliestDate: ymd, earliestSlot: formatSlot(slotMin), message };
}

function summarizeItems(items) {
  if (!items.length) return "Your order";
  const first = items[0];
  const qty = first.menuItem.soldByWeight ? `${first.quantity / 1000} kg` : `x ${first.quantity}`;
  const more = items.length > 1 ? ` and ${items.length - 1} more` : "";
  return `${first.menuItem.name} ${qty}${more}`;
}

// GET /api/home (works signed-in or not; signed-in users get personal sections)
async function homeFeed(req, res) {
  const userId = req.user?.id || null;
  const now = new Date();

  const [settings, bestsellers, brands, venueCount, venueTariff, offers, publicCoupons, mainItems] = await Promise.all([
    prisma.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } }),
    getBestsellers(6),
    prisma.brand.findMany({ where: { isActive: true, isApproved: true }, select: { id: true, name: true, logoUrl: true }, take: 10, orderBy: { name: "asc" } }),
    prisma.venue.count({ where: { isApproved: true, isActive: true } }),
    prisma.venueTariff.findFirst({
      where: { kind: "HALL", isActive: true, venue: { isApproved: true, isActive: true } },
      orderBy: { price: "asc" }, select: { price: true },
    }),
    prisma.offer.findMany({ where: { status: "APPROVED" }, include: { brand: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.coupon.findMany({
      where: { isActive: true, isPublic: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.menuItem.findMany({
      where: { plannerRole: "MAIN", approvalStatus: "APPROVED", isAvailable: true }, select: { price: true },
    }),
  ]);

  let nextDelivery = null;
  let orderAgain = [];
  let favoriteIds = [];
  let mySubscription = null;

  if (userId) {
    const startToday = dateFromYmd(istYmd(now));
    const [upcoming, recent, favs, sub] = await Promise.all([
      prisma.order.findFirst({
        where: {
          userId, status: { in: ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
          OR: [{ eventDate: { gte: startToday } }, { eventDate: null }],
        },
        orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
        include: { items: { include: { menuItem: true } } },
      }),
      prisma.order.findMany({
        where: { userId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 20,
        include: { items: { include: { menuItem: true } } },
      }),
      prisma.favorite.findMany({ where: { userId }, select: { menuItemId: true } }),
      prisma.subscription.findFirst({ where: { userId, status: { in: ["ACTIVE", "PAUSED"] } }, include: { menuItem: true } }),
    ]);

    if (upcoming) {
      nextDelivery = {
        id: upcoming.id, status: upcoming.status, eventDate: upcoming.eventDate, eventTime: upcoming.eventTime,
        summary: summarizeItems(upcoming.items),
      };
    }

    const seen = new Set();
    for (const o of recent) {
      for (const it of o.items) {
        if (seen.has(it.menuItemId)) continue;
        const mi = it.menuItem;
        if (!mi || mi.approvalStatus !== "APPROVED" || !mi.isAvailable) continue;
        seen.add(it.menuItemId);
        orderAgain.push({
          menuItemId: mi.id, name: mi.name, imageUrl: mi.imageUrl, soldByWeight: mi.soldByWeight, isCombo: mi.isCombo,
          quantity: it.quantity, orderedAt: o.createdAt,
          lineTotal: Math.round(it.price * it.quantity), menuItem: mi,
        });
        if (orderAgain.length >= 6) break;
      }
      if (orderAgain.length >= 6) break;
    }
    favoriteIds = favs.map((f) => f.menuItemId);
    mySubscription = sub
      ? { id: sub.id, status: sub.status, itemName: sub.menuItem.name, boxesPerDay: sub.boxesPerDay }
      : null;
  }

  // "Offers for you": free-delivery progress is worked out in the app from the cart.
  const offerCards = [];
  if (settings.deliveryFee > 0 && settings.freeDeliveryAbove > 0) {
    offerCards.push({
      type: "DELIVERY", title: "Free delivery",
      subtitle: `On orders above ₹${Math.round(settings.freeDeliveryAbove).toLocaleString("en-IN")}`,
      threshold: settings.freeDeliveryAbove,
    });
  }
  for (const c of publicCoupons) {
    offerCards.push({
      type: "COUPON", code: c.code,
      title: c.title || (c.discountType === "PERCENT" ? `${c.discountValue}% off` : `₹${c.discountValue} off`),
      subtitle: c.minOrderAmount > 0 ? `On orders above ₹${Math.round(c.minOrderAmount)}` : "Tap to copy the code",
    });
  }
  for (const o of offers) {
    offerCards.push({ type: "BRAND", title: `${Math.round(o.discountPercent)}% off ${o.brand.name}`, subtitle: o.title, brandId: o.brandId });
  }

  res.json({
    leadTime: leadTimeInfo(now),
    nextDelivery,
    occasions: OCCASIONS,
    offers: offerCards,
    orderAgain,
    brands,
    bestsellers,
    favoriteIds,
    weeklyBox: {
      available: mainItems.length > 0,
      discountPct: settings.subscriptionDiscountPct,
      fromPrice: mainItems.length ? Math.min(...mainItems.map((i) => i.price)) : null,
      mine: mySubscription,
    },
    venues: { count: venueCount, fromPrice: venueTariff?.price ?? null },
    shop: {
      minOrderAmount: settings.minOrderAmount,
      deliveryFee: settings.deliveryFee,
      freeDeliveryAbove: settings.freeDeliveryAbove,
    },
  });
}

module.exports = { homeFeed, leadTimeInfo };
