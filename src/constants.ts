import appConfig from '../app.json';
import type { Board, Notes } from './types';

export const SIZE = 9;
export const MAX_LIVES = 5;
export const MAX_HINTS = 5;
export const SOLUTION_COUNT_LIMIT = 11;
export const MAX_SOLUTION_COUNT = 101;
export const APP_VERSION = appConfig.expo.version;
export const BLUE = '#3189ee';
export const INK = '#263d57';
export const MUTED = '#7c8797';
export const DARK_BACKGROUND = '#0d0f12';
export const DARK_SURFACE = '#171a1f';
export const DARK_TEXT = '#f2f3f5';
export const DARK_MUTED = '#a0a5ad';
export const DARK_BORDER = '#30343b';
export const STORAGE_KEY = 'myos.app-state.v1';
export const INSTALL_DISMISSED_KEY = 'myos.install-prompt-dismissed.v1';
export const UPDATE_VERSION_KEY = 'myos.last-seen-version.v1';
export const HIGHLIGHT_COLORS = ['#3189ee', '#9c6ade', '#ed7b53', '#36a982'];
export const EMPTY_BOARD = (): Board =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
export const EMPTY_NOTES = (): Notes =>
  Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [] as number[]),
  );
export const EMPTY_GIVENS = (): boolean[][] =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
