-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN "paymentMethod" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_idx" ON "PurchaseOrder"("createdAt");

-- CreateIndex
CREATE INDEX "SaleOrder_createdAt_idx" ON "SaleOrder"("createdAt");
