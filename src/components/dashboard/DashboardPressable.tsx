import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

export default function DashboardPressable({
  children,
  label,
  onPress,
  motion,
  style,
  containerStyle,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  motion: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!motion) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [motion, scale]);
  const feedback = (pressed: boolean) => {
    Animated.timing(scale, {
      toValue: pressed && motion ? 0.975 : 1,
      duration: motion ? (pressed ? 100 : 180) : 0,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => feedback(true)}
        onPressOut={() => feedback(false)}
        style={({ pressed }) => [style, { opacity: pressed ? 0.88 : 1 }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
