const prisma = require("../config/db");
const { sendPushToUser } = require("./push.service");

// If this item is orderable again, tell everyone who tapped "Notify me" on it
// in their favourites, then clear the flag so they are only told once.
async function checkBackInStock(menuItemId) {
  try {
    const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!item || !item.isAvailable || item.stockQty <= 0 || item.approvalStatus !== "APPROVED") return;

    const waiting = await prisma.favorite.findMany({ where: { menuItemId, notifyWhenBack: true } });
    if (waiting.length === 0) return;

    await prisma.favorite.updateMany({ where: { menuItemId, notifyWhenBack: true }, data: { notifyWhenBack: false } });
    for (const f of waiting) {
      sendPushToUser(f.userId, {
        title: `${item.name} is back`,
        body: "It is available to order again.",
        data: { type: "back_in_stock", itemId: item.id },
      }).catch(() => {});
    }
  } catch (err) {
    console.error("checkBackInStock failed:", err.message);
  }
}

module.exports = { checkBackInStock };
