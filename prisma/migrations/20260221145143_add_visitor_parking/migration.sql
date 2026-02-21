-- CreateTable
CREATE TABLE "public"."visitor_parkings" (
    "id" SERIAL NOT NULL,
    "garageId" INTEGER NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "visitorName" TEXT,
    "licensePlate" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_parkings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_parkings_garageId_idx" ON "public"."visitor_parkings"("garageId");

-- CreateIndex
CREATE INDEX "visitor_parkings_apartmentId_idx" ON "public"."visitor_parkings"("apartmentId");

-- CreateIndex
CREATE INDEX "visitor_parkings_requestedById_idx" ON "public"."visitor_parkings"("requestedById");

-- CreateIndex
CREATE INDEX "visitor_parkings_status_idx" ON "public"."visitor_parkings"("status");

-- AddForeignKey
ALTER TABLE "public"."visitor_parkings" ADD CONSTRAINT "visitor_parkings_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "public"."garages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visitor_parkings" ADD CONSTRAINT "visitor_parkings_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "public"."Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."visitor_parkings" ADD CONSTRAINT "visitor_parkings_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
