import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, Vibration } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { connectSocket, disconnectSocket } from '../services/socket';
import { api } from '../services/api';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', accepted: 'Acceptée', en_route: 'En route',
  arrived: 'Arrivé', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
};
const STATUS_COLORS: Record<string, string> = {
  pending: Colors.primaryContainer, accepted: Colors.secondary, en_route: Colors.secondary,
  arrived: Colors.success, in_progress: Colors.secondary, completed: Colors.success, cancelled: Colors.error,
};
const TYPE_ICONS: Record<string, string> = {
  emergency: 'warning', mechanic: 'build', tow_truck: 'car', garage: 'business',
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export default function TrackingScreen({ navigation, route }: any) {
  const paramMissionId = route?.params?.missionId;
  const [activeMission, setActiveMission] = useState<any>(null);
  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [followMode, setFollowMode] = useState(true);
  const [arrivalNotified, setArrivalNotified] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const followRef = useRef(true);
  const mapRef = useRef<MapView>(null);

  const recenterPro = () => {
    if (!proLocation) return;
    const mission = activeMission;
    const hasDeparture = mission?.location_lat && mission?.location_lng;
    if (hasDeparture) {
      mapRef.current?.fitToCoordinates([
        { latitude: mission.location_lat, longitude: mission.location_lng },
        { latitude: proLocation.lat, longitude: proLocation.lng },
      ], { edgePadding: { top: 40, right: 20, bottom: 50, left: 20 }, animated: true });
    } else {
      mapRef.current?.animateToRegion({
        latitude: proLocation.lat, longitude: proLocation.lng,
        latitudeDelta: 0.005, longitudeDelta: 0.005,
      }, 500);
    }
  };

  const fetchHistory = useCallback(async () => {
    try { const missions = await api.users.missions(); setHistory(missions); } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  useEffect(() => {
    let socket: any = null;
    (async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) socket = connectSocket(token);

      if (paramMissionId) {
        try {
          const mission = await api.missions.get(paramMissionId);
          setActiveMission(mission);
          if (socket) {
            socket.emit('join:mission', paramMissionId);
            socket.on('tracking:update', (data: { lat: number; lng: number }) => {
              setProLocation(data);
              if (followRef.current) {
                const hasDeparture = mission?.location_lat && mission?.location_lng;
                if (hasDeparture) {
                  mapRef.current?.fitToCoordinates([
                    { latitude: mission.location_lat, longitude: mission.location_lng },
                    { latitude: data.lat, longitude: data.lng },
                  ], { edgePadding: { top: 40, right: 20, bottom: 50, left: 20 }, animated: true });
                } else {
                  mapRef.current?.animateToRegion({
                    latitude: data.lat, longitude: data.lng,
                    latitudeDelta: 0.005, longitudeDelta: 0.005,
                  }, 1000);
                }
              }
            });
            socket.on('mission:status', (data: any) => { setActiveMission((prev: any) => prev ? { ...prev, ...data } : data); });
            socket.on('arrival:detected', () => { setArrivalNotified(true); Vibration.vibrate(500); });
          }
        } catch {}
        setLoading(false);
        return;
      }

      try {
        const missions = await api.users.missions();
        const active = missions.find((m: any) => ['accepted', 'en_route', 'arrived', 'in_progress'].includes(m.status));
        if (active) {
          setActiveMission(active);
          if (socket) {
            socket.emit('join:mission', active.id);
            socket.on('tracking:update', (data: { lat: number; lng: number }) => {
              setProLocation(data);
              if (followRef.current) recenterPro();
            });
            socket.on('mission:status', (data: any) => { setActiveMission((prev: any) => prev ? { ...prev, ...data } : data); });
            socket.on('arrival:detected', () => { setArrivalNotified(true); Vibration.vibrate(500); });
          }
        } else {
          setHistory(missions);
        }
      } catch {}
      setLoading(false);
    })();
    return () => {
      if (socket) { socket.off('tracking:update'); socket.off('mission:status'); socket.off('arrival:detected'); }
    };
  }, []);

  if (activeMission?.id) {
    const proName = activeMission?.pro_first_name ? `${activeMission.pro_first_name} ${activeMission.pro_last_name}` : 'Professionnel';
    const proRating = activeMission?.pro_rating ? activeMission.pro_rating.toFixed(1) : '?';
    const proType = activeMission?.service_type || 'Mécanicien';
    const hasDeparture = activeMission?.location_lat && activeMission?.location_lng;
    const hasDestinationCoords = activeMission?.destination_lat && activeMission?.destination_lng;

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: activeMission?.location_lat || 5.345,
            longitude: activeMission?.location_lng || -4.015,
            latitudeDelta: 0.015, longitudeDelta: 0.015,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          onPanDrag={() => { setFollowMode(false); followRef.current = false; }}
        >
          {hasDeparture && <Marker coordinate={{ latitude: activeMission.location_lat, longitude: activeMission.location_lng }} title="Départ" pinColor={Colors.secondary} />}
          {hasDestinationCoords && <Marker coordinate={{ latitude: activeMission.destination_lat, longitude: activeMission.destination_lng }} title="Destination" pinColor={Colors.error} />}
          {proLocation && <Marker coordinate={{ latitude: proLocation.lat, longitude: proLocation.lng }} title={proName} pinColor={Colors.primary} />}
        </MapView>

        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity style={[styles.iconBtn, followMode && styles.iconBtnActive]} onPress={() => {
                const next = !followRef.current;
                setFollowMode(next);
                followRef.current = next;
                if (next) recenterPro();
              }} activeOpacity={0.7}>
                <Ionicons name="locate" size={22} color={followMode ? Colors.primary : Colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowInfo(!showInfo)} activeOpacity={0.7}>
                <Ionicons name={showInfo ? 'information-circle' : 'information-circle-outline'} size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>

          {(activeMission?.status === 'arrived' || arrivalNotified) && (
            <View style={styles.arrivalBanner}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={styles.arrivalBannerText}>Le professionnel est arrivé !</Text>
            </View>
          )}

          {showInfo && (
            <View style={styles.infoCard}>
              <View style={styles.proRow}>
                <View style={styles.proAvatar}>
                  <Text style={styles.proAvatarText}>{proName.split(' ').map((n: string) => n[0]).join('') || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proName}>{proName}</Text>
                  <Text style={styles.proSub}>
                    <Ionicons name="star" size={12} color={Colors.primaryContainer} /> {proRating} · {proType}
                  </Text>
                </View>
                <Text style={styles.eta}>{activeMission?.eta || '8 min'}</Text>
              </View>
              <View style={styles.trackingBar}>
                <View style={[styles.trackingProgress, { width: activeMission?.progress || '60%' }]} />
              </View>
              {activeMission?.destination_address && (
                <Text style={styles.destinationText}>
                  <Ionicons name="flag" size={12} color={Colors.onSurfaceVariant} /> {activeMission.destination_address}
                </Text>
              )}
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { if (activeMission?.pro_phone) Linking.openURL(`tel:${activeMission.pro_phone}`).catch(() => {}); }} activeOpacity={0.7}>
              <Ionicons name="call" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>Appeler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => {}} activeOpacity={0.7}>
              <Ionicons name="chatbubble" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error }]} activeOpacity={0.7}>
              <Ionicons name="alert-circle" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>SOS</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.historyContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activité</Text>
        <Text style={styles.headerSub}>Vos missions récentes</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={48} color={Colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Aucune mission</Text>
          <Text style={styles.emptySub}>Vous n'avez pas encore de mission{'\n'}Utilisez l'accueil pour en créer une</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {history.map((m: any, i: number) => (
            <TouchableOpacity
              key={m.id || i}
              style={styles.missionCard}
              onPress={() => {
                if (['accepted', 'en_route', 'arrived', 'in_progress'].includes(m.status)) {
                  navigation.replace('Tracking', { missionId: m.id });
                }
              }}
              activeOpacity={m.status === 'completed' || m.status === 'cancelled' ? 1 : 0.7}
            >
              <View style={styles.missionLeft}>
                <Ionicons name={(TYPE_ICONS[m.service_type] || 'build') as any} size={22} color={Colors.primary} />
              </View>
              <View style={styles.missionInfo}>
                <Text style={styles.missionType}>
                  {m.service_type === 'emergency' ? 'SOS Urgence'
                    : m.service_type === 'mechanic' ? 'Mécanicien'
                    : m.service_type === 'tow_truck' ? 'Remorquage'
                    : m.service_type || 'Mission'}
                </Text>
                {m.pro_first_name && (
                  <Text style={styles.missionPro}>{m.pro_first_name} {m.pro_last_name}</Text>
                )}
                <Text style={styles.missionDate}>{formatDate(m.created_at)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[m.status] || Colors.outline) + '25' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[m.status] || Colors.outline }]}>
                  {STATUS_LABELS[m.status] || m.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.safeMargin, paddingTop: Spacing.sm,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Glass.background,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.sm,
  },
  iconBtnActive: { borderWidth: 2, borderColor: Colors.primary },
  infoCard: {
    backgroundColor: Glass.background,
    marginHorizontal: Spacing.safeMargin, marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    ...Shadow.md,
  },
  proRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  proAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  proAvatarText: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  proName: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onSurface },
  proSub: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  eta: { ...Typography.titleMd, color: Colors.onSurface },
  trackingBar: { height: 6, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  trackingProgress: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 3 },
  destinationText: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
  actionRow: {
    position: 'absolute', bottom: 40, left: Spacing.safeMargin, right: Spacing.safeMargin,
    flexDirection: 'row', gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.inverseSurface,
    paddingVertical: 14, borderRadius: BorderRadius.xl,
  },
  actionBtnText: { color: Colors.white, fontWeight: '700' as any, ...Typography.bodySm },
  historyContainer: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.safeMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { ...Typography.headlineLg, color: Colors.onSurface },
  headerSub: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Typography.subheadSm, color: Colors.onSurface, marginBottom: Spacing.sm, textAlign: 'center' },
  emptySub: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  list: { padding: Spacing.safeMargin, paddingTop: Spacing.sm, paddingBottom: 100 },
  missionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  missionLeft: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryContainer + '20',
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  missionInfo: { flex: 1 },
  missionType: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onSurface },
  missionPro: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  missionDate: { ...Typography.caption, color: Colors.outline, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { ...Typography.caption, fontWeight: '700' as any },
  arrivalBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.success, paddingVertical: 10, paddingHorizontal: 16,
    marginHorizontal: Spacing.safeMargin, marginTop: Spacing.sm, borderRadius: BorderRadius.md,
  },
  arrivalBannerText: { color: Colors.white, fontWeight: '700' as any, ...Typography.bodySm },
});
