# 🗄️ Database Seed - SQL Commands

Este archivo contiene todos los comandos SQL necesarios para poblar tu base de datos PostgreSQL con datos iniciales funcionales.

> **⚠️ IMPORTANTE - Actualización de Roles:** Ya no existe el rol `owner`. El sistema ahora solo maneja dos roles: `tenant` y `admin`. 
> Los propietarios de departamentos son usuarios con rol `tenant` que tienen departamentos asignados como `ownerId`.

## 📋 Índice

1. [Usuarios (Admin, Tenants)](#1-usuarios)
2. [Apartamentos](#2-apartamentos)
3. [Amenities](#3-amenities)
4. [Estados de Reserva](#4-estados-de-reserva)
5. [Categorías de Claims](#5-categorías-de-claims)
6. [Prioridades de Claims](#6-prioridades-de-claims)
7. [Estados de Claims](#7-estados-de-claims)
8. [Datos de Ejemplo (Opcional)](#8-datos-de-ejemplo-opcional)

---

## 🚀 Cómo usar este archivo

### Opción 1: Ejecutar todo de una vez
```bash
# Conectarse a PostgreSQL y ejecutar todo el archivo
psql -U your_username -d your_database_name -f DATABASE_SEED.sql
```

### Opción 2: Copiar y pegar en tu cliente SQL
Puedes copiar las secciones que necesites y ejecutarlas en tu cliente SQL favorito (pgAdmin, DBeaver, etc.)

### Opción 3: Usar Prisma Studio
Puedes insertar estos datos manualmente usando Prisma Studio:
```bash
npx prisma studio
```

---

## 📝 Comandos SQL

### 1. Usuarios

#### 1.1 Usuario Administrador
```sql
-- Password: Admin123! (ya hasheado con bcrypt, salt rounds: 10)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Administrador Principal',
  'admin@edificio.com',
  '$2b$10$YourHashedPasswordHere',
  'admin',
  NOW()
);
```

**⚠️ IMPORTANTE:** Hash pre-generado para la contraseña `12345A`:
```sql
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Administrador Principal',
  'admin@edificio.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'admin',
  NOW()
);
```

#### 1.2 Usuario Propietario (Tenant con Departamento)

**Nota:** Ya no existe el rol 'owner'. Los propietarios de departamentos son usuarios con rol 'tenant'.

```sql
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Juan Pérez',
  'juan.perez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  NOW()
);
```

#### 1.3 Usuario Inquilino (Tenant)
```sql
INSERT INTO "User" (name, email, password, role, "apartmentId", "createdAt") 
VALUES (
  'María González',
  'maria.gonzalez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  1, -- ID del apartamento (ajustar según tu caso)
  NOW()
);
```

#### 1.4 Más usuarios de ejemplo
```sql
-- Propietario 2 (tenant con departamento)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Carlos Rodríguez',
  'carlos.rodriguez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  NOW()
);

-- Inquilino 2
INSERT INTO "User" (name, email, password, role, "apartmentId", "createdAt") 
VALUES (
  'Ana Martínez',
  'ana.martinez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  2,
  NOW()
);

-- Inquilino 3
INSERT INTO "User" (name, email, password, role, "apartmentId", "createdAt") 
VALUES (
  'Pedro López',
  'pedro.lopez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  3,
  NOW()
);
```

**📌 Nota:** Todos usan la contraseña `12345A` para facilitar las pruebas.

---

### 2. Apartamentos

```sql
-- Apartamento 1 (Propietario: Juan Pérez, ID: 2)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES (
  '101',
  1,
  65.5,
  'Apartamento luminoso con vista al parque',
  2,
  2
);

-- Apartamento 2 (Propietario: Carlos Rodríguez, ID: 4)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES (
  '201',
  2,
  75.0,
  'Apartamento esquinero, excelente ventilación',
  3,
  4
);

-- Apartamento 3 (Propietario: Juan Pérez, ID: 2)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES (
  '102',
  1,
  60.0,
  'Apartamento cerca del ascensor',
  2,
  2
);

-- Apartamento 4 (Sin inquilino asignado aún)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES (
  '301',
  3,
  85.5,
  'Apartamento con terraza privada',
  3,
  4
);

-- Apartamento 5
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES (
  '202',
  2,
  70.0,
  'Vista panorámica',
  2,
  2
);
```

---

### 3. Amenities

```sql
-- Gimnasio
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Gimnasio',
  10,
  120,
  '06:00',
  '22:00',
  true,
  false
);

-- Piscina
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Piscina',
  15,
  180,
  '08:00',
  '20:00',
  true,
  false
);

-- Salón de Eventos
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Salón de Eventos',
  50,
  480,
  '10:00',
  '23:00',
  true,
  true
);

-- Cancha de Tenis
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Cancha de Tenis',
  4,
  90,
  '07:00',
  '21:00',
  true,
  false
);

-- Sala de Juegos
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Sala de Juegos',
  8,
  120,
  '09:00',
  '20:00',
  true,
  false
);

-- Parrilla/Quincho
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Parrilla',
  20,
  360,
  '11:00',
  '23:00',
  true,
  true
);

-- Sala de Cine
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Sala de Cine',
  12,
  180,
  '14:00',
  '23:00',
  true,
  false
);

-- Coworking
INSERT INTO "Amenity" (name, capacity, "maxDuration", "openTime", "closeTime", "isActive", "requiresApproval") 
VALUES (
  'Espacio Coworking',
  6,
  480,
  '08:00',
  '20:00',
  true,
  false
);
```

---

### 4. Estados de Reserva

```sql
INSERT INTO "reservation_statuses" (name, label) VALUES
  ('pendiente', 'Pendiente'),
  ('confirmada', 'Confirmada'),
  ('cancelada', 'Cancelada'),
  ('finalizada', 'Finalizada');
```

---

### 5. Categorías de Claims

```sql
INSERT INTO "claim_categories" (name, label, icon, color) VALUES
  ('ascensor', 'Ascensor', 'elevator', '#FF6B6B'),
  ('plomeria', 'Plomería', 'plumbing', '#4ECDC4'),
  ('electricidad', 'Electricidad', 'electric_bolt', '#FFE66D'),
  ('temperatura', 'Temperatura/Clima', 'thermostat', '#95E1D3'),
  ('areas_comunes', 'Áreas Comunes', 'apartment', '#A8DADC'),
  ('edificio', 'Edificio/Estructura', 'domain', '#457B9D'),
  ('otro', 'Otro', 'help_outline', '#6C757D');
```

---

### 6. Prioridades de Claims

```sql
INSERT INTO "claim_priorities" (name, label, level, color) VALUES
  ('baja', 'Baja', 1, '#28A745'),
  ('media', 'Media', 2, '#FFC107'),
  ('alta', 'Alta', 3, '#FD7E14'),
  ('urgente', 'Urgente', 4, '#DC3545');
```

---

### 7. Estados de Claims

```sql
INSERT INTO "claim_statuses" (name, label, color) VALUES
  ('pendiente', 'Pendiente', '#6C757D'),
  ('en_progreso', 'En Progreso', '#0D6EFD'),
  ('resuelto', 'Resuelto', '#28A745'),
  ('rechazado', 'Rechazado', '#DC3545');
```

---

### 8. Datos de Ejemplo (Opcional)

#### 8.1 Claims de Ejemplo

```sql
-- Claim 1: Ascensor no funciona (Urgente)
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Ascensor principal fuera de servicio',
  1, -- Ascensor
  'El ascensor principal lleva 3 días sin funcionar. Los vecinos del piso 10 tienen dificultades para subir con las compras.',
  'Lobby principal',
  4, -- Urgente
  1, -- Pendiente
  3, -- María González
  false,
  NOW(),
  NOW()
);

-- Claim 2: Pérdida de agua (Alta)
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Pérdida de agua en el estacionamiento',
  2, -- Plomería
  'Hay una importante pérdida de agua en el sector B del estacionamiento subterráneo. El agua está acumulándose.',
  'Estacionamiento subterráneo - Sector B',
  3, -- Alta
  2, -- En progreso
  5, -- Ana Martínez
  false,
  NOW() - INTERVAL '2 days',
  NOW()
);

-- Claim 3: Luz de pasillo (Media)
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Luces del pasillo piso 2 no funcionan',
  3, -- Electricidad
  'Varias luces del pasillo del segundo piso están sin funcionar hace una semana.',
  'Pasillo piso 2',
  2, -- Media
  1, -- Pendiente
  6, -- Pedro López
  false,
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Claim 4: Temperatura piscina (Baja)
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Temperatura del agua de la piscina muy baja',
  4, -- Temperatura
  'El agua de la piscina está muy fría. Sería bueno revisar el sistema de calefacción.',
  'Piscina',
  1, -- Baja
  1, -- Pendiente
  3, -- María González
  false,
  NOW() - INTERVAL '5 days',
  NOW()
);

-- Claim 5: Limpieza (Media) - Anónimo
INSERT INTO "Claim" (subject, "categoryId", description, location, "priorityId", "statusId", "userId", "isAnonymous", "createdAt", "updatedAt") 
VALUES (
  'Falta de limpieza en áreas comunes',
  5, -- Áreas comunes
  'El salón de eventos no está siendo limpiado adecuadamente después de los eventos.',
  'Salón de eventos',
  2, -- Media
  1, -- Pendiente
  5, -- Ana Martínez
  true, -- Anónimo
  NOW() - INTERVAL '1 day',
  NOW()
);
```

#### 8.2 Adhesiones a Claims

```sql
-- Adhesiones al Claim 1 (Ascensor)
INSERT INTO "ClaimAdhesion" ("claimId", "userId", "adhesionType", "createdAt", "updatedAt") VALUES
  (1, 5, 'support', NOW(), NOW()),
  (1, 6, 'support', NOW(), NOW());

-- Adhesiones al Claim 2 (Pérdida de agua)
INSERT INTO "ClaimAdhesion" ("claimId", "userId", "adhesionType", "createdAt", "updatedAt") VALUES
  (2, 3, 'support', NOW(), NOW()),
  (2, 6, 'support', NOW(), NOW());

-- Adhesiones al Claim 3 (Luces)
INSERT INTO "ClaimAdhesion" ("claimId", "userId", "adhesionType", "createdAt", "updatedAt") VALUES
  (3, 5, 'support', NOW(), NOW());
```

#### 8.3 Reservas de Ejemplo

```sql
-- Reserva 1: María en el Gimnasio (Mañana)
INSERT INTO "Reservation" ("userId", "amenityId", "startTime", "endTime", "statusId", "hiddenFromUser", "createdAt") 
VALUES (
  3, -- María González
  1, -- Gimnasio
  (CURRENT_DATE + INTERVAL '1 day' + TIME '07:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00:00')::timestamp,
  2, -- Confirmada
  false,
  NOW()
);

-- Reserva 2: Ana en la Piscina (Este fin de semana)
INSERT INTO "Reservation" ("userId", "amenityId", "startTime", "endTime", "statusId", "hiddenFromUser", "createdAt") 
VALUES (
  5, -- Ana Martínez
  2, -- Piscina
  (CURRENT_DATE + INTERVAL '5 days' + TIME '10:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '5 days' + TIME '12:00:00')::timestamp,
  2, -- Confirmada
  false,
  NOW()
);

-- Reserva 3: Pedro en el Salón de Eventos (Próximo mes)
INSERT INTO "Reservation" ("userId", "amenityId", "startTime", "endTime", "statusId", "hiddenFromUser", "createdAt") 
VALUES (
  6, -- Pedro López
  3, -- Salón de Eventos
  (CURRENT_DATE + INTERVAL '30 days' + TIME '18:00:00')::timestamp,
  (CURRENT_DATE + INTERVAL '30 days' + TIME '23:00:00')::timestamp,
  1, -- Pendiente (requiere aprobación)
  false,
  NOW()
);
```

---

## 🔧 Script Completo de Una Sola Vez

Si quieres ejecutar todo de una vez, aquí está el script completo en orden:

```sql
-- ============================================
-- SCRIPT COMPLETO DE POBLACIÓN DE BASE DE DATOS
-- ============================================

-- 1. ESTADOS DE RESERVA (CRÍTICO - DEBE IR PRIMERO)
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

-- 5. USUARIOS
-- Admin (password: 12345A)
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Administrador Principal',
  'admin@edificio.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'admin',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Owner 1
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Juan Pérez',
  'juan.perez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'owner',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Owner 2
INSERT INTO "User" (name, email, password, role, "createdAt") 
VALUES (
  'Carlos Rodríguez',
  'carlos.rodriguez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'owner',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 6. APARTAMENTOS (después de usuarios)
INSERT INTO "Apartment" (unit, floor, "areaM2", observations, rooms, "ownerId") 
VALUES
  ('101', 1, 65.5, 'Apartamento luminoso con vista al parque', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@email.com')),
  ('201', 2, 75.0, 'Apartamento esquinero, excelente ventilación', 3, 
   (SELECT id FROM "User" WHERE email = 'carlos.rodriguez@email.com')),
  ('102', 1, 60.0, 'Apartamento cerca del ascensor', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@email.com')),
  ('301', 3, 85.5, 'Apartamento con terraza privada', 3, 
   (SELECT id FROM "User" WHERE email = 'carlos.rodriguez@email.com')),
  ('202', 2, 70.0, 'Vista panorámica', 2, 
   (SELECT id FROM "User" WHERE email = 'juan.perez@email.com'));

-- 7. TENANTS (después de apartamentos)
INSERT INTO "User" (name, email, password, role, "apartmentId", "createdAt") 
VALUES (
  'María González',
  'maria.gonzalez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '101' LIMIT 1),
  NOW()
),
(
  'Ana Martínez',
  'ana.martinez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '201' LIMIT 1),
  NOW()
),
(
  'Pedro López',
  'pedro.lopez@email.com',
  '$2b$10$YhVGZ0R3c3xh5iKw5WZfbeJ9BfQGqH5vGZJ4oN/XWZJqHZLQKW4G.',
  'tenant',
  (SELECT id FROM "Apartment" WHERE unit = '102' LIMIT 1),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 8. AMENITIES
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
-- FIN DEL SCRIPT
-- ============================================
```

---

## 📊 Resumen de Datos Insertados

| Tabla | Cantidad | Descripción |
|-------|----------|-------------|
| **Users** | 6 | 1 Admin, 5 Tenants (2 propietarios) |
| **Apartments** | 5 | Apartamentos distribuidos en 3 pisos |
| **Amenities** | 8 | Instalaciones del edificio |
| **ReservationStatus** | 4 | Estados posibles de reservas |
| **ClaimCategories** | 7 | Categorías de reclamos |
| **ClaimPriorities** | 4 | Niveles de prioridad |
| **ClaimStatuses** | 4 | Estados de reclamos |
| **Claims** (opcional) | 5 | Reclamos de ejemplo |
| **Reservations** (opcional) | 3 | Reservas de ejemplo |

---

## 🔐 Credenciales de Acceso

Todos los usuarios tienen la misma contraseña para facilitar las pruebas:

```
Email: admin@edificio.com
Password: 12345A
Role: Admin
```

```
Email: juan.perez@email.com
Password: 12345A
Role: Tenant (Propietario)
```

```
Email: maria.gonzalez@email.com
Password: 12345A
Role: Tenant
```

---

## ⚠️ Notas Importantes

1. **Contraseñas Hasheadas**: Todas las contraseñas en este script están hasheadas con bcrypt (10 rounds)
2. **IDs Autoincrementales**: Los IDs se asignan automáticamente
3. **Timestamps**: Se usan funciones de PostgreSQL (`NOW()`, `CURRENT_DATE`) para fechas dinámicas
4. **Orden de Inserción**: Es CRÍTICO seguir el orden debido a las foreign keys
5. **ON CONFLICT**: Algunos inserts usan `ON CONFLICT DO NOTHING` para evitar duplicados

---

## 🧪 Verificación

Después de ejecutar el script, verifica que todo esté correcto:

```sql
-- Verificar usuarios
SELECT id, name, email, role FROM "User";

-- Verificar apartamentos
SELECT id, unit, floor, "ownerId" FROM "Apartment";

-- Verificar amenities
SELECT id, name, capacity, "isActive" FROM "Amenity";

-- Verificar estados de reserva
SELECT * FROM "reservation_statuses";

-- Verificar categorías de claims
SELECT * FROM "claim_categories";
```

---

## 🚀 Próximos Pasos

1. Ejecutar el script SQL completo
2. Verificar que todos los datos se insertaron correctamente
3. Iniciar el servidor: `npm run dev`
4. Probar login con las credenciales proporcionadas
5. Crear reservas y claims de prueba

---

## 📝 Personalización

Puedes modificar este script según tus necesidades:

- Cambiar nombres y emails de usuarios
- Ajustar unidades y pisos de apartamentos
- Modificar horarios y capacidades de amenities
- Agregar más datos de ejemplo

---

**✨ ¡Tu base de datos está lista para usar!**
