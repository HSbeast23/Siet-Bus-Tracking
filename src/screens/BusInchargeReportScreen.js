import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { reportsService } from '../services/reportsService';
import { normalizeBusNumber } from '../services/locationService';

const BusInchargeReportScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [incomingReports, setIncomingReports] = useState([]);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const refreshReports = useCallback(async (userMeta) => {
    try {
      setFetchingReports(true);
      if (!userMeta) {
        setIncomingReports([]);
        return;
      }

      const normalizedBus = normalizeBusNumber(userMeta.busId || userMeta.busNumber || '');
      const reportResult = await reportsService.getReportsForRecipient({
        recipientRole: 'coadmin',
        busNumber: normalizedBus || userMeta.busId || null,
      });

      if (reportResult.success) {
        setIncomingReports(reportResult.reports || []);
      } else {
        setIncomingReports([]);
      }
    } catch (error) {
      console.error('Error loading incoming reports:', error);
      setIncomingReports([]);
    } finally {
      setFetchingReports(false);
      setRefreshing(false);
    }
  }, []);

  const loadUserInfo = useCallback(async () => {
    const user = await authService.getCurrentUser();
    if (!user || user.role !== 'coadmin') {
      Alert.alert('Error', 'You must be logged in as Bus Incharge');
      navigation.goBack();
      return;
    }
    setCurrentUser(user);
    await refreshReports(user);
  }, [navigation, refreshReports]);

  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  const onRefresh = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    setRefreshing(true);
    await refreshReports(currentUser);
  }, [currentUser, refreshReports]);

  const handleSubmitReport = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User information not loaded');
      return;
    }

    setSubmitting(true);
    try {
      const reportData = {
        message: message.trim(),
        reportedBy: currentUser.name,
        reporterRole: 'coadmin',
        reporterEmail: currentUser.email,
        busNumber: currentUser.busId,
        recipientRole: 'management',
      };

      const result = await reportsService.submitReport(reportData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your report has been sent to Management',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setMessage('');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const openResponseModal = useCallback((report) => {
    setSelectedReport(report);
    setResponseMessage('');
    setResponseModalVisible(true);
  }, []);

  const closeResponseModal = useCallback(() => {
    setResponseModalVisible(false);
    setSelectedReport(null);
    setResponseMessage('');
  }, []);

  const removeReportLocally = useCallback((reportId) => {
    setIncomingReports((prev) => prev.filter((item) => item.id !== reportId));
  }, []);

  const handleRespondToReport = useCallback(async () => {
    if (!selectedReport) {
      return;
    }

    if (!responseMessage.trim()) {
      Alert.alert('Response Required', 'Please enter a response message.');
      return;
    }

    try {
      setActionLoading(true);
      const removeResult = await reportsService.removeReport(selectedReport.id);
      if (!removeResult.success) {
        Alert.alert('Error', removeResult.error || 'Failed to clear the report');
        return;
      }

      removeReportLocally(selectedReport.id);
      Alert.alert('Response Sent', responseMessage.trim());
      closeResponseModal();
    } catch (error) {
      console.error('Error responding to report:', error);
      Alert.alert('Error', 'Unable to clear the report at this moment.');
    } finally {
      setActionLoading(false);
    }
  }, [closeResponseModal, removeReportLocally, responseMessage, selectedReport]);

  const handleClearReport = useCallback((report) => {
    Alert.alert(
      'Clear Report',
      'Are you sure you want to remove this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const removeResult = await reportsService.removeReport(report.id);
              if (!removeResult.success) {
                Alert.alert('Error', removeResult.error || 'Failed to remove report');
                return;
              }
              removeReportLocally(report.id);
            } catch (error) {
              console.error('Error clearing report:', error);
              Alert.alert('Error', 'Unable to remove the report.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [removeReportLocally]);

  const renderIncomingReport = useCallback(
    (report) => (
      <View key={report.id} style={styles.incomingCard}>
        <View style={styles.incomingHeader}>
          <View style={styles.incomingTitleRow}>
            <Ionicons name="person" size={18} color={COLORS.secondary} />
            <Text style={styles.incomingReporter}>
              {report.reportedBy || report.reportedByName || 'Student'}
            </Text>
          </View>
          <View style={styles.incomingTimeRow}>
            <Ionicons name="time" size={14} color={COLORS.textSecondary} />
            <Text style={styles.incomingTimestamp}>
              {report.timestamp?.toDate?.().toLocaleString?.('en-IN') || 'Just now'}
            </Text>
          </View>
        </View>
        {report.registerNumber ? (
          <View style={styles.incomingMetaRow}>
            <Ionicons name="id-card" size={14} color={COLORS.textSecondary} />
            <Text style={styles.incomingMetaValue}>Reg: {report.registerNumber}</Text>
          </View>
        ) : null}
        <Text style={styles.incomingMessage}>{report.message}</Text>
        <View style={styles.incomingActions}>
          <TouchableOpacity
            style={styles.respondButton}
            onPress={() => openResponseModal(report)}
            disabled={actionLoading}
          >
            <Ionicons name="chatbubbles" size={16} color={COLORS.white} />
            <Text style={styles.respondButtonText}>Respond & Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleClearReport(report)}
            disabled={actionLoading}
          >
            <Ionicons name="trash" size={16} color={COLORS.danger} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [actionLoading, handleClearReport, openResponseModal]
  );

  const responseModalTitle = useMemo(() => {
    if (!selectedReport) {
      return 'Respond to Report';
    }
    return `Respond to ${selectedReport.reportedBy || 'Student'}`;
  }, [selectedReport]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports</Text>
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
            />
          }
        >
          <View style={styles.incomingSection}>
            <View style={styles.incomingSectionHeader}>
              <Ionicons name="mail" size={20} color={COLORS.secondary} />
              <Text style={styles.incomingSectionTitle}>Student Reports</Text>
            </View>
            {fetchingReports ? (
              <View style={styles.incomingLoader}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.incomingLoaderLabel}>Loading latest reports...</Text>
              </View>
            ) : incomingReports.length === 0 ? (
              <View style={styles.incomingEmpty}>
                <Ionicons name="document-text-outline" size={40} color={COLORS.textSecondary} />
                <Text style={styles.incomingEmptyText}>No new reports from students.</Text>
              </View>
            ) : (
              incomingReports.map(renderIncomingReport)
            )}
          </View>

          {/* Bus Incharge Info Card */}
          {currentUser && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="shield-checkmark" size={28} color="#8B4513" />
                <Text style={styles.infoTitle}>Bus Incharge Information</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#8B4513" />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{currentUser.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="id-card" size={20} color="#8B4513" />
                <Text style={styles.infoLabel}>ID:</Text>
                <Text style={styles.infoValue}>{currentUser.id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="bus" size={20} color="#8B4513" />
                <Text style={styles.infoLabel}>Assigned Bus:</Text>
                <Text style={styles.infoValue}>{currentUser.busId}</Text>
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.info} />
            <Text style={styles.instructionsText}>
              As a Bus Incharge, you can report bus coordination issues, driver concerns, or student matters directly to Management.
            </Text>
          </View>

          {/* Message Input */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Coordination Report</Text>
            <Text style={styles.inputSubLabel}>
              Describe the issue or concern in detail
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Example: Bus maintenance required, driver schedule change needed, student attendance concerns..."
              placeholderTextColor={COLORS.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              editable={!submitting}
            />
            <Text style={styles.charCount}>{message.length} characters</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitReport}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Send Report to Management</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note */}
          <View style={styles.noteCard}>
            <Ionicons name="shield-checkmark" size={20} color="#8B4513" />
            <View style={styles.noteContent}>
              <Text style={styles.noteTitle}>Bus Incharge Reporting</Text>
              <Text style={styles.noteText}>
                • Your report will be labeled as "Bus Incharge Report"
                {'\n'}• It will include your name and bus number
                {'\n'}• Management will prioritize coordinator reports
                {'\n'}• You'll receive a response within 24 hours
              </Text>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={responseModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeResponseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{responseModalTitle}</Text>
                <TouchableOpacity onPress={closeResponseModal} disabled={actionLoading}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Provide a quick response for your records.</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type your response..."
                value={responseMessage}
                onChangeText={setResponseMessage}
                multiline
                editable={!actionLoading}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={closeResponseModal}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={handleRespondToReport}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalSubmitText}>Send & Clear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
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
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    ...SHADOWS.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray + '20',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    width: 110,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.info + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.info,
    marginLeft: SPACING.sm,
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputSubLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    height: 220,
    backgroundColor: COLORS.background,
  },
  charCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    alignItems: 'flex-start',
  },
  noteContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  noteText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  incomingSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  incomingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  incomingSectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  incomingLoader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  incomingLoaderLabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  incomingEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  incomingEmptyText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  incomingCard: {
    borderWidth: 1,
    borderColor: `${COLORS.gray}20`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  incomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  incomingReporter: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  incomingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incomingTimestamp: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  incomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  incomingMetaValue: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  incomingMessage: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  incomingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  respondButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  respondButtonText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  clearButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: `${COLORS.danger}40`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: `${COLORS.gray}30`,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalCancel: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: `${COLORS.gray}40`,
  },
  modalCancelText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  modalSubmit: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary,
  },
  modalSubmitText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});

export default BusInchargeReportScreen;
