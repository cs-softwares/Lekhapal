import {StyleSheet} from 'react-native';

import {COLORS} from '../../theme/colors';

export const workspaceStyles = StyleSheet.create({
  introCard: {
    borderLeftColor: COLORS.secondary,
    borderLeftWidth: 3,
    marginBottom: 16,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  reportCard: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingVertical: 16,
  },
  reportTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  reportSubtitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  reportLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  formCard: {
    marginTop: 10,
  },
  metricsRow: {
    marginTop: 2,
  },
  resultSection: {
    marginTop: 14,
  },
});
