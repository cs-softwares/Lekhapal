import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../theme/colors';
import AppPressable from '../AppPressable';

type Option = {
  label: string;
  value: string;
};

type WorkspaceChipSelectorProps = {
  label: string;
  onSelect: (value: string) => void;
  options: Option[];
  selectedValue: string;
};

const WorkspaceChipSelector = ({
  label,
  onSelect,
  options,
  selectedValue,
}: WorkspaceChipSelectorProps) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map(option => {
          const selected = option.value === selectedValue;

          return (
            <AppPressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.chip,
                selected && styles.chipSelected,
              ]}>
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                ]}>
                {option.label}
              </Text>
            </AppPressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: 'transparent',
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderRadius: 0,
    marginBottom: 8,
    marginRight: 14,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  chipSelected: {
    borderBottomColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
});

export default WorkspaceChipSelector;
