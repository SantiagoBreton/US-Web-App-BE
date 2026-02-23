import type { Request, Response } from "express";
import { prisma } from "../../prismaClient";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log(`👥 [ADMIN USERS] User ${(req as any).user.email} requesting all users`);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        apartmentId: true,
        apartment: {
          select: {
            id: true,
            unit: true,
            floor: true,
            rooms: true
          }
        },
        _count: {
          select: {
            reservations: true,
            ownedApartments: true
          }
        }
      },
      orderBy: [
        { role: "desc" },
        { name: "asc" }
      ]
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      apartmentId: user.apartmentId,
      apartment: user.apartment ? {
        id: user.apartment.id,
        unit: user.apartment.unit,
        floor: user.apartment.floor,
        rooms: user.apartment.rooms
      } : null,
      reservationCount: user._count.reservations,
      ownedApartmentsCount: user._count.ownedApartments
    }));

    console.log(`✅ [ADMIN USERS] Retrieved ${formattedUsers.length} users`);

    res.json({
      users: formattedUsers,
      totalCount: formattedUsers.length,
      retrievedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ [ADMIN USERS ERROR]", error);
    res.status(500).json({ 
      message: "Error fetching users list" 
    });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminUser = (req as any).user;

    console.log(`[ADMIN ROLE CHANGE] User ${adminUser.email} attempting to change user ${id} role to ${role}`);

    const validRoles = ["admin", "tenant"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        message: "Rol inválido. Debe ser: admin o tenant" 
      });
    }

    const userId = parseInt(id || "");
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: "ID de usuario inválido" 
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ 
        message: "Usuario no encontrado" 
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`[ADMIN ROLE CHANGE] Changed user ${targetUser.email} role from ${targetUser.role} to ${role}`);

    res.json({
      message: "Rol de usuario actualizado con éxito",
      user: updatedUser,
      previousRole: targetUser.role,
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN ROLE CHANGE ERROR]", error);
    res.status(500).json({ 
      message: "Error al actualizar el rol de usuario" 
    });
  }
};

export const updateUserApartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { apartmentId } = req.body;
    const adminUser = (req as any).user;

    console.log(`[ADMIN APARTMENT CHANGE] User ${adminUser.email} attempting to move user ${id} to apartment ${apartmentId}`);

    const userId = parseInt(id || "");
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: "ID de usuario inválido" 
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        apartmentId: true,
        apartment: {
          select: { unit: true, floor: true }
        }
      }
    });

    if (!targetUser) {
      return res.status(404).json({ 
        message: "Usuario no encontrado" 
      });
    }

    // Validar el nuevo apartamento si se proporciona
    if (apartmentId !== null) {
      if (typeof apartmentId !== "number") {
        return res.status(400).json({ 
          message: "El ID del apartamento debe ser un número o null" 
        });
      }

      const apartment = await prisma.apartment.findUnique({
        where: { id: apartmentId },
        select: { id: true, unit: true, floor: true }
      });

      if (!apartment) {
        return res.status(404).json({ 
          message: "Apartamento no encontrado" 
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { apartmentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        apartmentId: true,
        apartment: {
          select: {
            id: true,
            unit: true,
            floor: true,
            rooms: true
          }
        }
      }
    });

    const previousApartment = targetUser.apartment 
      ? `${targetUser.apartment.unit} (Piso ${targetUser.apartment.floor})`
      : "Sin apartamento";
    
    const newApartment = updatedUser.apartment 
      ? `${updatedUser.apartment.unit} (Piso ${updatedUser.apartment.floor})`
      : "Sin apartamento";

    console.log(`[ADMIN APARTMENT CHANGE] Moved user ${targetUser.email} from ${previousApartment} to ${newApartment}`);

    res.json({
      message: "Apartamento del usuario actualizado con éxito",
      user: updatedUser,
      previousApartment,
      newApartment,
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN APARTMENT CHANGE ERROR]", error);
    res.status(500).json({ 
      message: "Error al actualizar el apartamento del usuario" 
    });
  }
};
