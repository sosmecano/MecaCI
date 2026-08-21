import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import { api } from '../services/api';

export default function AdminDashboardScreen({ navigation }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const loadDashboard = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.dashboard();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    SecureStore.deleteItemAsync('auth_token');
    SecureStore.deleteItemAsync('refresh_token');
    SecureStore.deleteItemAsync('userType');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDashboard} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const kpis = [
    { label: 'Utilisateurs', value: data?.total_users ?? 0, icon: 'people-outline' as const, color: Colors.secondary },
    { label: 'Pros actifs', value: data?.active_pros ?? 0, icon: 'build-outline' as const, color: Colors.primary },
    { label: 'Pros en attente', value: data?.pending_pros ?? 0, icon: 'time-outline' as const, color: Colors.tertiary },
    { label: 'Missions actives', value: data?.active_missions ?? 0, icon: 'clipboard-outline' as const, color: Colors.primaryContainer },
    { label: 'Missions total', value: data?.total_missions ?? 0, icon: 'stats-chart-outline' as const, color: Colors.onSurfaceVariant },
    { label: 'Revenus', value: data?.total_revenue ? `${Number(data.total_revenue).toLocaleString()} FCFA` : '0 FCFA', icon: 'wallet-outline' as const, color: Colors.success },
    { label: 'Commissions', value: data?.total_commissions ? `${Number(data.total_commissions).toLocaleString()} FCFA` : '0 FCFA', icon: 'card-outline' as const, color: Colors.tertiary },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {kpis.map((kpi, i) => (
            <Card key={kpi.label || String(i)} style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: kpi.color + '15' }]}>
                <Ionicons name={kpi.icon} size={22} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
  },
  errorText: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.primary,
  },
  retryText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.primary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  headerTitle: { ...Typography.subheadSm, color: Colors.onSurface },
  logoutBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: {
    width: '47%', alignItems: 'center', padding: Spacing.md, gap: Spacing.xs,
  },
  kpiIconWrap: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  kpiValue: { ...Typography.titleMd, fontWeight: '800' as any, color: Colors.onSurface },
  kpiLabel: { ...Typography.caption, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
