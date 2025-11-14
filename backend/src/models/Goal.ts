import mongoose, { Document, Schema } from 'mongoose';

export interface IGoal {
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGoalDocument extends IGoal, Document {}

const goalSchema = new Schema<IGoalDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

goalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IGoalDocument>('Goal', goalSchema);
