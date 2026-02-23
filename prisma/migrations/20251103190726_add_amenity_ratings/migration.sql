-- CreateTable
CREATE TABLE "public"."amenity_ratings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "cleanliness" INTEGER,
    "equipment" INTEGER,
    "comfort" INTEGER,
    "compliance" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenity_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "amenity_ratings_amenityId_idx" ON "public"."amenity_ratings"("amenityId");

-- CreateIndex
CREATE INDEX "amenity_ratings_userId_idx" ON "public"."amenity_ratings"("userId");

-- CreateIndex
CREATE INDEX "amenity_ratings_reservationId_idx" ON "public"."amenity_ratings"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "amenity_ratings_userId_reservationId_key" ON "public"."amenity_ratings"("userId", "reservationId");

-- AddForeignKey
ALTER TABLE "public"."amenity_ratings" ADD CONSTRAINT "amenity_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."amenity_ratings" ADD CONSTRAINT "amenity_ratings_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "public"."Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
