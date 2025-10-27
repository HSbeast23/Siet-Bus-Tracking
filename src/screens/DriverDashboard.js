import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { updateBusLocation, stopBusTracking, getBusLocation } from '../services/locationService';
import { authService } from '../services/authService';
import {
  ensureLocationPermissionsAsync,
  startBackgroundTrackingAsync,
  stopBackgroundTrackingAsync,
  isBackgroundTrackingActiveAsync,
  getBackgroundTrackingMetaAsync,
} from '../services/backgroundLocationService';

// Normalize bus number to handle variations (SIET--005 → SIET-005)
const normalizeBusNumber = (busNumber) => {
  if (!busNumber) return '';
  return busNumber.toString().trim().toUpperCase().replace(/-+/g, '-');
};

const DriverDashboard = ({ navigation }) => {
  const [driverInfo, setDriverInfo] = useState({
    name: '',
    busNumber: '',
    email: '',
    phone: '',
    licenseNumber: '',
    avatar: '',
  });
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const trackingSessionRef = useRef(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    let isActive = true;

    const syncExistingTrackingState = async () => {
      try {
        const running = await isBackgroundTrackingActiveAsync();
        if (!isActive || !running) {
          return;
        }

        setIsTracking(true);

        const meta = await getBackgroundTrackingMetaAsync();
        if (!isActive || !meta?.busNumber) {
          return;
        }

        setDriverInfo((prev) => ({
          ...prev,
          busNumber: prev.busNumber || normalizeBusNumber(meta.busNumber),
        }));
        trackingSessionRef.current = meta.sessionId || trackingSessionRef.current;
        isStoppingRef.current = false;
      } catch (error) {
        console.error('Error checking background tracking state:', error);
      }
    };

    syncExistingTrackingState();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        console.log('🧹 [DRIVER] Cleaning up location tracking subscription');
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  // Handle back button press - ask confirmation if tracking is active
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isTracking) {
          Alert.alert(
            'Stop Tracking?',
            'You are currently tracking. Going back will stop location tracking. Do you want to continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Stop & Go Back',
                style: 'destructive',
                onPress: async () => {
                  await stopLocationTracking();
                  navigation.goBack();
                },
              },
            ]
          );
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [isTracking, navigation])
  );

  const loadDriverData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      console.log('Current authenticated driver:', currentUser);

      if (currentUser) {
        const normalizedBusNumber = normalizeBusNumber(currentUser.busNumber || currentUser.busId || '');
        setDriverInfo({
          name: currentUser.name || 'Driver',
          busNumber: normalizedBusNumber,
          email: currentUser.email || '',
          phone: currentUser.phone || 'N/A',
          licenseNumber: currentUser.licenseNumber || 'N/A',
          avatar: currentUser.avatar || '',
        });

        try {
          const backgroundActive = await isBackgroundTrackingActiveAsync();
          if (!backgroundActive && normalizedBusNumber) {
            const snapshot = await getBusLocation(normalizedBusNumber);
            if (snapshot?.success && snapshot.data?.isTracking) {
              console.log(
                '🧹 [DRIVER] Firestore shows active tracking but background task is idle. Resetting bus status.'
              );
              await stopBusTracking(normalizedBusNumber, {
                driverName: currentUser.name || 'Driver',
              });
            }
          }
        } catch (consistencyError) {
          console.warn('⚠️ [DRIVER] Unable to reconcile tracking state:', consistencyError);
        }
      } else {
        Alert.alert(
          'Authentication Required',
          'Please login to access the driver dashboard.',
          [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      await ensureLocationPermissionsAsync();
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      const message = error?.message ?? 'permissions-error';
      if (message === 'foreground-permission-denied') {
        Alert.alert(
          'Permission Needed',
          'Location permission is required to track the bus. Please allow access when prompted.'
        );
      } else if (message === 'background-permission-denied') {
        Alert.alert(
          'Background Access Needed',
          'Allow background location so tracking continues when the app is not active.'
        );
      } else if (message === 'background-permission-blocked') {
        Alert.alert(
          'Enable Location in Settings',
          'Location permissions are blocked. Open system settings to enable background tracking.'
        );
      } else {
        Alert.alert('Permissions Error', 'Unable to request location access. Try again or restart the app.');
      }
      return false;
    }
  };

  const subscribeToForegroundLocation = async ({ normalizedBusNumber, driverName, sessionId }) => {
    if (locationSubscription) {
      return locationSubscription;
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        async (location) => {
          if (isStoppingRef.current) {
            return;
          }

          const newLocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
            busNumber: normalizedBusNumber,
            driverName,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0,
            accuracy: location.coords.accuracy || 0,
            isTracking: true,
            sessionId: sessionId || trackingSessionRef.current,
          };

          setCurrentLocation(newLocationData);
          try {
            await updateBusLocation(normalizedBusNumber, newLocationData);
          } catch (updateError) {
            console.error('❌ [DRIVER] Failed to update location:', updateError);
          }
        }
      );

      setLocationSubscription(subscription);
      return subscription;
    } catch (subscriptionError) {
      console.error('❌ [DRIVER] Unable to subscribe to foreground location updates:', subscriptionError);
      Alert.alert('Location Error', 'Unable to receive live updates. Check GPS settings and try again.');
      return null;
    }
  };

  useEffect(() => {
    let isActive = true;

    const resumeForegroundTracking = async () => {
      if (!isTracking || locationSubscription) {
        return;
      }

      try {
        const meta = await getBackgroundTrackingMetaAsync();
        if (!isActive || !meta?.busNumber) {
          return;
        }

        trackingSessionRef.current = meta.sessionId || trackingSessionRef.current;
        await subscribeToForegroundLocation({
          normalizedBusNumber: normalizeBusNumber(meta.busNumber),
          driverName: meta.driverName || driverInfo.name || 'Driver',
          sessionId: trackingSessionRef.current,
        });
      } catch (error) {
        console.error('Error resuming foreground tracking:', error);
      }
    };

    resumeForegroundTracking();
    return () => {
      isActive = false;
    };
  }, [isTracking, locationSubscription, driverInfo.name]);

  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const normalizedBusNumber = normalizeBusNumber(driverInfo.busNumber);
      console.log(`🚀 [DRIVER] Starting tracking for bus: ${normalizedBusNumber}`);

      isStoppingRef.current = false;
      const sessionId = `${normalizedBusNumber}-${Date.now()}`;
      trackingSessionRef.current = sessionId;

      let initialLocation;
      try {
        initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
      } catch (bestError) {
        try {
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch (highError) {
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
      }

      if (!initialLocation) {
        throw new Error('Unable to acquire initial location');
      }

      const locationData = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        timestamp: new Date().toISOString(),
        busNumber: normalizedBusNumber,
        driverName: driverInfo.name,
        heading: initialLocation.coords.heading || 0,
        speed: initialLocation.coords.speed || 0,
        accuracy: initialLocation.coords.accuracy || 0,
        isTracking: true,
        sessionId,
      };

      setCurrentLocation(locationData);
      await updateBusLocation(normalizedBusNumber, locationData);

      try {
        await startBackgroundTrackingAsync({
          busNumber: normalizedBusNumber,
          driverName: driverInfo.name,
          sessionId,
          notificationTitle: 'SIET Bus Tracking Active',
          notificationBody: `Tracking bus ${normalizedBusNumber}.`,
          timeInterval: 4000,
          distanceInterval: 5,
        });
      } catch (backgroundError) {
        console.warn('⚠️ Background tracking unavailable:', backgroundError);
        Alert.alert(
          'Background Tracking Limited',
          'Live tracking will pause when the app is closed on this device. Build a development client to test full background updates.'
        );
      }

      await subscribeToForegroundLocation({
        normalizedBusNumber,
        driverName: driverInfo.name,
        sessionId,
      });

      setIsTracking(true);
      Alert.alert('Tracking Started', `Location tracking activated for bus ${normalizedBusNumber}.`);
    } catch (error) {
      console.error('❌ [DRIVER] Error starting location tracking:', error);
      setIsTracking(false);
      trackingSessionRef.current = null;
      isStoppingRef.current = false;
      Alert.alert(
        'Location Unavailable',
        'Failed to start tracking. Ensure GPS is enabled or set a mock location if using an emulator.'
      );
    }
  };

  const stopLocationTracking = async () => {
    console.log('🛑 [DRIVER] Stopping location tracking...');
    isStoppingRef.current = true;
    const sessionId = trackingSessionRef.current;

    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }

    try {
      await stopBackgroundTrackingAsync();
    } catch (error) {
      console.error('❌ [DRIVER] Error stopping background tracking:', error);
    }

    if (driverInfo.busNumber) {
      try {
        await stopBusTracking(normalizeBusNumber(driverInfo.busNumber), {
          driverName: driverInfo.name,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          sessionId,
        });
      } catch (error) {
        console.error('❌ [DRIVER] Error stopping tracking in Firestore:', error);
      }
    }

    setIsTracking(false);
    setCurrentLocation(null);
    trackingSessionRef.current = null;
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      isTracking
        ? 'You are currently tracking. Logging out will stop location tracking. Are you sure?'
        : 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            if (isTracking) {
              await stopLocationTracking();
            }
            const success = await authService.logout();
            if (success) {
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } else {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const trackingStatusMeta = useMemo(
    () =>
      isTracking
        ? { label: 'ACTIVE', color: COLORS.success, tone: '#E8F5E9' }
        : { label: 'INACTIVE', color: COLORS.danger, tone: '#FFEBEE' },
    [isTracking]
  );

  const navigateToProfile = () => {
    navigation.navigate('DriverProfile');
  };

  const handleNotificationsPress = () => {
    Alert.alert('Notifications', 'You are all caught up for now.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeftNoIcon}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.heroName}>{driverInfo.name}</Text>
            <Text style={styles.heroSub}>Here's your dashboard </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaTile}>
                <Ionicons name="bus" size={18} color={COLORS.secondary} />
                <Text style={styles.heroMetaLabel}>Bus</Text>
                <Text style={styles.heroMetaValue}>{driverInfo.busNumber || 'N/A'}</Text>
              </View>
              <View style={styles.heroMetaTile}>
                <Ionicons name="mail" size={18} color={COLORS.secondary} />
                <Text style={styles.heroMetaLabel}>Contact</Text>
                <Text style={styles.heroMetaValue}>{driverInfo.email || 'Not set'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroAvatarWrapper}>
            {driverInfo.avatar ? (
              <Image source={{ uri: driverInfo.avatar }} style={styles.heroAvatar} />
            ) : (
              <Ionicons name="person-circle" size={96} color={`${COLORS.white}CC`} />
            )}
            <TouchableOpacity style={styles.heroEditButton} onPress={navigateToProfile}>
              <Ionicons name="create" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <View style={[styles.statusChip, { backgroundColor: trackingStatusMeta.tone }]}>
              <Ionicons name="location" size={18} color={trackingStatusMeta.color} />
              <Text style={[styles.statusChipText, { color: trackingStatusMeta.color }]}>
                {trackingStatusMeta.label}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.trackingButton, { backgroundColor: trackingStatusMeta.color }]}
              onPress={isTracking ? stopLocationTracking : startLocationTracking}
            >
              <Ionicons name={isTracking ? 'stop' : 'play'} size={18} color={COLORS.white} />
              <Text style={styles.trackingButtonText}>
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trackingBody}>
            <View style={styles.trackingInfoRow}>
              <View>
                <Text style={styles.trackingLabel}>Current Location</Text>
                <Text style={styles.trackingSummary}>
                  {currentLocation
                    ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                    : 'Awaiting location lock'}
                </Text>
              </View>
              <TouchableOpacity style={styles.trackingIconButton} onPress={loadDriverData}>
                <Ionicons name="refresh" size={18} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.trackingMetricsRow}>
              <TrackingMetric
                icon="time"
                label="Updated"
                value={currentLocation ? new Date(currentLocation.timestamp).toLocaleTimeString() : '--:--'}
              />
              <TrackingMetric
                icon="speedometer"
                label="Speed"
                value={currentLocation ? `${(currentLocation.speed || 0).toFixed(1)} m/s` : '0 m/s'}
              />
              <TrackingMetric
                icon="compass"
                label="Heading"
                value={currentLocation ? `${Math.round(currentLocation.heading || 0)}°` : '--'}
              />
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const TrackingMetric = ({ icon, label, value }) => (
  <View style={styles.metricCard}>
    <Ionicons name={icon} size={18} color={COLORS.secondary} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeftNoIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  heroLeft: {
    flex: 1,
    paddingRight: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  heroName: {
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  heroSub: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  heroMetaTile: {
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minWidth: 120,
  },
  heroMetaLabel: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    marginTop: 4,
  },
  heroMetaValue: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
    marginTop: 2,
  },
  heroAvatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: `${COLORS.secondary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  heroEditButton: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
  },
  statusChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  trackingButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
  },
  trackingBody: {
    marginTop: SPACING.lg,
    gap: SPACING.lg,
  },
  trackingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray,
  },
  trackingSummary: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    marginTop: 4,
  },
  trackingIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}26`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: `${COLORS.primary}12`,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    marginTop: 6,
  },
  metricValue: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
});

export default DriverDashboard;
