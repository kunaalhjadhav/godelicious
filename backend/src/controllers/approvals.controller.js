const prisma = require("../config/db");
const { notifyBrandDecision } = require("../services/notify.service");

// GET /api/approvals (ADMIN/STAFF) — everything a brand partner has asked for
// that is waiting on a decision: new items, edits to live items, removals.
async function listApprovals(req, res) {
  const items = await prisma.menuItem.findMany({
    where: {
      brandId: { not: null },
      OR: [{ approvalStatus: "PENDING" }, { pendingChanges: { not: null } }, { deleteRequested: true }],
    },
    include: { brand: { select: { id: true, name: true } }, category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const approvals = items.map((i) => {
    let kind = "NEW_ITEM";
    if (i.deleteRequested) kind = "REMOVE_ITEM";
    else if (i.pendingChanges) kind = "EDIT_ITEM";
    return {
      id: i.id,
      kind,
      brand: i.brand,
      item: {
        name: i.name, description: i.description, price: i.price, imageUrl: i.imageUrl,
        isVeg: i.isVeg, category: i.category?.name, soldByWeight: i.soldByWeight, stockQty: i.stockQty,
      },
      changes: i.pendingChanges ? JSON.parse(i.pendingChanges) : null,
      requestedAt: i.updatedAt,
    };
  });
  res.json({ approvals });
}

// PATCH /api/approvals/:id (ADMIN/STAFF)  body: { action: "approve" | "reject", note }
async function decide(req, res) {
  const { action, note } = req.body;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "action must be approve or reject." });
  }
  const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  if (!item || !item.brandId) return res.status(404).json({ error: "Item not found." });

  try {
    let result;
    let message;
    if (item.deleteRequested) {
      if (action === "approve") {
        const used = await prisma.orderItem.count({ where: { menuItemId: item.id } });
        if (used > 0) {
          // Past orders reference it, so archive instead of hard-deleting.
          result = await prisma.menuItem.update({
            where: { id: item.id },
            data: { isAvailable: false, approvalStatus: "REJECTED", approvalNote: "Removed at partner's request", deleteRequested: false, pendingChanges: null },
          });
        } else {
          await prisma.menuItem.delete({ where: { id: item.id } });
        }
        message = `Removal of "${item.name}" approved.`;
      } else {
        result = await prisma.menuItem.update({ where: { id: item.id }, data: { deleteRequested: false } });
        message = `Removal of "${item.name}" was declined; it stays live.${note ? " " + note : ""}`;
      }
    } else if (item.pendingChanges) {
      if (action === "approve") {
        result = await prisma.menuItem.update({
          where: { id: item.id },
          data: { ...JSON.parse(item.pendingChanges), pendingChanges: null, approvalNote: null },
        });
        message = `Your changes to "${item.name}" are now live.`;
      } else {
        result = await prisma.menuItem.update({ where: { id: item.id }, data: { pendingChanges: null, approvalNote: note || null } });
        message = `Changes to "${item.name}" were declined.${note ? " " + note : ""}`;
      }
    } else if (item.approvalStatus === "PENDING") {
      result = await prisma.menuItem.update({
        where: { id: item.id },
        data: action === "approve"
          ? { approvalStatus: "APPROVED", approvalNote: null }
          : { approvalStatus: "REJECTED", approvalNote: note || "Rejected by admin" },
      });
      message = action === "approve"
        ? `"${item.name}" is approved and now visible to customers.`
        : `"${item.name}" was rejected.${note ? " " + note : ""}`;
    } else {
      return res.status(400).json({ error: "Nothing pending for this item." });
    }

    notifyBrandDecision(item.brandId, action === "approve" ? "Approved" : "Not approved", message);
    res.json({ success: true, item: result || null });
  } catch (err) {
    console.error("approval decide error:", err);
    res.status(500).json({ error: "Could not record the decision." });
  }
}

module.exports = { listApprovals, decide };
