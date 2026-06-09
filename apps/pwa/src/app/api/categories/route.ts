import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().min(2), description: z.string().optional() });

export async function GET() {
  return NextResponse.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  return NextResponse.json(await prisma.category.create({ data: body }), { status: 201 });
}
