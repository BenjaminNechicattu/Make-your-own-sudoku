import { HIGHLIGHT_COLORS, MAX_HINTS, MAX_LIVES, MAX_SOLUTION_COUNT, SIZE } from './constants';
import type { Board, CompletedPuzzle, Difficulty, Mode, Notes, PersistedState } from './types';

export function isBoard(value: unknown): value is Board {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every(
          (digit) =>
            Number.isInteger(digit) && digit >= 0 && digit <= SIZE,
        ),
    )
  );
}

export function isNotes(value: unknown): value is Notes {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every(
          (cell) =>
            Array.isArray(cell) &&
            cell.every(
              (digit) =>
                Number.isInteger(digit) && digit >= 1 && digit <= SIZE,
            ),
        ),
    )
  );
}

export function isGivens(value: unknown): value is boolean[][] {
  return (
    Array.isArray(value) &&
    value.length === SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIZE &&
        row.every((cell) => typeof cell === 'boolean'),
    )
  );
}

export function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false;
  const saved = value as Partial<PersistedState>;
  return (
    isBoard(saved.board) &&
    isNotes(saved.notes) &&
    isGivens(saved.givens) &&
    (saved.mode === 'create' || saved.mode === 'solve') &&
    Array.isArray(saved.history) &&
    saved.history.every(
      (snapshot) =>
        isBoard(snapshot?.board) && isNotes(snapshot?.notes),
    ) &&
    typeof saved.finished === 'boolean' &&
    typeof saved.lives === 'number' &&
    Number.isInteger(saved.lives) &&
    saved.lives >= 0 &&
    saved.lives <= MAX_LIVES &&
    typeof saved.elapsedSeconds === 'number' &&
    Number.isFinite(saved.elapsedSeconds) &&
    saved.elapsedSeconds >= 0 &&
    typeof saved.hasActiveGame === 'boolean' &&
    (saved.hintsRemaining === undefined ||
      (Number.isInteger(saved.hintsRemaining) &&
        saved.hintsRemaining >= 0 &&
        saved.hintsRemaining <= MAX_HINTS)) &&
    (saved.solutionCount === undefined ||
      (Number.isInteger(saved.solutionCount) &&
        saved.solutionCount >= 0 &&
        saved.solutionCount <= MAX_SOLUTION_COUNT)) &&
    Array.isArray(saved.completedPuzzles) &&
    saved.completedPuzzles.every(
      (puzzle) =>
        typeof puzzle?.id === 'string' &&
        isBoard(puzzle.board) &&
        typeof puzzle.completedAt === 'string' &&
        Number.isFinite(Date.parse(puzzle.completedAt)) &&
        typeof puzzle.elapsedSeconds === 'number' &&
        Number.isFinite(puzzle.elapsedSeconds) &&
        puzzle.elapsedSeconds >= 0 &&
        (puzzle.outcome === undefined ||
          puzzle.outcome === 'won' ||
          puzzle.outcome === 'failed') &&
        (puzzle.difficulty === undefined ||
          ['Easy', 'Medium', 'Hard', 'Very hard', 'Expert'].includes(
            puzzle.difficulty,
          )) &&
        (puzzle.solutionCount === undefined ||
          (Number.isInteger(puzzle.solutionCount) &&
            puzzle.solutionCount >= 0 &&
            puzzle.solutionCount <= MAX_SOLUTION_COUNT)),
    ) &&
    typeof saved.playerName === 'string' &&
    (saved.hasProvidedName === undefined ||
      typeof saved.hasProvidedName === 'boolean') &&
    typeof saved.streak === 'number' &&
    Number.isInteger(saved.streak) &&
    saved.streak >= 0 &&
    (saved.lastCompletionDate === null ||
      (typeof saved.lastCompletionDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(saved.lastCompletionDate))) &&
    typeof saved.darkMode === 'boolean' &&
    typeof saved.highlightColor === 'string' &&
    HIGHLIGHT_COLORS.includes(saved.highlightColor) &&
    typeof saved.highlightOpacity === 'number' &&
    [0.15, 0.25, 0.4, 0.6].includes(saved.highlightOpacity)
  );
}
