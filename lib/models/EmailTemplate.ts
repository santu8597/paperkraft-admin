import mongoose from 'mongoose';

export interface IEmailTemplate {
  type: 'invitation' | 'reminder';
  subject: string;
  body: string;
  updatedAt?: Date;
}

const EmailTemplateSchema = new mongoose.Schema<IEmailTemplate>({
  type: {
    type: String,
    required: true,
    enum: ['invitation', 'reminder'],
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
