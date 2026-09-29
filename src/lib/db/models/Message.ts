import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system' | 'introduction';
  timestamp: Date;
  readBy: string[];
  reactions: { emoji: string; by: string }[];
  replyTo?: string;
  metadata: {
    isBackstoryReveal?: boolean;
    emotionalTone?: string;
    triggeredIntroduction?: string;
  };
}

const MessageSchema = new Schema<MessageDocument>({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'system', 'introduction'], default: 'text' },
  timestamp: { type: Date, default: Date.now },
  readBy: { type: [String], default: [] },
  reactions: [{
    emoji: String,
    by: String,
  }],
  replyTo: { type: String },
  metadata: {
    isBackstoryReveal: { type: Boolean, default: false },
    emotionalTone: { type: String },
    triggeredIntroduction: { type: String },
  },
});

MessageSchema.index({ conversationId: 1, timestamp: 1 });

export default mongoose.models.Message || mongoose.model<MessageDocument>('Message', MessageSchema);
