import type { Request, Response } from 'express';
import { prisma } from '../prismaClient';

export const getAdminNotifications = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requieren permisos de administrador" 
      });
    }



    const notifications = await prisma.adminNotification.findMany({
      where: { adminId: adminUser.id },
      include: {
        type: true,
        claim: {
          include: {
            user: {
              select: { id: true, name: true }
            },
            priority: {
              select: { name: true, label: true }
            },
            category: {
              select: { name: true, label: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const unreadCount = await prisma.adminNotification.count({
      where: { 
        adminId: adminUser.id,
        isRead: false 
      }
    });

    const formattedNotifications = notifications
      .filter(notification => notification.claim !== null)
      .map(notification => {
        const userName = notification.claim!.isAnonymous ? 'Anónimo' : notification.claim!.user.name;
        const categoryLabel = notification.claim!.category.label || notification.claim!.category.name || 'General';
        const priorityLabel = notification.claim!.priority.label || notification.claim!.priority.name;
        
        return {
          id: notification.id.toString(),
          type: notification.type.name,
          title: `Nuevo reclamo ${notification.type.name === 'urgent_claim' ? '(URGENTE)' : ''}`,
          message: `${userName} creó un reclamo: "${notification.claim!.subject}" en la categoría ${categoryLabel}`,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          readAt: notification.readAt?.toISOString() || null,
          claimId: notification.claim!.id,
          claim: {
            id: notification.claim!.id.toString(),
            title: notification.claim!.subject,
            priority: notification.claim!.priority.name,
            category: categoryLabel,
            user: {
              name: userName
            }
          }
        };
      });

    

    res.json({
      notifications: formattedNotifications,
      unreadCount
    });

  } catch (error) {
    console.error(' [ADMIN NOTIFICATIONS ERROR]', error);
    res.status(500).json({ 
      message: "Error al obtener notificaciones" 
    });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const { id } = req.params;

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requieren permisos de administrador" 
      });
    }

    if (!id) {
      return res.status(400).json({ message: "ID de notificación es requerido" });
    }

    const notificationId = parseInt(id);
    console.log(` [MARK NOTIFICATION READ] Admin ${adminUser.email} marking notification ${id} as read`);

    const existingNotification = await prisma.adminNotification.findFirst({
      where: {
        id: notificationId,
        adminId: adminUser.id
      }
    });

    if (!existingNotification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    if (existingNotification.isRead) {
      return res.json({
        success: true,
        readAt: existingNotification.readAt?.toISOString()
      });
    }

    // Marcar como leída
    const now = new Date();
    await prisma.adminNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: now
      }
    });

    console.log(` [MARK NOTIFICATION READ] Notification ${id} marked as read by admin ${adminUser.email}`);

    res.json({
      success: true,
      readAt: now.toISOString()
    });

  } catch (error) {
    console.error(' [MARK NOTIFICATION READ ERROR]', error);
    res.status(500).json({ 
      message: "Error al marcar notificación como leída" 
    });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ 
        message: "Acceso denegado. Se requieren permisos de administrador" 
      });
    }

    console.log(`[MARK ALL READ] Admin ${adminUser.email} marking all notifications as read`);

    const now = new Date();
    
    // Actualiza solo  notificaciones no leídas
    const updateResult = await prisma.adminNotification.updateMany({
      where: {
        adminId: adminUser.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: now
      }
    });

    console.log(` [MARK ALL READ] ${updateResult.count} notifications marked as read by admin ${adminUser.email}`);

    res.json({
      success: true,
      readAt: now.toISOString(),
      markedCount: updateResult.count
    });

  } catch (error) {
    console.error(' [MARK ALL READ ERROR]', error);
    res.status(500).json({ 
      message: "Error al marcar todas las notificaciones como leídas" 
    });
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.id) {
      return res.status(401).json({ 
        message: "Usuario no autenticado" 
      });
    }

    console.log(` [USER NOTIFICATIONS] User ${user.email} requesting notifications`);

    const notifications = await prisma.userNotification.findMany({
      where: { userId: user.id },
      include: {
        type: true,
        reservation: {
          include: {
            amenity: {
              select: { id: true, name: true }
            },
            status: {
              select: { name: true, label: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const unreadCount = await prisma.userNotification.count({
      where: { 
        userId: user.id,
        isRead: false 
      }
    });

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id.toString(),
      type: notification.type.name,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() || null,
      reservation: notification.reservation ? {
        id: notification.reservation.id.toString(),
        amenityName: notification.reservation.amenity.name,
        startTime: notification.reservation.startTime.toISOString(),
        endTime: notification.reservation.endTime.toISOString(),
        status: notification.reservation.status.name
      } : null
    }));

    console.log(` [USER NOTIFICATIONS] Retrieved ${formattedNotifications.length} notifications for user ${user.email}, ${unreadCount} unread`);

    res.json({
      notifications: formattedNotifications,
      unreadCount
    });

  } catch (error) {
    console.error(' [USER NOTIFICATIONS ERROR]', error);
    res.status(500).json({ 
      message: "Error al obtener notificaciones" 
    });
  }
};

export const markUserNotificationRead = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user || !user.id) {
      return res.status(401).json({ 
        message: "Usuario no autenticado" 
      });
    }

    if (!id) {
      return res.status(400).json({ message: "ID de notificación es requerido" });
    }

    const notificationId = parseInt(id);
    console.log(` [MARK USER NOTIFICATION READ] User ${user.email} marking notification ${id} as read`);

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        id: notificationId,
        userId: user.id
      }
    });

    if (!existingNotification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    if (existingNotification.isRead) {
      return res.json({
        success: true,
        readAt: existingNotification.readAt?.toISOString()
      });
    }

    // Marcar como leída
    const now = new Date();
    await prisma.userNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: now
      }
    });

    console.log(` [MARK USER NOTIFICATION READ] Notification ${id} marked as read by user ${user.email}`);

    res.json({
      success: true,
      readAt: now.toISOString()
    });

  } catch (error) {
    console.error(' [MARK USER NOTIFICATION READ ERROR]', error);
    res.status(500).json({ 
      message: "Error al marcar notificación como leída" 
    });
  }
};

