import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  createGarageRequest,
  getMyGarageRequests,
  cancelGarageRequest,
  getAvailableGaragesForRequest,
  adminGetAllGarageRequests,
  adminResolveGarageRequest,
} from "../controllers/garageRequestController";

const router = Router();

// Tenant
router.get("/available",  requireAuth, getAvailableGaragesForRequest);
router.get("/my",         requireAuth, getMyGarageRequests);
router.post("/",   requireAuth, createGarageRequest);
router.delete("/:id", requireAuth, cancelGarageRequest);

// Admin
router.get("/admin/all",           validateAdmin, adminGetAllGarageRequests);
router.put("/admin/:id/resolve",   validateAdmin, adminResolveGarageRequest);

export default router;
