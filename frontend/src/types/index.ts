export interface Path {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
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

export interface StepTemplate {
  _id?: string;
  title: string;
  description?: string;
  pathId?: string;
  prioritizedToday?: boolean;
}

export interface Routine {
  _id: string;
  title: string;
  description?: string;
  stepTemplates: StepTemplate[];
  createdAt: string;
  updatedAt: string;
}
