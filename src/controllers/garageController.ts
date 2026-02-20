import { Request, Response } from "express";
import { prisma } from "../prismaClient";

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/** GET /admin/garages — todas las cocheras con su unidad asignada */
export const getAllGarages = async (req: Request, res: Response) => {
  try {
    const garages = await prisma.garage.findMany({
      include: {
        apartment: {
          select: { id: true, unit: true, floor: true }
        },
        _count: { select: { vehicles: true } }
      },
      orderBy: { number: "asc" }
    });

    const formatted = garages.map(g => ({
      id:          g.id,
      number:      g.number,
      location:    g.location,
      type:        g.type,
      status:      g.status,
      apartment:   g.apartment ?? null,
      vehicleCount: g._count.vehicles,
      createdAt:   g.createdAt,
    }));

    console.log(`[ADMIN] Retrieved ${formatted.length} garages`);
    res.json(formatted);
  } catch (error) {
    console.error("❌ [GET ALL GARAGES ERROR]", error);
    res.status(500).json({ message: "Error al obtener las cocheras" });
  }
};

/** POST /admin/garages — crear cochera */
export const createGarage = async (req: Request, res: Response) => {
  try {
    const { number, location, type, status, apartmentId } = req.body;

    if (!number || !type || !status) {
      return res.status(400).json({ message: "number, type y status son requeridos" });
    }

    const validTypes   = ["fija", "cortesia", "visitante"];
    const validStatuses = ["activa", "fuera_de_uso"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `type debe ser: ${validTypes.join(", ")}` });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `status debe ser: ${validStatuses.join(", ")}` });
    }

    const existing = await prisma.garage.findFirst({ where: { number } });
    if (existing) {
      return res.status(409).json({ message: `Ya existe una cochera con el número "${number}"` });
    }

    if (apartmentId) {
      const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment) {
        return res.status(404).json({ message: "El apartamento indicado no existe" });
      }
    }

    const garage = await prisma.garage.create({
      data: {
        number,
        location: location ?? null,
        type,
        status,
        apartmentId: apartmentId ?? null,
      },
      include: {
        apartment: { select: { id: true, unit: true, floor: true } }
      }
    });

    console.log(`[ADMIN] Garage created: ${garage.number}`);
    res.status(201).json(garage);
  } catch (error) {
    console.error("❌ [CREATE GARAGE ERROR]", error);
    res.status(500).json({ message: "Error al crear la cochera" });
  }
};

/** PUT /admin/garages/:id — editar cochera */
export const updateGarage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const { number, location, type, status, apartmentId } = req.body;

    const existing = await prisma.garage.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Cochera no encontrada" });

    const validTypes    = ["fija", "cortesia", "visitante"];
    const validStatuses = ["activa", "fuera_de_uso"];

    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ message: `type debe ser: ${validTypes.join(", ")}` });
    }
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `status debe ser: ${validStatuses.join(", ")}` });
    }

    // Si cambia el número, verificar que no exista otro con el mismo
    if (number && number !== existing.number) {
      const duplicate = await prisma.garage.findFirst({ where: { number } });
      if (duplicate) {
        return res.status(409).json({ message: `Ya existe una cochera con el número "${number}"` });
      }
    }

    if (apartmentId !== undefined && apartmentId !== null) {
      const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment) {
        return res.status(404).json({ message: "El apartamento indicado no existe" });
      }
    }

    const garage = await prisma.garage.update({
      where: { id },
      data: {
        ...(number      !== undefined && { number }),
        ...(location    !== undefined && { location }),
        ...(type        !== undefined && { type }),
        ...(status      !== undefined && { status }),
        ...(apartmentId !== undefined && { apartmentId: apartmentId ?? null }),
      },
      include: {
        apartment: { select: { id: true, unit: true, floor: true } }
      }
    });

    console.log(`[ADMIN] Garage updated: ${garage.number}`);
    res.json(garage);
  } catch (error) {
    console.error("❌ [UPDATE GARAGE ERROR]", error);
    res.status(500).json({ message: "Error al actualizar la cochera" });
  }
};

/** DELETE /admin/garages/:id — eliminar cochera */
export const deleteGarage = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const existing = await prisma.garage.findUnique({
      where: { id },
      include: { _count: { select: { vehicles: true } } }
    });
    if (!existing) return res.status(404).json({ message: "Cochera no encontrada" });

    if (existing._count.vehicles > 0) {
      return res.status(409).json({
        message: "No se puede eliminar una cochera con vehículos asignados. Desasigná los vehículos primero."
      });
    }

    await prisma.garage.delete({ where: { id } });

    console.log(`[ADMIN] Garage deleted: ${existing.number}`);
    res.json({ message: "Cochera eliminada correctamente" });
  } catch (error) {
    console.error("❌ [DELETE GARAGE ERROR]", error);
    res.status(500).json({ message: "Error al eliminar la cochera" });
  }
};

// ─── TENANT ───────────────────────────────────────────────────────────────────

/** GET /garages/my — cocheras asignadas al apartamento del usuario logueado */
export const getMyGarages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { apartmentId: true }
    });

    if (!user?.apartmentId) {
      return res.json([]);
    }

    const garages = await prisma.garage.findMany({
      where: { apartmentId: user.apartmentId },
      include: {
        vehicles: {
          where: { userId },
          select: { id: true, licensePlate: true, brand: true, model: true, color: true }
        }
      },
      orderBy: { number: "asc" }
    });

    console.log(`[USER:${userId}] Retrieved ${garages.length} garages`);
    res.json(garages);
  } catch (error) {
    console.error("❌ [GET MY GARAGES ERROR]", error);
    res.status(500).json({ message: "Error al obtener las cocheras" });
  }
};
