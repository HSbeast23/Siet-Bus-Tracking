import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import AppNavigator from './src/navigation/AppNavigator';
import {
  getInitialNotification,
  subscribeToForegroundNotifications,
  subscribeToNotificationOpens,
} from './src/services/pushNotificationService';
import { useFcmTokenManager } from './src/hooks/useFcmTokenManager';

const BUS_UPDATE_FALLBACK_TITLE = 'SIET Bus Update';
const BUS_UPDATE_FALLBACK_BODY = 'A new bus notification is available.';

export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useFcmTokenManager();

  useEffect(() => {
    const foregroundUnsubscribe = subscribeToForegroundNotifications((remoteMessage) => {
      const title = remoteMessage?.notification?.title || BUS_UPDATE_FALLBACK_TITLE;
      const body = remoteMessage?.notification?.body || BUS_UPDATE_FALLBACK_BODY;
      Alert.alert(title, body);
    });

    const openedUnsubscribe = subscribeToNotificationOpens((remoteMessage) => {
      if (remoteMessage?.data) {
        console.log('Notification opened from background:', remoteMessage.data);
      }
    });

    getInitialNotification().then((remoteMessage) => {
      if (remoteMessage?.data) {
        console.log('App launched via notification:', remoteMessage.data);
      }
    });

    return () => {
      foregroundUnsubscribe?.();
      openedUnsubscribe?.();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
