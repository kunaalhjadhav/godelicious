// Order commands sent on WhatsApp to the business number.
// From the company number (Admin > Settings > WhatsApp number, plus ADMIN_WHATSAPP_EXTRA):
//   ACCEPT 1A2B3C4D            confirm the order
//   REJECT 1A2B3C4D reason     cancel it (stock and points are returned as usual)
//   PREPARING / OUT / DELIVERED 1A2B3C4D
//   ASSIGN 1A2B3C4D Ravi       offer it to a delivery partner (name or phone)
//   RIDERS                     list approved riders and who is online
//   HELP                       this list
// From a delivery partner's phone:  ACCEPT 1A2B3C4D  /  REJECT 1A2B3C4D reason
const prisma = require("../config/db");
const { changeStatus, findByCode, assignOrder, shortId } = require("./orderActions.service");

const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const HELP =
  "Godelicious order commands:\n" +
  "ACCEPT <code>\nREJECT <code> reason\nPREPARING <code>\nOUT <code>\nDELIVERED <code>\n" +
  "ASSIGN <code> <rider name or phone>\nRIDERS\nThe code is the 8 characters after # in the order message.";

async function adminNumbers() {
  const s = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const list = [s?.adminWhatsapp, process.env.ADMIN_WHATSAPP, ...(process.env.ADMIN_WHATSAPP_EXTRA || "").split(",")];
  return new Set(list.map(last10).filter((x) => x.length === 10));
}

async function actorId() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return admin?.id;
}

const STATUS_WORDS = {
  ACCEPT: "CONFIRMED", OK: "CONFIRMED", CONFIRM: "CONFIRMED", YES: "CONFIRMED",
  REJECT: "CANCELLED", CANCEL: "CANCELLED", NO: "CANCELLED",
  PREPARING: "PREPARING", PREPARE: "PREPARING",
  OUT: "OUT_FOR_DELIVERY", DISPATCH: "OUT_FOR_DELIVERY", DISPATCHED: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED", DONE: "DELIVERED",
};

// Returns a reply text when the message was a command, otherwise null (normal chat continues).
async function handleCommand(fromPhone, text) {
  const raw = String(text || "").trim();
  const [word0, code, ...rest] = raw.split(/\s+/);
  const word = (word0 || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!word) return null;
  const from = last10(fromPhone);

  // ---- Company number ----
  if ((await adminNumbers()).has(from)) {
    if (word === "HELP" || word === "COMMANDS") return HELP;
    if (word === "RIDERS") {
      const riders = await prisma.deliveryPartner.findMany({ where: { status: "APPROVED", isActive: true }, orderBy: [{ isOnline: "desc" }, { name: "asc" }] });
      if (!riders.length) return "No approved delivery partners yet. Add them in Admin > Delivery Partners.";
      return "Delivery partners:\n" + riders.map((r) => `${r.isOnline ? "🟢" : "⚪"} ${r.name} - ${r.phone}`).join("\n");
    }
    if (word === "ASSIGN") {
      const order = await findByCode(code);
      if (!order) return `Order ${code || ""} not found. Use the 8-character code from the order message.`;
      const q = rest.join(" ").trim();
      if (!q) return `Who should deliver #${shortId(order.id)}? Reply ASSIGN ${shortId(order.id)} rider name. Send RIDERS for the list.`;
      const riders = await prisma.deliveryPartner.findMany({ where: { status: "APPROVED", isActive: true } });
      const digits = last10(q);
      const exact = riders.filter((r) => r.name.toLowerCase() === q.toLowerCase());
      const matches = exact.length === 1 ? exact : riders.filter((r) => (digits.length === 10 && last10(r.phone) === digits) || r.name.toLowerCase().includes(q.toLowerCase()));
      if (matches.length === 0) return `No approved rider matches "${q}". Send RIDERS for the list.`;
      if (matches.length > 1) return `More than one rider matches "${q}": ${matches.map((r) => `${r.name} (${r.phone})`).join(", ")}. Reply with the phone number instead.`;
      try {
        await assignOrder(order.id, matches[0].id);
        return `#${shortId(order.id)} sent to ${matches[0].name}${matches[0].userId ? ". Waiting for them to accept in the rider app." : " on WhatsApp."}`;
      } catch (err) { return `Could not assign: ${err.message}`; }
    }
    const status = STATUS_WORDS[word];
    if (status) {
      const order = await findByCode(code);
      if (!order) return code ? `Order ${code} not found. Use the 8-character code from the order message.` : null;
      const uid = await actorId();
      if (!uid) return "No admin account found to record this change.";
      const r = await changeStatus(order.id, status, uid);
      if (!r.ok) return `Could not update #${shortId(order.id)}: ${r.error}`;
      return `#${shortId(order.id)} is now ${status.replace(/_/g, " ").toLowerCase()}. The customer has been told and the dashboard is updated.` +
        (status === "CONFIRMED" ? ` Assign a rider: ASSIGN ${shortId(order.id)} rider name` : "");
    }
    return null;
  }

  // ---- Delivery partner's phone ----
  if (word === "ACCEPT" || word === "REJECT" || word === "OK") {
    const partner = (await prisma.deliveryPartner.findMany({ where: { status: "APPROVED" } })).find((p) => last10(p.phone) === from);
    if (!partner) return null;
    const order = await findByCode(code);
    if (!order || order.deliveryPartnerId !== partner.id) return `Order ${code || ""} isn't assigned to you.`;
    if (order.assignStatus !== "OFFERED") return `#${shortId(order.id)} is not waiting for your answer.`;
    const notify = require("./notify.service");
    if (word === "REJECT") {
      await prisma.order.update({ where: { id: order.id }, data: { assignStatus: "REJECTED", deliveryPartnerId: null } });
      await notify.notifyRiderDecision(order.id, partner.name, false, rest.join(" "));
      return `OK, #${shortId(order.id)} is released. Thank you.`;
    }
    await prisma.order.update({ where: { id: order.id }, data: { assignStatus: "ACCEPTED", riderAcceptedAt: new Date() } });
    await notify.notifyRiderDecision(order.id, partner.name, true);
    return `You accepted #${shortId(order.id)}. Open the rider app to pick it up and deliver.`;
  }
  return null;
}

module.exports = { handleCommand };
