import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStepTemplate {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  pathId?: Types.ObjectId | null;
  prioritizedToday?: boolean;
}

export interface IRoutine {
  title: string;
  description?: string;
  stepTemplates: IStepTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoutineDocument extends IRoutine, Document {}

const stepTemplateSchema = new Schema<IStepTemplate>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  pathId: {
    type: Schema.Types.ObjectId,
    ref: 'Path',
    default: null
  },
  prioritizedToday: {
    type: Boolean,
    default: false
  }
});

const routineSchema = new Schema<IRoutineDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  stepTemplates: [stepTemplateSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

routineSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IRoutineDocument>('Routine', routineSchema);
