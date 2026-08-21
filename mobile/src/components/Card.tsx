import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
});
