import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
}

export function AppPressable({ style, activeOpacity = 0.7, ...props }: AppPressableProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        style,
        { opacity: pressed ? activeOpacity : 1 }
      ]}
      {...props}
    />
  );
}
