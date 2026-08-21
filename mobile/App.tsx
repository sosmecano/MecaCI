if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
}

import { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, StyleSheet, Animated, Vibration, Modal, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from './src/components/ErrorBoundary';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, Typography } from './src/constants/theme';
import Button from './src/components/Button';
import Card from './src/components/Card';
import CustomDrawer from './src/components/CustomDrawer';
import { connectSocket, disconnectSocket } from './src/services/socket';
import { api } from './src/services/api';
import { playRing, stopRing } from './modules/sound-player/src/index';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SOSPanicScreen from './src/screens/SOSPanicScreen';
import MechanicScreen from './src/screens/MechanicScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import GaragesScreen from './src/screens/GaragesScreen';
import TowingScreen from './src/screens/TowingScreen';
import TowTrucksScreen from './src/screens/TowTrucksScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProLoginScreen from './src/screens/ProLoginScreen';
import ProRegisterScreen from './src/screens/ProRegisterScreen';
import ProHomeScreen from './src/screens/ProHomeScreen';
import ProMissionScreen from './src/screens/ProMissionScreen';
import ProRevenueScreen from './src/screens/ProRevenueScreen';
import ProProfileScreen from './src/screens/ProProfileScreen';
import GarageMapScreen from './src/screens/GarageMapScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import ParametresScreen from './src/screens/ParametresScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import AdminProfessionalsScreen from './src/screens/AdminProfessionalsScreen';
import AdminMissionsScreen from './src/screens/AdminMissionsScreen';
import AdminPaymentsScreen from './src/screens/AdminPaymentsScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const tabs = [
  { name: 'Accueil', icon: 'home-outline', iconActive: 'home', component: HomeScreen },
  { name: 'Services', icon: 'construct-outline', iconActive: 'construct', component: GaragesScreen },
  { name: 'Activite', icon: 'time-outline', iconActive: 'time', component: TrackingScreen },
  { name: 'Profil', icon: 'person-outline', iconActive: 'person', component: ProfileScreen },
];

function TabIcon({ icon, iconActive, focused }: { icon: string; iconActive: string; focused: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <Ionicons
        name={(focused ? iconActive : icon) as any}
        size={24}
        color={focused ? Colors.primary : Colors.onSurfaceVariant}
      />
      {focused && <View style={tabStyles.activeIndicator} />}
    </View>
  );
}

function GlassTabBarBackground() {
  return (
    <View style={tabStyles.glassWrap}>
      <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
      <View style={tabStyles.glassBorder} />
    </View>
  );
}

function ClientTabs() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: Colors.white,
          width: 280,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
        overlayColor: 'rgba(0,0,0,0.4)',
        sceneStyle: { backgroundColor: Colors.white },
      }}
    >
      <Drawer.Screen name="Accueil" component={HomeScreen} />
      <Drawer.Screen name="Services" component={GaragesScreen} />
      <Drawer.Screen name="Activite" component={TrackingScreen} />
      <Drawer.Screen name="Vehicles" component={VehiclesScreen} />
      <Drawer.Screen name="Tracking" component={TrackingScreen} />
      <Drawer.Screen name="Payment" component={PaymentScreen} />
      <Drawer.Screen name="Parametres" component={ParametresScreen} />
      <Drawer.Screen name="Profil" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

