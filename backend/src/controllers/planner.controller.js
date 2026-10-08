const prisma = require("../config/db");
const { salesRank } = require("../services/bestsellers.service");

const GUESTS_PER_STAFF = 20;
const DEFAULT_GUESTS_PER_KG = 10; // used when an admin has not set "serves per kg" on a sweet

function pickBest(items, rank) {
  return [...items].sort((a, b) => (rank[b.id] || 0) - (rank[a.id] || 0) || a.price - b.price)[0] || null;
}

function slim(i) {
  return {
    id: i.id, name: i.name, price: i.price, isVeg: i.isVeg, imageUrl: i.imageUrl,
    soldByWeight: i.soldByWeight, isCombo: i.isCombo, stockQty: i.stockQty, isAvailable: i.isAvailable,
    comboGroups: i.comboGroups || [], brand: i.brand ? { id: i.brand.id, name: i.brand.name } : null,
  };
}

// POST /api/planner/suggest { guests, foodStyle: "veg"|"mixed"|"jain", occasion? }
// Suggests how much of each product role (main meal box, sweet, drink) plus
// serving staff a party needs, based on each product's "serves" number.
async function suggest(req, res) {
  const guests = Math.floor(Number(req.body.guests));
  const occasion = String(req.body.occasion || "");
  if (!guests || guests < 1 || guests > 5000) return res.status(400).json({ error: "Enter a guest count between 1 and 5000." });
  const style = ["veg", "mixed", "jain"].includes(req.body.foodStyle) ? req.body.foodStyle : "veg";
  const vegOnly = style !== "mixed" || /pooja|puja|housewarming/i.test(occasion);

  const [items, rank, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { plannerRole: { not: null }, approvalStatus: "APPROVED", isAvailable: true },
      include: { comboGroups: { include: { options: true } }, brand: true },
    }),
    salesRank(),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const byRole = (role, veg) => items.filter((i) => i.plannerRole === role && (veg === undefined || i.isVeg === veg));
  const lines = [];

  function addLine(role, item, quantity, display) {
    const unit = item.soldByWeight ? item.price / 1000 : item.price;
    lines.push({
      role,
      menuItem: slim(item),
      quantity, // what the cart expects: pieces, or grams for weight items
      display, // e.g. "120" or "10 kg"
      unitPrice: item.price,
      lineTotal: Math.round(unit * quantity),
      inStock: item.stockQty >= quantity,
      availableQty: item.stockQty,
    });
  }

  // Main meal: for a mixed crowd, split 60/40 veg / non-veg when both exist.
  if (vegOnly) {
    const main = pickBest(byRole("MAIN", true), rank);
    if (main) addLine("MAIN", main, Math.ceil(guests / Math.max(1, main.servesPerUnit)), String(Math.ceil(guests / Math.max(1, main.servesPerUnit))));
  } else {
    const veg = pickBest(byRole("MAIN", true), rank);
    const nonVeg = pickBest(byRole("MAIN", false), rank);
    if (veg && nonVeg) {
      const vegGuests = Math.ceil(guests * 0.6);
      const nvGuests = guests - vegGuests;
      const vq = Math.ceil(vegGuests / Math.max(1, veg.servesPerUnit));
      const nq = Math.ceil(nvGuests / Math.max(1, nonVeg.servesPerUnit));
      addLine("MAIN", veg, vq, String(vq));
      addLine("MAIN", nonVeg, nq, String(nq));
    } else {
      const only = veg || nonVeg;
      if (only) {
        const q = Math.ceil(guests / Math.max(1, only.servesPerUnit));
        addLine("MAIN", only, q, String(q));
      }
    }
  }

  const sweet = pickBest(byRole("SWEET", vegOnly ? true : undefined), rank);
  if (sweet) {
    if (sweet.soldByWeight) {
      const perKg = sweet.servesPerUnit > 1 ? sweet.servesPerUnit : DEFAULT_GUESTS_PER_KG;
      const halfKgs = Math.ceil((guests / perKg) * 2); // round up to the next 0.5 kg
      const grams = Math.max(halfKgs * 500, sweet.minOrderGrams || 0);
      addLine("SWEET", sweet, grams, `${grams / 1000} kg`);
    } else {
      const q = Math.ceil(guests / Math.max(1, sweet.servesPerUnit));
      addLine("SWEET", sweet, q, String(q));
    }
  }

  const drink = pickBest(byRole("DRINK", vegOnly ? true : undefined), rank);
  if (drink) {
    const q = Math.ceil(guests / Math.max(1, drink.servesPerUnit));
    addLine("DRINK", drink, q, String(q));
  }

  const staffPrice = settings?.staffPricePerPerson || 0;
  const staff = staffPrice > 0
    ? { count: Math.ceil(guests / GUESTS_PER_STAFF), unitPrice: staffPrice, total: Math.ceil(guests / GUESTS_PER_STAFF) * staffPrice }
    : null;

  const total = lines.reduce((s, l) => s + l.lineTotal, 0) + (staff?.total || 0);
  res.json({
    guests, foodStyle: style, occasion, lines, staff, total,
    note: lines.length === 0
      ? "No products are set up for the planner yet. Ask the shop to tag a meal box, a sweet and a drink."
      : null,
  });
}

module.exports = { suggest };
