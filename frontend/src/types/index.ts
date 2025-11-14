export interface Goal {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  subtasks: Subtask[];
  goalId?: Goal | null;
  recurring: {
    enabled: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    nextOccurrence?: string;
  };
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}
