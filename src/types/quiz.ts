export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  headline: string;
  perspective: string;
}

export interface DayData {
  played: boolean;
  categories: number;
  correct: number;
  total: number;
}

export interface UserStats {
  totalCorrect: number;
  totalAnswered: number;
  bestStreak: number;
  currentStreak: number;
  lastPlayedDate: string | null;
  completedToday: string[];
  calendarDays: Record<string, DayData>;
}