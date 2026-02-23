import express from 'express';
import { requireAuth } from '../auth_middleware';
import { 
    createRating, 
    getAmenityRatings, 
    getAllRatings, 
    getUserRatings,
    getUserRatingForAmenity,
    updateRating
} from '../controllers/ratingController';

const router = express.Router();

router.post('/ratings', requireAuth, createRating);
router.put('/ratings', requireAuth, updateRating);
router.get('/ratings/amenity/:amenityId', getAmenityRatings);
router.get('/ratings/my-ratings', requireAuth, getUserRatings);
router.get('/ratings/my-rating/:amenityId', requireAuth, getUserRatingForAmenity);
router.get('/admin/ratings', requireAuth, getAllRatings);

export default router;
