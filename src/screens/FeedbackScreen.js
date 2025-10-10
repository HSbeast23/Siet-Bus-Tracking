import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const FeedbackScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('general');
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [student, setStudent] = useState(null);

  const categories = [
    { id: 'general', label: 'General', icon: 'chatbubble-outline' },
    { id: 'bus', label: 'Bus Issue', icon: 'bus-outline' },
    { id: 'driver', label: 'Driver', icon: 'person-outline' },
    { id: 'route', label: 'Route/Time', icon: 'time-outline' },
    { id: 'safety', label: 'Safety', icon: 'shield-checkmark-outline' }
  ];

  useEffect(() => {
    loadMyFeedbacks();
  }, []);

  const loadMyFeedbacks = async () => {
    try {
      setRefreshing(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'student') {
        Alert.alert('Error', 'You must be logged in as a student');
        navigation.goBack();
        return;
      }

      setStudent(currentUser);

      // Load student's previous feedbacks
      const feedbackRef = collection(db, 'feedbacks');
      const feedbackQuery = query(
        feedbackRef,
        where('studentId', '==', currentUser.id)
      );

      const snapshot = await getDocs(feedbackQuery);
      const feedbacks = [];
      
      snapshot.forEach((doc) => {
        feedbacks.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          respondedAt: doc.data().respondedAt?.toDate ? doc.data().respondedAt.toDate() : null
        });
      });

      // Sort by date descending
      feedbacks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setMyFeedbacks(feedbacks);
      console.log(`✅ [FEEDBACK] Loaded ${feedbacks.length} feedbacks for student ${currentUser.name}`);
    } catch (error) {
      console.error('❌ [FEEDBACK] Error loading feedbacks:', error);
      Alert.alert('Error', 'Failed to load your feedbacks');
    } finally {
      setRefreshing(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Required', 'Please enter your feedback or complaint');
      return;
    }

    if (!student) {
      Alert.alert('Error', 'Student information not loaded');
      return;
    }

    try {
      setLoading(true);

      const feedbackData = {
        studentId: student.id,
        studentName: student.name,
        registerNumber: student.registerNumber,
        busNumber: student.busNumber,
        department: student.department,
        year: student.year,
        category: category,
        message: feedbackText.trim(),
        status: 'pending', // pending, acknowledged, resolved
        createdAt: serverTimestamp(),
        response: null,
        respondedBy: null,
        respondedAt: null
      };

      await addDoc(collection(db, 'feedbacks'), feedbackData);

      Alert.alert(
        'Success',
        'Your feedback has been submitted successfully. Management will review it soon.',
        [{ text: 'OK', onPress: () => {
          setFeedbackText('');
          setCategory('general');
          loadMyFeedbacks();
        }}]
      );

      console.log(`✅ [FEEDBACK] Submitted feedback from ${student.name}`);
    } catch (error) {
      console.error('❌ [FEEDBACK] Error submitting:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'acknowledged':
        return COLORS.warning;
      case 'resolved':
        return COLORS.success;
      default:
        return COLORS.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'acknowledged':
        return 'checkmark-circle';
      case 'resolved':
        return 'checkmark-done-circle';
      default:
        return 'time';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback & Complaints</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadMyFeedbacks}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Submit New Feedback Card */}
        <View style={styles.submitCard}>
          <Text style={styles.sectionTitle}>Submit Feedback</Text>
          
          {/* Category Selection */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.id && styles.categoryChipActive
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={18} 
                  color={category === cat.id ? COLORS.white : COLORS.primary} 
                />
                <Text style={[
                  styles.categoryText,
                  category === cat.id && styles.categoryTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback Text Input */}
          <Text style={styles.label}>Your Message</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe your feedback or complaint in detail..."
            placeholderTextColor={COLORS.gray}
            multiline
            numberOfLines={6}
            value={feedbackText}
            onChangeText={setFeedbackText}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={submitFeedback}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* My Previous Feedbacks */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>My Feedbacks ({myFeedbacks.length})</Text>
          
          {myFeedbacks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.gray} />
              <Text style={styles.emptyText}>No feedbacks yet</Text>
              <Text style={styles.emptySubtext}>Your submitted feedbacks will appear here</Text>
            </View>
          ) : (
            myFeedbacks.map((feedback) => (
              <View key={feedback.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {categories.find(c => c.id === feedback.category)?.label || 'General'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feedback.status) }]}>
                    <Ionicons 
                      name={getStatusIcon(feedback.status)} 
                      size={14} 
                      color={COLORS.white} 
                    />
                    <Text style={styles.statusText}>
                      {feedback.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.feedbackMessage}>{feedback.message}</Text>
                
                <Text style={styles.feedbackDate}>
                  Submitted: {formatDate(feedback.createdAt)}
                </Text>

                {/* Management Response */}
                {feedback.response && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="person-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.responseTitle}>Management Response:</Text>
                    </View>
                    <Text style={styles.responseText}>{feedback.response}</Text>
                    {feedback.respondedBy && (
                      <Text style={styles.responseBy}>
                        - {feedback.respondedBy}
                      </Text>
                    )}
                    {feedback.respondedAt && (
                      <Text style={styles.responseDate}>
                        {formatDate(feedback.respondedAt)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))
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
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  submitCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  textInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    minHeight: 120,
    marginBottom: SPACING.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  historySection: {
    marginTop: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
  },
  feedbackCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  categoryBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
  },
  feedbackMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.secondary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  feedbackDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
  },
  responseContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  responseTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  responseText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.secondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  responseBy: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  responseDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default FeedbackScreen;
