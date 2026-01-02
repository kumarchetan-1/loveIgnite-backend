import type { Response } from 'express';
import type { AuthRequest } from '../middleware/authMiddleware.js';
import prismaClient from '../lib/prisma.js';

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
      achievements: user.achievements.map((a: any) => a.achievementId),
      unlockedCards: user.unlockedCards.map((c: any) => c.cardId),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const syncAchievements = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { achievements } = req.body; // Array of achievement IDs

  try {
    // Basic sync: delete and re-insert or use upsert
    // For simplicity, we'll just add the ones that don't exist
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

