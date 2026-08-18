const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // --- Admin account ---
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@godelicious.com" },
    update: {},
    create: {
      name: "Godelicious Admin",
      email: "admin@godelicious.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  // --- Staff account ---
  const staffPasswordHash = await bcrypt.hash("Staff@123", 10);
  await prisma.user.upsert({
    where: { email: "staff@godelicious.com" },
    update: {},
    create: {
      name: "Kitchen Staff",
      email: "staff@godelicious.com",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
  });

  // --- Sample customer ---
  const customerPasswordHash = await bcrypt.hash("Customer@123", 10);
  await prisma.user.upsert({
    where: { email: "customer@godelicious.com" },
    update: {},
    create: {
      name: "Test Customer",
      email: "customer@godelicious.com",
      passwordHash: customerPasswordHash,
      role: "CUSTOMER",
    },
  });

  // --- Categories ---
  const categoryNames = ["Starters", "Main Course", "Desserts", "Beverages"];
  const categories = {};
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await prisma.category.upsert({
      where: { name: categoryNames[i] },
      update: {},
      create: { name: categoryNames[i], sortOrder: i },
    });
    categories[categoryNames[i]] = cat;
  }

  // --- Menu items ---
  const items = [
    { name: "Paneer Tikka", price: 220, categoryId: categories["Starters"].id, stockQty: 50, isVeg: true },
    { name: "Chicken 65", price: 260, categoryId: categories["Starters"].id, stockQty: 40, isVeg: false },
    { name: "Butter Chicken", price: 340, categoryId: categories["Main Course"].id, stockQty: 30, isVeg: false },
    { name: "Dal Makhani", price: 240, categoryId: categories["Main Course"].id, stockQty: 40, isVeg: true },
    { name: "Veg Biryani", price: 260, categoryId: categories["Main Course"].id, stockQty: 35, isVeg: true },
    { name: "Gulab Jamun (2 pc)", price: 90, categoryId: categories["Desserts"].id, stockQty: 60, isVeg: true },
    { name: "Masala Chai", price: 40, categoryId: categories["Beverages"].id, stockQty: 100, isVeg: true },
  ];

  for (const item of items) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  console.log("Seed complete.");
  console.log("Login credentials:");
  console.log("  Admin:    admin@godelicious.com / Admin@123");
  console.log("  Staff:    staff@godelicious.com / Staff@123");
  console.log("  Customer: customer@godelicious.com / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
