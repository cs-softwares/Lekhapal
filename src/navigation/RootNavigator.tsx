import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAppTheme} from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import BiharBhumiOfficerScreen from '../screens/BiharBhumiOfficerScreen';
import MeasurementSavedRecordsScreen from '../screens/MeasurementSavedRecordsScreen';
import RecordWorkspaceScreen from '../screens/RecordWorkspaceScreen';
import SplashScreen from '../screens/SplashScreen';
import ToolDetailsScreen from '../screens/ToolDetailsScreen';
import UpBhulekhAssistantScreen from '../screens/UpBhulekhAssistantScreen';
import WebViewPortalScreen from '../screens/WebViewPortalScreen';
import {RootStackParamList} from '../types/navigation';
import DrawerNavigator from './DrawerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const {colors, isDarkTheme} = useAppTheme();

  return (
    <NavigationContainer
      theme={{
        ...(isDarkTheme ? DarkTheme : DefaultTheme),
        colors: {
          ...(isDarkTheme
            ? DarkTheme.colors
            : DefaultTheme.colors),
          background: colors.background,
          border: colors.border,
          card: colors.surface,
          notification: colors.primary,
          primary: colors.primary,
          text: colors.text,
        },
      }}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{headerShown: false}}>
        <Stack.Screen
          component={SplashScreen}
          name="Splash"
        />
        <Stack.Screen
          component={LoginScreen}
          name="Login"
        />
        <Stack.Screen
          component={OtpScreen}
          name="Otp"
        />
        <Stack.Screen
          component={DrawerNavigator}
          name="MainDrawer"
        />
        <Stack.Screen
          component={BiharBhumiOfficerScreen}
          name="BiharBhumiOfficer"
        />
        <Stack.Screen
          component={UpBhulekhAssistantScreen}
          name="UpBhulekhAssistant"
        />
        <Stack.Screen
          component={MeasurementSavedRecordsScreen}
          name="MeasurementSavedRecords"
        />
        <Stack.Screen
          component={RecordWorkspaceScreen}
          name="RecordWorkspace"
        />
        <Stack.Screen
          component={ToolDetailsScreen}
          name="ToolDetails"
        />
        <Stack.Screen
          component={WebViewPortalScreen}
          name="WebViewPortal"
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
