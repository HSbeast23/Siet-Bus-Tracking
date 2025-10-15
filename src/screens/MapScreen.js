import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	SafeAreaView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../utils/constants';
import { authService } from '../services/authService';
import { normalizeBusNumber, subscribeToBusLocation } from '../services/locationService';
import {
	DEFAULT_ROUTE_STOPS,
	buildOsrmRouteUrl,
	stopsToLatLng,
} from '../utils/routePolylineConfig';

const EDGE_PADDING = { top: 72, right: 48, bottom: 120, left: 48 };

const normaliseRouteStops = (rawStops) => {
	if (!Array.isArray(rawStops)) {
		return DEFAULT_ROUTE_STOPS;
	}

	const cleaned = rawStops
		.map((stop, index) => {
			if (!stop) {
				return null;
			}

			const latitude = Number(stop.latitude ?? stop.lat);
			const longitude = Number(stop.longitude ?? stop.lng);
			if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
				return null;
			}

			const name = (stop.name || stop.label || stop.stopName || `Stop ${index + 1}`).toString().trim();
			const id = stop.id || name || `stop-${index + 1}`;

			return {
				id,
				name,
				latitude,
				longitude,
			};
		})
		.filter(Boolean);

	return cleaned.length ? cleaned : DEFAULT_ROUTE_STOPS;
};

