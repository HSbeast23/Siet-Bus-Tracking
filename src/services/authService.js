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
import { registerPushTokenAsync } from './pushNotificationService';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

const USERS_COLLECTION = 'users';

const buildLoginError = (message) => message || 'Invalid credentials. Please verify your details and try again.';

const DEPARTMENT_ALIAS_MAP = {
  COMPUTERSCIENCEANDENGINEERING: 'CSE',
  COMPUTERSCIENCEENGINEERING: 'CSE',
  COMPUTERSCIENCE: 'CSE',
  ELECTRONICSANDCOMMUNICATIONENGINEERING: 'ECE',
  ELECTRONICSANDCOMMUNICATION: 'ECE',
  ELECTRICALANDELECTRONICSENGINEERING: 'EEE',
  ELECTRICALANDELECTRONICS: 'EEE',
  MECHANICALENGINEERING: 'MECH',
  CIVILENGINEERING: 'CIVIL',
  INFORMATIONTECHNOLOGY: 'IT',
  ARTIFICIALINTELLIGENCEANDDATASCIENCE: 'AIDS',
  ARTIFICIALINTELLIGENCEANDMACHINELEARNING: 'AIML',
  BIOTECHNOLOGY: 'BT',
  BIOTECH: 'BT',
};

const normalizeDepartmentCode = (value = '') => {
  const normalized = value?.toString().trim().toUpperCase();
  if (!normalized) {
    return '';
  }
  const aliasKey = normalized.replace(/[\s\._&-]/g, '');
  return DEPARTMENT_ALIAS_MAP[aliasKey] || normalized;
};

const normalizeYearCode = (value = '') => {
  const normalized = value?.toString().trim().toUpperCase();
  if (!normalized) {
    return '';
  }
  if (normalized.includes('IV') || normalized.includes('4')) {
    return 'IV';
  }
  if (normalized.includes('III') || normalized.includes('3')) {
    return 'III';
  }
  if (normalized.includes('II') || normalized.includes('2')) {
    return 'II';
  }
  if (normalized.includes('I') || normalized.includes('1')) {
    return 'I';
  }
  return normalized;
};

const normalizeRegisterNumber = (value = '') => {
  const normalized = value?.toString().trim();
  return normalized ? normalized.toUpperCase() : '';
};

