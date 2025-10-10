import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { reportsService } from '../services/reportsService';

const ReportsAnalytics = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [studentReports, setStudentReports] = useState([]);
  const [coadminReports, setCoadminReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    fromStudents: 0,
    fromCoAdmins: 0
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeManagement();
  }, []);

  const initializeManagement = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user || user.role !== 'management') {
        Alert.alert('Error', 'You must be logged in as Management to view reports');
        navigation.goBack();
        return;
      }
      setCurrentUser(user);
      await loadReports();
    } catch (error) {
      console.error('Error initializing management:', error);
      Alert.alert('Error', 'Failed to load user information');
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      
      const { studentReports: students, coadminReports: coadmins } = await reportsService.getAllReports();
      setStudentReports(students);
      setCoadminReports(coadmins);

      const statistics = await reportsService.getReportStats();
      setStats(statistics);

    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
  };

  const handleAcknowledge = (report) => {
    setSelectedReport(report);
    setResponseText('');
    setShowResponseModal(true);
  };

  const submitAcknowledgement = async () => {
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      await reportsService.acknowledgeReport(
        selectedReport.id,
        currentUser.email,
        responseText
      );
      
      Alert.alert('Success', 'Report acknowledged successfully');
      setShowResponseModal(false);
      setSelectedReport(null);
      setResponseText('');
      await loadReports();
    } catch (error) {
      console.error('Error acknowledging report:', error);
      Alert.alert('Error', 'Failed to acknowledge report');
    }
  };

  const handleResolve = async (reportId) => {
    Alert.alert(
      'Resolve Report',
      'Mark this report as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              await reportsService.resolveReport(reportId);
              Alert.alert('Success', 'Report marked as resolved');
              await loadReports();
            } catch (error) {
              console.error('Error resolving report:', error);
              Alert.alert('Error', 'Failed to resolve report');
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'acknowledged': return '#2196F3';
      case 'resolved': return '#4CAF50';
      default: return '#999';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'acknowledged': return 'checkmark-circle-outline';
      case 'resolved': return 'checkmark-done-circle';
      default: return 'help-circle-outline';
    }
  };

  const renderReport = (report) => (
    <View key={report.id} style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reporterInfo}>
          <Ionicons 
            name={report.reporterRole === 'student' ? 'person' : 'shield-checkmark'} 
            size={24} 
            color={report.reporterRole === 'student' ? COLORS.primary : '#8B4513'} 
          />
          <View style={styles.reporterDetails}>
            <Text style={styles.reporterName}>{report.reportedByName || 'Unknown'}</Text>
            <Text style={styles.reporterMeta}>
              {report.registerNumber && `${report.registerNumber} • `}
              Bus: {report.busNumber || 'N/A'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
          <Ionicons name={getStatusIcon(report.status)} size={16} color="#FFF" />
          <Text style={styles.statusText}>{report.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.messageLabel}>Message:</Text>
        <Text style={styles.messageText}>{report.message}</Text>
      </View>

      <Text style={styles.timestamp}>
        <Ionicons name="calendar-outline" size={12} color="#666" /> {formatDate(report.timestamp)}
      </Text>

      {report.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Management Response:</Text>
          <Text style={styles.responseText}>{report.response}</Text>
          <Text style={styles.responseTime}>
            Acknowledged by: {report.acknowledgedBy} • {formatDate(report.acknowledgedAt)}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        {report.status === 'pending' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.acknowledgeButton]}
            onPress={() => handleAcknowledge(report)}
          >
            <Ionicons name="chatbox-ellipses-outline" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Acknowledge</Text>
          </TouchableOpacity>
        )}
        
        {report.status === 'acknowledged' && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.resolveButton]}
            onPress={() => handleResolve(report.id)}
          >
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>Mark Resolved</Text>
          </TouchableOpacity>
        )}

        {report.status === 'resolved' && (
          <View style={styles.resolvedIndicator}>
            <Ionicons name="checkmark-done-circle" size={18} color="#4CAF50" />
            <Text style={styles.resolvedText}>Resolved</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentReports = activeTab === 'students' ? studentReports : coadminReports;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statNumber}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardWide, { backgroundColor: '#FFF9C4' }]}>
            <Ionicons name="person" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{stats.fromStudents}</Text>
            <Text style={styles.statLabel}>From Students</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide, { backgroundColor: '#FFECB3' }]}>
            <Ionicons name="shield-checkmark" size={24} color="#8B4513" />
            <Text style={styles.statNumber}>{stats.fromCoAdmins}</Text>
            <Text style={styles.statLabel}>From Co-Admins</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.activeTab]}
          onPress={() => setActiveTab('students')}
        >
          <Ionicons 
            name="person" 
            size={20} 
            color={activeTab === 'students' ? COLORS.primary : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
            Student Reports ({studentReports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'coadmins' && styles.activeTab]}
          onPress={() => setActiveTab('coadmins')}
        >
          <Ionicons 
            name="shield-checkmark" 
            size={20} 
            color={activeTab === 'coadmins' ? '#8B4513' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'coadmins' && styles.activeTabText]}>
            Co-Admin Reports ({coadminReports.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {currentReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              No {activeTab === 'students' ? 'student' : 'co-admin'} reports yet
            </Text>
          </View>
        ) : (
          currentReports.map(report => renderReport(report))
        )}
      </ScrollView>

      <Modal
        visible={showResponseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Acknowledge Report</Text>
              <TouchableOpacity onPress={() => setShowResponseModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>From: {selectedReport.reportedByName}</Text>
                <Text style={styles.modalMessage}>{selectedReport.message}</Text>
                
                <Text style={styles.modalLabel}>Your Response:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your response..."
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={submitAcknowledgement}
                >
                  <Text style={styles.submitButtonText}>Submit Response</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFF',
    ...SHADOWS.sm,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#666',
  },
  statsContainer: {
    padding: SPACING.md,
    backgroundColor: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statCardWide: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#666',
    marginTop: SPACING.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#666',
    marginLeft: SPACING.xs,
  },
  activeTabText: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  reporterInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  reporterDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  reporterName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  reporterMeta: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFF',
    marginLeft: 4,
  },
  messageContainer: {
    marginBottom: SPACING.md,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#666',
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#999',
    marginBottom: SPACING.sm,
  },
  responseContainer: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  responseLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#2E7D32',
    marginBottom: SPACING.xs,
  },
  responseText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 18,
  },
  responseTime: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: '#666',
    marginTop: SPACING.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.sm,
  },
  acknowledgeButton: {
    backgroundColor: '#2196F3',
  },
  resolveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFF',
    marginLeft: SPACING.xs,
  },
  resolvedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resolvedText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#4CAF50',
    marginLeft: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#999',
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalMessage: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#666',
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: RADIUS.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: FONTS.regular,
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
});

export default ReportsAnalytics;
