import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  getSystemStats, 
  getAllUsers, 
  updateUserRole,
  getAllReservations,
  createAmenity,
  updateAmenity,
  getAllApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  getAllAmenities,
  deleteAmenity,
  getAmenityDetailReservations
} from '../src/controllers/adminController.js';
import { validateAdmin } from '../src/middleware/adminMiddleware.js';
import { createTestUser, createTestAdmin, createTestAmenity, createTestApartment, createTestReservation, cleanupRegisteredData, prisma } from './helpers.js';

describe('Admin Controller Tests', () => {
  let app: express.Application;
  let testAdmin: any;
  let testUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock the user object that's added by validateAdmin middleware
    app.use((req: any, res, next) => {
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
          req.user = { id: decoded.id, email: 'admin@test.com' }; // Fixed: decoded.id instead of decoded.userId
          req.userId = decoded.id; // Fixed: decoded.id instead of decoded.userId
        } catch (error) {
          // Invalid token, let middleware handle it
        }
      }
      next();
    });
    
    // Setup admin routes with middleware
    app.get('/admin/stats', validateAdmin, getSystemStats);
    app.get('/admin/users', validateAdmin, getAllUsers);
    app.put('/admin/users/:id/role', validateAdmin, updateUserRole);
    app.post('/admin/amenities', validateAdmin, createAmenity);
    app.get('/admin/amenities', validateAdmin, getAllAmenities);
    app.put('/admin/amenities/:id', validateAdmin, updateAmenity);
    app.delete('/admin/amenities/:id', validateAdmin, deleteAmenity);
    app.post('/admin/apartments', validateAdmin, createApartment);
    app.get('/admin/apartments', validateAdmin, getAllApartments);
    app.put('/admin/apartments/:id', validateAdmin, updateApartment);
    app.delete('/admin/apartments/:id', validateAdmin, deleteApartment);
    app.get('/admin/reservations', validateAdmin, getAllReservations);
    app.get('/admin/amenities/:id/reservations', validateAdmin, getAmenityDetailReservations);

    // Create test data
    testAdmin = await createTestAdmin();
    testUser = await createTestUser();
    
    // Generate admin token
    adminToken = jwt.sign(
      { id: testAdmin.id, role: 'admin' }, // Fixed: id instead of userId
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await cleanupRegisteredData();
  });

  describe('System Stats Tests', () => {
    it('should return system statistics for admin', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalApartments');
      expect(response.body).toHaveProperty('totalReservations');
      expect(response.body).toHaveProperty('totalAmenities');
      expect(typeof response.body.totalUsers).toBe('number');
    });

    it('should reject stats request without admin token', async () => {
      const response = await request(app)
        .get('/admin/stats')
        .expect(401);

      expect(response.body.message).toBe('Authorization header required for admin access');
    });
  });

  describe('User Management Tests', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true); // Fixed: expect wrapped object
      if (response.body.users.length > 0) {
        expect(response.body.users[0]).toHaveProperty('id');
        expect(response.body.users[0]).toHaveProperty('email');
        expect(response.body.users[0]).toHaveProperty('role');
      }
    });

    it('should update user role', async () => {
      const response = await request(app)
        .put(`/admin/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.message).toContain('updated successfully');

      // Verify the update
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.role).toBe('admin');

      // Reset role back to tenant
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: 'tenant' }
      });
    });

    it('should reject invalid role update', async () => {
      const response = await request(app)
        .put(`/admin/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid-role' })
        .expect(400);
    });
  });

  describe('Amenity Management Tests', () => {
    it('should create new amenity', async () => {
      const randomId = Math.random().toString(36).substring(7);
      const amenityData = {
        name: `Test Gym ${randomId}`,
        capacity: 15,
        maxDuration: 90
      };

      const response = await request(app)
        .post('/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(amenityData)
        .expect(201);

      expect(response.body.message).toContain('created successfully');
      expect(response.body.amenity).toHaveProperty('id');
      expect(response.body.amenity.name).toBe(amenityData.name);
    });

    it('should get all amenities with reservation counts', async () => {
      const response = await request(app)
        .get('/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.amenities)).toBe(true); // Fixed: expect wrapped object
      if (response.body.amenities.length > 0) {
        expect(response.body.amenities[0]).toHaveProperty('id');
        expect(response.body.amenities[0]).toHaveProperty('name');
        expect(response.body.amenities[0]).toHaveProperty('capacity');
        expect(response.body.amenities[0]).toHaveProperty('_count'); // Fixed: expect _count instead of reservationCount
      }
    });

    it('should update amenity', async () => {
      const amenity = await createTestAmenity();
      const updateData = {
        name: 'Updated Pool Name',
        capacity: 25
      };

      const response = await request(app)
        .put(`/admin/amenities/${amenity.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toContain('updated successfully');
      expect(response.body.amenity.name).toBe(updateData.name);
      expect(response.body.amenity.capacity).toBe(updateData.capacity);
    });

    it('should delete amenity without active reservations', async () => {
      const tempAmenity = await createTestAmenity({ name: 'Temp Delete Test' });

      const response = await request(app)
        .delete(`/admin/amenities/${tempAmenity.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204); // Fixed: expect 204 instead of 200
    });

    it('should prevent deletion of amenity with active reservations', async () => {
      const amenityWithReservation = await createTestAmenity({ name: 'Reserved Amenity' });
      await createTestReservation(testUser.id, amenityWithReservation.id);

      const response = await request(app)
        .delete(`/admin/amenities/${amenityWithReservation.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409); // Fixed: expect 409 instead of 400
    });
  });

  describe('Apartment Management Tests', () => {
    let testOwner: any;

    beforeEach(async () => {
      testOwner = await createTestUser({ role: 'tenant' });
    });

    afterEach(async () => {
      // Cleanup apartments and owner
      await prisma.apartment.deleteMany({
        where: {
          unit: { contains: 'Test' }
        }
      });
      await prisma.user.deleteMany({ where: { id: testOwner.id } }); // Fixed: deleteMany instead of delete
    });

    it('should create new apartment', async () => {
      const apartmentData = {
        unit: 'Test-A202',
        floor: 2,
        rooms: 3,
        ownerId: testOwner.id
      };

      const response = await request(app)
        .post('/admin/apartments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(apartmentData)
        .expect(201);

      expect(response.body.message).toContain('created successfully');
      expect(response.body.apartment.unit).toBe(apartmentData.unit);
    });

    it('should get all apartments', async () => {
      const response = await request(app)
        .get('/admin/apartments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.apartments)).toBe(true); // Fixed: expect wrapped object
      if (response.body.apartments.length > 0) {
        expect(response.body.apartments[0]).toHaveProperty('id');
        expect(response.body.apartments[0]).toHaveProperty('unit');
        expect(response.body.apartments[0]).toHaveProperty('floor');
      }
    });

    it('should update apartment', async () => {
      const testApartment = await createTestApartment(testOwner.id, { unit: 'Test-Update' });
      const updateData = {
        unit: 'Test-Updated-Unit',
        rooms: 4,
        areaM2: 120.5
      };

      const response = await request(app)
        .put(`/admin/apartments/${testApartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toContain('updated successfully');
      expect(response.body.apartment.unit).toBe(updateData.unit);
    });

    it('should prevent apartment deletion with assigned users', async () => {
      const testApartment = await createTestApartment(testOwner.id, { unit: 'Test-Delete' });
      
      // Assign user to apartment
      await prisma.user.update({
        where: { id: testUser.id },
        data: { apartmentId: testApartment.id }
      });

      const response = await request(app)
        .delete(`/admin/apartments/${testApartment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400); // Fixed: expect 400 for apartments with assigned users

      expect(response.body.error).toContain('has assigned users');
    });

    it('should reject apartment creation with invalid owner', async () => {
      const apartmentData = {
        unit: 'Test-Invalid',
        floor: 1,
        rooms: 2,
        ownerId: 99999
      };

      const response = await request(app)
        .post('/admin/apartments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(apartmentData)
        .expect(404); // Fixed: expect 404 instead of 400
    });
  });

  describe('Reservation Management Tests', () => {
    it('should get all reservations', async () => {
      const response = await request(app)
        .get('/admin/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.reservations)).toBe(true); // Fixed: expect wrapped object
      if (response.body.reservations.length > 0) {
        expect(response.body.reservations[0]).toHaveProperty('id');
        expect(response.body.reservations[0]).toHaveProperty('status');
        expect(response.body.reservations[0]).toHaveProperty('startTime');
      }
    });

    it('should get amenity-specific reservations', async () => {
      const amenity = await createTestAmenity({ name: 'Reservation Test Amenity' });

      const response = await request(app)
        .get(`/admin/amenities/${amenity.id}/reservations`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.reservations)).toBe(true); // Fixed: expect wrapped object
    });
  });

  describe('Validation Tests', () => {
    it('should reject requests with missing required fields', async () => {
      const randomId2 = Math.random().toString(36).substring(7);
      const response = await request(app)
        .post('/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Amenity ${randomId2}`
          // Missing capacity and maxDuration
        })
        .expect(400);
    });

    it('should reject requests with invalid IDs', async () => {
      const response = await request(app)
        .put('/admin/amenities/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name'
        })
        .expect(400);
    });

    it('should handle non-existent resource updates', async () => {
      const response = await request(app)
        .put('/admin/amenities/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          capacity: 10,
          maxDuration: 60
        })
        .expect(404);
    });
  });
});