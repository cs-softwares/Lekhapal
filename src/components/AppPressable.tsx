import React, {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';

type PressEffect = 'none' | 'scale' | 'slide' | 'tilt';

type AppPressableProps = PressableProps & {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  pressEffect?: PressEffect;
  pressedOpacity?: number;
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

const AppPressable = ({
  children,
  containerStyle,
  onPressIn,
  onPressOut,
  pressEffect = 'scale',
  pressedOpacity = 0.82,
  style,
  ...rest
}: AppPressableProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressAnimation = useRef(new Animated.Value(0)).current;

  const resolvedStyle = useMemo(
    () =>
      typeof style === 'function'
        ? style({pressed: isPressed})
        : style,
    [isPressed, style],
  );

  const animatedStyle = useMemo(() => {
    if (pressEffect === 'none') {
      return undefined;
    }

    if (pressEffect === 'slide') {
      return {
        transform: [
          {
            translateX: pressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 6],
            }),
          },
          {
            scale: pressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.985],
            }),
          },
        ],
      };
    }

    if (pressEffect === 'tilt') {
      return {
        transform: [
          {
            translateX: pressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 5],
            }),
          },
          {
            rotate: pressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '1.6deg'],
            }),
          },
          {
            scale: pressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.985],
            }),
          },
        ],
      };
    }

    return {
      transform: [
        {
          scale: pressAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.985],
          }),
        },
        {
          translateY: pressAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2],
          }),
        },
      ],
    };
  }, [pressAnimation, pressEffect]);

  const animateTo = (toValue: number) => {
    Animated.spring(pressAnimation, {
      bounciness: 0,
      speed: 22,
      toValue,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      onPressIn={event => {
        setIsPressed(true);
        animateTo(1);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setIsPressed(false);
        animateTo(0);
      onPressOut?.(event);
      }}
      style={state => [
        containerStyle,
        state.pressed && {
          opacity: pressedOpacity,
        },
      ]}>
      <Animated.View style={[resolvedStyle, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default AppPressable;
