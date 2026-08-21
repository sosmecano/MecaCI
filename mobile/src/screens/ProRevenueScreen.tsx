import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';

export default function ProRevenueScreen({ navigation }: any) {
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRevenue = async () => {
    setError(null);
    try {
      const data = await api.professionals.earnings();
      setRevenue(data);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Réessayer" onPress={loadRevenue} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Revenus</Text>

        <Card style={styles.totalCard}>
          <Ionicons name="wallet-outline" size={32} color={Colors.primary} />
          <Text style={styles.totalLabel}>Total des gains</Text>
          <Text style={styles.totalAmount}>
            {revenue?.total_earnings ? `${Number(revenue.total_earnings).toLocaleString()} FCFA` : '0 FCFA'}
          </Text>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="clipboard-outline" size={24} color={Colors.secondary} />
            <Text style={styles.statNum}>{revenue?.total_missions || 0}</Text>
            <Text style={styles.statLabel}>Missions</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={24} color={Colors.tertiary} />
            <Text style={styles.statNum}>
              {revenue?.total_missions
                ? `${Math.round((revenue.total_earnings || 0) / revenue.total_missions).toLocaleString()}`
                : '0'}
            </Text>
            <Text style={styles.statLabel}>Moyen/mission</Text>
          </Card>
        </View>
      </View>
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
  errorText: {
    ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center',
  },
  content: { padding: Spacing.md },
  title: { ...Typography.headlineLg, color: Colors.onSurface, marginBottom: Spacing.lg },
  totalCard: {
    padding: Spacing.xl, marginBottom: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  totalLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  totalAmount: { ...Typography.headlineLg, color: Colors.onSurface },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs,
  },
  statNum: { ...Typography.titleMd, fontWeight: '800' as any, color: Colors.onSurface },
  statLabel: { ...Typography.caption, color: Colors.onSurfaceVariant },
});
