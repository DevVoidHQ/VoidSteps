export interface Path {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Substep {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Step {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  substeps: Substep[];
  pathId?: Path | null;
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    nextOccurrence?: string;
  };
  prioritizedToday: boolean;
  createdAt: string;
  updatedAt: string;
}
