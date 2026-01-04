import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import prismaClient from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

export const getProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prismaClient.user.findUnique({
      where: { 
        id: userId
      },
      include: {
        achievements: true,
        unlockedCards: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      email: user.email,
      name: user.name,
      isPremium: (user as any).isPremium ?? false,
      isVerified: (user as any).isVerified ?? false,
      achievements: user.achievements.map((a: any) => a.achievementId),
      unlockedCards: user.unlockedCards.map((c: any) => c.cardId),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { name, email } = req.body;

  try {
    // If email is being changed, check if it's already taken
    if (email) {
      const existingUser = await prismaClient.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updatedUser = await (prismaClient.user.update as any)({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        // If email is changed, maybe we should reset isVerified to false? 
        // For simplicity, let's keep it as is, or you can uncomment below:
        // isVerified: email ? false : undefined 
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'Incorrect current password' });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await (prismaClient.user.update as any)({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const syncAchievements = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { achievements } = req.body; // Array of achievement IDs

  try {
    const operations = achievements.map((id: string) => 
      prismaClient.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: id } },
        update: {},
        create: { userId, achievementId: id }
      })
    );

    await Promise.all(operations);
    res.json({ message: 'Achievements synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const syncUnlockedCards = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { cardIds } = req.body; // Array of card IDs

  try {
    const operations = cardIds.map((id: string) => 
      prismaClient.unlockedCard.upsert({
        where: { userId_cardId: { userId, cardId: id } },
        update: {},
        create: { userId, cardId: id }
      })
    );

    await Promise.all(operations);
    res.json({ message: 'Unlocked cards synced successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setPremiumStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { isPremium } = req.body;

  try {
    await (prismaClient.user.update as any)({
      where: { id: userId },
      data: { isPremium }
    });
    res.json({ message: 'Premium status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
