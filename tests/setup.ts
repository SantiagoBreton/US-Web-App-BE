import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Global test helpers
declare global {
  var testSetup: boolean;
}

global.testSetup = true;

// Setup and teardown
beforeAll(async () => {
  console.log('Test setup started');
  
  // Clean the database before starting tests
  await prisma.vehicle.deleteMany({});
  await prisma.garage.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.apartment.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  console.log('Test cleanup started');
  
  // Clean the database after all tests
  await prisma.vehicle.deleteMany({});
  await prisma.garage.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.apartment.deleteMany({});
  await prisma.user.deleteMany({});
  
  // Close the Prisma connection
  await prisma.$disconnect();
  
  console.log('Test cleanup completed');
});