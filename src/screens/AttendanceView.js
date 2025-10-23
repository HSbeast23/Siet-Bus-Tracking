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
  const [students, setStudents] = useState([]);
  const [busId, setBusId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const displayDate = new Date();

  useEffect(() => {
    initializeCoAdmin();
  }, []);

  useEffect(() => {
    if (busId) {
      loadAttendanceData();
    }
  }, [busId]);

  const initializeCoAdmin = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user || user.role !== 'coadmin') {
  Alert.alert('Error', 'You must be logged in as Bus Incharge to view attendance');
        navigation.goBack();
        return;
      }
      setCurrentUser(user);
      setBusId(user.busId); // Bus incharge's assigned bus (SIET-005)
    } catch (error) {
      console.error('Error initializing bus incharge:', error);
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

      const existingStatusMap = new Map();
      students.forEach(student => {
        existingStatusMap.set(student.id, {
          attendanceStatus: student.attendanceStatus,
          markedAt: student.markedAt,
          markedBy: student.markedBy,
        });
      });

      const defaultMarkedBy = currentUser?.name || currentUser?.email || 'Bus Incharge';

      const normalizeStatus = (status) => {
        if (status === 'present' || status === 'absent') {
          return status;
        }
        return 'present';
      };

      // Merge students with their attendance status
      const studentsWithStatus = fetchedStudents.map(student => {
        const existing = existingStatusMap.get(student.id);
        if (existing) {
          const normalizedStatus = normalizeStatus(existing.attendanceStatus);
          return {
            ...student,
            attendanceStatus: normalizedStatus,
            markedAt: existing.markedAt || null,
            markedBy: existing.markedBy || defaultMarkedBy,
          };
        }

        return {
          ...student,
          attendanceStatus: 'present',
          markedAt: null,
          markedBy: defaultMarkedBy,
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

  const handleMarkAttendance = (studentId, status) => {
    if (isSubmitted) {
      Alert.alert('Already Submitted', 'Today\'s attendance has been submitted and cannot be modified');
      return;
    }

    const markedAt = new Date();
  const markedBy = currentUser?.name || currentUser?.email || 'Bus Incharge';

    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === studentId
          ? { ...student, attendanceStatus: status, markedAt, markedBy }
          : student
      )
    );
  };

  const handleSubmitAttendance = async () => {
    // Check if all students are marked
    const unmarkedStudents = students.filter(
      (s) => !['present', 'absent'].includes(s.attendanceStatus)
    );
    
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
  const submitter = currentUser?.name || currentUser?.email || 'Bus Incharge';
      const attendanceRecords = students.map(student => {
        const resolvedStatus = ['present', 'absent'].includes(student.attendanceStatus)
          ? student.attendanceStatus
          : 'present';
        const resolvedMarkedAt = student.markedAt instanceof Date
          ? student.markedAt
          : new Date(student.markedAt || Date.now());
        const resolvedMarkedBy = student.markedBy || submitter;

        return {
          id: student.id,
          name: student.name,
          registerNumber: student.registerNumber,
          department: student.department,
          year: student.year,
          status: resolvedStatus,
          markedAt: resolvedMarkedAt,
          markedBy: resolvedMarkedBy,
        };
      });

      const result = await attendanceService.submitAttendance(
        busId,
        attendanceRecords,
        submitter
      );

      if (result.success) {
        const recordById = new Map(attendanceRecords.map(item => [item.id, item]));
        setStudents(prev =>
          prev.map(student => {
            const record = recordById.get(student.id);
            if (!record) {
              return student;
            }

            return {
              ...student,
              attendanceStatus: record.status,
              markedAt: record.markedAt,
              markedBy: record.markedBy,
            };
          })
        );
        setIsSubmitted(true);
        Alert.alert('Email Ready', result.message);
      } else {
        Alert.alert('Error', result.error || 'Failed to submit attendance');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      Alert.alert('Error', 'Failed to prepare attendance email');
    }
  };

  const calculateAttendancePercentage = () => {
    if (students.length === 0) return 0;
    const boardedCount = students.filter((s) => s.attendanceStatus === 'present').length;
    return Math.round((boardedCount / students.length) * 100);
  };

  const getBoardedCount = () => students.filter(s => s.attendanceStatus === 'present').length;
  const getNotBoardedCount = () => students.filter(s => s.attendanceStatus === 'absent').length;

  const resolveStatusMeta = (status) => {
    if (status === 'present') {
      return { label: 'Boarded', color: '#4CAF50', tone: '#E8F5E9' };
    }
    if (status === 'absent') {
      return { label: 'Not Boarded', color: '#F44336', tone: '#FFEBEE' };
    }
    return { label: 'Boarded', color: '#4CAF50', tone: '#E8F5E9' };
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
          {/* Summary Header */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              {busId ? `Bus ${busId}` : 'Assigned Bus'}
            </Text>
            <Text style={styles.summarySubtitle}>
              {students.length} registered student{students.length === 1 ? '' : 's'}
            </Text>
            {isSubmitted && (
              <View style={styles.summaryBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.summaryBadgeText}>Attendance Submitted</Text>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={26} color="#4CAF50" />
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {getBoardedCount()}
              </Text>
              <Text style={styles.statLabel}>Boarded</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="close-circle" size={26} color="#F44336" />
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                {getNotBoardedCount()}
              </Text>
              <Text style={styles.statLabel}>Not Boarded</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="stats-chart" size={26} color="#2196F3" />
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
                  Attendance email prepared. Use the button below if you need to reopen the draft.
                </Text>
              </View>
            </View>
          )}

          {/* Date Selector */}
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Attendance Date</Text>
            <View style={styles.dateCard}>
              <Ionicons name="calendar" size={20} color={COLORS.secondary} />
              <Text style={styles.dateText}>
                {displayDate.toLocaleDateString('en-US', {
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
              Update boarding status for each student before the bus departs
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
                        { backgroundColor: resolveStatusMeta(student.attendanceStatus).color },
                      ]}
                    />
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentMeta}>
                        {student.registerNumber} • {student.department} • Year {student.year}
                      </Text>
                      <Text style={styles.studentTimestamp}>
                        {(() => {
                          if (student.attendanceStatus === 'present') {
                            const boardedTime = student.markedAt
                              ? (student.markedAt.toDate
                                  ? new Date(student.markedAt.toDate()).toLocaleTimeString()
                                  : new Date(student.markedAt).toLocaleTimeString())
                              : null;
                            return boardedTime ? `Boarded at ${boardedTime}` : 'Boarded';
                          }
                          if (student.attendanceStatus === 'absent') {
                            const markedTime = student.markedAt
                              ? (student.markedAt.toDate
                                  ? new Date(student.markedAt.toDate()).toLocaleTimeString()
                                  : new Date(student.markedAt).toLocaleTimeString())
                              : null;
                            return markedTime
                              ? `Marked not boarded ${markedTime}`
                              : 'Marked as not boarded';
                          }
                          return 'Boarded';
                        })()}
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
                        { backgroundColor: resolveStatusMeta(student.attendanceStatus).tone },
                      ]}
                    >
                      <Ionicons
                        name={student.attendanceStatus === 'present' ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={resolveStatusMeta(student.attendanceStatus).color}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: resolveStatusMeta(student.attendanceStatus).color },
                        ]}
                      >
                        {resolveStatusMeta(student.attendanceStatus).label}
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

          {isSubmitted && (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: COLORS.info }]}
              onPress={submitAttendanceConfirmed}
            >
              <Ionicons name="mail" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Reopen Attendance Email</Text>
            </TouchableOpacity>
          )}

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
  summaryHeader: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  summarySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#2E7D32',
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
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
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
});

export default AttendanceView;
