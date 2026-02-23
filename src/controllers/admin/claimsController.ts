import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

export const getClaimsMonthlyStats = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const { period = 'weekly', offset = '0' } = req.query;
    const offsetDays = parseInt(offset as string) || 0;
    
    console.log(`[ADMIN CLAIMS STATS] User ${adminUser.email} requesting claims stats - period: ${period}, offset: ${offsetDays}`);

    let claims;
    let dataMap = new Map<string, any>();

    if (period === 'daily') {
      const daysCount = 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount - offsetDays);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - offsetDays);
      endDate.setHours(23, 59, 59, 999);

      claims = await prisma.claim.findMany({
        where: { 
          createdAt: { 
            gte: startDate,
            lte: endDate
          } 
        },
        select: {
          id: true,
          createdAt: true,
          status: { select: { name: true, label: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        dataMap.set(key, {
          month: key,
          label: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          nuevo: 0, en_progreso: 0, resuelto: 0, cerrado: 0, total: 0
        });
      }

      claims.forEach(claim => {
        const claimDate = new Date(claim.createdAt);
        const key = `${claimDate.getFullYear()}-${(claimDate.getMonth() + 1).toString().padStart(2, '0')}-${claimDate.getDate().toString().padStart(2, '0')}`;
        if (dataMap.has(key)) {
          const data = dataMap.get(key);
          data.total++;
          const statusName = claim.status.name;
          if (statusName === 'pendiente') data.nuevo++;
          else if (statusName === 'en_progreso') data.en_progreso++;
          else if (statusName === 'resuelto') data.resuelto++;
          else if (statusName === 'rechazado') data.cerrado++;
        }
      });

    } else if (period === 'weekly') {
      const weeksCount = 4;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - offsetDays);
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (weeksCount * 7) + 1);
      startDate.setHours(0, 0, 0, 0);

      claims = await prisma.claim.findMany({
        where: { 
          createdAt: { 
            gte: startDate,
            lte: endDate
          } 
        },
        select: {
          id: true,
          createdAt: true,
          status: { select: { name: true, label: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      const weekRanges: Array<{ key: string; weekStart: Date; weekEnd: Date }> = [];
      
      for (let i = weeksCount - 1; i >= 0; i--) {
        const weekEnd = new Date(endDate);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const key = `week-${i}-${weekStart.toISOString().split('T')[0]}`;
        weekRanges.push({ key, weekStart, weekEnd });
        
        const label = `Sem ${weeksCount - i}`;
        dataMap.set(key, {
          month: key, 
          label: label,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          nuevo: 0, en_progreso: 0, resuelto: 0, cerrado: 0, total: 0
        });
      }

      claims.forEach(claim => {
        const claimDate = new Date(claim.createdAt);
        
        const weekRange = weekRanges.find(range => 
          claimDate >= range.weekStart && claimDate <= range.weekEnd
        );
        
        if (weekRange && dataMap.has(weekRange.key)) {
          const data = dataMap.get(weekRange.key);
          data.total++;
          const statusName = claim.status.name;
          if (statusName === 'pendiente') data.nuevo++;
          else if (statusName === 'en_progreso') data.en_progreso++;
          else if (statusName === 'resuelto') data.resuelto++;
          else if (statusName === 'rechazado') data.cerrado++;
        }
      });

    } else {
      
      const monthsCount = 12;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - offsetDays);
      endDate.setMonth(endDate.getMonth());
      endDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - monthsCount + 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      claims = await prisma.claim.findMany({
        where: { 
          createdAt: { 
            gte: startDate,
            lte: endDate
          } 
        },
        select: {
          id: true,
          createdAt: true,
          status: { select: { name: true, label: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      for (let i = monthsCount - 1; i >= 0; i--) {
        const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        dataMap.set(key, {
          month: key,
          monthLabel: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          nuevo: 0, en_progreso: 0, resuelto: 0, cerrado: 0, total: 0
        });
      }

      claims.forEach(claim => {
        const claimDate = new Date(claim.createdAt);
        const key = `${claimDate.getFullYear()}-${(claimDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (dataMap.has(key)) {
          const data = dataMap.get(key);
          data.total++;
          const statusName = claim.status.name;
          if (statusName === 'pendiente') data.nuevo++;
          else if (statusName === 'en_progreso') data.en_progreso++;
          else if (statusName === 'resuelto') data.resuelto++;
          else if (statusName === 'rechazado') data.cerrado++;
        }
      });
    }

    const data = Array.from(dataMap.values());
    console.log(`[ADMIN CLAIMS STATS] Generated stats for ${data.length} periods`);

    res.json({
      data,
      totalClaims: claims?.length || 0,
      period,
      offset: offsetDays,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("[ADMIN CLAIMS STATS ERROR]", error);
    res.status(500).json({ 
      message: "Error al obtener estadísticas de reclamos" 
    });
  }
};

export const getClaimsMetrics = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const { startDate, endDate } = req.query;
    
    console.log(`[ADMIN CLAIMS METRICS] User ${adminUser.email} requesting claims metrics`, {
      startDate,
      endDate
    });

    const whereClause: any = {};
    
    if (startDate || endDate) {
      whereClause.status = {
        name: 'resuelto'
      };
      
      whereClause.updatedAt = {};
      if (startDate) {
        whereClause.updatedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.updatedAt.lte = new Date(endDate as string);
      }
    }

    const claims = await prisma.claim.findMany({
      where: whereClause,
      select: {
        id: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        category: { 
          select: { 
            name: true, 
            label: true 
          } 
        },
        status: { 
          select: { 
            name: true, 
            label: true 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalClaims = claims.length;

    const resolvedClaims = claims.filter(c => c.status.name === 'resuelto');
    
    let averageResolutionTime = 0;
    if (resolvedClaims.length > 0) {
      const totalResolutionTime = resolvedClaims.reduce((sum, claim) => {
        const createdAt = new Date(claim.createdAt);
        const resolvedAt = new Date(claim.updatedAt);
        const diffDays = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);
      averageResolutionTime = totalResolutionTime / resolvedClaims.length;
    }

    const resolutionRate = totalClaims > 0 
      ? (resolvedClaims.length / totalClaims) * 100 
      : 0;

    const categoryMap = new Map<string, number>();
    claims.forEach(claim => {
      const category = claim.category?.label || claim.category?.name || 'Sin categoría';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const statusMap = new Map<string, number>();
    claims.forEach(claim => {
      const status = claim.status.label || claim.status.name;
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    const byStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const metrics = {
      totalClaims,
      averageResolutionTime,
      resolutionRate,
      byCategory,
      byStatus,
      dateFilter: {
        startDate: startDate || null,
        endDate: endDate || null,
        applied: !!(startDate || endDate)
      },
      generatedAt: new Date().toISOString()
    };

    console.log(`[ADMIN CLAIMS METRICS] Generated metrics:`, {
      totalClaims,
      avgResolutionDays: averageResolutionTime.toFixed(2),
      resolutionRate: resolutionRate.toFixed(2),
      categories: byCategory.length,
      statuses: byStatus.length,
      dateFilterApplied: !!(startDate || endDate)
    });

    res.json(metrics);

  } catch (error) {
    console.error("[ADMIN CLAIMS METRICS ERROR]", error);
    res.status(500).json({ 
      message: "Error al obtener métricas de reclamos" 
    });
  }
};
