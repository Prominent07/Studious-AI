export interface Note {
  id: string;
  title: string;
  content: string;
  strokes: Stroke[];
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  flashcards?: Flashcard[];
  quizzes?: Quiz[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  isDifficult?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  score?: number;
  completedAt?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Stroke {
  id: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export type Tool = 'pen' | 'eraser' | 'highlighter' | 'lasso' | 'text';
