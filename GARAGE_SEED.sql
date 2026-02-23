-- ============================================
-- SEED: COCHERAS Y VEHÍCULOS
-- Requiere que DATABASE_SEED.sql ya haya sido ejecutado.
-- ============================================

-- 1. COCHERAS
-- Subsuelo 1: 5 cocheras fijas asignadas a apartamentos
-- Planta baja: 2 de cortesía + 2 visitante
-- Subsuelo 2: 1 fija fuera de uso (sin asignar)

INSERT INTO "garages" (number, location, type, status, "apartmentId", "createdAt", "updatedAt")
VALUES
  -- Fijas asignadas
  ('C-01', 'Subsuelo 1', 'fija', 'activa',
   (SELECT id FROM "Apartment" WHERE unit = '101' LIMIT 1),
   NOW(), NOW()),

  ('C-02', 'Subsuelo 1', 'fija', 'activa',
   (SELECT id FROM "Apartment" WHERE unit = '201' LIMIT 1),
   NOW(), NOW()),

  ('C-03', 'Subsuelo 1', 'fija', 'activa',
   (SELECT id FROM "Apartment" WHERE unit = '102' LIMIT 1),
   NOW(), NOW()),

  ('C-04', 'Subsuelo 1', 'fija', 'activa',
   (SELECT id FROM "Apartment" WHERE unit = '301' LIMIT 1),
   NOW(), NOW()),

  ('C-05', 'Subsuelo 2', 'fija', 'activa',
   (SELECT id FROM "Apartment" WHERE unit = '202' LIMIT 1),
   NOW(), NOW()),

  -- Cortesía (sin apartamento asignado)
  ('C-06', 'Planta Baja', 'cortesia', 'activa',
   NULL,
   NOW(), NOW()),

  ('C-07', 'Planta Baja', 'cortesia', 'activa',
   NULL,
   NOW(), NOW()),

  -- Visitante (sin apartamento asignado)
  ('C-08', 'Planta Baja', 'visitante', 'activa',
   NULL,
   NOW(), NOW()),

  ('C-09', 'Planta Baja', 'visitante', 'activa',
   NULL,
   NOW(), NOW()),

  -- Fuera de uso
  ('C-10', 'Subsuelo 2', 'fija', 'fuera_de_uso',
   NULL,
   NOW(), NOW());


-- 2. VEHÍCULOS
-- Referencia a usuarios del seed principal
-- Cada tenant tiene al menos 1 vehículo con cochera asignada
-- María tiene un 2do vehículo sin cochera

INSERT INTO "vehicles" ("licensePlate", brand, model, color, "userId", "garageId", "createdAt", "updatedAt")
VALUES
  -- María González (tenant, apt 101) → cochera C-01
  ('ABC 123', 'Toyota', 'Corolla', 'Blanco',
   (SELECT id FROM "User" WHERE email = 'maria.gonzalez@gmail.com'),
   (SELECT id FROM "garages" WHERE number = 'C-01' LIMIT 1),
   NOW(), NOW()),

  -- María González → 2do auto sin cochera asignada
  ('DEF 456', 'Renault', 'Clio', 'Rojo',
   (SELECT id FROM "User" WHERE email = 'maria.gonzalez@gmail.com'),
   NULL,
   NOW(), NOW()),

  -- Ana Martínez (tenant, apt 201) → cochera C-02
  ('GHI 789', 'Ford', 'Focus', 'Gris',
   (SELECT id FROM "User" WHERE email = 'ana.martinez@gmail.com'),
   (SELECT id FROM "garages" WHERE number = 'C-02' LIMIT 1),
   NOW(), NOW()),

  -- Pedro López (tenant, apt 102) → cochera C-03
  ('JKL 012', 'Honda', 'Civic', 'Negro',
   (SELECT id FROM "User" WHERE email = 'pedro.lopez@gmail.com'),
   (SELECT id FROM "garages" WHERE number = 'C-03' LIMIT 1),
   NOW(), NOW()),

  -- Juan Pérez (tenant propietario) → cochera C-04 (asignada a apt 301 que es de Carlos)
  -- En este caso el propietario tiene un vehículo sin cochera asignada (visita)
  ('MNO 345', 'BMW', 'X3', 'Azul',
   (SELECT id FROM "User" WHERE email = 'juan.perez@gmail.com'),
   NULL,
   NOW(), NOW()),

  -- Carlos Rodríguez (tenant propietario) → cochera C-05 (asignada a apt 202 que es de Juan)
  ('PQR 678', 'Mercedes-Benz', 'C200', 'Plateado',
   (SELECT id FROM "User" WHERE email = 'carlos.rodriguez@gmail.com'),
   (SELECT id FROM "garages" WHERE number = 'C-05' LIMIT 1),
   NOW(), NOW());


-- ============================================
-- RESULTADO ESPERADO:
-- garages: 10 registros (5 fijas asignadas, 2 cortesía, 2 visitante, 1 fuera de uso)
-- vehicles: 6 registros (4 con cochera, 2 sin cochera)
-- ============================================
