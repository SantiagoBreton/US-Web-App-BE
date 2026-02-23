import { Request, Response } from "express";
import { prisma } from "../prismaClient";

async function _fetchAmenities(includeReservationCount: boolean, onlyActive: boolean = false) {
  return await prisma.amenity.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    include: includeReservationCount ? {
      _count: {
        select: { reservations: true }
      }
    } : undefined,
    orderBy: { id: "asc" }
  });
}

export const getAmenities = async (req: Request, res: Response) => {
  try {
    const amenities = await prisma.amenity.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        capacity: true,
        maxDuration: true,
        openTime: true,
        closeTime: true,
        isActive: true,
        requiresApproval: true,
      },
      orderBy: { id: "asc" }
    });

    console.log(`[USER] Retrieved ${amenities.length} amenities`);
    res.json(amenities);

  } catch (error) {
    console.error("❌ [GET AMENITIES ERROR]", error);
    res.status(500).json({ message: "Error al obtener las amenities" });
  }
};

export const getAllAmenities = async (req: Request, res: Response) => {
  try {
    const amenities = await _fetchAmenities(true, false);

    const formatted = amenities.map(a => ({
      id: a.id,
      name: a.name,
      capacity: a.capacity,
      maxDuration: a.maxDuration,
      openTime: a.openTime,
      closeTime: a.closeTime,
      isActive: a.isActive,
      requiresApproval: a.requiresApproval,
      reservationCount: (a as any)._count?.reservations || 0
    }));

    console.log(`[ADMIN] Retrieved ${formatted.length} amenities`);
    res.json(formatted);

  } catch (error) {
    console.error("❌ [ADMIN GET AMENITIES ERROR]", error);
    res.status(500).json({ message: "Error al obtener las amenities" });
  }
};
