import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getAllGarages,
  createGarage,
  updateGarage,
  deleteGarage,
  getGarageAssignments,
  assignGarage,
  unassignGarage,
  getMyGarages,
} from '../src/controllers/garageController.js';
import { requireAuth } from '../src/auth_middleware.js';
import { validateAdmin } from '../src/middleware/validateAdmin.js';
import {
  createTestUser,
  createTestAdmin,
  createTestApartment,
  createTestGarage,
  cleanupRegisteredData,
  prisma,
} from './helpers.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeToken = (id: number, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

// ─── suite ───────────────────────────────────────────────────────────────────

describe('Garage Controller Tests', () => {
  let app: express.Application;

  let admin:       any;
  let tenant:      any;
  let apartment:   any;
  let adminToken:  string;
  let tenantToken: string;

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
    app.get('/admin/garages/assignments', requireAuth, validateAdmin, getGarageAssignments);
    app.put('/admin/garages/:id/assign',   requireAuth, validateAdmin, assignGarage);
    app.put('/admin/garages/:id/unassign', requireAuth, validateAdmin, unassignGarage);
    app.get('/admin/garages',              requireAuth, validateAdmin, getAllGarages);
    app.post('/admin/garages',             requireAuth, validateAdmin, createGarage);
    app.put('/admin/garages/:id',          requireAuth, validateAdmin, updateGarage);
    app.delete('/admin/garages/:id',       requireAuth, validateAdmin, deleteGarage);
    app.get('/garages/my',                 requireAuth, getMyGarages);

    // ── Test data ─────────────────────────────────────────────────────────────
    admin       = await createTestAdmin();
    tenant      = await createTestUser({ name: 'Garage Tenant' });
    apartment   = await createTestApartment(tenant.id, { unit: 'GRG-101', floor: 1 });

    adminToken  = makeToken(admin.id,  'admin');
    tenantToken = makeToken(tenant.id, 'tenant');
  });

  afterAll(async () => {
    await cleanupRegisteredData();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /admin/garages
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /admin/garages', () => {
    it('devuelve 200 y array para admin', async () => {
      const res = await request(app)
        .get('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve 403 para un tenant', async () => {
      const res = await request(app)
        .get('/admin/garages')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(403);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/admin/garages');
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /admin/garages
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /admin/garages', () => {
    it('crea una cochera válida y devuelve 201', async () => {
      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'TEST-CREATE-01', type: 'fija', status: 'activa' });

      expect(res.status).toBe(201);
      expect(res.body.number).toBe('TEST-CREATE-01');
      expect(res.body.type).toBe('fija');

      // cleanup
      await prisma.garage.delete({ where: { id: res.body.id } });
    });

    it('devuelve 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'MISSING-TYPE' }); // sin type ni status

      expect(res.status).toBe(400);
    });

    it('devuelve 400 si type es inválido', async () => {
      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'BAD-TYPE-01', type: 'invalido', status: 'activa' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/type/i);
    });

    it('devuelve 400 si status es inválido', async () => {
      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'BAD-STATUS-01', type: 'fija', status: 'deshabilitada' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/status/i);
    });

    it('devuelve 409 si el número ya existe', async () => {
      const existing = await createTestGarage({ number: 'DUP-001', type: 'fija', status: 'activa' });

      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'DUP-001', type: 'fija', status: 'activa' });

      expect(res.status).toBe(409);

      await prisma.garage.delete({ where: { id: existing.id } });
    });

    it('devuelve 404 si el apartmentId no existe', async () => {
      const res = await request(app)
        .post('/admin/garages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: 'APT-NOTFOUND', type: 'fija', status: 'activa', apartmentId: 999999 });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /admin/garages/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /admin/garages/:id', () => {
    let garage: any;

    beforeEach(async () => {
      garage = await createTestGarage({ number: `UPD-${Date.now()}`, type: 'cortesia', status: 'activa' });
    });

    afterEach(async () => {
      await prisma.garage.deleteMany({ where: { id: garage.id } });
    });

    it('actualiza campos válidos y devuelve 200', async () => {
      const res = await request(app)
        .put(`/admin/garages/${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'fuera_de_uso', location: 'Subsuelo B' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('fuera_de_uso');
      expect(res.body.location).toBe('Subsuelo B');
    });

    it('devuelve 404 si la cochera no existe', async () => {
      const res = await request(app)
        .put('/admin/garages/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'activa' });

      expect(res.status).toBe(404);
    });

    it('devuelve 400 si type es inválido', async () => {
      const res = await request(app)
        .put(`/admin/garages/${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'invalido' });

      expect(res.status).toBe(400);
    });

    it('devuelve 409 si el nuevo número ya pertenece a otra cochera', async () => {
      const other = await createTestGarage({ number: `OTHER-${Date.now()}`, type: 'fija', status: 'activa' });

      const res = await request(app)
        .put(`/admin/garages/${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ number: other.number });

      expect(res.status).toBe(409);

      await prisma.garage.delete({ where: { id: other.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /admin/garages/:id
  // ─────────────────────────────────────────────────────────────────────────

  describe('DELETE /admin/garages/:id', () => {
    it('elimina una cochera vacía y devuelve 200', async () => {
      const garage = await createTestGarage({ number: `DEL-${Date.now()}` });

      const res = await request(app)
        .delete(`/admin/garages/${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminada/i);

      const deleted = await prisma.garage.findUnique({ where: { id: garage.id } });
      expect(deleted).toBeNull();
    });

    it('devuelve 409 si la cochera tiene vehículos asignados', async () => {
      const garage  = await createTestGarage({ number: `NOTEMPTY-${Date.now()}` });
      const vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: `NE${Date.now()}`,
          brand:        'Ford',
          model:        'Focus',
          color:        'Rojo',
          userId:       tenant.id,
          garageId:     garage.id,
        }
      });

      const res = await request(app)
        .delete(`/admin/garages/${garage.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);

      // cleanup
      await prisma.vehicle.delete({ where: { id: vehicle.id } });
      await prisma.garage.delete({ where: { id: garage.id } });
    });

    it('devuelve 404 si la cochera no existe', async () => {
      const res = await request(app)
        .delete('/admin/garages/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /admin/garages/assignments
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /admin/garages/assignments', () => {
    it('devuelve 200 con listado de asignaciones para admin', async () => {
      const res = await request(app)
        .get('/admin/garages/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /admin/garages/:id/assign
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /admin/garages/:id/assign', () => {
    let garage: any;

    beforeEach(async () => {
      garage = await createTestGarage({ number: `ASGN-${Date.now()}` });
    });

    afterEach(async () => {
      await prisma.garage.deleteMany({ where: { id: garage.id } });
    });

    it('asigna la cochera a un apartamento y devuelve 200', async () => {
      const res = await request(app)
        .put(`/admin/garages/${garage.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ apartmentId: apartment.id });

      expect(res.status).toBe(200);
      expect(res.body.apartmentId).toBe(apartment.id);
    });

    it('devuelve 400 si falta apartmentId', async () => {
      const res = await request(app)
        .put(`/admin/garages/${garage.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('devuelve 404 si el apartamento no existe', async () => {
      const res = await request(app)
        .put(`/admin/garages/${garage.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ apartmentId: 999999 });

      expect(res.status).toBe(404);
    });

    it('devuelve 404 si la cochera no existe', async () => {
      const res = await request(app)
        .put('/admin/garages/999999/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ apartmentId: apartment.id });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /admin/garages/:id/unassign
  // ─────────────────────────────────────────────────────────────────────────

  describe('PUT /admin/garages/:id/unassign', () => {
    it('desasigna la cochera y devuelve 200', async () => {
      const garage = await createTestGarage({
        number:      `UNASGN-${Date.now()}`,
        apartmentId: apartment.id,
      });

      const res = await request(app)
        .put(`/admin/garages/${garage.id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.apartmentId).toBeNull();

      await prisma.garage.delete({ where: { id: garage.id } });
    });

    it('devuelve 400 si la cochera ya no tiene unidad asignada', async () => {
      const garage = await createTestGarage({ number: `UNASGN2-${Date.now()}` }); // sin apartmentId

      const res = await request(app)
        .put(`/admin/garages/${garage.id}/unassign`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);

      await prisma.garage.delete({ where: { id: garage.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /garages/my (tenant)
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /garages/my', () => {
    it('devuelve array vacío si el tenant no tiene apartamento con cocheras', async () => {
      // tenant ya tiene apartment pero sin cocheras asignadas al inicio
      const res = await request(app)
        .get('/garages/my')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve las cocheras asignadas al apartamento del tenant', async () => {
      const garage = await createTestGarage({
        number:      `MINE-${Date.now()}`,
        apartmentId: apartment.id,
      });

      // link tenant to apartment
      await prisma.user.update({ where: { id: tenant.id }, data: { apartmentId: apartment.id } });

      const res = await request(app)
        .get('/garages/my')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      const found = res.body.find((g: any) => g.id === garage.id);
      expect(found).toBeDefined();

      await prisma.garage.delete({ where: { id: garage.id } });
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/garages/my');
      expect(res.status).toBe(401);
    });
  });
});
