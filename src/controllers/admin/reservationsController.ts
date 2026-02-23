import type { Request, Response } from "express";
import { prisma } from "../../prismaClient";
import { emailService } from "../../services/emailService";
import { awardPoints, updateUserStats } from "../gamificationController";

export const getAllReservations = async (req: Request, res: Response) => {
  try {
    const { status, amenityId, limit = "50" } = req.query;
    const adminUser = (req as any).user;

    console.log(` [ADMIN RESERVATIONS] User ${adminUser.email} requesting reservations. Filters:`, { status, amenityId, limit });

    const where: any = {};
    
    if (status && typeof status === "string") {
      where.status = { name: status };
    }
    
    if (amenityId && typeof amenityId === "string") {
      const amenityIdNum = parseInt(amenityId);
      if (!isNaN(amenityIdNum)) {
        where.amenityId = amenityIdNum;
      }
    }

    const limitNum = parseInt(limit as string) || 50;
    const maxLimit = Math.min(limitNum, 200); // Máximo 200 para evitar sobrecarga

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        amenity: {
          select: {
            id: true,
            name: true,
            capacity: true,
            maxDuration: true,
            openTime: true,
            closeTime: true
          }
        },
        status: true
      },
      orderBy: { createdAt: "desc" },
      take: maxLimit
    });

    console.log(` [ADMIN RESERVATIONS] Retrieved ${reservations.length} reservations`);

    res.json({
      reservations,
      totalCount: reservations.length,
      filters: { status, amenityId, limit: maxLimit },
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN RESERVATIONS ERROR]", error);
    res.status(500).json({ 
      message: "Error al obtener las reservas" 
    });
  }
};

export const approveReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    console.log(` [ADMIN APPROVE RESERVATION] Admin ${adminUser.email} approving reservation ${id}`);

    const reservationId = parseInt(id || "");
    if (isNaN(reservationId)) {
      return res.status(400).json({ 
        message: "ID de reserva inválido" 
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        amenity: {
          select: { id: true, name: true, capacity: true }
        },
        status: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ 
        message: "Reserva no encontrada" 
      });
    }

    if (reservation.status.name !== "pendiente") {
      return res.status(400).json({ 
        message: `No se puede aprobar una reserva con estado: ${reservation.status.label}` 
      });
    }

    // Verificar que no haya conflictos de capacidad
    const overlappingCount = await prisma.reservation.count({
      where: {
        amenityId: reservation.amenityId,
        status: { name: "confirmada" },
        AND: [
          { startTime: { lt: reservation.endTime } },
          { endTime: { gt: reservation.startTime } },
        ],
      },
    });

    console.log(` [CAPACITY CHECK] Amenity: ${reservation.amenity.name}, Capacity: ${reservation.amenity.capacity}, Current confirmed: ${overlappingCount}`);

    if (overlappingCount >= reservation.amenity.capacity) {
      // Auto-rechazar la reserva si no hay capacidad
      await prisma.$transaction(async (tx) => {
        
        await tx.reservation.update({
          where: { id: reservationId },
          data: { 
            status: { connect: { name: "cancelada" } }
          }
        });

        const cancelledType = await tx.userNotificationType.upsert({
          where: { name: 'reservation_cancelled' },
          create: { name: 'reservation_cancelled', label: 'Reserva Cancelada' },
          update: {},
        });
        
        await tx.userNotification.create({
          data: {
            userId: reservation.user.id,
            reservationId: reservationId,
            typeId: cancelledType.id,
            title: 'Reserva Rechazada Automáticamente',
            message: `Tu reserva para ${reservation.amenity.name} fue rechazada porque otras reservas llenaron la capacidad disponible mientras tu solicitud estaba pendiente.`
          }
        });
      });

      // email de rechazo automático
      emailService.sendReservationCancellationEmail(
        reservation.user.email,
        reservation.user.name,
        reservation.amenity.name,
        reservation.startTime,
        reservation.endTime
      ).catch(err => console.error('Error sending auto-rejection email:', err));

      console.log(` [AUTO-REJECT] Reservation ${id} auto-rejected due to full capacity`);

      return res.status(409).json({ 
        message: "No se puede aprobar: el horario está lleno. La reserva ha sido rechazada automáticamente y el usuario ha sido notificado.",
        autoRejected: true
      });
    }

    const approvedReservation = await prisma.$transaction(async (tx) => {
     
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { 
          status: { connect: { name: "confirmada" } }
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          amenity: true,
          status: true
        }
      });

      const confirmedType = await tx.userNotificationType.upsert({
        where: { name: 'reservation_confirmed' },
        create: { name: 'reservation_confirmed', label: 'Reserva Confirmada' },
        update: {},
      });
      
      await tx.userNotification.create({
        data: {
          userId: reservation.user.id,
          reservationId: reservationId,
          typeId: confirmedType.id,
          title: 'Reserva Aprobada',
          message: `Tu reserva para ${reservation.amenity.name} ha sido aprobada por un administrador.`
        }
      });

      return updated;
    });

    // email de confirmación
    emailService.sendReservationConfirmationEmail(
      reservation.user.email,
      reservation.user.name,
      reservation.amenity.name,
      reservation.startTime,
      reservation.endTime
    ).catch(err => console.error('Error sending approval email:', err));
    

    awardPoints(reservation.user.id, "RESERVATION_COMPLETED", { reservationId: reservationId })
      .catch(err => console.error('Error awarding points:', err));
    
    updateUserStats(reservation.user.id, 'reservationsCompleted')
      .catch(err => console.error('Error updating stats:', err));

    console.log(` [ADMIN APPROVE RESERVATION] Reservation ${id} approved successfully`);

    res.json({
      message: "Reserva aprobada exitosamente",
      reservation: approvedReservation,
      approvedBy: adminUser.email,
      approvedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(" [ADMIN APPROVE RESERVATION ERROR]", error);
    res.status(500).json({ 
      message: "Error al aprobar la reserva" 
    });
  }
};

