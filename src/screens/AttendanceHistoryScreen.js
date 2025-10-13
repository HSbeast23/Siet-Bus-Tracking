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
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const AttendanceHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  });
  const [student, setStudent] = useState(null);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      
      // Get current student
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        Alert.alert('Error', 'You must be logged in as a student');
        navigation.goBack();
        return;
      }

      setStudent(currentUser);
      
      console.log(`🔍 [ATTENDANCE HISTORY] Loading for student: ${currentUser.name}, Bus: ${currentUser.busNumber}, ID: ${currentUser.id}`);
      
      // Fetch attendance records from Firebase
      // Query by busNumber only (removed orderBy to avoid composite index requirement)
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('busNumber', '==', currentUser.busNumber) // Query by busNumber only
      );

      console.log(`📦 [ATTENDANCE HISTORY] Querying attendance for bus: ${currentUser.busNumber}`);
      const attendanceSnapshot = await getDocs(attendanceQuery);
      console.log(`📦 [ATTENDANCE HISTORY] Found ${attendanceSnapshot.size} attendance documents`);
      
      const records = [];
      let presentCount = 0;
      let absentCount = 0;

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📄 [ATTENDANCE HISTORY] Document ${doc.id}:`, JSON.stringify(data, null, 2));
        
        // Check if student exists in the students object
        const studentAttendance = data.students?.[currentUser.id];
        
        if (studentAttendance) {
          console.log(`   ✅ Found attendance for student ${currentUser.name}:`, studentAttendance);
          
          const record = {
            id: doc.id,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            status: studentAttendance.status,
            markedBy: studentAttendance.markedBy || 'Unknown',
            markedAt: studentAttendance.markedAt?.toDate ? studentAttendance.markedAt.toDate() : new Date(studentAttendance.markedAt || data.date),
            submittedBy: data.submittedBy || 'N/A'
          };
          
          records.push(record);
          
          if (studentAttendance.status === 'present') presentCount++;
          if (studentAttendance.status === 'absent') absentCount++;
        } else {
          console.log(`   ❌ Student ${currentUser.name} (${currentUser.id}) not found in this attendance record`);
          console.log(`   📋 Available student IDs:`, Object.keys(data.students || {}));
        }
      });

      const totalDays = presentCount + absentCount;
      const percentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : 0;

      // Sort records by date descending (newest first) and limit to 60 days
      const sortedRecords = records
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 60);

      setAttendanceRecords(sortedRecords);
      setStats({
        totalDays,
        presentDays: presentCount,
        absentDays: absentCount,
        attendancePercentage: parseFloat(percentage)
      });

      console.log(`✅ [ATTENDANCE HISTORY] Loaded ${sortedRecords.length} records for student ${currentUser.name}`);
    } catch (error) {
      console.error('❌ [ATTENDANCE HISTORY] Error:', error);
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

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return COLORS.success;
      case 'absent':
        return COLORS.danger;
      default:
        return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'absent':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'present') return 'Boarded';
    if (status === 'absent') return 'Not Boarded';
    return 'Awaiting';
  };

  const getAttendanceGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'Excellent', color: COLORS.success };
    if (percentage >= 75) return { grade: 'Good', color: COLORS.info };
    if (percentage >= 60) return { grade: 'Average', color: COLORS.warning };
    return { grade: 'Poor', color: COLORS.danger };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading attendance history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Student Info Card */}
          <View style={styles.studentCard}>
            <View style={styles.studentIconContainer}>
              <Ionicons name="person-circle" size={50} color={COLORS.primary} />
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student?.name}</Text>
              <Text style={styles.studentMeta}>
                {student?.registerNumber} • Bus: {student?.busNumber}
              </Text>
            </View>
          </View>

          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="calendar" size={32} color={COLORS.primary} />
              <Text style={styles.statNumber}>{stats.totalDays}</Text>
              <Text style={styles.statLabel}>Total Days</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {stats.presentDays}
              </Text>
              <Text style={styles.statLabel}>Boarded</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: COLORS.danger + '15' }]}>
              <Ionicons name="close-circle" size={32} color={COLORS.danger} />
              <Text style={[styles.statNumber, { color: COLORS.danger }]}>
                {stats.absentDays}
              </Text>
              <Text style={styles.statLabel}>Not Boarded</Text>
            </View>
          </View>

          {/* Attendance Percentage */}
          <View style={styles.percentageCard}>
            <View style={styles.percentageCircle}>
              <Text style={styles.percentageNumber}>{stats.attendancePercentage}%</Text>
              <Text style={styles.percentageLabel}>
                {getAttendanceGrade(stats.attendancePercentage).grade}
              </Text>
            </View>
            <View style={styles.percentageDetails}>
              <Text style={styles.percentageTitle}>Attendance Percentage</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${stats.attendancePercentage}%`,
                      backgroundColor: getAttendanceGrade(stats.attendancePercentage).color
                    }
                  ]}
                />
              </View>
              <Text style={styles.percentageInfo}>
                {stats.presentDays} boarded out of {stats.totalDays} recorded days
              </Text>
            </View>
          </View>

          {/* Attendance Records */}
          <View style={styles.recordsSection}>
            <Text style={styles.sectionTitle}>
               Recent Attendance ({attendanceRecords.length} records)
            </Text>

            {attendanceRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={60} color={COLORS.gray} />
                <Text style={styles.emptyText}>No attendance records yet</Text>
                <Text style={styles.emptySubtext}>
                  Your attendance history will appear here
                </Text>
              </View>
            ) : (
              attendanceRecords.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordLeft}>
                    <Ionicons
                      name={getStatusIcon(record.status)}
                      size={36}
                      color={getStatusColor(record.status)}
                    />
                  </View>
                  <View style={styles.recordMiddle}>
                    <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                    <Text style={styles.recordTime}>
                      Marked at: {formatTime(record.markedAt)}
                    </Text>
                    <Text style={styles.recordBy}>By: {record.markedBy}</Text>
                  </View>
                  <View style={styles.recordRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(record.status) + '20' }
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: getStatusColor(record.status) }]}
                      >
                        {getStatusLabel(record.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
    borderBottomColor: COLORS.lightGray,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  studentIconContainer: {
    marginRight: SPACING.md,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  studentMeta: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 4,
  },
  percentageCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  percentageCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  percentageNumber: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  percentageLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginTop: 4,
  },
  percentageDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  percentageTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: RADIUS.round,
  },
  percentageInfo: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  recordsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  recordLeft: {
    marginRight: SPACING.md,
  },
  recordMiddle: {
    flex: 1,
  },
  recordDate: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  recordTime: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 4,
  },
  recordBy: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  recordRight: {
    marginLeft: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
});

export default AttendanceHistoryScreen;
