import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface TestUser {
  id: number;
  email: string;
  password: string;
  role: string | null;
  name: string;
}

// Test data factory functions
export const createTestUser = async (overrides: Partial<TestUser> = {}): Promise<TestUser> => {
  const randomId = Math.random().toString(36).substring(7);
  const plainPassword = 'testpassword123';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);
  
  const userData = {
    email: `test-${randomId}@example.com`, // Generate unique email
    password: hashedPassword,
    role: 'tenant',
    name: 'Test User',
    ...overrides
  };

  const user = await prisma.user.create({
    data: userData
  });

  registerTestData('users', user.id);

  return {
    ...user,
    password: plainPassword // Return unhashed password for login tests
  };
};

export const createTestAdmin = async (overrides: Partial<TestUser> = {}): Promise<TestUser> => {
  const randomId = Math.random().toString(36).substring(7);
  return createTestUser({
    email: `admin-${randomId}@example.com`, // Generate unique email
    role: 'admin',
    name: 'Admin User',
    ...overrides
  });
};

export const generateTestJWT = (userId: number, role: string = 'tenant'): string => {
  return jwt.sign(
    { id: userId, role }, // Changed from userId to id to match authController
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const createTestAmenity = async (overrides: any = {}) => {
  const amenity = await prisma.amenity.create({
    data: {
      name: 'Test Pool',
      capacity: 20,
      maxDuration: 120,
      ...overrides
    }
  });
  
  registerTestData('amenities', amenity.id);
  return amenity;
};

export const createTestApartment = async (ownerId: number, overrides: any = {}) => {
  const apartment = await prisma.apartment.create({
    data: {
      unit: 'A101',
      floor: 1,
      rooms: 2,
      ownerId,
      ...overrides
    }
  });
  
  registerTestData('apartments', apartment.id);
  return apartment;
};

export const createTestReservation = async (userId: number, amenityId: number, overrides: any = {}) => {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 1); // 1 hour from now
  
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2); // 2 hours duration

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      amenityId,
      startTime,
      endTime,
      status: 'confirmed',
      ...overrides
    }
  });
  
  registerTestData('reservations', reservation.id);
  return reservation;
};

export const createTestGarage = async (overrides: any = {}) => {
  const randomId = Math.random().toString(36).substring(7);
  const garage = await prisma.garage.create({
    data: {
      number: `TEST-${randomId}`,
      type:   'fija',
      status: 'activa',
      ...overrides
    }
  });

  registerTestData('garages', garage.id);
  return garage;
};

export const createTestVehicle = async (userId: number, overrides: any = {}) => {
  const randomId = Math.random().toString(36).substring(7).toUpperCase();
  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: `TST${randomId}`,
      brand:        'Toyota',
      model:        'Corolla',
      color:        'Blanco',
      userId,
      ...overrides
    }
  });

  registerTestData('vehicles', vehicle.id);
  return vehicle;
};

export const generateTestEmail = (): string => {
  const randomId = Math.random().toString(36).substring(7);
  return `test-${randomId}@example.com`;
};

// Track created test data for targeted cleanup
const testDataRegistry = {
  users: new Set<number>(),
  amenities: new Set<number>(),
  apartments: new Set<number>(),
  reservations: new Set<number>(),
  garages: new Set<number>(),
  vehicles: new Set<number>(),
};

export const registerTestData = (type: keyof typeof testDataRegistry, id: number) => {
  testDataRegistry[type].add(id);
};

export const cleanupRegisteredData = async () => {
  // Clean up in dependency order
  if (testDataRegistry.vehicles.size > 0) {
    await prisma.vehicle.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.vehicles) } }
    });
    testDataRegistry.vehicles.clear();
  }

  if (testDataRegistry.garages.size > 0) {
    await prisma.garage.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.garages) } }
    });
    testDataRegistry.garages.clear();
  }

  if (testDataRegistry.reservations.size > 0) {
    await prisma.reservation.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.reservations) } }
    });
    testDataRegistry.reservations.clear();
  }
  
  if (testDataRegistry.apartments.size > 0) {
    await prisma.apartment.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.apartments) } }
    });
    testDataRegistry.apartments.clear();
  }
  
  if (testDataRegistry.amenities.size > 0) {
    await prisma.amenity.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.amenities) } }
    });
    testDataRegistry.amenities.clear();
  }
  
  if (testDataRegistry.users.size > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: Array.from(testDataRegistry.users) } }
    });
    testDataRegistry.users.clear();
  }
};

// Legacy function for compatibility - still dangerous for parallel tests
export const cleanupTestData = async () => {
  await prisma.reservation.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.apartment.deleteMany({});
  await prisma.user.deleteMany({});
};

export const cleanupTestUsers = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test'
      }
    }
  });
};

export { prisma };