export const rejectReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).user;

    console.log(` [ADMIN REJECT RESERVATION] Admin ${adminUser.email} rejecting reservation ${id}`);

    const reservationId = parseInt(id || "");
    if (isNaN(reservationId)) {
      return res.status(400).json({ 
        message: "ID de reserva inválido" 
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        amenity: {
          select: { id: true, name: true, capacity: true }
        },
        status: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ 
        message: "Reserva no encontrada" 
      });
    }

    if (reservation.status.name !== "pendiente") {
      return res.status(400).json({ 
        message: `No se puede rechazar una reserva con estado: ${reservation.status.label}` 
      });
    }

    const rejectedReservation = await prisma.$transaction(async (tx) => {
      
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { 
          status: { connect: { name: "cancelada" } }
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          amenity: true,
          status: true
        }
      });

      const notificationMessage = reason 
        ? `Tu reserva para ${reservation.amenity.name} ha sido rechazada. Motivo: ${reason}`
        : `Tu reserva para ${reservation.amenity.name} ha sido rechazada por un administrador.`;

      const cancelledType = await tx.userNotificationType.upsert({
        where: { name: 'reservation_cancelled' },
        create: { name: 'reservation_cancelled', label: 'Reserva Cancelada' },
        update: {},
      });
      
      await tx.userNotification.create({
        data: {
          userId: reservation.user.id,
          reservationId: reservationId,
          typeId: cancelledType.id,
          title: 'Reserva Rechazada',
          message: notificationMessage
        }
      });

      return updated;
    });

    // email de rechazo
    emailService.sendReservationCancellationEmail(
      reservation.user.email,
      reservation.user.name,
      reservation.amenity.name,
      reservation.startTime,
      reservation.endTime,
      reason
    ).catch(err => console.error('Error sending rejection email:', err));

    console.log(` [ADMIN REJECT RESERVATION] Reservation ${id} rejected successfully`);

    res.json({
      message: "Reserva rechazada exitosamente",
      reservation: rejectedReservation,
      rejectedBy: adminUser.email,
      rejectedAt: new Date().toISOString(),
      reason: reason || null
    });

  } catch (error) {
    console.error("❌ [ADMIN REJECT RESERVATION ERROR]", error);
    res.status(500).json({ 
      message: "Error al rechazar la reserva" 
    });
  }
};

export const getPendingReservations = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    console.log(`[ADMIN PENDING RESERVATIONS] Admin ${adminUser.email} requesting pending reservations`);

    const pendingReservations = await prisma.reservation.findMany({
      where: {
        status: { name: "pendiente" }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            apartment: {
              select: {
                unit: true,
                floor: true
              }
            }
          }
        },
        amenity: {
          select: {
            id: true,
            name: true,
            capacity: true,
            maxDuration: true
          }
        },
        status: true
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(` [ADMIN PENDING RESERVATIONS] Found ${pendingReservations.length} pending reservations`);

    res.json({
      reservations: pendingReservations,
      totalCount: pendingReservations.length,
      retrievedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN PENDING RESERVATIONS ERROR]", error);
    res.status(500).json({ 
      message: "Error al obtener reservas pendientes" 
    });
  }
};

export const cancelReservationAsAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).user;

    console.log(`[ADMIN CANCEL RESERVATION] Admin ${adminUser.email} cancelling reservation ${id}`);

    const reservationId = parseInt(id || "");
    if (isNaN(reservationId)) {
      return res.status(400).json({ 
        message: "ID de reserva inválido" 
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        amenity: {
          select: { id: true, name: true }
        },
        status: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ 
        message: "Reserva no encontrada" 
      });
    }

    if (reservation.status.name === "cancelada") {
      return res.status(400).json({ 
        message: "La reserva ya está cancelada" 
      });
    }

    const cancelledReservation = await prisma.$transaction(async (tx) => {
      
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { 
          status: { connect: { name: "cancelada" } }
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          amenity: true,
          status: true
        }
      });

      const notificationMessage = reason 
        ? `Tu reserva para ${reservation.amenity.name} ha sido cancelada por un administrador. Motivo: ${reason}`
        : `Tu reserva para ${reservation.amenity.name} ha sido cancelada por un administrador.`;

      const cancelledType = await tx.userNotificationType.upsert({
        where: { name: 'reservation_cancelled' },
        create: { name: 'reservation_cancelled', label: 'Reserva Cancelada' },
        update: {},
      });
      
      await tx.userNotification.create({
        data: {
          userId: reservation.user.id,
          reservationId: reservationId,
          typeId: cancelledType.id,
          title: 'Reserva Cancelada por Administrador',
          message: notificationMessage
        }
      });

      return updated;
    });

    // email de cancelación
    emailService.sendReservationCancellationEmail(
      reservation.user.email,
      reservation.user.name,
      reservation.amenity.name,
      reservation.startTime,
      reservation.endTime,
      reason
    ).catch(err => console.error('Error sending admin cancellation email:', err));

    console.log(` [ADMIN CANCEL RESERVATION] Reservation ${id} cancelled successfully by admin`);

    res.json({
      message: "Reserva cancelada exitosamente",
      reservation: cancelledReservation,
      cancelledBy: adminUser.email,
      cancelledAt: new Date().toISOString(),
      reason: reason || null
    });

  } catch (error) {
    console.error(" [ADMIN CANCEL RESERVATION ERROR]", error);
    res.status(500).json({ 
      message: "Error al cancelar la reserva" 
    });
  }
};
