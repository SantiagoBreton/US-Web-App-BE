/*
  Warnings:

  - You are about to drop the column `category` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Reservation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Amenity" ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "openTime" TEXT;

-- AlterTable
ALTER TABLE "public"."Claim" DROP COLUMN "category",
DROP COLUMN "priority",
DROP COLUMN "status",
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Reservation" DROP COLUMN "status";

-- CreateTable
CREATE TABLE "public"."ClaimAdhesion" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "adhesionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimAdhesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimAdhesion_claimId_idx" ON "public"."ClaimAdhesion"("claimId");

-- CreateIndex
CREATE INDEX "ClaimAdhesion_userId_idx" ON "public"."ClaimAdhesion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimAdhesion_claimId_userId_key" ON "public"."ClaimAdhesion"("claimId", "userId");

-- AddForeignKey
ALTER TABLE "public"."ClaimAdhesion" ADD CONSTRAINT "ClaimAdhesion_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClaimAdhesion" ADD CONSTRAINT "ClaimAdhesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
