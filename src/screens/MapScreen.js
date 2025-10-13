import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Animated,
} from 'react-native';
import MapView, { Marker, AnimatedRegion, PROVIDER_GOOGLE, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToBusLocation, normalizeBusNumber } from '../services/locationService';
import { authService } from '../services/authService';
import { ORS_API_KEY } from '@env';
import {
  DEFAULT_ROUTE_STOPS,
  ORS_ROUTE_COORDINATES,
  ROUTE_POLYLINE_FIT_COORDINATES,
} from '../utils/routePolylineConfig';

const ORS_ENDPOINT = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

const normalizeShapingPoints = (points = [], contextId = 'point') => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point, index) => {
      if (!point || typeof point !== 'object') {
        return null;
      }

      const latitude = Number(point.latitude ?? point.lat);
      const longitude = Number(point.longitude ?? point.lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        console.warn(`⚠️ [MAP] Ignoring invalid shaping point (${contextId}:${index})`, point);
        return null;
      }

      return { latitude, longitude };
    })
    .filter(Boolean);
};

const normalizeRouteStops = (rawStops = []) => {
  return rawStops
    .map((stop, index) => {
      if (!stop || typeof stop !== 'object') {
        return null;
      }

      const latitude = Number(stop.latitude ?? stop.lat);
      const longitude = Number(stop.longitude ?? stop.lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const label = (stop.name || stop.label || stop.stopName || `Stop ${index + 1}`).trim();
      const pathToNext = normalizeShapingPoints(stop.pathToNext, stop.id || `stop-${index}`);

      return {
        id: stop.id || `param-stop-${index}`,
        name: label,
        latitude,
        longitude,
        pathToNext,
      };
    })
    .filter(Boolean);
};

const areCoordinatesClose = (a, b, epsilon = 0.0001) => {
  if (!a || !b) {
    return false;
  }

  return (
    Math.abs(a.latitude - b.latitude) <= epsilon &&
    Math.abs(a.longitude - b.longitude) <= epsilon
  );
};

const includeEndpoint = (points, coordinate, position) => {
  if (!Array.isArray(points) || points.length === 0 || !Array.isArray(coordinate) || coordinate.length !== 2) {
    return points;
  }

  const candidate = {
    latitude: coordinate[1],
    longitude: coordinate[0],
  };

  const alreadyPresent = points.some((existing) => areCoordinatesClose(existing, candidate));

  if (alreadyPresent) {
    return points;
  }

  if (position === 'start') {
    return [candidate, ...points];
  }

  if (position === 'end') {
    return [...points, candidate];
  }

  return points;
};

const mergeStopsIntoPolyline = (polylinePoints, stops) => {
  if (!Array.isArray(polylinePoints) || !Array.isArray(stops)) {
    return polylinePoints;
  }

  let merged = [...polylinePoints];

  stops.forEach((stop) => {
    if (!stop || !Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) {
      return;
    }

    const exists = merged.some((point) => areCoordinatesClose(point, stop));
    if (exists) {
      return;
    }

    // Insert stop at the nearest segment in the existing polyline
    let insertIndex = merged.length;
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < merged.length; i++) {
      const point = merged[i];
      const distance = Math.hypot(point.latitude - stop.latitude, point.longitude - stop.longitude);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        insertIndex = i;
      }
    }

    merged.splice(insertIndex, 0, {
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
  });

  return merged;
};

const StopMarker = React.memo(({ stop, index, totalStops }) => {
  if (!stop) {
    return null;
  }

  const [tracksViewChanges, setTracksViewChanges] = React.useState(Platform.OS === 'android');

  const isStart = index === 0;
  const isEnd = typeof totalStops === 'number' ? index === totalStops - 1 : false;

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const timer = setTimeout(() => setTracksViewChanges(false), 750);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.stopMarkerWrapper}>
        <View
          style={[
            styles.stopMarkerLabelContainer,
            isStart && styles.stopMarkerLabelContainerStart,
            isEnd && styles.stopMarkerLabelContainerEnd,
          ]}
        >
          <Text
            style={[
              styles.stopMarkerLabel,
              isStart && styles.stopMarkerLabelStart,
              isEnd && styles.stopMarkerLabelEnd,
            ]}
            allowFontScaling={false}
          >
            {stop.name || `Stop ${index + 1}`}
          </Text>
        </View>
        <View
          style={[
            styles.stopMarkerStem,
            isStart && styles.stopMarkerStemStart,
            isEnd && styles.stopMarkerStemEnd,
          ]}
        />
      </View>
      <Callout tooltip>
        <View style={styles.stopCallout}>
          <Text style={styles.stopCalloutTitle}>{stop.name || `Stop ${index + 1}`}</Text>
          <Text style={styles.stopCalloutSubtitle}>
            Lat: {stop.latitude.toFixed(5)} • Lng: {stop.longitude.toFixed(5)}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
});

