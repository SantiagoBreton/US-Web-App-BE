import type { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { awardPoints, updateUserStats } from './gamificationController';


const parsePaginationParams = (page?: string, limit?: string) => {
  const pageNum = parseInt(page || '1');
  const limitNum = parseInt(limit || '10');
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

const buildClaimFilters = (category?: string, status?: string, search?: string, userId?: number) => {
  const where: any = {};

  console.log(' [BUILD FILTERS] Input params:', { category, status, search, userId });

  if (userId) {
    where.userId = userId;
  }

  if (category && category !== 'all') {
    where.category = { name: category };
  }

  if (status && status !== 'all') {
    where.status = { name: status };
  }

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  console.log('[BUILD FILTERS] Generated where clause:', JSON.stringify(where, null, 2));
  return where;
};

const mapClaimsWithCreatedBy = async (claims: any[], requestingUser?: any) => {
  
  const claimIds = claims.map(claim => claim.id);
  
  const [supportCounts, disagreeCounts, userAdhesions] = await Promise.all([
    prisma.claimAdhesion.groupBy({
      by: ['claimId'],
      where: { 
        claimId: { in: claimIds },
        isSupport: true
      },
      _count: { id: true }
    }),
    prisma.claimAdhesion.groupBy({
      by: ['claimId'],
      where: { 
        claimId: { in: claimIds },
        isSupport: false
      },
      _count: { id: true }
    }),
    requestingUser ? prisma.claimAdhesion.findMany({
      where: {
        claimId: { in: claimIds },
        userId: requestingUser.id
      },
      select: { claimId: true, isSupport: true }
    }) : []
  ]);

  const supportMap = new Map(supportCounts.map(item => [item.claimId, item._count.id]));
  const disagreeMap = new Map(disagreeCounts.map(item => [item.claimId, item._count.id]));
  const userAdhesionMap = new Map(userAdhesions.map(item => [item.claimId, item.isSupport]));

  return claims.map((claim: any) => {
    
    let createdBy = claim.user.name;
    
    // Es la parte donde se oculta el nombre si es anónimo
    if (claim.isAnonymous && 
        requestingUser?.role !== 'admin' && 
        requestingUser?.id !== claim.userId) {
      createdBy = 'Anónimo';
    }

    return {
      ...claim,
      createdBy,
      adhesion_counts: {
        support: supportMap.get(claim.id) || 0,
        disagree: disagreeMap.get(claim.id) || 0
      },
      user_adhesion: userAdhesionMap.get(claim.id) || null
    };
  });
};

const mapClaimWithCreatedBy = async (claim: any, requestingUser?: any) => {
  
  const [supportCount, disagreeCount, userAdhesion] = await Promise.all([
    prisma.claimAdhesion.count({
      where: { claimId: claim.id, isSupport: true }
    }),
    prisma.claimAdhesion.count({
      where: { claimId: claim.id, isSupport: false }
    }),
    requestingUser ? prisma.claimAdhesion.findUnique({
      where: {
        unique_user_claim_adhesion: {
          claimId: claim.id,
          userId: requestingUser.id
        }
      },
      select: { isSupport: true }
    }) : null
  ]);

  let createdBy = claim.user.name;

  if (claim.isAnonymous &&
      requestingUser?.role !== 'admin' &&
      requestingUser?.id !== claim.userId) {
    createdBy = 'Anónimo';
  }

  return {
    ...claim,
    createdBy,
    adhesion_counts: {
      support: supportCount,
      disagree: disagreeCount
    },
    user_adhesion: userAdhesion?.isSupport ?? null
  };
};

const getClaimsWithPagination = async (where: any, skip: number, limitNum: number, requestingUser?: any) => {
  try {
    console.log('[GET CLAIMS PAGINATION] Starting query with params:', { skip, limitNum, where: JSON.stringify(where) });
    
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true,
              gamification: {
                include: {
                  level: true,
                  selectedTheme: true,
                  selectedFrame: true,
                  selectedEffect: true
                }
              }
            }
          },
          category: true,
          priority: true,
          status: true
        }
      }),
      prisma.claim.count({ where })
    ]);

    console.log(`[GET CLAIMS PAGINATION] Raw query returned ${claims.length} claims, total: ${total}`);
    
    const mappedClaims = await mapClaimsWithCreatedBy(claims, requestingUser);
    console.log(`[GET CLAIMS PAGINATION] Mapped claims completed, returning ${mappedClaims.length} claims`);
    
    return { claims: mappedClaims, total };
  } catch (error) {
    console.error('❌ [GET CLAIMS PAGINATION ERROR]', error);
    throw error;
  }
};

