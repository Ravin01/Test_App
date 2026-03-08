import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Clock, Trophy, Sparkles, X } from 'lucide-react-native';
import { AWS_CDN_URL } from '../../../../Config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Participant {
  userId?: string;
  _id?: string;
  userName?: string;
  name?: string;
  displayName?: string;
  profileURL?: {
    key: string;
  };
}

interface RollingEffectModalProps {
  isVisible: boolean;
  countdown: number;
  participants: Participant[];
  productTitle?: string;
  productImage?: string;
  onComplete?: () => void;
}

// Scrolling Participants Component
const ScrollingApplicants = ({ participants }: { participants: Participant[] }) => {
  const [scrollingNames, setScrollingNames] = useState<Array<{ id: string; name: string; key: string }>>([]);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!participants || participants.length === 0) return;

    const names = participants.map(applicant => {
      const displayName = applicant.displayName ||
                         applicant.name ||
                         applicant.userName ||
                         'Unknown User';
      return displayName;
    });

    const repeatedNames: Array<{ id: string; name: string; key: string }> = [];
    const repeatCount = Math.max(8, Math.ceil(40 / names.length));
    
    for (let i = 0; i < repeatCount; i++) {
      names.forEach((name, index) => {
        repeatedNames.push({
          id: `${i}-${index}-${Date.now()}`,
          name: name,
          key: `${i}-${index}-${name}-${Math.random()}`
        });
      });
    }

    setScrollingNames(repeatedNames);

    // Animate scrolling
    const totalHeight = repeatedNames.length * 32; // 32px per item
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -totalHeight / 2,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();
  }, [participants]);

  if (!participants || participants.length === 0) {
    return (
      <View style={styles.noParticipantsContainer}>
        <Text style={styles.noParticipantsText}>No participants yet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.scrollContainer}>
      {/* Top gradient fade */}
      <LinearGradient
        colors={['rgba(28, 25, 23, 1)', 'rgba(28, 25, 23, 0)']}
        style={styles.scrollGradientTop}
        pointerEvents="none"
      />
      
      {/* Bottom gradient fade */}
      <LinearGradient
        colors={['rgba(28, 25, 23, 0)', 'rgba(28, 25, 23, 1)']}
        style={styles.scrollGradientBottom}
        pointerEvents="none"
      />

      <Animated.View style={[styles.scrollContent, { transform: [{ translateY: scrollAnim }] }]}>
        {scrollingNames.map((item) => (
          <View key={item.key} style={styles.participantChip}>
            <Text style={styles.participantName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const RollingEffectModal: React.FC<RollingEffectModalProps> = ({
  isVisible,
  countdown,
  participants = [],
  productTitle = 'Giveaway Prize',
  productImage,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  
  // ✅ Use countdown directly from props (backend-driven)
  // console.log('🎲 Rolling modal - countdown from backend:', countdown);

  useEffect(() => {
    if (!isVisible) return;

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for countdown
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle animation
    Animated.loop(
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      pulseAnim.stopAnimation();
      sparkleAnim.stopAnimation();
    };
  }, [isVisible]);

  // ✅ FIX 2: Auto-close when LOCAL countdown reaches 0
  // useEffect(() => {
  //   if (localCountdown === 0 && isVisible && onComplete) {
  //     console.log('🎲 Rolling countdown reached 0 - auto-closing modal');
  //     // Exit animation before completing
  //     Animated.parallel([
  //       Animated.timing(fadeAnim, {
  //         toValue: 0,
  //         duration: 300,
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(scaleAnim, {
  //         toValue: 0.8,
  //         duration: 300,
  //         useNativeDriver: true,
  //       }),
  //     ]).start(() => {
  //       setTimeout(() => {
  //         onComplete();
  //       }, 100);
  //     });
  //   }
  // }, [localCountdown, isVisible, onComplete, fadeAnim, scaleAnim]);
  
  // Manual close handler
  const handleClose = () => {
    // console.log('🎲 Manual close button pressed - closing rolling modal');
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  };

  if (!isVisible) return null;

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Background with gradient */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.95)', 'rgba(28, 25, 23, 0.95)']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          
          {/* Gradient background pulse */}
          <View style={styles.backgroundPulse} />
          
          {/* Close Button */}
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.closeButtonGradient}>
              <X size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Clock Icon */}
          <View style={styles.clockContainer}>
            <LinearGradient
              colors={['#F59E0B', '#EAB308']}
              style={styles.clockBackground}>
              <Clock size={40} color="#000" strokeWidth={3} />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>Rolling for Winner</Text>
          
          {/* Countdown Display - Large and prominent */}
          <View style={styles.countdownContainer}>
            <Animated.View style={[styles.countdownCircle, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#F59E0B', '#EAB308']}
                style={styles.countdownGradient}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </LinearGradient>
            </Animated.View>
            <View style={styles.countdownUnderline} />
          </View>

          {/* Participants Section */}
          <View style={styles.participantsSection}>
            <Text style={styles.participantsLabel}>Live Participants:</Text>
            <ScrollingApplicants participants={participants} />
          </View>
          
          {/* Product Info */}
          {productImage && (
            <View style={styles.productContainer}>
              <Image
                source={{ uri: `${AWS_CDN_URL}${productImage}` }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <Text style={styles.productTitle} numberOfLines={2}>
                {productTitle}
              </Text>
            </View>
          )}

          {/* Selecting Winner Indicator */}
          <View style={styles.selectingContainer}>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={16} color="#F59E0B" fill="#F59E0B" />
            </Animated.View>
            <Text style={styles.selectingText}>Selecting winner...</Text>
            <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
              <Sparkles size={16} color="#F59E0B" fill="#F59E0B" />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    backgroundColor: 'rgba(28, 25, 23, 0.98)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  backgroundPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    padding: 8,
    borderRadius: 20,
  },
  clockContainer: {
    marginBottom: 16,
  },
  clockBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countdownCircle: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  countdownGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
  },
  countdownUnderline: {
    width: 48,
    height: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
    marginTop: 8,
  },
  participantsSection: {
    width: '100%',
    marginBottom: 20,
  },
  participantsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    textAlign: 'center',
  },
  scrollContainer: {
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  scrollGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    zIndex: 10,
  },
  scrollGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 16,
    zIndex: 10,
  },
  participantChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noParticipantsContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noParticipantsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  productContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  productTitle: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    maxWidth: 250,
    fontWeight: '600',
  },
  selectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default RollingEffectModal;
