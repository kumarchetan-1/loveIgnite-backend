import { Router } from 'express';
import { signup, login, verifyOTP, resendOTP } from '../controllers/authController.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verifyOTP);
router.post('/resend-otp', resendOTP);

export default router;
