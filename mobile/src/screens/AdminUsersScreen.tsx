import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import { api } from '../services/api';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.users();
      setUsers(Array.isArray(res) ? res : res?.users || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const suspendUser = (id: string, name: string) => {
    Alert.alert('Suspendre', `Suspendre l'utilisateur ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Suspendre', style: 'destructive', onPress: async () => {
        try {
          await api.admin.suspendUser(id);
          loadUsers();
        } catch (e: any) {
          Alert.alert('Erreur', e.message);
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Utilisateurs</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={Colors.outlineVariant} />
          <Text style={styles.empty}>Aucun utilisateur</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {users.map((u: any, i: number) => (
            <Card key={u.id || i} style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {((u.first_name || '')[0] || '') + ((u.last_name || '')[0] || '') || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={14} color={Colors.onSurfaceVariant} />
                    <Text style={styles.userDetail}>{u.phone || ''}</Text>
                  </View>
                  {u.email && (
                    <View style={styles.detailRow}>
                      <Ionicons name="mail-outline" size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.userDetail}>{u.email}</Text>
                    </View>
                  )}
                  {u.city && (
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.userDetail}>{u.city}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.userActions}>
                  {u.is_suspended ? (
                    <View style={styles.suspendedBadge}>
                      <Text style={styles.suspendedLabel}>Suspendu</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => suspendUser(u.id, u.first_name || u.phone || '')} style={styles.suspendBtn}>
                      <Ionicons name="ban-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {u.created_at && (
                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={12} color={Colors.onSurfaceVariant} />
                  <Text style={styles.userDate}>Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}</Text>
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
  content: { padding: Spacing.md },
  empty: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  userCard: { marginBottom: Spacing.sm },
  userTop: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  userAvatarText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  userName: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface, marginBottom: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  userDetail: { ...Typography.caption, color: Colors.onSurfaceVariant },
  userActions: { alignItems: 'center' },
  suspendedBadge: {
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.md,
  },
  suspendedLabel: { ...Typography.caption, fontWeight: '700' as any, color: Colors.error },
  suspendBtn: {
    width: 32, height: 32, borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  userDate: { ...Typography.caption, color: Colors.onSurfaceVariant },
});
