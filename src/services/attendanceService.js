import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { normalizeBusNumber } from './locationService';

class AttendanceService {
  constructor() {
  this.attendanceCollection = collection(db, 'attendance');
  this.studentsCollection = collection(db, 'users');
  }

  // Get current date in YYYY-MM-DD format
  getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Get students registered for a specific bus
  async getStudentsByBus(busNumber) {
    try {
      const normalizedBus = normalizeBusNumber(busNumber);

      const byBusNumberQuery = query(this.studentsCollection, where('busNumber', '==', normalizedBus));
      let snapshot = await getDocs(byBusNumberQuery);

      if (snapshot.empty) {
        const byBusNoQuery = query(this.studentsCollection, where('busNo', '==', normalizedBus));
        snapshot = await getDocs(byBusNoQuery);
      }

      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(student => {
          const role = (student.role || '').toLowerCase();
          const status = (student.status || '').toLowerCase();
          return role === 'student' && status !== 'inactive';
        })
        .map(student => ({
          ...student,
          busNumber: normalizeBusNumber(student.busNumber || student.busNo || busNumber),
        }));
    } catch (error) {
      console.error('Error fetching students by bus:', error);
      return [];
    }
  }

  // Get today's attendance for a specific bus
  async getTodayAttendance(busNumber) {
    try {
      const today = this.getTodayDate();
      const attendanceDocRef = doc(this.attendanceCollection, `${busNumber}_${today}`);
      const attendanceSnap = await getDoc(attendanceDocRef);

      if (attendanceSnap.exists()) {
        return attendanceSnap.data();
      }

      // Return empty attendance structure if not exists
      return {
        busNumber,
        date: today,
        timestamp: Timestamp.now(),
        students: {},
        submittedBy: null,
        submittedAt: null
      };
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      return {
        busNumber,
        date: this.getTodayDate(),
        timestamp: Timestamp.now(),
        students: {},
        submittedBy: null,
        submittedAt: null
      };
    }
  }

  // Mark student attendance (present/absent)
  async markAttendance(busNumber, studentId, status, markedBy) {
    try {
      const today = this.getTodayDate();
      const attendanceDocRef = doc(this.attendanceCollection, `${busNumber}_${today}`);
      
      // Get existing attendance
      const attendanceSnap = await getDoc(attendanceDocRef);
      const existingData = attendanceSnap.exists() ? attendanceSnap.data() : {
        busNumber,
        date: today,
        timestamp: Timestamp.now(),
        students: {}
      };

      // Update student status
      existingData.students[studentId] = {
        status, // 'present' or 'absent'
        markedAt: Timestamp.now(),
        markedBy
      };

      // Save to Firestore
      await setDoc(attendanceDocRef, existingData, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  }

  // Submit full attendance for the day
  async submitAttendance(busNumber, attendanceData, submittedBy) {
    try {
      const today = this.getTodayDate();
      const attendanceDocRef = doc(this.attendanceCollection, `${busNumber}_${today}`);

      // ✅ Check if attendance already submitted today
      const existingSnap = await getDoc(attendanceDocRef);
      if (existingSnap.exists() && existingSnap.data().submitted === true) {
        console.log(`⚠️ [ATTENDANCE] Attendance already submitted for ${busNumber} on ${today}`);
        return { 
          success: false, 
          error: 'Attendance has already been submitted for today. Please try again tomorrow.',
          alreadySubmitted: true
        };
      }

      const fullData = {
        busNumber,
        date: today,
        timestamp: Timestamp.now(),
        students: attendanceData,
        submittedBy,
        submittedAt: Timestamp.now(),
        submitted: true
      };

      await setDoc(attendanceDocRef, fullData);

      console.log(`✅ [ATTENDANCE] Submitted attendance for ${busNumber} on ${today}`);
      return { success: true, message: 'Attendance submitted successfully!' };
    } catch (error) {
      console.error('Error submitting attendance:', error);
      return { success: false, error: error.message };
    }
  }

  // Get attendance history for a bus
  async getAttendanceHistory(busNumber, limit = 30) {
    try {
      const attendanceQuery = query(
        this.attendanceCollection,
        where('busNumber', '==', busNumber),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return history.slice(0, limit);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return [];
    }
  }

  // Get attendance statistics for a student
  async getStudentAttendanceStats(studentId, busNumber) {
    try {
      const attendanceQuery = query(
        this.attendanceCollection,
        where('busNumber', '==', busNumber)
      );
      
      const snapshot = await getDocs(attendanceQuery);
      let totalDays = 0;
      let presentDays = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.students && data.students[studentId]) {
          totalDays++;
          if (data.students[studentId].status === 'present') {
            presentDays++;
          }
        }
      });

      const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

      return {
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        percentage
      };
    } catch (error) {
      console.error('Error fetching student attendance stats:', error);
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        percentage: 0
      };
    }
  }

  // Get daily attendance summary
  async getDailySummary(busNumber, date) {
    try {
      const attendanceDocRef = doc(this.attendanceCollection, `${busNumber}_${date}`);
      const attendanceSnap = await getDoc(attendanceDocRef);

      if (!attendanceSnap.exists()) {
        return null;
      }

      const data = attendanceSnap.data();
      const students = data.students || {};
      
      let present = 0;
      let absent = 0;

      Object.values(students).forEach(student => {
        if (student.status === 'present') present++;
        else if (student.status === 'absent') absent++;
      });

      return {
        date: data.date,
        busNumber: data.busNumber,
        totalMarked: present + absent,
        present,
        absent,
        percentage: present + absent > 0 ? ((present / (present + absent)) * 100).toFixed(1) : 0,
        submitted: data.submitted || false,
        submittedBy: data.submittedBy || null,
        submittedAt: data.submittedAt || null
      };
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return null;
    }
  }
}

export const attendanceService = new AttendanceService();
