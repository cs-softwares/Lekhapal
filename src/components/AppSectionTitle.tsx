import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useAppTheme} from '../context/ThemeContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import AppPressable from './AppPressable';

type AppSectionTitleProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

const AppSectionTitle = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: AppSectionTitleProps) => {
  const metrics = useResponsiveMetrics();
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        textBlock: {
          flex: 1,
        },
        title: {
          color: colors.text,
          fontWeight: '800',
        },
        subtitle: {
          color: colors.textMuted,
        },
        actionButton: {
          backgroundColor: colors.primarySoft,
        },
        actionText: {
          color: colors.primary,
          fontWeight: '700',
        },
      }),
    [colors],
  );

  return (
    <View
      style={[
        styles.container,
        {
          marginBottom: metrics.verticalScale(12, {
            maxFactor: 1.06,
            minFactor: 0.9,
          }),
        },
      ]}>
      <View
        style={[
          styles.textBlock,
          {
            marginRight: metrics.scale(12, {
              maxFactor: 1.06,
              minFactor: 0.9,
            }),
          },
        ]}>
        <Text
          style={[
            styles.title,
            {
              fontSize: metrics.responsiveFont(18, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
            },
          ]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: metrics.responsiveFont(13, {
                  maxFactor: 1.06,
                  minFactor: 0.92,
                }),
                lineHeight: metrics.verticalScale(18, {
                  maxFactor: 1.06,
                  minFactor: 0.94,
                }),
                marginTop: metrics.verticalScale(4, {
                  maxFactor: 1.06,
                  minFactor: 0.9,
                }),
              },
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionLabel ? (
        <AppPressable
          onPress={onActionPress}
          style={[
            styles.actionButton,
            {
              borderRadius: metrics.scale(14, {
                maxFactor: 1.06,
                minFactor: 0.9,
              }),
              paddingHorizontal: metrics.scale(12, {
                maxFactor: 1.06,
                minFactor: 0.9,
              }),
              paddingVertical: metrics.verticalScale(10, {
                maxFactor: 1.06,
                minFactor: 0.9,
              }),
            },
          ]}>
          <Text
            style={[
              styles.actionText,
              {
                fontSize: metrics.responsiveFont(12, {
                  maxFactor: 1.06,
                  minFactor: 0.92,
                }),
              },
            ]}>
            {actionLabel}
          </Text>
        </AppPressable>
      ) : null}
    </View>
  );
};

export default AppSectionTitle;