const validateCategory = async (category: string) => {
  const categoryRecord = await prisma.claimCategory.findUnique({
    where: { name: category }
  });
  if (!categoryRecord) {
    const validCategories = await prisma.claimCategory.findMany({ select: { name: true } });
    throw new Error(`Categoría inválida. Valores permitidos: ${validCategories.map(c => c.name).join(', ')}`);
  }
  return categoryRecord;
};

const validatePriority = async (priority: string) => {
  const priorityRecord = await prisma.claimPriority.findUnique({
    where: { name: priority }
  });
  if (!priorityRecord) {
    const validPriorities = await prisma.claimPriority.findMany({ select: { name: true } });
    throw new Error(`Prioridad inválida. Valores permitidos: ${validPriorities.map(p => p.name).join(', ')}`);
  }
  return priorityRecord;
};

const validateStatus = async (status: string) => {
  const statusRecord = await prisma.claimStatus.findUnique({
    where: { name: status }
  });
  if (!statusRecord) {
    const validStatuses = await prisma.claimStatus.findMany({ select: { name: true } });
    throw new Error(`Estado inválido. Valores permitidos: ${validStatuses.map(s => s.name).join(', ')}`);
  }
  return statusRecord;
};

const checkAdminPermissions = (user: any, res: Response) => {
  if (!user || user.role !== 'admin') {
    res.status(403).json({ 
      message: "Acceso denegado. Se requieren permisos de administrador" 
    });
    return false;
  }
  return true;
};


