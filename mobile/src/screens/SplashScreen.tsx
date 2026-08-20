import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize } from '../constants/theme';
import { api } from '../services/api';

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'refresh_token';
const USER_TYPE_KEY = 'userType';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userType = await SecureStore.getItemAsync(USER_TYPE_KEY);

        if (!token) {
          navigation.replace('Login');
          return;
        }

        if (userType === 'admin') {
          await api.admin.dashboard();
          navigation.replace('AdminTabs');
        } else if (userType === 'pro') {
          await api.professionals.me();
          navigation.replace('ProTabs');
        } else {
          await api.users.me();
          navigation.replace('ClientTabs');
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        await SecureStore.deleteItemAsync(USER_TYPE_KEY);
        navigation.replace('Login');
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Mecanova</Text>
      <Text style={styles.subtitle}>Mécanicien et dépannage à portée de main</Text>
      <ActivityIndicator size="large" color={Colors.black} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    fontSize: FontSize.largeTitle,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.mediumGray,
    marginTop: 8,
  },
  spinner: {
    marginTop: 40,
  },
});