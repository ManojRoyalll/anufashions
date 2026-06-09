import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@anufashions.com" },
    update: {},
    create: {
      name: "Store Owner",
      email: "admin@anufashions.com",
      passwordHash
    }
  });

  const categoryNames = [
    "Silk Sarees",
    "Cotton Sarees",
    "Banarasi Sarees",
    "Designer Sarees",
    "Wedding Sarees",
    "Lehengas",
    "Kurtis",
    "Dress Materials",
    "Blouses"
  ];

  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} collection`
      }
    });
  }

  const supplier = await prisma.supplier.upsert({
    where: { id: "supplier-seed-1" },
    update: {},
    create: {
      id: "supplier-seed-1",
      name: "Varanasi Weaves Pvt Ltd",
      phone: "9876543210",
      email: "supply@varanasiweaves.in",
      address: "Varanasi, Uttar Pradesh",
      productsSupplied: "Silk Sarees, Banarasi Sarees",
      outstandingPayments: 25000
    }
  });

  const silkCategory = await prisma.category.findFirst({ where: { name: "Silk Sarees" } });
  const designerCategory = await prisma.category.findFirst({ where: { name: "Designer Sarees" } });

  if (!silkCategory || !designerCategory) {
    throw new Error("Seed categories missing");
  }

  await prisma.product.upsert({
    where: { code: "ANU-SILK-001" },
    update: {},
    create: {
      code: "ANU-SILK-001",
      barcode: "890000000001",
      name: "Kanjivaram Gold Border Saree",
      categoryId: silkCategory.id,
      supplierId: supplier.id,
      purchasePrice: 3200,
      sellingPrice: 4999,
      mrp: 5499,
      color: "Maroon",
      size: "Free Size",
      material: "Pure Silk",
      quantity: 12,
      stockStatus: "IN_STOCK"
    }
  });

  await prisma.product.upsert({
    where: { code: "ANU-DES-004" },
    update: {},
    create: {
      code: "ANU-DES-004",
      barcode: "890000000004",
      name: "Designer Party Wear Saree",
      categoryId: designerCategory.id,
      supplierId: supplier.id,
      purchasePrice: 1800,
      sellingPrice: 2999,
      mrp: 3499,
      color: "Navy Blue",
      size: "Free Size",
      material: "Georgette",
      quantity: 7,
      stockStatus: "IN_STOCK"
    }
  });

  await prisma.customer.upsert({
    where: { phone: "9998887776" },
    update: {},
    create: {
      name: "Ananya Sharma",
      phone: "9998887776",
      address: "Bengaluru",
      favoriteCategories: "Silk Sarees"
    }
  });

  await prisma.businessMetric.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      totalInvestment: 120000,
      totalProfit: 15000,
      totalRevenue: 45000
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
