// ============================================
// Group Chat API — Multi-character responses
// POST: Send message to group & get responses
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { orchestrateGroupResponse } from '@/lib/ai/group-orchestrator';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { conversationId, message, userId } = await request.json();

    if (!conversationId || !message || !userId) {
      return Response.json(
        { error: 'conversationId, message, and userId are required' },
        { status: 400 },
      );
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversation as {
      participants: string[];
      type: string;
    };

    if (conv.type !== 'group') {
      return Response.json({ error: 'Not a group conversation' }, { status: 400 });
    }

    const apiKey = (user as { groqApiKey: string }).groqApiKey;
    const userName = (user as { name: string }).name;

    // Save user message
    const userMessage = await Message.create({
      conversationId,
      senderId: 'user',
      content: message,
      type: 'text',
      readBy: ['user'],
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: 1 },
      lastMessage: message,
      lastMessageAt: new Date(),
    });

    // Get recent group messages for context
    const recentMessages = await Message.find({
      conversationId,
      type: 'text',
    })
      .sort({ timestamp: -1 })
      .limit(12)
      .lean();

    const recentGroupMessages = recentMessages
      .reverse()
      .filter((m) => (m as { senderId: string }).senderId !== 'user')
      .map((m) => ({
        characterId: (m as { senderId: string }).senderId,
        content: (m as { content: string }).content,
      }));

    // Orchestrate multi-character response
    const groupResponses = await orchestrateGroupResponse({
      conversationId,
      participants: conv.participants,
      userId,
      userName,
      userMessage: message,
      apiKey,
      recentGroupMessages,
    });

    // Save all character messages
    const allSavedMessages: { _id: string; conversationId: string; senderId: string; senderName: string; content: string; type: string; timestamp: Date; delay: number }[] = [];

    for (const response of groupResponses) {
      for (let i = 0; i < response.messages.length; i++) {
        const chunk = response.messages[i];
        const msg = await Message.create({
          conversationId,
          senderId: response.characterId,
          content: chunk.text,
          type: 'text',
          timestamp: new Date(Date.now() + allSavedMessages.length * 1500),
        });

        allSavedMessages.push({
          _id: msg._id.toString(),
          conversationId,
          senderId: response.characterId,
          senderName: response.characterName,
          content: chunk.text,
          type: 'text',
          timestamp: msg.timestamp,
          delay: chunk.delay,
        });
      }
    }

    // Update conversation
    if (allSavedMessages.length > 0) {
      const lastMsg = allSavedMessages[allSavedMessages.length - 1];
      await Conversation.findByIdAndUpdate(conversationId, {
        $inc: { messageCount: allSavedMessages.length },
        lastMessage: `${lastMsg.senderName}: ${lastMsg.content}`,
        lastMessageAt: new Date(),
      });
    }

    return Response.json({
      success: true,
      messages: allSavedMessages,
      userMessage: {
        _id: userMessage._id.toString(),
        conversationId,
        senderId: 'user',
        content: message,
        type: 'text',
        timestamp: userMessage.timestamp,
      },
    });
  } catch (error) {
    console.error('Group chat error:', error);
    return Response.json(
      { error: 'Failed to process group message' },
      { status: 500 },
    );
  }
}
