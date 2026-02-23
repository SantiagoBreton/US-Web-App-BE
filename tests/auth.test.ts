import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { 
  register, 
  login, 
  forgotPassword, 
  resetPassword, 
  testEmail 
} from '../src/controllers/authController.js';
import { requireAuth } from '../src/auth_middleware.js';
import { createTestUser, cleanupRegisteredData, generateTestEmail, prisma } from './helpers.js';

describe('Authentication Controller Tests', () => {
  let app: express.Application;
  let testUser: any;

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
          req.user = decoded;
        } catch (error) {
          // Invalid token, let middleware handle it
        }
      }
      next();
    });
    
    // Setup auth routes
    app.post('/auth/register', register);
    app.post('/auth/login', login);
    app.post('/auth/forgot-password', forgotPassword);
    app.post('/auth/reset-password', resetPassword);
    app.post('/auth/test-email', testEmail);

    // Create initial test user
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await cleanupRegisteredData();
  });

  describe('User Registration Tests', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: generateTestEmail(),
        password: 'password123',
        name: 'John Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe(userData.name);

      // Cleanup
      await prisma.user.deleteMany({ where: { email: userData.email } });
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: testUser.email,
        password: 'password123',
        name: 'Jane Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('User already exists');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: generateTestEmail(),
          // Missing password and name
        })
        .expect(400);

      expect(response.body.message).toBe('All fields are required');
    });
  });

  describe('User Login Tests', () => {
    it('should login with valid credentials', async () => {
      // Use the test user created in beforeAll
      const loginData = {
        email: testUser.email,
        password: 'testpassword123' // This matches the password in createTestUser helper
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email
          // Missing password
        })
        .expect(400);

      expect(response.body.message).toBe('Email and password are required');
    });
  });

  describe('Forgot Password Tests', () => {
    it('should handle forgot password for existing email', async () => {
      // Create a specific user for this test to avoid interference from parallel tests
      const forgotPasswordUser = await createTestUser({ 
        email: generateTestEmail(),
        name: 'ForgotPasswordTest'
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: forgotPasswordUser.email
        })
        .expect(200);

      expect(response.body.message).toContain('se ha enviado un enlace');

      // Verify reset token was created
      const user = await prisma.user.findUnique({
        where: { email: forgotPasswordUser.email }
      });
      expect(user?.resetPasswordToken).toBeTruthy();
      expect(user?.resetPasswordExpires).toBeTruthy();

      // Cleanup this specific user
      await prisma.user.deleteMany({ where: { id: forgotPasswordUser.id } });
    });

    it('should handle forgot password for non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })
        .expect(200);

      // Should not reveal if email exists for security
      expect(response.body.message).toContain('se ha enviado un enlace');
    });

    it('should reject forgot password with missing email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Email is required');
    });
  });

  describe('Reset Password Tests', () => {
    let resetToken: string;
    let passwordTestUser: any;

    beforeEach(async () => {
      // Create a separate user for password reset tests
      passwordTestUser = await createTestUser({ 
        email: generateTestEmail(),
        name: 'Reset Test User'
      });
      
      // Generate reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: passwordTestUser.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry
        }
      });
    });

    afterEach(async () => {
      // Cleanup test user
      if (passwordTestUser) {
        await prisma.user.deleteMany({ where: { id: passwordTestUser.id } });
      }
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newpassword123';

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.message).toBe('Password reset successfully');

      // Verify reset token was cleared
      const user = await prisma.user.findUnique({
        where: { id: passwordTestUser.id }
      });
      expect(user?.resetPasswordToken).toBeNull();
      expect(user?.resetPasswordExpires).toBeNull();

      // Verify password was actually changed by trying to login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: passwordTestUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.message).toBe('Login successful');
    });

    it('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    it('should reject reset with short password', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: '123'
        })
        .expect(400);

      expect(response.body.message).toBe('Password must be at least 6 characters long');
    });

    it('should reject reset with missing fields', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: resetToken
          // Missing newPassword
        })
        .expect(400);

      expect(response.body.message).toBe('Token and new password are required');
    });

    it('should reject reset with expired token', async () => {
      // Create an expired token
      const expiredToken = 'expired-test-token';
      await prisma.user.update({
        where: { id: passwordTestUser.id },
        data: {
          resetPasswordToken: expiredToken,
          resetPasswordExpires: new Date(Date.now() - 60000) // 1 minute ago (expired)
        }
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid or expired reset token');
    });
  });

  describe('Security Tests', () => {
    it('should handle SQL injection attempts in login', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: "admin@example.com'; DROP TABLE users; --",
          password: 'anypassword'
        });

      // Should not crash and should return unauthorized
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should hash passwords properly during registration', async () => {
      const userData = {
        name: 'Hash Test',
        email: generateTestEmail(),
        password: 'plainpassword'
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Check that password is hashed in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      expect(user?.password).not.toBe(userData.password);
      expect(user?.password.length).toBeGreaterThan(50); // bcrypt hashes are long

      // Cleanup
      await prisma.user.deleteMany({ where: { email: userData.email } });
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Should not reveal whether email exists or password is wrong
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});