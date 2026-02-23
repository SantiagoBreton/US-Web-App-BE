import type { Request, Response } from 'express';
import { prisma } from '../prismaClient';

async function _fetchApartments(includeAdminData: boolean) {
  return await prisma.apartment.findMany({
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: includeAdminData
        }
      },
      tenants: {
        select: {
          id: true,
          name: true,
          email: true,
          role: includeAdminData
        }
      },
      _count: includeAdminData ? {
        select: {
          tenants: true
        }
      } : undefined
    },
    orderBy: [
      { floor: 'asc' },
      { unit: 'asc' }
    ]
  });
}

export const getApartments = async (req: Request, res: Response) => {
  try {
    const apartments = await _fetchApartments(false);
    
    console.log(`[USER] Retrieved ${apartments.length} apartments`);
    res.json(apartments);

  } catch (error) {
    console.error('❌ [GET APARTMENTS ERROR]', error);
    res.status(500).json({ 
      message: 'Error al obtener los apartamentos',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllApartments = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    console.log(`[ADMIN APARTMENTS] User ${adminUser.email} requesting all apartments`);

    const apartments = await _fetchApartments(true);

    const formattedApartments = apartments.map(apartment => {
      // Un apartamento está ocupado si tiene inquilinos O tiene propietario
      const isOccupied = apartment.tenants.length > 0 || apartment.owner !== null;
      const tenant = apartment.tenants.length > 0 ? apartment.tenants[0] : null;

      return {
        id: apartment.id,
        unit: apartment.unit,
        floor: apartment.floor,
        areaM2: apartment.areaM2,
        observations: apartment.observations,
        rooms: apartment.rooms,
        isOccupied,
        owner: apartment.owner,
        tenant,
        _count: {
          users: 1 + apartment.tenants.length,
          tenants: apartment.tenants.length
        }
      };
    });

    console.log(`[ADMIN APARTMENTS] Retrieved ${formattedApartments.length} apartments`);

    res.json({
      apartments: formattedApartments,
      totalCount: formattedApartments.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ADMIN APARTMENTS ERROR]', error);
    res.status(500).json({ 
      message: 'Error al obtener la lista de apartamentos'
    });
  }
};

export const getApartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'ID del apartamento es requerido' });
    }
    
    const apartment = await prisma.apartment.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tenants: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!apartment) {
      return res.status(404).json({ message: 'Apartamento no encontrado' });
    }

    res.json(apartment);
  } catch (error) {
    console.error('Error fetching apartment:', error);
    res.status(500).json({ 
      message: 'Error al obtener el apartamento',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
