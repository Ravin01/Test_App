import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Vibration,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Easing,
  DeviceEventEmitter,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';

// Sound utility functions
const playImpactSound = (soundFile: string) => {
  try {
    // Sound implementation would go here
    console.log('🔊 Playing impact sound:', soundFile);
  } catch (error) {
    console.warn('Sound playback failed:', error);
  }
};

const triggerImpactEffect = (impact: string, color: string) => {
  try {
    // Visual effect implementation would go here
    console.log('✨ Triggering impact effect:', impact, color);
    
    // Emit visual effect event
    DeviceEventEmitter.emit('impact-effect', {
      type: impact,
      color,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('Impact effect failed:', error);
  }
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🎨 FLYKUP CHAT INNOVATIONS
 * Unique UX features that set Flykup apart from WhatsApp, Telegram, etc.
 * Custom alternatives to traditional read receipts, typing indicators, and more
 */

// INNOVATION 1: Pulse Energy System (Alternative to Read Receipts)
interface PulseEnergyProps {
  messageId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isOwnMessage: boolean;
}

export const PulseEnergyIndicator: React.FC<PulseEnergyProps> = ({
  messageId,
  status,
  isOwnMessage,
}) => {
  const pulseScale = useSharedValue(0);
  const energyOpacity = useSharedValue(0);
  const energyColor = useSharedValue(0);
  
  useEffect(() => {
    switch (status) {
      case 'sending':
        // Gentle pulsing yellow energy
        pulseScale.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.8, { duration: 500 }),
          withTiming(1, { duration: 300 })
        );
        energyOpacity.value = withTiming(0.6);
        energyColor.value = withTiming(0); // Yellow
        break;
        
      case 'sent':
        // Quick blue flash
        energyOpacity.value = withSequence(
          withTiming(0.8, { duration: 200 }),
          withTiming(0.3, { duration: 300 })
        );
        energyColor.value = withTiming(0.33); // Blue
        break;
        
      case 'delivered':
        // Green sparkle effect
        pulseScale.value = withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(1, { duration: 150 })
        );
        energyOpacity.value = withTiming(0.5);
        energyColor.value = withTiming(0.66); // Green
        break;
        
      case 'read':
        // Golden energy burst
        pulseScale.value = withSequence(
          withTiming(1.3, { duration: 200 }),
          withTiming(1, { duration: 200 })
        );
        energyOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(500, withTiming(0.2, { duration: 300 }))
        );
        energyColor.value = withTiming(1); // Gold
        break;
    }
  }, [status]);
  
  const animatedStyle = useAnimatedStyle(() => {
    const hue = interpolate(energyColor.value, [0, 0.33, 0.66, 1], [60, 240, 120, 45]);
    
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: energyOpacity.value,
      backgroundColor: `hsl(${hue}, 70%, 60%)`,
    };
  });
  
  if (!isOwnMessage) return null;
  
  return (
    <Reanimated.View style={[styles.energyIndicator, animatedStyle]}>
      <View style={styles.energyCore} />
    </Reanimated.View>
  );
};

// INNOVATION 2: Emotion Wave Typing (Alternative to Typing Indicator)
interface EmotionWaveProps {
  isTyping: boolean;
  userName: string;
  emotion?: 'happy' | 'excited' | 'thinking' | 'confused' | 'neutral';
}

