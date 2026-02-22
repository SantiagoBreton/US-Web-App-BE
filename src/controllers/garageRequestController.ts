import { Request, Response } from "express";
import { prisma } from "../prismaClient";

/** GET /garage-requests/available — cocheras libres (sin unidad asignada, activas, no visitante) */
export const getAvailableGaragesForRequest = async (req: Request, res: Response) => {
  try {
    const garages = await prisma.garage.findMany({
      where: { apartmentId: null, status: "activa", type: "fija" },
      select: { id: true, number: true, location: true, type: true },
      orderBy: { number: "asc" },
    });
    res.json(garages);
  } catch (error) {
    console.error("❌ [GET AVAILABLE GARAGES ERROR]", error);
    res.status(500).json({ message: "Error al obtener cocheras disponibles" });
  }
};

// ─── TENANT ───────────────────────────────────────────────────────────────────

/** POST /garage-requests — crear solicitud de cochera nueva o cambio */
export const createGarageRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { type, currentGarageId, requestedGarageId, reason } = req.body;

    if (!type || !["nueva", "cambio"].includes(type)) {
      return res.status(400).json({ message: "El tipo debe ser 'nueva' o 'cambio'" });
    }
    if (type === "cambio" && !currentGarageId) {
      return res.status(400).json({ message: "Para solicitar un cambio debés indicar la cochera actual" });
    }

    // Solo una solicitud pendiente por usuario
    const existing = await prisma.garageRequest.findFirst({
      where: { userId, status: "pendiente" },
    });
    if (existing) {
      return res.status(409).json({ message: "Ya tenés una solicitud pendiente. Esperá a que el administrador la resuelva." });
    }

    // Si se pide una cochera específica, verificar que esté libre y activa
    if (requestedGarageId) {
      const garage = await prisma.garage.findUnique({ where: { id: Number(requestedGarageId) } });
      if (!garage) return res.status(404).json({ message: "La cochera solicitada no existe" });
      if (garage.status === "fuera_de_uso") {
        return res.status(400).json({ message: "Esa cochera está fuera de uso" });
      }
      if (garage.apartmentId !== null) {
        return res.status(409).json({ message: "Esa cochera ya está asignada a otra unidad" });
      }
    }

    const request = await prisma.garageRequest.create({
      data: {
        userId,
        type,
        currentGarageId: currentGarageId ? Number(currentGarageId) : null,
        requestedGarageId: requestedGarageId ? Number(requestedGarageId) : null,
        reason: reason?.trim() || null,
      },
      include: {
        currentGarage:   { select: { id: true, number: true, location: true } },
        requestedGarage: { select: { id: true, number: true, location: true } },
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error("❌ [CREATE GARAGE REQUEST ERROR]", error);
    res.status(500).json({ message: "Error al crear la solicitud" });
  }
};

/** GET /garage-requests/my — solicitudes del usuario logueado */
export const getMyGarageRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const requests = await prisma.garageRequest.findMany({
      where: { userId },
      include: {
        currentGarage:   { select: { id: true, number: true, location: true } },
        requestedGarage: { select: { id: true, number: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (error) {
    console.error("❌ [GET MY GARAGE REQUESTS ERROR]", error);
    res.status(500).json({ message: "Error al obtener tus solicitudes" });
  }
};

/** DELETE /garage-requests/:id — cancelar solicitud pendiente propia */
export const cancelGarageRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const request = await prisma.garageRequest.findUnique({ where: { id } });
    if (!request)               return res.status(404).json({ message: "Solicitud no encontrada" });
    if (request.userId !== userId) return res.status(403).json({ message: "No podés cancelar una solicitud que no te pertenece" });
    if (request.status !== "pendiente") return res.status(400).json({ message: "Solo podés cancelar solicitudes pendientes" });

    await prisma.garageRequest.delete({ where: { id } });
    res.json({ message: "Solicitud cancelada" });
  } catch (error) {
    console.error("❌ [CANCEL GARAGE REQUEST ERROR]", error);
    res.status(500).json({ message: "Error al cancelar la solicitud" });
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/** GET /garage-requests/admin/all — todas las solicitudes */
export const adminGetAllGarageRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const requests = await prisma.garageRequest.findMany({
      where: status ? { status: status as string } : undefined,
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            apartment: { select: { id: true, unit: true, floor: true } },
          },
        },
        currentGarage:   { select: { id: true, number: true, location: true } },
        requestedGarage: { select: { id: true, number: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests);
  } catch (error) {
    console.error("❌ [ADMIN GET GARAGE REQUESTS ERROR]", error);
    res.status(500).json({ message: "Error al obtener las solicitudes" });
  }
};

/** PUT /garage-requests/admin/:id/resolve — aprobar o rechazar */
export const adminResolveGarageRequest = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const { status, adminNote } = req.body;
    if (!["aprobada", "rechazada"].includes(status)) {
      return res.status(400).json({ message: "El estado debe ser 'aprobada' o 'rechazada'" });
    }

    const request = await prisma.garageRequest.findUnique({
      where: { id },
      include: { user: { select: { apartmentId: true } } },
    });
    if (!request)                    return res.status(404).json({ message: "Solicitud no encontrada" });
    if (request.status !== "pendiente") return res.status(400).json({ message: "Solo se pueden resolver solicitudes pendientes" });

    // Si se aprueba, asignar la cochera solicitada al apartamento
    if (status === "aprobada" && request.requestedGarageId) {
      const garage = await prisma.garage.findUnique({ where: { id: request.requestedGarageId } });
      if (!garage) return res.status(404).json({ message: "La cochera solicitada ya no existe" });
      if (garage.status === "fuera_de_uso") {
        return res.status(400).json({ message: "Esa cochera está fuera de uso y no puede asignarse" });
      }
      if (garage.apartmentId !== null && garage.apartmentId !== request.user.apartmentId) {
        return res.status(409).json({ message: "Esa cochera ya fue asignada a otra unidad recientemente" });
      }

      const apartmentId = request.user.apartmentId;
      if (!apartmentId) return res.status(400).json({ message: "El usuario no tiene apartamento asignado" });

      // Si es un cambio, desasignar la cochera antigua y mover el vehículo a la nueva
      if (request.type === "cambio" && request.currentGarageId) {
        // Mover el vehículo de la cochera antigua a la nueva (si existe)
        await prisma.vehicle.updateMany({
          where: { garageId: request.currentGarageId },
          data:  { garageId: request.requestedGarageId },
        });
        // Desasignar la cochera antigua del apartamento
        await prisma.garage.update({
          where: { id: request.currentGarageId },
          data:  { apartmentId: null },
        });
      }

      // Asignar la nueva cochera al apartamento
      await prisma.garage.update({
        where: { id: request.requestedGarageId },
        data: { apartmentId },
      });
    }

    const updated = await prisma.garageRequest.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true,
            apartment: { select: { id: true, unit: true, floor: true } },
          },
        },
        currentGarage:   { select: { id: true, number: true, location: true } },
        requestedGarage: { select: { id: true, number: true, location: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("❌ [ADMIN RESOLVE GARAGE REQUEST ERROR]", error);
    res.status(500).json({ message: "Error al resolver la solicitud" });
  }
};
