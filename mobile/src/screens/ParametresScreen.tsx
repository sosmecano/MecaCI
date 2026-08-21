import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Card from '../components/Card';
import { api } from '../services/api';

export default function ParametresScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('fr');
  const [notifications, setNotifications] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setError(null);
    try {
      const data = await api.users.me();
      setUser(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setCity(data.city || '');
      setLanguage(data.language || 'fr');
      setPhotoUri(data.photo_url || null);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie dans les réglages.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPickingPhoto(true);
      const asset = result.assets[0];
      if (asset.uri) {
        setPhotoUri(asset.uri);
        try {
          const { url } = await api.upload.photo(asset.uri);
          const updated = await api.users.update({ photo_url: url });
          setUser(updated);
        } catch (e: any) {
          Alert.alert('Erreur', 'Impossible d\'enregistrer la photo.');
        }
      }
      setPickingPhoto(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.users.update({
        first_name: firstName,
        last_name: lastName,
        email,
        city,
        language,
      });
      setUser(updated);
      setEditing(false);
      Alert.alert('Enregistré', 'Vos modifications ont été sauvegardées.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.onSurfaceVariant} />
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Réessayer" onPress={loadProfile} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = ((user?.first_name || '')[0] || '') + ((user?.last_name || '')[0] || '') || '?';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} disabled={pickingPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={Colors.white} />
          </View>
          {pickingPhoto && <ActivityIndicator size="small" color={Colors.white} style={StyleSheet.absoluteFill} />}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Profil</Text>
        <Card style={styles.card}>
          {editing ? (
            <>
              <EditField label="Prénom" value={firstName} onChangeText={setFirstName} />
              <EditField label="Nom" value={lastName} onChangeText={setLastName} />
              <EditField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
              <EditField label="Ville" value={city} onChangeText={setCity} last />
            </>
          ) : (
            <>
              <ProfileRow icon="person-outline" label="Prénom" value={firstName} />
              <ProfileRow icon="person-outline" label="Nom" value={lastName} />
              <ProfileRow icon="mail-outline" label="Email" value={email || '—'} />
              <ProfileRow icon="call-outline" label="Téléphone" value={user?.phone || '—'} last />
            </>
          )}
        </Card>

        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); loadProfile(); }}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.editBtnText}>Modifier mes informations</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Préférences</Text>
        <Card style={styles.card}>
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text style={styles.prefLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.outlineVariant, true: Colors.primaryContainer }}
              thumbColor={notifications ? Colors.primary : Colors.outline}
            />
          </View>
          <View style={[styles.prefRow, styles.prefRowLast]}>
            <View style={styles.prefLeft}>
              <Ionicons name="language-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text style={styles.prefLabel}>Langue</Text>
            </View>
            <TouchableOpacity onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} style={styles.langBtn}>
              <Text style={styles.langText}>{language === 'fr' ? 'Français' : 'English'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>À propos</Text>
        <Card style={styles.card}>
          <ProfileRow icon="information-circle-outline" label="Version" value="1.0.0" />
          <ProfileRow icon="code-outline" label="Développeur" value="Mecanova" last />
        </Card>

        <TouchableOpacity style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={18} color={Colors.onSurfaceVariant} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function EditField({ label, value, onChangeText, keyboardType, last }: { label: string; value: string; onChangeText: (t: string) => void; keyboardType?: any; last?: boolean }) {
  return (
    <View style={[styles.editField, !last && styles.editFieldBorder]}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={Colors.onSurfaceVariant}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
  },
  errorText: {
    ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    ...Shadow.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.subheadSm, color: Colors.onSurface },
  content: { padding: Spacing.md },
  avatarWrap: {
    alignSelf: 'center', marginBottom: Spacing.lg, position: 'relative',
    width: 100, height: 100, borderRadius: BorderRadius.full,
  },
  avatar: { width: 100, height: 100, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceContainerHigh },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderText: {
    ...Typography.headlineLg,
    color: Colors.onPrimaryContainer,
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: BorderRadius.full,
    backgroundColor: Colors.inverseSurface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.surfaceContainerLowest,
  },
  sectionTitle: {
    ...Typography.subheadSm,
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLeft: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  rowLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  rowValue: {
    ...Typography.bodySm, fontWeight: '600' as any,
    color: Colors.onSurface, maxWidth: '60%', textAlign: 'right',
  },
  editField: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  editFieldBorder: {
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  editLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
    fontWeight: '600' as any,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
    ...Typography.bodySm,
    color: Colors.onSurface,
  },
  editActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.outlineVariant, alignItems: 'center',
  },
  cancelText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurfaceVariant },
  saveBtn: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onPrimary },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginTop: Spacing.md, paddingVertical: Spacing.sm,
  },
  editBtnText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.primary },
  prefRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  prefRowLast: { borderBottomWidth: 0 },
  prefLeft: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  prefLabel: { ...Typography.bodySm, fontWeight: '500' as any, color: Colors.onSurface },
  langBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  langText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.onSurface },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginTop: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.errorContainer,
    backgroundColor: Colors.errorContainer + '30',
  },
  deleteText: { ...Typography.bodySm, fontWeight: '600' as any, color: Colors.error },
});
