import PasswordRecoveryDialog from './src/components/auth/PasswordRecoveryDialog';
import ReportComposer from './src/components/reports/ReportComposer';
import AppUpdatePrompt from './src/components/updates/AppUpdatePrompt';
import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthSessionProvider } from './src/context/AuthSessionContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SelectedStateProvider } from './src/context/SelectedStateContext';
import { PremiumProvider } from './src/context/PremiumContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppShell() {
  return (
    <>
      <StatusBar backgroundColor="#F8FAFC" barStyle="dark-content" />
      <RootNavigator />
      <ReportComposer />
      <PasswordRecoveryDialog />
      <AppUpdatePrompt />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthSessionProvider>
              <PremiumProvider>
              <SelectedStateProvider>
                <AppShell />
              </SelectedStateProvider>
            </PremiumProvider>
            </AuthSessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
