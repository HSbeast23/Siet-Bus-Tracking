import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { reportsService } from '../services/reportsService';

const STATUS_META = {
	pending: { label: 'Pending', color: '#FF9800', background: '#FFF3E0' },
	acknowledged: { label: 'Acknowledged', color: COLORS.info, background: '#E3F2FD' },
	resolved: { label: 'Resolved', color: '#4CAF50', background: '#E8F5E9' },
};

const Reports = ({ navigation }) => {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [studentReports, setStudentReports] = useState([]);
	const [coadminReports, setCoadminReports] = useState([]);

	const formatTimestamp = useCallback((rawTimestamp) => {
		if (!rawTimestamp) {
			return '-- -- --';
		}

		if (rawTimestamp?.toDate) {
			return formatDateTime(rawTimestamp.toDate());
		}

		if (typeof rawTimestamp === 'object' && typeof rawTimestamp.seconds === 'number') {
			return formatDateTime(new Date(rawTimestamp.seconds * 1000));
		}

		if (rawTimestamp instanceof Date) {
			return formatDateTime(rawTimestamp);
		}

		if (typeof rawTimestamp === 'string') {
			const parsed = new Date(rawTimestamp);
			if (!Number.isNaN(parsed.getTime())) {
				return formatDateTime(parsed);
			}
		}

		return '-- -- --';
	}, []);

	const loadReports = useCallback(async () => {
		setLoading(true);
		try {
			const listResult = await reportsService.getAllReports();

			if (listResult.success) {
				setStudentReports(listResult.studentReports || []);
				setCoadminReports(listResult.coadminReports || []);
			} else {
				setStudentReports([]);
				setCoadminReports([]);
			}
		} catch (error) {
			console.error('Error loading reports:', error);
			setStudentReports([]);
			setCoadminReports([]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadReports();
	}, [loadReports]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadReports();
	}, [loadReports]);

	const combinedReports = useMemo(
		() => [...coadminReports, ...studentReports],
		[coadminReports, studentReports]
	);

	const pendingCount = useMemo(
		() => combinedReports.filter((report) => report.status === 'pending').length,
		[combinedReports]
	);

	const acknowledgedCount = useMemo(
		() => combinedReports.filter((report) => report.status === 'acknowledged').length,
		[combinedReports]
	);

	const resolvedCount = useMemo(
		() => combinedReports.filter((report) => report.status === 'resolved').length,
		[combinedReports]
	);

	const renderReportCard = useCallback(
		(report) => {
			const meta = STATUS_META[report.status] || STATUS_META.pending;
			const reporterName = report.reportedByName || report.reportedBy || 'Unknown';
			const reporterRole = report.reporterRole === 'coadmin' ? 'Co-Admin' : 'Student';
			const iconName = report.reporterRole === 'coadmin' ? 'shield-checkmark' : 'person';

			return (
				<View key={report.id} style={styles.reportCard}>
					<View style={styles.reportHeader}>
						<View style={styles.reporterInfo}>
							<Ionicons name={iconName} size={18} color={COLORS.secondary} />
							<Text style={styles.reporterText}>{`${reporterName} · ${reporterRole}`}</Text>
						</View>
						<View style={[styles.statusBadge, { backgroundColor: meta.background }]}>
							<Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
						</View>
					</View>

					<View style={styles.metaRow}>
						<Ionicons name="bus" size={16} color={COLORS.textSecondary} />
						<Text style={styles.metaText}>
							{report.busNumber ? `Bus ${report.busNumber}` : 'Bus not specified'}
						</Text>
					</View>

					{report.registerNumber ? (
						<View style={styles.metaRow}>
							<Ionicons name="id-card" size={16} color={COLORS.textSecondary} />
							<Text style={styles.metaText}>Register No: {report.registerNumber}</Text>
						</View>
					) : null}

					<Text style={styles.reportMessage}>{report.message}</Text>

					<View style={styles.reportFooter}>
						<View style={styles.timestampContainer}>
							<Ionicons name="time" size={14} color={COLORS.textSecondary} />
							<Text style={styles.timestamp}>{formatTimestamp(report.timestamp)}</Text>
						</View>
						{report.acknowledgedBy ? (
							<View style={styles.timestampContainer}>
								<Ionicons name="checkmark-done" size={14} color={COLORS.textSecondary} />
								<Text style={styles.timestamp}>By {report.acknowledgedBy}</Text>
							</View>
						) : null}
					</View>

					{report.response ? (
						<View style={styles.responseContainer}>
							<Text style={styles.responseLabel}>Management Response</Text>
							<Text style={styles.responseText}>{report.response}</Text>
						</View>
					) : null}
				</View>
			);
		},
		[formatTimestamp]
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
				<Text style={styles.loadingText}>Loading latest reports…</Text>
			</SafeAreaView>
		);
	}

	const renderSection = (title, data, emptyMessage) => (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{data.length === 0 ? (
				<EmptyState message={emptyMessage} />
			) : (
				data.map((item) => renderReportCard(item))
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons name="arrow-back" size={24} color={COLORS.white} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Reports</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView
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
				<View style={styles.infoCard}>
					<View style={styles.infoHeader}>
						<Ionicons name="document-text" size={24} color={COLORS.secondary} />
						<Text style={styles.infoTitle}>Bus Coordination Reports</Text>
					</View>
					<Text style={styles.infoSubtitle}>
						Review submissions from co-admins and students. Monitor bus-specific concerns and
						follow up on coordination notes in one place.
					</Text>
				</View>

				<View style={styles.statsContainer}>
					<View style={styles.statBox}>
						<Text style={styles.statValue}>{combinedReports.length}</Text>
						<Text style={styles.statLabel}>Total</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={[styles.statValue, { color: STATUS_META.pending.color }]}>{pendingCount}</Text>
						<Text style={styles.statLabel}>Pending</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={[styles.statValue, { color: STATUS_META.acknowledged.color }]}>
							{acknowledgedCount}
						</Text>
						<Text style={styles.statLabel}>Acknowledged</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={[styles.statValue, { color: STATUS_META.resolved.color }]}>{resolvedCount}</Text>
						<Text style={styles.statLabel}>Resolved</Text>
					</View>
				</View>

				{renderSection('Co-Admin Reports', coadminReports, 'No reports from co-admins yet')}
				{renderSection('Student Reports', studentReports, 'No student reports submitted')}

				<View style={{ height: SPACING.xl }} />
			</ScrollView>
		</SafeAreaView>
	);
};

const EmptyState = ({ message }) => (
	<View style={styles.emptyState}>
		<Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
		<Text style={styles.emptyText}>{message}</Text>
	</View>
);

const formatDateTime = (date) =>
	date.toLocaleString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.background,
	},
	loadingText: {
		marginTop: SPACING.sm,
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#8B4513',
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		...SHADOWS.md,
	},
	headerTitle: {
		fontSize: 20,
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},
	headerSpacer: {
		width: 24,
	},
	infoCard: {
		backgroundColor: COLORS.white,
		margin: SPACING.lg,
		padding: SPACING.lg,
		borderRadius: RADIUS.lg,
		...SHADOWS.md,
	},
	infoHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SPACING.sm,
	},
	infoTitle: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textPrimary,
		marginLeft: SPACING.sm,
	},
	infoSubtitle: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
		lineHeight: 20,
	},
	statsContainer: {
		flexDirection: 'row',
		paddingHorizontal: SPACING.lg,
		marginBottom: SPACING.md,
	},
	statBox: {
		flex: 1,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		padding: SPACING.md,
		marginHorizontal: SPACING.xs,
		alignItems: 'center',
		...SHADOWS.sm,
	},
	statValue: {
		fontSize: 24,
		fontFamily: FONTS.bold,
		color: COLORS.secondary,
	},
	statLabel: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
		marginTop: SPACING.xs,
	},
	section: {
		paddingHorizontal: SPACING.lg,
		marginBottom: SPACING.lg,
	},
	sectionTitle: {
		fontSize: 16,
		fontFamily: FONTS.bold,
		color: COLORS.textPrimary,
		marginBottom: SPACING.md,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: SPACING.xl,
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		...SHADOWS.sm,
	},
	emptyText: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
		marginTop: SPACING.sm,
	},
	reportCard: {
		backgroundColor: COLORS.white,
		borderRadius: RADIUS.md,
		padding: SPACING.md,
		marginBottom: SPACING.md,
		...SHADOWS.sm,
	},
	reportHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: SPACING.sm,
	},
	reporterInfo: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	reporterText: {
		fontSize: 14,
		fontFamily: FONTS.semiBold,
		color: COLORS.textPrimary,
		marginLeft: SPACING.xs,
	},
	statusBadge: {
		paddingHorizontal: SPACING.sm,
		paddingVertical: 4,
		borderRadius: RADIUS.sm,
	},
	statusText: {
		fontSize: 12,
		fontFamily: FONTS.medium,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	metaText: {
		marginLeft: SPACING.xs,
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
	},
	reportMessage: {
		fontSize: 14,
		fontFamily: FONTS.regular,
		color: COLORS.textPrimary,
		lineHeight: 20,
		marginVertical: SPACING.sm,
	},
	reportFooter: {
		borderTopWidth: 1,
		borderTopColor: `${COLORS.gray}20`,
		paddingTop: SPACING.sm,
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	timestampContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: SPACING.md,
		marginTop: SPACING.xs,
	},
	timestamp: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: COLORS.textSecondary,
		marginLeft: SPACING.xs,
	},
	responseContainer: {
		marginTop: SPACING.md,
		backgroundColor: `${COLORS.info}15`,
		borderRadius: RADIUS.md,
		padding: SPACING.md,
	},
	responseLabel: {
		fontSize: 12,
		fontFamily: FONTS.medium,
		color: COLORS.info,
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	responseText: {
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: COLORS.textPrimary,
		lineHeight: 18,
	},
});

export default Reports;
