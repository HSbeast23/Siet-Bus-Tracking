import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ReportsAnalytics = ({ navigation }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  // Mock analytics data that changes based on timeframe
  const getAnalyticsData = (timeframe) => {
    const data = {
      week: {
        totalRides: 1247,
        totalDistance: 8945,
        fuelEfficiency: 12.5,
        onTimePerformance: 94.2,
        activeDrivers: 18,
        studentSatisfaction: 4.6
      },
      month: {
        totalRides: 5430,
        totalDistance: 38920,
        fuelEfficiency: 11.8,
        onTimePerformance: 91.7,
        activeDrivers: 22,
        studentSatisfaction: 4.4
      },
      quarter: {
        totalRides: 16890,
        totalDistance: 121750,
        fuelEfficiency: 12.1,
        onTimePerformance: 89.3,
        activeDrivers: 22,
        studentSatisfaction: 4.3
      }
    };
    return data[timeframe] || data.week;
  };

  const analyticsData = getAnalyticsData(selectedTimeframe);

  // Mock feedback data
  const feedbackData = [
    {
      id: 1,
      type: 'complaint',
      title: 'Bus Late Arrival',
      description: 'Bus SIET-003 was 15 minutes late today morning',
      student: 'Aadhya Sharma',
      date: '2024-01-15',
      time: '08:45 AM',
      status: 'resolved',
      priority: 'medium'
    },
    {
      id: 2,
      type: 'suggestion',
      title: 'Additional Stop Request',
      description: 'Request to add stop near City Mall for easier access',
      student: 'Arjun Patel',
      date: '2024-01-14',
      time: '02:30 PM',
      status: 'pending',
      priority: 'low'
    },
    {
      id: 3,
      type: 'complaint',
      title: 'Bus Cleanliness Issue',
      description: 'Seats in SIET-007 need cleaning, very dusty',
      student: 'Bhavya Singh',
      date: '2024-01-14',
      time: '09:15 AM',
      status: 'in-progress',
      priority: 'high'
    },
    {
      id: 4,
      type: 'appreciation',
      title: 'Excellent Driver Service',
      description: 'Driver Rajesh Kumar is very helpful and punctual',
      student: 'Chaitanya Verma',
      date: '2024-01-13',
      time: '04:45 PM',
      status: 'acknowledged',
      priority: 'low'
    },
    {
      id: 5,
      type: 'complaint',
      title: 'Route Change Request',
      description: 'Morning route timing is not suitable for early classes',
      student: 'Diya Agarwal',
      date: '2024-01-13',
      time: '11:20 AM',
      status: 'pending',
      priority: 'medium'
    }
  ];

  const timeframes = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return COLORS.success;
      case 'in-progress': return COLORS.warning;
      case 'pending': return COLORS.danger;
      case 'acknowledged': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return COLORS.danger;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.success;
      default: return COLORS.gray;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'complaint': return 'alert-circle';
      case 'suggestion': return 'bulb';
      case 'appreciation': return 'heart';
      default: return 'document';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'complaint': return COLORS.danger;
      case 'suggestion': return COLORS.primary;
      case 'appreciation': return COLORS.success;
      default: return COLORS.gray;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map((timeframe) => (
            <TouchableOpacity
              key={timeframe.id}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe.id && styles.activeTimeframe
              ]}
              onPress={() => setSelectedTimeframe(timeframe.id)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe.id && styles.activeTimeframeText
              ]}>
                {timeframe.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Analytics Overview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="car" size={24} color={COLORS.primary} />
              <Text style={styles.metricValue}>{analyticsData.totalRides}</Text>
              <Text style={styles.metricLabel}>Total Rides</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="speedometer" size={24} color={COLORS.success} />
              <Text style={styles.metricValue}>{analyticsData.totalDistance}km</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="leaf" size={24} color={COLORS.warning} />
              <Text style={styles.metricValue}>{analyticsData.fuelEfficiency}</Text>
              <Text style={styles.metricLabel}>Fuel Eff. (km/l)</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="time" size={24} color={COLORS.danger} />
              <Text style={styles.metricValue}>{analyticsData.onTimePerformance}%</Text>
              <Text style={styles.metricLabel}>On Time</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="people" size={24} color={COLORS.secondary} />
              <Text style={styles.metricValue}>{analyticsData.activeDrivers}</Text>
              <Text style={styles.metricLabel}>Active Drivers</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="star" size={24} color={COLORS.primary} />
              <Text style={styles.metricValue}>{analyticsData.studentSatisfaction}/5</Text>
              <Text style={styles.metricLabel}>Satisfaction</Text>
            </View>
          </View>
        </View>

        {/* Feedback Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Feedback Summary</Text>
          <View style={styles.feedbackSummary}>
            <View style={styles.feedbackType}>
              <View style={[styles.feedbackDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.feedbackTypeText}>
                Complaints: {feedbackData.filter(f => f.type === 'complaint').length}
              </Text>
            </View>
            <View style={styles.feedbackType}>
              <View style={[styles.feedbackDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.feedbackTypeText}>
                Suggestions: {feedbackData.filter(f => f.type === 'suggestion').length}
              </Text>
            </View>
            <View style={styles.feedbackType}>
              <View style={[styles.feedbackDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.feedbackTypeText}>
                Appreciations: {feedbackData.filter(f => f.type === 'appreciation').length}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Feedback */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {feedbackData.slice(0, 3).map((feedback) => (
            <TouchableOpacity key={feedback.id} style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackInfo}>
                  <View style={[styles.typeIconContainer, { backgroundColor: getTypeColor(feedback.type) }]}>
                    <Ionicons name={getTypeIcon(feedback.type)} size={16} color={COLORS.white} />
                  </View>
                  <View style={styles.feedbackDetails}>
                    <Text style={styles.feedbackTitle}>{feedback.title}</Text>
                    <Text style={styles.feedbackStudent}>by {feedback.student}</Text>
                  </View>
                </View>
                <View style={styles.feedbackMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(feedback.priority) }]}>
                    <Text style={styles.priorityText}>{feedback.priority}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(feedback.status) }]}>
                    <Text style={styles.statusText}>{feedback.status}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.feedbackDescription} numberOfLines={2}>
                {feedback.description}
              </Text>
              
              <View style={styles.feedbackFooter}>
                <Text style={styles.feedbackDate}>{feedback.date} at {feedback.time}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Export Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="analytics" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Detailed Analytics</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTimeframe: {
    backgroundColor: COLORS.primary,
  },
  timeframeText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeTimeframeText: {
    color: COLORS.white,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 80) / 3,
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  feedbackSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feedbackType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  feedbackTypeText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  feedbackCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 15,
    marginBottom: 15,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  feedbackDetails: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  feedbackStudent: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  feedbackMeta: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  feedbackDescription: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 8,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ReportsAnalytics;
