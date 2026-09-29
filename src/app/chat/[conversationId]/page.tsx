'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/store/chat-store';
import { IMessage } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';

const CHARACTER_NAMES: Record<string, string> = {
  arjun: 'Arjun',
  meera: 'Meera',
  rohan: 'Rohan',
  priya: 'Priya',
  sameer: 'Sameer',
  nisha: 'Nisha',
};

const CHARACTER_COLORS: Record<string, string> = {
  arjun: '#25d366',
  meera: '#f43f5e',
  rohan: '#53bdeb',
  priya: '#f59e0b',
  sameer: '#a78bfa',
  nisha: '#f472b6',
};

export default function ChatView({ params }: { params: Promise<{ conversationId: string }> }) {
  const router = useRouter();
  const {
    userId,
    conversations,
    messages,
    isTyping,
    setMessages,
    addMessage,
    setTyping,
    setActiveConversation,
    updateConversation,
    setConversations,
    setUnlockedCharacters,
  } = useChatStore();

  const [conversationId, setConversationId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => {
      setConversationId(p.conversationId);
      setActiveConversation(p.conversationId);
    });
  }, [params, setActiveConversation]);

  const conversation = conversations.find((c) => c._id === conversationId);
  const conversationMessages = messages[conversationId] || [];
  const isGroup = conversation?.type === 'group';

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoadingMessages(true);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
      const data = await res.json();
      setMessages(conversationId, data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId, setMessages]);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages, isTyping]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || sending || !userId || !conversationId) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistically add user message
    const tempUserMsg: IMessage = {
      _id: `temp-${Date.now()}`,
      conversationId,
      senderId: 'user',
      content: messageText,
      type: 'text',
      timestamp: new Date(),
      readBy: ['user'],
      reactions: [],
      metadata: {},
    };
    addMessage(conversationId, tempUserMsg);

    // Show typing indicator for the first participant
    const typingCharId = conversation?.participants[0] || '';
    setTyping(typingCharId, true);

    try {
      const endpoint = isGroup ? '/api/chat/group' : '/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: messageText,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Chat error:', data.error);
        setTyping(typingCharId, false);
        setSending(false);
        return;
      }

      setTyping(typingCharId, false);

      // Add character messages with delays for realistic feel
      const charMessages = data.messages || [];

      for (let i = 0; i < charMessages.length; i++) {
        const msg = charMessages[i];
        const delay = msg.delay || 800;

        // Show typing for current character
        setTyping(msg.senderId, true);

        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 2500)));

        setTyping(msg.senderId, false);

        addMessage(conversationId, {
          _id: msg._id,
          conversationId,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type || 'text',
          timestamp: new Date(msg.timestamp),
          readBy: [],
          reactions: [],
          metadata: msg.metadata || {},
        });

        // Small gap between consecutive messages from same character
        if (i < charMessages.length - 1 && charMessages[i + 1].senderId === msg.senderId) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Handle character introduction
      if (data.introduction) {
        const { characterId: newCharId, characterName } = data.introduction;

        // Show introduction system message
        addMessage(conversationId, {
          _id: `intro-${Date.now()}`,
          conversationId,
          senderId: 'system',
          content: `🎉 ${characterName} has been introduced! Check your chat list.`,
          type: 'system',
          timestamp: new Date(),
          readBy: [],
          reactions: [],
          metadata: {},
        });

        // Unlock the character
        await fetch('/api/characters/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            characterId: newCharId,
            introducedBy: typingCharId,
          }),
        });

        // Refresh conversations and characters
        const [convRes, charRes] = await Promise.all([
          fetch(`/api/conversations?userId=${userId}`),
          fetch(`/api/characters?userId=${userId}`),
        ]);
        const convData = await convRes.json();
        const charData = await charRes.json();
        setConversations(convData.conversations || []);
        setUnlockedCharacters(charData.unlockedIds || []);
      }

      // Update conversation preview
      if (charMessages.length > 0) {
        const lastMsg = charMessages[charMessages.length - 1];
        updateConversation(conversationId, {
          lastMessage: lastMsg.content,
          lastMessageAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Send error:', err);
      setTyping(typingCharId, false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Date grouping
  const getDateLabel = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
  };

  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'h:mm a');
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: IMessage[] }[] = [];
  let currentDate = '';

  for (const msg of conversationMessages) {
    const dateLabel = getDateLabel(msg.timestamp);
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      groupedMessages.push({ date: dateLabel, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  // Determine first message in consecutive group from same sender
  const isFirstInGroup = (msg: IMessage, index: number, allMessages: IMessage[]) => {
    if (index === 0) return true;
    return allMessages[index - 1].senderId !== msg.senderId;
  };

  const getCharacterName = (id: string) => CHARACTER_NAMES[id] || id;
  const getCharacterColor = (id: string) => CHARACTER_COLORS[id] || 'var(--accent)';

  const headerName = conversation
    ? conversation.type === 'group'
      ? conversation.groupName || 'Group'
      : getCharacterName(conversation.participants[0])
    : 'Chat';

  const typingCharacters = Object.entries(isTyping)
    .filter(([, v]) => v)
    .map(([k]) => getCharacterName(k));

  const headerStatus = typingCharacters.length > 0
    ? `${typingCharacters.join(', ')} typing...`
    : isGroup
      ? conversation?.participants.map((p) => getCharacterName(p)).join(', ')
      : 'online';

  if (!conversationId) {
    return (
      <div className="chat-window">
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header" id="chat-header">
        <button
          className="icon-btn"
          onClick={() => {
            setActiveConversation(null);
            router.push('/chat');
          }}
          style={{ display: 'none' }}
          id="btn-back"
        >
          ←
        </button>

        <div className="chat-avatar">
          <div
            className={`avatar ${
              isGroup ? 'avatar-group' : `avatar-${conversation?.participants[0]}`
            }`}
          >
            {isGroup ? '👥' : headerName[0]}
          </div>
        </div>

        <div className="chat-header-info">
          <div className="chat-header-name">{headerName}</div>
          <div className={`chat-header-status ${typingCharacters.length > 0 ? 'typing' : ''}`}>
            {headerStatus}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="message-area" ref={messageAreaRef} id="message-area">
        {loadingMessages ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="date-separator">
                  <span>{group.date}</span>
                </div>

                {group.messages.map((msg, idx) => {
                  if (msg.type === 'system') {
                    return (
                      <div key={msg._id} className="system-message">
                        <span>{msg.content}</span>
                      </div>
                    );
                  }

                  const isOutgoing = msg.senderId === 'user';
                  const firstInGroup = isFirstInGroup(msg, idx, group.messages);

                  return (
                    <div
                      key={msg._id}
                      className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
                    >
                      <div
                        className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'} ${
                          firstInGroup ? 'first-in-group' : ''
                        }`}
                      >
                        {/* Show sender name in group chats for incoming messages */}
                        {isGroup && !isOutgoing && firstInGroup && (
                          <div
                            className="message-sender"
                            style={{ color: getCharacterColor(msg.senderId) }}
                          >
                            {getCharacterName(msg.senderId)}
                          </div>
                        )}

                        <div className="message-text">{msg.content}</div>

                        <div className="message-time">
                          {formatTime(msg.timestamp)}
                          {isOutgoing && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicators */}
            {typingCharacters.length > 0 && (
              <div className="message-row incoming">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="message-input-container" id="message-input-area">
        <div className="message-input-wrapper">
          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Type a message"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            id="message-input"
          />
        </div>
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputValue.trim() || sending}
          id="btn-send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
