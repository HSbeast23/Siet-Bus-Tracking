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
  const [expandedBus, setExpandedBus] = useState(null);
  const [expandedRecords, setExpandedRecords] = useState({});

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

  const toggleBusSection = (busNumber) => {
    setExpandedBus((prev) => (prev === busNumber ? null : busNumber));
  };

  const toggleRecord = (recordId) => {
    setExpandedRecords((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

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
          sections.map((section) => {
            const isExpanded = expandedBus === section.busNumber;
            const latestRecord = section.records[0];
            const totalBoarded = section.records.reduce((sum, record) => sum + record.presentCount, 0);
            const totalNotBoarded = section.records.reduce((sum, record) => sum + record.absentCount, 0);

            return (
              <View key={section.busNumber} style={styles.busCard}>
                <TouchableOpacity onPress={() => toggleBusSection(section.busNumber)}>
                  <View style={styles.busSummaryRow}>
                    <View style={styles.busSummaryLeft}>
                      <View style={styles.busIconBadge}>
                        <Ionicons name="bus" size={20} color={COLORS.white} />
                      </View>
                      <View>
                        <Text style={styles.busTitle}>{section.busNumber}</Text>
                        {latestRecord && (
                          <Text style={styles.busSubtitle}>
                            Latest manifest • {formatDate(latestRecord.date)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.busSummaryStats}>
                      <View style={styles.busChip}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                        <Text style={[styles.busChipText, { color: COLORS.success }]}>{totalBoarded}</Text>
                        <Text style={styles.busChipLabel}>Boarded</Text>
                      </View>
                      <View style={styles.busChip}>
                        <Ionicons name="close-circle" size={14} color={COLORS.danger} />
                        <Text style={[styles.busChipText, { color: COLORS.danger }]}>{totalNotBoarded}</Text>
                        <Text style={styles.busChipLabel}>Not Boarded</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.secondary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.busDetails}>
                    {section.records.map((record) => {
                      const expanded = expandedRecords[record.id] === true;
                      const boardedStudents = record.students.filter((student) => student.status === 'present');
                      const notBoardedStudents = record.students.filter((student) => student.status === 'absent');
                      return (
                        <View key={record.id} style={styles.historyCard}>
                          <TouchableOpacity onPress={() => toggleRecord(record.id)}>
                            <View style={styles.historyHeader}>
                              <View style={styles.historyHeaderLeft}>
                                <Ionicons name="calendar" size={18} color={COLORS.secondary} />
                                <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                              </View>
                              <View style={styles.historyHeaderRight}>
                                <StatPill icon="checkmark-circle" value={record.presentCount} label="Boarded" color={COLORS.success} />
                                <StatPill icon="close-circle" value={record.absentCount} label="Not Boarded" color={COLORS.danger} />
                                <StatPill icon="people" value={record.totalCount} label="Manifest" color={COLORS.info} />
                                <Ionicons
                                  name={expanded ? 'chevron-up' : 'chevron-down'}
                                  size={18}
                                  color={COLORS.secondary}
                                  style={{ marginLeft: SPACING.xs }}
                                />
                              </View>
                            </View>
                          </TouchableOpacity>

                          {expanded && (
                            <View style={styles.manifestRow}>
                              <View style={styles.manifestColumn}>
                                <View style={styles.manifestColumnHeader}>
                                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                  <Text style={[styles.manifestColumnTitle, { color: COLORS.success }]}>Boarded</Text>
                                </View>
                                {boardedStudents.length === 0 ? (
                                  <Text style={styles.manifestEmpty}>No students boarded</Text>
                                ) : (
                                  boardedStudents.map((student) => (
                                    <View key={student.id} style={styles.manifestRowItem}>
                                      <Text style={styles.manifestName}>{student.name}</Text>
                                      <Text style={styles.manifestMeta}>
                                        {student.registerNumber || student.id}
                                      </Text>
                                      <Text style={styles.manifestTime}>{formatTime(student.markedAt)}</Text>
                                    </View>
                                  ))
                                )}
                              </View>

                              <View style={styles.manifestDivider} />

                              <View style={styles.manifestColumn}>
                                <View style={styles.manifestColumnHeader}>
                                  <Ionicons name="close-circle" size={16} color={COLORS.danger} />
                                  <Text style={[styles.manifestColumnTitle, { color: COLORS.danger }]}>Not Boarded</Text>
                                </View>
                                {notBoardedStudents.length === 0 ? (
                                  <Text style={styles.manifestEmpty}>Everyone boarded</Text>
                                ) : (
                                  notBoardedStudents.map((student) => (
                                    <View key={student.id} style={styles.manifestRowItem}>
                                      <Text style={styles.manifestName}>{student.name}</Text>
                                      <Text style={styles.manifestMeta}>
                                        {student.registerNumber || student.id}
                                      </Text>
                                      <Text style={styles.manifestTime}>{formatTime(student.markedAt)}</Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            </View>
                          )}

                          <View style={styles.historyFooter}>
                            <Ionicons name="person" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.historyFooterText}>Submitted by {record.submittedBy}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
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
  busCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  busSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  busSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  busSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  busSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  busChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  busChipText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  busChipLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    maxWidth: 72,
    textAlign: 'left',
  },
  busDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  historyCard: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  historyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  historyDate: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
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
  manifestRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  manifestColumn: {
    flex: 1,
  },
  manifestColumnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  manifestColumnTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  manifestRowItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  manifestName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  manifestMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manifestTime: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manifestDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  manifestEmpty: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    marginTop: SPACING.md,
  },
  historyFooterText: {
    marginLeft: SPACING.xs,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default ManagementAttendanceHistory;
