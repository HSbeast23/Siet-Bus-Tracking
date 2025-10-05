import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, outline, danger
  size = 'md', // sm, md, lg
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.secondary : COLORS.white} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={variant === 'outline' ? COLORS.secondary : COLORS.white}
              style={styles.iconLeft}
            />
          )}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={variant === 'outline' ? COLORS.secondary : COLORS.white}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Variants
  primary: {
    backgroundColor: COLORS.secondary,
  },
  secondary: {
    backgroundColor: COLORS.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  
  // Sizes
  sm: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  md: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  lg: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  
  // Disabled
  disabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.6,
  },
  
  // Text styles
  text: {
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.secondary,
  },
  outlineText: {
    color: COLORS.secondary,
  },
  dangerText: {
    color: COLORS.white,
  },
  disabledText: {
    color: COLORS.gray,
  },
  
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },
  
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
});
