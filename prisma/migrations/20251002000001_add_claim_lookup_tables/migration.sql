-- CreateTable for ClaimCategory
CREATE TABLE "claim_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,

    CONSTRAINT "claim_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable for ClaimPriority
CREATE TABLE "claim_priorities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "color" TEXT,

    CONSTRAINT "claim_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable for ClaimStatus
CREATE TABLE "claim_statuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "claim_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "claim_categories_name_key" ON "claim_categories"("name");
CREATE UNIQUE INDEX "claim_priorities_name_key" ON "claim_priorities"("name");
CREATE UNIQUE INDEX "claim_statuses_name_key" ON "claim_statuses"("name");

-- Insert default categories
INSERT INTO "claim_categories" ("name", "label", "icon", "color") VALUES 
    ('ascensor', 'Ascensor', 'wrench', 'purple'),
    ('plomeria', 'Plomería', 'droplets', 'blue'),
    ('electricidad', 'Eléctrico', 'zap', 'yellow'),
    ('temperatura', 'Calefacción/Aire', 'wind', 'green'),
    ('areas_comunes', 'Áreas Comunes', 'users', 'indigo'),
    ('edificio', 'Edificio', 'building', 'gray'),
    ('otro', 'Otros', 'alert-triangle', 'orange');

-- Insert default priorities
INSERT INTO "claim_priorities" ("name", "label", "level", "color") VALUES 
    ('baja', 'Baja', 1, 'bg-blue-50 text-blue-700 border-blue-200'),
    ('media', 'Media', 2, 'bg-yellow-50 text-yellow-700 border-yellow-200'),
    ('alta', 'Alta', 3, 'bg-orange-50 text-orange-700 border-orange-200'),
    ('urgente', 'Urgente', 4, 'bg-red-50 text-red-700 border-red-200');

-- Insert default statuses
INSERT INTO "claim_statuses" ("name", "label", "color") VALUES 
    ('pendiente', 'Pendiente', 'bg-yellow-50 text-yellow-700'),
    ('en_progreso', 'En Progreso', 'bg-blue-50 text-blue-700'),
    ('resuelto', 'Resuelto', 'bg-green-50 text-green-700'),
    ('rechazado', 'Rechazado', 'bg-red-50 text-red-700');

-- Add new columns to Claim table
ALTER TABLE "Claim" ADD COLUMN "categoryId" INTEGER;
ALTER TABLE "Claim" ADD COLUMN "priorityId" INTEGER;
ALTER TABLE "Claim" ADD COLUMN "statusId" INTEGER;

-- Create indexes on new columns
CREATE INDEX "Claim_categoryId_idx" ON "Claim"("categoryId");
CREATE INDEX "Claim_priorityId_idx" ON "Claim"("priorityId");
CREATE INDEX "Claim_statusId_idx" ON "Claim"("statusId");

-- Update existing claims to use lookup table IDs

-- Category mapping
UPDATE "Claim" SET "categoryId" = 1 WHERE "category" = 'ascensor';
UPDATE "Claim" SET "categoryId" = 2 WHERE "category" = 'plomeria';
UPDATE "Claim" SET "categoryId" = 3 WHERE "category" = 'electricidad';
UPDATE "Claim" SET "categoryId" = 4 WHERE "category" = 'temperatura';
UPDATE "Claim" SET "categoryId" = 5 WHERE "category" = 'areas_comunes';
UPDATE "Claim" SET "categoryId" = 6 WHERE "category" = 'edificio';
UPDATE "Claim" SET "categoryId" = 7 WHERE "category" = 'otro';

-- Priority mapping
UPDATE "Claim" SET "priorityId" = 1 WHERE "priority" = 'baja';
UPDATE "Claim" SET "priorityId" = 2 WHERE "priority" = 'media';
UPDATE "Claim" SET "priorityId" = 3 WHERE "priority" = 'alta';
UPDATE "Claim" SET "priorityId" = 4 WHERE "priority" = 'urgente';

-- Status mapping
UPDATE "Claim" SET "statusId" = 1 WHERE "status" = 'pendiente';
UPDATE "Claim" SET "statusId" = 2 WHERE "status" = 'en_progreso';
UPDATE "Claim" SET "statusId" = 3 WHERE "status" = 'resuelto';
UPDATE "Claim" SET "statusId" = 4 WHERE "status" = 'rechazado';

-- Set default values and make columns NOT NULL
ALTER TABLE "Claim" ALTER COLUMN "categoryId" SET DEFAULT 7;
ALTER TABLE "Claim" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Claim" ALTER COLUMN "priorityId" SET DEFAULT 2;
ALTER TABLE "Claim" ALTER COLUMN "priorityId" SET NOT NULL;
ALTER TABLE "Claim" ALTER COLUMN "statusId" SET DEFAULT 1;
ALTER TABLE "Claim" ALTER COLUMN "statusId" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "claim_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES "claim_priorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "claim_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old indexes
DROP INDEX IF EXISTS "Claim_status_idx";

-- Keep old columns for now for backward compatibility
-- ALTER TABLE "Claim" DROP COLUMN "category";
-- ALTER TABLE "Claim" DROP COLUMN "priority";
-- ALTER TABLE "Claim" DROP COLUMN "status";