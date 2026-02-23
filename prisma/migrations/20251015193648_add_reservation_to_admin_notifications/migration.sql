-- AlterTable
ALTER TABLE "public"."admin_notifications" ADD COLUMN     "reservationId" INTEGER,
ALTER COLUMN "claimId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "admin_notifications_reservationId_idx" ON "public"."admin_notifications"("reservationId");

-- AddForeignKey
ALTER TABLE "public"."admin_notifications" ADD CONSTRAINT "admin_notifications_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "public"."Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
