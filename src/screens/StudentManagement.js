import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { registeredUsersStorage } from '../services/registeredUsersStorage';
import { normalizeBusNumber } from '../services/locationService';

const { width } = Dimensions.get('window');

const StudentManagement = ({ navigation, route }) => {
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState({ total: 0, byYear: {}, byDepartment: {}, active: 0 });

  // Get params from navigation (for Bus Incharge filtering)
  const { busId: filterBusId, role } = route.params || {};
  const isCoAdmin = role === 'coadmin';
  const normalizedFilterBusId = filterBusId ? normalizeBusNumber(filterBusId) : null;

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const departments = ['All', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'BT'];

  useEffect(() => {
    loadStudentData();
  }, []);

  useEffect(() => {
    filterStudents(allStudents);
  }, [selectedYear, selectedDepartment, searchQuery, allStudents]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
  console.log(`🔍 [STUDENT MGMT] Loading students... Role: ${role}, Filter Bus ID: ${normalizedFilterBusId}, Is Bus Incharge: ${isCoAdmin}`);
      
  let allStudents = await registeredUsersStorage.getAllStudents({ forceRefresh: true });
      console.log(`📦 [STUDENT MGMT] Total students from Firebase: ${allStudents.length}`);
      
      // Log all student bus numbers to debug
      if (allStudents.length > 0) {
        const busNumbers = [...new Set(allStudents.map(s => s.busNumber))];
        console.log(`🚌 [STUDENT MGMT] Unique student bus numbers:`, busNumbers);
      }
      
  // 🔒 Filter for Bus Incharge: Show ONLY their assigned bus students
      if (isCoAdmin && normalizedFilterBusId) {
  console.log(`🔒 [STUDENT MGMT] Applying Bus Incharge filter for bus: ${normalizedFilterBusId}`);
        const beforeFilter = allStudents.length;
        allStudents = allStudents.filter(student => {
          const match = normalizeBusNumber(student.busNumber) === normalizedFilterBusId;
          if (match) {
            console.log(`   ✅ Student ${student.name} (${student.busNumber}) matches ${normalizedFilterBusId}`);
          }
          return match;
        });
  console.log(`✅ [STUDENT MGMT] Bus Incharge filter result: ${allStudents.length}/${beforeFilter} student(s) for ${normalizedFilterBusId}`);
      }
      
  const stats = await registeredUsersStorage.getStudentStats(allStudents);
      
      setAllStudents(allStudents);
      setStudentStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('❌ [STUDENT MGMT] Error loading student data:', error);
      setLoading(false);
    }
  };

  const filterStudents = (source = []) => {
    try {
      let workingSet = Array.isArray(source) && source.length ? [...source] : [...allStudents];

      workingSet = workingSet.filter((student) => student.year === selectedYear);

      if (selectedDepartment !== 'All') {
        const normalizedDepartment = selectedDepartment.toUpperCase();
        workingSet = workingSet.filter((student) => student.department === normalizedDepartment);
      }

      if (isCoAdmin && normalizedFilterBusId) {
        workingSet = workingSet.filter((student) => normalizeBusNumber(student.busNumber) === normalizedFilterBusId);
      }

      if (searchQuery.trim()) {
        const queryLower = searchQuery.trim().toLowerCase();
        workingSet = workingSet.filter((student) =>
          student.name.toLowerCase().includes(queryLower) ||
          (student.registerNumber || '').toLowerCase().includes(queryLower) ||
          (student.busNumber || '').toLowerCase().includes(queryLower) ||
          (student.email || '').toLowerCase().includes(queryLower)
        );
      }

      setStudents(workingSet);
    } catch (error) {
      console.error('Error filtering students:', error);
    }
  };

  const getTotalStudentsByYear = () => {
    return studentStats.byYear[selectedYear] || 0;
  };

  const getDepartmentCount = () => {
    return Object.keys(studentStats.byDepartment).length;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCoAdmin ? `Student Management - ${normalizedFilterBusId}` : 'Student Management'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Year Selector */}
      <View style={styles.yearContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearButton,
                selectedYear === year && styles.activeYear
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[
                styles.yearText,
                selectedYear === year && styles.activeYearText
              ]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Department Selector */}
      <View style={styles.departmentContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={[
                styles.departmentButton,
                selectedDepartment === dept && styles.activeDepartment
              ]}
              onPress={() => setSelectedDepartment(dept)}
            >
              <Text style={[
                styles.departmentText,
                selectedDepartment === dept && styles.activeDepartmentText
              ]}>
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{getTotalStudentsByYear()}</Text>
          <Text style={styles.summaryLabel}>Total {selectedYear}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>
            {getDepartmentCount()}
          </Text>
          <Text style={styles.summaryLabel}>Departments</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
            {students.length}
          </Text>
          <Text style={styles.summaryLabel}>Filtered</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students, roll no, or bus..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Students List */}
      <ScrollView style={styles.studentsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {selectedYear} - {selectedDepartment} Students ({students.length})
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading students...</Text>
          </View>
        ) : (
          <>
            {students.map((student) => {
              const key = student.id || student.registerNumber || `${student.name}-${student.busNumber}`;
              const registeredDate = student.registeredAt ? new Date(student.registeredAt) : null;
              const formattedDate = registeredDate && !Number.isNaN(registeredDate.getTime())
                ? registeredDate.toLocaleDateString()
                : 'N/A';

              return (
              <TouchableOpacity
                key={key}
                style={styles.studentCard}
                activeOpacity={0.7}
              >
                <View style={styles.studentCardHeader}>
                  <View style={styles.studentInfo}>
                    <View style={styles.studentAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.rollNumber}>{student.registerNumber}</Text>
                      <Text style={styles.phoneNumber}>{student.phone || 'No phone'}</Text>
                      <Text style={styles.departmentText}>{student.department} • {student.year}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.busInfo}>
                    <View style={styles.busNumberBadge}>
                      <Ionicons name="bus" size={16} color={COLORS.white} />
                      <Text style={styles.busNumberText}>{student.busNumber}</Text>
                    </View>
                    <Text style={styles.registeredDate}>
                      Reg: {formattedDate}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
            
            {students.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={60} color={COLORS.gray} />
                <Text style={styles.emptyStateText}>No students found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {studentStats.total === 0 
                    ? "No students have registered yet. Ask students to register through the app!"
                    : "Try adjusting your filters or search query"
                  }
                </Text>
              </View>
            )}
          </>
        )}
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
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  yearContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  yearButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  activeYear: {
    backgroundColor: COLORS.primary,
  },
  yearText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
  },
  activeYearText: {
    color: COLORS.white,
  },
  departmentContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  departmentButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    marginRight: SPACING.sm,
  },
  activeDepartment: {
    backgroundColor: COLORS.success,
  },
  departmentText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
  },
  activeDepartmentText: {
    color: COLORS.white,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    justifyContent: 'space-around',
    ...SHADOWS.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: {
    width: 45,
    height: 45,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  rollNumber: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  phoneNumber: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 1,
  },
  departmentText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginTop: 2,
  },
  busInfo: {
    alignItems: 'flex-end',
  },
  busNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    marginBottom: 4,
  },
  busNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    marginLeft: 4,
  },
  registeredDate: {
    fontSize: 9,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'right',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default StudentManagement;
