import mongoose, { Schema, Document } from 'mongoose';

export interface ConversationDocument extends Document {
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

const ConversationSchema = new Schema<ConversationDocument>({
  type: { type: String, enum: ['direct', 'group'], required: true },
  participants: { type: [String], required: true },
  userId: { type: String, required: true },
  groupName: { type: String },
  groupIcon: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessage: { type: String, default: '' },
  trustLevel: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  emotionalMomentCount: { type: Number, default: 0 },
  userInitiatedCount: { type: Number, default: 0 },
  unreadCount: { type: Number, default: 0 },
});

ConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation || mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
