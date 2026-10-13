import React from 'react';
import { useWindowDimensions } from 'react-native';
import { DeskProvider } from '../context/DeskContext';
import { useSelectedState } from '../context/SelectedStateContext';
import { useAppTheme } from '../context/ThemeContext';
import { createPlainDrawerNavigator } from './PlainDrawerNavigator';
import GovernmentPortalsScreen from '../screens/desk/GovernmentPortalsScreen';
import { OfficerScreen } from '../screens/desk/OperationsScreens';
import {
  DeskAboutScreen,
  DeskHelpScreen,
  SavedWorkScreen,
  SimpleSettingsScreen,
} from '../screens/desk/AppUtilityScreens';
import FieldDrawerContent from '../components/drawer/FieldDrawerContent';
const Drawer = createPlainDrawerNavigator();
export default function FieldDeskNavigator() {
  const { width } = useWindowDimensions();
  const { stateCode } = useSelectedState();
  const { colors } = useAppTheme();
  return (
    <DeskProvider key={stateCode} stateCode={stateCode}>
      <Drawer.Navigator
        key={stateCode}
        initialRouteName="GovernmentPortals"
        drawerContent={FieldDrawerContent}
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: colors.surface,
            width: Math.min(350, width * 0.88),
          },
        }}
      >
        <Drawer.Screen
          name="GovernmentPortals"
          component={GovernmentPortalsScreen}
          options={{ title: 'Workspace' }}
        />
        <Drawer.Screen
          name="Officer"
          component={OfficerScreen}
          options={{ title: 'Profile' }}
        />
        <Drawer.Screen
          name="DeskSettings"
          component={SimpleSettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Drawer.Screen
          name="SavedWork"
          component={SavedWorkScreen}
          options={{ title: 'Saved work' }}
        />
        <Drawer.Screen
          name="DeskHelp"
          component={DeskHelpScreen}
          options={{ title: 'Help' }}
        />
        <Drawer.Screen
          name="DeskAbout"
          component={DeskAboutScreen}
          options={{ title: 'About' }}
        />
      </Drawer.Navigator>
    </DeskProvider>
  );
}
