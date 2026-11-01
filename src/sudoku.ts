import { SIZE, SOLUTION_COUNT_LIMIT } from './constants';
import type { Board, CellPosition, Difficulty } from './types';

export function isConflict(board: Board, row: number, col: number, digit: number) {
  for (let index = 0; index < SIZE; index += 1) {
    if (index !== col && board[row][index] === digit) return true;
    if (index !== row && board[index][col] === digit) return true;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === digit) return true;
    }
  }
  return false;
}

export function isComplete(board: Board) {
  return board.every((row, rowIndex) =>
    row.every(
      (digit, colIndex) =>
        digit !== 0 && !isConflict(board, rowIndex, colIndex, digit),
    ),
  );
}

export function analyzeSolutions(
  board: Board,
  limit = SOLUTION_COUNT_LIMIT,
): { solution: Board | null; count: number } {
  const solution = board.map((row) => [...row]);

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (
        solution[row][col] !== 0 &&
        isConflict(solution, row, col, solution[row][col])
      ) {
        return { solution: null, count: 0 };
      }
    }
  }

  let count = 0;
  let firstSolution: Board | null = null;
  const solve = (): void => {
    if (count >= limit) return;
    let bestCell: [number, number] | null = null;
    let bestCandidates: number[] = [];

    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (solution[row][col] !== 0) continue;
        const candidates = Array.from({ length: SIZE }, (_, index) => index + 1)
          .filter((digit) => !isConflict(solution, row, col, digit));
        if (candidates.length === 0) return;
        if (!bestCell || candidates.length < bestCandidates.length) {
          bestCell = [row, col];
          bestCandidates = candidates;
          if (candidates.length === 1) break;
        }
      }
      if (bestCandidates.length === 1) break;
    }

    if (!bestCell) {
      count += 1;
      if (!firstSolution) firstSolution = solution.map((row) => [...row]);
      return;
    }
    const [row, col] = bestCell;
    for (const digit of bestCandidates) {
      solution[row][col] = digit;
      solve();
      if (count >= limit) break;
    }
    solution[row][col] = 0;
  };

  solve();
  return { solution: firstSolution, count };
}

