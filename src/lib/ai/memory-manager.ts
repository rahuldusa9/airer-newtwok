// ============================================
// 3-Layer Memory Manager
// Layer 1: Sliding Window (last 8 raw messages)
// Layer 2: Rolling Summary (every 20 messages)
// Layer 3: Fact Store (persistent key facts)
// ============================================

import connectDB from '@/lib/db/connect';
import Message from '@/lib/db/models/Message';
import Memory from '@/lib/db/models/Memory';
import { generateSummary } from './groq-client';
import { IMessage } from '@/types';

const SLIDING_WINDOW_SIZE = 8;
const SUMMARIZATION_THRESHOLD = 20;
const MAX_FACTS = 15;

export interface MemoryContext {
  recentMessages: { role: 'user' | 'assistant'; content: string }[];
  summary: string;
  facts: string[];
  emotionalState: string;
}

/**
 * Build the complete memory context for a conversation
 */
export async function buildMemoryContext(
  conversationId: string,
  characterId: string,
): Promise<MemoryContext> {
  await connectDB();

  // Layer 1: Sliding Window — last N raw messages
  const recentMessages = await getRecentMessages(conversationId, SLIDING_WINDOW_SIZE);

  // Layer 2: Rolling Summary
  const summary = await getLatestSummary(conversationId, characterId);

  // Layer 3: Fact Store — top N important facts
  const facts = await getTopFacts(conversationId, characterId, MAX_FACTS);

  // Current emotional state
  const emotionalState = await getEmotionalState(conversationId, characterId);

  return {
    recentMessages,
    summary,
    facts,
    emotionalState,
  };
}

/**
 * Layer 1: Get the last N messages as raw conversation
 */
async function getRecentMessages(
  conversationId: string,
  count: number,
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const messages = await Message.find({
    conversationId,
    type: 'text',
  })
    .sort({ timestamp: -1 })
    .limit(count)
    .lean<IMessage[]>();

  return messages
    .reverse()
    .map((msg) => ({
      role: (msg.senderId === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
    }));
}

/**
 * Layer 2: Get the latest rolling summary
 */
async function getLatestSummary(
  conversationId: string,
  characterId: string,
): Promise<string> {
  const summary = await Memory.findOne({
    conversationId,
    characterId,
    type: 'summary',
  })
    .sort({ createdAt: -1 })
    .lean();

  return summary?.content || '';
}

/**
 * Layer 3: Get top N facts by importance
 */
async function getTopFacts(
  conversationId: string,
  characterId: string,
  limit: number,
): Promise<string[]> {
  const facts = await Memory.find({
    characterId,
    type: { $in: ['fact', 'preference'] },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .sort({ importance: -1 })
    .limit(limit)
    .lean();

  return facts.map((f) => f.content);
}

/**
 * Get current emotional state
 */
async function getEmotionalState(
  conversationId: string,
  characterId: string,
): Promise<string> {
  const emotion = await Memory.findOne({
    conversationId,
    characterId,
    type: 'emotion',
  })
    .sort({ createdAt: -1 })
    .lean();

  return emotion?.content || 'neutral, friendly';
}

/**
 * Check if summarization is needed and trigger it
 */
export async function checkAndSummarize(
  conversationId: string,
  characterId: string,
  apiKey: string,
): Promise<void> {
  await connectDB();

  // Count messages since last summary
  const lastSummary = await Memory.findOne({
    conversationId,
    characterId,
    type: 'summary',
  })
    .sort({ createdAt: -1 })
    .lean();

  const query: Record<string, unknown> = {
    conversationId,
    type: 'text',
  };

  if (lastSummary?.messageRange?.to) {
    query._id = { $gt: lastSummary.messageRange.to };
  }

  const unsummarizedMessages = await Message.find(query)
    .sort({ timestamp: 1 })
    .lean<IMessage[]>();

  if (unsummarizedMessages.length < SUMMARIZATION_THRESHOLD) {
    return; // Not enough messages to summarize yet
  }

  // Take messages to summarize (leave the recent window untouched)
  const messagesToSummarize = unsummarizedMessages.slice(0, -SLIDING_WINDOW_SIZE);

  if (messagesToSummarize.length === 0) return;

  const conversationText = messagesToSummarize
    .map((m) => `${m.senderId === 'user' ? 'User' : characterId}: ${m.content}`)
    .join('\n');

  const previousSummary = lastSummary?.content || 'No previous summary.';

  const summarizationPrompt = `You are a memory manager for a character named ${characterId}.
Summarize the following conversation segment between ${characterId} and the user.

Focus on:
1. Key topics discussed
2. Important facts the user revealed about themselves
3. Emotional moments or shifts in tone
4. Any promises made or plans discussed
5. How ${characterId} felt during this conversation

Previous summary (if any): ${previousSummary}

Conversation to summarize:
${conversationText}

Output a JSON object with these exact fields:
{
  "summary": "2-3 sentence narrative summary combining previous context with new information",
  "facts": [
    { "content": "specific fact about the user", "importance": 1-10 }
  ],
  "emotional_state": "character's current emotional state after this conversation",
  "topics": ["main topics discussed"]
}`;

  try {
    const result = await generateSummary(apiKey, summarizationPrompt);
    const parsed = JSON.parse(result);

    // Store the new summary
    await Memory.create({
      conversationId,
      characterId,
      type: 'summary',
      content: parsed.summary || '',
      importance: 10,
      messageRange: {
        from: messagesToSummarize[0]._id?.toString() || '',
        to: messagesToSummarize[messagesToSummarize.length - 1]._id?.toString() || '',
        count: messagesToSummarize.length,
      },
    });

    // Store extracted facts
    if (parsed.facts && Array.isArray(parsed.facts)) {
      for (const fact of parsed.facts) {
        // Check for duplicate facts
        const existing = await Memory.findOne({
          characterId,
          type: 'fact',
          content: { $regex: new RegExp(fact.content.slice(0, 30), 'i') },
        });

        if (!existing) {
          await Memory.create({
            conversationId,
            characterId,
            type: 'fact',
            content: fact.content,
            importance: fact.importance || 5,
          });
        }
      }
    }

    // Update emotional state
    if (parsed.emotional_state) {
      await Memory.create({
        conversationId,
        characterId,
        type: 'emotion',
        content: parsed.emotional_state,
        importance: 7,
      });
    }
  } catch (error) {
    console.error('Summarization failed:', error);
    // Non-fatal — conversation continues without summary update
  }
}
