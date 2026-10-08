const prisma = require("../config/db");
const { sendPushToUser } = require("./push.service");
const { notifyNewOrder } = require("./notify.service");
const { istYmd, dateFromYmd, addDaysYmd, weekdayOfYmd, parseSlotMinutes } = require("../utils/ist");

const CHANGE_CUTOFF_HOURS = 6; // changes allowed until 6 PM (IST) the day before a delivery

const SLOTS = ["11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM"];

function parseJson(text, fallback) {
  try { const v = JSON.parse(text); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
}

// The moment a delivery day can no longer be skipped or changed: 6 PM the evening before.
function cutoffFor(ymd) {
  return new Date(dateFromYmd(ymd).getTime() - CHANGE_CUTOFF_HOURS * 3600 * 1000);
}

function deliveryInstant(ymd, slot) {
  const mins = parseSlotMinutes(slot) ?? 12 * 60;
  return new Date(dateFromYmd(ymd).getTime() + mins * 60000);
}

// Price of one week. Prices include GST (same as the rest of the app), so GST is shown, not added.
function weeklyQuote(price, boxesPerDay, daysPerWeek, discountPct) {
  const gross = price * boxesPerDay * daysPerWeek;
  const saving = Math.round((gross * discountPct) / 100);
  const total = gross - saving;
  const gstIncluded = Math.round(total - total / 1.05);
  return { gross, saving, total, gstIncluded };
}

// Next delivery dates a subscription will produce (for showing in the app).
function upcomingDates(sub, count = 5, now = new Date()) {
  const days = parseJson(sub.days, []);
  const skips = new Set(parseJson(sub.skipDates, []));
  const startYmd = istYmd(sub.startDate);
  const pausedYmd = sub.pausedUntil ? istYmd(sub.pausedUntil) : null;
  const out = [];
  let ymd = addDaysYmd(istYmd(now), 1);
  for (let i = 0; i < 60 && out.length < count; i++, ymd = addDaysYmd(ymd, 1)) {
    if (ymd < startYmd) continue;
    if (!days.includes(weekdayOfYmd(ymd))) continue;
    if (sub.status === "PAUSED" && (!pausedYmd || ymd <= pausedYmd)) continue;
    out.push({ date: ymd, skipped: skips.has(ymd), canChange: now < cutoffFor(ymd) });
  }
  return out;
}

const warned = new Set(); // avoid pushing the same "could not schedule" message every run

async function createOrderFor(sub, ymd) {
  const exists = await prisma.order.findFirst({
    where: { subscriptionId: sub.id, eventDate: dateFromYmd(ymd) }, select: { id: true },
  });
  if (exists) return null;

  const item = await prisma.menuItem.findUnique({ where: { id: sub.menuItemId } });
  const key = `${sub.id}:${ymd}`;
  if (!item || item.approvalStatus !== "APPROVED" || !item.isAvailable || item.stockQty < sub.boxesPerDay) {
    if (!warned.has(key)) {
      warned.add(key);
      sendPushToUser(sub.userId, {
        title: "Meal box could not be scheduled",
        body: `${item?.name || "Your meal box"} is not available on ${ymd}. We will contact you.`,
        data: { type: "subscription" },
      }).catch(() => {});
    }
    return null;
  }

  const gross = item.price * sub.boxesPerDay;
  const discount = Math.round((gross * sub.discountPct) / 100);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: sub.userId,
        totalAmount: gross - discount,
        discountAmount: discount,
        deliveryAddress: sub.address,
        latitude: sub.latitude,
        longitude: sub.longitude,
        contactPhone: sub.phone,
        notes: "Weekly meal box (automatic order)",
        eventDate: dateFromYmd(ymd),
        eventTime: sub.timeSlot,
        paymentMethod: "COD",
        subscriptionId: sub.id,
        items: { create: [{ menuItemId: item.id, quantity: sub.boxesPerDay, price: item.price }] },
        events: { create: [{ status: "PENDING" }] },
      },
    });
    await tx.menuItem.update({ where: { id: item.id }, data: { stockQty: { decrement: sub.boxesPerDay } } });
    await tx.inventoryLog.create({ data: { menuItemId: item.id, changeQty: -sub.boxesPerDay, reason: "order" } });
    return created;
  });

  notifyNewOrder(order.id);
  sendPushToUser(sub.userId, {
    title: "Meal box scheduled",
    body: `${sub.boxesPerDay} x ${item.name} for ${ymd} at ${sub.timeSlot}. Pay on delivery.`,
    data: { type: "order_status", orderId: order.id },
  }).catch(() => {});
  return order;
}

// Creates the orders for deliveries whose change window has just closed (6 PM the day before).
// Safe to run as often as you like: an order is only ever created once per delivery day.
async function generateDueOrders(now = new Date()) {
  const subs = await prisma.subscription.findMany({ where: { status: { in: ["ACTIVE", "PAUSED"] } } });
  const today = istYmd(now);
  const targets = [addDaysYmd(today, 1), addDaysYmd(today, 2)]; // day 2 = catch-up if the server was down
  let created = 0;

  for (const sub of subs) {
    const days = parseJson(sub.days, []);
    const skips = new Set(parseJson(sub.skipDates, []));
    const startYmd = istYmd(sub.startDate);
    const pausedYmd = sub.pausedUntil ? istYmd(sub.pausedUntil) : null;

    for (const ymd of targets) {
      if (ymd < startYmd) continue;
      if (!days.includes(weekdayOfYmd(ymd))) continue;
      if (skips.has(ymd)) continue;
      if (sub.status === "PAUSED" && (!pausedYmd || ymd <= pausedYmd)) continue;
      if (now < cutoffFor(ymd)) continue;              // customer can still change this day
      if (deliveryInstant(ymd, sub.timeSlot) <= now) continue; // already in the past
      try {
        if (await createOrderFor(sub, ymd)) created += 1;
      } catch (err) {
        console.error(`Subscription ${sub.id} order for ${ymd} failed:`, err.message);
      }
    }
  }
  return created;
}

let timer = null;
function startScheduler() {
  if (timer || process.env.DISABLE_SCHEDULER === "true") return;
  const run = () => generateDueOrders().then((n) => { if (n) console.log(`Weekly meal box: created ${n} order(s).`); })
    .catch((err) => console.error("Subscription scheduler error:", err.message));
  setTimeout(run, 30 * 1000);
  timer = setInterval(run, 15 * 60 * 1000);
}

module.exports = {
  SLOTS, parseJson, cutoffFor, weeklyQuote, upcomingDates, generateDueOrders, startScheduler,
};
