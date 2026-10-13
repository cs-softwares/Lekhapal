import { LIGHT_COLORS } from './palette';
import { StyleSheet } from 'react-native';
export const theme = {
  colors: {
    primary: LIGHT_COLORS.primary,
    active: LIGHT_COLORS.primaryDark,
    success: '#00A86B',
    warning: '#F59E0B',
    danger: '#EF4444',
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    subtitle: '#64748B',
    caption: '#94A3B8',
    blueSoft: LIGHT_COLORS.primarySoft,
    greenSoft: '#E6F6EF',
    amberSoft: '#FFF5DB',
    redSoft: '#FEF2F2',
  },
  radius: { card: 16, input: 12, button: 10, badge: 6 },
  spacing: { screen: 20, gap: 12 },
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
};
export const deskStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: theme.colors.text,
  },
  heading: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 14, lineHeight: 21, color: theme.colors.text },
  muted: { fontSize: 13, lineHeight: 20, color: theme.colors.subtitle },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: theme.colors.subtitle,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
  grow: { flex: 1 },
});
