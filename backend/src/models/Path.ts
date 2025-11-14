import mongoose, { Document, Schema } from 'mongoose';

export interface IPath {
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPathDocument extends IPath, Document {}

const pathSchema = new Schema<IPathDocument>({
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

pathSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IPathDocument>('Path', pathSchema);
