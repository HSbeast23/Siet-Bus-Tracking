import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { normalizeBusNumber } from '../services/locationService';

const formatLabel = (value, fallback = 'Not available') => {
  if (!value) {
    return fallback;
  }
  return value;
};

const formatRole = (value) => {
  if (!value) {
    return 'Bus Incharge';
  }
  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const BusInchargeDetails = ({ route, navigation }) => {
  const coadmin = route.params?.coadmin;

  if (!coadmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bus Incharge Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="warning" size={40} color={COLORS.warning} />
          <Text style={styles.emptyTitle}>No details available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const assignedBus = normalizeBusNumber(coadmin.busNumber || coadmin.busId || '');
  const contactRows = [
    {
      icon: 'mail',
      label: 'Email',
      value: formatLabel(coadmin.email),
    },
    {
      icon: 'call',
      label: 'Phone',
      value: formatLabel(coadmin.phone),
    },
  ];
  const metaRows = [
    {
      icon: 'person',
      label: 'User ID',
      value: formatLabel(coadmin.userId || coadmin.id),
    },
    {
      icon: 'shield-checkmark',
      label: 'Team Role',
      value: formatRole(coadmin.teamRole),
    },
    {
      icon: 'bus',
      label: 'Assigned Bus',
      value: assignedBus || 'Unassigned',
    },
    {
      icon: 'time',
      label: 'Last Login',
      value: formatLabel(coadmin.lastLogin, 'Never'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Incharge Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              {coadmin.avatar ? (
                <Image source={{ uri: coadmin.avatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="shield-checkmark" size={42} color={COLORS.white} />
              )}
            </View>
            <View style={styles.primaryDetails}>
              <Text style={styles.nameText}>{coadmin.name || coadmin.userId || 'Bus Incharge'}</Text>
              <Text style={styles.busText}>
                {assignedBus ? `Bus ${assignedBus}` : 'No bus assigned'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <Ionicons name="briefcase" size={14} color={COLORS.secondary} />
                  <Text style={styles.roleText}>{formatRole(coadmin.teamRole)}</Text>
                </View>
                {coadmin.status ? (
                  <View style={[styles.statusBadge, styles.statusActive]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                    <Text style={styles.statusText}>{coadmin.status}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {contactRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          {metaRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    ...SHADOWS.sm,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  headerPlaceholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
  },
  primaryDetails: {
    flex: 1,
  },
  nameText: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  busText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}1A`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  roleText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  statusActive: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomColor: `${COLORS.border}55`,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  retryButton: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
});

export default BusInchargeDetails;