// GET /claims/categories 
export const getClaimCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.claimCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /claims/priorities 
export const getClaimPriorities = async (req: Request, res: Response) => {
  try {
    const priorities = await prisma.claimPriority.findMany({
      orderBy: { level: 'asc' }
    });
    res.json(priorities);
  } catch (error) {
    console.error('Error al obtener prioridades:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /claims/statuses 
export const getClaimStatuses = async (req: Request, res: Response) => {
  try {
    const statuses = await prisma.claimStatus.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(statuses);
  } catch (error) {
    console.error('Error al obtener estados:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


// GET /claims/categories 
export const getUserClaims = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const { page, limit, category, status, search, includeAll } = req.query;
    const { pageNum, limitNum, skip } = parsePaginationParams(page as string, limit as string);
    
    // Si includeAll es true, mostrar todos los reclamos; si no, solo los del usuario
    const userIdFilter = (includeAll === 'true') ? undefined : user.id;
    const where = buildClaimFilters(category as string, status as string, search as string, userIdFilter);
    const { claims, total } = await getClaimsWithPagination(where, skip, limitNum, user);

    res.json({ claims, total, page: pageNum, limit: limitNum });

  } catch (error) {
    console.error('Error al obtener reclamos:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /claims/:id 
export const getClaim = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    const claim = await prisma.claim.findFirst({
      where: {
        id: parseInt(id),
        userId // Solo puede ver sus propios reclamos
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!claim) {
      return res.status(404).json({ message: "Reclamo no encontrado" });
    }

    const mappedClaim = await mapClaimWithCreatedBy(claim, (req as any).user);
    res.json(mappedClaim);

  } catch (error) {
    console.error('Error al obtener reclamo:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /claims 
export const createClaim = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const { subject, category, description, location, priority, isAnonymous } = req.body;

    if (!subject || !category || !description || !location || !priority) {
      return res.status(400).json({ 
        message: "Todos los campos son obligatorios: subject, category, description, location, priority" 
      });
    }

    try {
      const [categoryRecord, priorityRecord, statusRecord] = await Promise.all([
        validateCategory(category),
        validatePriority(priority),
        validateStatus('pendiente') 
      ]);

      const result = await prisma.$transaction(async (tx) => {
        const claim = await tx.claim.create({
          data: {
            subject,
            categoryId: categoryRecord.id,
            description,
            location,
            priorityId: priorityRecord.id,
            statusId: statusRecord.id,
            userId,
            isAnonymous: Boolean(isAnonymous)
          },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            category: true,
            priority: true,
            status: true
          }
        });

        const adminUsers = await tx.user.findMany({
          where: { role: 'admin' },
          select: { id: true }
        });

        const notificationTypeName = (priorityRecord.name === 'alta' || priorityRecord.name === 'urgente') 
          ? 'reclamo_urgente' 
          : 'nuevo_reclamo';

        const notificationType = await tx.adminNotificationType.findUnique({
          where: { name: notificationTypeName }
        });

        if (!notificationType) {
          throw new Error(`Tipo de notificación no encontrado: ${notificationTypeName}`);
        }

        if (adminUsers.length > 0) {
          await tx.adminNotification.createMany({
            data: adminUsers.map(admin => ({
              adminId: admin.id,
              claimId: claim.id,
              typeId: notificationType.id
            }))
          });
        }

        return claim;
      });
      
      awardPoints(userId, "CLAIM_CREATED", { claimId: result.id })
        .catch(err => console.error('Error awarding points:', err));
      
      updateUserStats(userId, 'claimsCreated')
        .catch(err => console.error('Error updating stats:', err));

      const mappedClaim = await mapClaimWithCreatedBy(result, (req as any).user);
      res.status(201).json(mappedClaim);
    } catch (validationError) {
      return res.status(400).json({ message: (validationError as Error).message });
    }

  } catch (error) {
    console.error('Error al crear reclamo:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PUT /claims/:id 
export const updateClaim = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    const claimWithStatus = await prisma.claim.findFirst({
      where: {
        id: parseInt(id),
        userId
      },
      include: { status: true }
    });

    if (!claimWithStatus) {
      return res.status(404).json({ message: "Reclamo no encontrado" });
    }

    // No permitir actualizar reclamos resueltos o rechazados
    if (claimWithStatus.status.name === 'resuelto' || claimWithStatus.status.name === 'rechazado') {
      return res.status(403).json({ 
        message: "No se pueden modificar reclamos resueltos o rechazados" 
      });
    }

    const { subject, category, description, location, priority, status } = req.body;

    if (status && status !== 'pendiente') {
      return res.status(403).json({ 
        message: "Los usuarios solo pueden cambiar el estado a 'pendiente'" 
      });
    }

    try {
      const [categoryRecord, priorityRecord, statusRecord] = await Promise.all([
        category ? validateCategory(category) : Promise.resolve(null),
        priority ? validatePriority(priority) : Promise.resolve(null),
        status ? validateStatus(status) : Promise.resolve(null)
      ]);

      const updateData: any = {};
      if (subject) updateData.subject = subject;
      if (description) updateData.description = description;
      if (location) updateData.location = location;
      if (categoryRecord) updateData.categoryId = categoryRecord.id;
      if (priorityRecord) updateData.priorityId = priorityRecord.id;
      if (statusRecord) updateData.statusId = statusRecord.id;

      const updatedClaim = await prisma.claim.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          category: true,
          priority: true,
          status: true
        }
      });

      const mappedUpdatedClaim = await mapClaimWithCreatedBy(updatedClaim, (req as any).user);
      res.json(mappedUpdatedClaim);
    } catch (validationError) {
      return res.status(400).json({ message: (validationError as Error).message });
    }

  } catch (error) {
    console.error('Error al actualizar reclamo:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /claims/:id 
export const deleteClaim = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    const claimWithStatusForDelete = await prisma.claim.findFirst({
      where: {
        id: parseInt(id),
        userId
      },
      include: { status: true }
    });

    if (!claimWithStatusForDelete) {
      return res.status(404).json({ message: "Reclamo no encontrado" });
    }

    // No permitir eliminar reclamos en progreso
    if (claimWithStatusForDelete.status.name === 'en_progreso') {
      return res.status(409).json({ 
        message: "No se puede eliminar: el reclamo está siendo procesado" 
      });
    }

    await prisma.claim.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();

  } catch (error) {
    console.error('Error al eliminar reclamo:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /admin/claims 
export const getAdminClaims = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!checkAdminPermissions(user, res)) return;

    console.log('[GET ADMIN CLAIMS] Request query params:', req.query);
    const { page, limit, category, status, search, userId } = req.query;
    const { pageNum, limitNum, skip } = parsePaginationParams(page as string, limit as string);
    
    const userIdFilter = userId ? parseInt(userId as string) : undefined;
    const where = buildClaimFilters(category as string, status as string, search as string, userIdFilter);
    
    console.log('[GET ADMIN CLAIMS] Calling getClaimsWithPagination...');
    const { claims, total } = await getClaimsWithPagination(where, skip, limitNum);

    console.log(`[GET ADMIN CLAIMS] Successfully retrieved ${claims.length} claims, total: ${total}`);
    res.json({ claims, total, page: pageNum, limit: limitNum });

  } catch (error) {
    console.error('[GET ADMIN CLAIMS ERROR] Full error details:', error);
    if (error instanceof Error) {
      console.error('[GET ADMIN CLAIMS ERROR] Error message:', error.message);
      console.error('[GET ADMIN CLAIMS ERROR] Error stack:', error.stack);
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PUT /admin/claims/:id/status 
export const updateClaimStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!checkAdminPermissions(user, res)) return;

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    if (!status) {
      return res.status(400).json({ message: "El estado es obligatorio" });
    }

    try {
      const statusRecord = await validateStatus(status);

      const existingClaim = await prisma.claim.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingClaim) {
        return res.status(404).json({ message: "Reclamo no encontrado" });
      }

      const updatedClaim = await prisma.claim.update({
        where: { id: parseInt(id) },
        data: {
          statusId: statusRecord.id,
          ...(adminNotes && { adminNotes })
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          category: true,
          priority: true,
          status: true
        }
      });
      

      if (statusRecord.name === 'resuelto') {
        awardPoints(updatedClaim.userId, "CLAIM_RESOLVED", { claimId: updatedClaim.id })
          .catch(err => console.error('Error awarding points:', err));
        
        updateUserStats(updatedClaim.userId, 'claimsResolved')
          .catch(err => console.error('Error updating stats:', err));
      } else if (statusRecord.name === 'rechazado') {
        awardPoints(updatedClaim.userId, "CLAIM_REJECTED", { claimId: updatedClaim.id })
          .catch(err => console.error('Error deducting points:', err));
        
        updateUserStats(updatedClaim.userId, 'claimsRejected')
          .catch(err => console.error('Error updating stats:', err));
      }

      const mappedUpdatedClaim = await mapClaimWithCreatedBy(updatedClaim, (req as any).user);
      res.json(mappedUpdatedClaim);
    } catch (validationError) {
      return res.status(400).json({ message: (validationError as Error).message });
    }

  } catch (error) {
    console.error('Error al actualizar estado del reclamo:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /admin/claims/:id 
export const deleteAdminClaim = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!checkAdminPermissions(user, res)) return;

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    const existingClaim = await prisma.claim.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClaim) {
      return res.status(404).json({ message: "Reclamo no encontrado" });
    }

    await prisma.claim.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();

  } catch (error) {
    console.error('Error al eliminar reclamo (admin):', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


export const linkClaimToProjectFlowTask = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!checkAdminPermissions(user, res)) return;

    const { id } = req.params;
    const { projectFlowTaskId } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID del reclamo es requerido" });
    }

    if (!projectFlowTaskId) {
      return res.status(400).json({ message: "ID de tarea de ProjectFlow es requerido" });
    }

    const existingClaim = await prisma.claim.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClaim) {
      return res.status(404).json({ message: "Reclamo no encontrado" });
    }

    const updatedClaim = await prisma.claim.update({
      where: { id: parseInt(id) },
      data: {
        projectFlowTaskId
      },
      include: {
        user: true,
        category: true,
        priority: true,
        status: true,
        adhesions: true
      }
    });

    const mappedClaim = await mapClaimWithCreatedBy(updatedClaim, user);
    res.json(mappedClaim);

  } catch (error) {
    console.error('Error al vincular reclamo con ProjectFlow:', error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};