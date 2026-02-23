import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

export const createApartment = async (req: Request, res: Response) => {
  try {
    const { unit, floor, rooms, areaM2, observations, ownerId } = req.body;
    const adminUser = (req as any).user;

    console.log(`[ADMIN CREATE APARTMENT] User ${adminUser.email} creating apartment:`, { unit, floor, rooms, ownerId });

    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return res.status(400).json({ 
        message: "El unit es obligatorio y debe ser una cadena no vacía" 
      });
    }

    if (!floor || typeof floor !== "number" || floor < 1) {
      return res.status(400).json({ 
        message: "El piso es obligatorio y debe ser un número positivo (mínimo 1)" 
      });
    }

    if (!rooms || typeof rooms !== "number" || rooms < 1 || rooms > 10) {
      return res.status(400).json({ 
        message: "Las habitaciones son obligatorias y deben estar entre 1 y 10" 
      });
    }

    const existingApartment = await prisma.apartment.findFirst({
      where: {
        unit: {
          equals: unit.trim(),
          mode: "insensitive"
        }
      }
    });

    if (existingApartment) {
      return res.status(409).json({ 
        message: "Ya existe un apartamento con este número de unidad" 
      });
    }

    if (ownerId) {
      if (typeof ownerId !== "number") {
        return res.status(400).json({ 
          message: "El ID del owner debe ser un número" 
        });
      }

      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true, email: true }
      });

      if (!owner) {
        return res.status(404).json({ 
          message: "Propietario no encontrado" 
        });
      }

      if (owner.role !== "tenant" && owner.role !== "admin") {
        return res.status(400).json({ 
          message: "El propietario debe tener el rol de 'tenant' o 'admin'" 
        });
      }
    }

    const createData: any = {
      unit: unit.trim(),
      floor,
      rooms
    };

    if (areaM2 && typeof areaM2 === "number" && areaM2 > 0) {
      createData.areaM2 = areaM2;
    }

    if (observations && typeof observations === "string") {
      createData.observations = observations.trim();
    }

    if (ownerId) {
      createData.owner = { connect: { id: ownerId } };
    }

    const newApartment = await prisma.apartment.create({
      data: createData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`[ADMIN CREATE APARTMENT] Successfully created apartment: ${newApartment.unit} (ID: ${newApartment.id})`);

    res.status(201).json({
      message: "Apartamento creado con éxito",
      apartment: {
        ...newApartment,
        isOccupied: false,
        tenant: null
      },
      createdBy: adminUser.email,
      createdAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN CREATE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error al crear el apartamento" 
    });
  }
};

