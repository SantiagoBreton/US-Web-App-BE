-- CreateTable
CREATE TABLE "public"."cortesia_reservations" (
    "id" SERIAL NOT NULL,
    "garageId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "personName" TEXT NOT NULL,
    "licensePlate" TEXT,
    "reason" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cortesia_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cortesia_reservations_garageId_idx" ON "public"."cortesia_reservations"("garageId");

-- CreateIndex
CREATE INDEX "cortesia_reservations_createdById_idx" ON "public"."cortesia_reservations"("createdById");

-- CreateIndex
CREATE INDEX "cortesia_reservations_status_idx" ON "public"."cortesia_reservations"("status");

-- AddForeignKey
ALTER TABLE "public"."cortesia_reservations" ADD CONSTRAINT "cortesia_reservations_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "public"."garages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cortesia_reservations" ADD CONSTRAINT "cortesia_reservations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