const proTabs = [
  { name: 'AccueilPro', icon: 'home-outline', iconActive: 'home', component: ProHomeScreen },
  { name: 'Missions', icon: 'clipboard-outline', iconActive: 'clipboard', component: ProMissionScreen },
  { name: 'Revenus', icon: 'wallet-outline', iconActive: 'wallet', component: ProRevenueScreen },
  { name: 'ProfilPro', icon: 'person-outline', iconActive: 'person', component: ProProfileScreen },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

function ProTabs() {
  const [incoming, setIncoming] = useState<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rootNav = useNavigation<any>();

  useEffect(() => {
    let cancelled = false;
    let socket: any = null;
    (async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      socket = connectSocket(token);
      const pro = await api.professionals.me().catch(() => null);
      if (pro?.id) socket.emit('join:pro', pro.id);
      socket.on('new:mission', (data: any) => {
        if (cancelled) return;
        setIncoming(data.mission || data);
        Vibration.vibrate([0, 400, 200, 400, 200, 400], true);
        playRing();
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      });
    })();
    return () => {
      cancelled = true;
      Vibration.cancel();
      stopRing();
      if (socket) { socket.off('new:mission'); disconnectSocket(); }
    };
  }, []);

  const acceptMission = async () => {
    if (!incoming) return;
    Vibration.cancel();
    stopRing();
    try {
      await api.missions.accept(incoming.id);
      setIncoming(null);
      rootNav.navigate('ProMission', { missionId: incoming.id });
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

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: tabStyles.bar,
          tabBarShowLabel: false,
          tabBarBackground: () => <GlassTabBarBackground />,
        }}
      >
        {proTabs.map((t) => (
          <Tab.Screen
            key={t.name}
            name={t.name}
            component={t.component}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon icon={t.icon} iconActive={t.iconActive} focused={focused} />,
            }}
          />
        ))}
      </Tab.Navigator>

      <Modal visible={!!incoming} animationType="slide" transparent>
        <View style={tabStyles.incomingOverlay}>
          <View style={tabStyles.incomingHeader}>
            <Animated.View style={[tabStyles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={tabStyles.pulseIcon}>🔧</Text>
            </Animated.View>
            <Text style={tabStyles.incomingTitle}>Nouvelle demande</Text>
            <Text style={tabStyles.incomingDist}>{incoming?.service_type || incoming?.type || 'Service'}</Text>
          </View>

          <MapView
            style={tabStyles.incomingMap}
            initialRegion={{
              latitude: parseFloat(incoming?.location_lat) || 5.345,
              longitude: parseFloat(incoming?.location_lng) || -4.015,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(incoming?.location_lat) || 5.345,
                longitude: parseFloat(incoming?.location_lng) || -4.015,
              }}
              title="Client"
              pinColor="#FF3B30"
            />
          </MapView>

          <View style={tabStyles.incomingBottom}>
            <Card style={tabStyles.clientInfoCard}>
              <View style={tabStyles.clientInfoRow}>
                <View style={tabStyles.clientAvatarSmall}>
                  <Text style={tabStyles.clientAvatarSmallText}>
                    {(incoming?.user_first_name?.[0] || incoming?.user_last_name?.[0] || 'C')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={tabStyles.clientInfoName}>
                    {[incoming?.user_first_name, incoming?.user_last_name].filter(Boolean).join(' ') || 'Client'}
                  </Text>
                  <Text style={tabStyles.clientInfoAddress}>
                    📍 {incoming?.location_address || incoming?.address || 'Adresse inconnue'}
                  </Text>
                  <Text style={tabStyles.clientInfoDesc}>
                    {incoming?.description || ''}
                  </Text>
                </View>
              </View>
            </Card>

            <View style={tabStyles.incomingActions}>
              <Button title="Accepter" onPress={acceptMission} style={{ flex: 2 }} />
              <Button title="Ignorer" onPress={ignoreMission} variant="outline" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const adminTabs = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'stats-chart-outline', iconActive: 'stats-chart', component: AdminDashboardScreen },
  { name: 'AdminPros', label: 'Pros', icon: 'people-outline', iconActive: 'people', component: AdminProfessionalsScreen },
  { name: 'AdminMissions', label: 'Missions', icon: 'clipboard-outline', iconActive: 'clipboard', component: AdminMissionsScreen },
  { name: 'AdminPayments', label: 'Paiements', icon: 'wallet-outline', iconActive: 'wallet', component: AdminPaymentsScreen },
  { name: 'AdminUsers', label: 'Users', icon: 'person-outline', iconActive: 'person', component: AdminUsersScreen },
];

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.black,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarBackground: () => <GlassTabBarBackground />,
      }}
    >
      {adminTabs.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon icon={t.icon} iconActive={t.iconActive} focused={focused} />,
            tabBarLabel: t.label,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ProLogin" component={ProLoginScreen} />
        <Stack.Screen name="ProRegister" component={ProRegisterScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="ClientTabs" component={ClientTabs} />
        <Stack.Screen name="ProTabs" component={ProTabs} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="SOSPanic" component={SOSPanicScreen} />
        <Stack.Screen name="MechanicService" component={MechanicScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="Garages" component={GaragesScreen} />
        <Stack.Screen name="Towing" component={TowingScreen} />
        <Stack.Screen name="TowTrucks" component={TowTrucksScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="GarageMap" component={GarageMapScreen} />
        <Stack.Screen name="Vehicles" component={VehiclesScreen} />
        <Stack.Screen name="Parametres" component={ParametresScreen} />
        <Stack.Screen name="ProMission" component={ProMissionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 999,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  glassWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 248, 240, 0.85)',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(209, 198, 171, 0.5)',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },

  // Incoming mission overlay
  incomingOverlay: { flex: 1, backgroundColor: Colors.black },
  incomingHeader: {
    alignItems: 'center', paddingVertical: Spacing.lg,
    backgroundColor: Colors.black, paddingTop: Spacing.xl,
  },
  pulseCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer, justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pulseIcon: { fontSize: 32 },
  incomingTitle: { ...Typography.headlineLg, color: Colors.white },
  incomingDist: { ...Typography.bodyBase, color: Colors.surfaceDim, marginTop: 2 },
  incomingMap: { flex: 1, width: SCREEN_WIDTH },
  incomingBottom: {
    backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: BorderRadius.xl + 8, borderTopRightRadius: BorderRadius.xl + 8,
    padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  clientInfoCard: { padding: Spacing.md, marginBottom: Spacing.md },
  clientInfoRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatarSmall: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  clientAvatarSmallText: { ...Typography.bodyBase, fontWeight: '700' as any, color: Colors.onPrimaryContainer },
  clientInfoName: { ...Typography.bodySm, fontWeight: '700' as any, color: Colors.onSurface },
  clientInfoAddress: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  clientInfoDesc: { ...Typography.caption, color: Colors.onSurfaceVariant, marginTop: 1 },
  incomingActions: { flexDirection: 'row', gap: Spacing.sm },
});
