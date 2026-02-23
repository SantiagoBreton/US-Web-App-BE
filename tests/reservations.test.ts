import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  createReservation, 
  getUserReservations, 
  cancelReservation, 
  getAmenityReservations, 
  hideReservationFromUser 
} from '../src/controllers/reservation.js';
import { requireAuth } from '../src/auth_middleware.js';
import { createTestUser, createTestAmenity, createTestReservation, cleanupRegisteredData, prisma } from './helpers.js';

describe('Reservation Controller Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testUser2: any;
  let testAmenity: any;
  let userToken: string;
  let user2Token: string;
  let testUsersCreated: any[] = []; // Track all users created during tests

  beforeAll(async () => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock the user object that's added by requireAuth middleware
    app.use((req: any, res, next) => {
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
          req.user = { id: decoded.id, role: decoded.role };
        } catch (error) {
          // Invalid token, let middleware handle it
        }
      }
      next();
    });
    
    // Setup reservation routes
    app.post('/reservations', requireAuth, createReservation);
    app.get('/reservations', requireAuth, getUserReservations);
    app.patch('/reservations/:id/cancel', requireAuth, cancelReservation);
    app.get('/reservations/amenity/:amenityId', requireAuth, getAmenityReservations);
    app.patch('/reservations/:id/hide', requireAuth, hideReservationFromUser);

    // Create test data
    testUser = await createTestUser({ name: 'Reservation User 1' });
    testUser2 = await createTestUser({ name: 'Reservation User 2' });
    testUsersCreated.push(testUser, testUser2);
    testAmenity = await createTestAmenity({ 
      name: 'Test Pool', 
      capacity: 3, 
      maxDuration: 120 
    });
    
    // Generate user tokens
    userToken = jwt.sign(
      { id: testUser.id, role: 'tenant' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    user2Token = jwt.sign(
      { id: testUser2.id, role: 'tenant' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up reservations created by this test suite only (for all tracked test users)
    const userIds = testUsersCreated.map(user => user.id);
    await prisma.reservation.deleteMany({
      where: {
        userId: { in: userIds }
      }
    });
    
    // Reset to just the main test users (remove temporary users added during tests)
    testUsersCreated = [testUser, testUser2];
  });

  afterAll(async () => {
    // First manually clean up any reservations that might be left
    await prisma.reservation.deleteMany({
      where: {
        OR: [
          { userId: testUser.id },
          { userId: testUser2.id }
        ]
      }
    });
    
    // Then run the registered cleanup
    await cleanupRegisteredData();
  });

  describe('Create Reservation Tests', () => {
    it('should create a reservation successfully', async () => {
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 60).toISOString(), // 1 hour from now
        endTime: new Date(Date.now() + 60000 * 120).toISOString()    // 2 hours from now
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.amenityId).toBe(testAmenity.id);
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.status).toBe('confirmed');

      // Verify in database
      const dbReservation = await prisma.reservation.findUnique({
        where: { id: response.body.id },
        include: { status: true }
      });
      expect(dbReservation).toBeTruthy();
      expect(dbReservation?.status.name).toBe('confirmada');
    });

    it('should reject reservation without authentication', async () => {
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 60).toISOString(),
        endTime: new Date(Date.now() + 60000 * 120).toISOString()
      };

      const response = await request(app)
        .post('/reservations')
        .send(reservationData)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject reservation with missing parameters', async () => {
      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amenityId: testAmenity.id
          // Missing startTime and endTime
        })
        .expect(400);

      expect(response.body.message).toBe('Missing parameters');
    });

    it('should reject reservation for non-existent amenity', async () => {
      const reservationData = {
        amenityId: 99999,
        startTime: new Date(Date.now() + 60000 * 60).toISOString(),
        endTime: new Date(Date.now() + 60000 * 120).toISOString()
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(404);

      expect(response.body.message).toBe('Amenity not found');
    });

    it('should reject reservation exceeding max duration', async () => {
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 60).toISOString(),
        endTime: new Date(Date.now() + 60000 * 240).toISOString() // 4 hours (exceeds 120 min limit)
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toContain(`Max duration for ${testAmenity.name} is ${testAmenity.maxDuration} minutes`);
    });

    it('should reject reservation with invalid time range', async () => {
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 120).toISOString(), // 2 hours from now
        endTime: new Date(Date.now() + 60000 * 60).toISOString()     // 1 hour from now (before start)
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toBe('Start time must be before end time');
    });

    it('should reject overlapping reservations for same user', async () => {
      // Create first reservation
      const firstReservation = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 180).toISOString(), // 3 hours from now
        endTime: new Date(Date.now() + 60000 * 240).toISOString()    // 4 hours from now
      };

      await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(firstReservation)
        .expect(200);

      // Try to create overlapping reservation
      const overlappingReservation = {
        amenityId: testAmenity.id,
        startTime: new Date(Date.now() + 60000 * 210).toISOString(), // 3.5 hours from now (overlaps)
        endTime: new Date(Date.now() + 60000 * 270).toISOString()    // 4.5 hours from now
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(overlappingReservation)
        .expect(400);

      expect(response.body.message).toBe('You already have a reservation during this time');
    });

    it('should reject multiple reservations for same amenity on same day', async () => {
      // Create first reservation for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const firstReservation = {
        amenityId: testAmenity.id,
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 60000 * 60).toISOString() // 1 hour later
      };

      await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(firstReservation)
        .expect(200);

      // Try to create another reservation for same amenity same day
      const secondReservation = {
        amenityId: testAmenity.id,
        startTime: new Date(tomorrow.getTime() + 60000 * 120).toISOString(), // 2 hours later (no overlap)
        endTime: new Date(tomorrow.getTime() + 60000 * 180).toISOString()    // 3 hours later
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(secondReservation)
        .expect(400);

      expect(response.body.message).toBe(`You already have a reservation for ${testAmenity.name} on this day`);
    });

    it('should reject reservation when amenity capacity is full', async () => {
      // Create multiple reservations to fill capacity (capacity = 3)
      const baseTime = Date.now() + 60000 * 300; // 5 hours from now
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: new Date(baseTime).toISOString(),
        endTime: new Date(baseTime + 60000 * 60).toISOString()
      };

      // Fill capacity with 3 users (testUser, testUser2, and one more)
      const testUser3 = await createTestUser({ name: 'User 3' });
      testUsersCreated.push(testUser3);
      const user3Token = jwt.sign(
        { id: testUser3.id, role: 'tenant' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create 3 reservations (fill capacity)
      await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(200);

      await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(reservationData)
        .expect(200);

      await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${user3Token}`)
        .send(reservationData)
        .expect(200);

      // Try to create 4th reservation (should fail)
      const testUser4 = await createTestUser({ name: 'User 4' });
      testUsersCreated.push(testUser4);
      const user4Token = jwt.sign(
        { id: testUser4.id, role: 'tenant' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${user4Token}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toBe('Time slot full');
    });
  });

  describe('Get User Reservations Tests', () => {
    let userReservation: any;

    beforeEach(async () => {
      // Create a test reservation for the user
      userReservation = await createTestReservation(
        testUser.id, 
        testAmenity.id, 
        {
          startTime: new Date(Date.now() + 60000 * 400), // Future reservation
          endTime: new Date(Date.now() + 60000 * 460)
        }
      );
    });

    it('should get user reservations successfully', async () => {
      const response = await request(app)
        .get('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const reservation = response.body.find((r: any) => r.id === userReservation.id);
      expect(reservation).toBeTruthy();
      expect(reservation.userId).toBe(testUser.id);
      expect(reservation).toHaveProperty('amenity');
    });

    it('should not show hidden reservations', async () => {
      // Hide the reservation
      await prisma.reservation.update({
        where: { id: userReservation.id },
        data: { hiddenFromUser: true }
      });

      const response = await request(app)
        .get('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const hiddenReservation = response.body.find((r: any) => r.id === userReservation.id);
      expect(hiddenReservation).toBeFalsy();
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/reservations')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    it('should only return user own reservations', async () => {
      // Create reservation for another user
      const otherUserReservation = await createTestReservation(
        testUser2.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 500),
          endTime: new Date(Date.now() + 60000 * 560)
        }
      );

      const response = await request(app)
        .get('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Should only get testUser's reservations, not testUser2's
      const otherReservation = response.body.find((r: any) => r.id === otherUserReservation.id);
      expect(otherReservation).toBeFalsy();

      const ownReservation = response.body.find((r: any) => r.id === userReservation.id);
      expect(ownReservation).toBeTruthy();
    });
  });

  describe('Cancel Reservation Tests', () => {
    let cancellableReservation: any;

    beforeEach(async () => {
      cancellableReservation = await createTestReservation(
        testUser.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 600),
          endTime: new Date(Date.now() + 60000 * 660)
        }
      );
    });

    it('should cancel reservation successfully', async () => {
      const response = await request(app)
        .patch(`/reservations/${cancellableReservation.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(cancellableReservation.id);
      expect(response.body.status).toBe('cancelada');

      // Verify in database
      const dbReservation = await prisma.reservation.findUnique({
        where: { id: cancellableReservation.id },
        include: { status: true }
      });
      expect(dbReservation?.status.name).toBe('cancelada');
    });

    it('should reject cancellation without authentication', async () => {
      const response = await request(app)
        .patch(`/reservations/${cancellableReservation.id}/cancel`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject cancellation of non-existent reservation', async () => {
      const response = await request(app)
        .patch('/reservations/99999/cancel')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.message).toBe('Reservation not found');
    });

    it('should reject cancellation of other user reservation', async () => {
      // Create reservation for testUser2
      const otherUserReservation = await createTestReservation(
        testUser2.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 700),
          endTime: new Date(Date.now() + 60000 * 760)
        }
      );

      // Try to cancel with testUser token
      const response = await request(app)
        .patch(`/reservations/${otherUserReservation.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toBe('Not allowed');
    });
  });

  describe('Get Amenity Reservations Tests', () => {
    let amenityReservation1: any;
    let amenityReservation2: any;

    beforeEach(async () => {
      const baseTime = Date.now() + 60000 * 800;
      
      amenityReservation1 = await createTestReservation(
        testUser.id, 
        testAmenity.id,
        {
          startTime: new Date(baseTime),
          endTime: new Date(baseTime + 60000 * 60),
          status: 'confirmed'
        }
      );

      amenityReservation2 = await createTestReservation(
        testUser2.id, 
        testAmenity.id,
        {
          startTime: new Date(baseTime + 60000 * 120),
          endTime: new Date(baseTime + 60000 * 180),
          status: 'confirmed'
        }
      );
    });

    it('should get amenity reservations successfully', async () => {
      const response = await request(app)
        .get(`/reservations/amenity/${testAmenity.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const reservation1 = response.body.find((r: any) => r.id === amenityReservation1.id);
      const reservation2 = response.body.find((r: any) => r.id === amenityReservation2.id);
      
      expect(reservation1).toBeTruthy();
      expect(reservation2).toBeTruthy();
      expect(reservation1).toHaveProperty('user');
      expect(reservation1.user).toHaveProperty('name');
    });

    it('should filter reservations by date range', async () => {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get(`/reservations/amenity/${testAmenity.id}`)
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should return reservations within the date range
    });

    it('should only return confirmed reservations', async () => {
      // Create a cancelled reservation
      const cancelledReservation = await createTestReservation(
        testUser.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 900),
          endTime: new Date(Date.now() + 60000 * 960),
          status: 'cancelled'
        }
      );

      const response = await request(app)
        .get(`/reservations/amenity/${testAmenity.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const cancelledRes = response.body.find((r: any) => r.id === cancelledReservation.id);
      expect(cancelledRes).toBeFalsy(); // Should not include cancelled reservations
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/reservations/amenity/${testAmenity.id}`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Hide Reservation Tests', () => {
    let hideableReservation: any;

    beforeEach(async () => {
      hideableReservation = await createTestReservation(
        testUser.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 1000),
          endTime: new Date(Date.now() + 60000 * 1060)
        }
      );
    });

    it('should hide reservation successfully', async () => {
      const response = await request(app)
        .patch(`/reservations/${hideableReservation.id}/hide`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(hideableReservation.id);
      expect(response.body.hiddenFromUser).toBe(true);

      // Verify in database
      const dbReservation = await prisma.reservation.findUnique({
        where: { id: hideableReservation.id }
      });
      expect(dbReservation?.hiddenFromUser).toBe(true);
    });

    it('should reject hiding without authentication', async () => {
      const response = await request(app)
        .patch(`/reservations/${hideableReservation.id}/hide`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject hiding non-existent reservation', async () => {
      const response = await request(app)
        .patch('/reservations/99999/hide')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.message).toBe('Reservation not found');
    });

    it('should reject hiding other user reservation', async () => {
      // Create reservation for testUser2
      const otherUserReservation = await createTestReservation(
        testUser2.id, 
        testAmenity.id,
        {
          startTime: new Date(Date.now() + 60000 * 1100),
          endTime: new Date(Date.now() + 60000 * 1160)
        }
      );

      // Try to hide with testUser token
      const response = await request(app)
        .patch(`/reservations/${otherUserReservation.id}/hide`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toBe('Not allowed');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors gracefully', async () => {
      // Create reservation with invalid amenityId that will cause DB error
      const reservationData = {
        amenityId: 99999, // Non-existent ID (will be caught by amenity validation)
        startTime: new Date(Date.now() + 60000 * 60).toISOString(),
        endTime: new Date(Date.now() + 60000 * 120).toISOString()
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(404);

      expect(response.body.message).toBe('Amenity not found');
    });

    it('should handle malformed dates', async () => {
      const reservationData = {
        amenityId: testAmenity.id,
        startTime: 'invalid-date',
        endTime: 'also-invalid'
      };

      const response = await request(app)
        .post('/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reservationData)
        .expect(400);

      expect(response.body.message).toBe('Invalid date format');
    });
  });
});