import { Router } from 'express';
import { requireAuth } from '../auth_middleware';
import {
  getUserClaims,
  getClaim,
  createClaim,
  updateClaim,
  deleteClaim,
  getClaimCategories,
  getClaimPriorities,
  getClaimStatuses
} from '../controllers/claimController';

const router = Router();

router.get('/categories', getClaimCategories);
router.get('/priorities', getClaimPriorities);
router.get('/statuses', getClaimStatuses);
router.get('/', requireAuth, getUserClaims);
router.get('/:id', requireAuth, getClaim);
router.post('/', requireAuth, createClaim);
router.put('/:id', requireAuth, updateClaim);
router.delete('/:id', requireAuth, deleteClaim);

export default router;