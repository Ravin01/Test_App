import { useRef, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

/**
 * Custom hook to handle hardware back button properly
 * Prevents double-back navigation issue
 * 
 * @example
 * // In your component:
 * import { useBackHandler } from '../../hooks/useBackHandler';
 * 
 * const MyScreen = () => {
 *   useBackHandler();
 *   // ... rest of your component
 * };
 */
export const useBackHandler = (customBackHandler?: () => boolean) => {
  const navigation = useNavigation();
  const isNavigatingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Reset navigation flag when screen gains focus
      isNavigatingRef.current = false;

      const onBackPress = () => {
        // If custom handler provided, use it
        if (customBackHandler) {
          return customBackHandler();
        }

        // Prevent multiple back presses
        if (isNavigatingRef.current) {
          return true;
        }
        
        isNavigatingRef.current = true;
        
        // Navigate back directly without delay
        navigation.goBack();
        
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        backHandler.remove();
        // Reset flag on cleanup to allow next navigation
        isNavigatingRef.current = false;
      };
    }, [navigation, customBackHandler]),
  );
};
