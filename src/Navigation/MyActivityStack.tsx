import React, {memo} from 'react';
import {createStackNavigator, CardStyleInterpolators} from '@react-navigation/stack';
import MainActivity from '../Components/MyActivity/MainActivity';
import OrderDetailScreen from '../Components/MyActivity/OrderDetailedScreen';

const Stack = createStackNavigator();

const MyActivityStack = memo(() => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        
        // ✅ Properly detach previous screens to prevent glitches
        detachPreviousScreen: true,
        
        // Enable smooth hardware-accelerated gestures
        gestureEnabled: false,
        // gestureDirection: 'horizontal',
        
        // Optimal transition timing - smooth without being too slow
        transitionSpec: {
          open: {
            animation: 'spring',
            config: {
              stiffness: 1000,
              damping: 500,
              mass: 3,
              overshootClamping: true,
              restDisplacementThreshold: 0.01,
              restSpeedThreshold: 0.01,
            },
          },
          close: {
            animation: 'spring',
            config: {
              stiffness: 1000,
              damping: 500,
              mass: 3,
              overshootClamping: true,
              restDisplacementThreshold: 0.01,
              restSpeedThreshold: 0.01,
            },
          },
        },
        
        // Consistent smooth slide animation
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        
        // ✅ Solid black background prevents white flashes
        cardStyle: {
          backgroundColor: '#000000',
          opacity: 1,
        },
        
        // Disable overlays that can cause glitches
        cardOverlayEnabled: false,
        cardShadowEnabled: false,
        
        // Standard card presentation
        presentation: 'card',
        
        // Ensure animations use native driver
        animationTypeForReplace: 'push',
      }}>
      <Stack.Screen 
        name="MainActivityScreen" 
        component={MainActivity}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetailScreen}
      />
    </Stack.Navigator>
  );
});

MyActivityStack.displayName = 'MyActivityStack';

export default MyActivityStack;
