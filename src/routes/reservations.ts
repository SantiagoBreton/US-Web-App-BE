import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { createReservation, getUserReservations, cancelReservation, getAmenityReservations, hideReservationFromUser } from "../controllers/reservation";


const router = Router();

router.post("/", requireAuth, createReservation);
router.get("/", requireAuth, getUserReservations);
router.patch("/:id/cancel", requireAuth, cancelReservation);
router.get("/amenity/:amenityId", requireAuth, getAmenityReservations);
router.patch("/:id/hide", requireAuth, hideReservationFromUser);

export default router;