const normalizeTeamRole = (value = '') => {
  const normalized = value?.toString().trim().toLowerCase();
  if (!normalized) {
    return 'coadmin';
  }
  return ['coadmin', 'assistant', 'operations'].includes(normalized)
    ? normalized
    : 'coadmin';
};

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

      if (['student', 'coadmin'].includes(trimmedRole)) {
        try {
          await registerPushTokenAsync(sessionUser);
        } catch (tokenError) {
          console.warn('Unable to register push token:', tokenError);
        }
      }

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

      const resolvedFields = {
        name: (updatedFields.name ?? currentUser.name ?? '').toString().trim(),
        department: (updatedFields.department ?? currentUser.department ?? '').toString().trim(),
        year: (updatedFields.year ?? currentUser.year ?? '').toString().trim(),
        phone: (updatedFields.phone ?? currentUser.phone ?? '').toString().trim(),
        boardingPoint: (updatedFields.boardingPoint ?? currentUser.boardingPoint ?? '').toString().trim(),
        boardingTime: (updatedFields.boardingTime ?? currentUser.boardingTime ?? '').toString().trim(),
        busNumber: (updatedFields.busNumber ?? currentUser.busNumber ?? currentUser.busId ?? '').toString().trim(),
        registerNumber: (updatedFields.registerNumber ?? currentUser.registerNumber ?? currentUser.userId ?? '').toString().trim(),
      };

      const normalizedBusNumber = normalizeBusNumber(resolvedFields.busNumber || currentUser.busNumber);
      const normalizedRegisterNumber = normalizeRegisterNumber(resolvedFields.registerNumber || currentUser.registerNumber || currentUser.userId);
      const normalizedDepartment = normalizeDepartmentCode(resolvedFields.department || currentUser.department);
      const normalizedYear = normalizeYearCode(resolvedFields.year || currentUser.year);

      const profileUpdate = {
        ...resolvedFields,
        department: normalizedDepartment,
        year: normalizedYear,
        busNumber: normalizedBusNumber,
        busId: normalizedBusNumber,
        selectedBus: normalizedBusNumber,
        registerNumber: normalizedRegisterNumber,
        role: currentUser.role,
        email: currentUser.email || '',
        updatedAt: new Date().toISOString(),
      };

      let refreshedProfile = profileUpdate;
      try {
        const response = await userAPI.updateProfile(profileUpdate);
        if (response?.data) {
          refreshedProfile = {
            ...profileUpdate,
            ...response.data,
          };
        }
      } catch (apiError) {
        console.warn('Falling back to local profile update:', apiError?.message || apiError);
      }

      try {
        const userDocId = currentUser.uid || currentUser.id || currentUser.userId || normalizedRegisterNumber;
        if (!userDocId) {
          console.warn('Unable to persist profile update to Firestore: missing user document id');
        } else {
          const userDocRef = doc(db, USERS_COLLECTION, userDocId);
          await setDoc(userDocRef, profileUpdate, { merge: true });
        }
      } catch (firestoreError) {
        console.error('Error updating student profile in Firestore:', firestoreError);
      }

      const mergedProfile = {
        ...currentUser,
        ...refreshedProfile,
        busNumber: refreshedProfile?.busNumber || normalizedBusNumber,
        busId: refreshedProfile?.busId || normalizedBusNumber,
        selectedBus: refreshedProfile?.selectedBus || normalizedBusNumber,
        registerNumber: refreshedProfile?.registerNumber || normalizedRegisterNumber,
        department: refreshedProfile?.department || normalizedDepartment,
        year: refreshedProfile?.year || normalizedYear,
      };

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mergedProfile));
      return mergedProfile;
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  }

  async updateDriverProfile(updatedFields = {}) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No active driver session');
      }

      const normalizedBus = normalizeBusNumber(
        updatedFields.busId || updatedFields.busNumber || currentUser.busId || currentUser.busNumber || ''
      );

      const profileUpdate = {
        name: (updatedFields.name ?? currentUser.name ?? '').toString().trim(),
        phone: (updatedFields.phone ?? currentUser.phone ?? '').toString().trim(),
        email: (updatedFields.email ?? currentUser.email ?? '').toString().trim(),
        licenseNumber: (updatedFields.licenseNumber ?? currentUser.licenseNumber ?? '').toString().trim(),
        busId: normalizedBus,
        busNumber: normalizedBus,
        role: currentUser.role || 'driver',
        avatar: updatedFields.avatar ?? currentUser.avatar ?? '',
        updatedAt: new Date().toISOString(),
      };

      let refreshedProfile = profileUpdate;
      try {
        const response = await userAPI.updateProfile({
          ...profileUpdate,
          userId: currentUser.userId || currentUser.registerNumber,
        });
        if (response?.data) {
          refreshedProfile = {
            ...profileUpdate,
            ...response.data,
          };
        }
      } catch (apiError) {
        console.warn('Driver profile API update failed, using local merge:', apiError?.message || apiError);
      }

      try {
        const userDocId = currentUser.uid || currentUser.id || currentUser.userId;
        if (userDocId) {
          const docRef = doc(db, USERS_COLLECTION, userDocId);
          await setDoc(docRef, profileUpdate, { merge: true });
        }
      } catch (firestoreError) {
        console.error('Error persisting driver profile to Firestore:', firestoreError);
      }

      const mergedProfile = {
        ...currentUser,
        ...refreshedProfile,
        busId: refreshedProfile.busId || normalizedBus,
        busNumber: refreshedProfile.busNumber || normalizedBus,
      };

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mergedProfile));
      return mergedProfile;
    } catch (error) {
      console.error('Error updating driver profile:', error);
      throw error;
    }
  }

  async updateCoAdminProfile(updatedFields = {}) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
  throw new Error('No active bus incharge session');
      }

      const normalizedBus = normalizeBusNumber(
        updatedFields.busId || updatedFields.busNumber || currentUser.busId || currentUser.busNumber || ''
      );

      const profileUpdate = {
        name: (updatedFields.name ?? currentUser.name ?? '').toString().trim(),
        phone: (updatedFields.phone ?? currentUser.phone ?? '').toString().trim(),
        email: (updatedFields.email ?? currentUser.email ?? '').toString().trim(),
        busId: normalizedBus,
        busNumber: normalizedBus,
        role: currentUser.role || 'coadmin',
        teamRole: normalizeTeamRole(updatedFields.teamRole || updatedFields.role || currentUser.teamRole),
        avatar: updatedFields.avatar ?? currentUser.avatar ?? '',
        updatedAt: new Date().toISOString(),
      };

      let refreshedProfile = profileUpdate;
      try {
        const response = await userAPI.updateProfile({
          ...profileUpdate,
          userId: currentUser.userId || currentUser.registerNumber,
        });
        if (response?.data) {
          refreshedProfile = {
            ...profileUpdate,
            ...response.data,
          };
        }
      } catch (apiError) {
  console.warn('Bus incharge profile API update failed, using local merge:', apiError?.message || apiError);
      }

      try {
        const userDocId = currentUser.uid || currentUser.id || currentUser.userId;
        if (userDocId) {
          const docRef = doc(db, USERS_COLLECTION, userDocId);
          await setDoc(docRef, profileUpdate, { merge: true });
        }
      } catch (firestoreError) {
  console.error('Error persisting bus incharge profile to Firestore:', firestoreError);
      }

      const mergedProfile = {
        ...currentUser,
        ...refreshedProfile,
        busId: refreshedProfile.busId || normalizedBus,
        busNumber: refreshedProfile.busNumber || normalizedBus,
      };

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mergedProfile));
      return mergedProfile;
    } catch (error) {
  console.error('Error updating bus incharge profile:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
