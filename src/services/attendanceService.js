import { Linking } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { normalizeBusNumber } from './locationService';

class AttendanceService {
  constructor() {
    this.studentsCollection = collection(db, 'users');
    this.submissionEmail = 'haarhishhaarhish43@gmail.com';
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

  buildEmailBody(busNumber, attendanceRecords, submittedBy, submissionDate) {
    const totals = attendanceRecords.reduce((acc, record) => {
      const status = (record.status || '').toLowerCase();
      if (status === 'present') {
        acc.present += 1;
      } else {
        acc.absent += 1;
      }
      return acc;
    }, { present: 0, absent: 0 });

    const totalStudents = attendanceRecords.length;

    const headerLines = [
      'Daily Attendance Submission',
      `Date: ${submissionDate}`,
      `Bus: ${busNumber}`,
      `Submitted By: ${submittedBy || 'Unknown'}`,
      `Total Students: ${totalStudents}`,
      `Present: ${totals.present}`,
      `Absent: ${totals.absent}`,
      '',
      'Student Status Overview:'
    ];

    const detailLines = attendanceRecords.map((record, index) => {
      const statusLabel = (record.status || 'unmarked').toUpperCase();
      const identifierParts = [record.registerNumber, record.department, record.year]
        .filter(Boolean)
        .map(part => part.toString().trim());

      const meta = identifierParts.length > 0 ? ` [${identifierParts.join(' | ')}]` : '';
      const markedAtDate = record.markedAt instanceof Date ? record.markedAt : new Date(record.markedAt);
      const markedAtValid = markedAtDate instanceof Date && !Number.isNaN(markedAtDate.getTime());
      const details = [];

      if (markedAtValid) {
        details.push(`Marked at ${markedAtDate.toLocaleTimeString()}`);
      }

      if (record.markedBy) {
        details.push(`By ${record.markedBy}`);
      }

      const detailSuffix = details.length > 0 ? ` (${details.join(' | ')})` : '';

      return `${index + 1}. ${record.name || 'Unknown'}${meta} - ${statusLabel}${detailSuffix}`;
    });

    const footerLines = [
      '',
      'Auto-generated from SIET Bus Tracker App',
      'Please reply to confirm receipt if needed.'
    ];

    return [...headerLines, ...detailLines, ...footerLines].join('\n');
  }

  // Submit full attendance for the day by preparing an email draft
  async submitAttendance(busNumber, attendanceRecords, submittedBy) {
    try {
      const today = this.getTodayDate();
      const emailBody = this.buildEmailBody(busNumber, attendanceRecords, submittedBy, today);
      const subject = encodeURIComponent(`Bus ${busNumber} Attendance - ${today}`);
      const body = encodeURIComponent(emailBody);
      const mailtoUrl = `mailto:${this.submissionEmail}?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) {
        return {
          success: false,
          error: 'Email application is not available on this device. Please send the report manually.'
        };
      }

      await Linking.openURL(mailtoUrl);

      return {
        success: true,
        message: 'Attendance email drafted. Please review and send it from your mail app.'
      };
    } catch (error) {
      console.error('Error preparing attendance email:', error);
      return {
        success: false,
        error: 'Failed to open the email composer. Please try again.'
      };
    }
  }
}

export const attendanceService = new AttendanceService();
