import React from 'react';
import {
  StatusBar,
  StyleSheet,
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {AuthSessionProvider} from './src/context/AuthSessionContext';
import {LanguageProvider} from './src/context/LanguageContext';
import {
  ThemeProvider,
  useAppTheme,
} from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppShell() {
  const {colors, isDarkTheme} = useAppTheme();
  const statusBarBackground = isDarkTheme
    ? '#1E3A8A'
    : colors.primary;

  return (
    <>
      <StatusBar
        backgroundColor={statusBarBackground}
        barStyle={
          isDarkTheme ? 'light-content' : 'light-content'
        }
      />
      <RootNavigator />
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
              <AppShell />
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
