import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Switch,
  TouchableOpacity, ActivityIndicator, Vibration, Animated, Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { connectSocket, disconnectSocket, onReconnect } from '../services/socket';
import { api } from '../services/api';
import { playRing, stopRing } from '../../modules/sound-player/src/index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProHomeScreen({ navigation }: any) {
  const [available, setAvailable] = useState(true);
  const [missions, setMissions] = useState<any[]>([]);
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [incoming, setIncoming] = useState<any>(null);
  const [incomingDistance, setIncomingDistance] = useState<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const knownIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<any>(null);

  const fetchedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      try {
        const nearby = await api.professionals.nearbyMissions();
        nearby.forEach((m: any) => {
          if (!knownIdsRef.current.has(m.id)) {
            knownIdsRef.current.add(m.id);
            showIncoming(m);
          }
        });
      } catch {}
    }, 15000);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function showIncoming(mission: any) {
    setIncoming(mission);
    setIncomingDistance(0);
    setMissions((prev) => {
      if (prev.find((m) => m.id === mission.id)) return prev;
      return [mission, ...prev];
    });
    Vibration.vibrate([0, 400, 200, 400, 200, 400], true);
    playRing();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const [proData, missionsData] = await Promise.all([
          api.professionals.me(),
          api.professionals.missions('pending'),
        ]);
        setPro(proData);
        setAvailable(proData.is_available === true || proData.is_available === 'true');
        setMissions(missionsData);
        missionsData.forEach((m: any) => knownIdsRef.current.add(m.id));

        const token = await SecureStore.getItemAsync('auth_token');
        if (token && proData?.id) {
          const s = connectSocket(token);
          socketRef.current = s;
          s.emit('join:pro', proData.id);
          s.on('new:mission', (data: any) => {
            stopPolling();
            const mission = data.mission || data;
            if (!knownIdsRef.current.has(mission.id)) {
              knownIdsRef.current.add(mission.id);
              showIncoming(mission);
            }
          });
          s.on('disconnect', () => startPolling());
          if (!s.connected) startPolling();
        }
      } catch (e: any) {
        startPolling();
      } finally {
        setLoading(false);
      }
    })();

    const unsubReconnect = onReconnect(async () => {
      stopPolling();
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && pro?.id) {
        const s = connectSocket(token);
        socketRef.current = s;
        s.emit('join:pro', pro.id);
        s.on('new:mission', (data: any) => {
          const mission = data.mission || data;
          if (!knownIdsRef.current.has(mission.id)) {
            knownIdsRef.current.add(mission.id);
            showIncoming(mission);
          }
        });
      }
    });

    return () => {
      Vibration.cancel();
      stopRing();
      stopPolling();
      unsubReconnect();
      if (socketRef.current) { socketRef.current.off('new:mission'); socketRef.current.off('disconnect'); disconnectSocket(); }
    };
  }, []);

  const toggleAvailability = async (val: boolean) => {
    setAvailable(val);
    try {
      await api.professionals.setAvailability(val);
    } catch (e: any) {
      setAvailable(!val);
    }
  };

  const acceptMission = async () => {
    if (!incoming) return;
    Vibration.cancel();
    stopRing();
    try {
      await api.missions.accept(incoming.id);
      setIncoming(null);
      navigation.navigate('ProMission', { missionId: incoming.id });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const ignoreMission = () => {
    Vibration.cancel();
    stopRing();
    setIncoming(null);
    pulseAnim.setValue(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {incoming ? (
        <View style={styles.incomingOverlay}>
          <View style={styles.incomingHeader}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="build" size={32} color={Colors.primaryContainer} />
            </Animated.View>
            <Text style={styles.incomingTitle}>Nouvelle demande</Text>
            <Text style={styles.incomingDist}>{incomingDistance} km · {incoming.service_type || incoming.type || 'Service'}</Text>
          </View>

          <MapView
            style={styles.incomingMap}
            initialRegion={{
              latitude: parseFloat(incoming.location_lat) || 5.345,
              longitude: parseFloat(incoming.location_lng) || -4.015,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(incoming.location_lat) || 5.345,
                longitude: parseFloat(incoming.location_lng) || -4.015,
              }}
              title="Client"
              pinColor={Colors.error}
            />
          </MapView>

          <View style={styles.incomingBottom}>
            <Card style={styles.clientInfoCard}>
              <View style={styles.clientInfoRow}>
                <View style={styles.clientAvatarSmall}>
                  <Text style={styles.clientAvatarSmallText}>
                    {(incoming.user_first_name?.[0] || incoming.user_last_name?.[0] || 'C')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientInfoName}>
                    {[incoming.user_first_name, incoming.user_last_name].filter(Boolean).join(' ') || 'Client'}
                  </Text>
                  <Text style={styles.clientInfoAddress}>
                    {incoming.location_address || incoming.address || 'Adresse inconnue'}
                  </Text>
                  <Text style={styles.clientInfoDesc}>
                    {incoming.description || ''}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={styles.incomingActions}>
              <Button
                title="Accepter"
                onPress={acceptMission}
                style={styles.acceptBtn}
              />
              <Button
                title="Ignorer"
                onPress={ignoreMission}
                variant="outline"
                style={styles.ignoreBtn}
              />
            </View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.businessName}>{pro?.business_name || 'Mon Garage'}</Text>
              <Text style={styles.businessSub}>{pro?.type || 'Pro'} · {pro?.city || ''}</Text>
            </View>
            <View style={styles.availRow}>
              <View style={[styles.availDot, { backgroundColor: available ? Colors.success : Colors.outlineVariant }]} />
              <Text style={[styles.availLabel, { color: available ? Colors.success : Colors.onSurfaceVariant }]}>
                {available ? 'Disponible' : 'Indisponible'}
              </Text>
              <Switch
                value={available}
                onValueChange={toggleAvailability}
                trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
                thumbColor={available ? Colors.primary : Colors.outline}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Ionicons name="star" size={20} color={Colors.primaryContainer} />
              <Text style={styles.statNum}>{typeof pro?.rating === 'number' ? pro.rating.toFixed(1) : pro?.rating || '—'}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.secondary} />
              <Text style={styles.statNum}>{pro?.rating_count || 0}</Text>
              <Text style={styles.statLabel}>Avis</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color={Colors.tertiary} />
              <Text style={styles.statNum}>{missions.length}</Text>
              <Text style={styles.statLabel}>En attente</Text>
            </Card>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nouvelles demandes</Text>
            {missions.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{missions.length}</Text>
              </View>
            )}
          </View>

          {missions.length === 0 ? (
            <View style={styles.noRequests}>
              <Ionicons name="mail-open-outline" size={48} color={Colors.outlineVariant} />
              <Text style={styles.noRequestsText}>Aucune demande pour le moment</Text>
            </View>
          ) : (
            missions.map((m: any, i: number) => {
              const clientName = [m.user_first_name, m.user_last_name].filter(Boolean).join(' ') || 'Client';
              return (
              <Card key={m.id || i} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>{clientName[0] || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceLabel}>{m.type || 'Service'}</Text>
                    <Text style={styles.requestDetail}>{m.address || m.location_address || ''}</Text>
                    <Text style={styles.requestClient}>{clientName}</Text>
                  </View>
                  {m.price_estimate && (
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>{m.price_estimate} FCFA</Text>
                    </View>
                  )}
                </View>
                <View style={styles.requestActions}>
                  <Button title="Accepter" onPress={async () => {
                    try {
                      await api.missions.accept(m.id);
                      navigation.navigate('ProMission', { missionId: m.id });
                    } catch (e: any) {
                      alert(e.message);
                    }
                  }} style={{ flex: 1 }} />
                  <Button title="Ignorer" onPress={() => {}} variant="outline" style={{ flex: 1 }} />
                </View>
              </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.md },

  incomingOverlay: { flex: 1, backgroundColor: Colors.inverseSurface },
  incomingHeader: {
    alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  pulseCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  incomingTitle: { ...Typography.titleMd, color: Colors.inverseOnSurface },
  incomingDist: { ...Typography.bodySm, color: Colors.inverseOnSurface, opacity: 0.7, marginTop: 2 },
  incomingMap: { flex: 1, width: SCREEN_WIDTH },
  incomingBottom: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.md, paddingBottom: Spacing.xl,
    ...Shadow.lg,
  },
  clientInfoCard: { padding: Spacing.md, marginBottom: Spacing.md },
  clientInfoRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatarSmall: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  clientAvatarSmallText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  clientInfoName: { ...Typography.bodyBase, fontWeight: '600' as any, color: Colors.onSurface },
  clientInfoAddress: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  clientInfoDesc: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  incomingActions: { flexDirection: 'row', gap: Spacing.sm },
  acceptBtn: { flex: 2 },
  ignoreBtn: { flex: 1 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  businessName: { ...Typography.titleMd, color: Colors.onSurface },
  businessSub: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availLabel: { ...Typography.caption, fontWeight: '600' as any },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.xs,
  },
  statNum: { ...Typography.titleMd, color: Colors.onSurface },
  statLabel: { ...Typography.caption, color: Colors.onSurfaceVariant },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.subheadSm, color: Colors.onSurface, flex: 1 },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  badgeText: { ...Typography.caption, fontWeight: '700' as any, color: Colors.onPrimary },

  requestCard: { marginBottom: Spacing.sm },
  requestTop: { flexDirection: 'row', marginBottom: Spacing.md },
  requestAvatar: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  requestAvatarText: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  serviceLabel: { ...Typography.bodyBase, fontWeight: '600' as any, color: Colors.onSurface },
  requestDetail: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  requestClient: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 2 },
  priceBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md, alignSelf: 'flex-start',
  },
  priceText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  noRequests: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  noRequestsText: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
});