export const EmotionWaveTyping: React.FC<EmotionWaveProps> = ({
  isTyping,
  userName,
  emotion = 'neutral',
}) => {
  const waveHeight = useSharedValue(0);
  const waveFreq = useSharedValue(0);
  const emotionIntensity = useSharedValue(0);
  
  useEffect(() => {
    if (isTyping) {
      // Different wave patterns for different emotions
      const patterns = {
        happy: { height: 20, freq: 0.8, intensity: 0.9 },
        excited: { height: 30, freq: 1.2, intensity: 1.0 },
        thinking: { height: 10, freq: 0.4, intensity: 0.6 },
        confused: { height: 15, freq: 0.6, intensity: 0.7 },
        neutral: { height: 12, freq: 0.5, intensity: 0.5 },
      };
      
      const pattern = patterns[emotion];
      
      waveHeight.value = withTiming(pattern.height, { duration: 300 });
      waveFreq.value = withTiming(pattern.freq, { duration: 300 });
      emotionIntensity.value = withTiming(pattern.intensity, { duration: 300 });
    } else {
      waveHeight.value = withTiming(0, { duration: 500 });
      waveFreq.value = withTiming(0, { duration: 500 });
      emotionIntensity.value = withTiming(0, { duration: 500 });
    }
  }, [isTyping, emotion]);
  
  const waveStyle = useAnimatedStyle(() => ({
    height: waveHeight.value,
    opacity: emotionIntensity.value,
  }));
  
  if (!isTyping) return null;
  
  return (
    <View style={styles.emotionWaveContainer}>
      <Text style={styles.emotionText}>{userName} is feeling {emotion}...</Text>
      <Reanimated.View style={[styles.emotionWave, waveStyle]}>
        {/* Animated wave visualization would go here */}
        <LottieView
          source={require('../../assets/animations/Like.json')}
          autoPlay
          loop
          style={styles.waveLottie}
        />
      </Reanimated.View>
    </View>
  );
};

// INNOVATION 3: Impact Reactions (Alternative to Emoji Reactions)
interface ImpactReactionProps {
  messageId: string;
  onReact: (impact: ImpactType) => void;
  reactions?: ImpactReaction[];
}

type ImpactType = 'spark' | 'boom' | 'heart' | 'mind-blown' | 'fire' | 'ice';

interface ImpactReaction {
  type: ImpactType;
  userId: string;
  intensity: number;
  timestamp: number;
}

export const ImpactReactionPicker: React.FC<ImpactReactionProps> = ({
  messageId,
  onReact,
  reactions = [],
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  
  // Add safety checks
  const safeReactions = Array.isArray(reactions) ? reactions : [];
  const safeOnReact = typeof onReact === 'function' ? onReact : () => {};
  
  const impacts: { type: ImpactType; icon: string; color: string; sound: string }[] = [
    { type: 'spark', icon: '⚡', color: '#FFD700', sound: 'spark.mp3' },
    { type: 'boom', icon: '💥', color: '#FF4500', sound: 'boom.mp3' },
    { type: 'heart', icon: '💖', color: '#FF69B4', sound: 'heart.mp3' },
    { type: 'mind-blown', icon: '🤯', color: '#9370DB', sound: 'mind_blown.mp3' },
    { type: 'fire', icon: '🔥', color: '#DC143C', sound: 'fire.mp3' },
    { type: 'ice', icon: '❄️', color: '#00CED1', sound: 'ice.mp3' },
  ];
  
  const showPicker = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsVisible(true);
    
    scale.value = withSpring(1, { 
      damping: 15,
      stiffness: 300,
    });
    rotation.value = withSequence(
      withTiming(5, { duration: 100 }),
      withTiming(-5, { duration: 100 }),
      withTiming(0, { duration: 100 }),
      () => runOnJS(setIsAnimating)(false)
    );
  }, [isAnimating]);
  
  const hidePicker = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    scale.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setIsVisible)(false);
        runOnJS(setIsAnimating)(false);
      }
    });
  }, [isAnimating]);
  
  const handleImpact = useCallback((impact: ImpactType, color: string, sound: string) => {
    try {
      // Play impact sound safely
      playImpactSound(sound);
      
      // Trigger haptic feedback
      Vibration.vibrate([50, 100, 50]);
      
      // Create visual impact effect
      triggerImpactEffect(impact, color);
      
      // Send reaction safely
      safeOnReact(impact);
      
      // Hide picker
      hidePicker();
    } catch (error) {
      console.error('❌ Impact reaction failed:', error);
      hidePicker();
    }
  }, [safeOnReact, hidePicker]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  return (
    <View style={styles.impactContainer}>
      <TouchableOpacity onPress={showPicker} style={styles.impactTrigger}>
        <Icon name="zap" size={16} color="#666" />
      </TouchableOpacity>
      
      {isVisible && (
        <Reanimated.View style={[styles.impactPicker, animatedStyle]}>
          {impacts.map((impact) => (
            <TouchableOpacity
              key={impact.type}
              style={[styles.impactButton, { backgroundColor: impact.color }]}
              onPress={() => handleImpact(impact.type, impact.color, impact.sound)}
            >
              <Text style={styles.impactIcon}>{impact.icon}</Text>
            </TouchableOpacity>
          ))}
        </Reanimated.View>
      )}
      
      {/* Show active reactions */}
      {safeReactions.length > 0 && (
        <View style={styles.activeReactions}>
          {safeReactions.slice(0, 3).map((reaction, index) => {
            if (!reaction || typeof reaction.type !== 'string') return null;
            
            const impact = impacts.find(i => i.type === reaction.type);
            return impact ? (
              <Text key={`${reaction.type}-${index}-${reaction.timestamp || index}`} style={styles.activeReactionIcon}>
                {impact.icon}
              </Text>
            ) : null;
          })}
          {safeReactions.length > 3 && (
            <Text style={styles.reactionCount}>+{safeReactions.length - 3}</Text>
          )}
        </View>
      )}
    </View>
  );
};

