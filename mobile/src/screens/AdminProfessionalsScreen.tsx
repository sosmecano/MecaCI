import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import Button from '../components/Button';
import { api } from '../services/api';

export default function AdminProfessionalsScreen() {
  const [pros, setPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      loadPros();
    }, [filter])
  );

  const loadPros = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.professionals(filter);
      setPros(Array.isArray(res) ? res : res?.professionals || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const validatePro = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.admin.validatePro(id, action);
      loadPros();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const filters = [
    { key: 'all', label: 'Tous' },
    { key: 'pending', label: 'En attente' },
    { key: 'active', label: 'Actifs' },
    { key: 'suspended', label: 'Suspendus' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Professionnels</Text>
      </View>
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
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : pros.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={Colors.outlineVariant} />
          <Text style={styles.empty}>Aucun professionnel</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {pros.map((p: any, i: number) => (
            <Card key={p.id || i} style={styles.proCard}>
              <View style={styles.proTop}>
                <View style={styles.proAvatar}>
                  <Text style={styles.proAvatarText}>
                    {((p.first_name || '')[0] || '') + ((p.last_name || '')[0] || '') || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proName}>{p.business_name || `${p.first_name || ''} ${p.last_name || ''}`}</Text>
                  <Text style={styles.proDetail}>{p.type} · {p.city || ''}</Text>
                  <Text style={styles.proDetail}>{p.phone || ''}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: p.status === 'active' ? Colors.success + '20' : p.status === 'pending' ? Colors.primaryContainer + '40' : Colors.errorContainer,
                }]}>
                  <Text style={[styles.statusText, {
                    color: p.status === 'active' ? Colors.success : p.status === 'pending' ? Colors.primary : Colors.error,
                  }]}>{p.status}</Text>
                </View>
              </View>
              {p.status === 'pending' && (
                <View style={styles.actions}>
                  <Button title="Approuver" onPress={() => validatePro(p.id, 'approve')} style={{ flex: 1 }} />
                  <Button title="Rejeter" onPress={() => validatePro(p.id, 'reject')} variant="sos" style={{ flex: 1 }} />
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
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.xs, backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
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
  proCard: { marginBottom: Spacing.sm },
  proTop: { flexDirection: 'row', alignItems: 'center' },
  proAvatar: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  proAvatarText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  proName: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  proDetail: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.md },
  statusText: { ...Typography.caption, fontWeight: '700' as any },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
