// ============================================
// Characters API
// GET: List all characters with unlock status
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { getAllCharacters } from '@/lib/characters';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const allCharacters = getAllCharacters();

    if (!userId) {
      return Response.json({ characters: allCharacters });
    }

    const user = await User.findById(userId).lean();
    const unlockedIds = user
      ? (user as { unlockedCharacters: string[] }).unlockedCharacters
      : [];

    const characters = allCharacters.map((char) => ({
      ...char,
      isUnlocked: unlockedIds.includes(char._id),
    }));

    return Response.json({ characters, unlockedIds });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return Response.json(
      { error: 'Failed to fetch characters' },
      { status: 500 },
    );
  }
}