export const updateApartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { unit, floor, rooms, areaM2, observations, ownerId, tenantId } = req.body;
    const adminUser = (req as any).user;

    console.log(` [ADMIN UPDATE APARTMENT] User ${adminUser.email} updating apartment ${id}:`, req.body);

    const apartmentId = parseInt(id || "");
    if (isNaN(apartmentId)) {
      return res.status(400).json({ 
        message: "ID de apartamento inválido" 
      });
    }

    const existingApartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        owner: true,
        tenants: true
      }
    });

    if (!existingApartment) {
      return res.status(404).json({ 
        message: "Apartamento no encontrado" 
      });
    }

    const updateData: any = {};
    const updatedFields: string[] = [];

    if (unit !== undefined) {
      if (typeof unit !== "string" || unit.trim().length === 0) {
        return res.status(400).json({ 
          message: "El unit debe ser un string no vacío" 
        });
      }

      if (unit.trim() !== existingApartment.unit) {
        const duplicateApartment = await prisma.apartment.findFirst({
          where: {
            unit: {
              equals: unit.trim(),
              mode: "insensitive"
            },
            id: {
              not: apartmentId
            }
          }
        });

        if (duplicateApartment) {
          return res.status(409).json({ 
            message: "Ya existe un apartamento con este número de unidad" 
          });
        }
      }

      updateData.unit = unit.trim();
      updatedFields.push("unit");
    }

    if (floor !== undefined) {
      if (typeof floor !== "number" || floor < 1) {
        return res.status(400).json({ 
          message: "Floor must be a positive number (minimum 1)" 
        });
      }
      updateData.floor = floor;
      updatedFields.push("floor");
    }

    if (rooms !== undefined) {
      if (typeof rooms !== "number" || rooms < 1 || rooms > 10) {
        return res.status(400).json({ 
          message: "Rooms must be between 1 and 10" 
        });
      }
      updateData.rooms = rooms;
      updatedFields.push("rooms");
    }

    if (areaM2 !== undefined) {
      if (areaM2 === null) {
        updateData.areaM2 = null;
      } else if (typeof areaM2 === "number" && areaM2 > 0) {
        updateData.areaM2 = areaM2;
      } else {
        return res.status(400).json({ 
          message: "Area must be a positive number or null" 
        });
      }
      updatedFields.push("areaM2");
    }

    if (observations !== undefined) {
      updateData.observations = observations === null ? null : observations.trim();
      updatedFields.push("observations");
    }

    if (ownerId !== undefined) {
      if (ownerId === null) {
        updateData.owner = { disconnect: true };
        updatedFields.push("owner");
      } else if (typeof ownerId === "number") {
        const owner = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, role: true }
        });

        if (!owner) {
          return res.status(404).json({ 
            message: "Propietario no encontrado" 
          });
        }

        if (owner.role !== "tenant" && owner.role !== "admin") {
          return res.status(400).json({ 
            message: "El propietario debe tener el rol de 'tenant' o 'admin'" 
          });
        }

        updateData.owner = { connect: { id: ownerId } };
        updatedFields.push("owner");
      } else {
        return res.status(400).json({ 
          message: "El ID del owner debe ser un número o null" 
        });
      }
    }

    if (tenantId !== undefined) {
      if (tenantId === null) {
        const currentTenant = existingApartment.tenants[0];
        if (currentTenant) {
          updateData.tenants = { disconnect: { id: currentTenant.id } };
          updatedFields.push("tenant");
        }
      } else if (typeof tenantId === "number") {
        const tenant = await prisma.user.findUnique({
          where: { id: tenantId },
          select: { id: true, role: true, apartmentId: true }
        });

        if (!tenant) {
          return res.status(404).json({ 
            message: "Inquilino no encontrado" 
          });
        }

        if (tenant.role !== "tenant") {
          return res.status(400).json({ 
            message: "El inquilino debe tener el rol de 'tenant'" 
          });
        }

        if (tenant.apartmentId && tenant.apartmentId !== apartmentId) {
          return res.status(400).json({ 
            message: "El inquilino ya está asignado a otro apartamento" 
          });
        }

        const currentTenant = existingApartment.tenants[0];
        if (currentTenant && currentTenant.id !== tenantId) {
          updateData.tenants = { 
            disconnect: { id: currentTenant.id },
            connect: { id: tenantId }
          };
        } else if (!currentTenant) {
          updateData.tenants = { connect: { id: tenantId } };
        }
        updatedFields.push("tenant");
      } else {
        return res.status(400).json({ 
          message: "El ID del inquilino debe ser un número o null" 
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        message: "No fields to update" 
      });
    }

    const updatedApartment = await prisma.apartment.update({
      where: { id: apartmentId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        tenants: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`[ADMIN UPDATE APARTMENT] Successfully updated apartment: ${updatedApartment.unit} (ID: ${updatedApartment.id})`);

    res.json({
      message: "Apartment updated successfully",
      apartment: {
        ...updatedApartment,
        isOccupied: updatedApartment.tenants.length > 0,
        tenant: updatedApartment.tenants.length > 0 ? updatedApartment.tenants[0] : null
      },
      updatedFields,
      updatedBy: adminUser.email,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN UPDATE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error updating apartment" 
    });
  }
};

export const deleteApartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    console.log(`[ADMIN DELETE APARTMENT] User ${adminUser.email} attempting to delete apartment ${id}`);

    const apartmentId = parseInt(id || "");
    if (isNaN(apartmentId)) {
      return res.status(400).json({ 
        message: "Invalid apartment ID" 
      });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        tenants: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            tenants: true
          }
        }
      }
    });

    if (!apartment) {
      return res.status(404).json({ 
        message: "Apartment not found" 
      });
    }

    const assignedUsers = apartment.tenants.length + (apartment.owner ? 1 : 0);
    
    if (assignedUsers > 0) {
      console.log(` [ADMIN DELETE APARTMENT] Cannot delete apartment ${id}: has assigned users`);
      return res.status(400).json({ 
        error: "Cannot delete apartment: has assigned users",
        details: {
          assignedUsers,
          owner: apartment.owner,
          tenants: apartment.tenants
        }
      });
    }

    const activeReservations = await prisma.reservation.count({
      where: {
        user: {
          apartmentId: apartmentId
        },
        status: {
          name: { in: ["confirmada", "pendiente"] }
        }
      }
    });

    if (activeReservations > 0) {
      console.log(` [ADMIN DELETE APARTMENT] Cannot delete apartment ${id}: has active reservations`);
      return res.status(400).json({ 
        error: "Cannot delete apartment: has active reservations",
        details: {
          activeReservations,
          assignedUsers: 0
        }
      });
    }

    const deletedApartment = await prisma.apartment.delete({
      where: { id: apartmentId }
    });

    console.log(` [ADMIN DELETE APARTMENT] Successfully deleted apartment: ${deletedApartment.unit} (ID: ${deletedApartment.id})`);

    res.json({
      message: "Apartment deleted successfully",
      deletedApartment: {
        id: deletedApartment.id,
        unit: deletedApartment.unit,
        floor: deletedApartment.floor
      },
      deletedBy: adminUser.email,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [ADMIN DELETE APARTMENT ERROR]", error);
    res.status(500).json({ 
      message: "Error deleting apartment" 
    });
  }
};
