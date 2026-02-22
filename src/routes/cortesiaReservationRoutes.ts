import { Router } from "express";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  getAllCortesiaReservations,
  createCortesiaReservation,
  cancelCortesiaReservation,
} from "../controllers/cortesiaReservationController";

const router = Router();

router.get("/",        validateAdmin, getAllCortesiaReservations);
router.post("/",       validateAdmin, createCortesiaReservation);
router.delete("/:id",  validateAdmin, cancelCortesiaReservation);

export default router;
