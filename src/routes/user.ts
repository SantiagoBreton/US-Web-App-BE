import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { updateUserName, updateUserPassword, deleteUser } from "../controllers/user";
import {
  getUserNotifications,
  markUserNotificationRead,
  markAllUserNotificationsRead,
  deleteUserNotification
} from "../controllers/notificationController";

const router = Router();

router.patch("/name", requireAuth, updateUserName);
router.patch("/password", requireAuth, updateUserPassword);
router.delete("/", requireAuth, deleteUser);
router.get("/notifications", requireAuth, getUserNotifications);
router.post("/notifications/:id/mark-read", requireAuth, markUserNotificationRead);
router.post("/notifications/mark-all-read", requireAuth, markAllUserNotificationsRead);
router.delete("/notifications/:id", requireAuth, deleteUserNotification);

export default router;
