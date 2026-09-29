import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  name: string;
  groqApiKey: string;
  unlockedCharacters: string[];
  preferences: {
    theme: 'dark' | 'light';
    notificationSound: boolean;
  };
  createdAt: Date;
}

const UserSchema = new Schema<UserDocument>({
  name: { type: String, required: true },
  groqApiKey: { type: String, default: '' },
  unlockedCharacters: { type: [String], default: ['arjun', 'meera'] },
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notificationSound: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
