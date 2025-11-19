// Compatible with both MongoDB and Convex backends
export interface Path {
  _id: string;
  title: string;
  description?: string;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface Step {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string | number;
  failed?: boolean;
  failedAt?: string | number;
  pathId?: Path | string | null;
  path?: Path | null; // Populated path from Convex
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    interval?: number;
    nextOccurrence?: string | number | null;
  };
  prioritizedToday: boolean;
  createdAt: string | number;
  updatedAt: string | number;
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
  createdAt: string | number;
  updatedAt: string | number;
}
