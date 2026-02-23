-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'tenant';
