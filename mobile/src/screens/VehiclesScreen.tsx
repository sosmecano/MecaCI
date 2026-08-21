import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';

export default function VehiclesScreen({ navigation }: any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    try {
      const data = await api.users.vehicles.list();
      setVehicles(data);
    } catch {}
    setLoading(false);
  };

  const addVehicle = async () => {
    if (!brand || !model) return;
    try {
      await api.users.vehicles.create({ brand, model, year: parseInt(year) || 2024, license_plate: plate });
      setShowForm(false);
      setBrand(''); setModel(''); setYear(''); setPlate('');
      loadVehicles();
    } catch (e: any) { alert(e.message); }
  };

  const removeVehicle = (id: string) => {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce véhicule ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        setRemovingId(id);
        try {
          await api.users.vehicles.remove(id);
          loadVehicles();
        } catch (e: any) {
          alert(e.message || 'Erreur lors de la suppression');
        } finally {
          setRemovingId(null);
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes véhicules</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showForm && (
          <Card style={styles.form}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Marque</Text>
                <TextInput style={styles.input} placeholder="Toyota" placeholderTextColor={Colors.onSurfaceVariant} value={brand} onChangeText={setBrand} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Modèle</Text>
                <TextInput style={styles.input} placeholder="Corolla" placeholderTextColor={Colors.onSurfaceVariant} value={model} onChangeText={setModel} />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Année</Text>
                <TextInput style={styles.input} placeholder="2020" placeholderTextColor={Colors.onSurfaceVariant} value={year} onChangeText={setYear} keyboardType="number-pad" />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Plaque</Text>
                <TextInput style={styles.input} placeholder="AB-123-CD" placeholderTextColor={Colors.onSurfaceVariant} value={plate} onChangeText={setPlate} />
              </View>
            </View>
            <Button title="Ajouter" onPress={addVehicle} disabled={!brand || !model} />
          </Card>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="car-sport-outline" size={48} color={Colors.outlineVariant} />
            </View>
            <Text style={styles.emptyText}>Aucun véhicule enregistré</Text>
            <Button title="Ajouter un véhicule" onPress={() => setShowForm(true)} style={{ marginTop: Spacing.md }} />
          </View>
        ) : (
          vehicles.map((v: any) => (
            <Card key={v.id} style={styles.vehicleCard}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car-sport" size={22} color={Colors.secondary} />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{v.brand} {v.model} {v.year}</Text>
                {v.license_plate && <Text style={styles.vehiclePlate}>{v.license_plate}</Text>}
              </View>
              <TouchableOpacity onPress={() => removeVehicle(v.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.subheadSm,
    color: Colors.onSurface,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: Spacing.md },
  form: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formField: {
    flex: 1,
  },
  label: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
    fontWeight: '600' as any,
  },
  input: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
    ...Typography.bodySm,
    color: Colors.onSurface,
  },
  empty: { alignItems: 'center', marginTop: Spacing.xxl },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.bodyBase,
    color: Colors.onSurfaceVariant,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.secondaryContainer + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: {
    ...Typography.bodyBase,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
  vehiclePlate: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
