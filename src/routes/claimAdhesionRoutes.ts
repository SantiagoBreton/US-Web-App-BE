import { Router } from "express";
import { requireAuth } from "../auth_middleware";
import { 
  getClaimAdhesions, 
  createOrUpdateClaimAdhesion, 
  deleteClaimAdhesion 
} from "../controllers/claimAdhesionController";

const router = Router();

router.use(requireAuth);

router.get("/:id/adhesions", getClaimAdhesions);
router.post("/:id/adhesions", createOrUpdateClaimAdhesion);
router.delete("/:id/adhesions", deleteClaimAdhesion);

export default router;