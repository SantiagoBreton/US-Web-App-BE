-- CreateTable
CREATE TABLE "public"."garage_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentGarageId" INTEGER,
    "requestedGarageId" INTEGER,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "garage_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "garage_requests_userId_idx" ON "public"."garage_requests"("userId");

-- CreateIndex
CREATE INDEX "garage_requests_status_idx" ON "public"."garage_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."garage_requests" ADD CONSTRAINT "garage_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garage_requests" ADD CONSTRAINT "garage_requests_currentGarageId_fkey" FOREIGN KEY ("currentGarageId") REFERENCES "public"."garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."garage_requests" ADD CONSTRAINT "garage_requests_requestedGarageId_fkey" FOREIGN KEY ("requestedGarageId") REFERENCES "public"."garages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
