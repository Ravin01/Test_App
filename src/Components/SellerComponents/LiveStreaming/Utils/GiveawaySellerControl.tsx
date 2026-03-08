/* eslint-disable react/no-unstable-nested-components */
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Modal,
} from 'react-native';
import {
  Gift,
  Users,
  Play,
  Trophy,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import {
  configureAppSync,
  connectToChannel,
  getGiveawaysChannelPath,
  subscribeToChannel,
  closeChannel,
  Channel,
} from '../../../../Utils/appSyncConfig';
import giveawayService from '../../../Shows/Services/giveawayService';
import {Toast} from '../../../../Utils/dateUtils';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import {useNavigation} from '@react-navigation/native';

const tierConfig: any = {
  silver: {
    label: 'Silver',
    color: '#9CA3AF',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
    description: 'User must Mandate Register',
    icon: '🥈',
  },
  gold: {
    label: 'Gold',
    color: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    description: 'User must Mandate Register and share the stream',
    icon: '🥇',
  },
  platinum: {
    label: 'Platinum',
    color: '#D1D5DB',
    backgroundColor: 'rgba(209, 213, 219, 0.1)',
    borderColor: 'rgba(209, 213, 219, 0.3)',
    description: 'User must Mandate Register and purchase 1+ product',
    icon: '⭐',
  },
  diamond: {
    label: 'Diamond',
    color: '#22D3EE',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
    description: 'User must Mandate Register and purchase 2+ products',
    icon: '💎',
  },
};

// ⭐ ULTRA PREMIUM Winner Display Component
const WinnerHighlightDisplay = ({
  winner,
  onPress,
}: {
  winner: any;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0.3)).current;
  const crownBounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 400,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(crownBounceAnim, {
          toValue: -8,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(crownBounceAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0.3,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [
    scaleAnim,
    glowAnim,
    bounceAnim,
    crownBounceAnim,
    shimmerAnim,
    pulseAnim,
    ringAnim,
    sparkleAnim,
  ]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-350, 350],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.4, 0],
  });
  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.2],
  });
  const winnerName = winner?.userName || winner?.name || 'Unknown';
  const winnerProfileKey = winner?.profileURL?.key;

  return (
    <Animated.View style={[ws.container, {transform: [{scale: scaleAnim}]}]}>
      <Animated.View
        style={[
          ws.ring,
          {opacity: ringOpacity, transform: [{scale: ringScale}]},
        ]}
      />
      <Animated.View
        style={[
          ws.glowOuter,
          {opacity: glowOpacity, transform: [{scale: glowScale}]},
        ]}
      />
      <Animated.Text style={[ws.star, ws.s1, {opacity: sparkleAnim}]}>
        ✨
      </Animated.Text>
      <Animated.Text style={[ws.star, ws.s2, {opacity: sparkleAnim}]}>
        ⭐
      </Animated.Text>
      <Animated.Text style={[ws.star, ws.s3, {opacity: sparkleAnim}]}>
        🌟
      </Animated.Text>
      <Animated.Text style={[ws.star, ws.s4, {opacity: sparkleAnim}]}>
        💫
      </Animated.Text>
      <Animated.Text style={[ws.star, ws.s5, {opacity: sparkleAnim}]}>
        🎊
      </Animated.Text>
      <Animated.Text style={[ws.star, ws.s6, {opacity: sparkleAnim}]}>
        ✨
      </Animated.Text>
      <Animated.View style={[ws.card, {transform: [{scale: pulseAnim}]}]}>
        <View style={ws.shimmerWrap}>
          <Animated.View
            style={[ws.shimmer, {transform: [{translateX: shimmerTranslate}]}]}
          />
        </View>
        <View style={ws.confettiRow}>
          <Text style={ws.confetti}>🎊</Text>
          <Text style={ws.confetti}>🎉</Text>
          <Text style={ws.confetti}>🎊</Text>
        </View>
        <Animated.View
          style={[ws.trophyWrap, {transform: [{translateY: bounceAnim}]}]}>
          <View style={ws.trophyGlow} />
          <Text style={ws.trophy}>🏆</Text>
        </Animated.View>
        <View style={ws.titleRow}>
          <Animated.Text style={[ws.sparkle, {opacity: sparkleAnim}]}>
            ✨
          </Animated.Text>
          <View style={ws.titleBadge}>
            <Text style={ws.title}>WINNER!</Text>
          </View>
          <Animated.Text style={[ws.sparkle, {opacity: sparkleAnim}]}>
            ✨
          </Animated.Text>
        </View>
        <Text style={ws.subtitle}>🎉 Congratulations 🎉</Text>
        <TouchableOpacity
          style={ws.winnerCard}
          onPress={onPress}
          activeOpacity={0.8}>
          <View style={ws.avatarWrap}>
            <Animated.View style={[ws.avatarGlow, {opacity: glowOpacity}]} />
            <Image
              source={{
                uri: winnerProfileKey
                  ? `${AWS_CDN_URL}${winnerProfileKey}`
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      winnerName,
                    )}&background=F7CE45&color=000&size=128`,
              }}
              style={ws.avatar}
            />
            <Animated.View
              style={[ws.crown, {transform: [{translateY: crownBounceAnim}]}]}>
              <Text style={ws.crownEmoji}>👑</Text>
            </Animated.View>
          </View>
          <View style={ws.nameWrap}>
            <Text style={ws.winnerName} numberOfLines={1}>
              {winnerName}
            </Text>
            <View style={ws.viewRow}>
              <Text style={ws.tapText}>Tap to view profile</Text>
              <ChevronRight size={14} color="rgba(255,215,0,0.6)" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={ws.ribbon}>
          <Text style={ws.ribbonText}>🎉 Giveaway Champion 🎉</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const ws = StyleSheet.create({
  container: {
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 20,
  },
  ring: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#F7CE45',
  },
  glowOuter: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 35,
  },
  star: {position: 'absolute', fontSize: 20, zIndex: 10},
  s1: {top: -10, left: 15},
  s2: {top: 5, right: 10, fontSize: 24},
  s3: {bottom: 40, left: 5},
  s4: {bottom: 60, right: 15},
  s5: {top: 30, left: -5},
  s6: {bottom: 20, right: -5},
  card: {
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 3,
    borderColor: '#FFD700',
    overflow: 'hidden',
    shadowColor: '#F7CE45',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 20,
  },
  shimmerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  confetti: {fontSize: 24},
  trophyWrap: {alignItems: 'center', marginBottom: 12, position: 'relative'},
  trophyGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,215,0,0.3)',
    top: -15,
  },
  trophy: {fontSize: 64},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sparkle: {fontSize: 18, marginHorizontal: 8},
  titleBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  winnerCard: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.4)',
    gap: 16,
  },
  avatarWrap: {position: 'relative'},
  avatarGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,0,0.5)',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  crown: {position: 'absolute', top: -18, right: -10},
  crownEmoji: {fontSize: 32},
  nameWrap: {flex: 1},
  winnerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  viewRow: {flexDirection: 'row', alignItems: 'center'},
  tapText: {fontSize: 12, color: 'rgba(255,255,255,0.5)'},
  ribbon: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    marginTop: 20,
    marginHorizontal: -24,
    marginBottom: -24,
    paddingVertical: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  ribbonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
});

// Rolling Modal
const RollingDisplayModal = ({
  isRolling,
  countdown,
  frozenApplicants: _frozenApplicants,
}: {
  isRolling: boolean;
  countdown: number;
  frozenApplicants: any[];
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.8)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRolling) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: countdown * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
      Animated.timing(op, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(sc, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(rot, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rot, {
            toValue: 0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.timing(op, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.timing(sc, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start();
      rot.stopAnimation();
      rot.setValue(0);
    }
  }, [isRolling, countdown, progress, rot, sc, op]);

  const giftRot = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const pw = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={isRolling}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={rm.overlay}>
        <Animated.View style={[rm.bg, {opacity: op}]} />
        <Animated.View
          style={[rm.modal, {transform: [{scale: sc}], opacity: op}]}>
          <View style={rm.header}>
            <Animated.Text style={[rm.gift, {transform: [{rotate: giftRot}]}]}>
              🎁
            </Animated.Text>
            <View style={rm.titleWrap}>
              <Text style={rm.title}>Rolling for Winner</Text>
              <Text style={rm.sub}>Selecting winner...</Text>
            </View>
          </View>
          <View style={rm.countWrap}>
            <Text style={rm.count}>{countdown}</Text>
            <View style={rm.divider} />
          </View>
          <View style={rm.progWrap}>
            <View style={rm.progBg}>
              <Animated.View style={[rm.progFill, {width: pw}]} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const rm = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  bg: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)'},
  modal: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 16,
    padding: 20,
    width: 340,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.42)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  gift: {fontSize: 28},
  titleWrap: {flex: 1},
  title: {color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 2},
  sub: {color: 'rgba(250,250,250,0.5)', fontSize: 10},
  countWrap: {alignItems: 'center', marginBottom: 16},
  count: {fontSize: 36, fontWeight: 'bold', color: '#F7CE45', marginBottom: 8},
  divider: {width: 48, height: 2, backgroundColor: '#F7CE45', borderRadius: 1},
  progWrap: {marginTop: 12},
  progBg: {
    height: 4,
    backgroundColor: 'rgba(250,250,250,0.42)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: {height: '100%', backgroundColor: '#22C55E', borderRadius: 2},
});

// Main Component
const GiveAwaySellerControl = ({
  streamId,
  giveawayId,
  initialGiveawayDetails,
}: {
  streamId: string;
  giveawayId: string;
  initialGiveawayDetails: any;
}) => {
  const navigation = useNavigation();
  const [giveawayDetails, setGiveawayDetails] = useState<any>(
    initialGiveawayDetails || null,
  );
  const [loading, setLoading] = useState<boolean>(!initialGiveawayDetails);
  const [applicantsCount, setApplicantsCount] = useState<number>(0);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [rollingMessage, setRollingMessage] = useState<string>('');
  const [applicantsList, setApplicantsList] = useState<any[]>([]);
  const [winnerInfo, setWinnerInfo] = useState<any>(null);
  const [isGiveawayActive, setIsGiveawayActive] = useState<boolean>(false);
  const [isGiveawayEnded, setIsGiveawayEnded] = useState<boolean>(false);
  const [productTitle, setProductTitle] = useState<string>('Unknown Product');
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [finalWinner, setFinalWinner] = useState<any>(null);
  const [frozenApplicants, setFrozenApplicants] = useState<any[]>([]);
  const isProcessingWinner = useRef(false);
  const rollingApplicantsSnapshot = useRef<any[]>([]);

  useEffect(() => {
    if (initialGiveawayDetails) {
      setGiveawayDetails(initialGiveawayDetails);
      setApplicantsList(initialGiveawayDetails.applicants || []);
      setApplicantsCount(initialGiveawayDetails.applicants?.length || 0);
      setWinnerInfo(initialGiveawayDetails.winner || null);
      setIsGiveawayActive(initialGiveawayDetails.isActive || false);
      setIsGiveawayEnded(initialGiveawayDetails.isGiveawayEnded || false);
      setProductTitle(initialGiveawayDetails.productTitle || 'Unknown Product');
      setLoading(false);
    }
  }, [initialGiveawayDetails]);

  const navigateToProfile = (userName: string) => {
    if (userName)
      (navigation as any).navigate('ViewSellerProdile', {id: userName});
  };

  useEffect(() => {
    if (!giveawayId || !streamId) return;
    let channel: Channel | null = null;
    let subscription: any = null;
    const setupAppSync = async () => {
      try {
        configureAppSync();
        const channelPath = getGiveawaysChannelPath(streamId);
        channel = await connectToChannel(channelPath);
        subscription = subscribeToChannel(channel, (data: any) => {
          const eventData = data.event || data;
          if (!eventData?.eventType) return;
          switch (eventData.eventType) {
            case 'giveaway_started':
              if (
                eventData.giveawayId === giveawayId ||
                eventData.giveawayId?.toString() === giveawayId?.toString()
              ) {
                setIsGiveawayActive(true);
                setIsGiveawayEnded(false);
                if (eventData.giveaway)
                  setGiveawayDetails((p: any) => ({
                    ...p,
                    ...eventData.giveaway,
                    isActive: true,
                    isGiveawayEnded: false,
                  }));
                Toast('Giveaway is now active!');
              }
              break;
            case 'giveaway_ended':
              if (eventData.giveawayId === giveawayId) {
                if (eventData.winner) setWinnerInfo(eventData.winner);
                setIsGiveawayActive(false);
                setIsGiveawayEnded(true);
              }
              break;
            case 'giveaway_rolling_started':
              if (
                eventData.giveawayId === giveawayId ||
                eventData.giveawayId?.toString() === giveawayId?.toString()
              ) {
                let apps = eventData.applicants?.length
                  ? eventData.applicants
                  : applicantsList?.length
                  ? applicantsList
                  : giveawayDetails?.applicants || [];
                rollingApplicantsSnapshot.current = apps;
                setFrozenApplicants(apps);
                setFinalWinner(null);
                setWinnerInfo(null);
                setIsGiveawayEnded(false);
                setApplicantsList(apps);
                setIsRolling(true);
                setCountdown(eventData.countdownSeconds || 5);
                setRollingMessage(eventData.message || 'Rolling started!');
              }
              break;
            case 'giveaway_countdown_tick':
              if (
                eventData.giveawayId === giveawayId ||
                eventData.giveawayId?.toString() === giveawayId?.toString()
              ) {
                setCountdown(eventData.countdown);
                setRollingMessage(eventData.message);
              }
              break;
            case 'giveaway_winner_selected':
              if (
                eventData.giveawayId === giveawayId &&
                !isProcessingWinner.current
              ) {
                isProcessingWinner.current = true;
                setIsRolling(false);
                setCountdown(0);
                setRollingMessage('');
                if (eventData.winner) {
                  setFinalWinner(eventData.winner);
                  setWinnerInfo(eventData.winner);
                }
                setIsGiveawayActive(false);
                setIsGiveawayEnded(true);
                isProcessingWinner.current = false;
              }
              break;
            case 'user_giveaway_application':
              if (
                eventData.giveawayId === giveawayId ||
                eventData.giveawayId?.toString() === giveawayId?.toString()
              ) {
                setApplicantsCount(eventData.count);
                if (eventData.applicants && !isRolling)
                  setApplicantsList(eventData.applicants);
              }
              break;
          }
        });
      } catch (e) {
        console.error('AppSync error:', e);
      }
    };
    setupAppSync();
    return () => {
      if (subscription) subscription.unsubscribe();
      if (channel) closeChannel(channel);
    };
  }, [giveawayId, streamId, applicantsList, giveawayDetails, isRolling]);

  const handleRollAndSelect = async () => {
    if (
      !isGiveawayActive ||
      isGiveawayEnded ||
      isRolling ||
      applicantsList.length === 0
    ) {
      Toast(
        'Cannot roll: Giveaway not active, already ended, already rolling, or no applicants.',
      );
      return;
    }
    try {
      setIsRolling(true);
      const res = await giveawayService.rollGiveaway(giveawayId);
      if (!res?.success) Toast(res?.error || 'Failed to roll giveaway');
    } catch (e) {
      console.error('Roll error:', e);
      Toast('Failed to roll giveaway. Please try again.');
    }
  };

  const handleEndGiveawayManual = async () => {
    if (!isGiveawayActive || isGiveawayEnded) {
      Toast('Cannot end: Giveaway not active or already ended.');
      return;
    }
    setIsEnding(true);
    try {
      const res = await giveawayService.endGiveaway(giveawayId);
      if (res?.success) {
        Toast('Giveaway ended successfully!');
        setIsGiveawayActive(false);
        setIsGiveawayEnded(true);
      } else Toast(res?.error || 'Failed to end giveaway');
    } catch (e: any) {
      Toast(e?.response?.data?.data?.error || 'Failed to end giveaway.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleStartGiveaway = async () => {
    setIsStarting(true);
    try {
      const res = await giveawayService.startGiveaway(giveawayId, streamId);
      if (res?.success) {
        Toast('Giveaway started successfully!');
        setIsGiveawayActive(true);
        setIsGiveawayEnded(false);
      } else Toast(res?.error || 'Failed to start giveaway');
    } catch (e) {
      console.error('Start error:', e);
      Toast('Failed to start giveaway.');
    } finally {
      setIsStarting(false);
    }
  };

  const rollDisabled =
    !isGiveawayActive || applicantsCount === 0 || isGiveawayEnded || isRolling;
  const endDisabled = !isGiveawayActive || isGiveawayEnded;
  let statusMessage = '';
  if (isGiveawayEnded && winnerInfo)
    statusMessage = `🎉 Winner: ${
      winnerInfo.userName || winnerInfo.name || 'Unknown'
    }!`;
  else if (isGiveawayEnded) statusMessage = 'Ended without winner';
  else if (isRolling)
    statusMessage =
      countdown > 0 ? `🎲 Rolling... ${countdown}s remaining` : '🎲 Rolling...';
  else if (isGiveawayActive)
    statusMessage = `🔴 Live • ${applicantsCount} participant${
      applicantsCount !== 1 ? 's' : ''
    }`;
  const imageUri =
    giveawayDetails?.productDetails?.images?.[0]?.key || '/placeholder.svg';
  const currentTier =
    giveawayDetails?.giveawayTier || giveawayDetails?.tier || 'silver';
  const tierInfo = tierConfig[currentTier];

  if (loading)
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#F7CE45" />
        <Text style={s.loadingText}>Loading Giveaway...</Text>
      </View>
    );
  if (!giveawayDetails)
    return (
      <View style={s.errorContainer}>
        <X size={48} color="#F7CE45" />
        <Text style={s.errorText}>Giveaway not found</Text>
      </View>
    );

  return (
    <View style={s.container}>
      <View style={s.productCard}>
        <View style={s.headerRow}>
          <View style={s.imageContainer}>
            <Image
              source={{uri: `${AWS_CDN_URL}${imageUri}`}}
              style={s.productImage}
              resizeMode="cover"
            />
            <View style={s.giftBadge}>
              <Gift size={12} color="#000" />
            </View>
          </View>
          <View style={s.productInfo}>
            <Text style={s.productTitle} numberOfLines={2}>
              {productTitle}
            </Text>
            <Text style={s.categoryText} numberOfLines={1}>
              {giveawayDetails?.productDetails?.category || 'Unknown Category'}
            </Text>
          </View>
          <View style={s.participantsBadge}>
            <Users size={16} color="#000" />
            <Text style={s.participantsText}>{applicantsCount}</Text>
          </View>
        </View>
      </View>
      {tierInfo && (
        <View
          style={[
            s.tierBadge,
            {
              backgroundColor: tierInfo.backgroundColor,
              borderColor: tierInfo.borderColor,
            },
          ]}>
          <Text style={s.tierIcon}>{tierInfo.icon}</Text>
          <View style={s.tierText}>
            <Text style={[s.tierLabel, {color: tierInfo.color}]}>
              {tierInfo.label}
            </Text>
            <Text style={s.tierDesc} numberOfLines={2}>
              {tierInfo.description}
            </Text>
          </View>
        </View>
      )}
      {statusMessage !== '' && (
        <View style={s.statusCard}>
          <Text style={s.statusText}>{statusMessage}</Text>
        </View>
      )}
      <RollingDisplayModal
        isRolling={isRolling}
        countdown={countdown}
        frozenApplicants={frozenApplicants}
      />
      {finalWinner && (
        <WinnerHighlightDisplay
          winner={finalWinner}
          onPress={() =>
            navigateToProfile(finalWinner.userName || finalWinner.name)
          }
        />
      )}
      <View style={s.buttonContainer}>
        {!isGiveawayActive && !isGiveawayEnded && !finalWinner ? (
          <TouchableOpacity
            onPress={handleStartGiveaway}
            style={s.startButton}
            disabled={isStarting}>
            {isStarting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Play size={20} color="white" />
            )}
            <Text style={s.startText}>
              {isStarting ? 'Starting...' : 'Start Giveaway'}
            </Text>
          </TouchableOpacity>
        ) : isGiveawayEnded && winnerInfo ? (
          <TouchableOpacity
            style={s.endedCard}
            onPress={() =>
              navigateToProfile(winnerInfo.userName || winnerInfo.name)
            }
            activeOpacity={0.7}>
            <Trophy size={32} color="#F7CE45" />
            <Text style={s.endedTitle}>Giveaway Completed</Text>
            <View style={s.winnerBadgeRow}>
              {winnerInfo.profileURL?.key && (
                <Image
                  source={{uri: `${AWS_CDN_URL}${winnerInfo.profileURL.key}`}}
                  style={s.winnerBadgeAvatar}
                />
              )}
              <Text style={s.winnerText}>
                🏆 {winnerInfo.userName || winnerInfo.name || 'Unknown'}
              </Text>
              <ChevronRight size={14} color="#F7CE45" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.activeButtons}>
            {isGiveawayActive && !finalWinner && (
              <TouchableOpacity
                onPress={handleRollAndSelect}
                disabled={rollDisabled || isRolling}
                style={[
                  s.rollButton,
                  rollDisabled || isRolling ? s.rollDisabled : s.rollActive,
                ]}
                activeOpacity={rollDisabled || isRolling ? 1 : 0.8}>
                {isRolling ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Sparkles
                    size={20}
                    color={rollDisabled || isRolling ? '#9CA3AF' : '#000'}
                  />
                )}
                <Text
                  style={[
                    s.rollText,
                    rollDisabled || isRolling
                      ? s.rollTextDisabled
                      : s.rollTextActive,
                  ]}>
                  {isRolling
                    ? countdown > 0
                      ? `Rolling... ${countdown}s`
                      : 'Rolling...'
                    : rollDisabled
                    ? applicantsCount === 0
                      ? 'No Applicants'
                      : 'Cannot Roll'
                    : 'Roll & Select Winner'}
                </Text>
              </TouchableOpacity>
            )}
            {isGiveawayEnded && (!winnerInfo || !finalWinner) && (
              <View style={s.endedContainer}>
                <View style={s.endedContent}>
                  <X size={24} color="red" />
                  <Text style={s.endedText}>Giveaway Ended</Text>
                </View>
              </View>
            )}
            {!isRolling && !isGiveawayEnded && !finalWinner && (
              <TouchableOpacity
                onPress={handleEndGiveawayManual}
                disabled={endDisabled || isEnding}
                style={[
                  s.endButton,
                  endDisabled || isEnding
                    ? s.endButtonDisabled
                    : s.endButtonActive,
                ]}
                activeOpacity={endDisabled || isEnding ? 1 : 0.8}>
                {isEnding ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <X size={16} color={endDisabled ? '#9CA3AF' : '#EF4444'} />
                )}
                <Text
                  style={[
                    s.endText,
                    endDisabled || isEnding
                      ? s.endTextDisabled
                      : s.endTextActive,
                  ]}>
                  {isEnding ? 'Ending...' : 'End Giveaway'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {isRolling && rollingMessage && (
        <View style={s.rollingMsgContainer}>
          <Text style={s.rollingMsgText}>{rollingMessage}</Text>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0C0A09',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,113,108,0.3)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 10,
  },
  loadingContainer: {
    backgroundColor: '#0C0A09',
    borderRadius: 20,
    padding: 40,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,113,108,0.3)',
  },
  loadingText: {color: '#fff', fontSize: 16, fontWeight: '500', marginTop: 12},
  errorContainer: {
    backgroundColor: '#0C0A09',
    borderRadius: 20,
    padding: 40,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120,113,108,0.3)',
  },
  errorText: {color: '#fff', fontSize: 16, fontWeight: '500', marginTop: 12},
  productCard: {
    backgroundColor: 'rgba(41,37,36,0.8)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.2)',
  },
  headerRow: {flexDirection: 'row', alignItems: 'center'},
  imageContainer: {position: 'relative', marginRight: 12},
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(247,206,69,0.3)',
  },
  giftBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F7CE45',
    borderRadius: 10,
    padding: 3,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {flex: 1, marginRight: 8},
  productTitle: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  categoryText: {color: '#D6D3D1', fontSize: 10, fontWeight: '500'},
  participantsBadge: {
    backgroundColor: '#F7CE45',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {color: '#000', fontSize: 12, fontWeight: 'bold'},
  tierBadge: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierIcon: {fontSize: 24, marginRight: 10},
  tierText: {flex: 1},
  tierLabel: {fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5},
  tierDesc: {color: '#A8A29E', fontSize: 10, marginTop: 2},
  statusCard: {
    backgroundColor: 'rgba(41,37,36,0.6)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(120,113,108,0.3)',
    alignItems: 'center',
  },
  statusText: {fontSize: 12, fontWeight: '600', color: '#F7CE45'},
  buttonContainer: {marginTop: 8},
  activeButtons: {gap: 8},
  startButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startText: {color: '#fff', fontSize: 14, fontWeight: 'bold'},
  rollButton: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rollActive: {
    backgroundColor: '#F7CE45',
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.5)',
  },
  rollDisabled: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  rollText: {fontSize: 14, fontWeight: 'bold'},
  rollTextActive: {color: '#000'},
  rollTextDisabled: {color: '#9CA3AF'},
  endButton: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
  },
  endButtonActive: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.5)',
  },
  endButtonDisabled: {backgroundColor: '#292524', borderColor: '#374151'},
  endText: {fontWeight: '600', fontSize: 12},
  endTextActive: {color: '#EF4444'},
  endTextDisabled: {color: '#9CA3AF'},
  endedContainer: {
    backgroundColor: 'rgba(107,114,128,0.2)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(107,114,128,0.3)',
    alignItems: 'center',
  },
  endedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  endedCard: {
    backgroundColor: 'rgba(41,37,36,0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.2)',
  },
  endedTitle: {color: '#D6D3D1', fontSize: 14, fontWeight: '500'},
  winnerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.3)',
    gap: 8,
  },
  winnerBadgeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F7CE45',
  },
  winnerText: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rollingMsgContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.3)',
    alignItems: 'center',
  },
  rollingMsgText: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default GiveAwaySellerControl;
