// Sets the minimum order (in grams) for items sold by weight.
//   node scripts/set-min-grams.js 250                  -> every item sold by weight
//   node scripts/set-min-grams.js 250 "Weight Box"     -> only items in that category (name, any capitals)
require("dotenv").config();
const prisma = require("../src/config/db");

(async () => {
  const grams = Number(process.argv[2]);
  const category = process.argv[3];
  if (!grams || grams < 50) { console.log('Usage: node scripts/set-min-grams.js 250 ["Category name"]'); process.exit(1); }
  const where = { soldByWeight: true };
  if (category) where.category = { name: { equals: category, mode: "insensitive" } };
  const items = await prisma.menuItem.findMany({ where, select: { id: true, name: true, minOrderGrams: true } });
  if (!items.length) { console.log("No matching items. Check the category name."); process.exit(0); }
  const r = await prisma.menuItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { minOrderGrams: grams } });
  console.log(`Updated ${r.count} item(s) to a ${grams} g minimum:`);
  items.forEach((i) => console.log(` - ${i.name} (was ${i.minOrderGrams} g)`));
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
