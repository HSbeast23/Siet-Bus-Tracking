import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { normalizeBusNumber } from './locationService';
import { CONFIG } from '../utils/constants';
import { userAPI } from './api';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

const USERS_COLLECTION = 'users';

const buildLoginError = (message) => message || 'Invalid credentials. Please verify your details and try again.';

class AuthService {
  // Legacy registration methods are intentionally disabled with clear guidance
  async registerStudent() {
    return {
      success: false,
      message: 'Self-registration is disabled. Please contact management to be included in the latest CSV import.',
    };
  }

  async registerDriver() {
    return {
      success: false,
      message: 'Driver accounts are provisioned by management. Please contact administration for access.',
    };
  }

  // Legacy login helpers – keep for backward compatibility with old screens/debug tools
  async loginStudent(userId, password) {
    return this.login({ userId, password, role: 'student' });
  }

  async loginDriver(userId, password) {
    return this.login({ userId, password, role: 'driver' });
  }

  async loginCoAdmin(userId, password) {
    return this.login({ userId, password, role: 'coadmin' });
  }

  async fetchUserRecord(normalizedUserId) {
    try {
      const directDocRef = doc(db, USERS_COLLECTION, normalizedUserId);
      const directSnap = await getDoc(directDocRef);
      if (directSnap.exists()) {
        return { id: directSnap.id, data: directSnap.data() };
      }

      const usersRef = collection(db, USERS_COLLECTION);
      const userQuery = query(usersRef, where('userId', '==', normalizedUserId));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const matchedDoc = querySnapshot.docs[0];
        return { id: matchedDoc.id, data: matchedDoc.data() };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user record:', error);
      return null;
    }
  }

  async login({ userId, password, role, busNumber }) {
    try {
      const trimmedRole = role?.toLowerCase();
      if (!userId || !password || !trimmedRole) {
        return { success: false, message: buildLoginError('Please fill in all required fields.') };
      }

      if (trimmedRole === 'management') {
        return this.loginManagement(userId, password);
      }

      const providedBus = normalizeBusNumber(busNumber || '');
      if (!providedBus) {
        return { success: false, message: buildLoginError('Please select your bus number.') };
      }

      const normalizedUserId = userId.trim();

      const userRecord = await this.fetchUserRecord(normalizedUserId);

      if (!userRecord) {
        return { success: false, message: buildLoginError('Account not found. Please contact administration.') };
      }

      const { id: userDocId, data: userData } = userRecord;
      const userRole = (userData.role || '').toLowerCase();
      const storedPassword = (userData.password || '').trim();
      const storedBus = normalizeBusNumber(userData.busNumber || userData.busNo || userData.busId || '');

      if (userRole !== trimmedRole) {
        return { success: false, message: buildLoginError('Role mismatch for this account.') };
      }

      if (storedPassword !== password.trim()) {
        return { success: false, message: buildLoginError('Incorrect password. Please try again.') };
      }

      if (userData.status && userData.status.toLowerCase() === 'inactive') {
        return { success: false, message: buildLoginError('Your account is inactive. Please contact management.') };
      }

      if (!storedBus) {
        return { success: false, message: buildLoginError('Bus assignment missing. Please contact administration.') };
      }

      if (storedBus !== providedBus) {
        return {
          success: false,
          message: buildLoginError('Selected bus number does not match this account. Please verify your selection.'),
        };
      }

      const sessionUser = {
        ...userData,
        role: trimmedRole,
        userId: normalizedUserId,
        registerNumber: userData.registerNumber || normalizedUserId,
        busNumber: storedBus,
        busId: userData.busId || storedBus,
        selectedBus: providedBus,
        uid: userDocId,
        id: userDocId,
        authenticated: true,
        email: userData.email || `${normalizedUserId}@siet.edu`,
      };

      const sessionToken = `session-${normalizedUserId}-${Date.now()}`;

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, sessionToken);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

      await this.updateLastLogin(userDocId);

      return {
        success: true,
        token: sessionToken,
        user: sessionUser,
        message: 'Login successful!'
      };
    } catch (error) {
      console.error('Unified login error:', error);
      return {
        success: false,
        message: buildLoginError('Unable to login right now. Please try again later.'),
      };
    }
  }

  async loginManagement(username, password) {
    try {
      const ADMIN_USERNAME = CONFIG.MANAGEMENT_CREDENTIALS.username;
      const ADMIN_PASSWORD = CONFIG.MANAGEMENT_CREDENTIALS.password;

      if (username.trim() !== ADMIN_USERNAME || password.trim() !== ADMIN_PASSWORD) {
        return {
          success: false,
          message: buildLoginError('Invalid management credentials.'),
        };
      }

      const managementUser = {
        email: 'management@siet.edu',
        role: 'management',
        name: 'Administrator',
        id: 'management-001',
        uid: 'management-001',
        authenticated: true,
      };

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, 'management-session');
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(managementUser));

      return {
        success: true,
        token: 'management-session',
        user: managementUser,
        message: 'Login successful!'
      };
    } catch (error) {
      console.error('Management login error:', error);
      return {
        success: false,
        message: buildLoginError('Management login failed. Please try again.'),
      };
    }
  }

  async updateLastLogin(userId) {
    try {
      const currentTime = new Date().toISOString();
      const userDocRef = doc(db, USERS_COLLECTION, userId);
      await setDoc(userDocRef, { lastLogin: currentTime }, { merge: true });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      return Boolean(token);
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const userStr = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (!userStr) return null;

      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error reading current user from storage:', error);
      return null;
    }
  }

  async logout() {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  async verifyToken() {
    return null;
  }

  async updateStudentProfile(updatedFields = {}) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No active student session');
      }

      const payload = {
        name: currentUser.name,
        department: currentUser.department,
        year: currentUser.year,
        phone: currentUser.phone,
        boardingPoint: currentUser.boardingPoint,
        boardingTime: currentUser.boardingTime,
        busNumber: currentUser.busNumber,
        registerNumber: currentUser.registerNumber,
        ...updatedFields,
      };

      let refreshedProfile = payload;
      try {
        const response = await userAPI.updateProfile(payload);
        refreshedProfile = response?.data || payload;
      } catch (apiError) {
        console.warn('Falling back to local profile update:', apiError?.message || apiError);
      }

      const mergedProfile = {
        ...currentUser,
        ...refreshedProfile,
      };

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mergedProfile));
      return mergedProfile;
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
