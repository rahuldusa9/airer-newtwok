// ============================================
// Character Unlock API
// POST: Unlock a new character
// ============================================

import { NextRequest } from 'next/server';
import { unlockCharacter } from '@/lib/ai/introduction-system';

export async function POST(request: NextRequest) {
  try {
    const { userId, characterId, introducedBy } = await request.json();

    if (!userId || !characterId || !introducedBy) {
      return Response.json(
        { error: 'userId, characterId, and introducedBy are required' },
        { status: 400 },
      );
    }

    const conversationId = await unlockCharacter(userId, characterId, introducedBy);

    return Response.json({
      success: true,
      conversationId,
    });
  } catch (error) {
    console.error('Unlock error:', error);
    return Response.json(
      { error: 'Failed to unlock character' },
      { status: 500 },
    );
  }
}
