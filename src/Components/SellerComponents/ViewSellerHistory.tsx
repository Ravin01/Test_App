import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Header from './Header';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import  { useEffect, useRef } from 'react';
import {  
  Animated, 
  Dimensions,
  Easing
} from 'react-native';

const { width } = Dimensions.get('window');
const CIRCLE_RADIUS = width * 0.35; // Radius of the circle
const ITEM_SIZE = 80; // Size of each menu item

const CircularMenu = () => {
  // Animation values
  const centerScale = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const itemsOpacity = useRef(new Animated.Value(0)).current;
  const itemsScale = useRef(Array(8).fill(0).map(() => new Animated.Value(0))).current;
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.sequence([
      // First animate the center
      Animated.spring(centerScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      // Then animate the rings
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Then fade in the items
      Animated.parallel([
        Animated.timing(itemsOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.stagger(100, 
          itemsScale.map(anim => 
            Animated.spring(anim, {
              toValue: 1,
              tension: 40,
              friction: 7,
              useNativeDriver: true,
            })
          )
        )
      ])
    ]).start();
  }, []);

  // Menu items configuration
  const menuItems = [
    { icon: <FontAwesome5 name="gavel" size={20} color="#ffde59" />, label: 'BIDS', angle: 45 },
    { icon: <FontAwesome5 name="users" size={20} color="#ffde59" />, label: 'SOCIAL', angle: 90 },
    { icon: <FontAwesome5 name="shopping-cart" size={20} color="#ffde59" />, label: 'CART', angle: 135 },
    { icon: <MaterialIcons name="live-tv" size={20} color="#ffde59" />, label: 'LIVE NOW', angle: 180 },
    { icon: <FontAwesome5 name="heart" size={20} color="#ffde59" />, label: 'WISHLIST', angle: 225 },
    { icon: <FontAwesome5 name="shopping-bag" size={20} color="#ffde59" />, label: 'SHOP', angle: 270 },
    { icon: <FontAwesome5 name="book" size={20} color="#ffde59" />, label: 'STORIES', angle: 315 },
    { icon: <MaterialIcons name="event" size={20} color="#ffde59" />, label: 'LIVE SOON', angle: 0 },
  ];

  // Rotate value for the circular rings
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  // Second rotation for the inner ring (counter-rotation)
  const counterRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Animated circles/rings */}
      <Animated.View style={[
        styles.circleRing, 
        { transform: [{ rotate }, { scale: rotateAnim }] }
      ]}>
        <Animated.View style={[
          styles.circleRing2, 
          { transform: [{ rotate: counterRotate }] }
        ]} />
      </Animated.View>
      <Animated.View style={[
        styles.circleRing, 
        { transform: [{ rotate }, { scale: rotateAnim }] }
      ]}>
        <Animated.View style={[
          styles.circleRing2, 
          { transform: [{ rotate: counterRotate }] }
        ]} />
      </Animated.View>

      <Animated.View style={[
        styles.circleRing, 
        { transform: [{ rotate }, { scale: rotateAnim }] }
      ]}>
        <Animated.View style={[
          styles.circleRing2, 
          { transform: [{ rotate: counterRotate }] }
        ]} />
      </Animated.View>


      {/* Center logo */}
      <Animated.View style={[
        styles.centerCircle,
        { transform: [{ scale: centerScale }] }
      ]}>
        <Text style={styles.centerText}>FLYKUP</Text>
      </Animated.View>

      {/* Menu items positioned in a circle */}
      {menuItems.map((item, index) => {
        // Calculate position based on angle
        const angle = (item.angle * Math.PI) / 180;
        const x = Math.cos(angle) * CIRCLE_RADIUS;
        const y = Math.sin(angle) * CIRCLE_RADIUS;

        return (
          <Animated.View
            key={index}
            style={[
              styles.menuItem,
              {
                transform: [
                  { translateX: x },
                  { translateY: y },
                  { scale: itemsScale[index] },
                ],
                opacity: itemsOpacity
              },
            ]}
          >
            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.iconContainer}>
                {item.icon}
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  circleRing: {
    width: CIRCLE_RADIUS * 2.4,
    height: CIRCLE_RADIUS * 2.4,
    borderRadius: CIRCLE_RADIUS * 1.2,
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 89, 0.2)',
    position: 'absolute',
    
  },
  circleRing2: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 222, 89, 0.2)',
    position: 'absolute',
    top: CIRCLE_RADIUS * 0.2,
    left: CIRCLE_RADIUS * 0.2,
  },
  centerCircle: {
    width: ITEM_SIZE * 1.5,
    height: ITEM_SIZE * 1.5,
    borderRadius: ITEM_SIZE * 0.75,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#ffde59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  centerText: {
    color: '#ffde59',
    fontSize: 22,
    fontWeight: 'bold',
  },
  menuItem: {
    position: 'absolute',
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    alignItems: 'center',
  },
  iconContainer: {
    width: ITEM_SIZE * 0.7,
    height: ITEM_SIZE * 0.7,
    borderRadius: ITEM_SIZE * 0.35,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffde59',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  menuText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 5,
    fontWeight: 'bold',
  },
});

export default CircularMenu;