const MapScreen = ({ route, navigation }) => {
	const mapRef = useRef(null);

	const [mapReady, setMapReady] = useState(false);
	const [routeStops, setRouteStops] = useState(DEFAULT_ROUTE_STOPS);
	const [osrmPolyline, setOsrmPolyline] = useState([]);
	const [fetchingRoute, setFetchingRoute] = useState(false);
	const [routeWarning, setRouteWarning] = useState('');

	const [role, setRole] = useState('student');
	const [busDisplayName, setBusDisplayName] = useState('');
	const [busId, setBusId] = useState('');

	const [busLocation, setBusLocation] = useState(null);
	const [isBusTracking, setIsBusTracking] = useState(false);
	const [studentLocation, setStudentLocation] = useState(null);
	const [loading, setLoading] = useState(true);

	const initialRegion = useMemo(() => {
		const firstStop = routeStops[0];
		if (!firstStop) {
			return {
				latitude: 11.04104,
				longitude: 77.07738,
				latitudeDelta: 0.2,
				longitudeDelta: 0.2,
			};
		}

		return {
			latitude: firstStop.latitude,
			longitude: firstStop.longitude,
			latitudeDelta: 0.12,
			longitudeDelta: 0.12,
		};
	}, [routeStops]);

	const routeOnlyCoordinates = useMemo(() => stopsToLatLng(routeStops), [routeStops]);

	const allMapPoints = useMemo(() => {
		const points = [...routeOnlyCoordinates];
		if (busLocation) {
			points.push(busLocation);
		}
		if (studentLocation) {
			points.push(studentLocation);
		}
		return points;
	}, [routeOnlyCoordinates, busLocation, studentLocation]);

	const ensureStudentLocation = useCallback(async () => {
		try {
			const permission = await Location.requestForegroundPermissionsAsync();
			if (permission.status !== 'granted') {
				return;
			}

			const currentPosition = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			if (currentPosition?.coords) {
				setStudentLocation({
					latitude: currentPosition.coords.latitude,
					longitude: currentPosition.coords.longitude,
				});
			}
		} catch (error) {
			console.error('Unable to determine current location', error);
		}
	}, []);

	const fetchOsrmPolyline = useCallback(async (stops) => {
		if (!Array.isArray(stops) || stops.length < 2) {
			setOsrmPolyline(stopsToLatLng(stops));
			return;
		}

		const url = buildOsrmRouteUrl(stops);
		if (!url) {
			setOsrmPolyline(stopsToLatLng(stops));
			setRouteWarning('Cannot build OSRM request – showing straight segments.');
			return;
		}

		try {
			setFetchingRoute(true);
			setRouteWarning('');

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`OSRM request failed with status ${response.status}`);
			}

			const json = await response.json();
			const geometry = json?.routes?.[0]?.geometry?.coordinates;
			if (!Array.isArray(geometry)) {
				throw new Error('OSRM response missing geometry.');
			}

			setOsrmPolyline(
				geometry.map(([longitude, latitude]) => ({ latitude, longitude }))
			);
		} catch (error) {
			console.error('Failed to fetch OSRM polyline', error);
			setOsrmPolyline(stopsToLatLng(stops));
			setRouteWarning('OSRM unreachable. Displaying straight-line fallback.');
		} finally {
			setFetchingRoute(false);
		}
	}, []);

	useEffect(() => {
		if (routeStops.length) {
			fetchOsrmPolyline(routeStops);
		}
	}, [routeStops, fetchOsrmPolyline]);

	useEffect(() => {
		let unsubscribeFromBus = null;

		const initialise = async () => {
			setLoading(true);
			try {
				const currentUser = await authService.getCurrentUser();
				const resolvedRole = (route?.params?.role || currentUser?.role || 'student').toLowerCase();
				setRole(resolvedRole);

				const providedStops = normaliseRouteStops(route?.params?.routeStops);
				setRouteStops(providedStops);

				const rawBus =
					route?.params?.busId ||
					route?.params?.busNumber ||
					route?.params?.busDisplayName ||
					currentUser?.busId ||
					currentUser?.busNumber ||
					'';
				const normalizedBus = normalizeBusNumber(rawBus);
				if (normalizedBus) {
					setBusId(normalizedBus);
					setBusDisplayName(route?.params?.busDisplayName || normalizedBus);

					unsubscribeFromBus = subscribeToBusLocation(
						normalizedBus,
						(snapshot) => {
							const trackingActive = Boolean(snapshot?.isTracking);
							const coords = snapshot?.currentLocation;
							const hasValidCoords = Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude);

							if (trackingActive && hasValidCoords) {
								setBusLocation({ latitude: Number(coords.latitude), longitude: Number(coords.longitude) });
								setIsBusTracking(true);
							} else {
								setBusLocation(null);
								setIsBusTracking(false);
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
					await ensureStudentLocation();
				} else if (route?.params?.studentLocation) {
					setStudentLocation(route.params.studentLocation);
				}
			} catch (error) {
				console.error('Failed to initialise map screen', error);
				Alert.alert('Map Error', 'Unable to load map data. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		initialise();

		return () => {
			if (typeof unsubscribeFromBus === 'function') {
				unsubscribeFromBus();
			}
			setBusLocation(null);
			setIsBusTracking(false);
		};
	}, [route, ensureStudentLocation]);

	const fitRoute = useCallback(() => {
		if (!mapRef.current || routeOnlyCoordinates.length === 0) {
			return;
		}

		mapRef.current.fitToCoordinates(routeOnlyCoordinates, {
			edgePadding: EDGE_PADDING,
			animated: true,
		});
	}, [routeOnlyCoordinates]);

	const focusOnBus = useCallback(() => {
		if (!mapRef.current || !busLocation || !isBusTracking) {
			return;
		}

		mapRef.current.animateCamera({ center: busLocation, zoom: 16 }, { duration: 600 });
	}, [busLocation, isBusTracking]);

	const focusOnStudent = useCallback(() => {
		if (!mapRef.current || !studentLocation) {
			return;
		}

		mapRef.current.animateCamera({ center: studentLocation, zoom: 16 }, { duration: 600 });
	}, [studentLocation]);

	const fitEverything = useCallback(() => {
		if (!mapRef.current || allMapPoints.length === 0) {
			return;
		}

		mapRef.current.fitToCoordinates(allMapPoints, {
			edgePadding: EDGE_PADDING,
			animated: true,
		});
	}, [allMapPoints]);

	useEffect(() => {
		if (mapReady) {
			fitRoute();
		}
	}, [mapReady, fitRoute]);

	if (loading) {
		return (
			<View style={styles.loaderContainer}>
				<ActivityIndicator size="large" color={COLORS.primary || '#0066CC'} />
				<Text style={styles.loaderLabel}>Preparing live map…</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()}>
					<Ionicons name="arrow-back" size={20} color="#1F2937" />
				</TouchableOpacity>
				<View>
					<Text style={styles.title}>Live Route Overview</Text>
					<Text style={styles.subtitle}>
						{busDisplayName ? `Tracking ${busDisplayName}` : 'Select a bus to begin tracking'}
					</Text>
				</View>
			</View>

			<View style={styles.mapContainer}>
				<MapView
					ref={mapRef}
					style={styles.map}
					provider={PROVIDER_GOOGLE}
					initialRegion={initialRegion}
					onMapReady={() => setMapReady(true)}
					showsCompass
					showsBuildings
					showsPointsOfInterest={false}
				>
					{osrmPolyline.length > 1 && (
						<Polyline
							coordinates={osrmPolyline}
							strokeColor={COLORS.success || '#22C55E'}
							strokeWidth={6}
						/>
					)}

					{routeStops.map((stop) => (
						<Marker
							key={stop.id || stop.name}
							coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
							title={stop.name}
							description="Scheduled stop"
							pinColor="red"
						/>
					))}

					{isBusTracking && busLocation && (
						<Marker
							coordinate={busLocation}
							title={busDisplayName || busId || 'Bus'}
							description="Current bus position"
							pinColor={COLORS.warning || '#FF8C00'}
						/>
					)}

					{studentLocation && (
						<Marker
							coordinate={studentLocation}
							title={role === 'student' ? 'You' : 'Student'}
							description="Student location"
							pinColor={COLORS.secondary || '#2563EB'}
						/>
					)}
				</MapView>

				<View style={styles.actionButtons}>
					<TouchableOpacity style={styles.circleButton} onPress={fitRoute}>
						<Ionicons name="navigate" size={20} color="#FFFFFF" />
					</TouchableOpacity>

					{isBusTracking && busLocation && (
						<TouchableOpacity style={styles.circleButton} onPress={focusOnBus}>
							<Ionicons name="bus" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					)}

					{studentLocation && (
						<TouchableOpacity style={styles.circleButton} onPress={focusOnStudent}>
							<Ionicons name="person" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					)}

					{allMapPoints.length > 0 && (
						<TouchableOpacity style={styles.circleButton} onPress={fitEverything}>
							<Ionicons name="scan" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					)}
				</View>

				{!!routeWarning && (
					<View style={styles.warningBanner}>
						<Ionicons name="warning" size={16} color="#DC2626" />
						<Text style={styles.warningText}>{routeWarning}</Text>
					</View>
				)}

				{fetchingRoute && (
					<View style={styles.routeLoader}>
						<ActivityIndicator size="small" color="#FFFFFF" />
						<Text style={styles.routeLoaderText}>Fetching OSRM route…</Text>
					</View>
				)}
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerLabel}>Stops • {routeStops.length}</Text>
				<View style={styles.footerDivider} />
				<Text style={styles.footerLabel}>Role • {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
				{busId ? (
					<Text style={styles.footerLabel}>Bus • {isBusTracking ? 'Live' : 'Offline'}</Text>
				) : null}
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		gap: 12,
	},
	backButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F3F4F6',
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
	},
	subtitle: {
		marginTop: 2,
		fontSize: 13,
		color: '#6B7280',
	},
	mapContainer: {
		flex: 1,
		position: 'relative',
	},
	map: {
		flex: 1,
	},
	actionButtons: {
		position: 'absolute',
		right: 16,
		bottom: 32,
		gap: 12,
	},
	circleButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: COLORS.primary || '#1D4ED8',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 3,
		elevation: 3,
	},
	warningBanner: {
		position: 'absolute',
		top: 16,
		left: 16,
		right: 16,
		borderRadius: 12,
		backgroundColor: '#FEE2E2',
		paddingVertical: 10,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	warningText: {
		flex: 1,
		color: '#B91C1C',
		fontSize: 12,
	},
	routeLoader: {
		position: 'absolute',
		alignSelf: 'center',
		bottom: 32,
		backgroundColor: '#111827',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 999,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	routeLoaderText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '500',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-evenly',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#E5E7EB',
		backgroundColor: '#FFFFFF',
	},
	footerLabel: {
		fontSize: 13,
		color: '#1F2937',
		fontWeight: '500',
	},
	footerDivider: {
		width: StyleSheet.hairlineWidth,
		height: 16,
		backgroundColor: '#E5E7EB',
	},
	loaderContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	loaderLabel: {
		marginTop: 12,
		fontSize: 14,
		color: '#4B5563',
	},
});

export default MapScreen;

