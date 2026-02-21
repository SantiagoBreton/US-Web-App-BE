import type { Request, Response } from "express";
import { prisma} from "../prismaClient";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { emailService } from "../services/emailService";
import { initializeUserGamification, updateDailyStreak } from "./gamificationController";


// POST /register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, apartmentId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Es necesario completar todos los campos" });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: "El usuario ya existe" });

    // Validar que el apartamento existe si se proporcionó
    const parsedApartmentId = apartmentId ? parseInt(apartmentId) : null;
    if (parsedApartmentId) {
      const apartment = await prisma.apartment.findUnique({ where: { id: parsedApartmentId } });
      if (!apartment) {
        return res.status(400).json({ message: "El departamento seleccionado no existe" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        ...(parsedApartmentId && { apartmentId: parsedApartmentId }),
      }
    });
    
    initializeUserGamification(newUser.id)
      .catch(err => console.error('Error initializing gamification:', err));

    res.status(201).json({ message: "Usuario registrado con éxito" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
};

// POST /login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "El email y la contraseña son obligatorios" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ message: "Credenciales inválidas" });

  const token = jwt.sign(
    {id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!, // must be set in .env
    { expiresIn: "120m" }
  );
  

  updateDailyStreak(user.id)
    .catch(err => console.error('Error updating daily streak:', err));

  res.json({ message: "Login successful", token });
};

// POST /claims/:id/adhesion
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "El email es obligatorio" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {

      return res.json({ message: "Si el correo existe, se ha enviado un enlace de recuperación" });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      }
    });

    // Mail de reseteo
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.name);
      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      await prisma.user.update({
        where: { email },
        data: {
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });
      
      return res.status(500).json({ message: "Error al enviar el correo de recuperación" });
    }

    res.json({ 
      message: "Si el correo existe, se ha enviado un enlace de recuperación"
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};

// POST /claims/:id/adhesion
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Se requiere un token y nueva contraseña" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Token de restablecimiento inválido o expirado" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    res.json({ message: "Contraseña restablecida con éxito" });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};