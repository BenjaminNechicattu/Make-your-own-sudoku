export type Board = number[][];
export type Notes = number[][][];
export type Mode = 'create' | 'solve';
export type Snapshot = { board: Board; notes: Notes };
export type Screen = 'home' | 'game' | 'settings' | 'history' | 'learn';
export type CompletedPuzzle = {
  id: string;
  board: Board;
  completedAt: string;
  elapsedSeconds: number;
  outcome: 'won' | 'failed';
  difficulty?: string;
  solutionCount?: number;
};
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Very hard' | 'Expert';
export type CellPosition = [number, number];
export type ClueSuggestion = {
  row: number;
  col: number;
  digit: number;
  solutionCount: number;
  difficulty: Difficulty;
};
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
export type PersistedState = {
  board: Board;
  notes: Notes;
  givens: boolean[][];
  mode: Mode;
  history: Snapshot[];
  finished: boolean;
  lives: number;
  elapsedSeconds: number;
  hasActiveGame: boolean;
  completedPuzzles: CompletedPuzzle[];
  hintsRemaining?: number;
  solutionCount?: number;
  playerName: string;
  hasProvidedName?: boolean;
  streak: number;
  lastCompletionDate: string | null;
  darkMode: boolean;
  highlightColor: string;
  highlightOpacity: number;
};
