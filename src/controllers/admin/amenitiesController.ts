import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

export const createAmenity = async (req: Request, res: Response) => {
  try {
    const {
      name,
      capacity,
      maxDuration,
      openTime,
      closeTime,
      isActive,
      requiresApproval
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    if (capacity === undefined || capacity === null) {
      return res.status(400).json({ message: "La capacidad es requerida" });
    }

    if (typeof capacity !== "number" || capacity < 1) {
      return res.status(400).json({ message: "La capacidad debe ser un número mayor a 0" });
    }

    if (maxDuration === undefined || maxDuration === null) {
      return res.status(400).json({ message: "La duración máxima es requerida" });
    }

    if (typeof maxDuration !== "number" || maxDuration < 1) {
      return res.status(400).json({ message: "La duración máxima debe ser un número mayor a 0" });
    }

    if (!openTime || typeof openTime !== "string" || !/^\d{2}:\d{2}$/.test(openTime)) {
      return res.status(400).json({ message: "openTime debe estar en formato HH:MM" });
    }

    if (!closeTime || typeof closeTime !== "string" || !/^\d{2}:\d{2}$/.test(closeTime)) {
      return res.status(400).json({ message: "closeTime debe estar en formato HH:MM" });
    }

    const [openHour, openMinute] = openTime.split(":").map(Number);
    const [closeHour, closeMinute] = closeTime.split(":").map(Number);

    if (openHour < 0 || openHour > 23 || openMinute < 0 || openMinute > 59) {
      return res.status(400).json({ message: "openTime tiene valores inválidos" });
    }

    if (closeHour < 0 || closeHour > 23 || closeMinute < 0 || closeMinute > 59) {
      return res.status(400).json({ message: "closeTime tiene valores inválidos" });
    }

    const openInMinutes = openHour * 60 + openMinute;
    const closeInMinutes = closeHour * 60 + closeMinute;

    if (openInMinutes >= closeInMinutes) {
      return res.status(400).json({ message: "openTime debe ser anterior a closeTime" });
    }

    const existing = await prisma.amenity.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } }
    });

    if (existing) {
      return res.status(400).json({ message: "Ya existe una amenity con ese nombre" });
    }

    const amenity = await prisma.amenity.create({
      data: {
        name: name.trim(),
        capacity,
        maxDuration,
        openTime,
        closeTime,
        isActive: typeof isActive === "boolean" ? isActive : true,
        requiresApproval: typeof requiresApproval === "boolean" ? requiresApproval : false
      }
    });

    console.log(`[ADMIN] Created amenity: ${amenity.name}`);
    res.status(201).json(amenity);

  } catch (error) {
    console.error("❌ [ADMIN CREATE AMENITY ERROR]", error);
    res.status(500).json({ message: "Error al crear la amenity" });
  }
};


