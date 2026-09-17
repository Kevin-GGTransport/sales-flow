-- 将配件的两个隐式状态收拢为单一类型。
CREATE TYPE "PartKind" AS ENUM ('OWNED', 'CONSIGNMENT', 'CUSTODY');

ALTER TABLE "Part" ADD COLUMN "kind" "PartKind" NOT NULL DEFAULT 'OWNED';
UPDATE "Part" SET "kind" = 'CONSIGNMENT' WHERE "isConsignment" = true;

-- 旧代保管档案转为普通 Part；货主信息放入备注，避免历史信息丢失。
INSERT INTO "Part" (
  "id", "partNumber", "name", "brand", "description", "kind",
  "minQty", "isActive", "createdAt", "updatedAt"
)
SELECT
  c."id",
  c."partNumber",
  c."partName",
  NULL,
  CASE
    WHEN c."note" IS NULL OR btrim(c."note") = '' THEN '原代保管货主：' || c."ownerName"
    ELSE '原代保管货主：' || c."ownerName" || E'\n' || c."note"
  END,
  'CUSTODY'::"PartKind",
  0,
  c."isActive",
  c."createdAt",
  c."updatedAt"
FROM "CustodyItem" c;

-- 现存数量转入统一 Inventory。
INSERT INTO "Inventory" ("id", "partId", "qty", "avgCost", "updatedAt")
SELECT 'custody_inv_' || c."id", c."id", c."qty", 0, c."updatedAt"
FROM "CustodyItem" c;

-- 历史出入流水转入统一 StockAdjustment。
INSERT INTO "StockAdjustment" (
  "id", "partId", "qty", "reason", "adjDate", "createdById", "createdAt"
)
SELECT
  'custody_adj_' || m."id",
  m."custodyItemId",
  m."qty",
  m."reason",
  m."moveDate",
  m."createdById",
  m."createdAt"
FROM "CustodyMovement" m;

DROP TABLE "CustodyMovement";
DROP TABLE "CustodyItem";

DROP INDEX "Part_isConsignment_idx";
ALTER TABLE "Part" DROP COLUMN "isConsignment";
CREATE INDEX "Part_kind_idx" ON "Part"("kind");
