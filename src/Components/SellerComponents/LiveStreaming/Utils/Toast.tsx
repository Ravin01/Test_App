import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { height } = Dimensions.get('window');

export const Toast = ({ message }) => {
  const translateY = useRef(new Animated.Value(height)).current; // Start from bottom of screen

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: height / 5 - 100, // Move to mid-top area
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000), // Stay for 1 second
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // if (onDone) onDone(); // Remove from parent
    });
  }, [translateY]);

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  toast: {
    position: 'absolute',
    left: 15,
    right: 15,
    top:0,
    padding: 15,
    backgroundColor: '#0000009E',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    color: '#fff',
    fontWeight:'600',
    fontSize: 16,
  },
});

