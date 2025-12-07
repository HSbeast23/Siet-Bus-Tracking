import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SAMPLE_STOPS, BUS_ROUTES } from '../utils/constants';
import { authService } from '../services/authService';
import { normalizeBusNumber, subscribeToBusLocation } from '../services/locationService';
import { buildOsrmRouteUrl, stopsToLatLng } from '../utils/routePolylineConfig';

const EDGE_PADDING = { top: 100, right: 40, bottom: 320, left: 40 };
const DEFAULT_REGION = {
  latitude: SAMPLE_STOPS[0]?.latitude ?? 11.04104,
  longitude: SAMPLE_STOPS[0]?.longitude ?? 77.07738,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const toLatLng = (stop = {}) => {
  const latitude = Number(stop.latitude);
  const longitude = Number(stop.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    name: stop.name ?? stop.title ?? '',
  };
};

const sanitiseStops = (stops = []) =>
  stops
    .map((stop) => toLatLng(stop))
    .filter(Boolean);

const resolveRouteStops = (busId, providedStops) => {
  const normalisedProvided = sanitiseStops(providedStops);
  if (normalisedProvided.length) {
    return normalisedProvided;
  }

  if (busId && BUS_ROUTES[busId]?.stops?.length) {
    return sanitiseStops(BUS_ROUTES[busId].stops);
  }

  return sanitiseStops(SAMPLE_STOPS);
};

const hasValidCoordinate = (value) =>
  value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

const formatTimeAgo = (timestamp) => {
  if (!timestamp) {
    return 'No recent update';
  }

  const parsed = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
  if (!Number.isFinite(parsed)) {
    return 'No recent update';
  }

  const deltaMs = Date.now() - parsed;
  if (deltaMs < 0) {
    return 'Just now';
  }

  const minutes = Math.floor(deltaMs / 60000);
  if (minutes <= 0) {
    return 'Just now';
  }

  if (minutes === 1) {
    return '1 minute ago';
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours === 1) {
    return '1 hour ago';
  }

  if (hours < 24) {
    return `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

const MapScreen = ({ route, navigation }) => {
  const mapRef = useRef(null);
  const hasCenteredOnBusRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const [role, setRole] = useState('student');
  const [busDisplayName, setBusDisplayName] = useState('');

  const [routeStops, setRouteStops] = useState(() => resolveRouteStops('', SAMPLE_STOPS));
  const [routePolyline, setRoutePolyline] = useState(() => stopsToLatLng(routeStops));
  const [routeWarning, setRouteWarning] = useState('');
  const [busLocation, setBusLocation] = useState(null);
  const [isBusTracking, setIsBusTracking] = useState(false);
  const [busSpeed, setBusSpeed] = useState(0);
  const [busHeading, setBusHeading] = useState(0);
  const [lastBusUpdate, setLastBusUpdate] = useState(null);

  const [studentLocation, setStudentLocation] = useState(null);

  const initialRegion = useMemo(() => {
    if (routeStops.length) {
      return {
        latitude: routeStops[0].latitude,
        longitude: routeStops[0].longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return DEFAULT_REGION;
  }, [routeStops]);

  const routeCoordinates = useMemo(
    () => routeStops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    [routeStops]
  );

  const displayedRouteLine = useMemo(() => {
    if (routePolyline.length >= 2) {
      return routePolyline;
    }
    return routeCoordinates;
  }, [routePolyline, routeCoordinates]);

  const allTrackablePoints = useMemo(() => {
    const points = [...displayedRouteLine];
    if (hasValidCoordinate(busLocation)) {
      points.push(busLocation);
    }
    if (hasValidCoordinate(studentLocation)) {
      points.push(studentLocation);
    }
    return points;
  }, [displayedRouteLine, busLocation, studentLocation]);

  const ensureStudentLocationAsync = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (currentPosition?.coords && Number.isFinite(currentPosition.coords.latitude)) {
        setStudentLocation({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
        });
      }
    } catch (error) {
      console.warn('Unable to determine current location', error);
    }
  }, []);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const initialise = async () => {
      setLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        if (!isMounted) {
          return;
        }

        const resolvedRole = (route?.params?.role || currentUser?.role || 'student').toLowerCase();
        setRole(resolvedRole);

        const rawBusValue =
          route?.params?.busId ||
          route?.params?.busNumber ||
          route?.params?.busDisplayName ||
          currentUser?.busId ||
          currentUser?.busNumber ||
          '';

        const normalisedBusId = normalizeBusNumber(rawBusValue);
        setBusDisplayName(route?.params?.busDisplayName || normalisedBusId || 'Bus');

        const providedStops = route?.params?.routeStops;
        const resolvedStops = resolveRouteStops(normalisedBusId, providedStops);
        setRouteStops(resolvedStops);

        if (normalisedBusId) {
          unsubscribe = subscribeToBusLocation(
            normalisedBusId,
            (snapshot) => {
              const trackingToken = snapshot?.activeTrackingSession ?? snapshot?.trackingSessionId;
              const trackingActive = Boolean(
                snapshot?.isTracking && (trackingToken !== undefined ? trackingToken : snapshot?.isTracking)
              );
              const coords = snapshot?.currentLocation;
              const hasCoords = hasValidCoordinate(coords);

              if (trackingActive && hasCoords) {
                const latitude = Number(coords.latitude);
                const longitude = Number(coords.longitude);
                const normalisedSpeed = Number(snapshot?.speed ?? coords?.speed ?? 0);
                const normalisedHeading = Number(snapshot?.heading ?? coords?.heading ?? 0);

                setBusLocation({ latitude, longitude });
                setBusSpeed(Number.isFinite(normalisedSpeed) ? normalisedSpeed : 0);
                setBusHeading(Number.isFinite(normalisedHeading) ? normalisedHeading : 0);
                setLastBusUpdate(snapshot?.lastUpdate || Date.now());
                setIsBusTracking(true);
              } else {
                setBusLocation(null);
                setIsBusTracking(false);
                setBusSpeed(0);
                setBusHeading(0);
              }
            },
            (error) => {
              console.error('Bus subscription error', error);
              setBusLocation(null);
              setIsBusTracking(false);
            }
          );
        }

        if (resolvedRole === 'student') {
          await ensureStudentLocationAsync();
        } else if (route?.params?.studentLocation && hasValidCoordinate(route.params.studentLocation)) {
          setStudentLocation(route.params.studentLocation);
        }
      } catch (error) {
        console.error('Failed to initialise map screen', error);
        Alert.alert('Map Error', 'Unable to load map data. Please try again.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialise();

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [route, ensureStudentLocationAsync]);

  const animateToCoordinate = useCallback((coordinate, zoomLevel = 16) => {
    if (!mapRef.current || !hasValidCoordinate(coordinate)) {
      return;
    }

    mapRef.current.animateCamera(
      {
        center: coordinate,
        zoom: zoomLevel,
      },
      { duration: 600 }
    );
  }, []);

  const fitRoute = useCallback(() => {
    if (!mapRef.current || displayedRouteLine.length === 0) {
      return;
    }

    mapRef.current.fitToCoordinates(displayedRouteLine, {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }, [displayedRouteLine]);

  const fitAllPoints = useCallback(() => {
    if (!mapRef.current || allTrackablePoints.length === 0) {
      return;
    }

    mapRef.current.fitToCoordinates(allTrackablePoints, {
      edgePadding: EDGE_PADDING,
      animated: true,
    });
  }, [allTrackablePoints]);

  const centerOnBus = useCallback(() => {
    if (!hasValidCoordinate(busLocation)) {
      Alert.alert('No Location', 'Live bus coordinates are not available yet.');
      return;
    }

    animateToCoordinate(busLocation);
  }, [animateToCoordinate, busLocation]);

  const centerOnStudent = useCallback(() => {
    if (!hasValidCoordinate(studentLocation)) {
      Alert.alert('No Location', 'Your current location is not available.');
      return;
    }

    animateToCoordinate(studentLocation, 17);
  }, [animateToCoordinate, studentLocation]);

  useEffect(() => {
    if (!mapReady || !hasValidCoordinate(busLocation) || !isBusTracking) {
      return;
    }

    if (!hasCenteredOnBusRef.current) {
      animateToCoordinate(busLocation);
      hasCenteredOnBusRef.current = true;
    }
  }, [mapReady, busLocation, isBusTracking, animateToCoordinate]);

  useEffect(() => {
    if (!isBusTracking) {
      hasCenteredOnBusRef.current = false;
    }
  }, [isBusTracking]);

  useEffect(() => {
    let isActive = true;

    const fetchPolyline = async () => {
      const fallback = stopsToLatLng(routeStops);

      if (routeStops.length < 2) {
        setRoutePolyline(fallback);
        setRouteWarning(routeStops.length ? 'Add at least two stops to draw a route.' : 'No stops available.');
        return;
      }

      const url = buildOsrmRouteUrl(routeStops);
      if (!url) {
        setRoutePolyline(fallback);
        setRouteWarning('Unable to build OSRM request. Displaying straight path.');
        return;
      }

      try {
        setRouteWarning('');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`OSRM request failed (${response.status})`);
        }

        const json = await response.json();
        const geometry = json?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(geometry) || geometry.length < 2) {
          throw new Error('OSRM response missing geometry');
        }

        if (isActive) {
          setRoutePolyline(geometry.map(([longitude, latitude]) => ({ latitude, longitude })));
        }
      } catch (error) {
        console.warn('OSRM polyline fetch failed', error);
        if (isActive) {
          setRoutePolyline(fallback);
          setRouteWarning('OSRM unavailable. Showing straight-line fallback.');
        }
      }
    };

    fetchPolyline();

    return () => {
      isActive = false;
    };
  }, [routeStops]);

  useEffect(() => {
    if (mapReady && displayedRouteLine.length >= 2) {
      fitRoute();
    }
  }, [mapReady, displayedRouteLine, fitRoute]);

  const speedLabel = useMemo(() => {
    if (!isBusTracking) {
      return 'Bus is offline';
    }

    if (!Number.isFinite(busSpeed) || busSpeed <= 0) {
      return 'Bus is stationary';
    }

    const kmh = Math.max(Math.round(busSpeed * 3.6), 1);
    return `${kmh} km/h`;
  }, [busSpeed, isBusTracking]);

  const headingLabel = useMemo(() => {
    if (!isBusTracking) {
      return 'Heading unavailable';
    }

    const heading = Math.round((busHeading + 360) % 360);
    return `${heading}°`;
  }, [busHeading, isBusTracking]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderLabel}>Preparing live map…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Live Map</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {busDisplayName ? `Tracking ${busDisplayName}` : 'Select a bus to begin tracking'}
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          customMapStyle={[]}
          showsCompass
          showsPointsOfInterest={false}
          mapPadding={{ top: 0, right: 0, bottom: Platform.select({ ios: 260, android: 200 }), left: 0 }}
          onMapReady={() => {
            setMapReady(true);
            fitRoute();
          }}
        >
          {displayedRouteLine.length > 1 && (
            <Polyline
              coordinates={displayedRouteLine}
              strokeColor={COLORS.accent}
              strokeWidth={5}
            />
          )}

          {routeStops.map((stop, index) => (
            <Marker
              key={`${stop.name}-${index}`}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              title={stop.name}
              description={stop.time}
            />
          ))}

          {hasValidCoordinate(busLocation) && (
            <Marker.Animated
              coordinate={busLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={isBusTracking ? busHeading : 0}
            >
              <View style={styles.busMarker}>
                <Text style={styles.busMarkerEmoji}>🚌</Text>
              </View>
            </Marker.Animated>
          )}

          {hasValidCoordinate(studentLocation) && (
            <Marker
              coordinate={studentLocation}
              title={role === 'student' ? 'You' : 'Student'}
            >
              <View style={styles.studentMarker}>
                <Ionicons name="person" size={16} color={COLORS.white} />
              </View>
            </Marker>
          )}
        </MapView>

        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.actionButton} onPress={fitRoute}>
            <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={fitAllPoints}>
            <Ionicons name="scan-outline" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Fit All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={centerOnBus}>
            <Ionicons name="bus" size={18} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Bus</Text>
          </TouchableOpacity>

          {role === 'student' && (
            <TouchableOpacity style={styles.actionButton} onPress={centerOnStudent}>
              <Ionicons name="person" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Me</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusTitle} numberOfLines={1}>
            {busDisplayName || 'Bus'}
          </Text>
          <View style={[styles.statusPill, isBusTracking ? styles.statusPillLive : styles.statusPillOffline]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>{isBusTracking ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Speed</Text>
            <Text style={styles.statusValue}>{speedLabel}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Heading</Text>
            <Text style={styles.statusValue}>{headingLabel}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Last Update</Text>
            <Text style={styles.statusValue}>{formatTimeAgo(lastBusUpdate)}</Text>
          </View>
        </View>
        {routeWarning ? (
          <Text style={styles.routeWarning} numberOfLines={2}>
            {routeWarning}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loaderLabel: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  headerPlaceholder: {
    width: 36,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  statusPillLive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  statusPillOffline: {
    backgroundColor: 'rgba(148,163,184,0.24)',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  routeWarning: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.warning,
  },
  busMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    padding: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  busMarkerEmoji: {
    fontSize: 20,
  },
  studentMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});

export default MapScreen;

