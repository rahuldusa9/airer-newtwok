// ============================================
// AIRER - Type Definitions
// ============================================

export interface UserPreferences {
  theme: 'dark' | 'light';
  notificationSound: boolean;
}

export interface IUser {
  _id?: string;
  name: string;
  groqApiKey: string;
  unlockedCharacters: string[];
  preferences: UserPreferences;
  createdAt: Date;
}

export interface PersonalityTraits {
  traits: string[];
  speakingStyle: string;
  emotionalRange: string;
  quirks: string[];
  flaws: string[];
}

export interface BackstoryLayer {
  trigger: string;
  content: string;
}

export interface RelationshipInfo {
  type: string;
  history: string;
  introducesAt: number;
  introductionDialogue: string;
}

export interface UnlockCondition {
  type: 'default' | 'introduction';
  introducedBy?: string;
  requiredTrustLevel?: number;
}

export interface ICharacter {
  _id: string;
  name: string;
  avatar: string;
  tagline: string;
  age: number;
  personality: PersonalityTraits;
  backstory: {
    full: string;
    revealLayers: BackstoryLayer[];
  };
  relationships: Record<string, RelationshipInfo>;
  unlockCondition: UnlockCondition;
  status: string;
  lastSeen: Date;
  isOnline: boolean;
}

export interface IConversation {
  _id?: string;
  type: 'direct' | 'group';
  participants: string[];
  userId: string;
  groupName?: string;
  groupIcon?: string;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessage: string;
  trustLevel: number;
  messageCount: number;
  emotionalMomentCount: number;
  userInitiatedCount: number;
  unreadCount: number;
}

export interface MessageReaction {
  emoji: string;
  by: string;
}

export interface MessageMetadata {
  isBackstoryReveal?: boolean;
  emotionalTone?: string;
  triggeredIntroduction?: string;
}

export interface IMessage {
  _id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system' | 'introduction';
  timestamp: Date;
  readBy: string[];
  reactions: MessageReaction[];
  replyTo?: string;
  metadata: MessageMetadata;
}

export interface IMemory {
  _id?: string;
  conversationId: string;
  characterId: string;
  type: 'summary' | 'fact' | 'emotion' | 'preference';
  content: string;
  importance: number;
  messageRange?: {
    from: string;
    to: string;
    count: number;
  };
  createdAt: Date;
  expiresAt: Date | null;
}

// AI Response types
export interface AIMessageChunk {
  text: string;
  delay: number;
}

export interface SummarizationResult {
  summary: string;
  facts: { content: string; importance: number }[];
  emotional_state: string;
  topics: string[];
}

// Store types
export interface ChatStore {
  userId: string | null;
  userName: string | null;
  conversations: IConversation[];
  activeConversationId: string | null;
  messages: Record<string, IMessage[]>;
  characters: ICharacter[];
  unlockedCharacterIds: string[];
  isTyping: Record<string, boolean>;
  setUser: (id: string, name: string) => void;
  setConversations: (conversations: IConversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: IMessage) => void;
  setMessages: (conversationId: string, messages: IMessage[]) => void;
  setCharacters: (characters: ICharacter[]) => void;
  setUnlockedCharacters: (ids: string[]) => void;
  setTyping: (characterId: string, isTyping: boolean) => void;
  updateConversation: (id: string, updates: Partial<IConversation>) => void;
}
