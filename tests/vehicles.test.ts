import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getAllVehicles,
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../src/controllers/vehicleController.js';
import { requireAuth } from '../src/auth_middleware.js';
import { validateAdmin } from '../src/middleware/validateAdmin.js';
import {
  createTestUser,
  createTestAdmin,
  createTestApartment,
  createTestGarage,
  createTestVehicle,
  cleanupRegisteredData,
  prisma,
} from './helpers.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeToken = (id: number, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

// ─── suite ───────────────────────────────────────────────────────────────────

describe('Vehicle Controller Tests', () => {
  let app: express.Application;

  let admin:        any;
  let tenant:       any;
  let otherTenant:  any;
  let apartment:    any;
  let adminToken:   string;
  let tenantToken:  string;
  let otherToken:   string;

  beforeAll(async () => {
    // ── Express test app ──────────────────────────────────────────────────────
    app = express();
    app.use(express.json());

    // Inject user from JWT into req.user
    app.use((req: any, _res, next) => {
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          req.user = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        } catch {
          // let middleware reject it
        }
      }
      next();
    });

    // ── Routes ────────────────────────────────────────────────────────────────
    app.get('/admin/vehicles',   requireAuth, validateAdmin, getAllVehicles);
    app.get('/vehicles/my',      requireAuth, getMyVehicles);
    app.post('/vehicles',        requireAuth, createVehicle);
    app.put('/vehicles/:id',     requireAuth, updateVehicle);
    app.delete('/vehicles/:id',  requireAuth, deleteVehicle);

    // ── Test data ─────────────────────────────────────────────────────────────
    admin       = await createTestAdmin();
    tenant      = await createTestUser({ name: 'Vehicle Tenant' });
    otherTenant = await createTestUser({ name: 'Other Tenant' });
    apartment   = await createTestApartment(tenant.id, { unit: 'VEH-101', floor: 2 });

    // Link tenant to apartment
    await prisma.user.update({ where: { id: tenant.id }, data: { apartmentId: apartment.id } });

    adminToken  = makeToken(admin.id,        'admin');
    tenantToken = makeToken(tenant.id,       'tenant');
    otherToken  = makeToken(otherTenant.id,  'tenant');
  });

  afterAll(async () => {
    await cleanupRegisteredData();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /admin/vehicles
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /admin/vehicles', () => {
    it('devuelve 200 y array para admin', async () => {
      const res = await request(app)
        .get('/admin/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve 403 para un tenant', async () => {
      const res = await request(app)
        .get('/admin/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(403);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/admin/vehicles');
      expect(res.status).toBe(401);
    });

    it('filtra por licensePlate (query param)', async () => {
      const plate = `FLT${Date.now()}`;
      const vehicle = await createTestVehicle(tenant.id, { licensePlate: plate.toUpperCase() });

      const res = await request(app)
        .get(`/admin/vehicles?licensePlate=${plate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const found = res.body.find((v: any) => v.id === vehicle.id);
      expect(found).toBeDefined();

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('filtra por garageId (query param)', async () => {
      const garage = await createTestGarage({ number: `FLTG-${Date.now()}` });
      const vehicle = await createTestVehicle(tenant.id, { garageId: garage.id });

      const res = await request(app)
        .get(`/admin/vehicles?garageId=${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.every((v: any) => v.garageId === garage.id)).toBe(true);

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
      await prisma.garage.delete({ where: { id: garage.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /vehicles/my
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /vehicles/my', () => {
    it('devuelve los vehículos del tenant autenticado', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .get('/vehicles/my')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((v: any) => v.id === vehicle.id);
      expect(found).toBeDefined();

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('no devuelve vehículos de otros tenants', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .get('/vehicles/my')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      const found = res.body.find((v: any) => v.id === vehicle.id);
      expect(found).toBeUndefined();

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/vehicles/my');
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /vehicles
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /vehicles', () => {
    it('crea un vehículo válido y devuelve 201', async () => {
      const plate = `NEW${Date.now()}`;

      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          licensePlate: plate,
          brand:        'Volkswagen',
          model:        'Gol',
          color:        'Gris',
        });

      expect(res.status).toBe(201);
      expect(res.body.licensePlate).toBe(plate.toUpperCase());
      expect(res.body.userId).toBe(tenant.id);

      await prisma.vehicle.delete({ where: { id: res.body.id } });
    });

    it('convierte la patente a mayúsculas', async () => {
      const plate = `lo${Date.now()}`;

      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ licensePlate: plate, brand: 'Honda', model: 'Civic', color: 'Negro' });

      expect(res.status).toBe(201);
      expect(res.body.licensePlate).toBe(plate.toUpperCase());

      await prisma.vehicle.delete({ where: { id: res.body.id } });
    });

    it('devuelve 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ licensePlate: 'NOFULL', brand: 'Toyota' }); // sin model ni color

      expect(res.status).toBe(400);
    });

    it('devuelve 409 si la patente ya está registrada', async () => {
      const vehicle = await createTestVehicle(tenant.id, { licensePlate: 'DUPTEST01' });

      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ licensePlate: 'DUPTEST01', brand: 'Renault', model: 'Logan', color: 'Azul' });

      expect(res.status).toBe(409);

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('devuelve 404 si la cochera indicada no existe', async () => {
      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          licensePlate: `NOGAR${Date.now()}`,
          brand:        'Fiat',
          model:        'Siena',
          color:        'Blanco',
          garageId:     999999,
        });

      expect(res.status).toBe(404);
    });

    it('devuelve 400 si la cochera está fuera de uso', async () => {
      const garage = await createTestGarage({
        number: `FDU-${Date.now()}`,
        status: 'fuera_de_uso',
      });

      const res = await request(app)
        .post('/vehicles')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          licensePlate: `FDU${Date.now()}`,
          brand:        'Peugeot',
          model:        '208',
          color:        'Rojo',
          garageId:     garage.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/fuera de uso/i);

      await prisma.garage.delete({ where: { id: garage.id } });
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app)
        .post('/vehicles')
        .send({ licensePlate: 'NOAUTH', brand: 'X', model: 'Y', color: 'Z' });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /vehicles/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /vehicles/:id', () => {
    it('actualiza los datos del vehículo propio y devuelve 200', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .put(`/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ color: 'Verde', model: 'Corolla Cross' });

      expect(res.status).toBe(200);
      expect(res.body.color).toBe('Verde');
      expect(res.body.model).toBe('Corolla Cross');

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('devuelve 403 si el tenant intenta editar un vehículo ajeno', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .put(`/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ color: 'Amarillo' });

      expect(res.status).toBe(403);

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('devuelve 409 si la nueva patente ya pertenece a otro vehículo', async () => {
      const vehicleA = await createTestVehicle(tenant.id, { licensePlate: 'PLATE-A11' });
      const vehicleB = await createTestVehicle(tenant.id, { licensePlate: 'PLATE-B22' });

      const res = await request(app)
        .put(`/vehicles/${vehicleB.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ licensePlate: 'PLATE-A11' });

      expect(res.status).toBe(409);

      await prisma.vehicle.delete({ where: { id: vehicleA.id } });
      await prisma.vehicle.delete({ where: { id: vehicleB.id } });
    });

    it('devuelve 404 si el vehículo no existe', async () => {
      const res = await request(app)
        .put('/vehicles/999999')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ color: 'Azul' });

      expect(res.status).toBe(404);
    });

    it('devuelve 400 si el ID es inválido', async () => {
      const res = await request(app)
        .put('/vehicles/not-a-number')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ color: 'Azul' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /vehicles/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('DELETE /vehicles/:id', () => {
    it('elimina el vehículo propio y devuelve 200', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .delete(`/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/i);

      const deleted = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
      expect(deleted).toBeNull();
    });

    it('devuelve 403 si el tenant intenta eliminar un vehículo ajeno', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app)
        .delete(`/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });

    it('devuelve 404 si el vehículo no existe', async () => {
      const res = await request(app)
        .delete('/vehicles/999999')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(404);
    });

    it('devuelve 400 si el ID es inválido', async () => {
      const res = await request(app)
        .delete('/vehicles/not-a-number')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(400);
    });

    it('devuelve 401 sin token', async () => {
      const vehicle = await createTestVehicle(tenant.id);

      const res = await request(app).delete(`/vehicles/${vehicle.id}`);

      expect(res.status).toBe(401);

      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    });
  });
});
