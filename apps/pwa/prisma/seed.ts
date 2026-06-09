import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "owner@anufashions.com" },
    update: {},
    create: { name: "Owner", email: "owner@anufashions.com", passwordHash: hash }
  });

  await prisma.businessSetting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", businessName: "Anu Fashions", defaultLang: "te" }
  });

  const silk = await prisma.category.upsert({
    where: { name: "Silk Sarees" },
    update: {},
    create: { name: "Silk Sarees", description: "Premium silk collection" }
  });

  const existingSupplier = await prisma.supplier.findFirst({ where: { phone: "9000000002" } });
  const supplier = existingSupplier
    ? await prisma.supplier.update({
        where: { id: existingSupplier.id },
        data: { name: "Kanchi Textiles", outstandingAmount: 25000 }
      })
    : await prisma.supplier.create({
        data: { name: "Kanchi Textiles", phone: "9000000002", outstandingAmount: 25000 }
      });

  await prisma.product.upsert({
    where: { productCode: "ANU-0001" },
    update: {
      name: "Premium Kanjivaram",
      categoryId: silk.id,
      supplierId: supplier.id,
      purchasePrice: 4000,
      sellingPrice: 6200,
      mrp: 7000,
      quantity: 15,
      stockStatus: "IN_STOCK"
    },
    create: {
      productCode: "ANU-0001",
      barcode: "890000001",
      name: "Premium Kanjivaram",
      categoryId: silk.id,
      supplierId: supplier.id,
      purchasePrice: 4000,
      sellingPrice: 6200,
      mrp: 7000,
      quantity: 15,
      imageUrls: [],
      stockStatus: "IN_STOCK"
    }
  });
}

main().finally(async () => prisma.$disconnect());
