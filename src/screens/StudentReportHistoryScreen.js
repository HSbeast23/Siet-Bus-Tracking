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
import { reportsService } from '../services/reportsService';

const StudentReportHistoryScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user || user.role !== 'student') {
        Alert.alert('Error', 'You must be logged in as a student');
        navigation.goBack();
        return;
      }
      setCurrentUser(user);

      const result = await reportsService.getReportsByUser(user.email);
      if (result.success) {
        setReports(result.reports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'acknowledged':
        return COLORS.info;
      case 'resolved':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'acknowledged':
        return 'checkmark-circle';
      case 'resolved':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReportCard = (report) => {
    const hasResponse = report.response && report.status !== 'pending';

    return (
      <View key={report.id} style={styles.reportCard}>
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={16} color={COLORS.gray} />
            <Text style={styles.dateText}>{formatDate(report.timestamp)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Ionicons name={getStatusIcon(report.status)} size={14} color={COLORS.white} />
            <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Your Report:</Text>
          <Text style={styles.messageText}>{report.message}</Text>
        </View>

        {/* Response Section */}
        {hasResponse ? (
          <View style={styles.responseSection}>
            <View style={styles.responseHeader}>
              <Ionicons name="chatbubbles" size={18} color={COLORS.success} />
              <Text style={styles.responseLabel}>Response from Management:</Text>
            </View>
            <View style={styles.responseBox}>
              <Text style={styles.responseText}>{report.response}</Text>
            </View>
            {report.acknowledgedBy && (
              <View style={styles.responseFooter}>
                <Ionicons name="person" size={14} color={COLORS.gray} />
                <Text style={styles.acknowledgedText}>
                  Responded by {report.acknowledgedBy} on {formatDate(report.acknowledgedAt)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pendingSection}>
            <Ionicons name="hourglass" size={16} color={COLORS.warning} />
            <Text style={styles.pendingText}>Waiting for management response...</Text>
          </View>
        )}

        {/* Bus Info */}
        {report.busNumber && (
          <View style={styles.busInfo}>
            <Ionicons name="bus" size={14} color={COLORS.gray} />
            <Text style={styles.busText}>Bus: {report.busNumber}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report History</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report History</Text>
        <View style={{ width: 24 }} />
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{reports.length}</Text>
            <Text style={styles.summaryLabel}>Total Reports</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
              {reports.filter(r => r.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
              {reports.filter(r => r.status === 'acknowledged' || r.status === 'resolved').length}
            </Text>
            <Text style={styles.summaryLabel}>Responded</Text>
          </View>
        </View>

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Your Reports</Text>

          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyText}>No reports yet</Text>
              <Text style={styles.emptySubtext}>
                Submit a report to see it here
              </Text>
              <TouchableOpacity
                style={styles.submitNewButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.submitNewButtonText}>Submit New Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reports.map(renderReportCard)
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {reports.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    justifyContent: 'space-around',
    ...SHADOWS.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  reportsSection: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: 4,
  },
  messageSection: {
    marginBottom: SPACING.md,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.secondary,
    lineHeight: 20,
  },
  responseSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  responseLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  responseBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  responseText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.secondary,
    lineHeight: 20,
  },
  responseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acknowledgedText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
    fontStyle: 'italic',
  },
  pendingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pendingText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.warning,
    marginLeft: SPACING.xs,
    fontStyle: 'italic',
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  submitNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  submitNewButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
});

export default StudentReportHistoryScreen;
