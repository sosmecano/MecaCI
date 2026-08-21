import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Shadow, Typography, Glass } from '../constants/theme';
import BottomSheet from '../components/BottomSheet';
import ServiceCard from '../components/ServiceCard';
import { api } from '../services/api';

const TYPE_COLORS: Record<string, string> = {
  mechanic: Colors.primaryContainer,
  tow_truck: Colors.secondary,
  garage: Colors.tertiary,
};

const services = [
  { icon: 'build', title: 'Mecanicien', subtitle: 'A domicile', screen: 'MechanicService' },
  { icon: 'warning', title: 'Urgence', subtitle: 'SOS panne', screen: 'SOSPanic' },
  { icon: 'car', title: 'Remorquage', subtitle: 'Vers un garage', screen: 'Towing' },
  { icon: 'business', title: 'Garages', subtitle: 'A proximite', screen: 'Garages' },
];

export default function HomeScreen({ navigation }: any) {
  const [location, setLocation] = useState<any>(null);
  const [cityName, setCityName] = useState("Abidjan, Cote d'Ivoire");
  const [nearbyPros, setNearbyPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const openDrawer = () => navigation.openDrawer();

  const loadData = async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        if (addr.city && addr.country) {
          setCityName(`${addr.city}, ${addr.country}`);
        }
      }

      const pros = await api.missions.nearbyPros(loc.coords.latitude, loc.coords.longitude);
      setNearbyPros(pros.slice(0, 5));
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!location) return;
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 800);
  }, [location]);

  const formatPrice = (pro: any) => {
    if (pro.estimated_price) return pro.estimated_price;
    if (pro.price_per_hour) return `${pro.price_per_hour.toLocaleString()} FCFA/h`;
    return '';
  };

  const proTypeLabel = (type: string) => {
    if (type === 'mechanic') return 'Mecanicien';
    if (type === 'tow_truck') return 'Depanneur';
    return 'Garage';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 5.345,
          longitude: location?.longitude || -4.015,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {nearbyPros.map((pro: any, i: number) =>
          pro.zone_center_lat && pro.zone_center_lng ? (
            <Marker
              key={pro.id || i}
              coordinate={{ latitude: pro.zone_center_lat, longitude: pro.zone_center_lng }}
              title={`${pro.first_name} ${pro.last_name}`}
              description={`${proTypeLabel(pro.type)} - ${pro.rating?.toFixed(1) || '?'}`}
              pinColor={TYPE_COLORS[pro.type] || Colors.primaryContainer}
            />
          ) : null
        )}
      </MapView>

      <SafeAreaView style={styles.topOverlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.hamburgerBtn} onPress={openDrawer} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationPill} activeOpacity={0.7}>
            <Ionicons name="location-sharp" size={18} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{cityName}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profil')}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <TouchableOpacity
        style={styles.sosFab}
        onPress={() => navigation.navigate('SOSPanic')}
        activeOpacity={0.8}
      >
        <Ionicons name="warning" size={24} color={Colors.onError} />
      </TouchableOpacity>

      <BottomSheet>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} />
            <Text style={styles.searchPlaceholder}>Rechercher un mecanicien, garage...</Text>
          </TouchableOpacity>

          <View style={styles.servicesGrid}>
            {services.map((s, i) => (
              <ServiceCard
                key={s.title || String(i)}
                icon={s.icon}
                title={s.title}
                subtitle={s.subtitle}
                onPress={() => navigation.navigate(s.screen)}
              />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Professionnels proches</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Services')} activeOpacity={0.6}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Spacing.md }} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : nearbyPros.length === 0 ? (
            <Text style={styles.noPros}>Aucun professionnel disponible autour de vous</Text>
          ) : (
            nearbyPros.map((pro: any, i: number) => (
              <TouchableOpacity key={pro.id || i} style={styles.proCard} activeOpacity={0.7}>
                <View style={[styles.proAvatar, { backgroundColor: i === 0 ? Colors.primaryContainer : Colors.surfaceContainerHigh }]}>
                  <Text style={[styles.proAvatarText, { color: i === 0 ? Colors.onPrimaryContainer : Colors.onSurface }]}>
                    {((pro.first_name?.[0] || '') + (pro.last_name?.[0] || '')) || '?'}
                  </Text>
                </View>
                <View style={styles.proInfo}>
                  <Text style={styles.proName}>{pro.first_name} {pro.last_name}</Text>
                  <Text style={styles.proType}>{proTypeLabel(pro.type)}</Text>
                  <View style={styles.proMeta}>
                    <Ionicons name="star" size={12} color={Colors.primaryContainer} />
                    <Text style={styles.proRating}>{pro.rating?.toFixed(1) || '-'}</Text>
                    <Text style={styles.proDot}>-</Text>
                    <Text style={styles.proDistance}>{pro.distance ? `${pro.distance.toFixed(1)} km` : '-'}</Text>
                    <Text style={styles.proDot}>-</Text>
                    <Text style={styles.proPrice}>{formatPrice(pro)}</Text>
                  </View>
                </View>
                <View style={styles.proArrow}>
                  <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  map: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.safeMargin,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Glass.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: 6,
    ...Shadow.sm,
  },
  locationText: {
    ...Typography.bodySm,
    fontWeight: '600' as any,
    color: Colors.onSurface,
    maxWidth: 180,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Glass.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  sosFab: {
    position: 'absolute',
    bottom: 120,
    right: Spacing.safeMargin,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subheadSm,
    color: Colors.onSurface,
  },
  seeAll: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600' as any,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  proAvatarText: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
  },
  proInfo: {
    flex: 1,
  },
  proName: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.onSurface,
    marginBottom: 2,
  },
  proType: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
  },
  proMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proRating: {
    ...Typography.caption,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
  proDot: {
    ...Typography.caption,
    color: Colors.outline,
    marginHorizontal: 2,
  },
  proDistance: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  proPrice: {
    ...Typography.caption,
    fontWeight: '700' as any,
    color: Colors.onSurface,
  },
  proArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  noPros: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
