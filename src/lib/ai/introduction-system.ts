// ============================================
// Introduction System
// Handles progressive character unlocking
// through natural conversation triggers
// ============================================

import connectDB from '@/lib/db/connect';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import User from '@/lib/db/models/User';
import { getCharacter, getAllCharacters } from '@/lib/characters';
import { ICharacter } from '@/types';
import { calculateTrustLevel } from '@/lib/utils/trust-calculator';
import { getDaysSince } from '@/lib/utils/time-context';

export interface IntroductionCheck {
  shouldIntroduce: boolean;
  introducerCharacterId: string;
  targetCharacterId: string;
  introductionDialogue: string;
}

/**
 * Check if any character should be introduced based on current trust levels
 */
export async function checkForIntroductions(
  userId: string,
  conversationId: string,
  characterId: string,
): Promise<IntroductionCheck | null> {
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) return null;

  const unlockedIds = (user as { unlockedCharacters: string[] }).unlockedCharacters || [];
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) return null;

  const conv = conversation as {
    messageCount: number;
    createdAt: Date;
    emotionalMomentCount: number;
    userInitiatedCount: number;
  };

  // Calculate current trust level
  const trustLevel = calculateTrustLevel({
    messageCount: conv.messageCount || 0,
    daysSinceFirst: getDaysSince(conv.createdAt),
    emotionalMomentCount: conv.emotionalMomentCount || 0,
    userInitiatedCount: conv.userInitiatedCount || 0,
  });

  // Update trust level in conversation
  await Conversation.findByIdAndUpdate(conversationId, { trustLevel });

  const currentCharacter = getCharacter(characterId);
  if (!currentCharacter) return null;

  // Check each relationship for introduction opportunities
  for (const [targetId, relationship] of Object.entries(currentCharacter.relationships)) {
    if (relationship.introducesAt <= 0) continue; // This character doesn't introduce this one
    if (unlockedIds.includes(targetId)) continue; // Already unlocked

    const targetCharacter = getCharacter(targetId);
    if (!targetCharacter) continue;
    if (targetCharacter.unlockCondition.type !== 'introduction') continue;
    if (targetCharacter.unlockCondition.introducedBy !== characterId) continue;

    // Check if trust level is high enough
    if (trustLevel >= relationship.introducesAt) {
      // Check that we haven't already tried to introduce recently
      const recentIntroAttempt = await Message.findOne({
        conversationId,
        type: 'introduction',
        'metadata.triggeredIntroduction': targetId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      if (!recentIntroAttempt) {
        return {
          shouldIntroduce: true,
          introducerCharacterId: characterId,
          targetCharacterId: targetId,
          introductionDialogue: relationship.introductionDialogue,
        };
      }
    }
  }

  return null;
}

/**
 * Unlock a character for the user and create initial conversation
 */
export async function unlockCharacter(
  userId: string,
  characterId: string,
  introducedBy: string,
): Promise<string> {
  await connectDB();

  // Add to user's unlocked characters
  await User.findByIdAndUpdate(userId, {
    $addToSet: { unlockedCharacters: characterId },
  });

  const character = getCharacter(characterId);
  if (!character) throw new Error(`Character ${characterId} not found`);

  // Create new conversation
  const conversation = await Conversation.create({
    type: 'direct',
    participants: [characterId],
    userId,
    lastMessage: '',
    trustLevel: 0,
  });

  const introducerName = getCharacter(introducedBy)?.name || introducedBy;

  // Create the character's first message
  const firstMessages = getFirstMessage(character, introducerName);

  for (let i = 0; i < firstMessages.length; i++) {
    await Message.create({
      conversationId: conversation._id.toString(),
      senderId: characterId,
      content: firstMessages[i],
      type: 'text',
      timestamp: new Date(Date.now() + i * 2000),
      readBy: [],
    });
  }

  // Update conversation
  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: firstMessages[firstMessages.length - 1],
    lastMessageAt: new Date(),
    messageCount: firstMessages.length,
    unreadCount: firstMessages.length,
  });

  return conversation._id.toString();
}

function getFirstMessage(character: ICharacter, introducerName: string): string[] {
  const greetings: Record<string, string[]> = {
    rohan: [
      `yooo!! ${introducerName} told me you guys reconnected`,
      'bhai kaise ho?? it\'s been SO long 🎸',
      'tell me everything... what\'s been happening in the gully',
    ],
    priya: [
      `Hey! ${introducerName} shared your number`,
      'It\'s been ages honestly',
      'How have you been? I feel like I\'ve missed so much 🙂',
    ],
    sameer: [
      `BHAIIII 💀💀💀`,
      `${introducerName} gave me your number and i literally screamed`,
      'bro kahan gayab tha tu??',
      'itne saal ho gaye yaar i can\'t even 😭',
    ],
    nisha: [
      'hey',
      `${introducerName} said i should reach out`,
      'it\'s been a while... hope you\'re doing well ✨',
      'i was actually thinking about the old days recently',
    ],
  };

  return greetings[character._id] || [
    `hey! ${introducerName} connected us`,
    'it\'s so good to hear from you!',
  ];
}
