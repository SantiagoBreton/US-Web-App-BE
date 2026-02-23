import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { validateAdmin } from '../src/middleware/adminMiddleware.js';
import { createTestUser, createTestAdmin, cleanupRegisteredData, prisma } from './helpers.js';

describe('Admin Middleware Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testAdmin: any;

  beforeAll(async () => {
    // Setup Express app with admin middleware
    app = express();
    app.use(express.json());
    
    // Test route protected by admin middleware
    app.get('/test-admin', validateAdmin, (req: any, res: any) => {
      res.json({ message: 'Admin access granted', userId: req.userId });
    });

    // Create test users
    testUser = await createTestUser();
    testAdmin = await createTestAdmin();
  });

  afterAll(async () => {
    await cleanupRegisteredData();
  });

  describe('Authentication Tests', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/test-admin')
        .expect(401);

      expect(response.body.message).toBe('Authorization header required for admin access');
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.message).toBe('Invalid Authorization header format');
    });

    it('should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should allow valid admin access', async () => {
      const adminToken = jwt.sign(
        { id: testAdmin.id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('Admin access granted');
      expect(response.body.userId).toBe(testAdmin.id);
    });

    it('should reject non-admin users', async () => {
      // Generate valid JWT for regular user
      const userToken = jwt.sign(
        { id: testUser.id, role: 'tenant' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toBe('Admin access required. Unauthorized attempt logged.');
    });
  });

  describe('Security Tests', () => {
    it('should validate user exists in database', async () => {
      // Generate token for non-existent user
      const fakeToken = jwt.sign(
        { id: 99999, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.message).toBe('User not found');
    });

    it('should validate current user role from database', async () => {
      // Create admin user then change role to tenant
      const adminUser = await createTestAdmin();
      
      // Generate token with admin role
      const adminToken = jwt.sign(
        { id: adminUser.id, role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Change user role in database (simulate role change)
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'tenant' }
      });

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.message).toBe('Admin access required. Unauthorized attempt logged.');

      // Cleanup
      await prisma.user.deleteMany({ where: { id: adminUser.id } });
    });
  });
});