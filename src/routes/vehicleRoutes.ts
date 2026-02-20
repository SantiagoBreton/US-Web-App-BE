import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import {
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController";

const router = Router();

router.get("/my",    requireAuth, getMyVehicles);
router.post("/",     requireAuth, createVehicle);
router.put("/:id",   requireAuth, updateVehicle);
router.delete("/:id",requireAuth, deleteVehicle);

export default router;
