import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateOwnersToTenants() {
  try {
    console.log('🔄 Actualizando usuarios con rol "owner" a "tenant"...');
    
    const result = await prisma.user.updateMany({
      where: {
        role: 'owner'
      },
      data: {
        role: 'tenant'
      }
    });

    console.log(`✅ ${result.count} usuarios actualizados de "owner" a "tenant"`);
    
    const tenants = await prisma.user.findMany({
      where: {
        role: 'tenant'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`\n📋 Total de usuarios con rol "tenant": ${tenants.length}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateOwnersToTenants();
