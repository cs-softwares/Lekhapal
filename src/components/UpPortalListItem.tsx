import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAppTheme} from '../context/ThemeContext';
import {useResponsiveMetrics} from '../hooks/useResponsiveMetrics';
import AppPressable from './AppPressable';

type Props = {
  accentColor: string;
  icon: string;
  isLast?: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
};

const UpPortalListItem = ({
  accentColor,
  icon,
  isLast = false,
  onPress,
  subtitle,
  title,
}: Props) => {
  const metrics = useResponsiveMetrics();
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        copy: {
          flex: 1,
        },
        iconWrap: {
          alignItems: 'center',
          borderWidth: 1,
          justifyContent: 'center',
        },
        row: {
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        subtitle: {
          color: colors.textMuted,
        },
        title: {
          color: colors.text,
          fontWeight: '800',
        },
        trailing: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        wrapper: {
          width: '100%',
        },
      }),
    [colors],
  );
  const rowRadius = metrics.scale(18, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const iconWrapSize = metrics.scale(46, {
    maxFactor: 1.08,
    minFactor: 0.88,
  });
  const horizontalGap = metrics.scale(14, {
    maxFactor: 1.08,
    minFactor: 0.86,
  });

  return (
    <AppPressable
      onPress={onPress}
      pressEffect="slide"
      pressedOpacity={0.8}
      style={[
        styles.wrapper,
        !isLast && {
          marginBottom: metrics.verticalScale(10, {
            maxFactor: 1.08,
            minFactor: 0.9,
          }),
        },
      ]}>
      <View
        style={[
          styles.row,
          {
            borderColor: `${accentColor}55`,
            borderRadius: rowRadius,
            borderWidth: 1.15,
            minHeight: metrics.verticalScale(92, {
              maxFactor: 1.12,
              minFactor: 0.88,
            }),
          },
        ]}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${accentColor}12`,
              borderColor: `${accentColor}2A`,
              borderRadius: metrics.scale(14, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
              height: iconWrapSize,
              marginHorizontal: horizontalGap,
              width: iconWrapSize,
            },
          ]}>
          <Icon
            color={accentColor}
            name={icon}
            size={metrics.scale(22, {
              maxFactor: 1.08,
              minFactor: 0.9,
            })}
          />
        </View>

        <View
          style={[
            styles.copy,
            {
              paddingRight: metrics.scale(12, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
            },
          ]}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                fontSize: metrics.responsiveFont(15, {
                  maxFactor: 1.08,
                  minFactor: 0.9,
                }),
                lineHeight: metrics.verticalScale(22, {
                  maxFactor: 1.08,
                  minFactor: 0.92,
                }),
              },
            ]}>
            {title}
          </Text>
          <Text
            numberOfLines={3}
            style={[
              styles.subtitle,
              {
                fontSize: metrics.responsiveFont(12, {
                  maxFactor: 1.06,
                  minFactor: 0.92,
                }),
                lineHeight: metrics.verticalScale(18, {
                  maxFactor: 1.08,
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
        </View>

        <View
          style={[
            styles.trailing,
            {
              paddingRight: metrics.scale(12, {
                maxFactor: 1.08,
                minFactor: 0.86,
              }),
            },
          ]}>
          <Icon
            color={accentColor}
            name="chevron-right"
            size={metrics.scale(22, {
              maxFactor: 1.08,
              minFactor: 0.9,
            })}
          />
        </View>
      </View>
    </AppPressable>
  );
};

export default UpPortalListItem;
