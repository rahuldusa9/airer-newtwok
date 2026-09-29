// ============================================
// Messages API — Get messages for a conversation
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Message from '@/lib/db/models/Message';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination

    const query: Record<string, unknown> = {
      conversationId: id,
    };

    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const formatted = messages.reverse().map((msg) => ({
      ...msg,
      _id: (msg._id as { toString(): string }).toString(),
    }));

    return Response.json({ messages: formatted });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return Response.json(
      { error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }
}
