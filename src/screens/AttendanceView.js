import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { attendanceService } from '../services/attendanceService';

const AttendanceView = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [busId, setBusId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    initializeCoAdmin();
  }, []);

  useEffect(() => {
    if (busId) {
      loadAttendanceData();
    }
  }, [busId, selectedDate]);

  const initializeCoAdmin = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user || user.role !== 'coadmin') {
        Alert.alert('Error', 'You must be logged in as Co-Admin to view attendance');
        navigation.goBack();
        return;
      }
      setCurrentUser(user);
      setBusId(user.busId); // Co-Admin's assigned bus (SIET-005)
    } catch (error) {
      console.error('Error initializing co-admin:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      // Fetch REAL authenticated students from Firebase for this bus
      const fetchedStudents = await attendanceService.getStudentsByBus(busId);
      
      if (fetchedStudents.length === 0) {
        Alert.alert('No Students', `No students are registered for bus ${busId}`);
      }

      // Fetch today's attendance data
      const todayAttendance = await attendanceService.getTodayAttendance(busId);
      setAttendanceData(todayAttendance.students || {});
      setIsSubmitted(todayAttendance.submitted || false);

      // Merge students with their attendance status
      const studentsWithStatus = fetchedStudents.map(student => {
        const attendance = todayAttendance.students?.[student.id];
        return {
          ...student,
          attendanceStatus: attendance?.status || 'unmarked',
          markedAt: attendance?.markedAt || null
        };
      });

      setStudents(studentsWithStatus);
    } catch (error) {
      console.error('Error loading attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceData();
    setRefreshing(false);
  };

  const handleMarkAttendance = async (studentId, status) => {
    if (isSubmitted) {
      Alert.alert('Already Submitted', 'Today\'s attendance has been submitted and cannot be modified');
      return;
    }

    try {
      const result = await attendanceService.markAttendance(
        busId,
        studentId,
        status,
        currentUser.name
      );

      if (result.success) {
        // Update local state
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === studentId
              ? { ...student, attendanceStatus: status, markedAt: new Date() }
              : student
          )
        );
      } else {
        Alert.alert('Error', 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const handleSubmitAttendance = async () => {
    // Check if all students are marked
    const unmarkedStudents = students.filter(s => s.attendanceStatus === 'unmarked');
    
    if (unmarkedStudents.length > 0) {
      Alert.alert(
        'Incomplete Attendance',
        `${unmarkedStudents.length} student(s) are not marked. Do you want to submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitAttendanceConfirmed() }
        ]
      );
      return;
    }

    submitAttendanceConfirmed();
  };

  const submitAttendanceConfirmed = async () => {
    try {
      // Prepare attendance data
      const attendanceMap = {};
      students.forEach(student => {
        attendanceMap[student.id] = {
          status: student.attendanceStatus,
          markedAt: student.markedAt || new Date(),
          markedBy: currentUser.name
        };
      });

      const result = await attendanceService.submitAttendance(
        busId,
        attendanceMap,
        currentUser.name
      );

      if (result.success) {
        setIsSubmitted(true);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit attendance');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', 'Failed to submit attendance');
    }
  };

  const calculateAttendancePercentage = () => {
    if (students.length === 0) return 0;
    const presentCount = students.filter(s => s.attendanceStatus === 'present').length;
    return Math.round((presentCount / students.length) * 100);
  };

  const getPresentCount = () => {
    return students.filter(s => s.attendanceStatus === 'present').length;
  };

  const getAbsentCount = () => {
    return students.filter(s => s.attendanceStatus === 'absent').length;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance View</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Co-Admin Info */}
          <View style={styles.coAdminCard}>
            <View style={styles.coAdminHeader}>
              <Ionicons name="person-circle" size={24} color="#8B4513" />
              <View style={styles.coAdminInfo}>
                <Text style={styles.coAdminName}>Welcome, {currentUser?.name}</Text>
                <Text style={styles.coAdminId}>{currentUser?.id}</Text>
              </View>
            </View>
          </View>

          {/* Bus Info */}
          <View style={styles.busInfoCard}>
            <View style={styles.busInfoHeader}>
              <Ionicons name="bus" size={24} color={COLORS.secondary} />
              <Text style={styles.busInfoTitle}>Bus: {busId}</Text>
            </View>
            <Text style={styles.busInfoSubtitle}>
              {students.length} Registered Students
            </Text>
            {isSubmitted && (
              <View style={styles.submittedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.submittedText}>Attendance Submitted</Text>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {getPresentCount()}
              </Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="close-circle" size={32} color="#F44336" />
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                {getAbsentCount()}
              </Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="stats-chart" size={32} color="#2196F3" />
              <Text style={[styles.statValue, { color: '#2196F3' }]}>
                {calculateAttendancePercentage()}%
              </Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>

          {/* Already Submitted Warning Banner */}
          {isSubmitted && (
            <View style={styles.warningBanner}>
              <Ionicons name="lock-closed" size={24} color={COLORS.white} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Attendance Already Submitted</Text>
                <Text style={styles.warningSubtitle}>
                  Today's attendance has been submitted. Come back tomorrow to mark new attendance.
                </Text>
              </View>
            </View>
          )}

          {/* Date Selector */}
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.dateCard}>
              <Ionicons name="calendar" size={20} color={COLORS.secondary} />
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Students List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Students Registered for Bus {busId}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Mark present or absent status (Real authenticated students)
            </Text>

            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No students registered for this bus</Text>
                <Text style={styles.emptySubtext}>Students need to register with bus {busId}</Text>
              </View>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentInfo}>
                    <View
                      style={[
                        styles.statusIndicator,
                        {
                          backgroundColor:
                            student.attendanceStatus === 'present'
                              ? '#4CAF50'
                              : student.attendanceStatus === 'absent'
                              ? '#F44336'
                              : '#FFA726',
                        },
                      ]}
                    />
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>
                        {student.registerNumber} • {student.department} • Year {student.year}
                      </Text>
                      <Text style={styles.studentTimestamp}>
                        {student.attendanceStatus === 'present'
                          ? `Marked present ${student.markedAt ? (student.markedAt.toDate ? new Date(student.markedAt.toDate()).toLocaleTimeString() : new Date(student.markedAt).toLocaleTimeString()) : ''}`
                          : student.attendanceStatus === 'absent'
                          ? `Marked absent ${student.markedAt ? (student.markedAt.toDate ? new Date(student.markedAt.toDate()).toLocaleTimeString() : new Date(student.markedAt).toLocaleTimeString()) : ''}`
                          : 'Not marked yet'}
                      </Text>
                    </View>
                  </View>
                  
                  {!isSubmitted && (
                    <View style={styles.attendanceButtons}>
                      <TouchableOpacity
                        style={[
                          styles.markButton,
                          styles.presentButton,
                          student.attendanceStatus === 'present' && styles.selectedButton
                        ]}
                        onPress={() => handleMarkAttendance(student.id, 'present')}
                      >
                        <Ionicons name="checkmark" size={18} color="#4CAF50" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.markButton,
                          styles.absentButton,
                          student.attendanceStatus === 'absent' && styles.selectedButton
                        ]}
                        onPress={() => handleMarkAttendance(student.id, 'absent')}
                      >
                        <Ionicons name="close" size={18} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isSubmitted && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            student.attendanceStatus === 'present'
                              ? '#E8F5E9'
                              : '#FFEBEE',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          student.attendanceStatus === 'present'
                            ? 'checkmark-circle'
                            : 'close-circle'
                        }
                        size={16}
                        color={student.attendanceStatus === 'present' ? '#4CAF50' : '#F44336'}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              student.attendanceStatus === 'present' ? '#4CAF50' : '#F44336',
                          },
                        ]}
                      >
                        {student.attendanceStatus.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Submit Button */}
          {!isSubmitted && students.length > 0 && (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitAttendance}
            >
              <Ionicons name="save" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Submit Today's Attendance</Text>
            </TouchableOpacity>
          )}

          {/* History Note */}
          <View style={styles.historyNote}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.historyText}>
              ✅ Real authenticated students from Firebase
              {'\n'}✅ Daily attendance tracking with timestamps
              {'\n'}✅ Attendance history stored by Co-Admin
              {'\n'}✅ Percentage calculations included
            </Text>
          </View>

          <View style={{ height: SPACING.xl }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#8B4513',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  coAdminCard: {
    backgroundColor: '#FFF3E0',
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  coAdminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coAdminInfo: {
    marginLeft: SPACING.sm,
  },
  coAdminName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  coAdminId: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  busInfoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  busInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  busInfoTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  busInfoSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: 32,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginLeft: 32,
  },
  submittedText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#4CAF50',
    marginLeft: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  dateSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
    marginTop: 6,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  studentMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  studentTimestamp: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  markButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    borderWidth: 2,
  },
  presentButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  absentButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  selectedButton: {
    ...SHADOWS.md,
    elevation: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    marginLeft: SPACING.xs,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#8B4513',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  historyNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    margin: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'flex-start',
  },
  historyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.info,
    marginLeft: SPACING.sm,
    lineHeight: 18,
  },
});

export default AttendanceView;
