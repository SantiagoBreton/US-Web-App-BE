import { Request, Response } from "express";
import { prisma } from "../prismaClient";

const MAX_HOURS = 8;

/** Marca como "vencida" cualquier reserva activa cuyo endTime ya pasó */
async function expireOldReservations() {
  await prisma.cortesiaReservation.updateMany({
    where: { status: "activa", endTime: { lt: new Date() } },
    data:  { status: "vencida" },
  });
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /admin/cortesia-reservations
 * Lista todas las reservas de cocheras de cortesía.
 */
export const getAllCortesiaReservations = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const reservations = await prisma.cortesiaReservation.findMany({
      include: {
        garage:    { select: { id: true, number: true, location: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(reservations);
  } catch (error) {
    console.error("❌ [GET CORTESIA RESERVATIONS ERROR]", error);
    res.status(500).json({ message: "Error al obtener las reservas de cortesía" });
  }
};

/**
 * POST /admin/cortesia-reservations
 * Crea una reserva temporal de cochera de cortesía (admin only).
 * Campos requeridos: garageId, personName, reason, startTime, endTime
 * Máximo 8 horas de duración.
 */
export const createCortesiaReservation = async (req: Request, res: Response) => {
  try {
    await expireOldReservations();

    const adminId = (req as any).user?.id;
    const { garageId, personName, licensePlate, reason, startTime, endTime } = req.body;

    // ── validaciones básicas ──────────────────────────────────────────────
    if (!garageId || !personName?.trim() || !reason?.trim() || !startTime || !endTime) {
      return res.status(400).json({
        message: "garageId, personName, reason, startTime y endTime son requeridos",
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

    // ── verificar que la cochera existe y es de cortesía ──────────────────
    const garage = await prisma.garage.findUnique({ where: { id: Number(garageId) } });
    if (!garage) {
      return res.status(404).json({ message: "Cochera no encontrada" });
    }
    if (garage.type !== "cortesia") {
      return res.status(400).json({ message: "Solo se pueden reservar cocheras de tipo Cortesía" });
    }
    if (garage.status === "fuera_de_uso") {
      return res.status(400).json({ message: "La cochera está fuera de uso" });
    }

    // ── verificar solapamiento con otras reservas activas ─────────────────
    const overlap = await prisma.cortesiaReservation.findFirst({
      where: {
        garageId: Number(garageId),
        status:   "activa",
        startTime: { lt: end },
        endTime:   { gt: start },
      },
    });
    if (overlap) {
      return res.status(409).json({ message: "La cochera ya tiene una reserva activa en ese horario" });
    }

    // ── crear reserva ─────────────────────────────────────────────────────
    const reservation = await prisma.cortesiaReservation.create({
      data: {
        garageId:     Number(garageId),
        createdById:  adminId,
        personName:   personName.trim(),
        licensePlate: licensePlate?.trim() || null,
        reason:       reason.trim(),
        startTime:    start,
        endTime:      end,
      },
      include: {
        garage:    { select: { id: true, number: true, location: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    console.log(`[CORTESIA] Admin ${adminId} reservó cochera ${garage.number} para "${personName}"`);
    res.status(201).json(reservation);
  } catch (error) {
    console.error("❌ [CREATE CORTESIA RESERVATION ERROR]", error);
    res.status(500).json({ message: "Error al crear la reserva de cortesía" });
  }
};

/**
 * DELETE /admin/cortesia-reservations/:id
 * Cancela una reserva de cortesía.
 */
export const cancelCortesiaReservation = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const reservation = await prisma.cortesiaReservation.findUnique({ where: { id } });
    if (!reservation) return res.status(404).json({ message: "Reserva no encontrada" });
    if (reservation.status !== "activa") {
      return res.status(400).json({ message: "Solo se pueden cancelar reservas activas" });
    }

    const updated = await prisma.cortesiaReservation.update({
      where: { id },
      data:  { status: "cancelada" },
      include: {
        garage:    { select: { id: true, number: true, location: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    console.log(`[CORTESIA] Reserva ${id} cancelada`);
    res.json(updated);
  } catch (error) {
    console.error("❌ [CANCEL CORTESIA RESERVATION ERROR]", error);
    res.status(500).json({ message: "Error al cancelar la reserva" });
  }
};
