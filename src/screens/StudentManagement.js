import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const { width } = Dimensions.get('window');

const StudentManagement = ({ navigation }) => {
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState({ total: 0, byYear: {}, byDepartment: {}, active: 0 });

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const departments = ['All', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'];

  useEffect(() => {
    loadStudentData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [selectedYear, selectedDepartment, searchQuery]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const allStudents = await registeredUsersStorage.getAllStudents();
      const stats = await registeredUsersStorage.getStudentStats();
      
      setStudents(allStudents);
      setStudentStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading student data:', error);
      setLoading(false);
    }
  };

  const filterStudents = async () => {
    try {
      let filteredData = [];
      
      if (selectedDepartment === 'All') {
        filteredData = await registeredUsersStorage.getStudentsByYear(selectedYear);
      } else {
        filteredData = await registeredUsersStorage.getStudentsByYearAndDepartment(selectedYear, selectedDepartment);
      }

      if (searchQuery.trim()) {
        filteredData = filteredData.filter(student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.registerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setStudents(filteredData);
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
        <Text style={styles.headerTitle}>Student Management</Text>
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
            {students.map((student) => (
              <TouchableOpacity
                key={student.id}
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
                      Reg: {new Date(student.registeredAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
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
  yearContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 10,
  },
  activeYear: {
    backgroundColor: COLORS.primary,
  },
  yearText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeYearText: {
    color: COLORS.white,
  },
  departmentContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  departmentButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  activeDepartment: {
    backgroundColor: COLORS.success,
  },
  departmentText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  activeDepartmentText: {
    color: COLORS.white,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.secondary,
    marginLeft: 10,
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
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
    borderRadius: 22.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  rollNumber: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  phoneNumber: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
  departmentText: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  busInfo: {
    alignItems: 'flex-end',
  },
  busNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  busNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  registeredDate: {
    fontSize: 9,
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
    color: COLORS.gray,
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default StudentManagement;
