import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';

const BusDetails = ({ route, navigation }) => {
  const { bus, role = 'management' } = route.params || {};
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
    <SafeAreaView style={styles.container}>
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
                onPress={() =>
                  navigation.navigate('StudentManagement', {
                    busId: busNumber,
                    role,
                  })
                }
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
                      role,
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
                role,
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
                role,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  busInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginRight: 15,
  },
  busMainInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  driverName: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  loadingBlock: {
    padding: 20,
    alignItems: 'center',
  },
  loadingBlockText: {
    marginTop: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  sectionAction: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  routeIndicator: {
    alignItems: 'center',
    marginRight: 15,
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
    marginTop: 5,
  },
  routeStop: {
    fontSize: 16,
    color: COLORS.secondary,
  },
  emptyRouteText: {
    textAlign: 'center',
    color: COLORS.gray,
    marginTop: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary100,
    paddingHorizontal: 16,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentPreviewList: {
    marginTop: 4,
  },
  studentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentPreviewMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  studentPreviewName: {
    fontWeight: '600',
    color: COLORS.secondary,
  },
  studentPreviewSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  studentRoll: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default BusDetails;
