import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';

const BusDetails = ({ route, navigation }) => {
  const { bus, role: routeRole = 'management' } = route.params;
  const busNumber = bus.number || bus.busNumber || '';
  const driverName = bus.driverName || bus.driver || 'Not Assigned';
  const busStatus = bus.status || 'Inactive';
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [topStudents, setTopStudents] = useState([]);
  const [routeStops, setRouteStops] = useState([]);

  useEffect(() => {
    loadRealStudentCount();
  }, []);

  const loadRealStudentCount = async () => {
    try {
      setLoading(true);
      const normalizedBus = normalizeBusNumber(busNumber);
      const usersRef = collection(db, 'users');

      let studentsSnapshot = await getDocs(query(usersRef, where('busNumber', '==', normalizedBus)));

      if (studentsSnapshot.empty) {
        studentsSnapshot = await getDocs(query(usersRef, where('busNo', '==', normalizedBus)));
      }

      const studentsData = studentsSnapshot.docs
        .map((studentDoc) => studentDoc.data())
        .filter((data) => (data.role || '').toLowerCase() === 'student' && (data.status || '').toLowerCase() !== 'inactive')
        .map((data, index) => ({
          name: data.name || data.fullName || data.studentName || 'Unnamed Student',
          registerNumber: data.registerNumber || data.rollNumber || `REG-${index + 1}`,
          boardingPoint: data.boardingPoint || data.boardingSite || 'Not Assigned',
          department: data.department || 'General',
          year: data.year,
          order: data.order || index + 1,
        }))
        .sort((a, b) => a.order - b.order);

      console.log(`✅ [BUS DETAILS] Found ${studentsData.length} students for bus ${normalizedBus}`);
      setStudentCount(studentsData.length);
      setTopStudents(studentsData.slice(0, 5));

      const busDocRef = doc(db, 'buses', normalizedBus);
      const busDocSnap = await getDoc(busDocRef);
      const stopsFromDoc = busDocSnap.exists() ? busDocSnap.data().routeStops || [] : [];

      if (stopsFromDoc.length > 0) {
        const dedupedStops = [];
        stopsFromDoc.forEach((stop) => {
          let stopName = '';
          if (typeof stop === 'string') {
            stopName = stop.trim();
          } else if (stop) {
            stopName = (stop.name || stop.stopName || stop.point || '').trim();
          }

          if (stopName && !dedupedStops.includes(stopName)) {
            dedupedStops.push(stopName);
          }
        });

        setRouteStops(dedupedStops);
      } else {
        const uniqueStops = [];
        studentsData.forEach((student) => {
          const stop = (student.boardingPoint || '').trim();
          if (stop && !uniqueStops.includes(stop)) {
            uniqueStops.push(stop);
          }
        });
        setRouteStops(uniqueStops);
      }
    } catch (error) {
      console.error('❌ [BUS DETAILS] Error loading students:', error);
      setStudentCount(0);
      setTopStudents([]);
      setRouteStops([]);
    } finally {
      setLoading(false);
    }
  };

  const previewRouteStops = useMemo(() => routeStops.slice(0, 8), [routeStops]);
  const hasMoreStops = routeStops.length > previewRouteStops.length;

  const getBusStatusColor = (status) => {
    return status === 'Active' ? COLORS.success : COLORS.danger;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bus Info Card */}
        <View style={styles.busInfoCard}>
          <View style={styles.busHeader}>
            <View style={styles.busIconContainer}>
              <Ionicons name="bus" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.busMainInfo}>
              <Text style={styles.busNumber}>{busNumber}</Text>
              <Text style={styles.driverName}>Driver: {driverName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getBusStatusColor(busStatus) }]}>
                <Text style={styles.statusText}>{busStatus}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.statNumber}>{studentCount}</Text>
            )}
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{routeStops.length}</Text>
            <Text style={styles.statLabel}>Stops</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Min Route</Text>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          {previewRouteStops.map((stop, index) => (
            <View key={index} style={styles.routeItem}>
              <View style={styles.routeIndicator}>
                <View style={[styles.routeDot, { backgroundColor: index === 0 ? COLORS.success : COLORS.gray }]} />
                {index < previewRouteStops.length - 1 && <View style={styles.routeLine} />}
              </View>
              <Text style={styles.routeStop}>{stop}</Text>
            </View>
          ))}
          {!loading && routeStops.length === 0 && (
            <Text style={styles.emptyRouteText}>No stops registered for this bus yet.</Text>
          )}
          {hasMoreStops && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('RouteManagement', { busId: busNumber })}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              <Text style={styles.viewAllButtonText}>View full route</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Students List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Students {loading ? '...' : `(${studentCount})`}
            </Text>
            {!loading && studentCount > 5 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('StudentManagement', { busId: busNumber })}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionAction}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingBlockText}>Loading students...</Text>
            </View>
          ) : topStudents.length === 0 ? (
            <View style={styles.loadingBlock}>
              <Ionicons name="people-outline" size={48} color={COLORS.gray} />
              <Text style={styles.loadingBlockText}>No active students registered yet.</Text>
            </View>
          ) : (
            <View style={styles.studentPreviewList}>
              {topStudents.map((student) => (
                <View key={student.registerNumber} style={styles.studentPreviewItem}>
                  <View style={styles.studentAvatar}>
                    <Ionicons name="person" size={18} color={COLORS.white} />
                  </View>
                  <View style={styles.studentPreviewMeta}>
                    <Text style={styles.studentPreviewName}>{student.name}</Text>
                    <Text style={styles.studentPreviewSub}>Reg: {student.registerNumber}</Text>
                    <Text style={styles.studentPreviewSub}>Boarding: {student.boardingPoint}</Text>
                  </View>
                </View>
              ))}
              {studentCount > topStudents.length && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() =>
                    navigation.navigate('StudentManagement', {
                      busId: busNumber,
                      role: routeRole,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="people" size={18} color={COLORS.primary} />
                  <Text style={styles.viewAllButtonText}>View all {studentCount} students</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('MapScreen', {
                busId: busNumber,
                role: routeRole,
              })
            }
          >
            <Ionicons name="map" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Track Live</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.warning }]}
            onPress={() =>
              navigation.navigate('BusEdit', {
                busId: busNumber,
                role: routeRole,
              })
            }
          >
            <Ionicons name="settings" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  busInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  busMainInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginVertical: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  loadingBlock: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  loadingBlockText: {
    marginTop: SPACING.sm,
    color: COLORS.gray,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  sectionAction: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeIndicator: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.lightGray,
    marginTop: SPACING.sm,
  },
  routeStop: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  emptyRouteText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: SPACING.sm,
    fontFamily: FONTS.regular,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}1A`,
    paddingHorizontal: SPACING.lg,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    marginLeft: SPACING.xs,
  },
  studentPreviewList: {
    marginTop: SPACING.xs,
  },
  studentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}0F`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studentPreviewMeta: {
    flex: 1,
  },
  studentPreviewName: {
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  studentPreviewSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    marginLeft: SPACING.xs,
  },
});

export default BusDetails;
