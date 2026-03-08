import { ChevronRight } from 'lucide-react-native';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

// Constants
const COLORS = {
  primary: '#FFD700',
  black: '#000',
  white: '#fff',
  gray: '#ccc',
  dark: '#1a1a1a',
  green: '#4ADE80',
  transparent: 'transparent',
};

const ANIMATION_CONFIG = {
  duration: 200,
  springConfig: { damping: 15, stiffness: 150 },
  resetDelay: 0,
};
// Optimized SwipeableBuyButton with Reanimated
export const SwipeableBuyButton = ({ text = 'Buy Now', onComplete = () => {} }) => {
  const translateX = useSharedValue(0);
  const [showCheckmark, setShowCheckmark] = useState(false);
  
  const dimensions = useMemo(() => {
    const buttonWidth = screenWidth - 50;
    const thumbSize = 150;
    const maxSwipeDistance = buttonWidth - thumbSize - 10;
    return { buttonWidth, thumbSize, maxSwipeDistance };
  }, []);

  const { buttonWidth, thumbSize, maxSwipeDistance } = dimensions;

  const resetButton = useCallback(() => {
    setShowCheckmark(false);
    translateX.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
  }, [translateX]);

  const completeSwipe = useCallback(() => {
    // Call onComplete immediately when swipe is detected
    onComplete();
    
    translateX.value = withSpring(maxSwipeDistance, {
      damping: 15,
      stiffness: 150,
    });
    
    // setTimeout(() => {
    //   setShowCheckmark(true);
      
    setTimeout(() => {
        resetButton();
      }, ANIMATION_CONFIG.resetDelay);
    // }, 150);
  }, [translateX, maxSwipeDistance, onComplete, resetButton]);

  const snapBack = useCallback(() => {
    translateX.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
  }, [translateX]);

  type GestureContext = {
    startX: number;
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    GestureContext
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newValue = context.startX + event.translationX;
      translateX.value = Math.max(0, Math.min(maxSwipeDistance, newValue));
    },
    onEnd: () => {
      if (translateX.value > maxSwipeDistance * 0.2) {
        runOnJS(completeSwipe)();
      } else {
        runOnJS(snapBack)();
      }
    },
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const textOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, maxSwipeDistance * 0.6],
      [1, 0.2],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const checkOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [maxSwipeDistance * 0.85, maxSwipeDistance],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const renderChevrons = useCallback(
    () => (
      <View style={buyButtonStyles.chevronsContainer}>
        <ChevronRight color={COLORS.gray} size={13} />
        <ChevronRight color={COLORS.gray} size={18} />
        <ChevronRight color={COLORS.gray} size={25} />
        <ChevronRight color={COLORS.gray} size={30} />
      </View>
    ),
    []
  );

  return (
    <View style={buyButtonStyles.container}>
      <View style={[buyButtonStyles.button, { width: buttonWidth }]}>
        {/* Background chevrons */}
        <Animated.View style={[buyButtonStyles.textContainer, textOpacityStyle]}>
          {renderChevrons()}
        </Animated.View>

        {/* Draggable thumb */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View
            style={[
              buyButtonStyles.thumb,
              {
                width: thumbSize,
              },
              thumbStyle,
            ]}
          >
            {/* Thumb text - always visible */}
            <Text style={buyButtonStyles.thumbText}>
              {text}
            </Text>
            
            {/* Checkmark overlay */}
            {/* {showCheckmark && (
              <Animated.View style={[buyButtonStyles.checkmark, checkOpacityStyle]}>
                <Icon name="check" size={24} color={COLORS.green} />
              </Animated.View>
            )} */}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

// Updated styles with fixes
const buyButtonStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 55,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 35,
    justifyContent: 'flex-end',
  },
  lockIcon: {
    position: 'absolute',
    right: 5,
    width: 45,
    height: 45,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  thumb: {
    position: 'absolute',
    left: 5,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    paddingHorizontal: 15,
  },
  thumbText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 25,
  },
});

