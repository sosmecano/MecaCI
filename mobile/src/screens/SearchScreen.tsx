import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { api } from '../services/api';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [pros, setPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPros = async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const data = await api.missions.nearbyPros(loc.coords.latitude, loc.coords.longitude);
      setPros(data);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPros();
  }, []);

  const filtered = query
    ? pros.filter(p => {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        return fullName.includes(query.toLowerCase());
      })
    : pros;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Input
            placeholder="Que vous faut-il ?"
            value={query}
            onChangeText={setQuery}
            leftIcon="search-outline"
            autoFocus
            style={styles.input}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Réessayer" onPress={loadPros} variant="outline" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search" size={48} color={Colors.outlineVariant} />
              <Text style={styles.empty}>Aucun professionnel trouvé</Text>
            </View>
          }
          renderItem={({ item: p }) => {
            const initials = `${(p.first_name?.[0] || '')}${(p.last_name?.[0] || '')}` || '?';
            return (
              <TouchableOpacity style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{p.first_name} {p.last_name}</Text>
                    <View style={styles.metaRow}>
                      <Ionicons name="star" size={12} color={Colors.primaryContainer} />
                      <Text style={styles.metaText}>
                        {p.rating?.toFixed(1) || '?'} · {p.type || 'Pro'}
                      </Text>
                      {p.distance ? (
                        <>
                          <Ionicons name="location-outline" size={12} color={Colors.onSurfaceVariant} />
                          <Text style={styles.metaText}>{p.distance.toFixed(1)} km</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
                {p.estimated_price && (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{p.estimated_price}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
  },
  input: {
    marginBottom: 0,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.bodySm,
    fontWeight: '700' as any,
    color: Colors.onPrimaryContainer,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.bodyBase,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  priceBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  priceText: {
    ...Typography.bodySm,
    fontWeight: '600' as any,
    color: Colors.onSurface,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodyBase,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  empty: {
    ...Typography.bodyBase,
    color: Colors.onSurfaceVariant,
  },
});
