import { Request, Response } from "express";
import { prisma } from "../prismaClient";

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/** GET /admin/vehicles — todos los vehículos del edificio con filtros opcionales */
export const getAllVehicles = async (req: Request, res: Response) => {
  try {
    const { garageId, apartmentId, licensePlate } = req.query;

    const vehicles = await prisma.vehicle.findMany({
      where: {
        ...(garageId     && { garageId:     parseInt(garageId as string) }),
        ...(licensePlate && { licensePlate: { contains: (licensePlate as string).toUpperCase(), mode: "insensitive" } }),
        ...(apartmentId  && {
          user: {
            apartmentId: parseInt(apartmentId as string)
          }
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, apartmentId: true,
            apartment: { select: { id: true, unit: true, floor: true } }
          }
        },
        garage: {
          select: { id: true, number: true, location: true, type: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`[ADMIN] Retrieved ${vehicles.length} vehicles`);
    res.json(vehicles);
  } catch (error) {
    console.error("❌ [GET ALL VEHICLES ERROR]", error);
    res.status(500).json({ message: "Error al obtener los vehículos" });
  }
};

// ─── TENANT ───────────────────────────────────────────────────────────────────

/** GET /vehicles/my — vehículos del usuario logueado */
export const getMyVehicles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      include: {
        garage: {
          select: { id: true, number: true, location: true, type: true, status: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`[USER:${userId}] Retrieved ${vehicles.length} vehicles`);
    res.json(vehicles);
  } catch (error) {
    console.error("❌ [GET MY VEHICLES ERROR]", error);
    res.status(500).json({ message: "Error al obtener los vehículos" });
  }
};

/** POST /vehicles — registrar nuevo vehículo */
export const createVehicle = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { licensePlate, brand, model, color, garageId } = req.body;

    if (!licensePlate || !brand || !model || !color) {
      return res.status(400).json({ message: "licensePlate, brand, model y color son requeridos" });
    }

    // Verificar que la patente no esté ya registrada
    const existing = await prisma.vehicle.findFirst({
      where: { licensePlate: licensePlate.toUpperCase() }
    });
    if (existing) {
      return res.status(409).json({ message: `Ya existe un vehículo con la patente "${licensePlate.toUpperCase()}"` });
    }

    // Si se indica cochera, verificar que exista, esté activa y no tenga otro auto
    if (garageId) {
      const garage = await prisma.garage.findUnique({ where: { id: garageId } });
      if (!garage) {
        return res.status(404).json({ message: "La cochera indicada no existe" });
      }
      if (garage.status === "fuera_de_uso") {
        return res.status(400).json({ message: "No se puede asignar un vehículo a una cochera fuera de uso" });
      }
      const occupied = await prisma.vehicle.findFirst({ where: { garageId } });
      if (occupied) {
        return res.status(409).json({ message: `La cochera ${garage.number} ya está ocupada por otro vehículo (${occupied.licensePlate})` });
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: licensePlate.toUpperCase(),
        brand,
        model,
        color,
        userId,
        garageId: garageId ?? null,
      },
      include: {
        garage: { select: { id: true, number: true, location: true, type: true } }
      }
    });

    console.log(`[USER:${userId}] Vehicle created: ${vehicle.licensePlate}`);
    res.status(201).json(vehicle);
  } catch (error) {
    console.error("❌ [CREATE VEHICLE ERROR]", error);
    res.status(500).json({ message: "Error al crear el vehículo" });
  }
};

/** PUT /vehicles/:id — editar vehículo propio */
export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const userId  = (req as any).user?.id;
    const id      = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const { licensePlate, brand, model, color, garageId } = req.body;

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing)           return res.status(404).json({ message: "Vehículo no encontrado" });
    if (existing.userId !== userId) return res.status(403).json({ message: "No podés editar un vehículo que no te pertenece" });

    // Si cambia la patente, verificar unicidad
    if (licensePlate && licensePlate.toUpperCase() !== existing.licensePlate) {
      const duplicate = await prisma.vehicle.findFirst({ where: { licensePlate: licensePlate.toUpperCase() } });
      if (duplicate) {
        return res.status(409).json({ message: `Ya existe un vehículo con la patente "${licensePlate.toUpperCase()}"` });
      }
    }

    if (garageId) {
      const garage = await prisma.garage.findUnique({ where: { id: garageId } });
      if (!garage) return res.status(404).json({ message: "La cochera indicada no existe" });
      if (garage.status === "fuera_de_uso") {
        return res.status(400).json({ message: "No se puede asignar un vehículo a una cochera fuera de uso" });
      }
      // Permitir que el mismo vehículo retenga su cochera actual
      if (garageId !== existing.garageId) {
        const occupied = await prisma.vehicle.findFirst({ where: { garageId } });
        if (occupied) {
          return res.status(409).json({ message: `La cochera ${garage.number} ya está ocupada por otro vehículo (${occupied.licensePlate})` });
        }
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(licensePlate !== undefined && { licensePlate: licensePlate.toUpperCase() }),
        ...(brand        !== undefined && { brand }),
        ...(model        !== undefined && { model }),
        ...(color        !== undefined && { color }),
        ...(garageId     !== undefined && { garageId: garageId ?? null }),
      },
      include: {
        garage: { select: { id: true, number: true, location: true, type: true } }
      }
    });

    console.log(`[USER:${userId}] Vehicle updated: ${vehicle.licensePlate}`);
    res.json(vehicle);
  } catch (error) {
    console.error("❌ [UPDATE VEHICLE ERROR]", error);
    res.status(500).json({ message: "Error al actualizar el vehículo" });
  }
};

/** DELETE /vehicles/:id — eliminar vehículo propio */
export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id     = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing)           return res.status(404).json({ message: "Vehículo no encontrado" });
    if (existing.userId !== userId) return res.status(403).json({ message: "No podés eliminar un vehículo que no te pertenece" });

    await prisma.vehicle.delete({ where: { id } });

    console.log(`[USER:${userId}] Vehicle deleted: ${existing.licensePlate}`);
    res.json({ message: "Vehículo eliminado correctamente" });
  } catch (error) {
    console.error("❌ [DELETE VEHICLE ERROR]", error);
    res.status(500).json({ message: "Error al eliminar el vehículo" });
  }
};
