import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';

const methods = [
  { id: 'orange_money', label: 'Orange Money', icon: 'phone-portrait-outline' as const, color: '#FF6600' },
  { id: 'mtn_momo', label: 'MTN MoMo', icon: 'phone-portrait-outline' as const, color: '#FFCC00' },
  { id: 'wave', label: 'Wave', icon: 'water-outline' as const, color: '#0066FF' },
  { id: 'cash', label: 'Espèces', icon: 'cash-outline' as const, color: Colors.success },
];

export default function PaymentScreen({ route, navigation }: any) {
  const missionId = route?.params?.missionId;
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!selected || !missionId) return;
    setLoading(true);
    try {
      await api.payments.create({
        mission_id: missionId,
        method: selected,
      });
      Alert.alert('Paiement réussi', 'Merci pour votre confiance !');
      navigation.navigate('Home');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Paiement</Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.summaryLabel}>Intervention terminée</Text>
          </View>
          <Text style={styles.amount}>{route?.params?.amount || '12 500'} FCFA</Text>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant</Text>
            <Text style={styles.detailValue}>{route?.params?.amount || '12 000'} FCFA</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Commission Mecanova</Text>
            <Text style={styles.detailValue}>{Math.round((route?.params?.amount || 12000) * 0.1)} FCFA</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Moyen de paiement</Text>
        {methods.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodCard, selected === m.id && styles.methodSelected]}
            onPress={() => setSelected(m.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: m.color + '15' }]}>
              <Ionicons name={m.icon} size={22} color={m.color} />
            </View>
            <Text style={styles.methodLabel}>{m.label}</Text>
            <View style={[styles.radio, selected === m.id && styles.radioSelected]}>
              {selected === m.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <Button
          title={`Payer ${route?.params?.amount || '12 500'} FCFA`}
          onPress={handlePayment}
          disabled={!selected}
          loading={loading}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg },
  title: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  amount: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    width: '100%',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  detailValue: {
    ...Typography.bodySm,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
  sectionTitle: {
    ...Typography.subheadSm,
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
  },
  methodSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  methodLabel: {
    ...Typography.bodyBase,
    fontWeight: '600' as any,
    color: Colors.onSurface,
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
});
