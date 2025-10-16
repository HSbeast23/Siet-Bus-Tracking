import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const formatYearLabel = (value) => {
  if (!value) return null;
  const numericValue = parseInt(value, 10);
  if (Number.isNaN(numericValue)) {
    return value;
  }
  const suffix = numericValue === 1 ? 'st' : numericValue === 2 ? 'nd' : numericValue === 3 ? 'rd' : 'th';
  return `${numericValue}${suffix} Year`;
};

const StudentProfileScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [formValues, setFormValues] = useState({
    name: '',
    department: '',
    year: '',
    phone: '',
    boardingPoint: '',
    boardingTime: '',
    busNumber: '',
    registerNumber: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      setProfile(currentUser);
      setFormValues({
        name: currentUser?.name || '',
        department: currentUser?.department || '',
        year: currentUser?.year ? String(currentUser.year) : '',
        phone: currentUser?.phone || currentUser?.contactNumber || '',
        boardingPoint: currentUser?.boardingPoint || currentUser?.pickupLocation || '',
        boardingTime: currentUser?.boardingTime || currentUser?.pickupTime || '',
        busNumber: currentUser?.busNumber || currentUser?.busId || '',
        registerNumber: currentUser?.registerNumber || currentUser?.userId || '',
      });
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

  const degreeLine = formValues.department
    ? `B.E - ${formValues.department}`
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
        department: formValues.department?.trim() || '',
        year: formValues.year?.trim() || '',
        phone: formValues.phone?.trim() || '',
        boardingPoint: formValues.boardingPoint?.trim() || '',
        boardingTime: formValues.boardingTime?.trim() || '',
        busNumber: formValues.busNumber?.trim() || '',
        registerNumber: formValues.registerNumber?.trim() || '',
      };

      const updatedProfile = await authService.updateStudentProfile(payload);

      setProfile(updatedProfile);
      setFormValues({
        name: updatedProfile?.name ?? payload.name,
        department: updatedProfile?.department ?? payload.department,
        year: updatedProfile?.year ? String(updatedProfile.year) : payload.year,
        phone: updatedProfile?.phone ?? payload.phone,
        boardingPoint:
          updatedProfile?.boardingPoint || updatedProfile?.pickupLocation || payload.boardingPoint,
        boardingTime:
          updatedProfile?.boardingTime || updatedProfile?.pickupTime || payload.boardingTime,
        busNumber: updatedProfile?.busNumber || updatedProfile?.busId || payload.busNumber,
        registerNumber:
          updatedProfile?.registerNumber || updatedProfile?.userId || payload.registerNumber,
      });
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
              autoCapitalize="characters"
            />
            <EditableRow
              icon="calendar"
              label="Year"
              value={formValues.year}
              onChangeText={(value) => handleChange('year', value)}
              keyboardType="number-pad"
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
              autoCapitalize="characters"
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
}) => (
  <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
    <View style={styles.infoIconWrapper}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.infoTextGroup}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.infoValueInput}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={`${COLORS.gray}88`}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  </View>
);

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
});

export default StudentProfileScreen;
