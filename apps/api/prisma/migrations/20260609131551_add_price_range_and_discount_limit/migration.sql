-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "discountLimit" DOUBLE PRECISION,
ADD COLUMN     "priceRangeId" TEXT;

-- CreateTable
CREATE TABLE "PriceRange" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPrice" DECIMAL(12,2) NOT NULL,
    "maxPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceRange_name_key" ON "PriceRange"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceRangeId_fkey" FOREIGN KEY ("priceRangeId") REFERENCES "PriceRange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
