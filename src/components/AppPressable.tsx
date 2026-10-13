import React from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
type AppPressableProps = PressableProps & {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  pressedOpacity?: number;
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};
const AppPressable = ({
  children,
  containerStyle,
  pressedOpacity = 0.82,
  style,
  ...rest
}: AppPressableProps) => (
  <Pressable
    {...rest}
    style={({ pressed }) => [
      containerStyle,
      pressed && { opacity: pressedOpacity },
    ]}
  >
    {state => (
      <View style={typeof style === 'function' ? style(state) : style}>
        {children}
      </View>
    )}
  </Pressable>
);
export default AppPressable;
