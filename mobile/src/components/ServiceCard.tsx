import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, Typography } from '../constants/theme';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const ACCENTS: Record<string, { color: string; ionIcon: string }> = {
  'Mécanicien': { color: Colors.primary, ionIcon: 'build' },
  'Urgence': { color: Colors.error, ionIcon: 'warning' },
  'Remorquage': { color: Colors.secondary, ionIcon: 'car' },
  'Garages': { color: Colors.tertiary, ionIcon: 'business' },
};

export default function ServiceCard({ icon, title, subtitle, onPress }: Props) {
  const accent = ACCENTS[title] || { color: Colors.outline, ionIcon: 'help-circle' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: accent.color + '15' }]}>
        <Ionicons name={accent.ionIcon as any} size={26} color={accent.color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
});
