import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { attendanceService } from '../services/attendanceService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const ManagementAttendanceHistory = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [records, students] = await Promise.all([
        attendanceService.getRecentAttendanceRecords(90),
        registeredUsersStorage.getAllStudents({ forceRefresh: true }),
      ]);

      const studentMap = students.reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {});

      const grouped = records.reduce((acc, record) => {
        const busKey = record.busNumber || 'Unassigned';
        const date = resolveRecordDate(record);
        const studentEntries = buildStudentEntries(record.students || {}, studentMap);
        const presentCount = studentEntries.filter((entry) => entry.status === 'present').length;
        const absentCount = studentEntries.filter((entry) => entry.status === 'absent').length;

        const preparedRecord = {
          id: record.id,
          date,
          submittedBy: record.submittedBy || 'Unknown',
          presentCount,
          absentCount,
          totalCount: studentEntries.length,
          students: studentEntries,
        };

        if (!acc[busKey]) {
          acc[busKey] = [];
        }
        acc[busKey].push(preparedRecord);
        return acc;
      }, {});

      const orderedSections = Object.entries(grouped)
        .map(([busNumber, recordsForBus]) => ({
          busNumber,
          records: recordsForBus.sort((a, b) => b.date.getTime() - a.date.getTime()),
        }))
        .sort((a, b) => a.busNumber.localeCompare(b.busNumber));

      setSections(orderedSections);
    } catch (error) {
      console.error('Error loading management attendance history:', error);
      setSections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
  };

  const totalBusesTracked = useMemo(() => sections.length, [sections]);
  const totalRecords = useMemo(
    () => sections.reduce((sum, section) => sum + section.records.length, 0),
    [sections]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching attendance history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
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
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="bus" size={24} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{totalBusesTracked}</Text>
            <Text style={styles.summaryLabel}>Buses Covered</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={24} color={COLORS.secondary} />
            <Text style={styles.summaryValue}>{totalRecords}</Text>
            <Text style={styles.summaryLabel}>Daily Records</Text>
          </View>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No attendance history recorded yet</Text>
            <Text style={styles.emptySubtitle}>
              Once co-admins submit attendance, you will see their daily submissions grouped by bus.
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.busNumber} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bus" size={20} color={COLORS.white} />
                  <Text style={styles.sectionTitle}>{section.busNumber}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {section.records.length} day{section.records.length === 1 ? '' : 's'} logged
                </Text>
              </View>

              {section.records.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordHeaderLeft}>
                      <Ionicons name="calendar" size={18} color={COLORS.secondary} />
                      <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
                    </View>
                    <View style={styles.recordStats}>
                      <StatPill icon="checkmark-circle" value={record.presentCount} label="Present" color={COLORS.success} />
                      <StatPill icon="close-circle" value={record.absentCount} label="Absent" color={COLORS.danger} />
                      <StatPill icon="people" value={record.totalCount} label="Total" color={COLORS.info} />
                    </View>
                  </View>

                  <View style={styles.studentList}>
                    {record.students.map((student) => (
                      <View key={student.id} style={styles.studentRow}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.status) }]} />
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentMeta}>
                            {student.registerNumber || student.id} • {formatStatus(student.status)}
                          </Text>
                        </View>
                        <Text style={styles.studentTime}>{formatTime(student.markedAt)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.recordFooter}>
                    <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.recordFooterText}>Submitted by {record.submittedBy}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatPill = ({ icon, value, label, color }) => (
  <View style={[styles.statPill, { backgroundColor: `${color}20` }]}> 
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[styles.statPillValue, { color }]}>{value}</Text>
    <Text style={[styles.statPillLabel, { color }]}>{label}</Text>
  </View>
);

const resolveRecordDate = (record) => {
  if (record.date?.toDate) {
    return record.date.toDate();
  }
  if (record.timestamp?.toDate) {
    return record.timestamp.toDate();
  }
  if (typeof record.date === 'string') {
    return new Date(record.date);
  }
  return new Date();
};

const buildStudentEntries = (students, studentMap) => {
  const entries = Object.entries(students).map(([id, details]) => {
    const profile = studentMap[id] || {};
    const markedAtRaw = details.markedAt;
    let markedAt = null;
    if (markedAtRaw?.toDate) {
      markedAt = markedAtRaw.toDate();
    } else if (markedAtRaw) {
      markedAt = new Date(markedAtRaw);
    }

    return {
      id,
      status: details.status || 'unmarked',
      name: profile.name || profile.registerNumber || id,
      registerNumber: profile.registerNumber,
      markedAt,
    };
  });

  return entries.sort((a, b) => a.name.localeCompare(b.name));
};

const formatDate = (date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (date) => {
  if (!date) {
    return '--:--';
  }
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (status) => {
  if (!status) {
    return 'Unmarked';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'present':
      return COLORS.success;
    case 'absent':
      return COLORS.danger;
    default:
      return COLORS.warning;
  }
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
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    marginLeft: SPACING.xs,
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#F1F1F1',
  },
  recordCard: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDate: {
    marginLeft: SPACING.xs,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  recordStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  statPillValue: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  statPillLabel: {
    marginLeft: 4,
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  studentList: {
    marginBottom: SPACING.md,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  studentMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  studentTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  recordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
  },
  recordFooterText: {
    marginLeft: SPACING.xs,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default ManagementAttendanceHistory;
