import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import {
  getTasks,
  getTask,
  createTask,
  createSubTask,
  updateTask,
  deleteTask,
} from "../controllers/projectFlowController";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all owned tasks
router.get("/tasks", getTasks);

// Get specific task
router.get("/tasks/:taskId", getTask);

// Create new task
router.post("/tasks", createTask);

// Create subtask
router.post("/tasks/:taskId/subtasks", createSubTask);

// Update task
router.put("/tasks/:taskId", updateTask);

// Delete task
router.delete("/tasks/:taskId", deleteTask);

export default router;
