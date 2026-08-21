import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';
import { api } from '../services/api';

function isOpenNow(hoursJson: string): boolean {
  try {
    const hours = JSON.parse(hoursJson);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const now = new Date();
    const day = dayNames[now.getDay()];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const range = hours[day];
    if (!range || range === 'closed' || range === 'fermé') return false;
    const [start, end] = range.split('-');
    return time >= start && time <= end;
  } catch { return false; }
}

function callPhone(phone: any) {
  if (!phone) return;
  Linking.openURL(`tel:${String(phone).replace(/[\s\-]/g, '')}`).catch(() => {});
}

const FILTERS = ['Tous', 'Moteur', 'Pneus', 'Électrique', 'Carrosserie'];

export default function GaragesScreen({ navigation }: any) {
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');

  const loadGarages = async () => {
    setError(null);
    try { setGarages(await api.garages.list()); } catch (e: any) { setError(e.message || 'Erreur de chargement'); } finally { setLoading(false); }
  };

  useEffect(() => { loadGarages(); }, []);

  const filteredGarages = garages.filter((g) => {
    const matchSearch = !search || g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.address?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'Tous' ||
      (Array.isArray(g.specialties) && g.specialties.some((s: string) =>
        s.toLowerCase().includes(activeFilter.toLowerCase())
      ));
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mecanova</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.outline} style={{ marginLeft: Spacing.md }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un mécanicien..."
              placeholderTextColor={Colors.outline}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersWrap}
          style={styles.filtersScroll}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : error ? (
          <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
            <Text style={{ ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.md }}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadGarages} activeOpacity={0.7}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredGarages.length === 0 ? (
              <Text style={styles.empty}>Aucun garage trouvé</Text>
            ) : (
              filteredGarages.map((g, i) => {
                const open = isOpenNow(g.hours);
                const specialties = Array.isArray(g.specialties) ? g.specialties : [];
                return (
                  <TouchableOpacity
                    key={g.id || i}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('GarageMap', { name: g.name, address: g.address, lat: g.lat, lng: g.lng, phone: g.phone })}
                  >
                    <View style={styles.cardAvatar}>
                      <Ionicons name="business" size={28} color={Colors.onPrimaryContainer} />
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardName} numberOfLines={1}>{g.name}</Text>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={14} color={Colors.primary} />
                          <Text style={styles.ratingText}>{g.rating || '4.8'}</Text>
                        </View>
                      </View>
                      {specialties.length > 0 && (
                        <Text style={styles.cardSpecialty} numberOfLines={1}>
                          {specialties.slice(0, 2).join(' & ')}
                        </Text>
                      )}
                      <View style={styles.cardBadges}>
                        {g.distance != null && (
                          <View style={styles.badge}>
                            <Ionicons name="location" size={12} color={Colors.onSurfaceVariant} />
                            <Text style={styles.badgeText}>{typeof g.distance === 'number' ? g.distance.toFixed(1) : g.distance} km</Text>
                          </View>
                        )}
                        <View style={[styles.badge, styles.badgeTime]}>
                          <Ionicons name="time" size={12} color={Colors.tertiary} />
                          <Text style={[styles.badgeText, { color: Colors.tertiary }]}>
                            {g.estimated_time || '~15 min'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="map" size={20} color={Colors.onPrimaryContainer} />
        <Text style={styles.fabText}>Voir sur la carte</Text>
      </TouchableOpacity>
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
    height: 64,
    backgroundColor: Glass.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headlineLg,
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: Spacing.safeMargin,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
  },

  searchWrap: { marginBottom: Spacing.lg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    height: 48,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.sm,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },

  filtersScroll: { marginBottom: Spacing.lg },
  filtersWrap: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filterText: {
    ...Typography.bodySm,
    color: Colors.onSurface,
  },
  filterTextActive: {
    color: Colors.onPrimaryContainer,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl },
  empty: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: Spacing.xl },

  cardsList: {
    gap: Spacing.md,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceVariant,
    ...Shadow.sm,
  },
  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  cardName: {
    ...Typography.subheadSm,
    color: Colors.onSurface,
    flex: 1,
    marginRight: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.onSurface,
  },
  cardSpecialty: {
    ...Typography.caption,
    color: Colors.outline,
    marginBottom: Spacing.sm,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
  },
  badgeTime: {
    backgroundColor: Colors.tertiaryContainer + '30',
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.safeMargin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    ...Shadow.lg,
  },
  fabText: {
    ...Typography.bodyBase,
    fontWeight: '700' as any,
    color: Colors.onPrimaryContainer,
  },

  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  retryText: {
    ...Typography.bodySm,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
});