export const markAllUserNotificationsRead = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ 
        message: "Usuario no autenticado" 
      });
    }

    console.log(` [MARK ALL USER NOTIFICATIONS READ] User ${user.email} marking all notifications as read`);

    const now = new Date();
    
    const updateResult = await prisma.userNotification.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: now
      }
    });

    console.log(` [MARK ALL USER NOTIFICATIONS READ] ${updateResult.count} notifications marked as read by user ${user.email}`);

    res.json({
      success: true,
      readAt: now.toISOString(),
      markedCount: updateResult.count
    });

  } catch (error) {
    console.error(' [MARK ALL USER NOTIFICATIONS READ ERROR]', error);
    res.status(500).json({ 
      message: "Error al marcar todas las notificaciones como leídas" 
    });
  }
};

export const deleteUserNotification = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    if (!user || !user.id) {
      return res.status(401).json({ 
        message: "Usuario no autenticado" 
      });
    }

    if (!id) {
      return res.status(400).json({ message: "ID de notificación es requerido" });
    }

    const notificationId = parseInt(id);
    console.log(` [DELETE USER NOTIFICATION] User ${user.email} deleting notification ${id}`);

    const existingNotification = await prisma.userNotification.findFirst({
      where: {
        id: notificationId,
        userId: user.id
      }
    });

    if (!existingNotification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    await prisma.userNotification.delete({
      where: { id: notificationId }
    });

    console.log(` [DELETE USER NOTIFICATION] Notification ${id} deleted by user ${user.email}`);

    res.json({
      success: true,
      message: "Notificación eliminada"
    });

  } catch (error) {
    console.error(' [DELETE USER NOTIFICATION ERROR]', error);
    res.status(500).json({ 
      message: "Error al eliminar notificación" 
    });
  }
};