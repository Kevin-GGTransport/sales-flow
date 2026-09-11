-- CreateTable
CREATE TABLE "CustodyItem" (
    "id" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "note" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustodyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyMovement" (
    "id" TEXT NOT NULL,
    "custodyItemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT,
    "moveDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustodyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustodyItem_ownerName_idx" ON "CustodyItem"("ownerName");

-- CreateIndex
CREATE UNIQUE INDEX "CustodyItem_ownerName_partNumber_key" ON "CustodyItem"("ownerName", "partNumber");

-- CreateIndex
CREATE INDEX "CustodyMovement_custodyItemId_idx" ON "CustodyMovement"("custodyItemId");

-- CreateIndex
CREATE INDEX "CustodyMovement_moveDate_idx" ON "CustodyMovement"("moveDate");

-- AddForeignKey
ALTER TABLE "CustodyMovement" ADD CONSTRAINT "CustodyMovement_custodyItemId_fkey" FOREIGN KEY ("custodyItemId") REFERENCES "CustodyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyMovement" ADD CONSTRAINT "CustodyMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
