import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import { api } from '../services/api';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    setError(null);
    try {
      const [userData, vehData] = await Promise.all([api.users.me(), api.users.vehicles.list()]);
      setUser(userData);
      setVehicles(vehData);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('userType');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
          <Text style={{ ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.md }}>{error}</Text>
          <Button title="Réessayer" onPress={loadProfile} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = user ? `${(user.first_name || '')[0]}${(user.last_name || '')[0]}` : '??';

  const menuItems = [
    { icon: 'car', label: 'Mes véhicules', route: 'Vehicles' },
    { icon: 'receipt', label: 'Mes missions', route: 'Activite' },
    { icon: 'wallet', label: 'Mes paiements', route: 'Payment' },
    { icon: 'settings', label: 'Paramètres', route: 'Parametres' },
    { icon: 'help-circle', label: 'Aide et support', route: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Parametres')} activeOpacity={0.7}>
            {user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>
            {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Utilisateur'}
          </Text>
          <Text style={styles.phone}>{user?.phone || ''}</Text>
          {user?.city && (
            <View style={styles.badge}>
              <Ionicons name="location" size={12} color={Colors.onSurfaceVariant} />
              <Text style={styles.badgeText}>{user.city}</Text>
            </View>
          )}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => item.route ? navigation.navigate(item.route) : Alert.alert('Aide', 'Contactez-nous au +225 01 01 01 01 01')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.outlineVariant} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Véhicule principal</Text>
        {vehicles.length > 0 ? (
          <Card>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={22} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{vehicles[0].brand} {vehicles[0].model} {vehicles[0].year}</Text>
                <Text style={styles.vehiclePlate}>{vehicles[0].license_plate}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.outlineVariant} />
            </View>
          </Card>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('Vehicles')} activeOpacity={0.7}>
            <Text style={styles.noVehicle}>+ Ajouter un véhicule</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.safeMargin },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.xl, paddingVertical: Spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, overflow: 'hidden',
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { ...Typography.headlineLg, color: Colors.onPrimaryContainer },
  name: { ...Typography.titleMd, color: Colors.onSurface },
  phone: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, marginTop: Spacing.xs },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4, marginTop: Spacing.sm,
  },
  badgeText: { ...Typography.caption, color: Colors.onSurfaceVariant },
  menu: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh },
  menuIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryContainer + '20',
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  menuLabel: { ...Typography.bodyBase, color: Colors.onSurface, flex: 1 },
  sectionTitle: { ...Typography.subheadSm, color: Colors.onSurface, marginBottom: Spacing.sm },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: {
    width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.secondaryContainer + '30',
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  vehicleName: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onSurface },
  vehiclePlate: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  noVehicle: { ...Typography.bodyBase, color: Colors.primary, textAlign: 'center', marginTop: Spacing.md, fontWeight: '600' as any },
  logoutBtn: {
    marginTop: Spacing.xl, paddingVertical: Spacing.md,
    alignItems: 'center', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.error + '40',
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs,
  },
  logoutText: { fontSize: 16, fontWeight: '600' as any, color: Colors.error },
});
