import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'black' | 'secondary' | 'sos' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export default function Button({ title, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const config: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: Colors.primary, text: Colors.onPrimary },
    black: { bg: Colors.inverseSurface, text: Colors.inverseOnSurface },
    secondary: { bg: Colors.surfaceContainerHighest, text: Colors.onSurface },
    sos: { bg: Colors.error, text: Colors.onError },
    outline: { bg: 'transparent', text: Colors.primary, border: Colors.outlineVariant },
  };

  const { bg, text: textColor, border } = config[variant] || config.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: bg },
        border ? { borderWidth: 1.5, borderColor: border } : {},
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.onPrimary : Colors.white} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  text: {
    ...Typography.bodyBase,
    fontWeight: '700' as any,
  },
  disabled: {
    opacity: 0.4,
  },
});
