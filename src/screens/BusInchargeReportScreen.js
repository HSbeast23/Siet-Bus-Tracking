import React, { useState } from 'react';
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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { reportsService } from '../services/reportsService';

const BusInchargeReportScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const user = await authService.getCurrentUser();
    if (!user || user.role !== 'coadmin') {
      Alert.alert('Error', 'You must be logged in as Bus Incharge');
      navigation.goBack();
      return;
    }
    setCurrentUser(user);
  };

  const handleSubmitReport = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User information not loaded');
      return;
    }

    setLoading(true);
    try {
      const reportData = {
        message: message.trim(),
        reportedBy: currentUser.name,
        reporterRole: 'coadmin',
        reporterEmail: currentUser.email,
        busNumber: currentUser.busId
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
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Report to Management</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              editable={!loading}
            />
            <Text style={styles.charCount}>{message.length} characters</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitReport}
            disabled={loading}
          >
            {loading ? (
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
});

export default BusInchargeReportScreen;
