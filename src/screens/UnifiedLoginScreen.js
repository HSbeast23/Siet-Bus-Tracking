import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';

const BUS_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const busId = `SIET-${String(index + 1).padStart(3, '0')}`;
  return { key: busId, label: busId };
});

const ROLE_OPTIONS = [
  { key: 'student', label: 'Student', icon: 'school' },
  { key: 'driver', label: 'Driver', icon: 'bus' },
  { key: 'coadmin', label: 'Bus Incharge', icon: 'shield-checkmark' },
  { key: 'management', label: 'Management', icon: 'briefcase' },
];

const ROLE_ROUTE_MAP = {
  student: 'StudentDashboard',
  driver: 'DriverDashboard',
  coadmin: 'CoAdminDashboard',
  management: 'ManagementDashboard',
};

const DropdownField = ({
  label,
  value,
  placeholder,
  options,
  onSelect,
  icon,
  disabled,
}) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.key === value),
    [options, value]
  );

  const handleSelect = (option) => {
    onSelect(option.key);
    setVisible(false);
  };

  return (
    <View style={styles.dropdownContainer}>
      {label && <Text style={styles.dropdownLabel}>{label}</Text>}
      <TouchableOpacity
        style={[styles.dropdownTrigger, disabled && styles.dropdownDisabled]}
        activeOpacity={0.7}
        onPress={() => !disabled && setVisible(true)}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.secondary}
            style={styles.dropdownIcon}
          />
        )}
        <Text style={[styles.dropdownValue, !selectedOption && styles.dropdownPlaceholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const UnifiedLoginScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0].key);
  const [selectedBus, setSelectedBus] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isManagement = selectedRole === 'management';

  const headerIcon = useMemo(() => {
    const roleConfig = ROLE_OPTIONS.find((option) => option.key === selectedRole);
    return roleConfig?.icon || 'log-in-outline';
  }, [selectedRole]);

  const validateForm = () => {
    const validationErrors = {};

    if (!userId.trim()) {
      validationErrors.userId = 'User ID is required';
    }
    if (!password.trim()) {
      validationErrors.password = 'Password is required';
    }
    if (!isManagement && !selectedBus) {
      validationErrors.busNumber = 'Bus number is required';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    if (roleKey === 'management') {
      setSelectedBus('');
    }
    setErrors({});
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const loginResult = await authService.login({
        userId: userId.trim(),
        password: password.trim(),
        role: selectedRole,
        busNumber: isManagement ? undefined : selectedBus,
      });

      setLoading(false);

      if (!loginResult.success) {
        Alert.alert('Login Failed', loginResult.message);
        return;
      }

      const nextRoute = ROLE_ROUTE_MAP[selectedRole];

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

              <DropdownField
                label="Role"
                placeholder="Select role"
                options={ROLE_OPTIONS}
                value={selectedRole}
                onSelect={(roleKey) => handleRoleChange(roleKey)}
                icon="people-outline"
              />
              {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

              {!isManagement && (
                <>
                  <DropdownField
                    label="Bus Number"
                    placeholder="Select your bus"
                    options={BUS_OPTIONS}
                    value={selectedBus}
                    onSelect={(busKey) => {
                      setSelectedBus(busKey);
                      setErrors((prev) => ({ ...prev, busNumber: undefined }));
                    }}
                    icon="bus-outline"
                  />
                  {errors.busNumber && <Text style={styles.errorText}>{errors.busNumber}</Text>}
                </>
              )}

              <View style={styles.fieldsStack}>
                <Input
                  label={isManagement ? 'Username' : 'User ID / Register Number'}
                  placeholder={
                    isManagement ? 'Enter management username' : 'Enter register number or ID'
                  }
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
    backgroundColor: COLORS.background,
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
