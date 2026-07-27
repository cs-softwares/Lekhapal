import React from 'react';
import {
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  Edge,
  SafeAreaView,
} from 'react-native-safe-area-context';

import {useAppTheme} from '../context/ThemeContext';

type AppScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const AppScreen = ({
  children,
  scroll = true,
  style,
  contentContainerStyle,
}: AppScreenProps) => {
  const {colors} = useAppTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          backgroundColor: colors.background,
          flex: 1,
        },
        scrollContent: {
          paddingBottom: 28,
        },
        fill: {
          flex: 1,
        },
      }),
    [colors],
  );
  const safeAreaEdges: readonly Edge[] =
    Platform.OS === 'ios' ? ['top'] : [];

  if (scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[styles.safeArea, style]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.safeArea, style]}>
      <View style={[styles.fill, contentContainerStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

export default AppScreen;
