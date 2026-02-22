import { Request, Response } from "express";
import { prisma } from "../prismaClient";

const MAX_HOURS = 48;

/** Marca como "vencida" cualquier reserva activa cuyo endTime ya pasó */
async function expireOldReservations() {
  await prisma.visitorParking.updateMany({
    where: {
      status: "activa",
      endTime: { lt: new Date() },
    },
    data: { status: "vencida" },
  });
}

// ─── TENANT ───────────────────────────────────────────────────────────────────

/**
 * GET /visitor-parking/garages-available
 * Devuelve las cocheras visitante activas que no tienen reserva activa
 * solapante con el rango startTime–endTime enviado por query.
 */
export const getAvailableVisitorGarages = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const { startTime, endTime } = req.query as { startTime?: string; endTime?: string };

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "startTime y endTime son requeridos" });
    }

    const start = new Date(startTime);
    const end   = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Fechas inválidas" });
    }

    // Cocheras tipo "visitante" activas que NO tienen solapamiento en ese rango
    const garages = await prisma.garage.findMany({
      where: {
        type:   "visitante",
        status: "activa",
        visitorParkings: {
          none: {
            status: "activa",
            startTime: { lt: end },
            endTime:   { gt: start },
          },
        },
      },
      select: { id: true, number: true, location: true },
      orderBy: { number: "asc" },
    });

    res.json(garages);
  } catch (error) {
    console.error("❌ [VISITOR PARKING - available garages]", error);
    res.status(500).json({ message: "Error al obtener cocheras disponibles" });
  }
};

/**
 * POST /visitor-parking
 * Crea una reserva temporal de cochera visitante.
 */
export const createVisitorParking = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const userId = (req as any).user?.id;
    const { garageId, licensePlate, visitorName, startTime, endTime } = req.body;

    if (!garageId || !licensePlate || !startTime || !endTime) {
      return res.status(400).json({
        message: "garageId, licensePlate, startTime y endTime son requeridos",
      });
    }

    const start = new Date(startTime);
    const end   = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Fechas inválidas" });
    }

    if (end <= start) {
      return res.status(400).json({ message: "endTime debe ser posterior a startTime" });
    }

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > MAX_HOURS) {
      return res.status(400).json({ message: `La duración máxima es de ${MAX_HOURS} horas` });
    }

    if (start < new Date()) {
      return res.status(400).json({ message: "startTime no puede ser en el pasado" });
    }

    // Verificar que el usuario tiene un apartamento
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { apartmentId: true },
    });

    if (!user?.apartmentId) {
      return res.status(403).json({ message: "No tenés un departamento asignado" });
    }

    const apartmentId = user.apartmentId;

    // Verificar que el departamento no tiene ya una reserva activa en ese rango
    const existingForApartment = await prisma.visitorParking.findFirst({
      where: {
        apartmentId,
        status: "activa",
        startTime: { lt: end },
        endTime:   { gt: start },
      },
    });

    if (existingForApartment) {
      return res.status(409).json({
        message: "Tu departamento ya tiene una reserva de cochera visitante activa en ese horario",
      });
    }

    // Verificar que la cochera existe, es de tipo visitante y está activa
    const garage = await prisma.garage.findUnique({ where: { id: Number(garageId) } });

    if (!garage) {
      return res.status(404).json({ message: "Cochera no encontrada" });
    }
    if (garage.type !== "visitante") {
      return res.status(400).json({ message: "Solo se pueden reservar cocheras de tipo visitante" });
    }
    if (garage.status !== "activa") {
      return res.status(400).json({ message: "La cochera no está disponible" });
    }

    // Verificar solapamiento en la cochera elegida
    const overlap = await prisma.visitorParking.findFirst({
      where: {
        garageId: Number(garageId),
        status:   "activa",
        startTime: { lt: end },
        endTime:   { gt: start },
      },
    });

    if (overlap) {
      return res.status(409).json({ message: "Esa cochera ya está reservada en el horario seleccionado" });
    }

    const reservation = await prisma.visitorParking.create({
      data: {
        garageId:     Number(garageId),
        apartmentId,
        requestedById: userId,
        licensePlate: licensePlate.trim().toUpperCase(),
        visitorName:  visitorName?.trim() || null,
        startTime:    start,
        endTime:      end,
        status:       "activa",
      },
      include: {
        garage: { select: { id: true, number: true, location: true } },
      },
    });

    console.log(`[VISITOR PARKING] Reserva creada: depto ${apartmentId}, cochera ${garage.number}, patente ${reservation.licensePlate}`);
    res.status(201).json(reservation);
  } catch (error) {
    console.error("❌ [CREATE VISITOR PARKING]", error);
    res.status(500).json({ message: "Error al crear la reserva" });
  }
};

/**
 * GET /visitor-parking/my
 * Devuelve las reservas de cochera visitante del departamento del usuario autenticado.
 * Incluye activas + las últimas 10 canceladas/vencidas.
 */
export const getMyVisitorParkings = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const userId = (req as any).user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { apartmentId: true },
    });

    if (!user?.apartmentId) {
      return res.json([]);
    }

    const reservations = await prisma.visitorParking.findMany({
      where: { apartmentId: user.apartmentId },
      include: {
        garage:     { select: { id: true, number: true, location: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json(reservations);
  } catch (error) {
    console.error("❌ [GET MY VISITOR PARKINGS]", error);
    res.status(500).json({ message: "Error al obtener las reservas" });
  }
};

/**
 * DELETE /visitor-parking/:id
 * Cancela una reserva activa. Solo el usuario del mismo departamento puede cancelarla.
 */
export const cancelVisitorParking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const id     = parseInt(req.params.id);

    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { apartmentId: true },
    });

    if (!user?.apartmentId) {
      return res.status(403).json({ message: "No tenés un departamento asignado" });
    }

    const reservation = await prisma.visitorParking.findUnique({ where: { id } });

    if (!reservation) {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }

    if (reservation.apartmentId !== user.apartmentId) {
      return res.status(403).json({ message: "No tenés permiso para cancelar esta reserva" });
    }

    if (reservation.status !== "activa") {
      return res.status(400).json({ message: "Solo se pueden cancelar reservas activas" });
    }

    const updated = await prisma.visitorParking.update({
      where: { id },
      data:  { status: "cancelada" },
      include: { garage: { select: { id: true, number: true, location: true } } },
    });

    console.log(`[VISITOR PARKING] Reserva ${id} cancelada por usuario ${userId}`);
    res.json(updated);
  } catch (error) {
    console.error("❌ [CANCEL VISITOR PARKING]", error);
    res.status(500).json({ message: "Error al cancelar la reserva" });
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /admin/visitor-parking
 * Lista todas las reservas (para vista de administrador).
 */
export const adminGetAllVisitorParkings = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const reservations = await prisma.visitorParking.findMany({
      include: {
        garage:      { select: { id: true, number: true, location: true } },
        apartment:   { select: { id: true, unit: true, floor: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(reservations);
  } catch (error) {
    console.error("❌ [ADMIN GET VISITOR PARKINGS]", error);
    res.status(500).json({ message: "Error al obtener las reservas" });
  }
};
