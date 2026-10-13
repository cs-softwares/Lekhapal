import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useProfileMotion } from '../components/profile/ProfileUI';
import { useAppTheme } from '../context/ThemeContext';
import {
  createNavigatorFactory,
  DrawerRouter,
  useNavigationBuilder,
  DrawerNavigationState,
  DrawerRouterOptions,
  DrawerActionHelpers,
  ParamListBase,
} from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerNavigatorProps,
  DrawerNavigationOptions,
  DrawerNavigationEventMap,
  DrawerStatusContext,
  getDrawerStatusFromState,
} from '@react-navigation/drawer';
import { DeskDrawer } from './deskTypes';

function PlainDrawerNavigator({
  children,
  screenOptions,
  screenListeners,
  initialRouteName,
  backBehavior,
  drawerContent,
  id,
}: DrawerNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } =
    useNavigationBuilder<
      DrawerNavigationState<ParamListBase>,
      DrawerRouterOptions,
      DrawerActionHelpers<ParamListBase>,
      DrawerNavigationOptions,
      DrawerNavigationEventMap
    >(DrawerRouter, {
      children,
      screenOptions,
      screenListeners,
      initialRouteName,
      backBehavior,
      id,
    });
  const status = getDrawerStatusFromState(state);
  const focused = state.routes[state.index];
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const motion = useProfileMotion();
  const reveal = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const panelWidth = Math.min(350, width * 0.88);
  useEffect(() => {
    const open = status === 'open';
    if (open) setVisible(true);
    const animation = Animated.timing(reveal, {
      toValue: open ? 1 : 0,
      duration: motion ? (open ? 280 : 200) : 0,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [status, motion, reveal]);
  const visited = React.useRef(new Set<string>());
  visited.current.add(focused.key);
  const close = () => navigation.closeDrawer();
  return (
    <NavigationContent>
      <DrawerStatusContext.Provider value={status}>
        <View style={styles.fill}>
          {state.routes
            .filter(route => visited.current.has(route.key))
            .map(route => (
              <View
                key={route.key}
                style={[
                  styles.fill,
                  route.key !== focused.key && styles.hidden,
                ]}
              >
                {descriptors[route.key].render()}
              </View>
            ))}
        </View>
        <Modal
          transparent
          animationType="none"
          visible={visible}
          onRequestClose={close}
          statusBarTranslucent
        >
          <View style={styles.fill}>
            {visible && <StatusBar barStyle="light-content" />}
            <Animated.View style={[styles.overlay, { opacity: reveal }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close drawer backdrop"
                onPress={close}
                style={styles.backdrop}
              />
            </Animated.View>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.panel,
                descriptors[focused.key].options.drawerStyle,
                {
                  backgroundColor: colors.surface,
                  transform: [
                    {
                      translateX: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-panelWidth, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {drawerContent?.({ state, descriptors, navigation })}
            </Animated.View>
          </View>
        </Modal>
      </DrawerStatusContext.Provider>
    </NavigationContent>
  );
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  panel: { height: '100%', backgroundColor: '#FFFFFF', width: 304 },
});
export function createPlainDrawerNavigator() {
  return createNavigatorFactory(PlainDrawerNavigator)() as ReturnType<
    typeof createDrawerNavigator<DeskDrawer>
  >;
}
