import { useState, useEffect, useRef } from 'react';
import { Keyboard, Platform, KeyboardEvent, Animated, Easing } from 'react-native';

export const useKeyboard = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Animated value for smooth transitions across all Android versions
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardDidShowListener = Keyboard.addListener(
      showEvent,
      (e: KeyboardEvent) => {
        const height = e.endCoordinates.height;
        setKeyboardVisible(true);
        setKeyboardHeight(height);
        
        // Smooth animation for keyboard appearance
        Animated.timing(keyboardHeightAnimated, {
          toValue: height,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      hideEvent,
      (e?: KeyboardEvent) => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        
        // Smooth animation for keyboard hiding
        Animated.timing(keyboardHeightAnimated, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? (e?.duration || 250) : 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardHeightAnimated]);

  // Return animated translateY value (negative to move up)
  const translateY = keyboardHeightAnimated.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  return { 
    isKeyboardVisible, 
    keyboardHeight,
    keyboardHeightAnimated,
    translateY,
  };
};