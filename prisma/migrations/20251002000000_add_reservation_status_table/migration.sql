-- CreateTable
CREATE TABLE "reservation_statuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "reservation_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservation_statuses_name_key" ON "reservation_statuses"("name");

-- Insert default statuses
INSERT INTO "reservation_statuses" ("name", "label") VALUES 
    ('pendiente', 'Pendiente'),
    ('confirmada', 'Confirmada'),
    ('cancelada', 'Cancelada'),
    ('finalizada', 'Finalizada');

-- Add statusId column to reservations table
ALTER TABLE "Reservation" ADD COLUMN "statusId" INTEGER;

-- Create index on statusId
CREATE INDEX "Reservation_statusId_idx" ON "Reservation"("statusId");

-- Update existing reservations to use status IDs
UPDATE "Reservation" SET "statusId" = 1 WHERE "status" = 'pendiente';
UPDATE "Reservation" SET "statusId" = 2 WHERE "status" = 'confirmada';
UPDATE "Reservation" SET "statusId" = 3 WHERE "status" = 'cancelada';
UPDATE "Reservation" SET "statusId" = 4 WHERE "status" = 'finalizada';

-- Set default value for statusId
ALTER TABLE "Reservation" ALTER COLUMN "statusId" SET DEFAULT 1;
ALTER TABLE "Reservation" ALTER COLUMN "statusId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "reservation_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old status column (optional - you might want to keep it temporarily)
-- ALTER TABLE "Reservation" DROP COLUMN "status";