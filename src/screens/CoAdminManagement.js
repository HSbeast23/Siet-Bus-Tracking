import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const CoAdminManagement = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coadmins, setCoadmins] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCoadmins();
  }, []);

  const loadCoadmins = async () => {
    setLoading(true);
    try {
      const results = await registeredUsersStorage.getAllCoAdmins();
      const sorted = results.sort((a, b) => {
        const busA = (a.busNumber || '').localeCompare(b.busNumber || '');
        if (busA !== 0) {
          return busA;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
      setCoadmins(sorted);
    } catch (error) {
        console.error('Error loading bus incharges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoadmins();
  };

  const filteredCoadmins = useMemo(() => {
    if (!search.trim()) {
      return coadmins;
    }
    const queryText = search.trim().toLowerCase();
    return coadmins.filter((coadmin) => {
      const haystack = [
        coadmin.name,
        coadmin.userId,
        coadmin.busNumber,
        coadmin.busId,
        coadmin.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(queryText);
    });
  }, [search, coadmins]);

  const handleCoadminPress = (coadmin) => {
    navigation.navigate('CoAdminDetails', { coadmin });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
          <Text style={styles.headerTitle}>Bus Incharge Management</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={22} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, bus, or ID"
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading bus incharge assignments...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredCoadmins.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No bus incharges found</Text>
              <Text style={styles.emptySubtitle}>
                  Add bus incharge accounts to assign them to buses and track their coverage.
              </Text>
            </View>
          ) : (
            filteredCoadmins.map((coadmin) => (
              <TouchableOpacity
                key={coadmin.id || coadmin.userId}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => handleCoadminPress(coadmin)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    {coadmin?.avatar ? (
                      <Image source={{ uri: coadmin.avatar }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="shield-checkmark" size={24} color={COLORS.white} />
                    )}
                  </View>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>{coadmin.name || coadmin.userId}</Text>
                    <Text style={styles.cardSubtitle}>
                      ID: {coadmin.userId || coadmin.id || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.busBadge}>
                    <Ionicons name="bus" size={16} color={COLORS.white} />
                    <Text style={styles.busText}>{coadmin.busNumber || coadmin.busId || 'Unassigned'}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Ionicons name="mail" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{coadmin.email || 'No email recorded'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="call" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{coadmin.phone || 'No phone recorded'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      )}
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
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.secondary,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.round,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  busBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  busText: {
    marginLeft: SPACING.xs,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  cardBody: {
    marginTop: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metaText: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default CoAdminManagement;
