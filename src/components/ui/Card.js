import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';

export const Card = ({ children, style, variant = 'default' }) => {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
};

export const CardHeader = ({ title, subtitle, rightElement, style }) => {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>
        {title && <Text style={styles.headerTitle}>{title}</Text>}
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
};

export const CardContent = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

export const CardFooter = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  default: {
    borderWidth: 0,
  },
  elevated: {
    ...SHADOWS.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    ...SHADOWS.sm,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.gray,
  },
  
  content: {
    marginVertical: SPACING.sm,
  },
  
  footer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
});
