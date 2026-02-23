-- ============================================
-- SCRIPT DE POBLACIÓN DE BASE DE DATOS
-- ============================================
-- Contraseña para todos los usuarios: 12345A
-- Hash bcrypt: $2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.
-- ============================================

-- 1. ESTADOS DE RESERVA (DEBE IR PRIMERO)
INSERT INTO "reservation_statuses" (name, label) VALUES
  ('pendiente', 'Pendiente'),
  ('confirmada', 'Confirmada'),
  ('cancelada', 'Cancelada'),
  ('finalizada', 'Finalizada')
ON CONFLICT (name) DO NOTHING;

-- 2. CATEGORÍAS DE CLAIMS
INSERT INTO "claim_categories" (name, label, icon, color) VALUES
  ('ascensor', 'Ascensor', 'elevator', '#FF6B6B'),
  ('plomeria', 'Plomería', 'plumbing', '#4ECDC4'),
  ('electricidad', 'Electricidad', 'electric_bolt', '#FFE66D'),
  ('temperatura', 'Temperatura/Clima', 'thermostat', '#95E1D3'),
  ('areas_comunes', 'Áreas Comunes', 'apartment', '#A8DADC'),
  ('edificio', 'Edificio/Estructura', 'domain', '#457B9D'),
  ('otro', 'Otro', 'help_outline', '#6C757D')
ON CONFLICT (name) DO NOTHING;

-- 3. PRIORIDADES DE CLAIMS
INSERT INTO "claim_priorities" (name, label, level, color) VALUES
  ('baja', 'Baja', 1, '#28A745'),
  ('media', 'Media', 2, '#FFC107'),
  ('alta', 'Alta', 3, '#FD7E14'),
  ('urgente', 'Urgente', 4, '#DC3545')
ON CONFLICT (name) DO NOTHING;

-- 4. ESTADOS DE CLAIMS
INSERT INTO "claim_statuses" (name, label, color) VALUES
  ('pendiente', 'Pendiente', '#6C757D'),
  ('en_progreso', 'En Progreso', '#0D6EFD'),
  ('resuelto', 'Resuelto', '#28A745'),
  ('rechazado', 'Rechazado', '#DC3545')
ON CONFLICT (name) DO NOTHING;

-- 5. TIPOS DE NOTIFICACIONES DE ADMIN
INSERT INTO "admin_notification_types" (name, label) VALUES
  ('nuevo_reclamo', 'Nuevo Reclamo'),
  ('reclamo_urgente', 'Reclamo Urgente'),
  ('reserva_pendiente', 'Reserva Pendiente de Aprobación')
ON CONFLICT (name) DO NOTHING;

-- 6. TIPOS DE NOTIFICACIONES DE USUARIO
INSERT INTO "user_notification_types" (name, label) VALUES
  ('reserva_confirmada', 'Reserva Confirmada'),
  ('reserva_cancelada', 'Reserva Cancelada'),
  ('reserva_modificada', 'Reserva Modificada'),
  ('reserva_rechazada', 'Reserva Rechazada'),
  ('reserva_pendiente', 'Reserva Pendiente de Aprobación')
ON CONFLICT (name) DO NOTHING;

-- 5. TIPOS DE NOTIFICACIONES DE ADMIN
INSERT INTO "admin_notification_types" (name, label) VALUES
  ('nuevo_reclamo', 'Nuevo Reclamo'),
  ('reclamo_urgente', 'Reclamo Urgente'),
  ('reserva_pendiente', 'Reserva Pendiente de Aprobación')
ON CONFLICT (name) DO NOTHING;

-- 6. TIPOS DE NOTIFICACIONES DE USUARIO
INSERT INTO "user_notification_types" (name, label) VALUES
  ('reserva_confirmada', 'Reserva Confirmada'),
  ('reserva_cancelada', 'Reserva Cancelada'),
  ('reserva_modificada', 'Reserva Modificada'),
  ('reserva_rechazada', 'Reserva Rechazada'),
  ('reserva_pendiente', 'Reserva Pendiente de Aprobación')
ON CONFLICT (name) DO NOTHING;

