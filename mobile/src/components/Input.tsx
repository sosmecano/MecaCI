import { useState } from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../constants/theme';

interface Props {
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  label?: string;
  keyboardType?: any;
  autoFocus?: boolean;
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: string;
  style?: any;
}

export default function Input({
  placeholder, value, onChangeText, label, keyboardType,
  autoFocus, maxLength, multiline, numberOfLines, leftIcon, style,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputRow,
        isFocused ? styles.inputRowFocused : {},
      ]}>
        {leftIcon ? (
          <Ionicons name={leftIcon as any} size={18} color={Colors.onSurfaceVariant} style={styles.leftIcon} />
        ) : null}
        <TextInput
          style={[styles.input, leftIcon ? { paddingLeft: Spacing.xs } : {}, multiline ? styles.multiline : {}]}
          placeholder={placeholder}
          placeholderTextColor={Colors.onSurfaceVariant}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.base,
    fontWeight: '600' as any,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: 0,
    paddingBottom: Spacing.xs,
  },
  inputRowFocused: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  leftIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 48,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },
  multiline: {
    minHeight: 100,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
});
