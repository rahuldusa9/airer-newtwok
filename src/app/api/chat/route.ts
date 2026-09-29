// ============================================
// Chat API — Direct Message Handler
// POST: Send message & get AI character response
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { getCharacter } from '@/lib/characters';
import { buildMemoryContext, checkAndSummarize } from '@/lib/ai/memory-manager';
import { buildSystemPrompt, buildIntroductionPrompt } from '@/lib/ai/prompt-engine';
import { generateChatResponse } from '@/lib/ai/groq-client';
import { checkForIntroductions } from '@/lib/ai/introduction-system';
import { parseCharacterResponse } from '@/lib/ai/group-orchestrator';
import { getDaysSince } from '@/lib/utils/time-context';

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

    // Get user and API key
    const user = await User.findById(userId).lean();
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const apiKey = (user as { groqApiKey: string }).groqApiKey;
    const userName = (user as { name: string }).name;

    // Get conversation
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversation as {
      participants: string[];
      messageCount: number;
      createdAt: Date;
      emotionalMomentCount: number;
      userInitiatedCount: number;
      trustLevel: number;
      lastMessageAt: Date;
    };

    const characterId = conv.participants[0];
    const character = getCharacter(characterId);
    if (!character) {
      return Response.json({ error: 'Character not found' }, { status: 404 });
    }

    // Save user message
    const userMessage = await Message.create({
      conversationId,
      senderId: 'user',
      content: message,
      type: 'text',
      readBy: ['user'],
    });

    // Update conversation stats
    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: 1, userInitiatedCount: 1 },
      lastMessage: message,
      lastMessageAt: new Date(),
    });

    // Build memory context (3 layers)
    const memoryContext = await buildMemoryContext(conversationId, characterId);

    // Check for introduction triggers
    const introCheck = await checkForIntroductions(userId, conversationId, characterId);
    let introductionAppendix = '';
    if (introCheck && introCheck.shouldIntroduce) {
      introductionAppendix = buildIntroductionPrompt(
        character,
        introCheck.targetCharacterId,
        userName,
      );
    }

    // Calculate trust and time context
    const trustLevel = conv.trustLevel || 0;
    const lastChatDate = conv.lastMessageAt || null;

    // Build the 5-layer system prompt
    let systemPrompt = buildSystemPrompt({
      character,
      memoryContext,
      userName,
      trustLevel,
      lastChatDate,
    });

    if (introductionAppendix) {
      systemPrompt += '\n\n---\n\n' + introductionAppendix;
    }

    // Build message history for the API call
    const apiMessages = memoryContext.recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add current user message
    apiMessages.push({ role: 'user' as const, content: message });

    // Generate response
    const responseText = await generateChatResponse(apiKey, systemPrompt, apiMessages);

    // Parse response into message chunks
    const messageChunks = parseCharacterResponse(responseText);

    // Save character messages
    const savedMessages = [];
    for (let i = 0; i < messageChunks.length; i++) {
      const chunk = messageChunks[i];
      const msg = await Message.create({
        conversationId,
        senderId: characterId,
        content: chunk.text,
        type: introCheck?.shouldIntroduce && i === 0 ? 'introduction' : 'text',
        timestamp: new Date(Date.now() + i * 1000),
        readBy: [],
        metadata: {
          triggeredIntroduction: introCheck?.shouldIntroduce ? introCheck.targetCharacterId : undefined,
        },
      });
      savedMessages.push({
        _id: msg._id.toString(),
        conversationId,
        senderId: characterId,
        content: chunk.text,
        type: msg.type,
        timestamp: msg.timestamp,
        delay: chunk.delay,
        metadata: msg.metadata,
      });
    }

    // Update conversation
    const lastContent = messageChunks[messageChunks.length - 1]?.text || '';
    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: messageChunks.length },
      lastMessage: lastContent,
      lastMessageAt: new Date(),
    });

    // Trigger summarization in background (non-blocking)
    checkAndSummarize(conversationId, characterId, apiKey).catch(console.error);

    return Response.json({
      success: true,
      messages: savedMessages,
      introduction: introCheck?.shouldIntroduce ? {
        characterId: introCheck.targetCharacterId,
        characterName: getCharacter(introCheck.targetCharacterId)?.name,
      } : null,
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
    console.error('Chat error:', error);
    return Response.json(
      { error: 'Failed to process message' },
      { status: 500 },
    );
  }
}
