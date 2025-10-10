import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const CoAdminAttendanceHistory = ({ route, navigation }) => {
  const { busId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    averagePresent: 0,
    averageAbsent: 0,
    totalStudents: 0
  });

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      
      // Get current Co-Admin
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'coadmin') {
        Alert.alert('Error', 'You must be logged in as Co-Admin');
        navigation.goBack();
        return;
      }

      const coadminBusId = busId || currentUser.busId;
      console.log(`🔍 [COADMIN ATTENDANCE HISTORY] Loading for bus: ${coadminBusId}`);
      
      // Fetch attendance records from Firebase
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('busNumber', '==', coadminBusId)
      );

      console.log(`📦 [COADMIN ATTENDANCE HISTORY] Querying attendance for bus: ${coadminBusId}`);
      const attendanceSnapshot = await getDocs(attendanceQuery);
      console.log(`📦 [COADMIN ATTENDANCE HISTORY] Found ${attendanceSnapshot.size} attendance documents`);
      
      const records = [];
      let totalPresent = 0;
      let totalAbsent = 0;
      let studentCountSet = new Set();

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        const students = data.students || {};
        const studentIds = Object.keys(students);
        
        let presentCount = 0;
        let absentCount = 0;
        
        studentIds.forEach(studentId => {
          studentCountSet.add(studentId);
          const studentData = students[studentId];
          if (studentData.status === 'present') presentCount++;
          if (studentData.status === 'absent') absentCount++;
        });
        
        totalPresent += presentCount;
        totalAbsent += absentCount;
        
        const record = {
          id: doc.id,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          busNumber: data.busNumber,
          submittedBy: data.submittedBy || 'Unknown',
          totalStudents: studentIds.length,
          presentCount,
          absentCount,
          students: students
        };
        
        records.push(record);
      });

      // Sort records by date descending (newest first) and limit to 60 days
      const sortedRecords = records
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 60);

      const totalDays = sortedRecords.length;
      const avgPresent = totalDays > 0 ? (totalPresent / totalDays).toFixed(1) : 0;
      const avgAbsent = totalDays > 0 ? (totalAbsent / totalDays).toFixed(1) : 0;

      setAttendanceRecords(sortedRecords);
      setStats({
        totalDays,
        averagePresent: parseFloat(avgPresent),
        averageAbsent: parseFloat(avgAbsent),
        totalStudents: studentCountSet.size
      });

      console.log(`✅ [COADMIN ATTENDANCE HISTORY] Loaded ${sortedRecords.length} records for bus ${coadminBusId}`);
    } catch (error) {
      console.error('❌ [COADMIN ATTENDANCE HISTORY] Error:', error);
      Alert.alert('Error', 'Failed to load attendance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceHistory();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAttendanceRate = (present, total) => {
    if (total === 0) return 0;
    return ((present / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading attendance history...</Text>
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
        <Text style={styles.headerTitle}>Attendance History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.totalDays}</Text>
            <Text style={styles.statLabel}>Days Marked</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={COLORS.info} />
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.averagePresent}</Text>
            <Text style={styles.statLabel}>Avg Present</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            <Text style={styles.statValue}>{stats.averageAbsent}</Text>
            <Text style={styles.statLabel}>Avg Absent</Text>
          </View>
        </View>

        {/* Attendance Records */}
        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>
            Attendance Records ({attendanceRecords.length})
          </Text>

          {attendanceRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No attendance records yet</Text>
              <Text style={styles.emptySubtext}>
                Start marking daily attendance to see history
              </Text>
            </View>
          ) : (
            attendanceRecords.map((record) => {
              const attendanceRate = getAttendanceRate(record.presentCount, record.totalStudents);
              const rateColor = attendanceRate >= 80 ? COLORS.success : attendanceRate >= 50 ? COLORS.warning : COLORS.danger;
              
              return (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.dateContainer}>
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                      <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                    </View>
                    <View style={[styles.rateBadge, { backgroundColor: rateColor }]}>
                      <Text style={styles.rateText}>{attendanceRate}%</Text>
                    </View>
                  </View>

                  <View style={styles.recordStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="people" size={16} color={COLORS.gray} />
                      <Text style={styles.statItemText}>
                        {record.totalStudents} Total
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={[styles.statItemText, { color: COLORS.success }]}>
                        {record.presentCount} Present
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                      <Text style={[styles.statItemText, { color: COLORS.danger }]}>
                        {record.absentCount} Absent
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordFooter}>
                    <Text style={styles.submittedBy}>
                      Marked by: {record.submittedBy}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  recordsSection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recordDate: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.secondary,
  },
  rateBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  rateText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  recordStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  submittedBy: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});

export default CoAdminAttendanceHistory;
