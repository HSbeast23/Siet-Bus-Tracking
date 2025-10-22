import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

class ReportsService {
  constructor() {
    this.reportsCollection = collection(db, 'reports');
    this.studentsCollection = collection(db, 'registeredUsers');
  }

  // Helper: Fetch user name from registeredUsers collection
  async fetchUserName(email, role) {
    try {
      const q = query(
        this.studentsCollection,
        where('email', '==', email),
        where('role', '==', role)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        return userData.name || 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error fetching user name:', error);
      return 'Unknown';
    }
  }

  // Submit report to Management
  async submitReport(reportData) {
    try {
      const report = {
        message: reportData.message,
        reportedBy: reportData.reportedBy, // Name of person reporting
        reporterRole: reportData.reporterRole, // 'student' or 'coadmin'
        reporterEmail: reportData.reporterEmail,
        busNumber: reportData.busNumber || null,
        registerNumber: reportData.registerNumber || null, // For students
        timestamp: Timestamp.now(),
        status: 'pending', // pending, acknowledged, resolved
        acknowledgedBy: null,
        acknowledgedAt: null,
        response: null,
      };

      const docRef = await addDoc(this.reportsCollection, report);
      
      return {
        success: true,
        message: 'Report submitted successfully',
        reportId: docRef.id
      };
    } catch (error) {
      console.error('Error submitting report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all reports for Management (separated by source)
  async getAllReports() {
    try {
      const q = query(
        this.reportsCollection,
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const allReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ Fetch names for each report dynamically
      const reportsWithNames = await Promise.all(
        allReports.map(async (report) => {
          // If reportedBy exists, use it; otherwise fetch from registeredUsers
          if (!report.reportedBy || report.reportedBy === 'Unknown') {
            const fetchedName = await this.fetchUserName(report.reporterEmail, report.reporterRole);
            return {
              ...report,
              reportedByName: fetchedName
            };
          }
          return {
            ...report,
            reportedByName: report.reportedBy
          };
        })
      );

      // Separate by source
      const studentReports = reportsWithNames.filter(r => r.reporterRole === 'student');
      const coadminReports = reportsWithNames.filter(r => r.reporterRole === 'coadmin');

      return {
        success: true,
        studentReports,
        coadminReports,
        totalReports: reportsWithNames.length
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      return {
        success: false,
        studentReports: [],
        coadminReports: [],
        totalReports: 0
      };
    }
  }

  // Get reports by specific user
  async getReportsByUser(userEmail) {
    try {
      console.log('🔍 [REPORTS] Fetching reports for user:', userEmail);
      
      // ✅ Query without orderBy to avoid index requirement
      const q = query(
        this.reportsCollection,
        where('reporterEmail', '==', userEmail)
      );
      
      const snapshot = await getDocs(q);
      let reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ Sort in JavaScript instead of Firestore
      reports.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA; // Descending order (newest first)
      });

      console.log(`✅ [REPORTS] Found ${reports.length} reports for user`);

      return {
        success: true,
        reports
      };
    } catch (error) {
      console.error('Error fetching user reports:', error);
      return {
        success: false,
        reports: []
      };
    }
  }

  // Get reports by bus number (for Bus Incharge)
  async getReportsByBus(busNumber) {
    try {
      const q = query(
        this.reportsCollection,
        where('busNumber', '==', busNumber),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        success: true,
        reports
      };
    } catch (error) {
      console.error('Error fetching bus reports:', error);
      return {
        success: false,
        reports: []
      };
    }
  }

  // Acknowledge/respond to report (Management only)
  async acknowledgeReport(reportId, acknowledgedBy, response) {
    try {
      const reportRef = doc(this.reportsCollection, reportId);
      
      await updateDoc(reportRef, {
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: Timestamp.now(),
        response: response || 'Report acknowledged'
      });

      return {
        success: true,
        message: 'Report acknowledged successfully'
      };
    } catch (error) {
      console.error('Error acknowledging report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mark report as resolved (Management only)
  async resolveReport(reportId) {
    try {
      const reportRef = doc(this.reportsCollection, reportId);
      
      await updateDoc(reportRef, {
        status: 'resolved'
      });

      return {
        success: true,
        message: 'Report marked as resolved'
      };
    } catch (error) {
      console.error('Error resolving report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get statistics for Management dashboard
  async getReportStats() {
    try {
      const snapshot = await getDocs(this.reportsCollection);
      const allReports = snapshot.docs.map(doc => doc.data());

      const stats = {
        total: allReports.length,
        pending: allReports.filter(r => r.status === 'pending').length,
        acknowledged: allReports.filter(r => r.status === 'acknowledged').length,
        resolved: allReports.filter(r => r.status === 'resolved').length,
        fromStudents: allReports.filter(r => r.reporterRole === 'student').length,
        fromCoAdmins: allReports.filter(r => r.reporterRole === 'coadmin').length,
      };

      console.log('📊 [REPORT STATS] Calculated:', stats);

      return stats; // ✅ Return stats directly (not wrapped in success object)
    } catch (error) {
      console.error('Error fetching report stats:', error);
      return {
        total: 0,
        pending: 0,
        acknowledged: 0,
        resolved: 0,
        fromStudents: 0,
        fromCoAdmins: 0
      };
    }
  }
}

export const reportsService = new ReportsService();
