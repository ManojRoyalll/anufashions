import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productCode: z.string().min(3),
  name: z.string().min(2),
  categoryId: z.string(),
  purchasePrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  quantity: z.number().int().nonnegative()
});

export async function GET() {
  return NextResponse.json(await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }));
}

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const product = await prisma.product.create({
    data: {
      ...body,
      imageUrls: [],
      stockStatus: body.quantity <= 0 ? "OUT_OF_STOCK" : body.quantity <= 5 ? "LOW_STOCK" : "IN_STOCK"
    }
  });
  return NextResponse.json(product, { status: 201 });
}