-- 7. USUARIOS (Admin y Propietarios primero, sin apartmentId)
-- Nota: Ya no existe el rol 'owner', todos los propietarios son 'tenant'
-- Admin (password: 12345A)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Administrador Principal',
  'admin@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'admin',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Propietario 1 (tenant que posee departamento)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Juan Pérez',
  'juan.perez@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Propietario 2 (tenant que posee departamento)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Carlos Rodríguez',
  'carlos.rodriguez@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 8. APARTAMENTOS (después de propietarios, antes de inquilinos)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES
  ('101', 1, 65.5, 'Apartamento luminoso con vista al parque', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@gmail.com')),
  ('201', 2, 75.0, 'Apartamento esquinero, excelente ventilación', 3, 
   (SELECT id FROM "User" WHERE email = 'carlos.rodriguez@gmail.com')),
  ('102', 1, 60.0, 'Apartamento cerca del ascensor', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@gmail.com')),
  ('301', 3, 85.5, 'Apartamento con terraza privada', 3, 
   (SELECT id FROM "User" WHERE email = 'carlos.rodriguez@gmail.com')),
  ('202', 2, 70.0, 'Vista panorámica', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@gmail.com'));

-- 9. TENANTS (después de apartamentos)
INSERT INTO "User" (name, email, password, role, "apartmentId", "createdAt") 
VALUES (
  'María González',
  'maria.gonzalez@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '101' LIMIT 1),
  NOW()
),
(
  'Ana Martínez',
  'ana.martinez@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '201' LIMIT 1),
  NOW()
),
(
  'Pedro López',
  'pedro.lopez@gmail.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '102' LIMIT 1),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 10. AMENITIES
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES
  ('Gimnasio', 10, 120, '06:00', '22:00', true, false),
  ('Piscina', 15, 180, '08:00', '20:00', true, false),
  ('Salón de Eventos', 50, 480, '10:00', '23:00', true, true),
  ('Cancha de Tenis', 4, 90, '07:00', '21:00', true, false),
  ('Sala de Juegos', 8, 120, '09:00', '20:00', true, false),
  ('Parrilla', 20, 360, '11:00', '23:00', true, true),
  ('Sala de Cine', 12, 180, '14:00', '23:00', true, false),
  ('Espacio Coworking', 6, 480, '08:00', '20:00', true, false);

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- CLAIMS DE EJEMPLO
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Ascensor principal fuera de servicio',
  1,
  'El ascensor principal lleva 3 días sin funcionar. Los vecinos del piso 10 tienen dificultades para subir con las compras.',
  'Lobby principal',
  4,
  1,
  (SELECT id FROM "User" WHERE email = 'maria.gonzalez@gmail.com'),
  false,
  NOW(),
  NOW()
),
(
  'Pérdida de agua en el estacionamiento',
  2,
  'Hay una importante pérdida de agua en el sector B del estacionamiento subterráneo. El agua está acumulándose.',
  'Estacionamiento subterráneo - Sector B',
  3,
  2,
  (SELECT id FROM "User" WHERE email = 'ana.martinez@gmail.com'),
  false,
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  'Luces del pasillo piso 2 no funcionan',
  3,
  'Varias luces del pasillo del segundo piso están sin funcionar hace una semana.',
  'Pasillo piso 2',
  2,
  1,
  (SELECT id FROM "User" WHERE email = 'pedro.lopez@gmail.com'),
  false,
  NOW() - INTERVAL '7 days',
  NOW()
);

-- ADHESIONES A CLAIMS (ahora usa isSupport en lugar de adhesionType)
INSERT INTO "ClaimAdhesion" ("claimId", "userId", "isSupport", "createdAt", "updatedAt") VALUES
  (1, (SELECT id FROM "User" WHERE email = 'ana.martinez@gmail.com'), true, NOW(), NOW()),
  (1, (SELECT id FROM "User" WHERE email = 'pedro.lopez@gmail.com'), true, NOW(), NOW()),
  (2, (SELECT id FROM "User" WHERE email = 'maria.gonzalez@gmail.com'), true, NOW(), NOW());

-- RESERVAS DE EJEMPLO
INSERT INTO "Reservation" ("userId", "amenityId", "startTime", "endTime", "statusId", "hiddenFromUser", "createdAt") 
VALUES (
  (SELECT id FROM "User" WHERE email = 'maria.gonzalez@gmail.com'),
  (SELECT id FROM "Amenity" WHERE name = 'Gimnasio'),
  (CURRENT_DATE + INTERVAL '1 day' + TIME '07:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00:00')::timestamp,
  2,
  false,
  NOW()
),
(
  (SELECT id FROM "User" WHERE email = 'ana.martinez@gmail.com'),
  (SELECT id FROM "Amenity" WHERE name = 'Piscina'),
  (CURRENT_DATE + INTERVAL '5 days' + TIME '10:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '5 days' + TIME '12:00:00')::timestamp,
  2,
  false,
  NOW()
),
(
  (SELECT id FROM "User" WHERE email = 'pedro.lopez@gmail.com'),
  (SELECT id FROM "Amenity" WHERE name = 'Salón de Eventos'),
  (CURRENT_DATE + INTERVAL '30 days' + TIME '18:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '30 days' + TIME '23:00:00')::timestamp,
  1,
  false,
  NOW()
);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- CREDENCIALES:
-- admin@edificio.com / 12345A (Admin)
-- juan.perez@email.com / 12345A (Tenant - Propietario)
-- carlos.rodriguez@email.com / 12345A (Tenant - Propietario)
-- maria.gonzalez@email.com / 12345A (Tenant)
-- ana.martinez@email.com / 12345A (Tenant)
-- pedro.lopez@email.com / 12345A (Tenant)
-- ============================================
