import { Router } from 'express';
import { getProfile, syncAchievements, syncUnlockedCards, setPremiumStatus } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getProfile);
router.post('/sync-achievements', syncAchievements);
router.post('/sync-cards', syncUnlockedCards);
router.post('/set-premium', setPremiumStatus);

export default router;

