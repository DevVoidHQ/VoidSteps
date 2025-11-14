import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubtask {
  _id?: Types.ObjectId;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface ITask {
  title: string;
  description?: string;
  completed: boolean;
  subtasks: ISubtask[];
  goalId?: Types.ObjectId | null;
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    interval?: number;
    nextOccurrence?: Date | null;
  };
  dueDate?: Date | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}

const subtaskSchema = new Schema<ISubtask>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new Schema<ITaskDocument>({
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
  subtasks: [subtaskSchema],
  goalId: {
    type: Schema.Types.ObjectId,
    ref: 'Goal',
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
  dueDate: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
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

taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ITaskDocument>('Task', taskSchema);
