import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatePrice(km: number) {
  if (km <= 5) return 5000;
  return 5000 + Math.ceil((km - 5)) * 1000;
}

export default function TowingScreen({ navigation }: any) {
  const [step, setStep] = useState<'form' | 'sending' | 'waiting' | 'accepted'>('form');
  const [departText, setDepartText] = useState('');
  const [destText, setDestText] = useState('');
  const [departSuggestions, setDepartSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [departCoords, setDepartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapView>(null);
  const departDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(false);
  const locFetchedRef = useRef(false);

  useEffect(() => {
    if (locFetchedRef.current) return;
    locFetchedRef.current = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setDepartCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const locateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Activez la localisation dans les paramètres de votre téléphone.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDepartCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      }, 500);
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible de vous localiser. Vérifiez que la GPS est activé.');
    }
  };

  const onMapPress = async (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDepartCoords({ lat: latitude, lng: longitude });
    await reverseGeocode(latitude, longitude);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const data = await api.proxy.reverseGeocode(lat, lng);
      if (data?.display_name) setDepartText(data.display_name);
    } catch {}
  };

  useEffect(() => {
    if (departCoords && destCoords) {
      setDistance(haversineKm(departCoords.lat, departCoords.lng, destCoords.lat, destCoords.lng));
    } else {
      setDistance(null);
    }
  }, [departCoords, destCoords]);

  const searchNominatim = (text: string, field: 'depart' | 'dest') => {
    const isDepart = field === 'depart';
    const setText = isDepart ? setDepartText : setDestText;
    const setSuggestions = isDepart ? setDepartSuggestions : setDestSuggestions;
    const timer = isDepart ? departDebounce : destDebounce;
    setText(text);
    if (isDepart) {
      setDepartCoords(null);
    } else {
      setDestCoords(null);
    }
    setDistance(null);
    if (timer.current) clearTimeout(timer.current);
    if (text.length < 3) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      if (!timer.current) return;
      try {
        const data = await api.proxy.searchAddress(text);
        setSuggestions(data || []);
      } catch { setSuggestions([]); }
    }, 400);
  };

  const selectDepart = (item: any) => {
    setDepartCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setDepartText(item.display_name);
    setDepartSuggestions([]);
  };

  const selectDest = (item: any) => {
    setDestCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setDestText(item.display_name);
    setDestSuggestions([]);
  };

  useEffect(() => {
    return () => {
      const s = getSocket();
      if (s) s.off('mission:accepted');
    };
  }, []);

  const confirmRequest = async () => {
    if (!departCoords || !destCoords) return;
    setLoading(true);
    try {
      setStep('sending');
      const mission = await api.missions.create({
        service_type: 'towing',
        location_lat: departCoords.lat,
        location_lng: departCoords.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        destination_address: destText,
        description: `Remorquage vers ${destText}`,
        location_address: departText,
      });
      setMissionId(mission.id);
      setStep('waiting');

      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      const socket = connectSocket(token);
      socket.emit('join:user', mission.user_id);

      if (listeningRef.current) socket.off('mission:accepted');
      listeningRef.current = true;
      socket.on('mission:accepted', async () => {
        if (!listeningRef.current) return;
        const updated = await api.missions.get(mission.id);
        setPro(updated);
        setStep('accepted');
      });
    } catch (e: any) {
      alert(e.message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const price = distance ? estimatePrice(distance) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Remorquage</Text>

        {step === 'form' && (
          <View>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: departCoords?.lat || 5.345,
                  longitude: departCoords?.lng || -4.015,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                onPress={onMapPress}
              >
                {departCoords && (
                  <Marker coordinate={{ latitude: departCoords.lat, longitude: departCoords.lng }} title="Départ" pinColor="#4A90D9" />
                )}
                {destCoords && (
                  <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lng }} title="Destination" pinColor="#FF3B30" />
                )}
              </MapView>
              <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
                <Text style={styles.locateBtnText}>📍 Me localiser</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.currentLocation}>
              <Text style={styles.pinIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>Départ</Text>
                <TextInput
                  style={styles.locInput}
                  placeholder="Adresse de départ"
                  placeholderTextColor={Colors.mediumGray}
                  value={departText}
                  onChangeText={(t) => searchNominatim(t, 'depart')}
                />
              </View>
            </View>
            {departSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {departSuggestions.map((item, i) => (
                  <TouchableOpacity key={item.place_id || item.display_name || String(i)} style={styles.suggestionItem} onPress={() => selectDepart(item)}>
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="Saisissez une adresse..."
              placeholderTextColor={Colors.mediumGray}
              value={destText}
              onChangeText={(t) => searchNominatim(t, 'dest')}
            />
            {destSuggestions.length > 0 && (
              <View style={styles.suggestions}>
                {destSuggestions.map((item, i) => (
                  <TouchableOpacity key={item.place_id || item.display_name || String(i)} style={styles.suggestionItem} onPress={() => selectDest(item)}>
                    <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {destCoords && distance !== null && (
              <View style={styles.estimationCard}>
                <View style={styles.estRow}>
                  <Text style={styles.estLabel}>📏 Distance</Text>
                  <Text style={styles.estValue}>{distance.toFixed(1)} km</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.estRow}>
                  <Text style={styles.estLabel}>💰 Prix estimé</Text>
                  <Text style={styles.priceValue}>{price?.toLocaleString()} FCFA</Text>
                </View>
                <Text style={styles.estNote}>Base 5 000 FCFA · 1 000 FCFA/km supplémentaire</Text>
              </View>
            )}

            <Button
              title="Confirmer la demande"
              onPress={confirmRequest}
              loading={loading}
              disabled={!destCoords || !departCoords}
            />
          </View>
        )}

        {step === 'sending' && (
          <View style={styles.centerWrap}>
            <View style={styles.pulseCircle}>
              <Text style={styles.icon}>🚛</Text>
            </View>
            <Text style={styles.statusTitle}>Envoi de la demande</Text>
            <Text style={styles.subtitle}>Recherche d'un remorqueur disponible...</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
          </View>
        )}

        {step === 'waiting' && (
          <View style={styles.centerWrap}>
            <View style={styles.pulseCircle}>
              <Text style={styles.icon}>🆘</Text>
            </View>
            <Text style={styles.statusTitle}>Demande envoyée</Text>
            <Text style={styles.subtitle}>En attente qu'un remorqueur accepte...</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
            <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }} />
          </View>
        )}

        {step === 'accepted' && (
          <View style={styles.centerWrap}>
            <View style={styles.etaCircle}>
              <Text style={styles.icon}>🛵</Text>
            </View>
            <Text style={styles.statusTitle}>Remorqueur en route</Text>
            <Card style={styles.trackingCard}>
              <View style={styles.trackingPro}>
                <View style={[styles.proAvatar, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.proAvatarText}>
                    {((pro?.pro_first_name?.[0] || '') + (pro?.pro_last_name?.[0] || '')) || '?'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.trackingName}>{pro?.pro_first_name || ''} {pro?.pro_last_name || ''}</Text>
                  <Text style={styles.trackingRating}>⭐ {pro?.pro_rating?.toFixed(1) || '?'}</Text>
                </View>
                <Text style={styles.trackingEta}>en route</Text>
              </View>
              <View style={styles.trackingBar}>
                <View style={styles.trackingProgress} />
              </View>
            </Card>
            <View style={styles.actionRow}>
              <Button title="📞 Appeler" onPress={() => {}} variant="secondary" style={{ flex: 1 }} />
              <Button title="Suivre" onPress={() => navigation.navigate('Tracking', { missionId })} variant="secondary" style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, flexGrow: 1 },
  title: { fontSize: FontSize.title, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md },
  mapWrap: { height: 180, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  map: { flex: 1 },
  currentLocation: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  pinIcon: { fontSize: 20, marginRight: Spacing.md },
  locLabel: { fontSize: FontSize.caption, color: Colors.mediumGray, fontWeight: '500' },
  locValue: { fontSize: FontSize.body, fontWeight: '600', color: Colors.black },
  locInput: { fontSize: FontSize.body, color: Colors.black, padding: 0, margin: 0 },
  inputLabel: { fontSize: FontSize.body, color: Colors.black, fontWeight: '600', marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.body, color: Colors.black,
  },
  suggestions: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    marginTop: 4, marginBottom: Spacing.md,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  suggestionText: { fontSize: FontSize.body, color: Colors.black },
  estimationCard: {
    backgroundColor: Colors.lightGray, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginVertical: Spacing.md,
  },
  estRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  estLabel: { fontSize: FontSize.body, color: Colors.mediumGray },
  estValue: { fontSize: FontSize.body, fontWeight: '600', color: Colors.black },
  priceValue: { fontSize: FontSize.subtitle, fontWeight: '700', color: Colors.black },
  estNote: { fontSize: FontSize.caption, color: Colors.mediumGray, marginTop: Spacing.xs },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#E5F0FF', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  icon: { fontSize: 44 },
  statusTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.black, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.body, color: Colors.mediumGray, textAlign: 'center' },
  searchingBar: { height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, marginVertical: Spacing.lg, overflow: 'hidden', width: '100%' },
  searchingProgress: { width: '40%', height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  etaCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E5F0FF', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  trackingCard: { marginBottom: Spacing.lg, padding: Spacing.lg, width: '100%' },
  trackingPro: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  proAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.black },
  trackingName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.black },
  trackingRating: { fontSize: FontSize.caption, color: Colors.mediumGray, marginTop: 1 },
  trackingEta: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.black, marginLeft: 'auto' },
  trackingBar: { height: 6, backgroundColor: Colors.lightGray, borderRadius: 3, overflow: 'hidden' },
  trackingProgress: { width: '60%', height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  locateBtn: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  locateBtnText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.black },
});
