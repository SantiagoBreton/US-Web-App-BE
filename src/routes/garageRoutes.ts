import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  getAllGarages,
  createGarage,
  updateGarage,
  deleteGarage,
} from "../controllers/garageController";

const router = Router();


router.get("/",       validateAdmin, getAllGarages);
router.post("/",      validateAdmin, createGarage);
router.put("/:id",    validateAdmin, updateGarage);
router.delete("/:id", validateAdmin, deleteGarage);

export default router;
