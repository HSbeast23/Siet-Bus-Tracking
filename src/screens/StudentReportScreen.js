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

const StudentReportScreen = ({ navigation }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [recipient, setRecipient] = useState('management'); // 'management' or 'coadmin'

  React.useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const user = await authService.getCurrentUser();
    if (!user || user.role !== 'student') {
      Alert.alert('Error', 'You must be logged in as a student');
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
        reportedByName: currentUser.name,
        reporterRole: 'student',
        reporterEmail: currentUser.email,
        busNumber: currentUser.busNumber,
        registerNumber: currentUser.registerNumber,
        recipientRole: recipient // 'management' or 'coadmin'
      };

      const result = await reportsService.submitReport(reportData);

      if (result.success) {
        const recipientName = recipient === 'management' ? 'Management' : 'Co-Admin';
        Alert.alert(
          'Success',
          `Your report has been sent to ${recipientName}`,
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
          <Text style={styles.headerTitle}>Submit Report</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Student Info Card */}
          {currentUser && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{currentUser.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="school" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Register#:</Text>
                <Text style={styles.infoValue}>{currentUser.registerNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="bus" size={20} color={COLORS.primary} />
                <Text style={styles.infoLabel}>Bus:</Text>
                <Text style={styles.infoValue}>{currentUser.busNumber}</Text>
              </View>
            </View>
          )}

          {/* Recipient Selector */}
          <View style={styles.recipientCard}>
            <Text style={styles.recipientLabel}>Send Report To:</Text>
            <View style={styles.recipientOptions}>
              <TouchableOpacity
                style={[
                  styles.recipientButton,
                  recipient === 'management' && styles.recipientButtonActive
                ]}
                onPress={() => setRecipient('management')}
              >
                <Ionicons 
                  name="briefcase" 
                  size={20} 
                  color={recipient === 'management' ? COLORS.white : COLORS.primary} 
                />
                <Text style={[
                  styles.recipientButtonText,
                  recipient === 'management' && styles.recipientButtonTextActive
                ]}>
                  Management
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.recipientButton,
                  recipient === 'coadmin' && styles.recipientButtonActive
                ]}
                onPress={() => setRecipient('coadmin')}
              >
                <Ionicons 
                  name="shield-checkmark" 
                  size={20} 
                  color={recipient === 'coadmin' ? COLORS.white : '#8B4513'} 
                />
                <Text style={[
                  styles.recipientButtonText,
                  recipient === 'coadmin' && styles.recipientButtonTextActive
                ]}>
                  Co-Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.info} />
            <Text style={styles.instructionsText}>
              Write your message below. This will be sent to {recipient === 'management' ? 'Management' : 'your Bus Co-Admin'} for review.
            </Text>
          </View>

          {/* Message Input */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Your Message</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Type your message here..."
              placeholderTextColor={COLORS.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={10}
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
                <Text style={styles.submitButtonText}>Send Report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              📝 Your report will include your name, register number, and bus number.
              {'\n'}
              ⏱️ Management will review and respond as soon as possible.
            </Text>
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
    backgroundColor: COLORS.primary,
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
    ...SHADOWS.sm,
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
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  recipientCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  recipientLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  recipientOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  recipientButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  recipientButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  recipientButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  recipientButtonTextActive: {
    color: COLORS.white,
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
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
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
    height: 200,
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
    backgroundColor: COLORS.primary,
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
    backgroundColor: '#FFF3E0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  noteText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default StudentReportScreen;
