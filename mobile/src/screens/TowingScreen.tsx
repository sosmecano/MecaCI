import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Remorquage</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                  <Marker coordinate={{ latitude: departCoords.lat, longitude: departCoords.lng }} title="Départ" pinColor={Colors.secondary} />
                )}
                {destCoords && (
                  <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lng }} title="Destination" pinColor={Colors.error} />
                )}
              </MapView>
              <TouchableOpacity style={styles.locateBtn} onPress={locateMe} activeOpacity={0.7}>
                <Ionicons name="locate" size={18} color={Colors.primary} />
                <Text style={styles.locateBtnText}>Me localiser</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.currentLocation}>
              <Ionicons name="location" size={20} color={Colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>Départ</Text>
                <TextInput
                  style={styles.locInput}
                  placeholder="Adresse de départ"
                  placeholderTextColor={Colors.onSurfaceVariant}
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
              placeholderTextColor={Colors.onSurfaceVariant}
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
              <Card style={styles.estimationCard}>
                <View style={styles.estRow}>
                  <Ionicons name="resize" size={18} color={Colors.onSurfaceVariant} />
                  <Text style={styles.estLabel}>Distance</Text>
                  <Text style={styles.estValue}>{distance.toFixed(1)} km</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.estRow}>
                  <Ionicons name="wallet" size={18} color={Colors.primary} />
                  <Text style={styles.estLabel}>Prix estimé</Text>
                  <Text style={styles.priceValue}>{price?.toLocaleString()} FCFA</Text>
                </View>
                <Text style={styles.estNote}>Base 5 000 FCFA · 1 000 FCFA/km supplémentaire</Text>
              </Card>
            )}

            <Button
              title="Confirmer la demande"
              onPress={confirmRequest}
              loading={loading}
              disabled={!destCoords || !departCoords}
            />

            <TouchableOpacity
              style={styles.seeTrucksBtn}
              onPress={() => navigation.navigate('TowTrucks')}
              activeOpacity={0.7}
            >
              <Ionicons name="car" size={18} color={Colors.primary} />
              <Text style={styles.seeTrucksText}>Voir les remorqueurs disponibles</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {step === 'sending' && (
          <View style={styles.centerWrap}>
            <View style={[styles.pulseCircle, { backgroundColor: Colors.secondaryContainer + '30' }]}>
              <Ionicons name="car" size={40} color={Colors.secondary} />
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
            <View style={[styles.pulseCircle, { backgroundColor: Colors.secondaryContainer + '30' }]}>
              <Ionicons name="hourglass" size={40} color={Colors.secondary} />
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
            <View style={[styles.etaCircle, { backgroundColor: Colors.secondaryContainer + '30' }]}>
              <Ionicons name="car" size={36} color={Colors.secondary} />
            </View>
            <Text style={styles.statusTitle}>Remorqueur en route</Text>
            <Card style={styles.trackingCard}>
              <View style={styles.trackingPro}>
                <View style={styles.proAvatar}>
                  <Text style={styles.proAvatarText}>
                    {((pro?.pro_first_name?.[0] || '') + (pro?.pro_last_name?.[0] || '')) || '?'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.trackingName}>{pro?.pro_first_name || ''} {pro?.pro_last_name || ''}</Text>
                  <Text style={styles.trackingRating}>
                    <Ionicons name="star" size={12} color={Colors.primaryContainer} /> {pro?.pro_rating?.toFixed(1) || '?'}
                  </Text>
                </View>
                <Text style={styles.trackingEta}>en route</Text>
              </View>
              <View style={styles.trackingBar}>
                <View style={styles.trackingProgress} />
              </View>
            </Card>
            <View style={styles.actionRow}>
              <Button title="Appeler" onPress={() => {}} variant="secondary" style={{ flex: 1 }} />
              <Button title="Suivre" onPress={() => navigation.navigate('Tracking', { missionId })} variant="secondary" style={{ flex: 1 }} />
            </View>
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
  mapWrap: { height: 180, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  map: { flex: 1 },
  currentLocation: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  locLabel: { ...Typography.caption, color: Colors.onSurfaceVariant, fontWeight: '500' as any },
  locInput: { ...Typography.bodyBase, color: Colors.onSurface, padding: 0, margin: 0 },
  inputLabel: { ...Typography.bodyBase, color: Colors.onSurface, fontWeight: '600' as any, marginBottom: Spacing.sm },
  input: {
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    padding: Spacing.xs, ...Typography.bodyBase, color: Colors.onSurface, minHeight: 48,
  },
  suggestions: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginTop: 4, marginBottom: Spacing.md,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerHigh,
  },
  suggestionText: { ...Typography.bodySm, color: Colors.onSurface },
  estimationCard: { marginVertical: Spacing.md },
  estRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs, gap: Spacing.sm },
  estLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  estValue: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  priceValue: { ...Typography.subheadSm, fontWeight: '700' as any, color: Colors.onSurface },
  estNote: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: Spacing.xs },
  divider: { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginVertical: Spacing.xs },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  statusTitle: { ...Typography.titleMd, color: Colors.onSurface, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  searchingBar: { height: 4, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 2, marginVertical: Spacing.lg, overflow: 'hidden', width: '100%' },
  searchingProgress: { width: '40%', height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 2 },
  etaCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  trackingCard: { marginBottom: Spacing.lg, padding: Spacing.lg, width: '100%' },
  trackingPro: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  proAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  trackingName: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onSurface },
  trackingRating: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  trackingEta: { ...Typography.subheadSm, color: Colors.onSurface, marginLeft: 'auto' },
  trackingBar: { height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  trackingProgress: { width: '60%', height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  locateBtn: {
    position: 'absolute', bottom: Spacing.sm, right: Spacing.sm,
    backgroundColor: Glass.background, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.xs, ...Shadow.sm,
  },
  locateBtnText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  seeTrucksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  seeTrucksText: {
    ...Typography.bodySm,
    fontWeight: '600' as any,
    color: Colors.primary,
  },
});
