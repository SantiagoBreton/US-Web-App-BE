import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ message: "Formato de encabezado de autorización no válido" });
    }

    const token = parts[1];
    if (!token) {
        return res.status(401).json({ message: "Token faltante" });
    }

    try {
        const payload = jwt.verify(token as string, process.env.JWT_SECRET!);
        (req as any).user = payload;
        next();
    } catch (err) {
        console.error("JWT error:", err);
        return res.status(401).json({ message: "Token inválido o expirado" });
    }

}
