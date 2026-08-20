import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export default function SOSPanicScreen({ navigation }: any) {
  const [step, setStep] = useState<'form' | 'sending' | 'waiting' | 'accepted'>('form');
  const [addressText, setAddressText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [pro, setPro] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locFetchedRef = useRef(false);
  const listeningRef = useRef(false);

  useEffect(() => {
    return () => {
      listeningRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (locFetchedRef.current) return;
    locFetchedRef.current = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
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
      if (!debounceRef.current) return;
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

  const sendSOS = async () => {
    if (!location) return;
    setStep('sending');
    try {
      const mission = await api.missions.create({
        service_type: 'emergency',
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: addressText || undefined,
        is_urgent: true,
        description: 'SOS urgence',
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
      Alert.alert('Erreur', e.message || 'Impossible d\'envoyer le signal SOS');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {step === 'form' && (
          <View>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: location?.lat || 5.345,
                  longitude: location?.lng || -4.015,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                onPress={onMapPress}
              >
                {location && (
                  <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} title="Ma position" pinColor="#FF3B30" />
                )}
              </MapView>
              <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
                <Text style={styles.locateBtnText}>📍 Me localiser</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Où êtes-vous ?</Text>
            <TextInput
              style={styles.input}
              placeholder="Adresse ou lieu"
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

            <Button title="🚨 Envoyer SOS" onPress={sendSOS} disabled={!location} style={{ marginTop: Spacing.md }} />
          </View>
        )}

        {step === 'sending' && (
          <View style={styles.centerWrap}>
            <View style={styles.pulseCircle}>
              <Text style={styles.sosIcon}>🚨</Text>
            </View>
            <Text style={styles.title}>Envoi du signal SOS</Text>
            <Text style={styles.subtitle}>Recherche du professionnel le plus proche...</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
            <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }} />
          </View>
        )}

        {step === 'waiting' && (
          <View style={styles.centerWrap}>
            <View style={styles.pulseCircle}>
              <Text style={styles.sosIcon}>🆘</Text>
            </View>
            <Text style={styles.title}>Signal SOS envoyé</Text>
            <Text style={styles.subtitle}>En attente qu'un professionnel accepte...</Text>
            <View style={styles.searchingBar}>
              <View style={styles.searchingProgress} />
            </View>
            <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl }} />
          </View>
        )}

        {step === 'accepted' && (
          <View style={styles.centerWrap}>
            <View style={styles.etaCircle}>
              <Text style={styles.etaIcon}>🛵</Text>
            </View>
            <Text style={styles.title}>Professionnel en route</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, padding: Spacing.xl },
  centerWrap: { flex: 1, justifyContent: 'center' },
  pulseCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFE8E5', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  sosIcon: { fontSize: 44 },
  title: { fontSize: FontSize.title, fontWeight: '800', color: Colors.black, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.body, color: Colors.mediumGray, textAlign: 'center' },
  searchingBar: { height: 4, backgroundColor: Colors.lightGray, borderRadius: 2, marginVertical: Spacing.lg, overflow: 'hidden' },
  searchingProgress: { width: '40%', height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  etaCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF5E0', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  etaIcon: { fontSize: 36 },
  trackingCard: { marginBottom: Spacing.lg, padding: Spacing.lg },
  trackingPro: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  proAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { fontSize: 14, fontWeight: '700', color: Colors.black },
  trackingName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.black },
  trackingRating: { fontSize: FontSize.caption, color: Colors.mediumGray, marginTop: 1 },
  trackingEta: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.black, marginLeft: 'auto' },
  trackingBar: { height: 6, backgroundColor: Colors.lightGray, borderRadius: 3, overflow: 'hidden' },
  trackingProgress: { width: '60%', height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
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
