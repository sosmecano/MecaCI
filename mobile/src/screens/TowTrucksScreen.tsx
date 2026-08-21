import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow, Glass } from '../constants/theme';
import { api } from '../services/api';

const FILTERS = [
  { key: 'all', label: 'Tous', icon: 'car' },
  { key: 'light', label: 'Léger', icon: 'car-sport' },
  { key: 'heavy', label: 'Lourd', icon: 'bus' },
  { key: 'moto', label: 'Moto', icon: 'bicycle' },
];

const TYPE_ICONS: Record<string, string> = {
  light: 'car-sport',
  heavy: 'bus',
  moto: 'bicycle',
};

const TYPE_LABELS: Record<string, string> = {
  light: 'Intervention Légère',
  heavy: 'Plateau & Lourd',
  moto: 'Spécialiste Moto',
};

export default function TowTrucksScreen({ navigation }: any) {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadProviders = async () => {
    setError(null);
    try {
      const pros = await api.missions.nearbyPros(5.345, -4.015);
      setProviders(pros.filter((p: any) => p.type === 'tow_truck'));
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProviders(); }, []);

  const filtered = providers.filter((p) => {
    const matchSearch = !search ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' ||
      p.vehicle_type === activeFilter;
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
            <Ionicons name="search" size={18} color={Colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un remorqueur"
              placeholderTextColor={Colors.onSurfaceVariant + 'B0'}
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
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={f.icon as any}
                  size={18}
                  color={isActive ? Colors.onPrimaryContainer : Colors.onSurfaceVariant}
                />
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : error ? (
          <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
            <Text style={{ ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.md }}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadProviders} activeOpacity={0.7}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>Aucun remorqueur disponible</Text>
            ) : (
              filtered.map((p, i) => {
                const typeKey = p.vehicle_type || 'light';
                const typeName = TYPE_LABELS[typeKey] || 'Remorquage';
                const typeIcon = TYPE_ICONS[typeKey] || 'car';
                const distance = p.distance != null
                  ? `${typeof p.distance === 'number' ? p.distance.toFixed(1) : p.distance} km`
                  : null;
                const initials = `${(p.first_name?.[0] || '')}${(p.last_name?.[0] || '')}` || '?';

                return (
                  <TouchableOpacity
                    key={p.id || i}
                    style={[styles.card, i === 0 && styles.cardFirst]}
                    activeOpacity={0.7}
                    onPress={() => {
                      navigation.goBack();
                    }}
                  >
                    {i === 0 && <View style={styles.cardAccent} />}

                    <View style={styles.cardAvatar}>
                      <Text style={styles.cardAvatarText}>{initials}</Text>
                    </View>

                    <View style={styles.cardInfo}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {p.first_name} {p.last_name}
                        </Text>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={14} color={Colors.inversePrimary} />
                          <Text style={styles.ratingText}>{p.rating?.toFixed(1) || '4.9'}</Text>
                        </View>
                      </View>

                      <Text style={styles.cardType}>
                        <Ionicons name={typeIcon as any} size={14} color={Colors.outline} />{'  '}
                        {typeName}
                      </Text>

                      <View style={styles.cardBottom}>
                        <View>
                          <Text style={styles.priceLabel}>À partir de</Text>
                          <Text style={styles.priceValue}>
                            {p.estimated_price?.toLocaleString() || '15 000'} FCFA
                          </Text>
                        </View>
                        {distance && (
                          <View style={styles.distanceBadge}>
                            <Ionicons name="location" size={14} color={Colors.secondary} />
                            <Text style={styles.distanceText}>{distance}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
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
    paddingTop: Spacing.md,
    paddingBottom: 100,
  },

  searchWrap: { marginBottom: Spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest + 'E6',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '50',
    height: 48,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  searchIcon: { marginLeft: Spacing.sm },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.sm,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },

  filtersScroll: { marginBottom: Spacing.md },
  filtersWrap: { gap: Spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest + 'CC',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '80',
    ...Shadow.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  filterText: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700' as any,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl },
  empty: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: Spacing.xl },

  cardsList: { gap: Spacing.md },

  card: {
    backgroundColor: Colors.surfaceContainerLowest + 'F2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '33',
    ...Shadow.md,
    overflow: 'hidden',
    position: 'relative',
  },
  cardFirst: {},
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primaryContainer,
  },

  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
    ...Shadow.sm,
  },
  cardAvatarText: {
    ...Typography.titleMd,
    color: Colors.outline,
  },

  cardInfo: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardName: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    shrink: true,
  } as any,
  ratingText: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.onSurface,
  },

  cardType: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  priceLabel: {
    ...Typography.caption,
    color: Colors.outline,
    marginBottom: 1,
  },
  priceValue: {
    ...Typography.subheadSm,
    color: Colors.primary,
    fontWeight: '700' as any,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryContainer + '1A',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  distanceText: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.secondary,
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
