import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStep {
  title: string;
  description?: string;
  completed: boolean;
  pathId?: Types.ObjectId | null;
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    interval?: number;
    nextOccurrence?: Date | null;
  };
  prioritizedToday: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStepDocument extends IStep, Document {}

const stepSchema = new Schema<IStepDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  pathId: {
    type: Schema.Types.ObjectId,
    ref: 'Path',
    default: null
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: null
    },
    interval: {
      type: Number,
      default: 1
    },
    nextOccurrence: {
      type: Date,
      default: null
    }
  },
  prioritizedToday: {
    type: Boolean,
    default: false
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

stepSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IStepDocument>('Step', stepSchema);
