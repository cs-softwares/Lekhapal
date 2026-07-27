import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAppTheme} from '../context/ThemeContext';
import {useLanguage} from '../context/LanguageContext';
import CalculatorScreen from '../screens/CalculatorScreen';
import HomeScreen from '../screens/HomeScreen';
import MeasurementScreen from '../screens/MeasurementScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ToolsScreen from '../screens/ToolsScreen';
import {BottomTabParamList} from '../types/navigation';

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
    style={style}>
    {children}
  </TouchableOpacity>
);

const BottomTabNavigator = () => {
  const {strings} = useLanguage();
  const {colors} = useAppTheme();
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
        tabLabel: {
          fontSize: 11,
          fontWeight: '700',
        },
      }),
    [colors],
  );
  const tabBarBottomPadding = Math.max(insets.bottom, 10);
  const tabBarTopPadding = 8;
  const tabBarHeight = 56 + tabBarTopPadding + tabBarBottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: colors.success,
        tabBarInactiveTintColor: colors.textSoft,
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
        tabBarIcon: ({color, size}) => {
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

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        component={HomeScreen}
        name="Home"
        options={{title: strings.dashboard}}
      />

      <Tab.Screen
        component={ToolsScreen}
        name="Services"
        options={{title: strings.services}}
      />

      <Tab.Screen
        component={MeasurementScreen}
        name="Measurement"
        options={{title: strings.measurement}}
      />

      <Tab.Screen
        component={CalculatorScreen}
        name="Calculator"
        options={{title: strings.calculator}}
      />

      <Tab.Screen
        component={ProfileScreen}
        name="Profile"
        options={{title: strings.profile}}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
