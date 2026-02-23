import type { Request, Response } from "express";
import { prisma } from "../../prismaClient";

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    console.log(`[ADMIN STATS] User ${(req as any).user.email} requesting system stats`);

    const [
      totalUsers,
      totalApartments,
      totalReservations,
      activeReservations,
      totalAmenities
    ] = await Promise.all([
      prisma.user.count(),
      prisma.apartment.count(),
      prisma.reservation.count(),
      prisma.reservation.count({
        where: {
          status: { name: "confirmada" },
          endTime: {
            gte: new Date()
          }
        }
      }),
      prisma.amenity.count()
    ]);

    const stats = {
      totalUsers,
      totalApartments,
      totalReservations,
      activeReservations,
      totalAmenities,
      generatedAt: new Date().toISOString()
    };

    console.log(`[ADMIN STATS] Stats generated successfully:`, stats);

    res.json(stats);
  } catch (error) {
    console.error("❌ [ADMIN STATS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching system statistics" 
    });
  }
};
