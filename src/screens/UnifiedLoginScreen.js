import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';

const ROLE_ROUTE_MAP = {
  student: 'StudentDashboard',
  driver: 'DriverDashboard',
  coadmin: 'CoAdminDashboard',
  management: 'ManagementDashboard',
};

const UnifiedLoginScreen = ({ navigation }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const headerIcon = 'log-in-outline';

  const validateForm = () => {
    const validationErrors = {};

    if (!userId.trim()) {
      validationErrors.userId = 'User ID is required';
    }
    if (!password.trim()) {
      validationErrors.password = 'Password is required';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const loginResult = await authService.login({
        userId: userId.trim(),
        password: password.trim(),
      });

      setLoading(false);

      if (!loginResult.success) {
        Alert.alert('Login Failed', loginResult.message);
        return;
      }

      const resolvedRole = loginResult.user?.role || '';
      const nextRoute = ROLE_ROUTE_MAP[resolvedRole] || ROLE_ROUTE_MAP.student;

      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute }],
      });
    } catch (error) {
      console.error('Unified login error:', error);
      Alert.alert('Error', 'Unable to login. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formWrapper}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.logoContainer}>
                  <Ionicons name={headerIcon} size={30} color={COLORS.secondary} />
                </View>
                <View style={styles.headerTextBlock}>
                  <Text style={styles.headerTitle}>Transport Access</Text>
                  <Text style={styles.headerSubtitle}>Use your assigned credentials to continue</Text>
                </View>
              </View>

              <View style={styles.fieldsStack}>
                <Input
                  label={'Username'}
                  placeholder={'Enter username'}
                  value={userId}
                  onChangeText={setUserId}
                  icon="person-outline"
                  autoCapitalize="none"
                  error={errors.userId}
                  editable={!loading}
                  style={styles.field}
                  inputStyle={styles.input}
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  icon="lock-closed-outline"
                  secureTextEntry
                  autoCapitalize="none"
                  showToggleLabel
                  error={errors.password}
                  editable={!loading}
                  style={styles.field}
                  inputStyle={styles.input}
                />
              </View>

              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                loading={loading}
                fullWidth
                size="sm"
                style={styles.loginButton}
                icon="log-in-outline"
              />
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
    backgroundColor: '#E8F9E6',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },
  formWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.round,
    backgroundColor: '#F4F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fieldsStack: {
    gap: SPACING.sm,
  },
  field: {
    marginBottom: 0,
  },
  input: {
    paddingVertical: SPACING.xs,
  },
  loginButton: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  dropdownContainer: {
    gap: SPACING.xs,
  },
  dropdownLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.secondary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FBFF',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownIcon: {
    marginRight: SPACING.sm,
  },
  dropdownValue: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.black,
  },
  dropdownPlaceholder: {
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    maxHeight: '60%',
    ...SHADOWS.lg,
  },
  modalOption: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  modalOptionText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.black,
  },
  modalSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.lightGray,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.danger,
  },
});

export default UnifiedLoginScreen;
