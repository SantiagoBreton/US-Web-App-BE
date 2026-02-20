-- CreateTable
CREATE TABLE "public"."garages" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'fija',
    "status" TEXT NOT NULL DEFAULT 'activa',
    "apartmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicles" (
    "id" SERIAL NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "garageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "garages_apartmentId_idx" ON "public"."garages"("apartmentId");

-- CreateIndex
CREATE INDEX "garages_type_idx" ON "public"."garages"("type");

-- CreateIndex
CREATE INDEX "garages_status_idx" ON "public"."garages"("status");

-- CreateIndex
CREATE INDEX "vehicles_userId_idx" ON "public"."vehicles"("userId");

-- CreateIndex
CREATE INDEX "vehicles_garageId_idx" ON "public"."vehicles"("garageId");

-- CreateIndex
CREATE INDEX "vehicles_licensePlate_idx" ON "public"."vehicles"("licensePlate");

-- AddForeignKey
ALTER TABLE "public"."garages" ADD CONSTRAINT "garages_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "public"."Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicles" ADD CONSTRAINT "vehicles_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "public"."garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