export const updateAmenity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      capacity,
      maxDuration,
      openTime,
      closeTime,
      isActive,
      requiresApproval
    } = req.body;

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ message: "ID de amenity inválido" });
    }

    const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
    if (!amenity) {
      return res.status(404).json({ message: "Amenity no encontrado" });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ message: "El nombre no puede estar vacío" });
      }

      const existing = await prisma.amenity.findFirst({
        where: {
          name: { equals: name.trim(), mode: "insensitive" },
          id: { not: amenityId }
        }
      });

      if (existing) {
        return res.status(400).json({ message: "Ya existe otra amenity con ese nombre" });
      }
    }

    if (capacity !== undefined) {
      if (typeof capacity !== "number" || capacity < 1) {
        return res.status(400).json({ message: "La capacidad debe ser un número mayor a 0" });
      }
    }

    if (maxDuration !== undefined) {
      if (typeof maxDuration !== "number" || maxDuration < 1) {
        return res.status(400).json({ message: "La duración máxima debe ser un número mayor a 0" });
      }
    }

    if (openTime !== undefined) {
      if (typeof openTime !== "string" || !/^\d{2}:\d{2}$/.test(openTime)) {
        return res.status(400).json({ message: "openTime debe estar en formato HH:MM" });
      }

      const [openHour, openMinute] = openTime.split(":").map(Number);
      if (openHour < 0 || openHour > 23 || openMinute < 0 || openMinute > 59) {
        return res.status(400).json({ message: "openTime tiene valores inválidos" });
      }
    }

    if (closeTime !== undefined) {
      if (typeof closeTime !== "string" || !/^\d{2}:\d{2}$/.test(closeTime)) {
        return res.status(400).json({ message: "closeTime debe estar en formato HH:MM" });
      }

      const [closeHour, closeMinute] = closeTime.split(":").map(Number);
      if (closeHour < 0 || closeHour > 23 || closeMinute < 0 || closeMinute > 59) {
        return res.status(400).json({ message: "closeTime tiene valores inválidos" });
      }
    }

    const finalOpenTime = openTime ?? amenity.openTime;
    const finalCloseTime = closeTime ?? amenity.closeTime;

    const [openHour, openMinute] = finalOpenTime.split(":").map(Number);
    const [closeHour, closeMinute] = finalCloseTime.split(":").map(Number);

    const openInMinutes = openHour * 60 + openMinute;
    const closeInMinutes = closeHour * 60 + closeMinute;

    if (openInMinutes >= closeInMinutes) {
      return res.status(400).json({ message: "openTime debe ser anterior a closeTime" });
    }

    const updated = await prisma.amenity.update({
      where: { id: amenityId },
      data: {
        name: name?.trim(),
        capacity,
        maxDuration,
        openTime,
        closeTime,
        isActive,
        requiresApproval
      }
    });

    console.log(`[ADMIN] Updated amenity: ${updated.name}`);
    res.json(updated);

  } catch (error) {
    console.error("❌ [ADMIN UPDATE AMENITY ERROR]", error);
    res.status(500).json({ message: "Error al actualizar la amenity" });
  }
};

export const deleteAmenity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ message: "ID de amenity inválido" });
    }

    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      include: {
        _count: {
          select: { reservations: true }
        }
      }
    });

    if (!amenity) {
      return res.status(404).json({ message: "Amenity no encontrado" });
    }

    await prisma.$transaction([
      prisma.reservation.deleteMany({
        where: { amenityId }
      }),
      prisma.amenity.delete({
        where: { id: amenityId }
      })
    ]);

    console.log(`[ADMIN] Deleted amenity: ${amenity.name} (${amenity._count.reservations} reservations removed)`);

    res.json({
      message: "Amenity eliminado exitosamente",
      deletedReservations: amenity._count.reservations
    });

  } catch (error) {
    console.error("❌ [ADMIN DELETE AMENITY ERROR]", error);
    res.status(500).json({ message: "Error al eliminar la amenity" });
  }
};


export const getAmenityDetailReservations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, limit = "50" } = req.query;

    const amenityId = parseInt(id || "");
    if (isNaN(amenityId)) {
      return res.status(400).json({ message: "ID de amenity inválido" });
    }

    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      select: { id: true, name: true, capacity: true, maxDuration: true }
    });

    if (!amenity) {
      return res.status(404).json({ message: "Amenity no encontrado" });
    }

    const where: any = { amenityId };

    if (status === "active") {
      where.status = { name: "confirmada" };
      where.endTime = { gte: new Date() };
    } else if (status) {
      where.status = { name: status };
    }

    const maxLimit = Math.min(parseInt(limit as string) || 50, 200);

    const [reservations, totalCount] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              apartment: { select: { unit: true, floor: true } }
            }
          },
          status: true
        },
        orderBy: { startTime: "desc" },
        take: maxLimit
      }),
      prisma.reservation.count({ where })
    ]);

    const formattedReservations = reservations.map(r => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status.name,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        apartment: r.user.apartment
      }
    }));

    console.log(`[ADMIN] Retrieved ${formattedReservations.length} reservations for ${amenity.name}`);

    res.json({
      reservations: formattedReservations,
      amenityName: amenity.name,
      amenityId: amenity.id,
      totalCount,
      filters: { status, limit: maxLimit }
    });

  } catch (error) {
    console.error("❌ [ADMIN AMENITY RESERVATIONS ERROR]", error);
    res.status(500).json({ message: "Error al obtener las reservas del amenity" });
  }
};
