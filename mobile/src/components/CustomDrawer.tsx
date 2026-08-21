import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';

const MENU_ITEMS = [
  { icon: 'home', iconOutline: 'home-outline', label: 'Accueil', route: 'Accueil' },
  { icon: 'construct', iconOutline: 'construct-outline', label: 'Services', route: 'Services' },
  { icon: 'time', iconOutline: 'time-outline', label: 'Activité', route: 'Activite' },
  { icon: 'car', iconOutline: 'car-outline', label: 'Mes véhicules', route: 'Vehicles' },
  { icon: 'receipt', iconOutline: 'receipt-outline', label: 'Mes missions', route: 'Tracking' },
  { icon: 'wallet', iconOutline: 'wallet-outline', label: 'Paiements', route: 'Payment' },
  { icon: 'settings', iconOutline: 'settings-outline', label: 'Paramètres', route: 'Parametres' },
];

const BOTTOM_ITEMS = [
  { icon: 'help-circle', iconOutline: 'help-circle-outline', label: 'Aide', route: null },
  { icon: 'log-out', iconOutline: 'log-out-outline', label: 'Déconnexion', route: 'Logout' },
];

interface Props {
  navigation: any;
  state: any;
}

export default function CustomDrawer({ navigation, state }: Props) {
  const currentRoute = state?.routes?.[state.index]?.name;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={Colors.onSurfaceVariant} />
        </View>
        <Text style={styles.appName}>Mecanova</Text>
        <Text style={styles.subtitle}>Mécanicien & Dépannage</Text>
      </View>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isActive ? item.icon : item.iconOutline) as any}
                size={22}
                color={isActive ? Colors.primary : Colors.onSurfaceVariant}
              />
              <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.menuSection}>
        {BOTTOM_ITEMS.map((item) => {
          const isLogout = item.route === 'Logout';
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => navigation.closeDrawer()}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.iconOutline as any}
                size={22}
                color={isLogout ? Colors.error : Colors.onSurfaceVariant}
              />
              <Text style={[styles.menuLabel, isLogout && { color: Colors.error }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  menuItemActive: {
    backgroundColor: Colors.primary + '15',
  },
  menuLabel: {
    ...Typography.bodyBase,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  menuLabelActive: {
    fontWeight: '700' as any,
    color: Colors.onSurface,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  version: {
    ...Typography.caption,
    color: Colors.outline,
  },
});
