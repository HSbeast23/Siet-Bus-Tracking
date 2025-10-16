import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/constants';

const CoAdminBottomNav = ({ activeTab, navigation, busId }) => {
  const navItems = useMemo(
    () => [
      {
        key: 'home',
        label: 'Home',
        icon: 'home',
        action: () => navigation?.navigate?.('CoAdminDashboard'),
      },
      {
        key: 'track',
        label: 'Track',
        icon: 'navigate',
        action: () => {
          if (!busId) {
            Alert.alert('Bus Not Assigned', 'Your profile does not have an assigned bus yet.');
            return;
          }
          navigation?.navigate?.('MapScreen', {
            role: 'coadmin',
            busId,
          });
        },
      },
      {
        key: 'profile',
        label: 'Profile',
        icon: 'person-circle',
        action: () => navigation?.navigate?.('CoAdminProfile'),
      },
    ],
    [navigation, busId]
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const isTrackButton = item.key === 'track';

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isTrackButton && styles.trackNavItem]}
              onPress={item.action}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconContainer,
                  isTrackButton && styles.trackIconContainer,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={isTrackButton ? 20 : 22}
                  color={
                    isTrackButton
                      ? COLORS.white
                      : isActive
                        ? COLORS.secondary
                        : COLORS.gray
                  }
                />
              </View>
              <Text
                style={[
                  styles.label,
                  isTrackButton && styles.trackLabel,
                  isActive && !isTrackButton && styles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    ...SHADOWS.md,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNavItem: {
    marginHorizontal: 6,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  trackIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: 'Poppins_500Medium',
  },
  activeLabel: {
    color: COLORS.secondary,
  },
  trackLabel: {
    marginTop: 8,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default CoAdminBottomNav;
