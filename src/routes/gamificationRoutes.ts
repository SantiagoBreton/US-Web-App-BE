import { Router } from "express";
import {
  getGamificationProfile,
  getLeaderboard,
  getAllAchievements,
  getCustomizationOptions,
  updateCustomization,
  getPointTransactions,
  refreshAchievements
} from "../controllers/gamificationController";
import { requireAuth } from "../auth_middleware";

const router = Router();

// Rutas públicas (o con auth básica)
router.get("/profile/:userId", getGamificationProfile);
router.get("/leaderboard", getLeaderboard);
router.get("/achievements", getAllAchievements);
router.get("/transactions/:userId", getPointTransactions);

// Rutas protegidas que requieren autenticación
router.get("/customization/:userId", requireAuth, getCustomizationOptions);
router.put("/customize", requireAuth, updateCustomization);
router.post("/refresh-achievements", requireAuth, refreshAchievements);

export default router;
