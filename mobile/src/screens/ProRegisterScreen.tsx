import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { api } from '../services/api';

const proTypes = [
  { id: 'mechanic', label: 'Mécanicien', icon: 'build' as const },
  { id: 'tow_truck', label: 'Remorqueur', icon: 'car' as const },
  { id: 'garage', label: 'Garage', icon: 'storefront' as const },
];

export default function ProRegisterScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '+225 ', type: 'mechanic',
    business_name: '', specialties: [] as string[], mobile_money_number: '',
  });

  const register = async () => {
    setLoading(true);
    try {
      await api.professionals.register(form);
      alert('Inscription envoyée ! Validation sous 24-48h.');
      navigation.goBack();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Devenir partenaire</Text>

        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
        </View>

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Qui êtes-vous ?</Text>
            <Text style={styles.sectionSub}>Choisissez votre activité</Text>
            <View style={styles.typeGrid}>
              {proTypes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeCard, form.type === t.id && styles.typeCardActive]}
                  onPress={() => setForm({ ...form, type: t.id })}
                >
                  <View style={[styles.typeIconWrap, form.type === t.id && styles.typeIconWrapActive]}>
                    <Ionicons name={t.icon} size={24} color={form.type === t.id ? Colors.primary : Colors.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.typeLabel, form.type === t.id && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Prénom" value={form.first_name} onChangeText={(t) => setForm({ ...form, first_name: t })} leftIcon="person-outline" />
            <Input label="Nom" value={form.last_name} onChangeText={(t) => setForm({ ...form, last_name: t })} leftIcon="person-outline" />
            <Input label="Téléphone" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" maxLength={20} leftIcon="call-outline" />
            <Button title="Suivant" onPress={() => setStep(2)} disabled={!form.first_name || !form.last_name} />
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Votre structure</Text>
            <Input label="Nom du garage / entreprise" value={form.business_name} onChangeText={(t) => setForm({ ...form, business_name: t })} leftIcon="storefront-outline" />
            <Input label="Numéro Mobile Money" value={form.mobile_money_number} onChangeText={(t) => setForm({ ...form, mobile_money_number: t })} keyboardType="phone-pad" leftIcon="phone-portrait-outline" />
            <Button title="Suivant" onPress={() => setStep(3)} />
          </View>
        )}
        {step === 3 && (
          <View>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.summaryTitle}>Prêt à être envoyé !</Text>
            <Text style={styles.summary}>Votre inscription sera examinée par notre équipe.</Text>
            <Text style={styles.summaryHighlight}>Délai : 24 - 48 heures</Text>
            <Button title="Envoyer l'inscription" onPress={register} loading={loading} style={{ marginTop: Spacing.lg }} />
            <Button title="Modifier" variant="outline" onPress={() => setStep(1)} style={{ marginTop: Spacing.sm }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, flexGrow: 1 },
  title: { ...Typography.headlineLg, color: Colors.onSurface, marginBottom: Spacing.lg },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.outlineVariant },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.outlineVariant, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },
  sectionTitle: { ...Typography.subheadSm, color: Colors.onSurface, marginBottom: Spacing.xs },
  sectionSub: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginBottom: Spacing.lg },
  typeGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.outlineVariant,
  },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceContainerLow },
  typeIconWrap: {
    width: 48, height: 48, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs,
  },
  typeIconWrapActive: { backgroundColor: Colors.primaryContainer },
  typeLabel: { ...Typography.caption, fontWeight: '600' as any, color: Colors.onSurfaceVariant },
  typeLabelActive: { color: Colors.onSurface },
  successIcon: { alignItems: 'center', marginBottom: Spacing.lg },
  summaryTitle: { ...Typography.subheadSm, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.sm },
  summary: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  summaryHighlight: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface, textAlign: 'center', marginTop: Spacing.lg },
});
