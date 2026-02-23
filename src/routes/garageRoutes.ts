import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  getAllGarages,
  createGarage,
  updateGarage,
  deleteGarage,
  getGarageAssignments,
  assignGarage,
  unassignGarage,
} from "../controllers/garageController";

const router = Router();

// Assignments (antes de /:id para evitar conflictos de rutas)
router.get("/assignments",        validateAdmin, getGarageAssignments);
router.put("/:id/assign",         validateAdmin, assignGarage);
router.put("/:id/unassign",       validateAdmin, unassignGarage);

// CRUD
router.get("/",       validateAdmin, getAllGarages);
router.post("/",      validateAdmin, createGarage);
router.put("/:id",    validateAdmin, updateGarage);
router.delete("/:id", validateAdmin, deleteGarage);

export default router;
