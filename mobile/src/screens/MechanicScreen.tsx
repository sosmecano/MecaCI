import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const problems = [
  { id: 'repair', icon: 'build', label: 'Réparation' },
  { id: 'oil', icon: 'water', label: 'Vidange / Entretien' },
  { id: 'diag', icon: 'document-text', label: 'Diagnostic' },
  { id: 'elec', icon: 'flash', label: 'Électricité' },
  { id: 'ac', icon: 'snow', label: 'Climatisation' },
];

export default function MechanicScreen({ navigation }: any) {
  const [step, setStep] = useState<'problem' | 'description' | 'location' | 'estimation' | 'searching' | 'found'>('problem');
  const [selectedProblem, setSelectedProblem] = useState('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(false);
  const [missionId, setMissionId] = useState<string | null>(null);

  useEffect(() => {
    return () => { listeningRef.current = false; };
  }, []);

  const locateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Activez la localisation dans les paramètres de votre téléphone.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 500);
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible de vous localiser. Vérifiez que la GPS est activé.');
    }
  };

  const onMapPress = async (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocation({ lat: latitude, lng: longitude });
    reverseGeocode(latitude, longitude);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const data = await api.proxy.reverseGeocode(lat, lng);
      if (data?.display_name) setAddressText(data.display_name);
    } catch {}
  };

  const searchAddress = (text: string) => {
    setAddressText(text);
    setLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.proxy.searchAddress(text);
        setSuggestions(data || []);
      } catch { setSuggestions([]); }
    }, 400);
  };

  const selectAddress = (item: any) => {
    setLocation({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setAddressText(item.display_name);
    setSuggestions([]);
  };

  const confirmMission = async () => {
    setStep('searching');
    try {
      const mission = await api.missions.create({
        service_type: 'mechanic',
        description,
        location_lat: location!.lat,
        location_lng: location!.lng,
        location_address: addressText || undefined,
      });
      setMissionId(mission.id);

      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const socket = connectSocket(token);
        socket.emit('join:user', mission.user_id);
        if (listeningRef.current) socket.off('mission:accepted');
        listeningRef.current = true;
        socket.on('mission:accepted', async () => {
          if (!listeningRef.current) return;
          await api.missions.get(mission.id);
          setStep('found');
        });
      }
    } catch (e: any) {
      alert(e.message);
      setStep('estimation');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mécanicien à domicile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'problem' && (
          <View>
            <Text style={styles.sectionTitle}>Quel est le problème ?</Text>
            <View style={styles.problemGrid}>
              {problems.map((p) => {
                const isSelected = selectedProblem === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.problemCard, isSelected && styles.problemSelected]}
                    onPress={() => setSelectedProblem(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.problemIcon, isSelected && styles.problemIconSelected]}>
                      <Ionicons name={p.icon as any} size={22} color={isSelected ? Colors.primary : Colors.onSurfaceVariant} />
                    </View>
                    <Text style={[styles.problemLabel, isSelected && styles.problemLabelSelected]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button title="Continuer" onPress={() => setStep('description')} disabled={!selectedProblem} />
          </View>
        )}

        {step === 'description' && (
          <View>
            <Text style={styles.sectionTitle}>Décrivez le problème</Text>
            <Input
              placeholder="Le moteur fait un bruit étrange..."
              value={description}
              onChangeText={setDescription}
              label="Description"
              multiline
              numberOfLines={4}
            />
            <Button title="Continuer" onPress={() => setStep('location')} />
          </View>
        )}

        {step === 'location' && (
          <View>
            <Text style={styles.sectionTitle}>Où êtes-vous ?</Text>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: location?.lat || 5.345,
                  longitude: location?.lng || -4.015,
                  latitudeDelta: 0.02, longitudeDelta: 0.02,
                }}
                onPress={onMapPress}
              >
                {location && (
                  <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} title="Ma position" pinColor={Colors.primary} />
                )}
              </MapView>
              <TouchableOpacity style={styles.locateBtn} onPress={locateMe} activeOpacity={0.7}>
                <Ionicons name="locate" size={18} color={Colors.primary} />
                <Text style={styles.locateBtnText}>Me localiser</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre adresse"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={addressText}
              onChangeText={searchAddress}
            />
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((item, i) => (
                  <TouchableOpacity key={item.place_id || item.display_name || String(i)} style={styles.suggestionItem} onPress={() => selectAddress(item)}>
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Button title="Continuer" onPress={() => setStep('estimation')} disabled={!location} style={{ marginTop: Spacing.md }} />
          </View>
        )}

        {step === 'estimation' && (
          <View>
            <Text style={styles.sectionTitle}>Estimation</Text>
            <Card style={styles.estimationCard}>
              <View style={styles.estRow}>
                <Ionicons name="location" size={18} color={Colors.onSurfaceVariant} />
                <Text style={styles.estLabel}>Lieu</Text>
                <Text style={styles.estValue} numberOfLines={2}>{addressText || 'Position sélectionnée'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estRow}>
                <Ionicons name="wallet" size={18} color={Colors.primary} />
                <Text style={styles.estLabel}>Prix estimé</Text>
                <Text style={styles.priceValue}>8 000 - 15 000 FCFA</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estRow}>
                <Ionicons name="time" size={18} color={Colors.onSurfaceVariant} />
                <Text style={styles.estLabel}>Arrivée</Text>
                <Text style={styles.estValue}>15 - 25 min</Text>
              </View>
            </Card>
            <Button title="Confirmer la demande" onPress={confirmMission} />
          </View>
        )}

        {step === 'searching' && (
          <View style={styles.centerWrap}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primaryContainer + '30' }]}>
              <Ionicons name="build" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Recherche en cours...</Text>
            <Text style={styles.searchText}>3 professionnels consultent votre demande</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
            <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }} />
          </View>
        )}

        {step === 'found' && (
          <View style={styles.centerWrap}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F8E8' }]}>
              <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
            </View>
            <Text style={styles.sectionTitle}>Professionnel trouvé</Text>
            <Card style={{ width: '100%', marginBottom: Spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.proAvatar}>
                  <Text style={styles.proAvatarText}>?</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proName}>Professionnel en route</Text>
                  <Text style={styles.proSub}>en attente des détails</Text>
                </View>
              </View>
            </Card>
            <Button title="Suivre" onPress={() => navigation.navigate('Tracking', { missionId })} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.safeMargin,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.subheadSm, color: Colors.onSurface },
  content: { padding: Spacing.safeMargin, flexGrow: 1 },
  sectionTitle: { ...Typography.subheadSm, color: Colors.onSurface, marginBottom: Spacing.md },
  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  problemCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    minWidth: '48%',
  },
  problemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer + '15' },
  problemIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  problemIconSelected: { backgroundColor: Colors.primaryContainer + '30' },
  problemLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, fontWeight: '500' as any },
  problemLabelSelected: { color: Colors.onSurface, fontWeight: '700' as any },
  estimationCard: { marginBottom: Spacing.lg },
  estRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  estLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginLeft: Spacing.xs },
  estValue: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface, flex: 1, textAlign: 'right' },
  priceValue: { ...Typography.subheadSm, fontWeight: '700' as any, color: Colors.onSurface },
  divider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  searchText: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  searchingBar: { height: 4, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 2, marginVertical: Spacing.lg, width: '100%', overflow: 'hidden' },
  searchingProgress: { width: '50%', height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 2 },
  proAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  proName: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onSurface },
  proSub: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  mapWrap: { height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  map: { flex: 1 },
  locateBtn: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Glass.background, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.xs, ...Shadow.sm,
  },
  locateBtnText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  label: { ...Typography.bodyBase, color: Colors.onSurface, fontWeight: '600' as any, marginBottom: Spacing.sm },
  input: {
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    padding: Spacing.xs, ...Typography.bodyBase, color: Colors.onSurface, minHeight: 48,
  },
  suggestions: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.outlineVariant, marginBottom: Spacing.md,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh,
  },
  suggestionText: { ...Typography.bodySm, color: Colors.onSurface },
});
