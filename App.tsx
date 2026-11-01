import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  APP_VERSION,
  BLUE,
  DARK_BACKGROUND,
  DARK_BORDER,
  DARK_MUTED,
  DARK_SURFACE,
  DARK_TEXT,
  EMPTY_BOARD,
  EMPTY_GIVENS,
  EMPTY_NOTES,
  HIGHLIGHT_COLORS,
  INK,
  INSTALL_DISMISSED_KEY,
  MAX_HINTS,
  MAX_LIVES,
  MAX_SOLUTION_COUNT,
  MUTED,
  SIZE,
  SOLUTION_COUNT_LIMIT,
  STORAGE_KEY,
  UPDATE_VERSION_KEY,
} from './src/constants';
import {
  analyzeDifficulty,
  analyzeSolutions,
  isComplete,
  isConflict,
  updateCell,
} from './src/sudoku';
import { colorWithOpacity, dateKey } from './src/helpers';
import {
  isBoard,
  isGivens,
  isNotes,
  isPersistedState,
} from './src/persistence';
import {
  Action,
  MiniBoard,
  OptionButton,
  ScreenHeader,
  SudokuLogo,
} from './src/components';
import { styles } from './src/styles';
import { logError } from './src/logger';
import type {
  Board,
  ClueSuggestion,
  CompletedPuzzle,
  Difficulty,
  InstallPromptEvent,
  Mode,
  Notes,
  PersistedState,
  Screen,
  Snapshot,
} from './src/types';

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, 520) - 40;
  const expandedBoardSize = Math.max(
    120,
    Math.min(340, windowWidth - 88, windowHeight - 180),
  );
  const brandTextWidth = contentWidth - 40;
  const brandTitleFontSize = Math.min(18, brandTextWidth / 14);
  const brandSubtitleFontSize = Math.min(12, brandTextWidth / 26);
  const [splashElapsed, setSplashElapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [storageReadyForWrites, setStorageReadyForWrites] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [notes, setNotes] = useState<Notes>(EMPTY_NOTES);
  const [givens, setGivens] = useState<boolean[][]>(EMPTY_GIVENS);
  const [mode, setMode] = useState<Mode>('create');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [quickInputEnabled, setQuickInputEnabled] = useState(false);
  const [quickInputDigit, setQuickInputDigit] = useState<number | null>(null);
  const [notesEnabled, setNotesEnabled] = useState(false);
  const [notesConfirmationVisible, setNotesConfirmationVisible] = useState(false);
  const [pendingSolveAnalysis, setPendingSolveAnalysis] = useState<{
    solution: Board;
    count: number;
  } | null>(null);
  const [clueSuggestion, setClueSuggestion] =
    useState<ClueSuggestion | null>(null);
  const [suggestionThinking, setSuggestionThinking] = useState(false);
  const [unsolvablePuzzlePromptVisible, setUnsolvablePuzzlePromptVisible] =
    useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);
  const [lives, setLives] = useState(MAX_LIVES);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [keyboardEntry, setKeyboardEntry] = useState('');
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [completedPuzzles, setCompletedPuzzles] = useState<CompletedPuzzle[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [solutionCount, setSolutionCount] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [nameDraft, setNameDraft] = useState('');
  const [hasProvidedName, setHasProvidedName] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lastCompletionDate, setLastCompletionDate] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [highlightOpacity, setHighlightOpacity] = useState(0.25);
  const [storageError, setStorageError] = useState('');
  const [resetConfirmationVisible, setResetConfirmationVisible] = useState(false);
  const [puzzleResetVisible, setPuzzleResetVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [mobileInstallVisible, setMobileInstallVisible] = useState(false);
  const [mobileInstallDismissed, setMobileInstallDismissed] = useState(false);
  const [installPreferenceLoaded, setInstallPreferenceLoaded] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [expandedPuzzle, setExpandedPuzzle] = useState<CompletedPuzzle | null>(
    null,
  );
  const keyboardRef = useRef<TextInput>(null);
  const solutionRef = useRef<Board | null>(null);
  const screenRef = useRef<Screen>(screen);
  const persistedStateRef = useRef<PersistedState | null>(null);
  const skipNextPersistRef = useRef(false);
  screenRef.current = screen;
  persistedStateRef.current = {
    board,
    notes,
    givens,
    mode,
    history,
    finished,
    lives,
    elapsedSeconds,
    hasActiveGame,
    completedPuzzles,
    hintsRemaining,
    solutionCount,
    playerName,
    hasProvidedName,
    streak,
    lastCompletionDate,
    darkMode,
    highlightColor,
    highlightOpacity,
  };

  const rememberInstallPromptDismissal = () => {
    setMobileInstallDismissed(true);
    void AsyncStorage.setItem(INSTALL_DISMISSED_KEY, 'true').catch(
      (error: unknown) => {
        logError('Unable to save MYOS install prompt preference:', error);
        setStorageError('The install prompt preference could not be saved.');
      },
    );
  };

  useEffect(() => {
    const splashTimeout = setTimeout(() => setSplashElapsed(true), 1000);
    return () => clearTimeout(splashTimeout);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const userAgent = window.navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
    if (!isMobile) return undefined;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true);
    if (isStandalone) return undefined;

    setIsIOSBrowser(/iPhone|iPad|iPod/i.test(userAgent));

    const manifestLink = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    if (!manifestLink) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = new URL('manifest.json', document.baseURI).toString();
      document.head.appendChild(link);
    }

    if ('serviceWorker' in window.navigator) {
      void window.navigator.serviceWorker
        .register(new URL('service-worker.js', document.baseURI).toString())
        .catch((error: unknown) => {
          logError('Unable to register MYOS service worker:', error);
        });
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setMobileInstallVisible(false);
      setDeferredInstallPrompt(null);
      rememberInstallPromptDismissal();
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'web') {
      setInstallPreferenceLoaded(true);
      return undefined;
    }

    void AsyncStorage.getItem(INSTALL_DISMISSED_KEY)
      .then((value) => {
        if (cancelled) return;
        setMobileInstallDismissed(value === 'true');
        setInstallPreferenceLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logError('Unable to load MYOS install prompt preference:', error);
        setStorageError('The install prompt preference could not be loaded.');
        setInstallPreferenceLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !hydrated ||
      !installPreferenceLoaded ||
      !hasProvidedName ||
      screen !== 'home' ||
      mobileInstallDismissed
    ) {
      return undefined;
    }
    const installTimeout = setTimeout(
      () => setMobileInstallVisible(true),
      1200,
    );
    return () => clearTimeout(installTimeout);
  }, [
    hydrated,
    installPreferenceLoaded,
    hasProvidedName,
    screen,
    mobileInstallDismissed,
  ]);

  useEffect(() => {
    if (!message) return undefined;
    const messageTimeout = setTimeout(() => setMessage(''), 1000);
    return () => clearTimeout(messageTimeout);
  }, [message]);

  useEffect(() => {
    let cancelled = false;
    const restoreState = async () => {
      try {
        const serialized = await AsyncStorage.getItem(STORAGE_KEY);
        if (serialized && !cancelled) {
          const parsed: unknown = JSON.parse(serialized);
          if (!isPersistedState(parsed)) {
            throw new Error('Saved MYOS data has an invalid format.');
          }
          const saved = parsed;
          if (isBoard(saved.board)) {
            const startingBoard =
              saved.mode === 'solve'
                ? saved.board.map((row, rowIndex) =>
                    row.map((digit, colIndex) =>
                      saved.givens[rowIndex][colIndex] ? digit : 0,
                    ),
                  )
                : saved.board;
            const solutionAnalysis =
              saved.mode === 'solve'
                ? analyzeSolutions(startingBoard)
                : { solution: null, count: 0 };
            setBoard(saved.board);
            setNotes(saved.notes ?? EMPTY_NOTES());
            setGivens(saved.givens ?? EMPTY_GIVENS());
            setMode(saved.mode === 'solve' ? 'solve' : 'create');
            solutionRef.current = solutionAnalysis.solution;
            setSolutionCount(solutionAnalysis.count);
            setHistory(saved.history ?? []);
            setFinished(saved.finished === true);
            setLives(
              typeof saved.lives === 'number'
                ? Math.max(0, Math.min(MAX_LIVES, saved.lives))
                : MAX_LIVES,
            );
            setElapsedSeconds(saved.elapsedSeconds ?? 0);
            setHasActiveGame(saved.hasActiveGame === true);
            setHintsRemaining(saved.hintsRemaining ?? MAX_HINTS);
            setCompletedPuzzles(
              saved.completedPuzzles.map((puzzle) => ({
                ...puzzle,
                outcome: puzzle.outcome ?? 'won',
                solutionCount:
                  puzzle.solutionCount === 11
                    ? undefined
                    : puzzle.solutionCount,
              })),
            );
            setPlayerName(saved.playerName ?? 'Player');
            setHasProvidedName(
              saved.hasProvidedName ??
                (saved.playerName.trim().length > 0 &&
                  saved.playerName !== 'Player'),
            );
            setNameDraft(
              saved.playerName === 'Player' ? '' : saved.playerName,
            );
            setLastCompletionDate(saved.lastCompletionDate ?? null);
            const currentDate = dateKey(new Date());
            const previousDate = saved.lastCompletionDate;
            const daysSinceSavedCompletion = previousDate
              ? Math.floor(
                  (Date.parse(`${currentDate}T00:00:00Z`) -
                    Date.parse(`${previousDate}T00:00:00Z`)) /
                    86_400_000,
                )
              : null;
            setStreak(
              daysSinceSavedCompletion !== null &&
                daysSinceSavedCompletion > 1
                ? 0
                : saved.streak ?? 0,
            );
            setDarkMode(saved.darkMode === true);
            setHighlightColor(
              HIGHLIGHT_COLORS.includes(saved.highlightColor ?? '')
                ? saved.highlightColor!
                : HIGHLIGHT_COLORS[0],
            );
            setHighlightOpacity(
              [0.15, 0.25, 0.4, 0.6].includes(saved.highlightOpacity ?? 0.25)
                ? saved.highlightOpacity!
                : 0.25,
            );
          }
        }
        if (!cancelled) setStorageReadyForWrites(true);
      } catch (error) {
        logError('Unable to restore MYOS data:', error);
        if (!cancelled) setStorageError('Saved data could not be loaded.');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void restoreState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hydrated) return undefined;
    let cancelled = false;

    const checkForAppUpdate = async () => {
      try {
        const lastSeenVersion = await AsyncStorage.getItem(UPDATE_VERSION_KEY);
        if (cancelled) return;
        if (lastSeenVersion === null) {
          await AsyncStorage.setItem(UPDATE_VERSION_KEY, APP_VERSION);
        } else if (lastSeenVersion !== APP_VERSION) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        logError('Unable to check MYOS for updates:', error);
        setStorageError('The app update could not be checked.');
      }
    };

    void checkForAppUpdate();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !storageReadyForWrites) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const savedState = persistedStateRef.current;
    if (!savedState) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))
      .then(() => setStorageError(''))
      .catch((error: unknown) => {
        logError('Unable to save MYOS data:', error);
        setStorageError('Your latest changes could not be saved.');
      });
  }, [
    hydrated,
    storageReadyForWrites,
    board,
    notes,
    givens,
    mode,
    history,
    finished,
    lives,
    hasActiveGame,
    completedPuzzles,
    hintsRemaining,
    solutionCount,
    playerName,
    hasProvidedName,
    streak,
    lastCompletionDate,
    darkMode,
    highlightColor,
    highlightOpacity,
    screen,
  ]);

  useEffect(() => {
    if (
      !hydrated ||
      !storageReadyForWrites ||
      screen !== 'game' ||
      mode !== 'solve' ||
      finished ||
      lives === 0
    ) {
      return undefined;
    }
    const interval = setInterval(() => {
      const savedState = persistedStateRef.current;
      if (!savedState) return;
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedState))
        .then(() => setStorageError(''))
        .catch((error: unknown) => {
          logError('Unable to save MYOS game progress:', error);
          setStorageError('Your latest changes could not be saved.');
        });
    }, 10_000);
    return () => clearInterval(interval);
  }, [hydrated, storageReadyForWrites, screen, mode, finished, lives]);

  useEffect(() => {
    if (screen !== 'game' || mode !== 'solve' || finished || lives === 0) {
      return undefined;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, mode, finished, lives]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (screen === 'home') return false;
        goHome();
        return true;
      },
    );
    return () => subscription.remove();
  }, [screen]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    window.history.pushState({ myosApp: true }, '', window.location.href);
    const handleBrowserBack = () => {
      if (screenRef.current !== 'home') {
        goHome();
      }
      window.history.pushState({ myosApp: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handleBrowserBack);
    return () => window.removeEventListener('popstate', handleBrowserBack);
  }, []);

  useEffect(() => {
    if (screen !== 'settings' && resetConfirmationVisible) {
      setResetConfirmationVisible(false);
    }
  }, [screen, resetConfirmationVisible]);

  useEffect(() => {
    if (screen !== 'settings' && aboutVisible) {
      setAboutVisible(false);
    }
  }, [screen, aboutVisible]);

  const clueCount = useMemo(
    () => board.reduce((count, row) => count + row.filter(Boolean).length, 0),
    [board],
  );
  const completedDigits = useMemo(
    () =>
      new Set(
        Array.from({ length: SIZE }, (_, index) => index + 1).filter(
          (digit) =>
            board.reduce(
              (count, row) =>
                count + row.filter((cell) => cell === digit).length,
              0,
            ) === SIZE,
        ),
      ),
    [board],
  );
  const difficultyPuzzle = useMemo(
    () =>
      mode === 'create'
        ? board
        : board.map((row, rowIndex) =>
            row.map((digit, colIndex) =>
              givens[rowIndex][colIndex] ? digit : 0,
            ),
          ),
    [board, givens, mode],
  );
  const displayedDifficulty = useMemo(
    () => analyzeDifficulty(difficultyPuzzle),
    [difficultyPuzzle],
  );
  const createSolutionAnalysis = useMemo(
    () => (mode === 'create' ? analyzeSolutions(board) : null),
    [board, mode],
  );
  const displayedSolutionCount =
    mode === 'create'
      ? createSolutionAnalysis?.count ?? 0
      : solutionCount;
  const wonPuzzleCount = useMemo(
    () =>
      completedPuzzles.filter((puzzle) => (puzzle.outcome ?? 'won') === 'won')
        .length,
    [completedPuzzles],
  );
  const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const finishPuzzle = (solvedBoard: Board) => {
    recordPuzzle(solvedBoard, 'won');
    setHasActiveGame(false);
    setFinished(true);
    setMessage('Beautifully done — you made and solved your own Sudoku!');
  };

  const recordPuzzle = (finalBoard: Board, outcome: CompletedPuzzle['outcome']) => {
    const now = new Date();
    const startingPuzzle = finalBoard.map((row, rowIndex) =>
      row.map((digit, colIndex) =>
        givens[rowIndex][colIndex] ? digit : 0,
      ),
    );
    setCompletedPuzzles((previous) => [
      {
        id: `${now.getTime()}`,
        board: finalBoard,
        completedAt: now.toISOString(),
        elapsedSeconds,
        outcome,
        difficulty: analyzeDifficulty(startingPuzzle),
        solutionCount,
      },
      ...previous,
    ]);
    if (outcome === 'won') {
      const today = dateKey(now);
      const daysSincePrevious = lastCompletionDate
        ? Math.floor(
            (Date.UTC(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            ) -
              Date.parse(`${lastCompletionDate}T00:00:00Z`)) /
              86_400_000,
          )
        : null;
      setStreak((previous) =>
        lastCompletionDate === today
          ? previous
          : daysSincePrevious === 1
            ? previous + 1
            : 1,
      );
      setLastCompletionDate(today);
    }
  };

  const saveHistory = () => {
    setHistory((previous) => [...previous, { board, notes }]);
  };

  const loseLife = (reason: string) => {
    const remainingLives = lives - 1;
    setLives(remainingLives);
    setMessage(
      remainingLives === 0
        ? 'No lives left. Start a new puzzle and try again!'
        : `${reason} One life lost.`,
    );
    if (remainingLives === 0) {
      recordPuzzle(board, 'failed');
      setFinished(true);
      setHasActiveGame(false);
    }
  };

  const chooseDigit = (
    digit: number,
    target: [number, number] | null = selected,
  ) => {
    if (finished) return;
    if (!target) {
      setMessage('Choose a square first.');
      return;
    }
    const [row, col] = target;
    if (mode === 'solve' && givens[row][col]) {
      setMessage('Your starting clues are locked.');
      return;
    }
    if (notesEnabled && board[row][col] !== 0) {
      setMessage('Erase this square before adding notes.');
      return;
    }
    const removingNote =
      mode === 'solve' && notesEnabled && notes[row][col].includes(digit);
    if (!removingNote && isConflict(board, row, col, digit)) {
      if (mode === 'solve') {
        loseLife(`${digit} conflicts with this row, column, or box.`);
      } else {
        setMessage(`${digit} is already in this row, column, or box.`);
      }
      return;
    }

    if (mode === 'solve' && notesEnabled && !removingNote) {
      const correctDigit = solutionRef.current?.[row][col];
      if (correctDigit === undefined) {
        setMessage('This puzzle has no valid solution, so notes cannot be checked.');
        return;
      }
      if (digit !== correctDigit) {
        loseLife(`${digit} is not correct for this square.`);
        return;
      }
    }

    setMessage('');
    saveHistory();
    if (notesEnabled && mode === 'solve') {
      setNotes((previous) => {
        const next = previous.map((line) => line.map((cell) => [...cell]));
        next[row][col] = next[row][col].includes(digit)
          ? next[row][col].filter((value) => value !== digit)
          : [...next[row][col], digit].sort();
        return next;
      });
      return;
    }

    setBoard((previous) => {
      const next = previous.map((line) => [...line]);
      next[row][col] = digit;
      return next;
    });
    setNotes((previous) => {
      const next = previous.map((line) => line.map((cell) => [...cell]));
      next[row][col] = [];
      return next;
    });
    if (mode === 'solve' && isComplete(updateCell(board, row, col, digit))) {
      finishPuzzle(updateCell(board, row, col, digit));
    }
  };

  const eraseCell = (row: number, col: number) => {
    if (finished) return;
    if (mode === 'solve' && givens[row][col]) {
      setMessage('Your starting clues are locked.');
      return;
    }
    if (board[row][col] === 0 && notes[row][col].length === 0) return;
    saveHistory();
    setMessage('');
    setBoard((previous) => {
      const next = previous.map((line) => [...line]);
      next[row][col] = 0;
      return next;
    });
    setNotes((previous) => {
      const next = previous.map((line) => line.map((cell) => [...cell]));
      next[row][col] = [];
      return next;
    });
  };

  const eraseSelected = () => {
    if (!selected) return;
    eraseCell(selected[0], selected[1]);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setBoard(last.board);
    setNotes(last.notes);
    setHistory((previous) => previous.slice(0, -1));
    setFinished(false);
    setMessage('');
  };

  const suggestClue = async () => {
    if (mode !== 'create' || finished) return;
    if (clueCount === SIZE * SIZE) {
      setMessage('There are no empty squares for a suggested clue.');
      return;
    }

    setSuggestionThinking(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    try {
      const analysis = analyzeSolutions(board);
      if (!analysis.solution || analysis.count === 0) {
        setMessage('Fix the conflicting clues before asking for a suggestion.');
        return;
      }

      const difficultyRank: Record<Difficulty, number> = {
        Easy: 0,
        Medium: 1,
        Hard: 2,
        'Very hard': 3,
        Expert: 4,
      };
      const currentDifficulty = analyzeDifficulty(board);
      let bestSuggestion: ClueSuggestion | null = null;
      const boxOrder = Array.from({ length: SIZE }, (_, index) => index);
      for (let index = boxOrder.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [boxOrder[index], boxOrder[randomIndex]] = [
          boxOrder[randomIndex],
          boxOrder[index],
        ];
      }

      for (const boxIndex of boxOrder) {
        const boxRow = Math.floor(boxIndex / 3) * 3;
        const boxCol = (boxIndex % 3) * 3;
        let boxSuggestion: ClueSuggestion | null = null;
        for (let row = boxRow; row < boxRow + 3; row += 1) {
          for (let col = boxCol; col < boxCol + 3; col += 1) {
            if (board[row][col] !== 0) continue;
            const digit = analysis.solution[row][col];
            const candidateBoard = updateCell(board, row, col, digit);
            const candidateSolutions = analyzeSolutions(candidateBoard);
            const candidateDifficulty = analyzeDifficulty(candidateBoard);
            const doesNotWorsenSolutions =
              candidateSolutions.count <= analysis.count;
            const doesNotWorsenDifficulty =
              difficultyRank[candidateDifficulty] <=
              difficultyRank[currentDifficulty];
            if (!doesNotWorsenSolutions || !doesNotWorsenDifficulty) continue;

            if (
              !boxSuggestion ||
              candidateSolutions.count < boxSuggestion.solutionCount ||
              (candidateSolutions.count === boxSuggestion.solutionCount &&
                difficultyRank[candidateDifficulty] <
                  difficultyRank[boxSuggestion.difficulty])
            ) {
              boxSuggestion = {
                row,
                col,
                digit,
                solutionCount: candidateSolutions.count,
                difficulty: candidateDifficulty,
              };
            }
          }
        }
        if (boxSuggestion) {
          bestSuggestion = boxSuggestion;
          break;
        }
      }

      if (!bestSuggestion) {
        setMessage(
          'I could not find a valid clue that avoids increasing the solution count or estimated difficulty.',
        );
        return;
      }
      setClueSuggestion(bestSuggestion);
    } finally {
      setSuggestionThinking(false);
    }
  };

  const applyClueSuggestion = () => {
    if (!clueSuggestion) return;
    saveHistory();
    setBoard((previous) =>
      updateCell(
        previous,
        clueSuggestion.row,
        clueSuggestion.col,
        clueSuggestion.digit,
      ),
    );
    setSelected([clueSuggestion.row, clueSuggestion.col]);
    setClueSuggestion(null);
    setMessage('Suggested clue added to your puzzle.');
  };

  const startSolving = () => {
    if (clueCount === 0) {
      setMessage('Add at least one starting number to your puzzle.');
      return;
    }
    if (clueCount === SIZE * SIZE) {
      setMessage('Leave a few squares empty so you can solve them yourself.');
      return;
    }
    const analysis = analyzeSolutions(board);
    if (!analysis.solution || analysis.count === 0) {
      solutionRef.current = null;
      setSolutionCount(0);
      setMessage('');
      setUnsolvablePuzzlePromptVisible(true);
      return;
    }

    setPendingSolveAnalysis(analysis.solution
      ? { solution: analysis.solution, count: analysis.count }
      : null);
  };

  const confirmStartSolving = () => {
    if (!pendingSolveAnalysis) return;
    const { solution, count } = pendingSolveAnalysis;
    solutionRef.current = solution;
    setSolutionCount(count);
    setGivens(board.map((row) => row.map((digit) => digit !== 0)));
    setMode('solve');
    setHistory([]);
    setSelected(null);
    setQuickInputDigit(null);
    setNotesEnabled(false);
    setLives(MAX_LIVES);
    setHintsRemaining(MAX_HINTS);
    setElapsedSeconds(0);
    setKeyboardEntry('');
    setHasActiveGame(true);
    setMessage('');
    setPendingSolveAnalysis(null);
  };

  const returnToPuzzle = () => {
    setUnsolvablePuzzlePromptVisible(false);
    setSelected(null);
  };

  const requestHint = () => {
    if (mode !== 'solve' || finished || hintsRemaining === 0) return;
    const solution = solutionRef.current;
    if (!solution) {
      setMessage('No valid solution found for this puzzle, so a hint is unavailable.');
      return;
    }

    const boxes: [number, number][][] = [];
    for (let boxRow = 0; boxRow < SIZE; boxRow += 3) {
      for (let boxCol = 0; boxCol < SIZE; boxCol += 3) {
        const emptyCells: [number, number][] = [];
        for (let row = boxRow; row < boxRow + 3; row += 1) {
          for (let col = boxCol; col < boxCol + 3; col += 1) {
            if (board[row][col] === 0) emptyCells.push([row, col]);
          }
        }
        if (emptyCells.length > 0) boxes.push(emptyCells);
      }
    }

    if (boxes.length === 0) {
      setMessage('There are no empty squares to reveal.');
      return;
    }

    const box = boxes[Math.floor(Math.random() * boxes.length)];
    const [row, col] = box[Math.floor(Math.random() * box.length)];
    const hintedBoard = updateCell(board, row, col, solution[row][col]);
    const remainingHints = hintsRemaining - 1;
    saveHistory();
    setBoard(hintedBoard);
    setNotes((previous) => {
      const next = previous.map((line) => line.map((cell) => [...cell]));
      next[row][col] = [];
      return next;
    });
    setSelected([row, col]);
    setHintsRemaining(remainingHints);
    setMessage(
      `Hint revealed row ${row + 1}, column ${col + 1}. ${remainingHints} hint${remainingHints === 1 ? '' : 's'} left.`,
    );
    if (isComplete(hintedBoard)) finishPuzzle(hintedBoard);
  };

  const fillAllNotes = () => {
    if (mode !== 'solve' || finished) return;
    const hasNotes = notes.some((row) =>
      row.some((cellNotes) => cellNotes.length > 0),
    );
    if (hasNotes) {
      saveHistory();
      setNotes(EMPTY_NOTES());
      setMessage('All notes have been cleared.');
      return;
    }

    const nextNotes = EMPTY_NOTES();
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        if (board[row][col] !== 0) continue;
        nextNotes[row][col] = Array.from(
          { length: SIZE },
          (_, index) => index + 1,
        ).filter((digit) => !isConflict(board, row, col, digit));
      }
    }
    saveHistory();
    setNotes(nextNotes);
    setMessage('All possible notes have been added to empty squares.');
  };

  const toggleNotes = () => {
    if (notesEnabled) {
      setNotesEnabled(false);
      return;
    }
    keyboardRef.current?.blur();
    setNotesConfirmationVisible(true);
  };

  const toggleQuickInput = () => {
    if (quickInputEnabled) {
      setQuickInputEnabled(false);
      setQuickInputDigit(null);
      return;
    }
    setQuickInputEnabled(true);
  };

  const makeAnother = () => {
    setPendingSolveAnalysis(null);
    setClueSuggestion(null);
    setUnsolvablePuzzlePromptVisible(false);
    setPuzzleResetVisible(false);
    setBoard(EMPTY_BOARD());
    setNotes(EMPTY_NOTES());
    setGivens(EMPTY_GIVENS());
    setMode('create');
    setSelected(null);
    setQuickInputDigit(null);
    setNotesEnabled(false);
    setNotesConfirmationVisible(false);
    setHistory([]);
    setMessage('');
    setFinished(false);
    setLives(MAX_LIVES);
    setHintsRemaining(MAX_HINTS);
    setSolutionCount(0);
    setElapsedSeconds(0);
    setKeyboardEntry('');
    setHasActiveGame(true);
    solutionRef.current = null;
    setScreen('game');
  };

  const openNewGame = () => {
    makeAnother();
    setScreen('game');
  };

  const savePlayerName = () => {
    const name = nameDraft.trim();
    if (!name) return;
    setPlayerName(name.slice(0, 24));
    setHasProvidedName(true);
    setNameDraft(name.slice(0, 24));
  };

  const openDeveloperWebsite = async () => {
    try {
      await Linking.openURL('https://benjaminnechicattu.in/');
    } catch (error) {
      logError('Unable to open the developer website:', error);
      setStorageError('The developer website could not be opened.');
    }
  };

  const installApp = async () => {
    if (!deferredInstallPrompt) {
      dismissMobileInstallPrompt();
      return;
    }
    try {
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      setMobileInstallVisible(false);
      rememberInstallPromptDismissal();
    } catch (error) {
      logError('Unable to start MYOS installation:', error);
      setStorageError(
        'Installation could not be started. Try your browser menu to install MYOS.',
      );
    } finally {
      setDeferredInstallPrompt(null);
    }
  };

  const dismissMobileInstallPrompt = () => {
    setMobileInstallVisible(false);
    rememberInstallPromptDismissal();
  };

  const applyAppUpdate = async () => {
    try {
      await AsyncStorage.setItem(UPDATE_VERSION_KEY, APP_VERSION);
      if (Platform.OS === 'web') window.location.reload();
    } catch (error) {
      logError('Unable to save MYOS update version:', error);
      setStorageError('The app update could not be applied.');
    }
  };

  const goHome = () => {
    keyboardRef.current?.blur();
    setFinished(false);
    setPendingSolveAnalysis(null);
    setUnsolvablePuzzlePromptVisible(false);
    setNotesConfirmationVisible(false);
    setResetConfirmationVisible(false);
    setPuzzleResetVisible(false);
    setAboutVisible(false);
    setExpandedPuzzle(null);
    setClueSuggestion(null);
    setScreen('home');
  };

  const resetPuzzle = () => {
    keyboardRef.current?.blur();
    const resetBoard =
      mode === 'solve'
        ? board.map((row, rowIndex) =>
            row.map((digit, colIndex) =>
              givens[rowIndex][colIndex] ? digit : 0,
            ),
          )
        : EMPTY_BOARD();
    setBoard(resetBoard);
    setNotes(EMPTY_NOTES());
    setSelected(null);
    setQuickInputDigit(null);
    setNotesEnabled(false);
    setNotesConfirmationVisible(false);
    setPendingSolveAnalysis(null);
    setClueSuggestion(null);
    setUnsolvablePuzzlePromptVisible(false);
    setPuzzleResetVisible(false);
    setHistory([]);
    setMessage('');
    setFinished(false);
    setLives(MAX_LIVES);
    setHintsRemaining(MAX_HINTS);
    setElapsedSeconds(0);
    setKeyboardEntry('');
    setHasActiveGame(true);
    if (mode === 'create') {
      setSolutionCount(0);
      solutionRef.current = null;
    }
  };

  const resetAppStorage = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, INSTALL_DISMISSED_KEY]);
      skipNextPersistRef.current = true;
      setBoard(EMPTY_BOARD());
      setNotes(EMPTY_NOTES());
      setGivens(EMPTY_GIVENS());
      setMode('create');
      setSelected(null);
      setNotesEnabled(false);
      setHistory([]);
      setMessage('');
      setFinished(false);
      setLives(MAX_LIVES);
      setElapsedSeconds(0);
      setKeyboardEntry('');
      setHasActiveGame(false);
      setCompletedPuzzles([]);
      setHintsRemaining(MAX_HINTS);
      setSolutionCount(0);
      solutionRef.current = null;
      setPlayerName('Player');
      setNameDraft('');
      setHasProvidedName(false);
      setStreak(0);
      setLastCompletionDate(null);
      setDarkMode(false);
      setHighlightColor(HIGHLIGHT_COLORS[0]);
      setHighlightOpacity(0.25);
      setStorageError('');
      setResetConfirmationVisible(false);
      setMobileInstallDismissed(false);
      setInstallPreferenceLoaded(true);
      setScreen('home');
    } catch (error) {
      logError('Unable to reset MYOS app storage:', error);
      setStorageError('App data could not be reset. Please try again.');
      setResetConfirmationVisible(false);
    }
  };

  const selectedDigit = selected ? board[selected[0]][selected[1]] : 0;
  const highlightedDigit =
    quickInputEnabled && quickInputDigit !== null
      ? quickInputDigit
      : selectedDigit;

  const handleKeyboardKey = (key: string) => {
    if (
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight'
    ) {
      setSelected((current) => {
        const [row, col] = current ?? [0, 0];
        if (key === 'ArrowUp') return [Math.max(0, row - 1), col];
        if (key === 'ArrowDown') return [Math.min(SIZE - 1, row + 1), col];
        if (key === 'ArrowLeft') return [row, Math.max(0, col - 1)];
        return [row, Math.min(SIZE - 1, col + 1)];
      });
      setMessage('');
      return;
    }

    if (key === 'Backspace' || key === 'Delete') {
      eraseSelected();
    }
  };

  if (!splashElapsed || !hydrated) {
    return (
      <SafeAreaView style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.splashContent}>
          <View style={styles.splashLogo}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <View key={digit} style={styles.splashCell}>
                <Text style={styles.splashDigit}>
                  {digit === 1 || digit === 5 || digit === 9 ? digit : ''}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.splashBrand}>MYOS</Text>
          <Text style={styles.splashTagline}>Make your own Sudoku</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen !== 'game') {
    const pageBackground = darkMode ? DARK_BACKGROUND : '#f5f8fc';
    const cardBackground = darkMode ? DARK_SURFACE : '#fff';
    const primaryText = darkMode ? DARK_TEXT : INK;
    const secondaryText = darkMode ? DARK_MUTED : MUTED;

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBackground }]}>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <Modal
          visible={
            screen === 'home' &&
            hasProvidedName &&
            updateAvailable
          }
          transparent
          animationType="fade"
          onRequestClose={() => setUpdateAvailable(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
              <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
                Update available
              </Text>
              <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
                A newer version of MYOS is ready. Reload to apply the latest changes.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void applyAppUpdate()}
                style={styles.gameOverButton}
              >
                <Text style={styles.gameOverButtonText}>Reload now</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUpdateAvailable(false)}
                style={styles.gameOverSecondaryButton}
              >
                <Text style={[styles.gameOverSecondaryText, darkMode && styles.darkSecondaryText]}>
                  Later
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={
            screen === 'home' &&
            hasProvidedName &&
            !updateAvailable &&
            mobileInstallVisible
          }
          transparent
          animationType="fade"
          onRequestClose={dismissMobileInstallPrompt}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
              <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
                Install MYOS
              </Text>
              <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
                Add MYOS to your home screen for quick access and an app-like
                experience.
              </Text>
              {!deferredInstallPrompt ? (
                <Text style={[styles.installInstructions, darkMode && styles.darkSecondaryText]}>
                  {isIOSBrowser
                    ? 'Tap Share in your browser, then choose Add to Home Screen.'
                    : 'Open your browser menu and choose Install app or Add to Home screen.'}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => void installApp()}
                style={styles.gameOverButton}
              >
                <Text style={styles.gameOverButtonText}>
                  {deferredInstallPrompt ? 'Install app' : 'Got it'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={dismissMobileInstallPrompt}
                style={styles.gameOverSecondaryButton}
              >
                <Text style={[styles.gameOverSecondaryText, darkMode && styles.darkSecondaryText]}>
                  Not now
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={screen === 'home' && !hasProvidedName}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
              <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
                Welcome to MYOS
              </Text>
              <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
                What should we call you?
              </Text>
              <TextInput
                accessibilityLabel="Your name"
                autoCapitalize="words"
                autoComplete="name"
                maxLength={24}
                onChangeText={setNameDraft}
                onSubmitEditing={savePlayerName}
                placeholder="Enter your name"
                placeholderTextColor={secondaryText}
                returnKeyType="done"
                value={nameDraft}
                style={[
                  styles.profileInput,
                  styles.namePromptInput,
                  {
                    color: primaryText,
                    backgroundColor: pageBackground,
                    borderColor: darkMode ? DARK_BORDER : '#d8e1eb',
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!nameDraft.trim()}
                onPress={savePlayerName}
                style={[
                  styles.gameOverButton,
                  !nameDraft.trim() && styles.inactiveButton,
                ]}
              >
                <Text style={styles.gameOverButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={screen === 'settings' && aboutVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAboutVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.gameOverCard,
                styles.aboutCard,
                darkMode && styles.darkGameOverCard,
              ]}
            >
              <ScrollView
                style={styles.aboutScroll}
                contentContainerStyle={styles.aboutContent}
                showsVerticalScrollIndicator
              >
                <Text style={[styles.aboutHeading, darkMode && styles.darkPrimaryText]}>
                  MYOS — Make Your Own Sudoku
                </Text>
                <Text style={[styles.aboutVersion, darkMode && styles.darkSecondaryText]}>
                  Version {APP_VERSION}
                </Text>
                <Text style={[styles.aboutParagraph, darkMode && styles.darkSecondaryText]}>
                  MYOS is a Sudoku app that puts you in control. Create your own
                  starting clues, build your own puzzle, and challenge yourself
                  to solve it.
                </Text>
                <Text style={[styles.aboutParagraph, darkMode && styles.darkSecondaryText]}>
                  Made for curious minds, puzzle enthusiasts, and anyone who
                  enjoys the satisfaction of solving a problem they created
                  themselves.
                </Text>
                <Text style={[styles.aboutTagline, darkMode && styles.darkPrimaryText]}>
                  Your puzzles. Your progress. Your journey.
                </Text>
                <Text style={[styles.aboutSectionHeading, darkMode && styles.darkPrimaryText]}>
                  Your journey
                </Text>
                <Text style={[styles.aboutBullet, darkMode && styles.darkSecondaryText]}>
                  • Track your progress and see how far you’ve come.
                </Text>
                <Text style={[styles.aboutBullet, darkMode && styles.darkSecondaryText]}>
                  • Build a solving streak and keep your momentum going.
                </Text>
                <Text style={[styles.aboutBullet, darkMode && styles.darkSecondaryText]}>
                  • Revisit your history to explore puzzles you’ve won or failed.
                </Text>
                <Text style={[styles.aboutBullet, darkMode && styles.darkSecondaryText]}>
                  • Create freely — every puzzle begins with your own imagination.
                </Text>
                <Text style={[styles.aboutSectionHeading, darkMode && styles.darkPrimaryText]}>
                  Privacy by design
                </Text>
                <Text style={[styles.aboutParagraph, darkMode && styles.darkSecondaryText]}>
                  Your game data is saved locally on your device. No accounts, no
                  cloud storage, and no puzzle generation. MYOS is all about
                  creating and solving Sudoku puzzles yourself.
                </Text>
                <Text style={[styles.aboutSectionHeading, darkMode && styles.darkPrimaryText]}>
                  About the Developer
                </Text>
                <Text style={[styles.aboutDeveloperName, darkMode && styles.darkPrimaryText]}>
                  Benjamin G Nechicattu
                </Text>
                <Text style={[styles.aboutParagraph, darkMode && styles.darkSecondaryText]}>
                  Software engineer, artist, and independent creator passionate
                  about building things that bring ideas to life. MYOS is one of
                  my experiments in creating simple, thoughtful experiences that
                  make everyday activities a little more interesting.
                </Text>
                <Text style={[styles.aboutParagraph, darkMode && styles.darkSecondaryText]}>
                  Explore more of my work:
                </Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void openDeveloperWebsite()}
                  style={styles.aboutLinkButton}
                >
                  <Text style={styles.aboutLink}>benjaminnechicattu.in</Text>
                </Pressable>
                <Text style={[styles.aboutSignoff, darkMode && styles.darkSecondaryText]}>
                  Made with curiosity, for curious minds.
                </Text>
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAboutVisible(false)}
                style={[styles.gameOverButton, styles.aboutCloseButton]}
              >
                <Text style={styles.gameOverButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={screen === 'settings' && resetConfirmationVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setResetConfirmationVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
              <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
                Reset app data?
              </Text>
              <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
                This removes your saved game, profile, settings, streak, and puzzle history from this device.
              </Text>
              <View style={styles.resetConfirmationActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setResetConfirmationVisible(false)}
                  style={[
                    styles.cancelResetButton,
                    darkMode && styles.darkCancelResetButton,
                  ]}
                >
                  <Text style={[styles.cancelResetText, darkMode && styles.darkPrimaryText]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void resetAppStorage()}
                  style={[
                    styles.confirmResetButton,
                    darkMode && styles.darkConfirmResetButton,
                  ]}
                >
                  <Text style={styles.confirmResetText}>Reset data</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={screen === 'history' && expandedPuzzle !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedPuzzle(null)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close enlarged puzzle"
            onPress={() => setExpandedPuzzle(null)}
            style={styles.modalBackdrop}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={[
                styles.expandedPuzzleCard,
                { backgroundColor: cardBackground },
              ]}
            >
              {expandedPuzzle ? (
                <>
                  <View style={styles.expandedPuzzleHeader}>
                    <Text style={[styles.cardTitle, { color: primaryText }]}>
                      Puzzle · {expandedPuzzle.outcome === 'failed' ? 'Failed' : 'Won'}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close puzzle preview"
                      hitSlop={10}
                      onPress={() => setExpandedPuzzle(null)}
                      style={styles.closePreviewButton}
                    >
                      <Text
                        style={[
                          styles.closePreviewText,
                          darkMode && styles.darkPrimaryText,
                        ]}
                      >
                        ×
                      </Text>
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      styles.cardCaption,
                      { color: secondaryText },
                      styles.expandedPuzzleCaption,
                    ]}
                  >
                    {new Date(expandedPuzzle.completedAt).toLocaleDateString()}
                    {' · '}
                    {Math.floor(expandedPuzzle.elapsedSeconds / 60)}m{' '}
                    {expandedPuzzle.elapsedSeconds % 60}s
                  </Text>
                  <Text
                    style={[
                      styles.cardCaption,
                      { color: secondaryText },
                      styles.expandedPuzzleStats,
                    ]}
                  >
                    Difficulty: {expandedPuzzle.difficulty ?? 'Unknown'}
                    {' · '}
                    Solutions: {expandedPuzzle.solutionCount === undefined
                      ? 'Unknown'
                      : expandedPuzzle.solutionCount > 10
                        ? '10+'
                        : expandedPuzzle.solutionCount}
                  </Text>
                  <MiniBoard
                    board={expandedPuzzle.board}
                    darkMode={darkMode}
                    size={expandedBoardSize}
                  />
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
        <ScrollView
          contentContainerStyle={[styles.screen, { backgroundColor: pageBackground }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {screen === 'home' ? (
            <>
              <View style={styles.homeBrand}>
                <SudokuLogo />
                <Text style={[styles.brand, { color: primaryText }]}>MYOS</Text>
              </View>
              <Text style={[styles.homeGreeting, { color: primaryText }]}>
                Hi, {playerName}
              </Text>
              <Text style={[styles.pageSubtitle, { color: secondaryText }]}>
                Ready to make your next Sudoku?
              </Text>
              <View style={[styles.streakCard, { backgroundColor: cardBackground }]}>
                <Text style={styles.streakIcon}>🔥</Text>
                <View style={styles.streakTextGroup}>
                  <Text style={[styles.cardTitle, { color: primaryText }]}>
                    {streak} day{streak === 1 ? '' : 's'}
                  </Text>
                  <Text style={[styles.cardCaption, { color: secondaryText }]}>
                    puzzle-solving streak
                  </Text>
                </View>
                <Text style={[styles.streakToday, { color: secondaryText }]}>
                  {lastCompletionDate === dateKey(new Date())
                    ? 'Today complete'
                    : 'Keep it going'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!hasActiveGame}
                onPress={() => setScreen('game')}
                style={[
                  styles.homePrimaryButton,
                  darkMode && styles.darkHomePrimaryButton,
                  !hasActiveGame && styles.inactiveButton,
                ]}
              >
                <Text
                  style={[
                    styles.homeButtonTitle,
                    darkMode && styles.darkPrimaryText,
                  ]}
                >
                  {hasActiveGame ? 'Continue game' : 'No game to continue'}
                </Text>
                <Text
                  style={[
                    styles.homeButtonCaption,
                    darkMode && styles.darkSecondaryText,
                  ]}
                >
                  {hasActiveGame
                    ? `${mode === 'create' ? 'Create your clues' : 'Keep solving'} · ${formattedTime}`
                    : 'Start a new puzzle when you are ready'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={openNewGame}
                style={[
                  styles.homeSecondaryButton,
                  { backgroundColor: cardBackground },
                ]}
              >
                <Text style={[styles.homeSecondaryTitle, { color: primaryText }]}>
                  +  Create a new game
                </Text>
                <Text style={[styles.cardCaption, { color: secondaryText }]}>
                  Make your own Sudoku from scratch
                </Text>
              </Pressable>
              <View style={styles.homeLinks}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScreen('history')}
                  style={[styles.homeLink, { backgroundColor: cardBackground }]}
                >
                  <Text
                    style={[
                      styles.homeLinkIcon,
                      darkMode && styles.darkSecondaryText,
                    ]}
                  >
                    ▤
                  </Text>
                  <Text style={[styles.homeLinkTitle, { color: primaryText }]}>
                    Puzzle history
                  </Text>
                  <Text style={[styles.homeLinkCaption, { color: secondaryText }]}>
                    {completedPuzzles.length} played
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setScreen('settings')}
                  style={[styles.homeLink, { backgroundColor: cardBackground }]}
                >
                  <Text
                    style={[
                      styles.homeLinkIcon,
                      darkMode && styles.darkSecondaryText,
                    ]}
                  >
                    ⚙
                  </Text>
                  <Text style={[styles.homeLinkTitle, { color: primaryText }]}>
                    Settings
                  </Text>
                  <Text style={[styles.homeLinkCaption, { color: secondaryText }]}>
                    Profile & appearance
                  </Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setScreen('learn')}
                style={[
                  styles.homeLearnButton,
                  { backgroundColor: cardBackground },
                ]}
              >
                <Text style={[styles.homeSecondaryTitle, { color: primaryText }]}>
                  Learn Sudoku
                </Text>
                <Text style={[styles.cardCaption, { color: secondaryText }]}>
                  Rules, solution counts, and puzzle difficulty
                </Text>
              </Pressable>
              {storageError ? (
                <Text style={styles.storageError}>{storageError}</Text>
              ) : null}
            </>
          ) : (
            <>
              <ScreenHeader
                title={
                  screen === 'settings'
                    ? 'Settings'
                    : screen === 'learn'
                      ? 'Learn Sudoku'
                      : 'Puzzle history'
                }
                onBack={goHome}
                darkMode={darkMode}
              />
              {screen === 'settings' ? (
                <>
                  <Text style={[styles.pageSubtitle, { color: secondaryText }]}>
                    Make MYOS feel like yours.
                  </Text>
                  <View style={[styles.settingsCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: primaryText }]}>
                      YOUR PROFILE
                    </Text>
                    <Text style={[styles.fieldLabel, { color: secondaryText }]}>
                      Player name
                    </Text>
                    <TextInput
                      accessibilityLabel="Player name"
                      value={playerName}
                      onChangeText={(value) => setPlayerName(value.slice(0, 24))}
                      placeholder="Enter your name"
                      placeholderTextColor={secondaryText}
                      maxLength={24}
                      style={[
                        styles.profileInput,
                        {
                          color: primaryText,
                          backgroundColor: pageBackground,
                          borderColor: darkMode ? DARK_BORDER : '#d8e1eb',
                        },
                      ]}
                    />
                    <Text style={[styles.profileSummary, { color: secondaryText }]}>
                      {wonPuzzleCount} puzzles won · {streak} day streak
                    </Text>
                  </View>
                  <View style={[styles.settingsCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.sectionTitle, { color: primaryText }]}>
                      APPEARANCE
                    </Text>
                    <Text style={[styles.fieldLabel, { color: secondaryText }]}>
                      Theme
                    </Text>
                    <View style={styles.optionRow}>
                      <OptionButton
                        label="Light"
                        active={!darkMode}
                        darkMode={darkMode}
                        onPress={() => setDarkMode(false)}
                      />
                      <OptionButton
                        label="Dark"
                        active={darkMode}
                        darkMode={darkMode}
                        onPress={() => setDarkMode(true)}
                      />
                    </View>
                    <Text style={[styles.fieldLabel, { color: secondaryText }]}>
                      Highlight colour
                    </Text>
                    <View style={styles.colorOptions}>
                      {HIGHLIGHT_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          accessibilityRole="button"
                          accessibilityLabel={`Select highlight colour ${color}`}
                          onPress={() => setHighlightColor(color)}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            highlightColor === color && styles.selectedColorOption,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.fieldLabel, { color: secondaryText }]}>
                      Highlight opacity
                    </Text>
                    <View style={styles.optionRow}>
                      {[0.15, 0.25, 0.4, 0.6].map((opacity) => (
                        <OptionButton
                          key={opacity}
                          label={`${Math.round(opacity * 100)}%`}
                          active={highlightOpacity === opacity}
                          darkMode={darkMode}
                          onPress={() => setHighlightOpacity(opacity)}
                        />
                      ))}
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAboutVisible(true)}
                    style={[
                      styles.aboutButton,
                      { backgroundColor: cardBackground },
                    ]}
                  >
                    <Text style={[styles.aboutButtonTitle, { color: primaryText }]}>
                      About MYOS
                    </Text>
                    <Text style={[styles.resetStorageCaption, { color: secondaryText }]}>
                      Version {APP_VERSION} · App information
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setResetConfirmationVisible(true)}
                    style={[
                      styles.resetStorageButton,
                      darkMode && styles.darkResetStorageButton,
                    ]}
                  >
                    <Text style={styles.resetStorageTitle}>Reset app data</Text>
                    <Text
                      style={[
                        styles.resetStorageCaption,
                        darkMode && styles.darkSecondaryText,
                      ]}
                    >
                      Clear saved games, profile, settings, and history
                    </Text>
                  </Pressable>
                  {storageError ? (
                    <Text style={styles.storageError}>{storageError}</Text>
                  ) : null}
                </>
              ) : screen === 'learn' ? (
                <View style={styles.learnContent}>
                  <Text style={[styles.learnIntro, { color: primaryText }]}>
                    Learn the rules behind the puzzles you create, and explore
                    what mathematics can tell us about Sudoku.
                  </Text>

                  <View style={[styles.learnCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.learnSectionTitle, { color: primaryText }]}>
                      Sudoku rules
                    </Text>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      Fill the 9×9 grid with digits 1 through 9. Each row, each
                      column, and each 3×3 box must contain every digit exactly
                      once. Starting clues are fixed; fill the empty cells while
                      respecting all three constraints.
                    </Text>
                  </View>

                  <View style={styles.learnStatCard}>
                    <Text style={styles.learnStatLabel}>
                      TOTAL VALID COMPLETED SUDOKU GRIDS
                    </Text>
                    <Text style={styles.learnNumber}>
                      6,670,903,752,021,072,936,960
                    </Text>
                    <Text style={styles.learnStatCaption}>
                      Approximately 6.67 × 10²¹ — or 6.67 sextillion grids.
                    </Text>
                  </View>
                  <View style={[styles.learnCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      This counts fully filled grids, not starting puzzles.
                      Simply assigning any digit to every cell gives 9⁸¹
                      arrangements, but almost all violate Sudoku rules.
                    </Text>
                  </View>

                  <View style={[styles.learnCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.learnSectionTitle, { color: primaryText }]}>
                      Clues and combinations
                    </Text>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      A puzzle selects clue positions from a completed grid.
                      For a fixed completed grid and k clue positions, the
                      number of arrangements is:
                    </Text>
                    <Text style={[styles.learnFormula, { color: primaryText }]}>
                      C(81, k) = 81! / (k! × (81 − k)!)
                    </Text>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      For 30 clues, C(81, 30) is about 1.41 × 10²² position
                      arrangements for that one grid. Not every arrangement is
                      uniquely solvable. A famous result says 17 clues is the
                      minimum for a standard Sudoku with exactly one solution;
                      no 16-clue puzzle has a unique solution.
                    </Text>
                  </View>

                  <View style={[styles.learnCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.learnSectionTitle, { color: primaryText }]}>
                      What makes a puzzle difficult?
                    </Text>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      Clue count alone does not determine difficulty. Two
                      puzzles with the same number of clues can require very
                      different reasoning. Technique-based ratings look at the
                      hardest logical step needed, and there is no single
                      universal difficulty standard.
                    </Text>
                    {[
                      ['Naked or hidden singles', 'Easy'],
                      ['Locked candidates, pairs', 'Medium'],
                      ['X-Wing', 'Hard'],
                      ['Swordfish, XY-Wing', 'Very hard'],
                      ['Forcing chains', 'Expert'],
                    ].map(([technique, level]) => (
                      <View key={technique} style={styles.learnTableRow}>
                        <Text style={[styles.learnTableCell, { color: secondaryText }]}>
                          {technique}
                        </Text>
                        <Text style={[styles.learnTableLevel, { color: primaryText }]}>
                          {level}
                        </Text>
                      </View>
                    ))}
                    <Text style={[styles.learnText, styles.learnSpacedText, { color: secondaryText }]}>
                      A technique-based score can be estimated with D = Σ(wᵢ × cᵢ),
                      where wᵢ is the weight of a technique and cᵢ is how many
                      times it is used. Example weights might be 1 for a naked
                      single, 3 for a locked candidate, 8 for X-Wing, and 25 for
                      a forcing chain. These are illustrative and should be
                      tuned to experience and feedback.
                    </Text>
                  </View>

                  <View style={[styles.learnCard, { backgroundColor: cardBackground }]}>
                    <Text style={[styles.learnSectionTitle, { color: primaryText }]}>
                      Puzzle insights in MYOS
                    </Text>
                    <Text style={[styles.learnText, { color: secondaryText }]}>
                      MYOS checks whether your starting clues have a solution
                      and counts up to 11: it shows exact totals from 1 to 10,
                      then 10+ for larger counts. Difficulty is estimated by
                      applying logical techniques: singles are Easy, locked
                      candidates and pairs are Medium, X-Wing is Hard, and
                      Swordfish or XY-Wing is Very hard. Puzzles that stall
                      with these techniques are labeled Expert; that can
                      include puzzles requiring forcing chains or other
                      unsupported techniques. Solution count describes
                      uniqueness; it is different from difficulty.
                    </Text>
                  </View>
                </View>
              ) : completedPuzzles.length === 0 ? (
                <View style={[styles.emptyHistory, { backgroundColor: cardBackground }]}>
                  <Text style={styles.emptyHistoryIcon}>▤</Text>
                  <Text style={[styles.cardTitle, { color: primaryText }]}>
                    No puzzles played yet
                  </Text>
                  <Text style={[styles.cardCaption, { color: secondaryText }]}>
                    Your won and failed puzzles will show up here.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={openNewGame}
                    style={[
                      styles.historyStartButton,
                      darkMode && styles.darkNeutralButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyStartButtonText,
                        darkMode && styles.darkPrimaryText,
                      ]}
                    >
                      Create a puzzle
                    </Text>
                  </Pressable>
                </View>
              ) : (
                completedPuzzles.map((puzzle, index) => (
                  <View
                    key={puzzle.id}
                    style={[styles.historyCard, { backgroundColor: cardBackground }]}
                  >
                    <View style={styles.historyCardContent}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open larger puzzle board"
                        onPress={() => setExpandedPuzzle(puzzle)}
                        style={styles.historyBoardPreview}
                      >
                        <MiniBoard
                          board={puzzle.board}
                          darkMode={darkMode}
                          size={110}
                        />
                      </Pressable>
                      <View style={styles.historyDetails}>
                        <Text style={[styles.cardTitle, { color: primaryText }]}>
                          Puzzle {completedPuzzles.length - index} ·{' '}
                          {(puzzle.outcome ?? 'won') === 'won' ? 'Won' : 'Failed'}
                        </Text>
                        <Text style={[styles.cardCaption, { color: secondaryText }]}>
                          {new Date(puzzle.completedAt).toLocaleDateString()}
                          {' · '}
                          {Math.floor(puzzle.elapsedSeconds / 60)}m{' '}
                          {puzzle.elapsedSeconds % 60}s
                        </Text>
                        <Text style={[styles.historyMeta, { color: secondaryText }]}>
                          Difficulty: {puzzle.difficulty ?? 'Unknown'}
                        </Text>
                        <Text style={[styles.historyMeta, { color: secondaryText }]}>
                          Solutions: {puzzle.solutionCount === undefined
                            ? 'Unknown'
                            : puzzle.solutionCount > 10
                              ? '10+'
                              : puzzle.solutionCount}
                        </Text>
                        <Text
                          style={[
                            styles.historyOutcome,
                            (puzzle.outcome ?? 'won') === 'failed' &&
                              styles.historyFailed,
                            darkMode &&
                              (puzzle.outcome ?? 'won') === 'won' &&
                              styles.darkHistoryWon,
                          ]}
                        >
                          {(puzzle.outcome ?? 'won') === 'won' ? '✓ Won' : '× Failed'}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setExpandedPuzzle(puzzle)}
                          hitSlop={8}
                        >
                          <Text
                            style={[
                              styles.historyPreviewHint,
                              darkMode && styles.darkSecondaryText,
                            ]}
                          >
                            Tap to enlarge
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        darkMode && { backgroundColor: DARK_BACKGROUND },
      ]}
    >
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Modal
        visible={screen === 'game' && puzzleResetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPuzzleResetVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              Reset this puzzle?
            </Text>
            <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
              {mode === 'create'
                ? 'This clears all of your clues and starts a blank puzzle.'
                : 'This restores your starting clues and resets your time, lives, notes, and hints.'}
            </Text>
            <View style={styles.resetConfirmationActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPuzzleResetVisible(false)}
                style={[
                  styles.cancelResetButton,
                  darkMode && styles.darkCancelResetButton,
                ]}
              >
                <Text style={[styles.cancelResetText, darkMode && styles.darkPrimaryText]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={resetPuzzle}
                style={[
                  styles.confirmResetButton,
                  darkMode && styles.darkConfirmResetButton,
                ]}
              >
                <Text style={styles.confirmResetText}>Reset puzzle</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={screen === 'game' && suggestionThinking}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <ActivityIndicator
              accessibilityLabel="Thinking"
              size="large"
              color={BLUE}
            />
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              Finding a suggestion
            </Text>
            <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
              Checking the puzzle for a helpful clue…
            </Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={
          screen === 'game' &&
          mode === 'create' &&
          clueSuggestion !== null
        }
        transparent
        animationType="fade"
        onRequestClose={() => setClueSuggestion(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              Suggested clue
            </Text>
            {clueSuggestion ? (
              <>
                <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
                  Add {clueSuggestion.digit} at row {clueSuggestion.row + 1},
                  column {clueSuggestion.col + 1}?
                </Text>
                <Text
                  style={[
                    styles.cardCaption,
                    styles.suggestionExplanation,
                    darkMode && styles.darkSecondaryText,
                  ]}
                >
                  This valid clue will not increase either estimate. Add it and
                  ask for another suggestion to keep narrowing the puzzle.
                </Text>
                <Text style={[styles.installInstructions, darkMode && styles.darkSecondaryText]}>
                  Current: {displayedDifficulty} ·{' '}
                  {displayedSolutionCount > 10
                    ? '10+ solutions'
                    : `${displayedSolutionCount} solution${displayedSolutionCount === 1 ? '' : 's'}`}
                  {'\n'}
                  After: {clueSuggestion.difficulty} ·{' '}
                  {clueSuggestion.solutionCount > 10
                    ? '10+ solutions'
                    : `${clueSuggestion.solutionCount} solution${clueSuggestion.solutionCount === 1 ? '' : 's'}`}
                </Text>
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={applyClueSuggestion}
              style={styles.gameOverButton}
            >
              <Text style={styles.gameOverButtonText}>Add clue</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setClueSuggestion(null)}
              style={styles.gameOverSecondaryButton}
            >
              <Text style={[styles.gameOverSecondaryText, darkMode && styles.darkSecondaryText]}>
                Not now
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={pendingSolveAnalysis !== null || unsolvablePuzzlePromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPendingSolveAnalysis(null);
          setUnsolvablePuzzlePromptVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              {unsolvablePuzzlePromptVisible
                ? 'Puzzle has no solution'
                : 'Puzzle is solvable'}
            </Text>
            <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
              {unsolvablePuzzlePromptVisible
                ? 'This puzzle has no valid solution. Check your starting clues and try again.'
                : `Your clues are solvable with ${
                    pendingSolveAnalysis && pendingSolveAnalysis.count > 10
                      ? '10+'
                      : pendingSolveAnalysis?.count ?? 0
                  } possible solution${pendingSolveAnalysis?.count === 1 ? '' : 's'}.`}
            </Text>
            {unsolvablePuzzlePromptVisible ? (
              <View style={styles.resetConfirmationActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={makeAnother}
                  style={styles.confirmResetButton}
                >
                  <Text style={styles.confirmResetText}>Reset puzzle</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={returnToPuzzle}
                  style={[
                    styles.cancelResetButton,
                    darkMode && styles.darkCancelResetButton,
                  ]}
                >
                  <Text style={[styles.cancelResetText, darkMode && styles.darkPrimaryText]}>
                    Go back to puzzle
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={confirmStartSolving}
                style={styles.gameOverButton}
              >
                <Text style={styles.gameOverButtonText}>Start solving</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={notesConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotesConfirmationVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              Incorrect notes cost a life
            </Text>
            <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
              A note that does not match the solution selected from your starting clues costs one life. If your puzzle has multiple valid solutions, another solution may differ.
            </Text>
            <View style={styles.resetConfirmationActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setNotesConfirmationVisible(false)}
                style={[
                  styles.cancelResetButton,
                  darkMode && styles.darkCancelResetButton,
                ]}
              >
                <Text style={[styles.cancelResetText, darkMode && styles.darkPrimaryText]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setNotesEnabled(true);
                  setNotesConfirmationVisible(false);
                }}
                style={[styles.gameOverButton, styles.notesConfirmButton]}
              >
                <Text style={styles.gameOverButtonText}>Turn on notes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={mode === 'solve' && finished}
        transparent
        animationType="fade"
        onRequestClose={goHome}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.gameOverCard, darkMode && styles.darkGameOverCard]}>
            <Text style={styles.gameOverHearts}>
              {lives === 0 ? '🤍 🤍 🤍 🤍 🤍' : '❤️ ❤️ ❤️ ❤️ ❤️'}
            </Text>
            <Text style={[styles.gameOverTitle, darkMode && styles.darkPrimaryText]}>
              {lives === 0 ? 'Out of lives' : 'Puzzle complete!'}
            </Text>
            <Text style={[styles.gameOverMessage, darkMode && styles.darkSecondaryText]}>
              {lives === 0
                ? 'Your puzzle has been added to history. Head home or try another one.'
                : 'Your puzzle has been added to history. Great work!'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={goHome}
              style={[styles.gameOverButton, darkMode && styles.darkNeutralButton]}
            >
              <Text
                style={[
                  styles.gameOverButtonText,
                  darkMode && styles.darkPrimaryText,
                ]}
              >
                Go to home
              </Text>
            </Pressable>
            {lives === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={resetPuzzle}
                style={styles.gameOverSecondaryButton}
              >
                <Text
                  style={[
                    styles.gameOverSecondaryText,
                    darkMode && styles.darkSecondaryText,
                  ]}
                >
                  Reset this puzzle
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={openNewGame}
              style={styles.gameOverSecondaryButton}
            >
              <Text
                style={[
                  styles.gameOverSecondaryText,
                  darkMode && styles.darkSecondaryText,
                ]}
              >
                Start new game
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          darkMode && { backgroundColor: DARK_BACKGROUND },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, styles.gameTopBar]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            onPress={goHome}
            style={[styles.backButton, darkMode && styles.darkBackButton]}
          >
            <Text style={[styles.backArrow, darkMode && { color: DARK_TEXT }]}>
              ‹
            </Text>
          </Pressable>
          <View style={styles.createBrandText}>
            <Text
              numberOfLines={1}
              style={[
                styles.brand,
                darkMode && { color: DARK_TEXT },
                { fontSize: brandTitleFontSize, letterSpacing: 0 },
              ]}
            >
              {mode === 'create' ? 'Make your own SUDOKU' : 'Solve your Sudoku'}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                styles.brandSubtitle,
                darkMode && { color: DARK_MUTED },
                { fontSize: brandSubtitleFontSize },
              ]}
            >
              {mode === 'create'
                ? 'Place your starting numbers. You make the rules.'
                : 'Every clue is yours. Fill in the rest.'}
            </Text>
          </View>
        </View>

        <TextInput
          ref={keyboardRef}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.keyboardCapture}
          value={keyboardEntry}
          onChangeText={(value) => {
            const digit = value.replace(/[^1-9]/g, '').slice(-1);
            setKeyboardEntry('');
            if (digit) chooseDigit(Number(digit));
          }}
          onKeyPress={({ nativeEvent }) => handleKeyboardKey(nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          caretHidden
          contextMenuHidden
          showSoftInputOnFocus
        />

        <View style={styles.stats}>
          {mode === 'create' ? (
            <View style={styles.stat}>
              <Text style={[styles.statLabel, darkMode && styles.darkSecondaryText]}>
                MODE
              </Text>
              <Text style={[styles.statValue, darkMode && styles.darkPrimaryText]}>
                Create
              </Text>
            </View>
          ) : null}
          <View style={styles.stat}>
            <Text style={[styles.statLabel, darkMode && styles.darkSecondaryText]}>TIME</Text>
            <Text style={[styles.statValue, darkMode && styles.darkPrimaryText]}>{formattedTime}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, darkMode && styles.darkSecondaryText]}>LIVES</Text>
            <View
              accessible
              accessibilityLabel={`${lives} of ${MAX_LIVES} lives remaining`}
              style={styles.hearts}
            >
              {Array.from({ length: MAX_LIVES }, (_, index) => (
                <Text key={index} style={styles.heart}>
                  {index < lives ? '❤️' : '🤍'}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.board, darkMode && styles.darkBoard]}>
          {board.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {row.map((digit, colIndex) => {
                const isSelected =
                  selected?.[0] === rowIndex && selected?.[1] === colIndex;
                const sharesSelection =
                  selected &&
                  (selected[0] === rowIndex ||
                    selected[1] === colIndex ||
                    (Math.floor(selected[0] / 3) ===
                      Math.floor(rowIndex / 3) &&
                      Math.floor(selected[1] / 3) ===
                        Math.floor(colIndex / 3)));
                const sameDigit =
                  highlightedDigit !== 0 &&
                  !isSelected &&
                  (digit === highlightedDigit ||
                    (digit === 0 &&
                      notes[rowIndex][colIndex].includes(highlightedDigit)));

                return (
                  <Pressable
                    key={`cell-${rowIndex}-${colIndex}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Row ${rowIndex + 1}, column ${colIndex + 1}${digit ? `, ${digit}` : ', empty'}`}
                    onPress={() => {
                      setSelected([rowIndex, colIndex]);
                      setMessage('');
                      if (quickInputEnabled && quickInputDigit !== null) {
                        if (digit === quickInputDigit) {
                          eraseCell(rowIndex, colIndex);
                          return;
                        }
                        chooseDigit(quickInputDigit, [rowIndex, colIndex]);
                        return;
                      }
                      if (
                        !finished &&
                        !quickInputEnabled &&
                        (mode === 'create' || !givens[rowIndex][colIndex])
                      ) {
                        keyboardRef.current?.focus();
                      }
                    }}
                    style={[
                      styles.cell,
                      darkMode && styles.darkCell,
                      colIndex === 2 || colIndex === 5
                        ? [styles.boxRight, darkMode && styles.darkBoxRight]
                        : [styles.cellRight, darkMode && styles.darkCellRight],
                      rowIndex === 2 || rowIndex === 5
                        ? [styles.boxBottom, darkMode && styles.darkBoxBottom]
                        : [styles.cellBottom, darkMode && styles.darkCellBottom],
                      mode === 'create' && digit !== 0 && styles.clueCell,
                      darkMode && mode === 'create' && digit !== 0 && styles.darkClueCell,
                      sharesSelection && {
                        backgroundColor: colorWithOpacity(
                          highlightColor,
                          highlightOpacity * 0.55,
                        ),
                      },
                      sameDigit && {
                        backgroundColor: colorWithOpacity(
                          highlightColor,
                          highlightOpacity * 0.8,
                        ),
                      },
                      isSelected && {
                        backgroundColor: colorWithOpacity(
                          highlightColor,
                          highlightOpacity,
                        ),
                      },
                    ]}
                  >
                    {digit !== 0 ? (
                      <Text
                        style={[
                          styles.cellDigit,
                          darkMode && styles.darkCellDigit,
                          mode === 'create' && styles.clueDigit,
                          mode === 'solve' &&
                            givens[rowIndex][colIndex] &&
                            styles.clueDigit,
                          darkMode && styles.darkClueDigit,
                        ]}
                      >
                        {digit}
                      </Text>
                    ) : notes[rowIndex][colIndex].length > 0 ? (
                      <View style={styles.noteGrid}>
                        {Array.from({ length: 9 }, (_, index) => (
                          <Text
                            key={index}
                            style={[
                              styles.noteDigit,
                              darkMode && { color: DARK_MUTED },
                              index + 1 === highlightedDigit && {
                                color: highlightColor,
                                fontWeight: '800',
                              },
                            ]}
                          >
                            {notes[rowIndex][colIndex].includes(index + 1)
                              ? index + 1
                              : ''}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
          {message ? (
            <View
              pointerEvents="none"
              accessibilityLiveRegion="polite"
              style={styles.boardMessageBanner}
            >
              <Text style={styles.boardMessageText}>{message}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.puzzleAnalysis}>
          <View style={styles.analysisStat}>
            <Text style={[styles.statLabel, darkMode && styles.darkSecondaryText]}>
              DIFFICULTY
            </Text>
            <Text style={[styles.statValue, darkMode && styles.darkPrimaryText]}>
              {displayedDifficulty}
            </Text>
          </View>
          <View style={styles.analysisStat}>
            <Text style={[styles.statLabel, darkMode && styles.darkSecondaryText]}>
              SOLUTIONS
            </Text>
            <Text
              accessibilityLabel={
                displayedSolutionCount > 10
                  ? 'More than 10 solutions'
                  : `${displayedSolutionCount} solution${displayedSolutionCount === 1 ? '' : 's'}`
              }
              style={[styles.statValue, darkMode && styles.darkPrimaryText]}
            >
              {displayedSolutionCount > 10
                ? '10+'
                : displayedSolutionCount}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Quick input"
            accessibilityState={{ checked: quickInputEnabled }}
            disabled={finished}
            onPress={toggleQuickInput}
            style={[
              styles.quickInputAnalysisStat,
              styles.quickInputToggle,
              darkMode && styles.darkQuickInputToggle,
              quickInputEnabled && [
                styles.activeQuickInputToggle,
                darkMode && styles.darkActiveQuickInputToggle,
              ],
              finished && styles.disabledQuickInputToggle,
            ]}
          >
            <Text
              style={[
                styles.quickInputToggleText,
                darkMode && styles.darkQuickInputToggleText,
                quickInputEnabled && [
                  styles.activeQuickInputToggleText,
                  darkMode && styles.darkActiveQuickInputToggleText,
                ],
              ]}
            >
              ⚡ Quick
            </Text>
          </Pressable>
        </View>

        <View style={[styles.instructionRow, darkMode && { backgroundColor: DARK_BACKGROUND }]}>
          <View style={[styles.modeDot, mode === 'solve' && styles.solveDot]} />
          <Text style={[styles.instruction, darkMode && styles.darkSecondaryText]}>
            {quickInputEnabled
              ? quickInputDigit
                ? `Tap a square to enter ${quickInputDigit}`
                : 'Choose a number, then tap a square'
              : mode === 'create'
                ? 'Tap a square, to add numbers'
                : 'Tap an empty square and choose a number'}
          </Text>
          {mode === 'create' ? (
            <Pressable
              style={[
                styles.startButton,
                darkMode && styles.darkNeutralButton,
              ]}
              onPress={startSolving}
            >
              <Text
                style={[
                  styles.startButtonText,
                  darkMode && styles.darkPrimaryText,
                ]}
              >
                Start solving
              </Text>
            </Pressable>
          ) : null}
        </View>

        {storageError ? (
          <Text style={styles.storageError}>{storageError}</Text>
        ) : null}

        <View style={styles.actions}>
          {mode === 'create' ? (
            <Action
              icon="✧"
              label="Suggest"
              accessibilityLabel="Suggest a clue to reduce the solution count or estimated difficulty"
              disabled={
                finished || suggestionThinking || clueCount === SIZE * SIZE
              }
              darkMode={darkMode}
              onPress={suggestClue}
            />
          ) : (
            <>
              <Action
                icon="✎"
                label={notesEnabled ? 'Notes on' : 'Notes'}
                active={notesEnabled}
                disabled={finished}
                darkMode={darkMode}
                onPress={toggleNotes}
              />
              <Action
                icon="⊞"
                label={
                  notes.some((row) =>
                    row.some((cellNotes) => cellNotes.length > 0),
                  )
                    ? 'Clear notes'
                    : 'All notes'
                }
                disabled={finished}
                darkMode={darkMode}
                onPress={fillAllNotes}
              />
              <Action
                icon="✦"
                label={`Hint ${hintsRemaining}`}
                accessibilityLabel={`Reveal a random square. ${hintsRemaining} hints remaining.`}
                disabled={finished || hintsRemaining === 0}
                darkMode={darkMode}
                onPress={requestHint}
              />
            </>
          )}
          <Action
            icon="↶"
            label="Undo"
            disabled={history.length === 0 || finished}
            darkMode={darkMode}
            onPress={undo}
          />
          <Action
            icon="⌫"
            label="Erase"
            disabled={!selected || finished}
            darkMode={darkMode}
            onPress={eraseSelected}
          />
          <Action
            icon="↻"
            label="Reset"
            darkMode={darkMode}
            onPress={() => setPuzzleResetVisible(true)}
          />
        </View>

        <View style={styles.numberPad}>
          {Array.from({ length: SIZE }, (_, index) => {
            const digit = index + 1;
            if (completedDigits.has(digit)) return null;
            const unavailable =
              !!selected &&
              mode === 'solve' &&
              givens[selected[0]][selected[1]];
            return (
              <Pressable
                key={digit}
                accessibilityRole="button"
                accessibilityLabel={`Enter ${digit}`}
                disabled={(!quickInputEnabled && unavailable) || finished}
                onPress={() => {
                  if (quickInputEnabled) {
                    setQuickInputDigit(digit);
                    return;
                  }
                  chooseDigit(digit);
                }}
                style={({ pressed }) => [
                  styles.numberButton,
                  darkMode && styles.darkNumberButton,
                  quickInputDigit === digit &&
                    styles.quickInputNumberSelected,
                  pressed && styles.numberButtonPressed,
                  ((!quickInputEnabled && unavailable) || finished) &&
                    styles.disabledNumber,
                ]}
              >
                <Text
                  style={[
                    styles.numberText,
                    darkMode && styles.darkPrimaryText,
                    quickInputDigit === digit &&
                      styles.quickInputNumberText,
                  ]}
                >
                  {digit}
                </Text>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
