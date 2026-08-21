import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Dimensions, Linking } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const LOCATION_TASK_NAME = 'background-location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) return;
  if (data?.locations) {
    const location = data.locations[data.locations.length - 1];
    const token = await SecureStore.getItemAsync('auth_token');
    const missionId = await SecureStore.getItemAsync('tracking_mission_id');
    if (!token || !missionId || !location) return;
    try {
      await fetch(`https://mecanova.onrender.com/api/missions/${missionId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: location.coords.latitude, lng: location.coords.longitude }),
      });
    } catch {}
  }
});

const ARRIVAL_THRESHOLD = 100;
const steps = ['Démarrer', 'Arrivé', 'Dépannage', 'Terminé'];
const STATUS_MAP = ['en_route', 'arrived', 'completed'];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ProMissionScreen({ route, navigation }: any) {
  const missionId = route?.params?.missionId;
  const [statusIdx, setStatusIdx] = useState(0);
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientLoc, setClientLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [proLoc, setProLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [followMode, setFollowMode] = useState(true);
  const mapRef = useRef<MapView>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const routeFetchRef = useRef(false);
  const followRef = useRef(true);

  useEffect(() => {
    if (!missionId) { setLoading(false); return; }
    (async () => {
      try {
        const data = await api.missions.get(missionId);
        setMission(data);
        if (data.status === 'en_route') { setStatusIdx(1); statusIdxRef.current = 1; }
        else if (data.status === 'arrived' || data.status === 'in_progress') { setStatusIdx(2); statusIdxRef.current = 2; }
        else if (data.status === 'completed') { setStatusIdx(3); statusIdxRef.current = 3; }
        if (data.location_lat && data.location_lng) {
          const loc = { lat: parseFloat(data.location_lat), lng: parseFloat(data.location_lng) };
          setClientLoc(loc);
          clientLocRef.current = loc;
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [missionId]);

  const proLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const clientLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeCoordsRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const statusIdxRef = useRef(0);
  const arrivalTriggeredRef = useRef(false);
  const socketRef = useRef<any>(null);

  const recenterMap = useCallback(() => {
    const route = routeCoordsRef.current;
    const pro = proLocRef.current;
    const client = clientLocRef.current;
    if (!pro || !client) return;
    if (route.length > 1) {
      mapRef.current?.fitToCoordinates(route, {
        edgePadding: { top: 40, right: 20, bottom: 50, left: 20 },
        animated: true,
      });
    } else {
      const midLat = (pro.lat + client.lat) / 2;
      const midLng = (pro.lng + client.lng) / 2;
      const latD = Math.max(Math.abs(pro.lat - client.lat) * 1.3, 0.005);
      const lngD = Math.max(Math.abs(pro.lng - client.lng) * 1.3, 0.005);
      mapRef.current?.animateToRegion({
        latitude: midLat, longitude: midLng,
        latitudeDelta: latD, longitudeDelta: lngD,
      }, 800);
    }
  }, []);

  useEffect(() => { statusIdxRef.current = statusIdx; }, [statusIdx]);

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;

    (async () => {
      await SecureStore.setItemAsync('tracking_mission_id', missionId);
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;

      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') return;

      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: 'Mecanova',
            notificationBody: 'Partage de position actif',
            notificationColor: '#FFD100',
          },
        });
      }

      const s = connectSocket(token);
      socketRef.current = s;
      s.emit('join:mission', missionId);
      s.on('tracking:update', (data: { lat: number; lng: number }) => {
        if (!cancelled) {
          setClientLoc({ lat: data.lat, lng: data.lng });
          clientLocRef.current = { lat: data.lat, lng: data.lng };
        }
      });
      s.on('mission:status', (data: any) => {
        if (!cancelled) {
          setMission((prev: any) => prev ? { ...prev, ...data } : data);
          if (data.status === 'en_route') { setStatusIdx(1); statusIdxRef.current = 1; }
          else if (data.status === 'arrived' || data.status === 'in_progress') { setStatusIdx(2); statusIdxRef.current = 2; }
          else if (data.status === 'completed') { setStatusIdx(3); statusIdxRef.current = 3; }
        }
      });

      let lastEmit = 0;
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          if (cancelled) return;
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setProLoc({ lat, lng });
          proLocRef.current = { lat, lng };
          if (loc.coords.heading != null) setHeading(loc.coords.heading);

          if (followRef.current) recenterMap();

          if (statusIdxRef.current === 1 && clientLocRef.current && !arrivalTriggeredRef.current) {
            const dist = haversineDistance(lat, lng, clientLocRef.current.lat, clientLocRef.current.lng);
            if (dist < ARRIVAL_THRESHOLD) {
              arrivalTriggeredRef.current = true;
              api.missions.arrive(missionId, lat, lng).catch(() => {
                api.missions.updateStatus(missionId, 'arrived').catch(() => {});
              });
            }
          }

          const now = Date.now();
          if (now - lastEmit >= 3000) {
            lastEmit = now;
            s.emit('tracking:location', { missionId, lat, lng });
          }
        }
      );

      const loc = await Location.getCurrentPositionAsync({});
      if (!cancelled) {
        setProLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        proLocRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        if (loc.coords.heading != null) setHeading(loc.coords.heading);
      }
    })();

    return () => {
      cancelled = true;
      if (locationWatcher.current) locationWatcher.current.remove();
      if (socketRef.current) { socketRef.current.off('tracking:update'); socketRef.current.off('mission:status'); }
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
      SecureStore.deleteItemAsync('tracking_mission_id');
    };
  }, [missionId]);

  const fetchRoute = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    try {
      const data = await api.proxy.route(from.lng, from.lat, to.lng, to.lat);
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        const coords = data.routes[0].geometry.coordinates.map(
          (c: number[]) => ({ latitude: c[1], longitude: c[0] })
        );
        setRouteCoords(coords);
        routeCoordsRef.current = coords;
        return coords;
      }
    } catch {}
    return null;
  };

  const updateStatus = async () => {
    if (statusIdx >= STATUS_MAP.length) return;
    try {
      await api.missions.updateStatus(missionId, STATUS_MAP[statusIdx]);
      setStatusIdx(statusIdx + 1);
      if (statusIdx === 0 && proLoc && clientLoc && !routeFetchRef.current) {
        routeFetchRef.current = true;
        const coords = await fetchRoute(proLoc, clientLoc);
        setFollowMode(true);
        followRef.current = true;
        if (coords && coords.length > 1) {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 40, right: 20, bottom: 50, left: 20 },
            animated: true,
          });
        } else {
          recenterMap();
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const locateClient = () => {
    setFollowMode(false);
    followRef.current = false;
    if (clientLoc) {
      mapRef.current?.animateToRegion({
        latitude: clientLoc.lat, longitude: clientLoc.lng,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  };

  const toggleFollow = () => {
    const next = !followRef.current;
    setFollowMode(next);
    followRef.current = next;
    if (next && proLoc && clientLoc) {
      recenterMap();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!missionId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="clipboard-outline" size={48} color={Colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Aucune mission active</Text>
          <Text style={styles.emptySub}>En attente de nouvelle mission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const clientInitials = mission
    ? `${(mission.user_first_name || '')[0]}${(mission.user_last_name || '')[0]}`.trim() || '?'
    : '?';

  const mapRegion = clientLoc ? {
    latitude: clientLoc.lat,
    longitude: clientLoc.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  const mapContent = (
    <View style={mapFullscreen ? styles.fullMapWrap : styles.cardMapWrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        showsUserLocation={false}
        showsCompass
        rotateEnabled
        onPanDrag={() => {
          setFollowMode(false);
          followRef.current = false;
        }}
      >
        {clientLoc && (
          <Marker
            coordinate={{ latitude: clientLoc.lat, longitude: clientLoc.lng }}
            title="Client"
            description={mission?.location_address || 'Position du client'}
          >
            <View style={styles.clientMarker}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
          </Marker>
        )}
        {proLoc && (
          <Marker
            coordinate={{ latitude: proLoc.lat, longitude: proLoc.lng }}
            rotation={heading}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={[styles.arrowWrap, { transform: [{ rotate: `${heading}deg` }] }]}>
              <Ionicons name="navigate" size={28} color={Colors.primaryContainer} />
            </View>
          </Marker>
        )}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.secondary}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>
      {mapFullscreen && (
        <TouchableOpacity style={styles.fullCloseBtn} onPress={() => setMapFullscreen(false)}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={styles.mapOverlay} pointerEvents="box-none">
        <TouchableOpacity style={[styles.locateBtn, followMode && styles.locateBtnActive]} onPress={toggleFollow}>
          <Ionicons name="locate" size={16} color={followMode ? Colors.primary : Colors.onSurface} />
          <Text style={[styles.locateBtnText, followMode && { color: Colors.primary }]}>Suivre</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locateBtn} onPress={locateClient}>
          <Ionicons name="navigate" size={16} color={Colors.error} />
          <Text style={styles.locateBtnText}>Client</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locateBtn} onPress={() => setMapFullscreen(!mapFullscreen)}>
          <Ionicons name={mapFullscreen ? 'contract' : 'expand'} size={16} color={Colors.onSurface} />
          <Text style={styles.locateBtnText}>{mapFullscreen ? 'Réduire' : 'Plein écran'}</Text>
        </TouchableOpacity>
      </View>
      {!mapFullscreen && routeCoords.length > 1 && (
        <View style={styles.routeBadge} pointerEvents="none">
          <Ionicons name="flag" size={14} color={Colors.primary} />
          <Text style={styles.routeBadgeText}>Itinéraire chargé</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {mapFullscreen ? (
        <View style={styles.fullContainer}>{mapContent}</View>
      ) : (
        <>
          <View style={styles.scrollContent}>
            <Text style={styles.title}>Mission en cours</Text>
            <Card style={styles.mapCard}>{mapContent}</Card>

            {statusIdx >= 2 && (
              <View style={styles.arrivalBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.arrivalBannerText}>Vous êtes arrivé !</Text>
              </View>
            )}

            <Card style={styles.clientCard}>
              <View style={styles.clientRow}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>{clientInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>
                    {[mission?.user_first_name, mission?.user_last_name].filter(Boolean).join(' ') || 'Client'}
                  </Text>
                  <Text style={styles.clientPhone}>{mission?.user_phone || ''}</Text>
                </View>
                {mission?.user_phone && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${mission.user_phone}`).catch(() => {})}>
                    <Ionicons name="call" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.clientDetailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.clientDetailLabel}>Adresse</Text>
                <Text style={styles.clientDetailValue}>{mission?.location_address || mission?.address || mission?.location || 'N/A'}</Text>
              </View>
              {mission?.destination_address && (
                <View style={styles.clientDetailRow}>
                  <Ionicons name="flag-outline" size={16} color={Colors.onSurfaceVariant} />
                  <Text style={styles.clientDetailLabel}>Destination</Text>
                  <Text style={styles.clientDetailValue}>{mission.destination_address}</Text>
                </View>
              )}
              <View style={styles.clientDetailRow}>
                <Ionicons name="build-outline" size={16} color={Colors.onSurfaceVariant} />
                <Text style={styles.clientDetailLabel}>Problème</Text>
                <Text style={styles.clientDetailValue}>{mission?.description || 'N/A'}</Text>
              </View>
            </Card>

            <View style={styles.statusFlow}>
              {steps.map((s, i) => (
                <View key={s || String(i)} style={styles.statusRow}>
                  <View style={[styles.statusDot, i <= statusIdx && styles.statusDotActive]}>
                    {i < statusIdx ? <Ionicons name="checkmark" size={12} color={Colors.onPrimary} /> : null}
                  </View>
                  <View style={styles.statusContent}>
                    <Text style={[styles.statusLabel, i <= statusIdx && styles.statusLabelActive]}>{s}</Text>
                    {i === 0 && statusIdx === 0 && <Text style={styles.statusTime}>En attente</Text>}
                    {i === 1 && statusIdx === 1 && <Text style={styles.statusTime}>À l'instant</Text>}
                    {i === 2 && statusIdx === 2 && <Text style={styles.statusTime}>En cours</Text>}
                    {i === 3 && statusIdx === 3 && <Text style={styles.statusTime}>Terminé</Text>}
                  </View>
                  {i < steps.length - 1 && <View style={[styles.statusConnector, i < statusIdx && styles.statusConnectorActive]} />}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            {statusIdx < 3 && (
              <Button
                title={
                  statusIdx === 0 ? "Démarrer" :
                  statusIdx === 1 ? "Arrivé sur place" :
                  "Terminer l'intervention"
                }
                onPress={updateStatus}
              />
            )}
            {statusIdx === 3 && (
              <View>
                <Text style={styles.amountLabel}>Mission terminée</Text>
                <Button title="Retour à l'accueil" onPress={() => navigation.goBack()} />
              </View>
            )}
            <Button title="Appeler le client" variant="secondary" onPress={() => { if (mission?.user_phone) Linking.openURL(`tel:${mission.user_phone}`).catch(() => {}); }} style={{ marginTop: Spacing.sm }} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullContainer: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flex: 1, padding: Spacing.md },
  title: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: Spacing.md },
  mapCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md, height: 260, padding: 0, position: 'relative' },
  cardMapWrap: { flex: 1, position: 'relative' },
  fullMapWrap: { flex: 1, position: 'relative', backgroundColor: '#000' },
  mapOverlay: { position: 'absolute', top: 8, right: 8, gap: 6, zIndex: 10 },
  locateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceContainerLowest, paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  locateBtnActive: {
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  locateBtnText: { ...Typography.caption, fontWeight: '600' as any, color: Colors.onSurface },
  fullCloseBtn: {
    position: 'absolute', top: 12, left: 12, zIndex: 10,
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  routeBadge: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceContainerLowest, paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  routeBadgeText: { ...Typography.caption, fontWeight: '600' as any, color: Colors.primary },
  clientMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.error,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  arrowWrap: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  clientCard: { padding: Spacing.md, marginBottom: Spacing.md },
  clientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  clientAvatar: { width: 48, height: 48, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  clientAvatarText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  clientName: { ...Typography.bodyBase, fontWeight: '600' as any, color: Colors.onSurface },
  clientPhone: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  callBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.outlineVariant, marginBottom: Spacing.md },
  clientDetailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  clientDetailLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, minWidth: 80 },
  clientDetailValue: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface, flex: 1 },
  statusFlow: { marginBottom: Spacing.md },
  statusRow: { position: 'relative', paddingLeft: 28, minHeight: 44 },
  statusDot: {
    position: 'absolute', left: 0, top: 4,
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2.5, borderColor: Colors.outlineVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  statusDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  statusContent: { paddingBottom: Spacing.sm },
  statusLabel: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurfaceVariant },
  statusLabelActive: { color: Colors.onSurface },
  statusTime: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: Spacing.sm },
  emptySub: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  statusConnector: {
    position: 'absolute', left: 9, top: 24,
    width: 2, height: 24, backgroundColor: Colors.outlineVariant,
  },
  statusConnectorActive: { backgroundColor: Colors.primary },
  arrivalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.md,
  },
  arrivalBannerText: { color: '#fff', fontWeight: '700' as any, ...Typography.bodyBase },
  actions: { padding: Spacing.md, paddingTop: 0 },
  amountLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.xs },
});
