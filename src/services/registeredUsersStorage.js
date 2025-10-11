import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { normalizeBusNumber } from './locationService';

const YEAR_LABELS = {
  I: '1st Year',
  '1': '1st Year',
  '1ST': '1st Year',
  II: '2nd Year',
  '2': '2nd Year',
  '2ND': '2nd Year',
  III: '3rd Year',
  '3': '3rd Year',
  '3RD': '3rd Year',
  IV: '4th Year',
  '4': '4th Year',
  '4TH': '4th Year',
};

const normalizeYearLabel = (value = '') => {
  const raw = value.toString().trim().toUpperCase();
  if (!raw) return { code: raw, label: 'Unknown Year' };
  const cleaned = raw.replace(/YEAR|YR|\./g, '').trim();
  const label = YEAR_LABELS[cleaned] || YEAR_LABELS[cleaned.replace(/[^A-Z0-9]/g, '')] || raw;
  return { code: cleaned || raw, label };
};

const normalizeDepartmentLabel = (value = '') => {
  const raw = value.toString().trim();
  if (!raw) return 'General';
  const normalized = raw.toUpperCase();
  const aliasKey = normalized.replace(/[\s\._-]/g, '');
  const departmentAliases = {
    BIOTECH: 'BT',
    BIOTECHNOLOGY: 'BT',
    BIOTECHN: 'BT',
    BIOTECHENGG: 'BT',
    BIOTECHENGINEERING: 'BT',
    BIOTECHENGINEER: 'BT',
    BIOT: 'BT',
    BIOTECHS: 'BT',
    BIOTECHSCIENCE: 'BT',
    BIOTECHSCI: 'BT',
    BIOTECHNO: 'BT',
    BIOTECHENG: 'BT',
    BIOTECHENGR: 'BT',
    BIOTECHENGINEERS: 'BT',
    BIOTECHENGNS: 'BT',
    BIOTECHENGN: 'BT',
    BIOTECHENGNEERING: 'BT',
    BIOTECHENGNEERS: 'BT',
    BIOTECHNOLOG: 'BT',
    BIOTECHNOLOGIST: 'BT',
    BIOTECHNOLOGISTS: 'BT',
    BIOTECHNOLOGYS: 'BT',
  };
  return departmentAliases[aliasKey] || normalized;
};

const USERS_COLLECTION = 'users';

class RegisteredUsersStorage {
  constructor() {
    this.usersCollection = collection(db, USERS_COLLECTION);
    this.studentCache = {
      data: null,
      fetchedAt: 0,
    };
    this.cacheTTL = 60 * 1000; // 1 minute cache to avoid repeated Firestore reads
  }

  // Student registration storage
  async addStudent(studentData) {
    console.warn('addStudent is deprecated in unified onboarding flow. Use CSV importer.');
    return Promise.resolve(studentData);
  }

