/*
  Warnings:

  - You are about to drop the column `reservationId` on the `amenity_ratings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,amenityId]` on the table `amenity_ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."amenity_ratings_reservationId_idx";

-- DropIndex
DROP INDEX "public"."amenity_ratings_userId_reservationId_key";

-- AlterTable
ALTER TABLE "public"."amenity_ratings" DROP COLUMN "reservationId";

-- CreateIndex
CREATE UNIQUE INDEX "amenity_ratings_userId_amenityId_key" ON "public"."amenity_ratings"("userId", "amenityId");
