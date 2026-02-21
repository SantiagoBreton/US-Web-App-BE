import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  getAvailableVisitorGarages,
  createVisitorParking,
  getMyVisitorParkings,
  cancelVisitorParking,
  adminGetAllVisitorParkings,
} from "../controllers/visitorParkingController";

const router = Router();

// ─── TENANT ───────────────────────────────────────────────────────────────────
router.get("/garages-available", requireAuth, getAvailableVisitorGarages);
router.get("/my",                requireAuth, getMyVisitorParkings);
router.post("/",                 requireAuth, createVisitorParking);
router.delete("/:id",            requireAuth, cancelVisitorParking);

// ─── ADMIN ────────────────────────────────────────────────────────────────────
router.get("/admin/all",         validateAdmin, adminGetAllVisitorParkings);

export default router;
