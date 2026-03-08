import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

const LikeButton = ({ initialLikes = 0, onLike = () => {}, initialLiked, isShowUpcoming }) => {
  // ✅ Use props directly - no local state for likes/liked
  const liked = initialLiked;
  const likes = initialLikes;
  
  const [showLottie, setShowLottie] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const prevLikedRef = useRef(initialLiked);

  // ✅ Trigger animation when liked state changes from parent
  useEffect(() => {
    if (initialLiked && !prevLikedRef.current) {
      // User just liked - show animation
      setShowLottie(true);
      animationRef.current?.play();
      
      setTimeout(() => {
        setShowLottie(false);
      }, 3500);
    }
    prevLikedRef.current = initialLiked;
  }, [initialLiked]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const formatCount = useCallback((count) => {
    if (!count || count <= 0) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (count >= 100000) {
      return (count / 100000).toFixed(1).replace('.0', '') + 'L';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return count.toString();
  }, []);

  const handleLike = useCallback(() => {
    // ✅ Just trigger animation and call parent callback
    animateButton();
    onLike(); // Parent handles state update
    
    // Show animation on like (optimistic)
    if (!liked) {
      setShowLottie(true);
      animationRef.current?.play();

      setTimeout(() => {
        setShowLottie(false);
      }, 3500);
    }
  }, [liked, onLike]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
       {showLottie && (
            <LottieView
              ref={animationRef}
              source={require('../../assets/animations/Like.json')}
              style={styles.lottie}
              autoPlay={true}
              loop={true}
            />
         )} 
        <TouchableOpacity
          onPress={
            isShowUpcoming ? () => {} : handleLike}
          style={[styles.button, liked && styles.buttonLiked]}
          activeOpacity={0.8}
        >
         
          <Heart
            size={25}
            color={liked ? "red" : "white"}
            fill={liked ? "red" : "transparent"}
          />
          
        </TouchableOpacity>
      </Animated.View>
      {/* <Text style={styles.likesText}>{formatCount(likes)}</Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 5,
  },
  button: {
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonLiked: {},
  lottie: {
    position: 'absolute',
    width: 80,
    height: 250,
    top: -200,
    right: -20,
    zIndex: -1,
    pointerEvents: 'none',
  },
  likesText: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
  },
});

export default LikeButton;
