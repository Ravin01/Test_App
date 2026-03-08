import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import { AWS_CDN_URL } from '../../Utils/aws';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickChatBubbleProps {
  user: {
    _id: string;
    name: string;
    profileURL?: { key: string };
  };
  isVisible: boolean;
  onQuickMessage: (message: string) => void;
  onNavigateToChat: () => void;
  onClose: () => void;
}

/**
 * 🚀 INNOVATIVE QUICK CHAT BUBBLE
 * Out-of-the-box floating chat widget for favorite users
 * Features: Draggable, Quick messages, Smart positioning
 */
const QuickChatBubble: React.FC<QuickChatBubbleProps> = ({
  user,
  isVisible,
  onQuickMessage,
  onNavigateToChat,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickMessages] = useState([
    '👋 Hey!',
    '🔥 What\'s up?',
    '💰 Check this out',
    '🚀 Let\'s chat',
    '😊 How are you?',
    '⚡ Quick question',
  ]);

  // Animated values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(SCREEN_WIDTH - 80);
  const translateY = useSharedValue(SCREEN_HEIGHT / 2);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Animation refs
  const pulseAnimation = useRef<NodeJS.Timeout>();

  // Pan gesture for dragging
  const panGestureRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Start drag - stop pulsing
        if (pulseAnimation.current) {
          clearInterval(pulseAnimation.current);
        }
        rotation.value = withSpring(5);
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.value = Math.max(10, Math.min(SCREEN_WIDTH - 70, translateX.value + gestureState.dx));
        translateY.value = Math.max(100, Math.min(SCREEN_HEIGHT - 150, translateY.value + gestureState.dy));
      },
      onPanResponderRelease: () => {
        // Snap to edges
        const snapToRight = translateX.value > SCREEN_WIDTH / 2;
        translateX.value = withSpring(snapToRight ? SCREEN_WIDTH - 80 : 20);
        rotation.value = withSpring(0);
        
        // Resume pulsing
        startPulsing();
      },
    })
  ).current;

  // Start pulsing animation
  const startPulsing = () => {
    pulseAnimation.current = setInterval(() => {
      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 600 }),
        withTiming(1, { duration: 600 })
      );
    }, 3000);
  };

  // Show/hide animations
  useEffect(() => {
    if (isVisible) {
      // Entrance animation
      scale.value = withSpring(1, { damping: 15 });
      opacity.value = withTiming(1, { duration: 300 });
      
      // Start pulsing after entrance
      setTimeout(startPulsing, 1000);
    } else {
      // Exit animation
      scale.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
      
      // Clear pulsing
      if (pulseAnimation.current) {
        clearInterval(pulseAnimation.current);
      }
    }

    return () => {
      if (pulseAnimation.current) {
        clearInterval(pulseAnimation.current);
      }
    };
  }, [isVisible]);

  // Animated styles
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * pulseScale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isExpanded ? withSpring(1) : withSpring(0) },
    ],
    opacity: isExpanded ? withTiming(1) : withTiming(0),
  }));

  if (!isVisible) return null;

  return (
    <>
      {/* Main Bubble */}
      <Reanimated.View 
        style={[styles.bubble, bubbleStyle]}
        {...panGestureRef.panHandlers}
      >
        <TouchableOpacity
          style={styles.bubbleContent}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.8}
        >
          {/* User Avatar */}
          <View style={styles.avatarContainer}>
            {user.profileURL?.key ? (
              <FastImage
                source={{ uri: `${AWS_CDN_URL}${user.profileURL.key}` }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.name?.substring(0, 2)?.toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
          </View>

          {/* Quick action indicator */}
          <View style={styles.actionIndicator}>
            <Icon 
              name={isExpanded ? "x" : "message-circle"} 
              size={12} 
              color="#000" 
            />
          </View>
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Icon name="x" size={10} color="#666" />
        </TouchableOpacity>
      </Reanimated.View>

      {/* Expanded Quick Messages */}
      {isExpanded && (
        <Reanimated.View style={[styles.expandedMenu, expandedStyle]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Quick Chat with {user.name}</Text>
            <TouchableOpacity onPress={onNavigateToChat}>
              <Icon name="external-link" size={16} color="#F7CE45" />
            </TouchableOpacity>
          </View>

          <View style={styles.quickMessagesGrid}>
            {quickMessages.map((message, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickMessageButton}
                onPress={() => {
                  onQuickMessage(message);
                  setIsExpanded(false);
                }}
              >
                <Text style={styles.quickMessageText}>{message}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.fullChatButton}
            onPress={() => {
              onNavigateToChat();
              setIsExpanded(false);
            }}
          >
            <Icon name="message-square" size={16} color="#000" />
            <Text style={styles.fullChatText}>Open Full Chat</Text>
          </TouchableOpacity>
        </Reanimated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  bubbleContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7CE45',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  actionIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  closeButton: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedMenu: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 100,
    left: 20,
    right: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 999,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  quickMessagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  quickMessageButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F7CE45',
  },
  quickMessageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  fullChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE45',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  fullChatText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default QuickChatBubble;