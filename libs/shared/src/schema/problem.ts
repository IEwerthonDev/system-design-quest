export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  metrics: {
    rps?: number;
    dau?: number;
    storageGb?: number;
  };
}
