-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "invoiceBillAmount" DECIMAL(12,2),
ADD COLUMN     "transportCost" DECIMAL(12,2) NOT NULL DEFAULT 0;