export function analyzeDifficulty(puzzle: Board): Difficulty {
  const board = puzzle.map((row) => [...row]);
  const candidates = board.map((row, rowIndex) =>
    row.map((digit, colIndex) =>
      digit
        ? [digit]
        : Array.from({ length: SIZE }, (_, index) => index + 1).filter(
            (value) => !isConflict(board, rowIndex, colIndex, value),
          ),
    ),
  );
  const units: CellPosition[][] = [];
  for (let index = 0; index < SIZE; index += 1) {
    units.push(
      Array.from({ length: SIZE }, (_, cell) => [index, cell] as CellPosition),
      Array.from({ length: SIZE }, (_, cell) => [cell, index] as CellPosition),
    );
  }
  for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
    for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
      const box: CellPosition[] = [];
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let col = boxCol; col < boxCol + 3; col += 1) {
          box.push([row, col]);
        }
      }
      units.push(box);
    }
  }

  const peers = (first: CellPosition, second: CellPosition) =>
    first[0] === second[0] ||
    first[1] === second[1] ||
    (Math.floor(first[0] / 3) === Math.floor(second[0] / 3) &&
      Math.floor(first[1] / 3) === Math.floor(second[1] / 3));
  const removeCandidate = (row: number, col: number, digit: number) => {
    const before = candidates[row][col].length;
    candidates[row][col] = candidates[row][col].filter(
      (candidate) => candidate !== digit,
    );
    return candidates[row][col].length !== before;
  };
  const placeDigit = (row: number, col: number, digit: number) => {
    if (board[row][col] !== 0) return board[row][col] === digit;
    if (!candidates[row][col].includes(digit)) return false;
    board[row][col] = digit;
    candidates[row][col] = [digit];
    for (const [peerRow, peerCol] of units.flat()) {
      if (
        (peerRow !== row || peerCol !== col) &&
        peers([row, col], [peerRow, peerCol]) &&
        board[peerRow][peerCol] === 0
      ) {
        removeCandidate(peerRow, peerCol, digit);
        if (candidates[peerRow][peerCol].length === 0) return false;
      }
    }
    return true;
  };
  const isSolved = () =>
    board.every((row) => row.every((digit) => digit !== 0));
  let hardest: Difficulty = 'Easy';
  const difficultyRank: Record<Difficulty, number> = {
    Easy: 0,
    Medium: 1,
    Hard: 2,
    'Very hard': 3,
    Expert: 4,
  };
  const recordTechnique = (difficulty: Difficulty) => {
    if (difficultyRank[difficulty] > difficultyRank[hardest]) {
      hardest = difficulty;
    }
  };
  const markExpert = (): Difficulty => 'Expert';
  const validCandidates = () =>
    candidates.every((row, rowIndex) =>
      row.every(
        (cell, colIndex) => board[rowIndex][colIndex] !== 0 || cell.length > 0,
      ),
    );

  for (let step = 0; step < 1000 && !isSolved(); step += 1) {
    if (!validCandidates()) return markExpert();

    let placed = true;
    while (placed) {
      placed = false;
      for (let row = 0; row < SIZE && !placed; row += 1) {
        for (let col = 0; col < SIZE; col += 1) {
          if (board[row][col] === 0 && candidates[row][col].length === 1) {
            if (!placeDigit(row, col, candidates[row][col][0])) {
              return markExpert();
            }
            placed = true;
            break;
          }
        }
      }
      if (placed) {
        recordTechnique('Easy');
        continue;
      }

      for (const unit of units) {
        for (let digit = 1; digit <= SIZE; digit += 1) {
          const positions = unit.filter(
            ([row, col]) =>
              board[row][col] === 0 && candidates[row][col].includes(digit),
          );
          if (positions.length === 1) {
            const [row, col] = positions[0];
            if (!placeDigit(row, col, digit)) return markExpert();
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) recordTechnique('Easy');
    }
    if (isSolved()) break;

    let changed = false;

    for (const box of units.slice(SIZE * 2)) {
      for (let digit = 1; digit <= SIZE && !changed; digit += 1) {
        const positions = box.filter(
          ([row, col]) =>
            board[row][col] === 0 && candidates[row][col].includes(digit),
        );
        if (positions.length < 2) continue;
        const sameRow = positions.every(([row]) => row === positions[0][0]);
        const sameCol = positions.every(([, col]) => col === positions[0][1]);
        if (sameRow) {
          const row = positions[0][0];
          for (let col = 0; col < SIZE; col += 1) {
            if (
              Math.floor(col / 3) !== Math.floor(positions[0][1] / 3) &&
              board[row][col] === 0
            ) {
              changed = removeCandidate(row, col, digit) || changed;
            }
          }
        } else if (sameCol) {
          const col = positions[0][1];
          for (let row = 0; row < SIZE; row += 1) {
            if (
              Math.floor(row / 3) !== Math.floor(positions[0][0] / 3) &&
              board[row][col] === 0
            ) {
              changed = removeCandidate(row, col, digit) || changed;
            }
          }
        }
      }
    }
    if (changed) {
      recordTechnique('Medium');
      continue;
    }

    for (const line of units.slice(0, SIZE * 2)) {
      for (let digit = 1; digit <= SIZE && !changed; digit += 1) {
        const positions = line.filter(
          ([row, col]) =>
            board[row][col] === 0 && candidates[row][col].includes(digit),
        );
        if (positions.length < 2) continue;
        const boxRow = Math.floor(positions[0][0] / 3);
        const boxCol = Math.floor(positions[0][1] / 3);
        const confinedToBox = positions.every(
          ([row, col]) =>
            Math.floor(row / 3) === boxRow &&
            Math.floor(col / 3) === boxCol,
        );
        if (!confinedToBox) continue;

        for (const [row, col] of units[SIZE * 2 + boxRow * 3 + boxCol]) {
          if (
            !line.some(
              ([lineRow, lineCol]) => lineRow === row && lineCol === col,
            ) &&
            board[row][col] === 0
          ) {
            changed = removeCandidate(row, col, digit) || changed;
          }
        }
      }
    }
    if (changed) {
      recordTechnique('Medium');
      continue;
    }

    for (const unit of units) {
      for (let first = 0; first < unit.length && !changed; first += 1) {
        const [row, col] = unit[first];
        const pair = candidates[row][col];
        if (board[row][col] !== 0 || pair.length !== 2) continue;
        const matching = unit.filter(
          ([otherRow, otherCol]) =>
            board[otherRow][otherCol] === 0 &&
            candidates[otherRow][otherCol].length === 2 &&
            candidates[otherRow][otherCol].every((digit) =>
              pair.includes(digit),
            ),
        );
        if (matching.length !== 2) continue;
        for (const [otherRow, otherCol] of unit) {
          if (
            !matching.some(
              ([pairRow, pairCol]) =>
                pairRow === otherRow && pairCol === otherCol,
            )
          ) {
            for (const digit of pair) {
              changed =
                removeCandidate(otherRow, otherCol, digit) || changed;
            }
          }
        }
      }
    }
    if (changed) {
      recordTechnique('Medium');
      continue;
    }

    for (const unit of units) {
      for (let firstDigit = 1; firstDigit <= SIZE && !changed; firstDigit += 1) {
        const firstPositions = unit.filter(
          ([row, col]) =>
            board[row][col] === 0 &&
            candidates[row][col].includes(firstDigit),
        );
        if (firstPositions.length !== 2) continue;
        for (
          let secondDigit = firstDigit + 1;
          secondDigit <= SIZE && !changed;
          secondDigit += 1
        ) {
          const secondPositions = unit.filter(
            ([row, col]) =>
              board[row][col] === 0 &&
              candidates[row][col].includes(secondDigit),
          );
          if (
            secondPositions.length !== 2 ||
            !firstPositions.every(([row, col]) =>
              secondPositions.some(
                ([otherRow, otherCol]) =>
                  row === otherRow && col === otherCol,
              ),
            )
          ) {
            continue;
          }
          for (const [row, col] of firstPositions) {
            for (const digit of [...candidates[row][col]]) {
              if (digit !== firstDigit && digit !== secondDigit) {
                changed = removeCandidate(row, col, digit) || changed;
              }
            }
          }
        }
      }
    }
    if (changed) {
      recordTechnique('Medium');
      continue;
    }

    const applyFish = (size: 2 | 3, transpose: boolean) => {
      for (let digit = 1; digit <= SIZE && !changed; digit += 1) {
        const covers: { base: number; cover: number[] }[] = [];
        for (let base = 0; base < SIZE; base += 1) {
          const cover = Array.from({ length: SIZE }, (_, index) => index).filter(
            (index) => {
              const row = transpose ? index : base;
              const col = transpose ? base : index;
              return board[row][col] === 0 && candidates[row][col].includes(digit);
            },
          );
          if (cover.length >= 2 && cover.length <= size) {
            covers.push({ base, cover });
          }
        }
        const chooseBases = (start: number, selected: typeof covers) => {
          if (changed) return;
          if (selected.length === size) {
            const coverIndexes = [...new Set(selected.flatMap((item) => item.cover))];
            if (coverIndexes.length !== size) return;
            for (const coverIndex of coverIndexes) {
              for (let base = 0; base < SIZE; base += 1) {
                if (selected.some((item) => item.base === base)) continue;
                const row = transpose ? coverIndex : base;
                const col = transpose ? base : coverIndex;
                if (board[row][col] === 0) {
                  changed = removeCandidate(row, col, digit) || changed;
                }
              }
            }
            return;
          }
          for (let index = start; index < covers.length; index += 1) {
            chooseBases(index + 1, [...selected, covers[index]]);
            if (changed) return;
          }
        };
        chooseBases(0, []);
      }
    };
    applyFish(2, false);
    if (changed) {
      recordTechnique('Hard');
      continue;
    }
    applyFish(2, true);
    if (changed) {
      recordTechnique('Hard');
      continue;
    }
    applyFish(3, false);
    if (changed) {
      recordTechnique('Very hard');
      continue;
    }
    applyFish(3, true);
    if (changed) {
      recordTechnique('Very hard');
      continue;
    }

    for (let pivotRow = 0; pivotRow < SIZE && !changed; pivotRow += 1) {
      for (let pivotCol = 0; pivotCol < SIZE && !changed; pivotCol += 1) {
        const pivotCandidates = candidates[pivotRow][pivotCol];
        if (board[pivotRow][pivotCol] !== 0 || pivotCandidates.length !== 2) continue;
        const [x, y] = pivotCandidates;
        const wings = units.flat().filter(([row, col]) => {
          const wingCandidates = candidates[row][col];
          return (
            board[row][col] === 0 &&
            wingCandidates.length === 2 &&
            peers([pivotRow, pivotCol], [row, col])
          );
        });
        for (const firstWing of wings) {
          if (changed) break;
          const firstCandidates = candidates[firstWing[0]][firstWing[1]];
          const sharedWithFirst = firstCandidates.find(
            (digit) => digit !== x && digit !== y,
          );
          const pivotValueFirst = firstCandidates.find(
            (digit) => pivotCandidates.includes(digit),
          );
          if (!sharedWithFirst || !pivotValueFirst) continue;
          for (const secondWing of wings) {
            if (
              changed ||
              (firstWing[0] === secondWing[0] &&
                firstWing[1] === secondWing[1])
            ) {
              continue;
            }
            const secondCandidates = candidates[secondWing[0]][secondWing[1]];
            if (
              !secondCandidates.includes(sharedWithFirst) ||
              !secondCandidates.includes(
                pivotValueFirst === x ? y : x,
              )
            ) {
              continue;
            }
            for (let row = 0; row < SIZE; row += 1) {
              for (let col = 0; col < SIZE; col += 1) {
                const target: CellPosition = [row, col];
                if (
                  board[row][col] === 0 &&
                  candidates[row][col].includes(sharedWithFirst) &&
                  !(
                    (row === firstWing[0] && col === firstWing[1]) ||
                    (row === secondWing[0] && col === secondWing[1])
                  ) &&
                  peers(target, firstWing) &&
                  peers(target, secondWing)
                ) {
                  changed =
                    removeCandidate(row, col, sharedWithFirst) || changed;
                }
              }
            }
          }
        }
      }
    }
    if (changed) {
      recordTechnique('Very hard');
      continue;
    }

    return 'Expert';
  }

  return isSolved() ? hardest : 'Expert';
}

export function updateCell(board: Board, row: number, col: number, digit: number) {
  const next = board.map((line) => [...line]);
  next[row][col] = digit;
  return next;
}
