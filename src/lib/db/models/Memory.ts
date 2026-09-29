import mongoose, { Schema, Document } from 'mongoose';

export interface MemoryDocument extends Document {
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

const MemorySchema = new Schema<MemoryDocument>({
  conversationId: { type: String, required: true },
  characterId: { type: String, required: true },
  type: { type: String, enum: ['summary', 'fact', 'emotion', 'preference'], required: true },
  content: { type: String, required: true },
  importance: { type: Number, default: 5, min: 1, max: 10 },
  messageRange: {
    from: String,
    to: String,
    count: Number,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
});

MemorySchema.index({ conversationId: 1, characterId: 1, type: 1 });
MemorySchema.index({ characterId: 1, importance: -1 });

export default mongoose.models.Memory || mongoose.model<MemoryDocument>('Memory', MemorySchema);
