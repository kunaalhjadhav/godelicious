// Food codes (GD-0001, GD-0002 ...) and duplicate-name checks for menu items.
const PREFIX = "GD-";

// "  Veg  Biryani " and "veg biryani" count as the same name
function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9ಀ-೿ ]/g, " ").replace(/\s+/g, " ").trim();
}

async function nextCode(prisma) {
  const rows = await prisma.menuItem.findMany({ where: { foodCode: { startsWith: PREFIX } }, select: { foodCode: true } });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.foodCode).slice(PREFIX.length), 10);
    if (n > max) max = n;
  }
  return max + 1;
}

const format = (n) => `${PREFIX}${String(n).padStart(4, "0")}`;

// Gives a code to every item that has none (older items, meal boxes, partner items). Safe to call often.
async function ensureFoodCodes(prisma) {
  const missing = await prisma.menuItem.findMany({ where: { foodCode: null }, select: { id: true }, orderBy: { createdAt: "asc" } });
  if (!missing.length) return 0;
  let n = await nextCode(prisma);
  for (const m of missing) {
    for (let tries = 0; tries < 5; tries++) {
      try {
        await prisma.menuItem.update({ where: { id: m.id }, data: { foodCode: format(n++) } });
        break;
      } catch (err) {
        if (err.code !== "P2002") throw err; // someone took that number: try the next one
      }
    }
  }
  return missing.length;
}

// Next free code for an item being created
async function newFoodCode(prisma) {
  return format(await nextCode(prisma));
}

// Items with the same normalised name (and, if given, the same category)
async function findDuplicates(prisma, name, { excludeId, categoryId } = {}) {
  const key = normalizeName(name);
  if (!key) return [];
  const candidates = await prisma.menuItem.findMany({
    where: { isArchived: false, ...(excludeId && { id: { not: excludeId } }), ...(categoryId && { categoryId }) },
    select: { id: true, name: true, foodCode: true, price: true, category: { select: { name: true } } },
  });
  return candidates.filter((c) => normalizeName(c.name) === key);
}

module.exports = { normalizeName, ensureFoodCodes, newFoodCode, findDuplicates };