// SwipeableBidButton with Reanimated
export const SwipeableBidButton = ({
  bidAmount = '₹ 250',
  onSwipeComplete = () => {},
  buttonWidth = 300,
  disabled = false,
}: {
  bidAmount?: string;
  onSwipeComplete?: () => void;
  buttonWidth?: number | string;
  disabled?: boolean;
}) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const successOpacity = useSharedValue(0);

  const actualButtonWidth = useMemo(() => {
    if (typeof buttonWidth === 'string' && buttonWidth.includes('%')) {
      return screenWidth - 30;
    }
    return Number(buttonWidth);
  }, [buttonWidth]);

  const maxSwipeDistance = useMemo(() => actualButtonWidth - 70, [actualButtonWidth]);

  const resetButton = useCallback(() => {
    setIsCompleted(false);
    translateX.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });
    successOpacity.value = withTiming(0, { duration: 300 });
  }, [translateX, opacity, successOpacity]);

  const completeSwipe = useCallback(() => {
    setIsCompleted(true);
    translateX.value = withTiming(maxSwipeDistance, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 });
    successOpacity.value = withTiming(1, { duration: 150 });
    
    setTimeout(() => {
      onSwipeComplete();
      setTimeout(resetButton, 1500);
    }, 150);
  }, [translateX, opacity, successOpacity, maxSwipeDistance, onSwipeComplete, resetButton]);

  const snapBack = useCallback(() => {
    translateX.value = withSpring(0, {
      damping: 10,
      stiffness: 120,
    });
    opacity.value = withTiming(1, { duration: 200 });
    successOpacity.value = withTiming(0, { duration: 200 });
  }, [translateX, opacity, successOpacity]);

  type BidGestureContext = {
    startX: number;
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    BidGestureContext
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const newValue = context.startX + event.translationX;
      translateX.value = Math.max(0, Math.min(maxSwipeDistance, newValue));
      
      const progress = Math.min(translateX.value / maxSwipeDistance, 1);
      opacity.value = 1 - progress * 0.8;
      
      if (progress > 0.7) {
        successOpacity.value = progress - 0.7;
      } else {
        successOpacity.value = 0;
      }
      // runOnJS(completeSwipe)()
    },
    onEnd: () => {
      const swipeProgress = translateX.value / maxSwipeDistance;
      if (swipeProgress > 0.4 && !disabled) {
        runOnJS(completeSwipe)();
        runOnJS(snapBack)();
      } else {
      }
    },
  });

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    const width = interpolate(
      translateX.value,
      [0, maxSwipeDistance],
      [0, actualButtonWidth],
      Extrapolate.CLAMP
    );
    return { width };
  });

  return (
    <View style={[bidButtonStyles.container, { width: actualButtonWidth }]}>
      <View style={[bidButtonStyles.track, { width: '100%' }]}>
        <Animated.View
          style={[
            bidButtonStyles.progressFill,
            progressStyle,
          ]}
        />
      </View>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        enabled={!disabled && !isCompleted}
      >
        <Animated.View
          style={[
            bidButtonStyles.slider,
            {
              backgroundColor: COLORS.primary,
            },
            sliderStyle,
          ]}
        >
          <View style={bidButtonStyles.sliderContent}>
            {/* {isCompleted ? ( */}
              {/* <Text style={bidButtonStyles.sliderSuccessText}>✓</Text> */}
            {/* ) : ( */}
              <Text style={bidButtonStyles.sliderText}>Bid {bidAmount} ❯❯</Text>
            {/* )} */}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export const StyledButton = ({ title, onSubmit }) => {
  const handlePress = useCallback(() => {
    onSubmit?.();
  }, [onSubmit]);

  return (
    <TouchableOpacity style={styledButtonStyles.outerShadow} onPress={handlePress}>
      <View style={styledButtonStyles.buttonContainer}>
        <LinearGradient
          colors={['rgba(247, 206, 69, 0.66)', 'rgba(247, 206, 69, 0.31)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styledButtonStyles.gradient}
        >
          <Text style={styledButtonStyles.buttonText}>{title}</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

// Bid button styles
const bidButtonStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  track: {
    height: 50,
    backgroundColor: COLORS.dark,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 30,
  },
  slider: {
    position: 'absolute',
    left: 5,
    top: 5,
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 2,
    zIndex: 2,
  },
  sliderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderText: {
    color: COLORS.dark,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sliderSuccessText: {
    color: COLORS.dark,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

const styledButtonStyles = StyleSheet.create({
  outerShadow: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    borderRadius: 12,
  },
  buttonContainer: {
    borderWidth: 2,
    borderColor: '#FFC100',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F7CE45',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SwipeableBuyButton;
