import { Request, Response } from 'express';
import { prisma } from '../prismaClient';
import { awardPoints, updateUserStats } from './gamificationController';

interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
    };
}

export const createRating = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { amenityId, cleanliness, equipment, comfort, compliance, comment } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        if (!amenityId) {
            res.status(400).json({ error: 'amenityId es requerido' });
            return;
        }

        const subcategoryRatings = [cleanliness, equipment, comfort, compliance].filter(r => r != null && r > 0);
        
        if (subcategoryRatings.length === 0) {
            res.status(400).json({ error: 'Debes calificar al menos una subcategoría' });
            return;
        }

        for (const rating of subcategoryRatings) {
            if (rating < 1 || rating > 3) {
                res.status(400).json({ error: 'Las calificaciones deben ser entre 1 y 3' });
                return;
            }
        }

        const overallRating = subcategoryRatings.reduce((sum, r) => sum + r, 0) / subcategoryRatings.length;

        const existingRating = await prisma.amenityRating.findUnique({
            where: {
                userId_amenityId: {
                    userId: userId,
                    amenityId: amenityId
                }
            }
        });

        if (existingRating) {
            res.status(400).json({ error: 'Ya calificaste esta amenidad' });
            return;
        }

        const rating = await prisma.amenityRating.create({
            data: {
                userId,
                amenityId,
                overallRating,
                cleanliness: cleanliness || null,
                equipment: equipment || null,
                comfort: comfort || null,
                compliance: compliance || null,
                comment: comment || null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                amenity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        awardPoints(userId, "RATING_GIVEN", { ratingId: rating.id })
            .catch(err => console.error('Error awarding points:', err));
        
        updateUserStats(userId, 'ratingsGiven')
            .catch(err => console.error('Error updating stats:', err));

        res.status(201).json(rating);
    } catch (error) {
        console.error('Error creating rating:', error);
        res.status(500).json({ error: 'Error al crear calificación' });
    }
};

export const getAmenityRatings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { amenityId } = req.params;

        if (!amenityId) {
            res.status(400).json({ error: 'ID de amenity requerido' });
            return;
        }

        const ratings = await prisma.amenityRating.findMany({
            where: {
                amenityId: parseInt(amenityId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const stats = await prisma.amenityRating.aggregate({
            where: {
                amenityId: parseInt(amenityId)
            },
            _avg: {
                overallRating: true,
                cleanliness: true,
                equipment: true,
                comfort: true,
                compliance: true
            },
            _count: {
                id: true
            }
        });

        res.json({
            ratings,
            stats: {
                averageRating: stats._avg.overallRating || 0,
                totalRatings: stats._count.id,
                averages: {
                    cleanliness: stats._avg.cleanliness,
                    equipment: stats._avg.equipment,
                    comfort: stats._avg.comfort,
                    compliance: stats._avg.compliance
                }
            }
        });
    } catch (error) {
        console.error('Error fetching ratings:', error);
        res.status(500).json({ error: 'Error al obtener calificaciones' });
    }
};

export const getAllRatings = async (req: Request, res: Response): Promise<void> => {
    try {
        const ratings = await prisma.amenityRating.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                amenity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(ratings);
    } catch (error) {
        console.error('Error fetching all ratings:', error);
        res.status(500).json({ error: 'Error al obtener calificaciones' });
    }
};

export const getUserRatings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        const ratings = await prisma.amenityRating.findMany({
            where: {
                userId: userId
            },
            include: {
                amenity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(ratings);
    } catch (error) {
        console.error('Error fetching user ratings:', error);
        res.status(500).json({ error: 'Error al obtener calificaciones del usuario' });
    }
};

export const getUserRatingForAmenity = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { amenityId } = req.params;

        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        const rating = await prisma.amenityRating.findUnique({
            where: {
                userId_amenityId: {
                    userId: userId,
                    amenityId: parseInt(amenityId)
                }
            },
            include: {
                amenity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!rating) {
            res.status(404).json({ error: 'No has calificado esta amenidad' });
            return;
        }

        res.json(rating);
    } catch (error) {
        console.error('Error fetching user rating for amenity:', error);
        res.status(500).json({ error: 'Error al obtener calificación' });
    }
};

export const updateRating = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { amenityId, cleanliness, equipment, comfort, compliance, comment } = req.body;

        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }

        if (!amenityId) {
            res.status(400).json({ error: 'amenityId es requerido' });
            return;
        }

        const subcategoryRatings = [cleanliness, equipment, comfort, compliance].filter(r => r != null && r > 0);
        
        if (subcategoryRatings.length === 0) {
            res.status(400).json({ error: 'Debes calificar al menos una subcategoría' });
            return;
        }

        for (const rating of subcategoryRatings) {
            if (rating < 1 || rating > 3) {
                res.status(400).json({ error: 'Las calificaciones deben ser entre 1 y 3' });
                return;
            }
        }

        const overallRating = subcategoryRatings.reduce((sum, r) => sum + r, 0) / subcategoryRatings.length;

        const existingRating = await prisma.amenityRating.findUnique({
            where: {
                userId_amenityId: {
                    userId: userId,
                    amenityId: amenityId
                }
            }
        });

        if (!existingRating) {
            res.status(404).json({ error: 'No has calificado esta amenidad aún' });
            return;
        }

        const updatedRating = await prisma.amenityRating.update({
            where: {
                userId_amenityId: {
                    userId: userId,
                    amenityId: amenityId
                }
            },
            data: {
                overallRating,
                cleanliness: cleanliness || null,
                equipment: equipment || null,
                comfort: comfort || null,
                compliance: compliance || null,
                comment: comment || null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                amenity: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        res.json(updatedRating);
    } catch (error) {
        console.error('Error updating rating:', error);
        res.status(500).json({ error: 'Error al actualizar calificación' });
    }
};
