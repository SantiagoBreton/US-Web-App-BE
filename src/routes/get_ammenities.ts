import { Router } from "express";
import { getAmenities } from "../controllers/amenitiesController";
import { requireAuth } from "../auth_middleware";

const router = Router();

router.get("/", requireAuth, getAmenities);

export default router;
