import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
const problems = [
  { id: 'repair', label: '🔧 Réparation' },
  { id: 'oil', label: '🛢️ Vidange / Entretien' },
  { id: 'diag', label: '📋 Diagnostic' },
  { id: 'elec', label: '⚡ Électricité' },
  { id: 'ac', label: '❄️ Climatisation' },
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
          const updated = await api.missions.get(mission.id);
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
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'problem' && (
          <View>
            <Text style={styles.title}>Mécanicien à domicile</Text>
            <Text style={styles.sectionTitle}>Quel est le problème ?</Text>
            <View style={styles.problemGrid}>
              {problems.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.problemCard, selectedProblem === p.id && styles.problemSelected]}
                  onPress={() => setSelectedProblem(p.id)}
                >
                  <Text style={[styles.problemLabel, selectedProblem === p.id && styles.problemLabelSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Continuer" onPress={() => setStep('description')} disabled={!selectedProblem} />
          </View>
        )}

        {step === 'description' && (
          <View>
            <Text style={styles.title}>Décrivez le problème</Text>
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
            <Text style={styles.title}>Où êtes-vous ?</Text>
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
              <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
                <Text style={styles.locateBtnText}>📍 Me localiser</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre adresse"
              placeholderTextColor={Colors.mediumGray}
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
            <Text style={styles.title}>Estimation</Text>
            <View style={styles.estimationCard}>
              <View style={styles.estRow}>
                <Text style={styles.estLabel}>📍 Lieu</Text>
                <Text style={styles.estValue} numberOfLines={2}>{addressText || 'Position sélectionnée'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estRow}>
                <Text style={styles.estLabel}>💰 Prix estimé</Text>
                <Text style={styles.priceValue}>8 000 - 15 000 FCFA</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.estRow}>
                <Text style={styles.estLabel}>🕐 Arrivée</Text>
                <Text style={styles.estValue}>15 - 25 min</Text>
              </View>
            </View>
            <Button title="Confirmer la demande" onPress={confirmMission} />
          </View>
        )}

        {step === 'searching' && (
          <View style={styles.centerWrap}>
            <View style={styles.searchingIcon}>
              <Text style={styles.searchingIconText}>🔧</Text>
            </View>
            <Text style={styles.title}>Recherche en cours...</Text>
            <Text style={styles.searchText}>3 professionnels consultent votre demande</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
            <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }} />
          </View>
        )}

        {step === 'found' && (
          <View style={styles.centerWrap}>
            <View style={styles.foundIcon}>
              <Text style={styles.foundIconText}>✅</Text>
            </View>
            <Text style={styles.title}>Professionnel trouvé</Text>
            <Card style={styles.foundCard}>
              <View style={styles.foundRow}>
                <View style={[styles.proAvatar, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.proAvatarText}>?</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proName}>Professionnel en route</Text>
                  <Text style={styles.proSub}>⭐ en attente des détails</Text>
                </View>
              </View>
            </Card>
            <View style={styles.actionRow}>
              <Button title="Suivre" onPress={() => navigation.navigate('Tracking', { missionId })} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, flexGrow: 1 },
  title: { fontSize: FontSize.title, fontWeight: '800', color: Colors.black, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.subtitle, fontWeight: '600', color: Colors.black, marginBottom: Spacing.md },
  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  problemCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  problemSelected: { borderColor: Colors.primary, backgroundColor: '#FFFDE5' },
  problemLabel: { fontSize: FontSize.body, color: Colors.mediumGray, fontWeight: '500' },
  problemLabelSelected: { color: Colors.black, fontWeight: '700' },
  estimationCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  estRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  estLabel: { fontSize: FontSize.body, color: Colors.mediumGray },
  estValue: { fontSize: FontSize.body, fontWeight: '600', color: Colors.black, flex: 1, textAlign: 'right', marginLeft: Spacing.md },
  priceValue: { fontSize: FontSize.subtitle, fontWeight: '700', color: Colors.black },
  divider: { height: 1, backgroundColor: Colors.lightGray },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchingIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  searchingIconText: { fontSize: 36 },
  searchText: { fontSize: FontSize.body, color: Colors.mediumGray, textAlign: 'center' },
  searchingBar: { height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, marginVertical: Spacing.lg, width: '100%', overflow: 'hidden' },
  searchingProgress: { width: '50%', height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  foundIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F8E8', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  foundIconText: { fontSize: 36 },
  foundCard: { width: '100%', padding: Spacing.lg, marginBottom: Spacing.lg },
  foundRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  proAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.black },
  proName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.black },
  proSub: { fontSize: FontSize.caption, color: Colors.mediumGray, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  mapWrap: { height: 200, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  map: { flex: 1 },
  locateBtn: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  locateBtnText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.black },
  label: { fontSize: FontSize.body, color: Colors.black, fontWeight: '600', marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.body, color: Colors.black,
  },
  suggestions: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  suggestionText: { fontSize: FontSize.body, color: Colors.black },
});
