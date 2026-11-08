# MYOS

MYOS is a React Native Sudoku app for Android where you create the starting
clues and solve the puzzle yourself. It includes a home screen, resumable game,
player settings, and a history of completed puzzles.
On first launch, MYOS asks for your name; you can change it later in Settings.

## Run

This project uses Expo SDK 58. Use an Expo Go version compatible with SDK 58
when opening it on a phone.

```sh
npm install
npm run android
npm run web
npx expo start --web --tunnel
```

## Google Play release

MYOS is an Expo Android app. `npm run android` starts the development app; it
does not create a Play Store release.

1. Create or sign in to an Expo account, then run `npx eas-cli@latest login`.
2. Link this app to your Expo project with `npx eas-cli@latest init`.
3. Make and test an installable preview APK with `npm run build:android:preview`.
4. Create a production Android App Bundle with
   `npm run build:android:production`, then upload the `.aab` from the EAS build
   to a Play Console testing track.
5. Publish [`privacy-policy.html`](./privacy-policy.html) on GitHub Pages by
   enabling Pages for the `main` branch and repository root. Verify the page is
   publicly accessible at
   `https://benjaminnechicattu.github.io/Make-your-own-sudoku/privacy-policy.html`,
   then enter that URL in Play Console. Complete Play Console's app content,
   data safety, target audience, and store listing requirements before
   requesting review. Prepare store listing copy, screenshots, and a feature
   graphic; the app icon is in `assets/icon.png`.

The Android application ID is `com.myos.sudoku`; choose and verify the final ID
before the first Play release because it cannot be changed for an existing
store listing. Increment `android.versionCode` in `app.json` for each release.
Play Console enrollment, listing declarations, review, and publication require
the app owner's account and cannot be completed by an EAS build.

For phone browsers on the same Wi-Fi, `npm run web` serves the app over your
local network. Use `npx expo start --web --tunnel` if your network blocks
connections between devices.

On a smartphone browser, MYOS offers an install prompt when the browser supports
installation. Otherwise it shows the browser-specific Add to Home Screen steps.
The prompt is remembered after it is dismissed.
For install and service-worker support on deployed sites, serve the web export
over HTTPS.

Create a new game from Home, tap squares and enter numbers for your starting
clues, then select **Start solving** to lock the clues and fill in the rest.
The game checks row, column, and box conflicts, but does not generate puzzles.
Difficulty is estimated by applying logical techniques: singles are Easy,
locked candidates and pairs are Medium, X-Wing is Hard, and Swordfish or
XY-Wing is Very hard. Puzzles that stall with these supported techniques are
labeled Expert, which includes puzzles requiring forcing chains or other
unsupported techniques. This is an estimate, not a universal rating. MYOS
checks that the clues have a valid completion before starting and displays the number of
solutions. It counts up to 11: totals of 1–10 are exact, while **10+** means
there are more than 10. During puzzle creation, difficulty and solution count
update as starting clues are added or removed; these stats appear below the
board. In create mode, **Suggest** recommends a valid additional clue without
increasing either the solution count or estimated difficulty, preferring the
clue that reduces them most. Review its projected stats and choose whether to
add it; more than one suggested clue may be needed to change the displayed
stats.

Each game includes five hints. A hint fills a random empty square in a random
3×3 box using a valid completion found internally from the current board. If a
puzzle has multiple valid completions, a hint may follow any one of them.
In solve mode, **All notes** fills empty squares with digits that do not
conflict with their current row, column, or box. Turning Notes on asks for
confirmation; entering a note that differs from the completion selected from
the starting clues costs one life. User-created puzzles can have multiple
valid completions, in which case another valid completion may differ.
Enable **Quick** input to choose a number first, then tap board squares to
enter that number repeatedly. Quick input follows the same conflict, clue-lock,
and note checks as normal entry.

Game progress, player name, appearance preferences, streak, and completed
puzzle history (won and failed attempts) are saved locally on the device.
Use **Reset** in a game to clear your created clues or restore the starting
clues and restart a solving session.
Puzzle history includes each puzzle's technique-based estimated difficulty and number of valid
solutions.
Settings include light/dark themes and highlight colour and opacity controls.
The **About MYOS** section in Settings displays the app version, product and
privacy information, and developer details with a link to the developer's
website.
The **Learn Sudoku** screen explains the rules, solution counts, clue
combinations, and common approaches to rating puzzle difficulty.
Use **Reset app data** in Settings to clear the saved profile, game, preferences,
streak, and puzzle history from this device.

## Source layout

- `App.tsx` owns screen navigation, application state, and user interactions.
- `src/components/` contains reusable interface components.
- `src/styles.ts` contains shared React Native styles.
- `src/sudoku.ts` contains Sudoku validation, solution counting, and difficulty
  analysis.
- `src/persistence.ts` validates saved app state; `src/helpers.ts` contains
  shared utilities.
- `src/constants.ts` and `src/types.ts` define shared configuration and types.
- `src/logger.ts` centralizes error logging.
