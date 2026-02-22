import { Router } from "express";
import { validateAdmin } from "../middleware/adminMiddleware";
import {
  getSystemStats,
  getAllUsers,
  updateUserRole,
  getAllReservations,
  getAllAmenities,
  createAmenity,
  updateAmenity,
  getAllApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  deleteAmenity,
  getAmenityDetailReservations,
  approveReservation,
  rejectReservation,
  getPendingReservations,
  cancelReservationAsAdmin,
  getClaimsMonthlyStats,
  getClaimsMetrics
} from "../controllers/admin";
import {
  getAdminClaims,
  updateClaimStatus,
  deleteAdminClaim,
  linkClaimToProjectFlowTask
} from "../controllers/claimController";
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notificationController";
import { getAllVehicles } from "../controllers/vehicleController";

const router = Router();

router.get("/stats", validateAdmin, getSystemStats);


router.get("/users", validateAdmin, getAllUsers);
router.put("/users/:id/role", validateAdmin, updateUserRole);


router.get("/reservations", validateAdmin, getAllReservations);
router.get("/reservations/pending", validateAdmin, getPendingReservations);
router.put("/reservations/:id/approve", validateAdmin, approveReservation);
router.put("/reservations/:id/reject", validateAdmin, rejectReservation);
router.delete("/reservations/:id/cancel", validateAdmin, cancelReservationAsAdmin);


router.get("/amenities", validateAdmin, getAllAmenities);
router.post("/amenities", validateAdmin, createAmenity);
router.put("/amenities/:id", validateAdmin, updateAmenity);
router.delete("/amenities/:id", validateAdmin, deleteAmenity);
router.get("/amenities/:id/reservations", validateAdmin, getAmenityDetailReservations);


router.get("/apartments", validateAdmin, getAllApartments);
router.post("/apartments", validateAdmin, createApartment);
router.put("/apartments/:id", validateAdmin, updateApartment);
router.delete("/apartments/:id", validateAdmin, deleteApartment);


router.get("/claims", validateAdmin, getAdminClaims);
router.get("/claims/stats", validateAdmin, getClaimsMonthlyStats);
router.get("/claims/metrics", validateAdmin, getClaimsMetrics);
router.put("/claims/:id/status", validateAdmin, updateClaimStatus);
router.put("/claims/:id/projectflow-task", validateAdmin, linkClaimToProjectFlowTask);
router.delete("/claims/:id", validateAdmin, deleteAdminClaim);


router.get("/notifications", validateAdmin, getAdminNotifications);
router.post("/notifications/:id/mark-read", validateAdmin, markNotificationRead);
router.post("/notifications/mark-all-read", validateAdmin, markAllNotificationsRead);

router.get("/vehicles", validateAdmin, getAllVehicles);

export default router;