ALTER TABLE "public"."ClaimAdhesion" DROP COLUMN IF EXISTS "adhesionType";
ALTER TABLE "public"."ClaimAdhesion" ADD COLUMN IF NOT EXISTS "isSupport" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "public"."admin_notification_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "admin_notification_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."user_notification_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "user_notification_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_notification_types_name_key" ON "public"."admin_notification_types"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_types_name_key" ON "public"."user_notification_types"("name");

INSERT INTO "public"."admin_notification_types" ("name", "label") VALUES
    ('nuevo_reclamo', 'Nuevo Reclamo'),
    ('reclamo_urgente', 'Reclamo Urgente'),
    ('reserva_pendiente', 'Reserva Pendiente')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "public"."user_notification_types" ("name", "label") VALUES
    ('reservation_confirmed', 'Reserva Confirmada'),
    ('reservation_cancelled', 'Reserva Cancelada'),
    ('reservation_modified', 'Reserva Modificada'),
    ('pending_reservation', 'Reserva Pendiente')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE "public"."admin_notifications" ADD COLUMN IF NOT EXISTS "typeId" INTEGER;
ALTER TABLE "public"."user_notifications" ADD COLUMN IF NOT EXISTS "typeId" INTEGER;

UPDATE "public"."admin_notifications" 
SET "typeId" = (
    SELECT id FROM "public"."admin_notification_types" 
    WHERE name = "admin_notifications"."notificationType"
)
WHERE "typeId" IS NULL;

UPDATE "public"."user_notifications" 
SET "typeId" = (
    SELECT id FROM "public"."user_notification_types" 
    WHERE name = "user_notifications"."notificationType"
)
WHERE "typeId" IS NULL;

UPDATE "public"."admin_notifications" 
SET "typeId" = (SELECT MIN(id) FROM "public"."admin_notification_types")
WHERE "typeId" IS NULL;

UPDATE "public"."user_notifications" 
SET "typeId" = (SELECT MIN(id) FROM "public"."user_notification_types")
WHERE "typeId" IS NULL;

ALTER TABLE "public"."admin_notifications" ALTER COLUMN "typeId" SET NOT NULL;
ALTER TABLE "public"."user_notifications" ALTER COLUMN "typeId" SET NOT NULL;

ALTER TABLE "public"."admin_notifications" DROP COLUMN IF EXISTS "notificationType";
ALTER TABLE "public"."user_notifications" DROP COLUMN IF EXISTS "notificationType";

CREATE INDEX IF NOT EXISTS "admin_notifications_typeId_idx" ON "public"."admin_notifications"("typeId");
CREATE INDEX IF NOT EXISTS "user_notifications_typeId_idx" ON "public"."user_notifications"("typeId");
ALTER TABLE "public"."admin_notifications" 
ADD CONSTRAINT "admin_notifications_typeId_fkey" 
FOREIGN KEY ("typeId") REFERENCES "public"."admin_notification_types"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."user_notifications" 
ADD CONSTRAINT "user_notifications_typeId_fkey" 
FOREIGN KEY ("typeId") REFERENCES "public"."user_notification_types"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;
