import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import { api } from '../services/api';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', en_route: 'En route', arrived: 'Arrivé',
  in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800', en_route: '#2196F3', arrived: '#4CAF50',
  in_progress: '#9C27B0', completed: '#4CAF50', cancelled: '#F44336',
};

export default function AdminMissionsScreen() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [filter])
  );

  const loadMissions = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.missions(filter);
      setMissions(Array.isArray(res) ? res : res?.missions || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'en_route', label: 'En route' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'completed', label: 'Terminées' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Missions</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : missions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={48} color={Colors.outlineVariant} />
          <Text style={styles.empty}>Aucune mission</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {missions.map((m: any, i: number) => (
            <Card key={m.id || i} style={styles.missionCard}>
              <View style={styles.missionTop}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[m.status] || Colors.outlineVariant }]} />
                <Text style={styles.missionService}>{m.service_type || m.type || 'Service'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[m.status] || Colors.outlineVariant) + '20' }]}>
                  <Text style={[styles.missionStatus, { color: STATUS_COLORS[m.status] || Colors.onSurfaceVariant }]}>
                    {STATUS_LABELS[m.status] || m.status}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.missionClient}>
                  {[m.user_first_name, m.user_last_name].filter(Boolean).join(' ') || m.user_phone || '—'}
                </Text>
              </View>
              {m.pro_first_name && (
                <View style={styles.detailRow}>
                  <Ionicons name="build-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.missionPro}>
                    {[m.pro_first_name, m.pro_last_name].filter(Boolean).join(' ') || m.pro_phone || '—'}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.missionAddress}>{m.location_address || m.address || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.missionDate}>{m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : '—'}</Text>
              </View>
              {m.price_estimate && (
                <View style={styles.priceRow}>
                  <Ionicons name="cash-outline" size={14} color={Colors.primary} />
                  <Text style={styles.missionPrice}>{m.price_estimate} FCFA</Text>
                </View>
              )}
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  errorWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
  },
  errorText: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  header: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  headerTitle: { ...Typography.subheadSm, color: Colors.onSurface },
  filterScroll: { backgroundColor: Colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { ...Typography.caption, fontWeight: '600' as any, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.onPrimary },
  content: { padding: Spacing.md },
  empty: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  missionCard: { marginBottom: Spacing.sm },
  missionTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  missionService: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.md },
  missionStatus: { ...Typography.caption, fontWeight: '600' as any },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  missionClient: { ...Typography.caption, color: Colors.onSurfaceVariant },
  missionPro: { ...Typography.caption, color: Colors.onSurfaceVariant },
  missionAddress: { ...Typography.caption, color: Colors.onSurfaceVariant, flex: 1 },
  missionDate: { ...Typography.caption, color: Colors.onSurfaceVariant },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  missionPrice: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
});