// INNOVATION 4: Smart Notification Tones (Alternative to Mute/Unmute)
interface SmartTonesProps {
  chatId: string;
  currentTone: SmartTone;
  onToneChange: (tone: SmartTone) => void;
}

type SmartTone = 'adaptive' | 'focus' | 'gentle' | 'energetic' | 'business' | 'silent';

export const SmartTonePicker: React.FC<SmartTonesProps> = ({
  chatId,
  currentTone,
  onToneChange,
}) => {
  const tones: { type: SmartTone; icon: string; name: string; description: string }[] = [
    {
      type: 'adaptive',
      icon: '🧠',
      name: 'Smart Adaptive',
      description: 'Adapts to your usage',
    },
    {
      type: 'focus',
      icon: '🎯',
      name: 'Focus Mode',
      description: 'Only urgent messages',
    },
    {
      type: 'gentle',
      icon: '🌙',
      name: 'Gentle Waves',
      description: 'Soft, calming tones',
    },
    {
      type: 'energetic',
      icon: '⚡',
      name: 'Energy Boost',
      description: 'Uplifting sounds',
    },
    {
      type: 'business',
      icon: '💼',
      name: 'Professional',
      description: 'Discrete business tones',
    },
    {
      type: 'silent',
      icon: '🔕',
      name: 'Visual Only',
      description: 'Silent with visual cues',
    },
  ];
  
  return (
    <View style={styles.smartTonesContainer}>
      <Text style={styles.tonesTitle}>Smart Notification Experience</Text>
      {tones.map((tone) => (
        <TouchableOpacity
          key={tone.type}
          style={[
            styles.toneOption,
            currentTone === tone.type && styles.activeTone,
          ]}
          onPress={() => onToneChange(tone.type)}
        >
          <Text style={styles.toneIcon}>{tone.icon}</Text>
          <View style={styles.toneInfo}>
            <Text style={styles.toneName}>{tone.name}</Text>
            <Text style={styles.toneDescription}>{tone.description}</Text>
          </View>
          {currentTone === tone.type && (
            <Icon name="check-circle" size={20} color={colors.primaryButtonColor} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// INNOVATION 5: Gesture Magic (Alternative to Traditional Swipe Actions)
interface GestureMagicProps {
  messageId?: string;
  onGesture?: (gesture: string, data?: any) => void;
  children: React.ReactNode;
}

// Simplified version to prevent crashes
export const GestureMagicWrapper: React.FC<GestureMagicProps> = ({ children }) => {
  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
};

// INNOVATION 6: Vibe Check (Alternative to Online Status)
interface VibeCheckProps {
  userId: string;
  currentVibe: VibeType;
  lastSeen: number;
}

type VibeType = 'productive' | 'creative' | 'social' | 'focused' | 'chill' | 'busy' | 'offline';

export const VibeIndicator: React.FC<VibeCheckProps> = ({
  userId,
  currentVibe,
  lastSeen,
}) => {
  const vibeData = {
    productive: { color: '#32CD32', icon: '⚡', pattern: 'pulse' },
    creative: { color: '#FF69B4', icon: '🎨', pattern: 'sparkle' },
    social: { color: '#00BFFF', icon: '💬', pattern: 'wave' },
    focused: { color: '#9370DB', icon: '🎯', pattern: 'steady' },
    chill: { color: '#20B2AA', icon: '😌', pattern: 'breathe' },
    busy: { color: '#FF6347', icon: '⏰', pattern: 'rapid' },
    offline: { color: '#808080', icon: '💤', pattern: 'fade' },
  };
  
  const vibe = vibeData[currentVibe];
  const pulseAnimation = useSharedValue(0);
  
  useEffect(() => {
    // Different animation patterns for different vibes
    switch (vibe.pattern) {
      case 'pulse':
        pulseAnimation.value = withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        );
        break;
      case 'sparkle':
        pulseAnimation.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.7, { duration: 200 }),
          withTiming(1, { duration: 300 })
        );
        break;
      // Add more patterns...
    }
  }, [currentVibe]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnimation.value,
    backgroundColor: vibe.color,
  }));
  
  return (
    <View style={styles.vibeContainer}>
      <Reanimated.View style={[styles.vibeIndicator, animatedStyle]} />
      <Text style={styles.vibeIcon}>{vibe.icon}</Text>
      <Text style={styles.vibeStatus}>
        {currentVibe !== 'offline' ? currentVibe : formatLastSeen(lastSeen)}
      </Text>
    </View>
  );
};

// Helper functions
const playImpactSound1 = (soundFile: string) => {
  const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
    if (!error) {
      sound.play();
    }
  });
};

