import { Pressable, Text, View } from 'react-native';
import { DARK_TEXT } from '../constants';
import type { Board } from '../types';
import { styles } from '../styles';

export function Action({
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  active = false,
  darkMode = false,
}: {
  icon: string;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  darkMode?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Text
        style={[
          styles.actionIcon,
          darkMode && styles.darkSecondaryText,
          disabled && styles.disabledAction,
          active && (darkMode ? styles.darkActiveAction : styles.activeAction),
        ]}
      >
        {icon}
      </Text>
      <Text
        style={[
          styles.actionLabel,
          darkMode && styles.darkSecondaryText,
          disabled && styles.disabledAction,
          active && (darkMode ? styles.darkActiveAction : styles.activeAction),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SudokuLogo() {
  return (
    <View style={styles.brandMark}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <View key={digit} style={styles.brandCell}>
          <Text style={styles.brandDigit}>
            {digit === 1 || digit === 5 || digit === 9 ? digit : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ScreenHeader({
  title,
  onBack,
  darkMode,
}: {
  title: string;
  onBack: () => void;
  darkMode: boolean;
}) {
  return (
    <View style={styles.screenHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to home"
        onPress={onBack}
        style={[styles.backButton, darkMode && styles.darkBackButton]}
      >
        <Text style={[styles.backArrow, darkMode && { color: DARK_TEXT }]}>
          ‹
        </Text>
      </Pressable>
      <Text
        style={[
          styles.screenHeaderTitle,
          darkMode && styles.darkPrimaryText,
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

export function OptionButton({
  label,
  active,
  darkMode,
  onPress,
}: {
  label: string;
  active: boolean;
  darkMode: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.optionButton,
        darkMode && styles.darkOptionButton,
        active && (darkMode ? styles.darkActiveOptionButton : styles.activeOptionButton),
      ]}
    >
      <Text
        style={[
          styles.optionButtonText,
          darkMode && styles.darkSecondaryText,
          active &&
            (darkMode ? styles.darkActiveOptionText : styles.activeOptionText),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MiniBoard({
  board,
  darkMode,
  size,
}: {
  board: Board;
  darkMode: boolean;
  size: number;
}) {
  return (
    <View
      style={[
        styles.miniBoard,
        { width: size, height: size },
        darkMode && styles.darkMiniBoard,
      ]}
    >
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.miniRow}>
          {row.map((digit, colIndex) => (
            <View
              key={colIndex}
              style={[
                styles.miniCell,
                (colIndex === 2 || colIndex === 5) &&
                  (darkMode ? styles.darkMiniBoxRight : styles.miniBoxRight),
                (rowIndex === 2 || rowIndex === 5) &&
                  (darkMode ? styles.darkMiniBoxBottom : styles.miniBoxBottom),
                darkMode && styles.darkMiniCell,
              ]}
            >
              <Text
                style={[
                  styles.miniCellDigit,
                  { fontSize: Math.max(8, (size / 9) * 0.55) },
                  darkMode && styles.darkMiniCellDigit,
                ]}
              >
                {digit || ''}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
