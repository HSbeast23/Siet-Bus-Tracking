import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import StudentBottomNav from '../components/StudentBottomNav';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { normalizeBusNumber } from '../services/locationService';

const formatYearLabel = (value) => {
  if (!value) return null;
  const numericValue = parseInt(value, 10);
  if (Number.isNaN(numericValue)) {
    return value;
  }
  const suffix = numericValue === 1 ? 'st' : numericValue === 2 ? 'nd' : numericValue === 3 ? 'rd' : 'th';
  return `${numericValue}${suffix} Year`;
};

const YEAR_OPTIONS = [
  { key: 'I', label: 'I' },
  { key: 'II', label: 'II' },
  { key: 'III', label: 'III' },
  { key: 'IV', label: 'IV' },
];

const DEPARTMENT_OPTIONS = [
  { key: 'CSE', label: 'CSE' },
  { key: 'ECE', label: 'ECE' },
  { key: 'EEE', label: 'EEE' },
  { key: 'MECH', label: 'MECH' },
  { key: 'CIVIL', label: 'CIVIL' },
  { key: 'IT', label: 'IT' },
  { key: 'AIDS', label: 'AIDS' },
  { key: 'AIML', label: 'AIML' },
  { key: 'BT', label: 'BT' },
];

const BUS_OPTIONS = Array.from({ length: 30 }, (_, index) => {
  const busId = `SIET-${String(index + 1).padStart(3, '0')}`;
  return { key: busId, label: busId };
});

const EMPTY_FORM = {
  name: '',
  department: '',
  year: '',
  phone: '',
  boardingPoint: '',
  boardingTime: '',
  busNumber: '',
  registerNumber: '',
};

const normalizeDepartmentValue = (value = '') => {
  const normalized = value?.toString().trim().toUpperCase();
  if (!normalized) {
    return '';
  }
    const aliasKey = normalized.replace(/[\s\._&-]/g, '');
  const aliasMap = {
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
  return aliasMap[aliasKey] || normalized;
};

const normalizeYearValue = (value = '') => {
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

const normalizeBusValue = (value = '') => normalizeBusNumber(value) || '';

const extractBusOrder = (value = '') => {
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

const buildFormValuesFromProfile = (profile) => {
  if (!profile) {
    return { ...EMPTY_FORM };
  }

  return {
    name: profile?.name || '',
    department: normalizeDepartmentValue(profile?.department || profile?.departmentRaw || ''),
    year: normalizeYearValue(profile?.year || profile?.yearCode || ''),
    phone: profile?.phone || profile?.contactNumber || '',
    boardingPoint: profile?.boardingPoint || profile?.pickupLocation || '',
    boardingTime: profile?.boardingTime || profile?.pickupTime || '',
    busNumber: normalizeBusValue(profile?.busNumber || profile?.busId || profile?.selectedBus || ''),
    registerNumber: normalizeRegisterNumber(profile?.registerNumber || profile?.userId || ''),
  };
};

const StudentProfileScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [formValues, setFormValues] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      setProfile(currentUser);
      setFormValues(buildFormValuesFromProfile(currentUser));
    } catch (error) {
      console.error('Error loading student profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfile);
    loadProfile();
    return unsubscribe;
  }, [loadProfile, navigation]);

  const departmentOptions = useMemo(() => {
    const base = [...DEPARTMENT_OPTIONS];
    if (formValues.department && !base.some((option) => option.key === formValues.department)) {
      base.push({ key: formValues.department, label: formValues.department });
    }
    return base;
  }, [formValues.department]);

  const busOptions = useMemo(() => {
    const base = [...BUS_OPTIONS];
    if (formValues.busNumber && !base.some((option) => option.key === formValues.busNumber)) {
      base.push({ key: formValues.busNumber, label: formValues.busNumber });
    }
    return base.sort((a, b) => extractBusOrder(a.label) - extractBusOrder(b.label));
  }, [formValues.busNumber]);

  const selectedDepartmentLabel = departmentOptions.find((option) => option.key === formValues.department)?.label;

  const degreeLine = selectedDepartmentLabel
    ? `B.E - ${selectedDepartmentLabel}`
    : profile?.course || 'Student';
  const yearLabel = formatYearLabel(formValues.year || profile?.year);

  const handleChange = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        name: formValues.name?.trim() || '',
        department: normalizeDepartmentValue(formValues.department),
        year: normalizeYearValue(formValues.year),
        phone: formValues.phone?.trim() || '',
        boardingPoint: formValues.boardingPoint?.trim() || '',
        boardingTime: formValues.boardingTime?.trim() || '',
        busNumber: normalizeBusValue(formValues.busNumber),
        busId: normalizeBusValue(formValues.busNumber),
        registerNumber: normalizeRegisterNumber(formValues.registerNumber),
      };

      const updatedProfile = await authService.updateStudentProfile(payload);

      setProfile(updatedProfile);
      setFormValues(buildFormValuesFromProfile(updatedProfile));
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Update failed', 'Unable to update profile right now. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="save" size={22} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={48} color={COLORS.white} />
            </View>
          </View>

          <Text style={styles.nameText}>{formValues.name || profile?.registerNumber || 'Student'}</Text>
          <Text style={styles.metaText}>{degreeLine}</Text>
          {yearLabel && <Text style={styles.yearText}>{yearLabel}</Text>}

          <View style={styles.infoCard}>
            <EditableRow
              icon="card"
              label="Register Number"
              value={formValues.registerNumber}
              onChangeText={(value) => handleChange('registerNumber', value)}
              autoCapitalize="characters"
            />
            <EditableRow
              icon="person"
              label="Full Name"
              value={formValues.name}
              onChangeText={(value) => handleChange('name', value)}
              autoCapitalize="words"
            />
            <EditableRow
              icon="school"
              label="Department"
              value={formValues.department}
              onChangeText={(value) => handleChange('department', value)}
              options={departmentOptions}
              placeholder="Select department"
            />
            <EditableRow
              icon="calendar"
              label="Year"
              value={formValues.year}
              onChangeText={(value) => handleChange('year', value)}
              options={YEAR_OPTIONS}
              placeholder="Select year"
            />
            <EditableRow
              icon="call"
              label="Phone Number"
              value={formValues.phone}
              onChangeText={(value) => handleChange('phone', value)}
              keyboardType="phone-pad"
            />
            <EditableRow
              icon="pin"
              label="Boarding Point"
              value={formValues.boardingPoint}
              onChangeText={(value) => handleChange('boardingPoint', value)}
              autoCapitalize="words"
            />
            <EditableRow
              icon="time"
              label="Boarding Time"
              value={formValues.boardingTime}
              onChangeText={(value) => handleChange('boardingTime', value)}
            />
            <EditableRow
              icon="bus"
              label="Bus Number"
              value={formValues.busNumber}
              onChangeText={(value) => handleChange('busNumber', value)}
              options={busOptions}
              placeholder="Select bus number"
              isLast
            />
          </View>
        </ScrollView>
      )}

      <StudentBottomNav activeTab="profile" navigation={navigation} />
    </SafeAreaView>
  );
};

