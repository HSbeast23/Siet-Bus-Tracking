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
import { attendanceService } from '../services/attendanceService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const CoAdminAttendanceHistory = ({ route, navigation }) => {
  const { busId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    averageBoarded: 0,
    averageNotBoarded: 0,
    totalStudents: 0
  });
  const [expandedRecordId, setExpandedRecordId] = useState(null);

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

      const registeredStudents = await attendanceService.getStudentsByBus(coadminBusId);
      const studentProfileMap = registeredStudents.reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {});
      
      const records = [];
  let totalBoarded = 0;
  let totalNotBoarded = 0;
      let studentCountSet = new Set();

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        const students = data.students || {};
        const studentIds = Object.keys(students);
        
        let boardedCount = 0;
        let notBoardedCount = 0;
        
        studentIds.forEach(studentId => {
          studentCountSet.add(studentId);
          const studentData = students[studentId];
          if (studentData.status === 'present') boardedCount++;
          if (studentData.status === 'absent') notBoardedCount++;
        });
        
  totalBoarded += boardedCount;
  totalNotBoarded += notBoardedCount;

        const enrichedStudents = studentIds.map((studentId) => {
          const studentData = students[studentId];
          const profile = studentProfileMap[studentId] || {};
          const rawMarkedAt = studentData?.markedAt;
          let markedAt = null;
          if (rawMarkedAt?.toDate) {
            markedAt = rawMarkedAt.toDate();
          } else if (rawMarkedAt) {
            markedAt = new Date(rawMarkedAt);
          }

          return {
            id: studentId,
            status: studentData?.status || 'unmarked',
            markedAt,
            markedBy: studentData?.markedBy,
            name: profile.name || profile.registerNumber || studentId,
            registerNumber: profile.registerNumber,
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
        
        const record = {
          id: doc.id,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          busNumber: data.busNumber,
          submittedBy: data.submittedBy || 'Unknown',
          totalStudents: studentIds.length,
          presentCount: boardedCount,
          absentCount: notBoardedCount,
          students: enrichedStudents
        };
        
        records.push(record);
      });

      // Sort records by date descending (newest first) and limit to 60 days
      const sortedRecords = records
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 60);

  const totalDays = sortedRecords.length;
  const avgBoarded = totalDays > 0 ? (totalBoarded / totalDays).toFixed(1) : 0;
  const avgNotBoarded = totalDays > 0 ? (totalNotBoarded / totalDays).toFixed(1) : 0;

      setAttendanceRecords(sortedRecords);
      setStats({
        totalDays,
        averageBoarded: parseFloat(avgBoarded),
        averageNotBoarded: parseFloat(avgNotBoarded),
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

  const formatTime = (date) => {
    if (!date) {
      return '--:--';
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAttendanceRate = (present, total) => {
    if (total === 0) return 0;
    return ((present / total) * 100).toFixed(1);
  };

  const toggleRecord = (recordId) => {
    setExpandedRecordId(prev => (prev === recordId ? null : recordId));
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
            <Text style={styles.statValue}>{stats.averageBoarded}</Text>
            <Text style={styles.statLabel}>Avg Boarded</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            <Text style={styles.statValue}>{stats.averageNotBoarded}</Text>
            <Text style={styles.statLabel}>Avg Not Boarded</Text>
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
              const isExpanded = expandedRecordId === record.id;
              const students = Array.isArray(record.students) ? record.students : [];
              const boardedStudents = students.filter((student) => student.status === 'present');
              const notBoardedStudents = students.filter((student) => student.status === 'absent');
              
              return (
                <View key={record.id} style={styles.recordCard}>
                  <TouchableOpacity onPress={() => toggleRecord(record.id)}>
                    <View style={styles.recordHeader}>
                      <View style={styles.dateContainer}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                      </View>
                      <View style={styles.recordHeaderRight}>
                        <View style={[styles.rateBadge, { backgroundColor: rateColor }]}>
                          <Text style={styles.rateText}>{attendanceRate}%</Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={COLORS.secondary}
                          style={{ marginLeft: SPACING.xs }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.recordStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="people" size={16} color={COLORS.gray} />
                      <Text style={styles.statItemText}>
                        {record.totalStudents} Manifested
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={[styles.statItemText, { color: COLORS.success }]}>
                        {record.presentCount} Boarded
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                      <Text style={[styles.statItemText, { color: COLORS.danger }]}>
                        {record.absentCount} Not Boarded
                      </Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.column}>
                        <View style={styles.columnHeader}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={[styles.columnTitle, { color: COLORS.success }]}>Boarded</Text>
                        </View>
                        {boardedStudents.length === 0 ? (
                          <Text style={styles.emptyColumnText}>No students boarded</Text>
                        ) : (
                          boardedStudents.map(student => (
                            <View key={student.id} style={styles.columnRow}>
                              <Text style={styles.columnName}>{student.name || student.id}</Text>
                              <Text style={styles.columnMeta}>{student.registerNumber || student.id}</Text>
                              <Text style={styles.columnMeta}>Boarded at {formatTime(student.markedAt)}</Text>
                            </View>
                          ))
                        )}
                      </View>

                      <View style={styles.columnDivider} />

                      <View style={styles.column}>
                        <View style={styles.columnHeader}>
                          <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                          <Text style={[styles.columnTitle, { color: COLORS.danger }]}>Not Boarded</Text>
                        </View>
                        {notBoardedStudents.length === 0 ? (
                          <Text style={styles.emptyColumnText}>Everyone boarded</Text>
                        ) : (
                          notBoardedStudents.map(student => (
                            <View key={student.id} style={styles.columnRow}>
                              <Text style={styles.columnName}>{student.name || student.id}</Text>
                              <Text style={styles.columnMeta}>{student.registerNumber || student.id}</Text>
                              <Text style={styles.columnMeta}>Marked {student.markedBy || 'Co-Admin'} • {formatTime(student.markedAt)}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  )}

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
  recordHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  expandedSection: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  columnTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  columnRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 2,
  },
  columnName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    fontWeight: FONTS.weights.medium,
  },
  columnMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    marginTop: 2,
  },
  columnDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  emptyColumnText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
});

export default CoAdminAttendanceHistory;
