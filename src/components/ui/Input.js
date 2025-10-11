import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { Ionicons } from '@expo/vector-icons';

export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  icon,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  onFocus,
  onBlur,
  showToggleLabel = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus && onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur && onBlur();
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? COLORS.secondary : COLORS.gray}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            secureTextEntry && styles.inputWithSecure,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            style={styles.secureButton}
          >
            <Ionicons
              name={isSecure ? 'eye-off' : 'eye'}
              size={20}
              color={COLORS.gray}
            />
            {showToggleLabel && (
              <Text style={styles.secureLabel}>
                {isSecure ? 'Show' : 'Hide'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  inputFocused: {
    borderColor: COLORS.secondary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.6,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.black,
    paddingVertical: Platform.select({ ios: SPACING.md, android: SPACING.sm }),
    minHeight: 48,
    textAlignVertical: 'center',
    lineHeight: 20,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithSecure: {
    paddingRight: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  secureButton: {
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureLabel: {
    marginLeft: SPACING.xs,
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.gray,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
