import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { normalizeBusNumber } from '../services/locationService';

const DriverProfileScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    busId: '',
    avatar: '',
  });

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      if ((currentUser.role || '').toLowerCase() !== 'driver') {
        navigation.goBack();
        return;
      }

      const normalizedBus = normalizeBusNumber(
        currentUser.busId || currentUser.busNumber || currentUser.selectedBus || ''
      );

      setProfile(currentUser);
      setForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        licenseNumber: currentUser.licenseNumber || '',
        busId: normalizedBus,
        avatar: currentUser.avatar || '',
      });
    } catch (error) {
      console.error('Failed to load driver profile', error);
      Alert.alert('Error', 'Unable to load profile details right now.');
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        handleChange('avatar', asset.uri);
      }
    } catch (error) {
      console.error('Driver avatar pick failed', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        name: form.name?.trim() || '',
        email: form.email?.trim() || profile?.email || '',
        phone: form.phone?.trim() || '',
        licenseNumber: form.licenseNumber?.trim() || '',
        busId: form.busId,
        busNumber: form.busId,
        avatar: form.avatar,
      };

      const updated = await authService.updateDriverProfile(payload);
      setProfile(updated);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Failed to save driver profile', error);
      Alert.alert('Update failed', 'Could not update your profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedBus = normalizeBusNumber(form.busId);

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
          <Text style={styles.headerTitle}>Driver Profile</Text>
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
                  <Ionicons name="person-circle" size={90} color={COLORS.secondary} />
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.nameText}>{form.name || profile?.userId || 'Driver'}</Text>
              <Text style={styles.metaText}>
                {resolvedBus ? `Bus ${resolvedBus}` : 'No bus assigned'}
              </Text>
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
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                icon="call"
                label="Phone"
                value={form.phone}
                onChangeText={(value) => handleChange('phone', value)}
                keyboardType="phone-pad"
              />
              <Field
                icon="card"
                label="License Number"
                value={form.licenseNumber}
                onChangeText={(value) => handleChange('licenseNumber', value)}
                autoCapitalize="characters"
              />
              <Field
                icon="bus"
                label="Assigned Bus"
                value={resolvedBus}
                editable={false}
              />
            </View>
          </ScrollView>
        )}
      </View>
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
}) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldIcon}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.fieldContent}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value || ''}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={`${COLORS.gray}88`}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: 'rgba(255,255,255,0.22)',
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  nameText: {
    marginTop: 18,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
});

export default DriverProfileScreen;