  async getAllStudents(options = {}) {
    try {
      const { forceRefresh = false } = options;
      const now = Date.now();
      if (!forceRefresh && this.studentCache.data && now - this.studentCache.fetchedAt < this.cacheTTL) {
        return this.studentCache.data.map((student) => ({ ...student }));
      }

      const studentsQuery = query(this.usersCollection, where('role', '==', 'student'));
      const snapshot = await getDocs(studentsQuery);
      const seen = new Set();

      const results = snapshot.docs.map((studentDoc, index) => {
        const data = studentDoc.data();
        const normalizedYear = normalizeYearLabel(data.year);
        const normalizedDepartment = normalizeDepartmentLabel(data.department);
        const studentId = studentDoc.id || data.userId || data.registerNumber;
        if (seen.has(studentId)) {
          return null;
        }
        seen.add(studentId);
        return {
          id: studentId,
          ...data,
          busNumber: normalizeBusNumber(data.busNumber || data.busNo),
          yearCode: normalizedYear.code,
          year: normalizedYear.label,
          department: normalizedDepartment,
          departmentRaw: data.department,
          boardingPoint: data.boardingPoint || '',
          order: data.order || index + 1,
          status: (data.status || 'Active').trim(),
          registeredAt: data.registeredAt || data.createdAt || null,
          phone: data.phone || data.mobile || '',
          email: data.email || '',
        };
      }).filter(Boolean);

      this.studentCache = {
        data: results,
        fetchedAt: now,
      };

      return results.map((student) => ({ ...student }));
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }

  async getStudentsByYear(year) {
    try {
  const target = normalizeYearLabel(year).label;
  const students = await this.getAllStudents();
  return students.filter((student) => student.year === target);
    } catch (error) {
      console.error('Error getting students by year:', error);
      return [];
    }
  }

  async getStudentsByDepartment(department) {
    try {
  const target = normalizeDepartmentLabel(department);
  const students = await this.getAllStudents();
  return students.filter((student) => student.department === target);
    } catch (error) {
      console.error('Error getting students by department:', error);
      return [];
    }
  }

  async getStudentsByYearAndDepartment(year, department) {
    try {
      const students = await this.getAllStudents();
      const targetYear = normalizeYearLabel(year).label;
      const targetDept = normalizeDepartmentLabel(department);
      return students.filter(
        (student) =>
          student.year === targetYear &&
          (department === 'All' || student.department === targetDept)
      );
    } catch (error) {
      console.error('Error getting students by year and department:', error);
      return [];
    }
  }

  // Driver registration storage
  async addDriver(driverData) {
    console.warn('addDriver is deprecated in unified onboarding flow. Use CSV importer.');
    return Promise.resolve(driverData);
  }

  async getAllDrivers() {
    try {
      const driversQuery = query(this.usersCollection, where('role', '==', 'driver'));
      const snapshot = await getDocs(driversQuery);
      return snapshot.docs.map((driverDoc) => {
        const data = driverDoc.data();
        return {
          ...data,
          busNumber: normalizeBusNumber(data.busNumber || data.busNo),
        };
      });
    } catch (error) {
      console.error('Error getting drivers:', error);
      return [];
    }
  }

  async getDriverByBusNumber(busNumber) {
    try {
      const normalizedBus = normalizeBusNumber(busNumber);
      let snapshot = await getDocs(query(this.usersCollection, where('busNumber', '==', normalizedBus)));

      if (snapshot.empty) {
        snapshot = await getDocs(query(this.usersCollection, where('busNo', '==', normalizedBus)));
      }

      const data = snapshot.docs
        .map((driverDoc) => driverDoc.data())
        .find((driverData) => (driverData.role || '').toLowerCase() === 'driver');

      if (!data) {
        return null;
      }

      return {
        ...data,
        busNumber: normalizeBusNumber(data.busNumber || data.busNo),
      };
    } catch (error) {
      console.error('Error getting driver by bus number:', error);
      return null;
    }
  }

  async updateDriver(driverId, data) {
    try {
      const driverDoc = doc(db, USERS_COLLECTION, driverId);
      await updateDoc(driverDoc, data);
    } catch (error) {
      console.error('Error updating driver:', error);
    }
  }

  // Utility functions
  extractDepartmentFromRegNumber(regNumber) {
    const match = regNumber?.match(/([A-Z]{2,4})(?:\d+)?$/);
    if (match) {
      const dept = match[1];
      if (['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'BT'].includes(dept)) {
        return dept;
      }
    }
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'BT'];
    return departments[Math.floor(Math.random() * departments.length)];
  }

  generatePhoneNumber() {
    return '987654' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }

  generateLicenseNumber() {
    return 'TN' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  }

  // Get statistics
  async getStudentStats(studentsInput) {
    try {
      const students = Array.isArray(studentsInput) ? studentsInput : await this.getAllStudents();
      const activeStudents = students.filter((student) => (student.status || '').toLowerCase() !== 'inactive');
      const statsByYear = {};
      const statsByDepartment = {};

      activeStudents.forEach((student) => {
        const yearLabel = student.year;
        const department = student.department;
        statsByYear[yearLabel] = (statsByYear[yearLabel] || 0) + 1;
        statsByDepartment[department] = (statsByDepartment[department] || 0) + 1;
      });

      return {
        total: activeStudents.length,
        byYear: statsByYear,
        byDepartment: statsByDepartment,
        active: activeStudents.length,
        rawTotal: students.length,
      };
    } catch (error) {
      console.error('Error getting student stats:', error);
      return { total: 0, byYear: {}, byDepartment: {}, active: 0, rawTotal: 0 };
    }
  }

  async getDriverStats() {
    try {
      const drivers = await this.getAllDrivers();
      return {
        total: drivers.length,
        active: drivers.filter((d) => d.status === 'Active').length,
        authenticated: drivers.filter((d) => d.authenticated).length,
      };
    } catch (error) {
      console.error('Error getting driver stats:', error);
      return { total: 0, active: 0, authenticated: 0 };
    }
  }

  async getActiveStudentCountsByBus() {
    try {
      const students = await this.getAllStudents();
      return students.reduce((acc, student) => {
        if ((student.status || '').toLowerCase() === 'inactive') {
          return acc;
        }
        const busNumber = normalizeBusNumber(student.busNumber);
        if (!busNumber) {
          return acc;
        }
        acc[busNumber] = (acc[busNumber] || 0) + 1;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error building active student counts by bus:', error);
      return {};
    }
  }

  // Clear all data (for testing)
  async clearAllData() {
    try {
      const usersSnapshot = await getDocs(this.usersCollection);
      const deletions = usersSnapshot.docs
        .filter((userDoc) => ['student', 'driver'].includes((userDoc.data().role || '').toLowerCase()))
        .map((userDoc) => deleteDoc(userDoc.ref));

      await Promise.all(deletions);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
    this.invalidateStudentCache();
  }

  invalidateStudentCache() {
    this.studentCache = {
      data: null,
      fetchedAt: 0,
    };
  }
}

export const registeredUsersStorage = new RegisteredUsersStorage();
