-- CreateTable
CREATE TABLE "public"."admin_notifications" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "claimId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notifications_adminId_idx" ON "public"."admin_notifications"("adminId");

-- CreateIndex
CREATE INDEX "admin_notifications_claimId_idx" ON "public"."admin_notifications"("claimId");

-- CreateIndex
CREATE INDEX "admin_notifications_isRead_idx" ON "public"."admin_notifications"("isRead");

-- CreateIndex
CREATE INDEX "admin_notifications_adminId_isRead_idx" ON "public"."admin_notifications"("adminId", "isRead");

-- AddForeignKey
ALTER TABLE "public"."admin_notifications" ADD CONSTRAINT "admin_notifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_notifications" ADD CONSTRAINT "admin_notifications_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "public"."Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
