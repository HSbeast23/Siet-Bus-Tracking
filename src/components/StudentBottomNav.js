import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../utils/constants';

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    route: 'StudentDashboard',
  },
  {
    key: 'track',
    label: 'Track',
    icon: 'navigate',
    route: 'MapScreen',
    params: { role: 'student' },
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-circle',
    route: 'StudentProfile',
  },
];

const StudentBottomNav = ({ activeTab, navigation }) => {
  const handlePress = (item) => {
    if (!navigation) {
      return;
    }

    if (item.route === 'StudentDashboard') {
      navigation.navigate('StudentDashboard');
      return;
    }

    if (item.route === 'MapScreen') {
      navigation.navigate(item.route, item.params || {});
      return;
    }

    navigation.navigate(item.route, item.params || {});
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        const isTrackButton = item.key === 'track';
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isTrackButton && styles.trackNavItem]}
            onPress={() => handlePress(item)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconContainer,
                isTrackButton && styles.trackIconContainer,
                isActive && !isTrackButton && styles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={isTrackButton ? 20 : 22}
                color={isTrackButton ? COLORS.white : isActive ? COLORS.secondary : COLORS.gray}
              />
            </View>

            <Text
              style={[
                styles.label,
                isActive && styles.activeLabel,
                isTrackButton && styles.trackLabel,
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
    position: 'relative',
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
  iconContainerActive: {
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

export default StudentBottomNav;
