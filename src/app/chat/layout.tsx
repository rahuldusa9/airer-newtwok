'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/store/chat-store';
import { IConversation } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const AVATAR_INITIALS: Record<string, string> = {
  arjun: 'A',
  meera: 'M',
  rohan: 'R',
  priya: 'P',
  sameer: 'S',
  nisha: 'N',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    userId,
    userName,
    conversations,
    activeConversationId,
    unlockedCharacterIds,
    setUser,
    setConversations,
    setActiveConversation,
    setUnlockedCharacters,
    setCharacters,
  } = useChatStore();

  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async (uid: string) => {
    try {
      const [convRes, charRes] = await Promise.all([
        fetch(`/api/conversations?userId=${uid}`),
        fetch(`/api/characters?userId=${uid}`),
      ]);

      const convData = await convRes.json();
      const charData = await charRes.json();

      setConversations(convData.conversations || []);
      setCharacters(charData.characters || []);
      setUnlockedCharacters(charData.unlockedIds || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [setConversations, setCharacters, setUnlockedCharacters]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('airer_userId');
    const storedUserName = localStorage.getItem('airer_userName');

    if (!storedUserId) {
      router.replace('/setup');
      return;
    }

    setUser(storedUserId, storedUserName || 'User');
    loadData(storedUserId);
  }, [router, setUser, loadData]);

  const handleConversationClick = (conv: IConversation) => {
    setActiveConversation(conv._id!);
    router.push(`/chat/${conv._id}`);
  };

  const createGroup = async () => {
    if (selectedMembers.length < 2 || !userId) return;

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          participants: selectedMembers,
          groupName: groupName || 'Gully Gang 🏏',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowGroupModal(false);
        setGroupName('');
        setSelectedMembers([]);
        loadData(userId);
        router.push(`/chat/${data.conversation._id}`);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const getConversationName = (conv: IConversation) => {
    if (conv.type === 'group') return conv.groupName || 'Group';
    const charId = conv.participants[0];
    return charId.charAt(0).toUpperCase() + charId.slice(1);
  };

  const getConversationAvatar = (conv: IConversation) => {
    if (conv.type === 'group') return '👥';
    return AVATAR_INITIALS[conv.participants[0]] || '?';
  };

  const getAvatarClass = (conv: IConversation) => {
    if (conv.type === 'group') return 'avatar avatar-group';
    return `avatar avatar-${conv.participants[0]}`;
  };

  const getTimeLabel = (date: Date | string) => {
    try {
      const d = new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 1) return 'just now';
      if (diffHours < 24) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return formatDistanceToNow(d, { addSuffix: false });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`chat-layout ${activeConversationId ? 'chat-open' : ''}`}>
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <h2>AIRER</h2>
          </div>
          <div className="sidebar-header-actions">
            <button
              className="icon-btn"
              onClick={() => setShowGroupModal(true)}
              title="Create Group"
              id="btn-create-group"
            >
              👥
            </button>
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-chats"
          />
        </div>

        <div className="chat-list">
          {filteredConversations.map((conv) => (
            <div
              key={conv._id}
              className={`chat-list-item ${activeConversationId === conv._id ? 'active' : ''}`}
              onClick={() => handleConversationClick(conv)}
              id={`chat-item-${conv._id}`}
            >
              <div className="chat-avatar">
                <div className={getAvatarClass(conv)}>
                  {getConversationAvatar(conv)}
                </div>
                {conv.type === 'direct' && (
                  <div className="online-indicator" />
                )}
              </div>

              <div className="chat-list-info">
                <div className="chat-list-info-top">
                  <span className="chat-list-name">{getConversationName(conv)}</span>
                  <span className={`chat-list-time ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                    {conv.lastMessageAt ? getTimeLabel(conv.lastMessageAt) : ''}
                  </span>
                </div>
                <div className="chat-list-preview">
                  <span>{conv.lastMessage || 'No messages yet'}</span>
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredConversations.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? 'No chats found' : 'No conversations yet'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {children}

      {/* Group Chat Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="icon-btn" onClick={() => setShowGroupModal(false)}>
                ←
              </button>
              <h3>New Group</h3>
            </div>
            <div className="modal-body">
              <div className="setup-field">
                <label htmlFor="group-name-input">Group Name</label>
                <input
                  id="group-name-input"
                  type="text"
                  placeholder="Gully Gang 🏏"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <label style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, marginBottom: 8, display: 'block' }}>
                Add Members
              </label>
              <div className="character-select-list">
                {unlockedCharacterIds.map((charId) => (
                  <div
                    key={charId}
                    className={`character-select-item ${selectedMembers.includes(charId) ? 'selected' : ''}`}
                    onClick={() => toggleMember(charId)}
                    id={`select-member-${charId}`}
                  >
                    <div className={`avatar avatar-${charId}`} style={{ width: 40, height: 40, fontSize: 16 }}>
                      {AVATAR_INITIALS[charId] || '?'}
                    </div>
                    <div className="character-select-info">
                      <div className="character-select-name">
                        {charId.charAt(0).toUpperCase() + charId.slice(1)}
                      </div>
                    </div>
                    <div className="checkbox-circle">
                      {selectedMembers.includes(charId) && (
                        <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="setup-btn"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={createGroup}
                disabled={selectedMembers.length < 2}
              >
                Create Group ({selectedMembers.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
