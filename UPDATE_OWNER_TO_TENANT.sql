-- Actualizar todos los usuarios con rol 'owner' a 'tenant'
-- Este script cambia el rol de owner a tenant para todos los usuarios
-- ya que el sistema ahora solo maneja dos roles: tenant y admin

UPDATE "User"
SET role = 'tenant'
WHERE role = 'owner';

-- Verificar los cambios
SELECT id, name, email, role FROM "User" WHERE role = 'tenant';
