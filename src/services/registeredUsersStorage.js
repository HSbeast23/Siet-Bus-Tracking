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

class RegisteredUsersStorage {
  constructor() {
    this.studentsCollection = collection(db, 'students');
    this.driversCollection = collection(db, 'drivers');
  }

  // Student registration storage
  async addStudent(studentData) {
    try {
      const studentId = studentData.uid || studentData.id || doc(this.studentsCollection).id;
      const normalizedBus = normalizeBusNumber(studentData.busNumber);

      const preparedStudent = {
        id: studentId,
        name: studentData.name,
        email: studentData.email.toLowerCase(),
        registerNumber: studentData.registerNumber,
        year: studentData.year,
        busNumber: normalizedBus,
        phone: studentData.phone || this.generatePhoneNumber(),
        department: this.extractDepartmentFromRegNumber(studentData.registerNumber),
        registeredAt: studentData.registeredAt || new Date().toISOString(),
        status: studentData.status || 'Active',
        authenticated: studentData.authenticated ?? true,
        lastLogin: studentData.lastLogin || null,
      };

      const studentDoc = doc(db, 'students', studentId);
      await setDoc(studentDoc, preparedStudent, { merge: true });
      return preparedStudent;
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  }

  async getAllStudents() {
    try {
      const snapshot = await getDocs(this.studentsCollection);
        return snapshot.docs.map((studentDoc) => {
          const data = studentDoc.data();
          return {
            ...data,
            busNumber: normalizeBusNumber(data.busNumber),
          };
        });
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }

  async getStudentsByYear(year) {
    try {
      const students = await this.getAllStudents();
      return students.filter((student) => student.year === year);
    } catch (error) {
      console.error('Error getting students by year:', error);
      return [];
    }
  }

  async getStudentsByDepartment(department) {
    try {
      const students = await this.getAllStudents();
      return students.filter((student) => student.department === department);
    } catch (error) {
      console.error('Error getting students by department:', error);
      return [];
    }
  }

  async getStudentsByYearAndDepartment(year, department) {
    try {
      const students = await this.getAllStudents();
      return students.filter(
        (student) =>
          student.year === year &&
          (department === 'All' || student.department === department)
      );
    } catch (error) {
      console.error('Error getting students by year and department:', error);
      return [];
    }
  }

  // Driver registration storage
  async addDriver(driverData) {
    try {
      const driverId = driverData.uid || driverData.id || doc(this.driversCollection).id;
      const normalizedBus = normalizeBusNumber(driverData.busNumber);

      const preparedDriver = {
        id: driverId,
        name: driverData.name,
        email: driverData.email.toLowerCase(),
        busNumber: normalizedBus,
        phone: driverData.phone || this.generatePhoneNumber(),
        licenseNumber: driverData.licenseNumber || this.generateLicenseNumber(),
        registeredAt: driverData.registeredAt || new Date().toISOString(),
        status: driverData.status || 'Inactive',
        authenticated: driverData.authenticated ?? false,
        lastLogin: driverData.lastLogin || null,
        experience: driverData.experience || `${Math.floor(Math.random() * 10) + 1} years`,
      };

      const driverDoc = doc(db, 'drivers', driverId);
      await setDoc(driverDoc, preparedDriver, { merge: true });
      return preparedDriver;
    } catch (error) {
      console.error('Error adding driver:', error);
      throw error;
    }
  }

  async getAllDrivers() {
    try {
      const snapshot = await getDocs(this.driversCollection);
        return snapshot.docs.map((driverDoc) => {
          const data = driverDoc.data();
          return {
            ...data,
            busNumber: normalizeBusNumber(data.busNumber),
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
      const driverQuery = query(this.driversCollection, where('busNumber', '==', normalizedBus));
      const snapshot = await getDocs(driverQuery);
      if (snapshot.empty) {
        return null;
      }
      const data = snapshot.docs[0].data();
      return {
        ...data,
        busNumber: normalizeBusNumber(data.busNumber),
      };
    } catch (error) {
      console.error('Error getting driver by bus number:', error);
      return null;
    }
  }

  async updateDriver(driverId, data) {
    try {
      const driverDoc = doc(db, 'drivers', driverId);
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
      if (['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'].includes(dept)) {
        return dept;
      }
    }
    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'];
    return departments[Math.floor(Math.random() * departments.length)];
  }

  generatePhoneNumber() {
    return '987654' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }

  generateLicenseNumber() {
    return 'TN' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  }

  // Get statistics
  async getStudentStats() {
    try {
      const students = await this.getAllStudents();
      const statsByYear = {};
      const statsByDepartment = {};

      students.forEach((student) => {
        statsByYear[student.year] = (statsByYear[student.year] || 0) + 1;
        statsByDepartment[student.department] = (statsByDepartment[student.department] || 0) + 1;
      });

      return {
        total: students.length,
        byYear: statsByYear,
        byDepartment: statsByDepartment,
        active: students.filter((s) => s.status === 'Active').length,
      };
    } catch (error) {
      console.error('Error getting student stats:', error);
      return { total: 0, byYear: {}, byDepartment: {}, active: 0 };
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

  // Clear all data (for testing)
  async clearAllData() {
    try {
      const studentSnapshot = await getDocs(this.studentsCollection);
      const driverSnapshot = await getDocs(this.driversCollection);

      await Promise.all([
        ...studentSnapshot.docs.map((studentDoc) => deleteDoc(studentDoc.ref)),
        ...driverSnapshot.docs.map((driverDoc) => deleteDoc(driverDoc.ref)),
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export const registeredUsersStorage = new RegisteredUsersStorage();
