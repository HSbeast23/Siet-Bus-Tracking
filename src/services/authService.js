import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { registeredUsersStorage } from './registeredUsersStorage';
import { CONFIG } from '../utils/constants';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

const formatFirebaseError = (error) => {
  if (!error?.code) {
    return 'Something went wrong. Please try again.';
  }

  const code = error.code.replace('auth/', '');
  switch (code) {
    case 'user-not-found':
      return 'No account found with this email. Please register first.';
    case 'wrong-password':
      return 'Incorrect password. Please try again.';
    case 'invalid-email':
      return 'The email address is invalid. Please check and try again.';
    case 'email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'weak-password':
      return 'Password is too weak. Please pick a stronger password (min 6 characters).';
    case 'too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Authentication error. Please try again.';
  }
};

class AuthService {
  async registerStudent(studentData) {
    try {
      const { email, password, ...profileData } = studentData;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = credential.user;

      await registeredUsersStorage.addStudent({
        ...profileData,
        email,
        uid,
        authenticated: true,
        status: 'Active',
      });

      await signOut(auth);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: formatFirebaseError(error),
      };
    }
  }

  async registerDriver(driverData) {
    try {
      const { email, password, ...profileData } = driverData;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const { uid } = credential.user;

      await registeredUsersStorage.addDriver({
        ...profileData,
        email,
        uid,
        authenticated: false,
        status: 'Inactive',
      });

      await signOut(auth);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: formatFirebaseError(error),
      };
    }
  }

  async loginStudent(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = credential;

      const profileSnap = await getDoc(doc(db, 'students', user.uid));
      if (!profileSnap.exists()) {
        throw new Error('Student profile not found. Please contact support.');
      }

      const profile = profileSnap.data();
      const token = await user.getIdToken();

      const currentUser = {
        ...profile,
        email: user.email,
        role: 'student',
        uid: user.uid,
      };

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

      await this.updateLastLogin(user.uid, 'student');

      return {
        success: true,
        token,
        user: currentUser,
        message: 'Login successful!'
      };
    } catch (error) {
      return {
        success: false,
        message: formatFirebaseError(error),
      };
    }
  }

  async loginDriver(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = credential;

      const profileSnap = await getDoc(doc(db, 'drivers', user.uid));
      if (!profileSnap.exists()) {
        throw new Error('Driver profile not found. Please contact support.');
      }

      const profile = profileSnap.data();
      const token = await user.getIdToken();

      const currentUser = {
        ...profile,
        email: user.email,
        role: 'driver',
        uid: user.uid,
      };

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

      await this.updateLastLogin(user.uid, 'driver');
      await this.updateDriverStatus(user.uid, true);

      return {
        success: true,
        token,
        user: currentUser,
        message: 'Login successful!'
      };
    } catch (error) {
      return {
        success: false,
        message: formatFirebaseError(error),
      };
    }
  }

  async loginCoAdmin(email, password) {
    try {
      // Get Co-Admin credentials from environment variables
      const COADMIN_EMAIL = CONFIG.COADMIN_CREDENTIALS.email;
      const COADMIN_PASSWORD = CONFIG.COADMIN_CREDENTIALS.password;
      const COADMIN_NAME = CONFIG.COADMIN_CREDENTIALS.name;
      const COADMIN_BUS_ID = CONFIG.COADMIN_CREDENTIALS.busId;

      // Validate credentials
      if (email.trim().toLowerCase() !== COADMIN_EMAIL.toLowerCase() || password !== COADMIN_PASSWORD) {
        return {
          success: false,
          message: 'Invalid Co-Admin credentials. Please contact administration.',
        };
      }

      // Create Co-Admin user object
      const currentUser = {
        email: COADMIN_EMAIL,
        role: 'coadmin',
        name: COADMIN_NAME,
        id: 'Coadmin-005',
        busId: COADMIN_BUS_ID,
        uid: 'coadmin-001',
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, 'coadmin-token');
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));

      return {
        success: true,
        token: 'coadmin-token',
        user: currentUser,
        message: `Welcome, ${COADMIN_NAME}!`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Co-Admin login error. Please try again.',
      };
    }
  }

  async updateLastLogin(userId, role) {
    try {
      const currentTime = new Date().toISOString();
      const collectionName = role === 'student' ? 'students' : 'drivers';
      await updateDoc(doc(db, collectionName, userId), {
        lastLogin: currentTime,
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async updateDriverStatus(driverId, authenticated) {
    try {
      await registeredUsersStorage.updateDriver(driverId, {
        authenticated,
        status: authenticated ? 'Active' : 'Inactive',
      });
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  }

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const user = auth.currentUser;
      const hasToken = !!token;
      const hasCurrentUser = !!user;

      if (hasCurrentUser) {
        return true;
      }

      return hasToken;
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
      return null;
    }
  }

  async logout() {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  async verifyToken(forceRefresh = false) {
    try {
      const user = auth.currentUser;
      if (!user) {
        return null;
      }

      const token = await user.getIdToken(forceRefresh);
      return token;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
