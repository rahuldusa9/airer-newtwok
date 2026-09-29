// ============================================
// Setup API — First-time user registration
// POST: Create user with name + API key
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { defaultCharacterIds, getCharacter } from '@/lib/characters';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name, groqApiKey } = await request.json();

    if (!name || !groqApiKey) {
      return Response.json(
        { error: 'Name and Groq API key are required' },
        { status: 400 },
      );
    }

    // Validate API key by making a simple test call
    try {
      const Groq = (await import('groq-sdk')).default;
      const client = new Groq({ apiKey: groqApiKey });
      await client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });
    } catch {
      return Response.json(
        { error: 'Invalid Groq API key. Please check and try again.' },
        { status: 400 },
      );
    }

    // Create user
    const user = await User.create({
      name,
      groqApiKey,
      unlockedCharacters: defaultCharacterIds,
    });

    // Create initial conversations with default characters
    for (const charId of defaultCharacterIds) {
      const character = getCharacter(charId);
      if (!character) continue;

      const conversation = await Conversation.create({
        type: 'direct',
        participants: [charId],
        userId: user._id.toString(),
      });

      // Add first messages from characters
      const firstMessages = getWelcomeMessages(charId, name);
      for (let i = 0; i < firstMessages.length; i++) {
        await Message.create({
          conversationId: conversation._id.toString(),
          senderId: charId,
          content: firstMessages[i],
          type: 'text',
          timestamp: new Date(Date.now() + i * 2000),
        });
      }

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: firstMessages[firstMessages.length - 1],
        lastMessageAt: new Date(),
        messageCount: firstMessages.length,
        unreadCount: firstMessages.length,
      });
    }

    return Response.json({
      success: true,
      userId: user._id.toString(),
      userName: user.name,
      unlockedCharacters: user.unlockedCharacters,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return Response.json(
      { error: 'Failed to set up account' },
      { status: 500 },
    );
  }
}

function getWelcomeMessages(characterId: string, userName: string): string[] {
  const messages: Record<string, string[]> = {
    arjun: [
      `${userName}!! 🔥`,
      'bro FINALLY you\'re here',
      'yaar itne din kahan tha tu',
      'scene kya hai champion? sab theek?',
    ],
    meera: [
      `omg ${userName}!!! ✨`,
      'I CANNOT believe it',
      'where have you been?? I literally was thinking about you the other day',
      'we have SO much to catch up on 😭',
    ],
  };

  return messages[characterId] || [`Hey ${userName}! Great to connect!`];
}

// GET: Check if user exists
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const user = await User.findById(userId).lean();
      if (user) {
        return Response.json({
          exists: true,
          userId: (user as { _id: { toString(): string } })._id.toString(),
          userName: (user as { name: string }).name,
          unlockedCharacters: (user as { unlockedCharacters: string[] }).unlockedCharacters,
        });
      }
    }

    return Response.json({ exists: false });
  } catch {
    return Response.json({ exists: false });
  }
}
