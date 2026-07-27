import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {COLORS} from '../../theme/colors';

type WorkspaceMetricTileProps = {
  accentColor?: string;
  label: string;
  value: string;
};

const WorkspaceMetricTile = ({
  accentColor = COLORS.primary,
  label,
  value,
}: WorkspaceMetricTileProps) => {
  return (
    <View
      style={[
        styles.tile,
        {borderBottomColor: `${accentColor}30`},
      ]}>
      <Text style={styles.label}>{label}</Text>
      <Text
        numberOfLines={2}
        style={[
          styles.value,
          {color: accentColor},
        ]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingVertical: 12,
    width: '100%',
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '52%',
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '44%',
    textAlign: 'right',
  },
});

export default WorkspaceMetricTile;
