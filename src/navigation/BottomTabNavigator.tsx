import { typography } from '../theme/typography';
import WorkAdManager from '../components/ads/WorkAdManager';
import {
  cancelCompletedWorkAd,
  showCompletedWorkAd,
} from '../services/interstitialAds';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import CalculatorScreen from '../screens/CalculatorScreen';
import StateDashboardScreen from '../screens/StateDashboardScreen';
import StatePortalsScreen from '../screens/StatePortalsScreen';
import MeasurementScreen from '../screens/MeasurementScreen';
import { OfficerScreen } from '../screens/desk/OperationsScreens';

import { BottomTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabBarButton = ({
  accessibilityLabel,
  accessibilityState,
  children,
  onLayout,
  onLongPress,
  onPress,
  style,
}: BottomTabBarButtonProps) => (
  <TouchableOpacity
    activeOpacity={1}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    accessibilityState={accessibilityState}
    onLayout={onLayout}
    onLongPress={onLongPress ?? undefined}
    onPress={onPress}
    style={style}
  >
    {children}
  </TouchableOpacity>
);

const BottomTabNavigator = () => {
  const { strings } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        scene: {
          backgroundColor: colors.background,
        },
        tabBar: {
          backgroundColor:
            colors.surface === '#FFFFFF'
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(17,24,39,0.96)',
          borderTopColor:
            colors.surface === '#FFFFFF'
              ? 'rgba(226,232,240,0.72)'
              : 'rgba(71,85,105,0.38)',
        },
        tabLabel: typography.tab,
        tabIcon: {
          width: 46,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );
  const tabBarBottomPadding = Math.max(insets.bottom, 10);
  const tabBarTopPadding = 8;
  const tabBarHeight = 56 + tabBarTopPadding + tabBarBottomPadding;

  return (
    <>
      <WorkAdManager />
      <Tab.Navigator
        screenListeners={({ route }) => ({
          focus: () => {
            if (!['Home', 'Calculator', 'Measurement'].includes(route.name))
              cancelCompletedWorkAd();
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarButton: props => <TabBarButton {...props} />,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: [
            styles.tabBar,
            {
              height: tabBarHeight,
              paddingBottom: tabBarBottomPadding,
              paddingTop: tabBarTopPadding,
            },
          ],
          tabBarIcon: ({ focused, size }) => {
            let iconName = 'circle-outline';

            if (route.name === 'Home') {
              iconName = 'home-outline';
            } else if (route.name === 'Services') {
              iconName = 'view-grid-outline';
            } else if (route.name === 'Measurement') {
              iconName = 'ruler-square';
            } else if (route.name === 'Calculator') {
              iconName = 'calculator-variant-outline';
            } else if (route.name === 'Profile') {
              iconName = 'account-outline';
            }

            return (
              <View
                style={[
                  styles.tabIcon,
                  {
                    backgroundColor: focused
                      ? colors.primarySoft
                      : 'transparent',
                  },
                ]}
              >
                <Icon name={iconName} size={size} color={colors.primary} />
              </View>
            );
          },
        })}
      >
        <Tab.Screen
          component={StateDashboardScreen}
          name="Home"
          options={{ title: strings.dashboard }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              const state = navigation.getState();
              const from = state.routes[state.index]?.name;
              if (from === 'Calculator' || from === 'Measurement') {
                void showCompletedWorkAd(() => {
                  const current = navigation.getState();
                  return (
                    navigation.isFocused() &&
                    current.routes[current.index]?.name === 'Home'
                  );
                });
              } else {
                cancelCompletedWorkAd();
              }
            },
          })}
        />

        <Tab.Screen
          component={StatePortalsScreen}
          name="Services"
          options={{ title: strings.services }}
        />

        <Tab.Screen
          component={MeasurementScreen}
          name="Measurement"
          options={{ title: strings.measurement }}
        />

        <Tab.Screen
          component={CalculatorScreen}
          name="Calculator"
          options={{ title: strings.calculator }}
        />

        <Tab.Screen
          component={OfficerScreen}
          name="Profile"
          options={{ title: strings.profile }}
        />
      </Tab.Navigator>
    </>
  );
};

export default BottomTabNavigator;
