import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '../context/ThemeContext';
import { useResponsiveMetrics } from '../hooks/useResponsiveMetrics';
import AppPressable from './AppPressable';

type Props = {
  title: string;
  subtitle?: string;
  leftIconName?: string;
  leftLabel?: string;
  onLeftPress?: () => void;
  rightIcons?: Array<{
    iconName: string;
    onPress: () => void;
    accessibilityLabel?: string;
  }>;
  rightIconName?: string;
  rightLabel?: string;
  rightAccessibilityLabel?: string;
  onRightPress?: () => void;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onSearchChangeText?: (value: string) => void;
  onSearchClose?: () => void;
  searchActive?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
};

const AppHeader = ({
  title,
  subtitle,
  leftIconName,
  leftLabel,
  onLeftPress,
  rightIcons,
  rightIconName,
  rightLabel,
  rightAccessibilityLabel,
  onRightPress,
  onMenuPress,
  onSearchPress,
  onSearchChangeText,
  onSearchClose,
  searchActive = false,
  searchPlaceholder,
  searchValue = '',
}: Props) => {
  const metrics = useResponsiveMetrics();
  const { colors, isDarkTheme } = useAppTheme();
  const headerBackgroundColor = isDarkTheme ? '#1E3A8A' : colors.primary;
  const controlBackgroundColor = isDarkTheme
    ? 'rgba(191,219,254,0.12)'
    : 'rgba(255,255,255,0.15)';
  const controlBorderColor = isDarkTheme
    ? 'rgba(191,219,254,0.18)'
    : 'transparent';
  const titleColor = isDarkTheme ? '#F8FAFC' : '#FFFFFF';
  const iconColor = isDarkTheme ? '#F8FAFC' : '#FFFFFF';
  const secondaryTextColor = isDarkTheme
    ? 'rgba(226,232,240,0.82)'
    : 'rgba(255,255,255,0.8)';
  const searchPlaceholderColor = isDarkTheme
    ? 'rgba(226,232,240,0.64)'
    : 'rgba(255,255,255,0.72)';
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          backgroundColor: headerBackgroundColor,
          borderBottomColor: isDarkTheme
            ? 'rgba(191,219,254,0.18)'
            : 'transparent',
          borderBottomWidth: isDarkTheme ? 1 : 0,
          elevation: isDarkTheme ? 3 : 4,
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        iconButton: {
          alignItems: 'center',
          backgroundColor: controlBackgroundColor,
          borderColor: controlBorderColor,
          borderWidth: isDarkTheme ? 1 : 0,
          justifyContent: 'center',
        },
        labelButton: {
          alignItems: 'center',
          backgroundColor: controlBackgroundColor,
          borderColor: controlBorderColor,
          borderWidth: isDarkTheme ? 1 : 0,
          justifyContent: 'center',
        },
        labelButtonText: {
          color: titleColor,
          fontSize: 13,
          fontWeight: '700',
        },
        rightGroup: {
          flexDirection: 'row',
        },
        textBlock: {
          flex: 1,
        },
        searchField: {
          alignItems: 'center',
          backgroundColor: controlBackgroundColor,
          borderColor: controlBorderColor,
          borderWidth: isDarkTheme ? 1 : 0,
          flex: 1,
          flexDirection: 'row',
        },
        searchInput: {
          color: titleColor,
          flex: 1,
          paddingVertical: 0,
        },
        title: {
          color: titleColor,
          fontWeight: '700',
          textAlign: 'center',
        },
        subtitle: {
          color: secondaryTextColor,
          textAlign: 'center',
        },
        placeholder: {},
      }),
    [
      controlBackgroundColor,
      controlBorderColor,
      headerBackgroundColor,
      isDarkTheme,
      secondaryTextColor,
      titleColor,
    ],
  );
  const leftAction = onMenuPress ?? onLeftPress;
  const rightAction = onSearchPress ?? onRightPress;
  const headerTopPadding =
    Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 0) +
        metrics.verticalScale(4, {
          maxFactor: 1.05,
          minFactor: 1,
        })
      : metrics.verticalScale(12);
  const headerHorizontalPadding = metrics.contentPadding;
  const headerBottomPadding = metrics.verticalScale(12, {
    maxFactor: 1.08,
    minFactor: 0.94,
  });
  const iconButtonSize = metrics.scale(42, {
    maxFactor: 1.08,
    minFactor: 0.88,
  });
  const iconButtonRadius = metrics.scale(12, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const labelButtonMinWidth = metrics.scale(64, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const titleFontSize = metrics.responsiveFont(20, {
    maxFactor: 1.08,
    minFactor: 0.88,
  });
  const subtitleFontSize = metrics.responsiveFont(12, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const searchFieldHeight = metrics.verticalScale(46, {
    maxFactor: 1.1,
    minFactor: 0.9,
  });
  const searchFieldRadius = metrics.scale(16, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const searchFieldPadding = metrics.scale(14, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const headerGap = metrics.scale(8, {
    maxFactor: 1.08,
    minFactor: 0.9,
  });
  const titleMargin = metrics.scale(12, {
    maxFactor: 1.08,
    minFactor: 0.86,
  });
  const iconActions = [
    ...(rightIcons ?? []),
    ...(!searchActive && onSearchPress
      ? [
          {
            iconName: 'magnify',
            onPress: onSearchPress,
            accessibilityLabel: 'Search',
          },
        ]
      : !searchActive && !onSearchPress && onRightPress && !rightLabel
      ? [
          {
            iconName: rightIconName ?? 'magnify',
            onPress: onRightPress,
            accessibilityLabel: rightAccessibilityLabel,
          },
        ]
      : []),
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: headerBottomPadding,
          paddingHorizontal: headerHorizontalPadding,
          paddingTop: headerTopPadding,
        },
      ]}
    >
      {leftLabel ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={onMenuPress ? 'Open menu' : leftLabel || 'Back'}
          onPress={leftAction}
          style={[
            styles.labelButton,
            {
              borderRadius: iconButtonRadius,
              height: iconButtonSize,
              minWidth: labelButtonMinWidth,
              paddingHorizontal: metrics.scale(12),
            },
          ]}
        >
          <Text style={styles.labelButtonText}>{leftLabel}</Text>
        </AppPressable>
      ) : (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={onMenuPress ? 'Open menu' : leftLabel || 'Back'}
          onPress={leftAction}
          style={[
            styles.iconButton,
            {
              borderRadius: iconButtonRadius,
              height: iconButtonSize,
              width: iconButtonSize,
            },
          ]}
        >
          <Icon
            name={leftIconName ?? 'menu'}
            size={metrics.scale(26, {
              maxFactor: 1.06,
              minFactor: 0.9,
            })}
            color={iconColor}
          />
        </AppPressable>
      )}

      {searchActive && onSearchChangeText ? (
        <View
          style={[
            styles.searchField,
            {
              borderRadius: searchFieldRadius,
              height: searchFieldHeight,
              marginHorizontal: titleMargin,
              paddingHorizontal: searchFieldPadding,
            },
          ]}
        >
          <Icon
            color={secondaryTextColor}
            name="magnify"
            size={metrics.scale(20, {
              maxFactor: 1.06,
              minFactor: 0.9,
            })}
          />
          <TextInput
            autoFocus
            onChangeText={onSearchChangeText}
            placeholder={searchPlaceholder}
            placeholderTextColor={searchPlaceholderColor}
            selectionColor={colors.white}
            style={[
              styles.searchInput,
              {
                fontSize: metrics.responsiveFont(15),
                marginLeft: metrics.scale(10),
              },
            ]}
            value={searchValue}
          />
        </View>
      ) : (
        <View style={[styles.textBlock, { marginHorizontal: titleMargin }]}>
          <Text
            numberOfLines={1}
            style={[styles.title, { fontSize: titleFontSize }]}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[
                styles.subtitle,
                {
                  fontSize: subtitleFontSize,
                  marginTop: metrics.verticalScale(2, {
                    maxFactor: 1.08,
                    minFactor: 0.9,
                  }),
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}

      {searchActive ? (
        <AppPressable
          onPress={onSearchClose}
          style={[
            styles.iconButton,
            {
              borderRadius: iconButtonRadius,
              height: iconButtonSize,
              width: iconButtonSize,
            },
          ]}
        >
          <Icon
            color={iconColor}
            name="close"
            size={metrics.scale(24, {
              maxFactor: 1.06,
              minFactor: 0.9,
            })}
          />
        </AppPressable>
      ) : rightLabel ? (
        <AppPressable
          onPress={rightAction}
          style={[
            styles.labelButton,
            {
              borderRadius: iconButtonRadius,
              height: iconButtonSize,
              minWidth: labelButtonMinWidth,
              paddingHorizontal: metrics.scale(12),
            },
          ]}
        >
          <Text style={styles.labelButtonText}>{rightLabel}</Text>
        </AppPressable>
      ) : iconActions.length ? (
        <View style={[styles.rightGroup, { gap: headerGap }]}>
          {iconActions.map((action, index) => (
            <AppPressable
              key={`${action.iconName}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel ?? action.iconName}
              onPress={action.onPress}
              style={[
                styles.iconButton,
                {
                  borderRadius: iconButtonRadius,
                  height: iconButtonSize,
                  width: iconButtonSize,
                },
              ]}
            >
              <Icon
                name={action.iconName}
                size={metrics.scale(24, {
                  maxFactor: 1.06,
                  minFactor: 0.9,
                })}
                color={iconColor}
              />
            </AppPressable>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              height: iconButtonSize,
              width: iconButtonSize,
            },
          ]}
        />
      )}
    </View>
  );
};

export default AppHeader;
