import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, CONFIG } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_USER_KEY = 'currentUser';

const ManagementLoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password.trim()) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Validate against hardcoded credentials
      if (username.trim() === CONFIG.MANAGEMENT_CREDENTIALS.username && 
          password.trim() === CONFIG.MANAGEMENT_CREDENTIALS.password) {
        
        // Create management user object
        const managementUser = {
          email: 'management@siet.edu',
          role: 'management',
          name: 'Administrator',
          id: 'management-001',
          uid: 'management-001',
        };

        // Store in AsyncStorage
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, 'management-token');
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(managementUser));
        
        setLoading(false);
        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ManagementDashboard')
          }
        ]);
      } else {
        setLoading(false);
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={60} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Management Portal</Text>
            <Text style={styles.subtitle}>Secure Admin Access</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Username"
              placeholder="Enter admin username"
              value={username}
              onChangeText={setUsername}
              icon="person-outline"
              error={errors.username}
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="Enter admin password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry={true}
              error={errors.password}
              editable={!loading}
            />

            <Button
              title="Login as Admin"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              icon="shield-checkmark-outline"
              size="lg"
              style={styles.loginButton}
            />

            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color={COLORS.secondary} />
              <Text style={styles.infoText}>
                For security reasons, management access is restricted to authorized personnel only.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
    gap: SPACING.md,
  },
  loginButton: {
    marginTop: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default ManagementLoginScreen;