const EditableRow = ({
  icon,
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  isLast,
  options,
  placeholder,
}) => {
  const [isPickerVisible, setPickerVisible] = useState(false);

  const resolvedPlaceholder = placeholder || `${options ? 'Select' : 'Enter'} ${label.toLowerCase()}`;

  const displayValue = options
    ? options.find((option) => option.key === value)?.label || value
    : value;

  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoIconWrapper}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.infoTextGroup}>
        <Text style={styles.infoLabel}>{label}</Text>
        {options ? (
          <>
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectValue,
                  !displayValue && styles.selectPlaceholder,
                ]}
              >
                {displayValue || resolvedPlaceholder}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray} />
            </TouchableOpacity>
            <Modal
              transparent
              visible={isPickerVisible}
              animationType="fade"
              onRequestClose={() => setPickerVisible(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setPickerVisible(false)}
              >
                <View style={styles.modalContent}>
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                          onChangeText(item.key);
                          setPickerVisible(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalOptionText}>{item.label}</Text>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                  />
                </View>
              </Pressable>
            </Modal>
          </>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            style={styles.infoValueInput}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={`${COLORS.gray}88`}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl * 1.5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  nameText: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    textAlign: 'center',
  },
  metaText: {
    marginTop: 6,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    textAlign: 'center',
  },
  yearText: {
    marginTop: 4,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    textAlign: 'center',
  },
  infoCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}55`,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValueInput: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    paddingVertical: 4,
  },
  selectTrigger: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  selectValue: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  selectPlaceholder: {
    color: `${COLORS.gray}AA`,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    maxHeight: '65%',
    ...SHADOWS.md,
  },
  modalOption: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  modalOptionText: {
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.black,
  },
  modalSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
});

export default StudentProfileScreen;
