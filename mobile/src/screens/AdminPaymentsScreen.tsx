import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Card from '../components/Card';
import { api } from '../services/api';

export default function AdminPaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  const loadPayments = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.admin.payments();
      const list = Array.isArray(res) ? res : res?.payments || [];
      setPayments(list);
      const total = list.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
      const commissions = list.reduce((s: number, p: any) => s + (parseFloat(p.commission) || 0), 0);
      setSummary({ total, commissions, count: list.length });
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paiements</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Ionicons name="receipt-outline" size={20} color={Colors.secondary} />
              <Text style={styles.summaryValue}>{summary.count}</Text>
              <Text style={styles.summaryLabel}>Transactions</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Ionicons name="wallet-outline" size={20} color={Colors.success} />
              <Text style={styles.summaryValue}>{Number(summary.total).toLocaleString()} FCFA</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Ionicons name="card-outline" size={20} color={Colors.tertiary} />
              <Text style={styles.summaryValue}>{Number(summary.commissions).toLocaleString()} FCFA</Text>
              <Text style={styles.summaryLabel}>Commissions</Text>
            </Card>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cash-outline" size={48} color={Colors.outlineVariant} />
              <Text style={styles.empty}>Aucun paiement</Text>
            </View>
          ) : (
            payments.map((p: any, i: number) => (
              <Card key={p.id || i} style={styles.paymentCard}>
                <View style={styles.paymentTop}>
                  <Text style={styles.paymentAmount}>{parseFloat(p.amount || 0).toLocaleString()} FCFA</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.paymentStatus}>{p.status || 'completed'}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.paymentDetail}>{[p.user_first_name, p.user_last_name].filter(Boolean).join(' ') || p.user_phone || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="build-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.paymentDetail}>{[p.pro_first_name, p.pro_last_name].filter(Boolean).join(' ') || p.pro_phone || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="phone-portrait-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.paymentDetail}>{p.method || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="card-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.paymentDetail}>Commission: {parseFloat(p.commission || 0).toLocaleString()} FCFA</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.onSurfaceVariant} />
                  <Text style={styles.paymentDate}>{p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}</Text>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
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
  header: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  headerTitle: { ...Typography.subheadSm, color: Colors.onSurface },
  content: { padding: Spacing.md },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.xs },
  summaryValue: { ...Typography.bodySm, fontWeight: '800' as any, color: Colors.onSurface, textAlign: 'center' },
  summaryLabel: { ...Typography.caption, color: Colors.onSurfaceVariant, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  empty: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  paymentCard: { marginBottom: Spacing.sm },
  paymentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  paymentAmount: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onSurface },
  statusBadge: {
    backgroundColor: Colors.success + '20', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: BorderRadius.md,
  },
  paymentStatus: { ...Typography.caption, fontWeight: '600' as any, color: Colors.success },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  paymentDetail: { ...Typography.caption, color: Colors.onSurfaceVariant },
  paymentDate: { ...Typography.caption, color: Colors.onSurfaceVariant },
});
