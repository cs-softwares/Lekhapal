import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS} from '../theme/colors';
import AppPressable from './AppPressable';

type HomeWorkflowCardProps = {
  accentColor: string;
  actionLabel: string;
  iconName: string;
  onPress: () => void;
  status: string;
  steps: string[];
  subtitle: string;
  title: string;
};

const HomeWorkflowCard = ({
  accentColor,
  actionLabel,
  iconName,
  onPress,
  status,
  steps,
  subtitle,
  title,
}: HomeWorkflowCardProps) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <AppPressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}

      pressedOpacity={0.96}
      style={[
        styles.card,
        {borderColor: `${accentColor}55`},
        isPressed && [
          styles.cardPressed,
          {
            backgroundColor: `${accentColor}12`,
            borderColor: `${accentColor}55`,
            shadowColor: accentColor,
          },
        ],
      ]}>
      <View
        style={[
          styles.topStrip,
          {backgroundColor: accentColor},
          isPressed && styles.topStripPressed,
        ]}
      />

      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBadge,
            {backgroundColor: accentColor},
            isPressed && styles.iconBadgePressed,
          ]}>
          <MaterialCommunityIcons
            color={COLORS.white}
            name={iconName}
            size={22}
          />
        </View>

        <View
          style={[
            styles.statusPill,
            {backgroundColor: `${accentColor}12`},
          ]}>
          <Text
            numberOfLines={1}
            style={[styles.statusText, {color: accentColor}]}>
            {status}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.stepList}>
        {steps.map((step, index) => (
          <View
            key={`${title}-${index}`}
            style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                {backgroundColor: accentColor},
              ]}>
              <Text style={styles.stepDotText}>
                {index + 1}
              </Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.actionText, {color: accentColor}]}>
          {actionLabel}
        </Text>

        <View
          style={[
            styles.arrowButton,
            {backgroundColor: accentColor},
            isPressed && styles.arrowButtonPressed,
          ]}>
          <MaterialCommunityIcons
            color={COLORS.white}
            name="arrow-right"
            size={18}
          />
        </View>
      </View>
    </AppPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.15,
    borderRadius: 24,
    marginBottom: 14,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  cardPressed: {
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  topStrip: {
    height: 4,
    marginHorizontal: -18,
    marginTop: -18,
    marginBottom: 16,
  },
  topStripPressed: {
    height: 6,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconBadgePressed: {
    transform: [{scale: 1.06}],
  },
  statusPill: {
    borderRadius: 999,
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
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
    lineHeight: 21,
    marginTop: 8,
  },
  stepList: {
    marginTop: 16,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 10,
  },
  stepDot: {
    alignItems: 'center',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 20,
  },
  stepDotText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  stepText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  footerRow: {
    alignItems: 'center',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 14,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  arrowButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  arrowButtonPressed: {
    transform: [{translateX: 3}, {scale: 1.04}],
  },
});

export default HomeWorkflowCard;
