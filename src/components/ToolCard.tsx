import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useLanguage} from '../context/LanguageContext';
import {COLORS} from '../theme/colors';
import {ToolItem} from '../types/tool';
import AppPressable from './AppPressable';

type ToolCardProps = {
  title: string;
  subtitle: string;
  badge: string;
  tool: ToolItem;
  onPress: () => void;
};

const getToolIcon = (toolId: string) => {
  switch (toolId) {
    case 'up-bhulekh':
      return 'file-document-outline';
    case 'up-bhunaksha':
      return 'map-outline';
    case 'edistrict-up':
      return 'office-building-outline';
    case 'igrs-registry':
      return 'stamp';
    case 'revenue-court':
      return 'scale-balance';
    case 'village-diary':
      return 'notebook-outline';
    case 'field-inspection':
      return 'clipboard-search-outline';
    case 'mutation-tracker':
      return 'file-sync-outline';
    case 'area-converter':
      return 'ruler-square';
    case 'plot-boundary-guide':
      return 'map-marker-path';
    case 'map-scale-helper':
      return 'map-legend';
    case 'registry-estimate':
      return 'calculator';
    case 'share-calculator':
      return 'percent-outline';
    case 'fraction-hissa-calculator':
      return 'division';
    case 'rate-finder':
      return 'currency-inr';
    case 'circle-rate-compare':
      return 'chart-line';
    case 'saved-record-locker':
      return 'lock-outline';
    default:
      return 'apps';
  }
};

const ToolCard = ({
  title,
  subtitle,
  badge,
  tool,
  onPress,
}: ToolCardProps) => {
  const {strings} = useLanguage();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <AppPressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      pressEffect="tilt"
      pressedOpacity={0.96}
      style={[
        styles.card,
        {borderColor: `${tool.accentColor}20`},
        isPressed && [
          styles.cardPressed,
          {
            backgroundColor: `${tool.accentColor}10`,
            borderColor: `${tool.accentColor}55`,
            shadowColor: tool.accentColor,
          },
        ],
      ]}>
      <View
        style={[
          styles.topStrip,
          isPressed && styles.topStripPressed,
          {backgroundColor: tool.accentColor},
        ]}
      />

      <View style={styles.topRow}>
        <View
          style={[
            styles.iconContainer,
            isPressed && styles.iconContainerPressed,
            {backgroundColor: tool.accentColor},
          ]}>
          <MaterialCommunityIcons
            color="#FFFFFF"
            name={getToolIcon(tool.id)}
            size={26}
          />
        </View>

        <View
          style={[
            styles.badgeContainer,
            isPressed && {
              backgroundColor: `${tool.accentColor}15`,
            },
          ]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      <Text numberOfLines={2} style={styles.subtitle}>
        {subtitle}
      </Text>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.footerLabel}>
            {tool.url
              ? strings.portalLabel
              : strings.workspaceLabel}
          </Text>

          <Text style={styles.footerValue}>
            {tool.premium
              ? strings.premiumLabel
              : strings.openLabel}
          </Text>
        </View>

        <View
          style={[
            styles.arrowButton,
            isPressed && styles.arrowButtonPressed,
            {backgroundColor: tool.accentColor},
          ]}>
          <MaterialCommunityIcons
            color="#FFFFFF"
            name="arrow-right"
            size={20}
          />
        </View>
      </View>
    </AppPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 24,
    elevation: 5,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  cardPressed: {
    elevation: 10,
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  topStrip: {
    height: 4,
    marginBottom: 16,
    marginHorizontal: -18,
    marginTop: -18,
  },
  topStripPressed: {
    height: 6,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  iconContainerPressed: {
    transform: [{scale: 1.08}],
  },
  badgeContainer: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  divider: {
    backgroundColor: '#E8EDF5',
    height: 1,
    marginTop: 18,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerLabel: {
    color: COLORS.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  footerValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  arrowButton: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  arrowButtonPressed: {
    transform: [{translateX: 3}, {scale: 1.05}],
  },
});

export default ToolCard;
