import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prismaClient from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'kumarchetan.npr@gmail.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to send email via Brevo
const sendEmail = async (to: string, name: string, otp: string, type: 'verification' | 'reset' = 'verification') => {
  if (!BREVO_API_KEY) {
    return;
  }

  const subject = type === 'verification' ? 'Verify your Love Ignite account' : 'Reset your Love Ignite password';
  const title = type === 'verification' ? 'Welcome to Love Ignite!' : 'Password Reset Request';
  const message = type === 'verification' ? 'Please use the following code to verify your email address:' : 'Please use the following code to reset your password:';

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Love Ignite', email: BREVO_SENDER_EMAIL },
        to: [{ email: to, name: name }],
        subject: subject,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #ff2d55;">${title}</h2>
            <p>${message}</p>
            <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px;">
              ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      // Failed to send email silently
    }
  } catch (error) {
    // Silent fail for email
  }
};

export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await prismaClient.user.findFirst({ 
      where: { 
        email
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    const user = await (prismaClient.user.create as any)({
      data: {
        email,
        name,
        password: hashedPassword,
        verificationOTP: otp,
        otpExpiry: otpExpiry,
        isVerified: false
      },
    });

    // Send the verification email
    await sendEmail(email, name || 'User', otp, 'verification');

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({ 
      token, 
      userId: user.id,
      isVerified: false,
      isPremium: (user as any).isPremium ?? false
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prismaClient.user.findUnique({ 
      where: { 
        email 
      } 
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Please use Google login for this account' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      userId: user.id 
    }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      token, 
      userId: user.id,
      name: user.name,
      email: user.email,
      isVerified: (user as any).isVerified ?? false,
      isPremium: (user as any).isPremium ?? false
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { userId, otp } = req.body;

  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user as any).isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    if ((user as any).verificationOTP !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if ((user as any).otpExpiry && (user as any).otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    await (prismaClient.user.update as any)({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationOTP: null,
        otpExpiry: null
      }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  const { userId } = req.body;

  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if ((user as any).isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60000);

    await (prismaClient.user.update as any)({
      where: { id: userId },
      data: {
        verificationOTP: otp,
        otpExpiry: otpExpiry
      }
    });

    await sendEmail(user.email, user.name || 'User', otp, 'verification');

    res.json({ message: 'Verification code resent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) {
      // For security reasons, don't reveal if user exists
      return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60000);

    await (prismaClient.user.update as any)({
      where: { id: user.id },
      data: {
        verificationOTP: otp,
        otpExpiry: otpExpiry
      }
    });

    await sendEmail(user.email, user.name || 'User', otp, 'reset');

    res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if ((user as any).verificationOTP !== otp) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if ((user as any).otpExpiry && (user as any).otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await (prismaClient.user.update as any)({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        verificationOTP: null,
        otpExpiry: null
      }
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google configuration error' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    let user = await prismaClient.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (user) {
      // Update googleId if not set (user existed with same email)
      if (!user.googleId) {
        user = await prismaClient.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      }
    } else {
      // Create new user
      user = await prismaClient.user.create({
        data: {
          email,
          name: name || null,
          googleId,
          isVerified: true, // Google accounts are pre-verified
        }
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      isPremium: (user as any).isPremium ?? false
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
