import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { authService } from '../services/authService';
import CoAdminBottomNav from '../components/CoAdminBottomNav';
import { normalizeBusNumber } from '../services/locationService';

const TEAM_ROLES = [
  { key: 'coadmin', label: 'Bus Incharge' },
  { key: 'assistant', label: 'Assistant Coordinator' },
  { key: 'operations', label: 'Operations Support' },
];

const CoAdminProfileScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    role: 'coadmin',
    phone: '',
    email: '',
    busId: '',
    busNumber: '',
    avatar: '',
  });
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      const normalizedBus = normalizeBusNumber(
        currentUser.busId || currentUser.busNumber || ''
      );

      setProfile(currentUser);
      setForm({
        name: currentUser.name || '',
        role: (currentUser.teamRole || 'coadmin').toLowerCase(),
        phone: currentUser.phone || currentUser.contactNumber || '',
        email: currentUser.email || '',
        busId: normalizedBus,
        busNumber: normalizedBus,
        avatar: currentUser.avatar || '',
      });
    } catch (error) {
  console.error('Failed to load bus incharge profile', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadProfile);
    loadProfile();
    return unsubscribe;
  }, [loadProfile, navigation]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        handleChange('avatar', asset.uri);
      }
    } catch (error) {
      console.error('Avatar pick failed', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        name: form.name?.trim() || '',
        teamRole: form.role,
        phone: form.phone?.trim() || '',
        email: form.email?.trim() || profile?.email || '',
        busId: normalizeBusNumber(form.busId || form.busNumber),
        busNumber: normalizeBusNumber(form.busId || form.busNumber),
        avatar: form.avatar,
      };

      const updated = await authService.updateCoAdminProfile(payload);
      setProfile(updated);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error) {
  console.error('Failed to save bus incharge profile', error);
      Alert.alert('Update failed', 'Could not update your profile. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeBusId = normalizeBusNumber(form.busId || form.busNumber);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
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
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar}>
                {form.avatar ? (
                  <Image source={{ uri: form.avatar }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person-circle" size={80} color={COLORS.secondary} />
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.nameText}>{form.name || profile?.userId || 'Bus Incharge'}</Text>
              <Text style={styles.metaText}>{activeBusId ? `Bus ${activeBusId}` : 'No bus assigned'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Field
                icon="person"
                label="Full Name"
                value={form.name}
                onChangeText={(value) => handleChange('name', value)}
                autoCapitalize="words"
              />
              <Field
                icon="mail"
                label="Email"
                value={form.email}
                onChangeText={(value) => handleChange('email', value)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Field
                icon="call"
                label="Phone"
                value={form.phone}
                onChangeText={(value) => handleChange('phone', value)}
                keyboardType="phone-pad"
              />
              <PickerField
                icon="shield-checkmark"
                label="Team Role"
                value={form.role}
                onOpen={() => setRolePickerVisible(true)}
                displayValue={
                  TEAM_ROLES.find((option) => option.key === form.role)?.label || 'Select role'
                }
              />
              <Field
                icon="bus"
                label="Assigned Bus"
                value={activeBusId}
                editable={false}
                placeholder="Not assigned"
              />
            </View>
          </ScrollView>
        )}

        <CoAdminBottomNav activeTab="profile" navigation={navigation} busId={activeBusId} />
      </View>

      <Modal
        transparent
        visible={rolePickerVisible}
        animationType="fade"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRolePickerVisible(false)}>
          <View style={styles.modalContent}>
            {TEAM_ROLES.map((option) => {
              const isActive = option.key === form.role;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                  onPress={() => {
                    handleChange('role', option.key);
                    setRolePickerVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color={COLORS.secondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const Field = ({
  icon,
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  placeholder,
}) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldIcon}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.fieldContent}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor={`${COLORS.gray}88`}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

const PickerField = ({ icon, label, displayValue, onOpen }) => (
  <TouchableOpacity style={styles.fieldRow} onPress={onOpen} activeOpacity={0.8}>
    <View style={styles.fieldIcon}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.fieldContent}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pickerTrigger}>
        <Text style={styles.pickerValue}>{displayValue}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.gray} />
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerButtonDisabled: {
    opacity: 0.6,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: `${COLORS.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.md,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  nameText: {
    marginTop: 16,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  metaText: {
    marginTop: 6,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}55`,
  },
  fieldIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${COLORS.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  fieldInput: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: COLORS.black,
    paddingVertical: 4,
  },
  fieldInputDisabled: {
    color: `${COLORS.gray}AA`,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  pickerValue: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: COLORS.black,
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
    paddingVertical: SPACING.sm,
    ...SHADOWS.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalOptionActive: {
    backgroundColor: `${COLORS.primary}22`,
  },
  modalOptionText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.black,
  },
});

export default CoAdminProfileScreen;
