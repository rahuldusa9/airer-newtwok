// ============================================
// Conversations API
// GET: List all conversations for a user
// POST: Create a new group conversation
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Conversation from '@/lib/db/models/Conversation';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const conversations = await Conversation.find({ userId })
      .sort({ lastMessageAt: -1 })
      .lean();

    const formatted = conversations.map((conv) => ({
      ...conv,
      _id: (conv._id as { toString(): string }).toString(),
    }));

    return Response.json({ conversations: formatted });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return Response.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { userId, participants, groupName } = await request.json();

    if (!userId || !participants || participants.length < 2) {
      return Response.json(
        { error: 'userId and at least 2 participants are required for a group' },
        { status: 400 },
      );
    }

    const conversation = await Conversation.create({
      type: 'group',
      participants,
      userId,
      groupName: groupName || 'Gully Gang 🏏',
    });

    return Response.json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        _id: conversation._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return Response.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    );
  }
}
