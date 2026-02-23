-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "projectFlowTaskId" TEXT;

-- CreateIndex
CREATE INDEX "Claim_projectFlowTaskId_idx" ON "Claim"("projectFlowTaskId");
