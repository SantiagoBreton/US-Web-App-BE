import type { Request, Response } from "express";
import { prisma } from "../prismaClient";
import { emailService } from "../services/emailService";
import { awardPoints, updateUserStats } from "./gamificationController";

export const createReservation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });

    const { amenityId, startTime, endTime } = req.body;
    if (!amenityId || !startTime || !endTime) {
      return res.status(400).json({ message: "Faltan parámetros" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Formato de fecha inválido" });
    }

    const amenity = await prisma.amenity.findUnique({ where: { id: amenityId } });
    if (!amenity) return res.status(404).json({ message: "Amenity no encontrada" });

    if (!amenity.isActive) {
      return res.status(400).json({ message: "Esta amenity no está disponible" });
    }

    // Validar horarios de operación (solo si están definidos)
    if (amenity.openTime && amenity.closeTime) {
      
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      // Parte de unificar horarios
      const argTimezone = 'America/Argentina/Buenos_Aires';
      
      const startLocalStr = startDate.toLocaleString('en-US', { 
        timeZone: argTimezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const endLocalStr = endDate.toLocaleString('en-US', { 
        timeZone: argTimezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const [startHourStr, startMinutesStr] = startLocalStr.split(':');
      const [endHourStr, endMinutesStr] = endLocalStr.split(':');
      
      const startHour = parseInt(startHourStr);
      const startMinutes = parseInt(startMinutesStr);
      const endHour = parseInt(endHourStr);
      const endMinutes = parseInt(endMinutesStr);

      const [openTimeHour, openTimeMin] = amenity.openTime.split(':').map(Number);
      const [closeTimeHour, closeTimeMin] = amenity.closeTime.split(':').map(Number);

      // pasar todo a minutos
      const startTimeInMinutes = startHour * 60 + startMinutes;
      const endTimeInMinutes = endHour * 60 + endMinutes;
      const openTimeInMinutes = openTimeHour * 60 + openTimeMin;
      const closeTimeInMinutes = closeTimeHour * 60 + closeTimeMin;

      console.log(`🕐 [OPERATING HOURS CHECK] ${amenity.name}`);
      console.log(`   UTC times: ${startDate.toISOString()} → ${endDate.toISOString()}`);
      console.log(`   Argentina times: ${startLocalStr} → ${endLocalStr}`);
      console.log(`   Operating hours: ${amenity.openTime} - ${amenity.closeTime}`);
      console.log(`   Validation: ${startTimeInMinutes} >= ${openTimeInMinutes} && ${endTimeInMinutes} <= ${closeTimeInMinutes}`);

      if (startTimeInMinutes < openTimeInMinutes || endTimeInMinutes > closeTimeInMinutes) {
        return res.status(400).json({ 
          message: `${amenity.name} solo está disponible de ${amenity.openTime} a ${amenity.closeTime}` 
        });
      }
    }

    const duration = (end.getTime() - start.getTime()) / 60000;
    if (duration > amenity.maxDuration) {
      return res.status(400).json({ message: `La duración máxima para ${amenity.name} es de ${amenity.maxDuration} minutos` });
    }

    if (start >= end) return res.status(400).json({ message: "La hora de inicio debe ser anterior a la hora de finalización" });

    const userOverlappingReservation = await prisma.reservation.findFirst({
      where: {
        userId,
        status: { name: "confirmada" },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
    });

    if (userOverlappingReservation) {
      return res.status(400).json({ message: "Ya tenes una reserva a esta hora" });
    }

    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(start);
    endOfDay.setHours(23, 59, 59, 999);

    const userSameAmenityReservation = await prisma.reservation.findFirst({
      where: {
        userId,
        amenityId,
        status: { name: "confirmada" },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (userSameAmenityReservation) {
      return res.status(400).json({ message: `Ya tenes una reserva para ${amenity.name} en este día` });
    }

    const overlappingCount = await prisma.reservation.count({
      where: {
        amenityId,
        status: { name: "confirmada" },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } },
        ],
      },
    });

    if (overlappingCount >= amenity.capacity) {
      return res.status(400).json({ message: "El horario está lleno" });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      
      const initialStatus = amenity.requiresApproval ? "pendiente" : "confirmada";
      
      const newReservation = await tx.reservation.create({
        data: {
          user: { connect: { id: userId } },
          amenity: { connect: { id: amenityId } },
          startTime: start,
          endTime: end,
          status: { connect: { name: initialStatus } },
        },
        include: {
          amenity: true,
          status: true,
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (amenity.requiresApproval) {
        
        const userNotificationType = await tx.userNotificationType.findUnique({
          where: { name: 'reserva_pendiente' }
        });

        if (!userNotificationType) {
          throw new Error('Tipo de notificación no encontrado: reserva_pendiente');
        }

        await tx.userNotification.create({
          data: {
            userId,
            reservationId: newReservation.id,
            typeId: userNotificationType.id,
            title: 'Reserva Pendiente de Aprobación',
            message: `Tu solicitud de reserva para ${amenity.name} está pendiente de aprobación por un administrador.`
          }
        });

        const admins = await tx.user.findMany({
          where: { role: 'admin' },
          select: { id: true }
        });

        const adminNotificationType = await tx.adminNotificationType.findUnique({
          where: { name: 'reserva_pendiente' }
        });

        if (!adminNotificationType) {
          throw new Error('Tipo de notificación no encontrado: reserva_pendiente');
        }

        await Promise.all(
          admins.map(admin =>
            tx.adminNotification.create({
              data: {
                adminId: admin.id,
                reservationId: newReservation.id,
                typeId: adminNotificationType.id,
                isRead: false
              }
            })
          )
        );
      }

      return newReservation;
    });

    // Se manda el email de confirmación solo si la reserva es auto-confirmada
    if (!amenity.requiresApproval) {
      emailService.sendReservationConfirmationEmail(
        reservation.user.email,
        reservation.user.name,
        reservation.amenity.name,
        start,
        end
      ).catch(err => console.error('Error sending confirmation email:', err));
      
      // Otorgar puntos por reserva completada (solo si es auto-confirmada)
      awardPoints(userId, "RESERVATION_COMPLETED", { reservationId: reservation.id })
        .catch(err => console.error('Error awarding points:', err));
      
      updateUserStats(userId, 'reservationsCompleted')
        .catch(err => console.error('Error updating stats:', err));
    }

    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};

export const getUserReservations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });

    const reservations = await prisma.reservation.findMany({
      where: { userId, hiddenFromUser: false },
      include: { 
        amenity: true,
        status: true
      },
      orderBy: { startTime: "asc" },
    });

    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


// PATCH /reservations/:id/cancel
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params; // reservation ID

    if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
      include: {
        amenity: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!reservation) return res.status(404).json({ message: "Reserva no encontrada" });
    if (reservation.userId !== userId) return res.status(403).json({ message: "No autorizado" });

    const cancelled = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { status: { connect: { name: "cancelada" } } },
      include: {
        amenity: true,
        status: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // email de cancelación
    emailService.sendReservationCancellationEmail(
      reservation.user.email,
      reservation.user.name,
      reservation.amenity.name,
      reservation.startTime,
      reservation.endTime
    ).catch(err => console.error('Error sending cancellation email:', err));
    
    // Penalizar por cancelación
    awardPoints(userId, "RESERVATION_CANCELLED", { reservationId: reservation.id })
      .catch(err => console.error('Error deducting points:', err));
    
    updateUserStats(userId, 'reservationsCancelled')
      .catch(err => console.error('Error updating stats:', err));

    res.json(cancelled);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};

export const getAmenityReservations = async (req: Request, res: Response) => {
  try {
    const { amenityId } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const where: any = {
      amenityId: Number(amenityId),
      status: { name: "confirmada" },
    };

    if (startDate || endDate) {
      if (startDate && endDate) {
        const queryStartDate = new Date(String(startDate) + 'T00:00:00.000Z');
        const queryEndDate = new Date(String(endDate) + 'T23:59:59.999Z');


        where.AND = [
          { startTime: { lte: queryEndDate } },
          { endTime: { gte: queryStartDate } },
        ];
      } else if (startDate) {
        const start = new Date(String(startDate) + 'T00:00:00.000Z');
        where.startTime = { gte: start };
      } else if (endDate) {
        const end = new Date(String(endDate) + 'T23:59:59.999Z');
        where.endTime = { lte: end };
      }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        user: { select: { id: true, name: true } },
        status: true
      },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Error in getAmenityReservations:', error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};

export const hideReservationFromUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });

    const reservation = await prisma.reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!reservation) return res.status(404).json({ message: "Reserva no encontrada" });
    if (reservation.userId !== userId) return res.status(403).json({ message: "No autorizado" });

    const updated = await prisma.reservation.update({
      where: { id: Number(id) },
      data: { hiddenFromUser: true },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};
