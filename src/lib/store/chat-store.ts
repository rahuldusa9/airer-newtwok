import { create } from 'zustand';
import { IConversation, IMessage, ICharacter, ChatStore } from '@/types';

export const useChatStore = create<ChatStore>((set) => ({
  userId: null,
  userName: null,
  conversations: [],
  activeConversationId: null,
  messages: {},
  characters: [],
  unlockedCharacterIds: [],
  isTyping: {},

  setUser: (id: string, name: string) =>
    set({ userId: id, userName: name }),

  setConversations: (conversations: IConversation[]) =>
    set({ conversations }),

  setActiveConversation: (id: string | null) =>
    set({ activeConversationId: id }),

  addMessage: (conversationId: string, message: IMessage) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] || []),
          message,
        ],
      },
    })),

  setMessages: (conversationId: string, messages: IMessage[]) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: messages,
      },
    })),

  setCharacters: (characters: ICharacter[]) =>
    set({ characters }),

  setUnlockedCharacters: (ids: string[]) =>
    set({ unlockedCharacterIds: ids }),

  setTyping: (characterId: string, isTyping: boolean) =>
    set((state) => ({
      isTyping: {
        ...state.isTyping,
        [characterId]: isTyping,
      },
    })),

  updateConversation: (id: string, updates: Partial<IConversation>) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv._id === id ? { ...conv, ...updates } : conv,
      ),
    })),
}));
