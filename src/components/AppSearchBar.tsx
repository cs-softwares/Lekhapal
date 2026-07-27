import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {COLORS} from '../theme/colors';

type AppSearchBarProps = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

const AppSearchBar = ({
  value,
  placeholder,
  onChangeText,
}: AppSearchBarProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>SR</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSoft}
        style={styles.input}
        value={value}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  icon: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 10,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
});

export default AppSearchBar;
