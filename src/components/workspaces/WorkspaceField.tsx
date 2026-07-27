import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {COLORS} from '../../theme/colors';

type WorkspaceFieldProps = {
  compactMultiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
};

const WorkspaceField = ({
  compactMultiline = false,
  keyboardType = 'default',
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: WorkspaceFieldProps) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSoft}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          compactMultiline && styles.inputCompactMultiline,
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  inputMultiline: {
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputCompactMultiline: {
    minHeight: 64,
  },
});

export default WorkspaceField;
