/*
  Warnings:

  - Added the required column `maxDuration` to the `Amenity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Amenity" ADD COLUMN     "maxDuration" INTEGER NOT NULL;