const MapScreen = ({ route, navigation }) => {
  const [busLocation, setBusLocation] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [userInfo, setUserInfo] = useState({}); // Changed from studentInfo to userInfo
  const [loading, setLoading] = useState(true);
  const [mapRef, setMapRef] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeFetchError, setRouteFetchError] = useState('');
  const [hasCenteredOnBus, setHasCenteredOnBus] = useState(false);
  
  const busCoordinate = useRef(
    new AnimatedRegion({
      latitude: 11.0148359,
      longitude: 77.0642338,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    })
  ).current;
  
  const markerRef = useRef(null);
  const routeKeyRef = useRef('');
  const hasFittedRouteRef = useRef(false);

  const fetchRoutePolyline = useCallback(
  async (coordinates, stopsForRoute) => {
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        setRoutePolyline([]);
        return;
      }

      if (!ORS_API_KEY) {
        console.warn('⚠️ [MAP] ORS API key missing. Skipping route fetch.');
        const straightLineFallback = coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        const enforcedRoute = mergeStopsIntoPolyline(straightLineFallback, stopsForRoute);
        setRoutePolyline(enforcedRoute);
        return;
      }

      try {
        setIsRouteLoading(true);
        setRouteFetchError('');

        console.log('🗺️ [MAP] Requesting ORS route with coordinates:', JSON.stringify(coordinates));
        console.log('🚌 [MAP] Route stops provided:', JSON.stringify(stopsForRoute));

        const response = await fetch(ORS_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ coordinates }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ORS request failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const geometry = data?.features?.[0]?.geometry?.coordinates ?? [];

        console.log(`🛰️ [MAP] ORS response geometry points: ${geometry.length}`);
        console.log('📍 [MAP] First ORS point:', geometry[0]);
        console.log('📍 [MAP] Last ORS point:', geometry[geometry.length - 1]);

        if (!geometry.length) {
          throw new Error('No geometry data returned from ORS response.');
        }

        let formatted = geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        formatted = includeEndpoint(formatted, coordinates[0], 'start');
        formatted = includeEndpoint(formatted, coordinates[coordinates.length - 1], 'end');
        formatted = mergeStopsIntoPolyline(formatted, stopsForRoute);

        console.log(`✅ [MAP] Final polyline points after enforcement: ${formatted.length}`);

        setRoutePolyline(formatted);
      } catch (error) {
        console.error('❌ [MAP] Failed to fetch ORS route polyline:', error);
        setRouteFetchError('Unable to load optimized route. Showing straight-line preview.');
        const straightLine = coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        const enforcedRoute = mergeStopsIntoPolyline(straightLine, stopsForRoute);
        setRoutePolyline(enforcedRoute);
      } finally {
        setIsRouteLoading(false);
      }
    },
    [ORS_API_KEY]
  );

  // Get bus details from route params (for management) or from user info (for students)
  const busIdFromParams = route?.params?.busId;
  const routeStopsFromParams = route?.params?.routeStops;
  const busDisplayNameFromParams = route?.params?.busDisplayName;
  const roleFromParams = route?.params?.role;
  const busDisplayName = useMemo(() => {
    const candidateStrings = [
      typeof busDisplayNameFromParams === 'string' ? busDisplayNameFromParams : null,
      typeof userInfo.busDisplayName === 'string' ? userInfo.busDisplayName : null,
      typeof userInfo.busName === 'string' ? userInfo.busName : null,
      typeof userInfo.busLabel === 'string' ? userInfo.busLabel : null,
      typeof userInfo.busNumber === 'string' ? userInfo.busNumber : null,
      userInfo.busId ? String(userInfo.busId) : null,
    ];

    const resolved = candidateStrings.find((value) => value && value.trim().length > 0);
    return resolved ? resolved.trim() : null;
  }, [busDisplayNameFromParams, userInfo.busDisplayName, userInfo.busName, userInfo.busLabel, userInfo.busNumber, userInfo.busId]);
  const [isStudentView, setIsStudentView] = useState(() => {
    if (typeof roleFromParams === 'string') {
      return roleFromParams.toLowerCase() === 'student';
    }
    return true; // default to student-safe view until role resolved
  });

  const resolvedRouteStops = useMemo(() => {
    const parsedStops = Array.isArray(routeStopsFromParams)
      ? normalizeRouteStops(routeStopsFromParams)
      : [];

    if (parsedStops.length >= 2) {
      return parsedStops;
    }

    return DEFAULT_ROUTE_STOPS;
  }, [routeStopsFromParams]);

  const routeFitCoordinates = useMemo(
    () =>
      resolvedRouteStops.map((stop) => ({
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
    [resolvedRouteStops]
  );

  const orsCoordinatePayload = useMemo(() => {
    const payload = resolvedRouteStops.flatMap((stop, stopIndex) => {
      const baseCoordinate = [[stop.longitude, stop.latitude]];

      if (!Array.isArray(stop.pathToNext) || stop.pathToNext.length === 0) {
        return baseCoordinate;
      }

      const shapingCoordinates = stop.pathToNext
        .map((point, pointIndex) => {
          if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
            console.warn(
              `⚠️ [MAP] Ignoring invalid shaping point at stop index ${stopIndex} (segment ${pointIndex})`,
              point
            );
            return null;
          }
          return [point.longitude, point.latitude];
        })
        .filter(Boolean);

      return [...baseCoordinate, ...shapingCoordinates];
    });

    console.log('🧭 [MAP] ORS payload coordinates:', JSON.stringify(payload));

    return payload;
  }, [resolvedRouteStops]);

  useEffect(() => {
    console.log('🧭 [MAP] Resolved route stops:', JSON.stringify(resolvedRouteStops));
  }, [resolvedRouteStops]);

  useEffect(() => {
    loadUserData();
    getUserLocation();
    
    // Cleanup function
    return () => {
      // Will be set by subscribeToBusLocation
    };
  }, []);

  useEffect(() => {
    const coordinates =
      Array.isArray(orsCoordinatePayload) && orsCoordinatePayload.length >= 2
        ? orsCoordinatePayload
        : ORS_ROUTE_COORDINATES;

    const coordinateKey = JSON.stringify(coordinates);
    if (coordinateKey === routeKeyRef.current) {
      return;
    }

    routeKeyRef.current = coordinateKey;
    hasFittedRouteRef.current = false;
    fetchRoutePolyline(coordinates, resolvedRouteStops);
  }, [fetchRoutePolyline, orsCoordinatePayload, resolvedRouteStops]);

  // �🔥 Subscribe to real-time bus location updates from Firestore
  useEffect(() => {
    let unsubscribe = null;
    let timeoutId = null;
    
    // Determine which bus to track
    const busToTrack = busIdFromParams || userInfo.busNumber || userInfo.busId;
    
    if (busToTrack) {
      const userRole = roleFromParams || userInfo.role || 'management';
      console.log(`🔥 [${userRole.toUpperCase()}] Setting up real-time GPS tracking for bus:`, busToTrack);
      console.log(`🔍 [${userRole.toUpperCase()}] User info:`, JSON.stringify(userInfo));
      
      // Set timeout for loading state (5 seconds)
      timeoutId = setTimeout(() => {
        console.log(`⏱️ [${userRole.toUpperCase()}] Loading timeout - setting loading to false`);
        setLoading(false);
      }, 5000);
      
      unsubscribe = subscribeToBusLocation(
        busToTrack,
        (locationData) => {
          // Clear timeout since we got data
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          console.log(`📦 [${userRole.toUpperCase()}] Raw location data received:`, JSON.stringify(locationData));
          
          if (locationData && locationData.currentLocation) {
            console.log(`📍 [${userRole.toUpperCase()}] Real-time bus location update:`, JSON.stringify(locationData.currentLocation));
            console.log(`🔥 [${userRole.toUpperCase()}] Is tracking:`, locationData.isTracking);
            console.log(`🚀 [${userRole.toUpperCase()}] Speed:`, locationData.speed);
            console.log(`👤 [${userRole.toUpperCase()}] Driver:`, locationData.driverName);
            
            const newLocation = {
              latitude: locationData.currentLocation.latitude,
              longitude: locationData.currentLocation.longitude,
              timestamp: locationData.lastUpdate,
              driverName: locationData.driverName || 'Driver',
              isTracking: locationData.isTracking,
              speed: locationData.speed,
              heading: locationData.heading || 0
            };
            
            setBusLocation(newLocation);

            if (mapRef && mapReady) {
              showAllLocations();
            }
            
            // Smooth animation for marker
            busCoordinate.timing({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              duration: 1000,
              useNativeDriver: false,
            }).start();
            
            // Auto-follow camera with rotation when tracking
            if (locationData.isTracking && mapRef) {
              mapRef.animateCamera({
                center: {
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                },
                heading: newLocation.heading,
                pitch: 45,
                zoom: 17,
              }, { duration: 1000 });
            }
            
            console.log(`✅ [${userRole.toUpperCase()}] Bus location state updated successfully`);
            setHasCenteredOnBus(false);
            setLoading(false);
          } else if (locationData && !locationData.isTracking) {
            console.log(`⚠️ [${userRole.toUpperCase()}] Bus stopped tracking - clearing map`);
            console.log(`🛑 [${userRole.toUpperCase()}] isTracking:`, locationData.isTracking);
            setBusLocation(null); // Clear location so marker disappears
            setHasCenteredOnBus(false);
            if (mapRef && mapReady && studentLocation) {
              centerMapOnStudent();
            }
            setLoading(false);
          } else {
            console.log(`⚠️ [${userRole.toUpperCase()}] Bus not currently tracking`);
            console.log(`⚠️ [${userRole.toUpperCase()}] Full data:`, JSON.stringify(locationData));
            setBusLocation(null);
            setHasCenteredOnBus(false);
            if (mapRef && mapReady) {
              if (studentLocation) {
                centerMapOnStudent();
              } else {
                mapRef.animateToRegion(
                  {
                    latitude: 11.0168,
                    longitude: 76.9558,
                    latitudeDelta: 0.15,
                    longitudeDelta: 0.15,
                  },
                  800
                );
              }
            }
            setLoading(false);
          }
        },
        (error) => {
          console.error(`❌ [${userRole.toUpperCase()}] Error in real-time location updates:`, error);
          console.error(`❌ [${userRole.toUpperCase()}] Error message:`, error.message);
          console.error(`❌ [${userRole.toUpperCase()}] Error stack:`, error.stack);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setLoading(false);
        }
      );
      
      console.log(`📡 [${userRole.toUpperCase()}] Subscription setup complete for bus:`, busToTrack);
    }
    
    // Cleanup subscription on unmount or when bus changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
  const userRole = roleFromParams || userInfo.role || 'management';
        console.log(`🛑 [${userRole.toUpperCase()}] Unsubscribing from bus location updates`);
        unsubscribe();
      }
    };
  }, [userInfo.busNumber, userInfo.busId, busIdFromParams, roleFromParams]);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUserInfo(userData);
        console.log(`✅ [${userData.role?.toUpperCase() || 'USER'}] User data loaded:`, userData.name || userData.email);
      } else {
        console.warn('No authenticated user found for map view');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ [STUDENT] Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setStudentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('✅ [STUDENT] Got user location:', location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log('⚠️ [STUDENT] Could not get user location (device may not support GPS):', error.message);
      // Don't show error on emulator or devices without GPS
    }
  };

  const centerMapOnBus = useCallback(() => {
    if (busLocation && mapRef) {
      mapRef.animateToRegion(
        {
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [busLocation, mapRef]);

  const centerMapOnStudent = useCallback(() => {
    if (studentLocation && mapRef) {
      mapRef.animateToRegion(
        {
          latitude: studentLocation.latitude,
          longitude: studentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [studentLocation, mapRef]);

  const showAllLocations = useCallback(() => {
    if (!mapRef || !mapReady) {
      return;
    }

    const locations = [];

    if (busLocation?.isTracking) {
      locations.push({ latitude: busLocation.latitude, longitude: busLocation.longitude });
    }

    if (studentLocation) {
      locations.push({ latitude: studentLocation.latitude, longitude: studentLocation.longitude });
    }

    const routePoints = routePolyline.length
      ? routePolyline
      : routeFitCoordinates.length
      ? routeFitCoordinates
      : ROUTE_POLYLINE_FIT_COORDINATES;

    if (routePoints.length) {
      locations.push(...routePoints);
    }

    if (locations.length === 0) {
      return;
    }

    if (locations.length === 1) {
      const target = locations[0];
      mapRef.animateToRegion(
        {
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        800
      );
      return;
    }

    mapRef.fitToCoordinates(
      locations,
      {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      }
    );
  }, [busLocation, mapReady, mapRef, routeFitCoordinates, routePolyline, studentLocation]);

  const firstGeoStop =
    routePolyline[0] ||
    routeFitCoordinates[0] ||
    resolvedRouteStops.find((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)) ||
    null;

  const resolvedBusLabel = (busDisplayName || busIdFromParams || userInfo.busNumber || userInfo.busId || 'Bus')
    .toString()
    .replace(/-+/g, '-');

  const resolvedRole = (roleFromParams || userInfo.role || '').toLowerCase();
  useEffect(() => {
    if (resolvedRole) {
      setIsStudentView(resolvedRole === 'student');
    }
  }, [resolvedRole]);

  useEffect(() => {
    if (!mapRef || !mapReady) {
      return;
    }

    const routePoints = routePolyline.length
      ? routePolyline
      : routeFitCoordinates.length
      ? routeFitCoordinates
      : ROUTE_POLYLINE_FIT_COORDINATES;

    if (!hasFittedRouteRef.current && routePoints.length >= 2) {
      mapRef.fitToCoordinates(routePoints, {
        edgePadding: { top: 100, right: 60, bottom: 140, left: 60 },
        animated: true,
      });
      hasFittedRouteRef.current = true;
      return;
    }

    if (busLocation?.latitude && busLocation?.longitude && !hasCenteredOnBus) {
      mapRef.animateCamera(
        {
          center: {
            latitude: busLocation.latitude,
            longitude: busLocation.longitude,
          },
          heading: busLocation.heading || 0,
          pitch: 45,
          zoom: 17,
        },
        { duration: 800 }
      );
      setHasCenteredOnBus(true);
      return;
    }

    if (!busLocation && studentLocation && !hasCenteredOnBus) {
      centerMapOnStudent();
      setHasCenteredOnBus(true);
    }
  }, [busLocation, mapReady, mapRef, routeFitCoordinates, routePolyline, studentLocation, hasCenteredOnBus, centerMapOnStudent]);

  useEffect(() => {
    setHasCenteredOnBus(false);
  }, [busIdFromParams]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {busDisplayName ? `${busDisplayName} • Live GPS` : '🔥 Live GPS Tracking'}
        </Text>
        <View style={styles.refreshButton}>
          <Ionicons name="radio" size={24} color={COLORS.success} />
        </View>
      </View>

      <MapView
        ref={setMapRef}
        provider={PROVIDER_GOOGLE}
        onMapReady={() => setMapReady(true)}
        style={styles.map}
        initialRegion={{
          latitude: busLocation?.latitude || firstGeoStop?.latitude || 11.0168,
          longitude: busLocation?.longitude || firstGeoStop?.longitude || 76.9558,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {routePolyline.length > 0 && (
          <Polyline
            coordinates={routePolyline}
            strokeWidth={6}
            strokeColor={COLORS.secondary}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {resolvedRouteStops.map((stop, index) => (
          <StopMarker
            key={stop.id || `route-stop-${index}`}
            stop={stop}
            index={index}
            totalStops={resolvedRouteStops.length}
          />
        ))}
        
        {/* Bus Location Marker - Animated & Only show when actively tracking */}
        {busLocation && busLocation.isTracking && (
          <Marker.Animated
            ref={markerRef}
            coordinate={busCoordinate}
            anchor={Platform.select({ ios: { x: 0.5, y: 0.92 }, default: { x: 0.5, y: 0.6 } })}
            // Keep the badge above Android's extruded buildings without altering the iOS layout
            flat
            tracksViewChanges={Platform.OS === 'android'}
            zIndex={9999}
            priority="high"
          >
            <Animated.View
              style={styles.busMarkerContainer}
              renderToHardwareTextureAndroid
            >
              <View
                style={[styles.busHeadingBadge, {
                  transform: [{ rotate: `${busLocation.heading || 0}deg` }],
                }]}
              >
                <Ionicons name="navigate" size={14} color={COLORS.white} />
              </View>
              <View style={styles.busBadgeWrapper}>
                <View style={styles.busBadgeIconBubble}>
                  <Ionicons name="bus" size={22} color={COLORS.secondary} />
                </View>
                <View style={styles.busBadgeTextColumn}>
                  <Text style={styles.busBadgeTitle}>{resolvedBusLabel}</Text>
                  <Text style={styles.busBadgeSubtitle}>
                    {Number.isFinite(busLocation.speed)
                      ? `${(busLocation.speed * 3.6).toFixed(0)} km/h`
                      : 'Live tracking'}
                  </Text>
                </View>
              </View>
              <View style={styles.busBadgePointer} />
            </Animated.View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{resolvedBusLabel}</Text>
                <Text style={styles.calloutText}>Driver: {busLocation.driverName}</Text>
                <Text style={styles.calloutText}>Speed: {(busLocation.speed * 3.6).toFixed(1)} km/h</Text>
              </View>
            </Callout>
          </Marker.Animated>
        )}

        {/* Student Location Marker */}
        {studentLocation && (
          <Marker
            coordinate={studentLocation}
            title="Your Location"
            description="You are here"
            pinColor={COLORS.accent}
          >
            <View style={styles.studentMarker}>
              <Ionicons name="person" size={25} color={COLORS.white} />
            </View>
          </Marker>
        )}

        {/* Route overlays intentionally omitted for full-screen map view */}
      </MapView>

      {isRouteLoading && (
        <View style={styles.routeLoadingBadge}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.routeLoadingText}>Loading route…</Text>
        </View>
      )}

      {routeFetchError ? (
        <View style={styles.routeErrorBanner}>
          <Ionicons name="information-circle" size={16} color={COLORS.warning} />
          <Text style={styles.routeErrorText}>{routeFetchError}</Text>
        </View>
      ) : null}

      {/* Minimal Status Card - Only show when tracking */}
      {!isStudentView && busLocation && busLocation.isTracking && (
        <View style={styles.minimalStatusCard}>
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.minimalSpeed}>
            {(busLocation.speed * 3.6).toFixed(0)} km/h
          </Text>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerMapOnBus}>
          <Ionicons name="bus" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={centerMapOnStudent}>
          <Ionicons name="person" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={showAllLocations}>
          <Ionicons name="resize" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  refreshButton: {
    padding: 5,
  },
  map: {
    flex: 1,
  },
  busHeadingBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    marginBottom: -8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  stopMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentMarker: {
    backgroundColor: COLORS.accent,
    borderRadius: 17.5,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  minimalStatusCard: {
    position: 'absolute',
    top: 60,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  minimalSpeed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 10,
  },
  liveIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 5,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  busMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    paddingBottom: 10,
    transform: [{ translateY: Platform.OS === 'android' ? -26 : -10 }],
  },
  busBadgeWrapper: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 6,
  },
  busBadgeIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
  },
  busBadgeTextColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  busBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  busBadgeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    letterSpacing: 0.2,
  },
  busBadgePointer: {
    marginTop: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  calloutContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 3,
  },
  mapControls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: COLORS.secondary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopMarkerLabelContainer: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.82)',
    maxWidth: 260,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  stopMarkerLabelContainerStart: {
    backgroundColor: 'rgba(33,150,243,0.85)',
  },
  stopMarkerLabelContainerEnd: {
    backgroundColor: 'rgba(244,67,54,0.9)',
  },
  stopMarkerLabel: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  stopMarkerLabelStart: {
    color: COLORS.white,
  },
  stopMarkerLabelEnd: {
    color: COLORS.white,
  },
  stopMarkerStem: {
    width: 3,
    height: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
    marginTop: -1,
  },
  stopMarkerStemStart: {
    backgroundColor: COLORS.info,
  },
  stopMarkerStemEnd: {
    backgroundColor: COLORS.danger,
  },
  stopCallout: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  stopCalloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  stopCalloutSubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  routeLoadingBadge: {
    position: 'absolute',
    top: 92,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  routeLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  routeErrorBanner: {
    position: 'absolute',
    top: 92,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  routeErrorText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
});

export default MapScreen;
