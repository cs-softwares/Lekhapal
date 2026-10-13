import React from 'react';
import { RELEASE_FEATURES } from '../config/releaseFeatures';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import BiharBhumiOfficerScreen from '../screens/BiharBhumiOfficerScreen';
import MeasurementSavedRecordsScreen from '../screens/MeasurementSavedRecordsScreen';
import RecordWorkspaceScreen from '../screens/RecordWorkspaceScreen';
import SplashScreen from '../screens/SplashScreen';
import ToolDetailsScreen from '../screens/ToolDetailsScreen';
import UpBhulekhAssistantScreen from '../screens/UpBhulekhAssistantScreen';
import WebViewPortalScreen from '../screens/WebViewPortalScreen';
import BhulekhOptionsScreen from '../screens/BhulekhOptionsScreen';
import KhasraOptionsScreen from '../screens/KhasraOptionsScreen';
import KhasraSearchScreen from '../screens/KhasraSearchScreen';
import KhasraFeedingScreen from '../screens/KhasraFeedingScreen';
import MapExportScreen from '../screens/MapExportScreen';
import EchawadiScreen from '../screens/EchawadiScreen';
import DocumentAutomationScreen from '../screens/DocumentAutomationScreen';
import EroPdfScreen from '../screens/EroPdfScreen';
import OfficialWorkScreen from '../screens/OfficialWorkScreen';
import RevenueFeedingScreen from '../screens/RevenueFeedingScreen';
import KhatauniCopyScreen from '../screens/KhatauniCopyScreen';
import PlotSaleStatusScreen from '../screens/PlotSaleStatusScreen';
import PlotDisputeStatusScreen from '../screens/PlotDisputeStatusScreen';
import PremiumScreen from '../screens/PremiumScreen';
import { registerPremiumNavigation } from '../services/premiumAccess';
import { RootStackParamList } from '../types/navigation';
import StateSelectionScreen from '../screens/StateSelectionScreen';
import FieldDeskNavigator from './FieldDeskNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  React.useEffect(() => {
    registerPremiumNavigation(() => {
      if (RELEASE_FEATURES.premium && navigationRef.isReady())
        navigationRef.navigate('Premium');
    });
    return () => registerPremiumNavigation(null);
  }, [navigationRef]);
  const { colors, isDarkTheme } = useAppTheme();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        ...(isDarkTheme ? DarkTheme : DefaultTheme),
        colors: {
          ...(isDarkTheme ? DarkTheme.colors : DefaultTheme.colors),
          background: colors.background,
          border: colors.border,
          card: colors.surface,
          notification: colors.primary,
          primary: colors.primary,
          text: colors.text,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen component={SplashScreen} name="Splash" />
        {RELEASE_FEATURES.premium && (
          <Stack.Screen component={PremiumScreen} name="Premium" />
        )}
        <Stack.Screen component={LoginScreen} name="Login" />
        <Stack.Screen component={OtpScreen} name="Otp" />
        <Stack.Screen component={StateSelectionScreen} name="StateSelection" />
        <Stack.Screen component={FieldDeskNavigator} name="MainDrawer" />
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
          component={BhulekhOptionsScreen}
          name="BhulekhOptions"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen component={ToolDetailsScreen} name="ToolDetails" />
        <Stack.Screen
          component={KhasraOptionsScreen}
          name="KhasraOptions"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen
          component={KhasraSearchScreen}
          name="KhasraSearch"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen component={KhasraFeedingScreen} name="KhasraFeeding" />
        <Stack.Screen name="Echawadi" component={EchawadiScreen} />
        <Stack.Screen
          name="DocumentAutomation"
          component={DocumentAutomationScreen}
          getId={({ params }) => params.stateCode}
        />
        <Stack.Screen name="EroPdf" component={EroPdfScreen} />
        <Stack.Screen name="MapExport" component={MapExportScreen} />
        <Stack.Screen
          name="OfficialWork"
          component={OfficialWorkScreen}
          getId={({ params }) =>
            params.module +
            (params.workspaceState ? '-' + params.workspaceState : '')
          }
        />
        <Stack.Screen
          component={RevenueFeedingScreen}
          name="RevenueFeeding"
          getId={({ params }) => params.module}
        />
        <Stack.Screen
          component={KhatauniCopyScreen}
          name="KhatauniCopy"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen
          component={PlotSaleStatusScreen}
          name="PlotSaleStatus"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen
          component={PlotDisputeStatusScreen}
          name="PlotDisputeStatus"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
        <Stack.Screen
          component={WebViewPortalScreen}
          name="WebViewPortal"
          options={{ statusBarStyle: 'light', animation: 'none' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