const playGestureSound = (gesture: GestureType) => {
  const soundMap = {
    reply: 'swipe_reply.mp3',
    react: 'swipe_react.mp3',
    forward: 'swipe_forward.mp3',
    save: 'swipe_save.mp3',
    translate: 'swipe_translate.mp3',
    shop: 'swipe_shop.mp3',
  };
  
  playImpactSound(soundMap[gesture]);
};

const getGestureIcon = (gesture: GestureType): string => {
  const iconMap = {
    reply: '↩️',
    react: '❤️',
    forward: '➡️',
    save: '⭐',
    translate: '🌐',
    shop: '🛒',
  };
  return iconMap[gesture];
};

const getGestureLabel = (gesture: GestureType): string => {
  const labelMap = {
    reply: 'Reply',
    react: 'React',
    forward: 'Forward',
    save: 'Save',
    translate: 'Translate',
    shop: 'Shop',
  };
  return labelMap[gesture];
};

const formatLastSeen = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const triggerImpactEffect1 = (impact: ImpactType, color: string) => {
  // Create particle effect based on impact type
  DeviceEventEmitter.emit('createImpactEffect', {
    type: impact,
    color,
    timestamp: Date.now(),
  });
};

const styles = StyleSheet.create({
  // Energy Indicator Styles
  energyIndicator: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  
  // Emotion Wave Styles
  emotionWaveContainer: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 15,
    margin: 5,
  },
  emotionText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  emotionWave: {
    height: 20,
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  waveLottie: {
    width: '100%',
    height: '100%',
  },
  
  // Impact Reaction Styles
  impactContainer: {
    position: 'relative',
  },
  impactTrigger: {
    padding: 5,
  },
  impactPicker: {
    position: 'absolute',
    bottom: 30,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  impactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  impactIcon: {
    fontSize: 20,
  },
  activeReactions: {
    flexDirection: 'row',
    marginTop: 5,
    alignItems: 'center',
  },
  activeReactionIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  
  // Smart Tones Styles
  smartTonesContainer: {
    padding: 20,
  },
  tonesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
  },
  toneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  activeTone: {
    backgroundColor: colors.primaryButtonColor + '20',
    borderWidth: 2,
    borderColor: colors.primaryButtonColor,
  },
  toneIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  toneInfo: {
    flex: 1,
  },
  toneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  toneDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  
  // Gesture Magic Styles
  gestureIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  gestureIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  gestureLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Vibe Indicator Styles
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vibeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  vibeIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  vibeStatus: {
    fontSize: 12,
    color: '#666',
  },
});

export {
  PulseEnergyIndicator,
  EmotionWaveTyping,
  ImpactReactionPicker,
  SmartTonePicker,
  GestureMagicWrapper,
  VibeIndicator,
};