-- DropForeignKey
ALTER TABLE "public"."Apartment" DROP CONSTRAINT "Apartment_ownerId_fkey";

-- AlterTable
ALTER TABLE "public"."Apartment" ALTER COLUMN "ownerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Apartment" ADD CONSTRAINT "Apartment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
