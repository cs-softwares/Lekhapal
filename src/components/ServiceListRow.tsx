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

type ServiceListRowProps = {
  accentColor: string;
  iconName: string;
  isLast?: boolean;
  onPress: () => void;
  subtitle: string;
  title: string;
};

const ServiceListRow = ({
  accentColor,
  iconName,
  isLast = false,
  onPress,
  subtitle,
  title,
}: ServiceListRowProps) => {
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
          borderWidth: 1.15,
          flexDirection: 'row',
          overflow: 'hidden',
        },
        subtitle: {
          color: colors.textMuted,
        },
        title: {
          color: colors.text,
          flex: 1,
          fontWeight: '800',
        },
        wrapper: {
          width: '100%',
        },
      }),
    [colors],
  );

  return (
    <AppPressable
      onPress={onPress}

      pressedOpacity={0.88}
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
            borderRadius: metrics.scale(18, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
            minHeight: metrics.verticalScale(86, {
              maxFactor: 1.08,
              minFactor: 0.92,
            }),
            paddingHorizontal: metrics.scale(14, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
            paddingVertical: metrics.verticalScale(12, {
              maxFactor: 1.08,
              minFactor: 0.9,
            }),
          },
        ]}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${accentColor}12`,
              borderColor: `${accentColor}28`,
              borderRadius: metrics.scale(14, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
              height: metrics.scale(44, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
              width: metrics.scale(44, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
            },
          ]}>
          <Icon
            color={accentColor}
            name={iconName}
            size={metrics.scale(21, {
              maxFactor: 1.08,
              minFactor: 0.9,
            })}
          />
        </View>

        <View
          style={[
            styles.copy,
            {
              marginLeft: metrics.scale(12, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
              marginRight: metrics.scale(10, {
                maxFactor: 1.08,
                minFactor: 0.9,
              }),
            },
          ]}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                fontSize: metrics.responsiveFont(15, {
                  maxFactor: 1.08,
                  minFactor: 0.92,
                }),
              },
            ]}>
            {title}
          </Text>

          <Text
            numberOfLines={2}
            style={[
              styles.subtitle,
              {
                fontSize: metrics.responsiveFont(12, {
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
        </View>

        <Icon
          color={accentColor}
          name="chevron-right"
          size={metrics.scale(22, {
            maxFactor: 1.08,
            minFactor: 0.9,
          })}
        />
      </View>
    </AppPressable>
  );
};

export default ServiceListRow;
