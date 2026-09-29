// ============================================
// Group Chat Orchestrator
// Manages multi-character conversations with
// realistic response selection and timing
// ============================================

import { ICharacter } from '@/types';
import { getCharacter } from '@/lib/characters';
import { buildSystemPrompt } from './prompt-engine';
import { buildMemoryContext } from './memory-manager';
import { generateChatResponse } from './groq-client';

interface GroupResponse {
  characterId: string;
  characterName: string;
  messages: { text: string; delay: number }[];
  respondingTo: 'user' | string; // 'user' or another characterId
}

interface GroupContext {
  conversationId: string;
  participants: string[];
  userId: string;
  userName: string;
  userMessage: string;
  apiKey: string;
  recentGroupMessages: { characterId: string; content: string }[];
}

/**
 * Orchestrate responses from multiple characters in a group chat
 */
export async function orchestrateGroupResponse(
  context: GroupContext,
): Promise<GroupResponse[]> {
  const { participants, userMessage, recentGroupMessages } = context;
  const responses: GroupResponse[] = [];

  // Determine which characters should respond
  const responders = await selectResponders(participants, userMessage, recentGroupMessages);

  // Generate responses sequentially (each character sees previous responses)
  const accumulatedMessages: { characterId: string; content: string }[] = [...recentGroupMessages];

  for (const responderId of responders) {
    const character = getCharacter(responderId);
    if (!character) continue;

    const response = await generateGroupCharacterResponse(
      context,
      character,
      accumulatedMessages,
    );

    if (response) {
      responses.push(response);

      // Add this response to accumulated context for next character
      const fullText = response.messages.map((m) => m.text).join(' ');
      accumulatedMessages.push({ characterId: responderId, content: fullText });
    }
  }

  return responses;
}

/**
 * Determine which characters should respond in the group
 */
async function selectResponders(
  participants: string[],
  userMessage: string,
  recentMessages: { characterId: string; content: string }[],
): Promise<string[]> {
  const scored: { id: string; score: number }[] = [];
  const messageLower = userMessage.toLowerCase();

  for (const charId of participants) {
    const character = getCharacter(charId);
    if (!character) continue;

    let probability = 0.35; // Base probability

    // Increase if directly mentioned by name
    if (messageLower.includes(character.name.toLowerCase())) {
      probability += 0.5;
    }

    // Increase if topic matches character interests
    if (matchesCharacterInterests(messageLower, character)) {
      probability += 0.2;
    }

    // Decrease if character responded in last 2 messages
    const recentFromChar = recentMessages.filter((m) => m.characterId === charId);
    if (recentFromChar.length >= 2) {
      probability -= 0.3;
    }

    // Increase if another character mentioned them
    const lastMsg = recentMessages[recentMessages.length - 1];
    if (lastMsg && lastMsg.content.toLowerCase().includes(character.name.toLowerCase())) {
      probability += 0.4;
    }

    scored.push({ id: charId, score: probability });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Ensure at least 1 responds, max 3
  const responders: string[] = [];
  for (const item of scored) {
    if (responders.length === 0 || (Math.random() < item.score && responders.length < 3)) {
      responders.push(item.id);
    }
  }

  // If somehow nobody, pick the highest scored
  if (responders.length === 0 && scored.length > 0) {
    responders.push(scored[0].id);
  }

  return responders;
}

function matchesCharacterInterests(message: string, character: ICharacter): boolean {
  const interestKeywords: Record<string, string[]> = {
    arjun: ['cricket', 'sports', 'ipl', 'match', 'game', 'team', 'work', 'office', 'job'],
    meera: ['food', 'café', 'coffee', 'chai', 'gossip', 'relationship', 'feelings', 'books'],
    rohan: ['music', 'song', 'guitar', 'concert', 'band', 'lyrics', 'mumbai', 'art'],
    priya: ['code', 'tech', 'work', 'startup', 'bangalore', 'engineering', 'career'],
    sameer: ['comedy', 'joke', 'funny', 'standup', 'meme', 'prank', 'party'],
    nisha: ['art', 'drawing', 'painting', 'beauty', 'design', 'sketch', 'creative'],
  };

  const keywords = interestKeywords[character._id] || [];
  return keywords.some((k) => message.includes(k));
}

async function generateGroupCharacterResponse(
  context: GroupContext,
  character: ICharacter,
  groupMessages: { characterId: string; content: string }[],
): Promise<GroupResponse | null> {
  try {
    const memoryContext = await buildMemoryContext(context.conversationId, character._id);

    const systemPrompt = buildSystemPrompt({
      character,
      memoryContext,
      userName: context.userName,
      trustLevel: 3,
      lastChatDate: null,
      isGroupChat: true,
      groupName: 'Group',
      groupParticipants: context.participants,
      otherCharacterMessages: groupMessages,
    });

    // Build conversation history including what other characters said THIS ROUND
    const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [];
    
    // Add other characters' responses from this round as context
    for (const gm of groupMessages) {
      const charName = getCharacter(gm.characterId)?.name || gm.characterId;
      messages.push({
        role: 'assistant' as const,
        content: `[${charName} said]: ${gm.content}`,
      });
    }
    
    // Add the user's message last
    messages.push({ role: 'user' as const, content: context.userMessage });

    const response = await generateChatResponse(context.apiKey, systemPrompt, messages);

    // Parse the JSON response
    let parsed = parseCharacterResponse(response);
    
    // Post-process: remove any message that too closely matches what another character said
    parsed = deduplicateMessages(parsed, groupMessages);

    return {
      characterId: character._id,
      characterName: character.name,
      messages: parsed,
      respondingTo: 'user',
    };
  } catch (error) {
    console.error(`Group response failed for ${character._id}:`, error);
    return null;
  }
}

/**
 * Remove messages that are too similar to what other characters already said
 */
function deduplicateMessages(
  messages: { text: string; delay: number }[],
  priorMessages: { characterId: string; content: string }[],
): { text: string; delay: number }[] {
  if (priorMessages.length === 0) return messages;
  
  const priorTexts = priorMessages.map((m) => m.content.toLowerCase());
  
  return messages.filter((msg) => {
    const msgLower = msg.text.toLowerCase().trim();
    
    // Remove if it's substantially similar to something already said
    for (const prior of priorTexts) {
      // Check for substring match (someone said the same thing)
      if (prior.includes(msgLower) || msgLower.includes(prior)) {
        if (msgLower.length > 5) return false; // Skip short reactions like emojis
      }
      
      // Check word overlap (>60% of words are the same)
      const msgWords = new Set(msgLower.split(/\s+/).filter((w) => w.length > 2));
      const priorWords = new Set(prior.split(/\s+/).filter((w) => w.length > 2));
      
      if (msgWords.size > 2) {
        let overlap = 0;
        for (const word of msgWords) {
          if (priorWords.has(word)) overlap++;
        }
        const overlapRatio = overlap / msgWords.size;
        if (overlapRatio > 0.6) return false;
      }
    }
    
    return true;
  });
}

function parseCharacterResponse(response: string): { text: string; delay: number }[] {
  try {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((m: { text?: string; delay?: number }) => ({
          text: String(m.text || ''),
          delay: Number(m.delay) || 800,
        })).filter((m: { text: string }) => m.text.length > 0);
      }
    }
  } catch {
    // If JSON parsing fails, treat as plain text
  }

  // Fallback: split by newlines and treat as separate messages
  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, i) => ({
      text,
      delay: i === 0 ? 0 : 800 + Math.random() * 1200,
    }));
}

export { parseCharacterResponse };
