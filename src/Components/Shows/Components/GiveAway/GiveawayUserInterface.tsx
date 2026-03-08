import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { AuthContext } from '../../../../Context/AuthContext';
import giveawayService from '../../Services/giveawayService';
import {
  X,
  Gift,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { Toast } from '../../../../Utils/dateUtils';
import { AWS_CDN_URL } from '../../../../../Config';
import LinearGradient from 'react-native-linear-gradient';
import {
  configureAppSync,
  connectToChannel,
  getGiveawaysChannelPath,
  subscribeToChannel,
  closeChannel
} from '../../../../Utils/appSyncConfig';
const { height } = Dimensions.get('window');

const GiveAwayUsers = ({
  streamId,
  showData: _showData,
  onFollowUpdate: _onFollowUpdate,
  isOpen,
  onClose,
  navigation,
  signedUrls = {},
}) => {
  const { user } = useContext(AuthContext);

  // Core state - MUST be called before any conditional returns
  const [giveawayDetails, setGiveawayDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applicantsList, setApplicantsList] = useState([]);
  const [hasApplied, setHasApplied] = useState(false);

  // Rolling state
  const [isRolling, setIsRolling] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isWinner, setIsWinner] = useState(false);

  // Eligibility state
  const [eligibilityStatus, setEligibilityStatus] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Auto-close countdown state
  const [_autoCloseCountdown, setAutoCloseCountdown] = useState(null);

  // Terms & Conditions modal state
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ref to track if we've already checked eligibility for this giveaway
  const eligibilityCheckedRef = useRef(null);

  const userId = user?._id;

  // Tier configuration
  const tierConfig = {
    bronze: {
      label: 'Bronze',
      color: '#CD7F32',
      textColor: '#D97706',
      icon: '🥉'
    },
    gold: {
      label: 'Gold',
      color: '#EAB308',
      textColor: '#EAB308',
      icon: '🥇'
    },
    diamond: {
      label: 'Diamond',
      color: '#06B6D4',
      textColor: '#06B6D4',
      icon: '💎'
    },
    platinum: {
      label: 'Platinum',
      color: '#D1D5DB',
      textColor: '#D1D5DB',
      icon: '⭐'
    },
    silver: {
      label: 'Silver',
      color: '#C0C0C0',
      textColor: '#fff',
      icon: '🥈'
    }
  };

  // Slide in animation on mount
  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, slideAnim]);

  // Pulse animation
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    if (hasApplied || isRolling) {
      pulse();
    }
  }, [hasApplied, isRolling, pulseAnim]);

  // Fetch active giveaway
  const fetchActiveGiveaway = React.useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      const response = await giveawayService.getActiveGiveaway(streamId);

      if (response.success && response.data) {
        setGiveawayDetails(response.data);
        setApplicantsList(response.data.applicants || []);
        setHasApplied(response.data.applicants?.includes(userId) || false);

        // if (response.data.winner?.userId === userId) {
        setIsWinner(true);
        setWinner(response.data.winner);
        // }
      } else {
        setGiveawayDetails(null);
        setApplicantsList([]);
      }
    } catch (error) {
      console.log('Failed to get giveaway details:', error);
      setGiveawayDetails(null);
      setApplicantsList([]);
    } finally {
      setLoading(false);
    }
  }, [streamId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchActiveGiveaway();
  }, [fetchActiveGiveaway]);

  // Check eligibility - ONLY ONCE per giveaway
  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?._id || !giveawayDetails?._id) return;
      if (eligibilityCheckedRef.current === giveawayDetails._id) return;
      if (hasApplied || winner) return;

      setCheckingEligibility(true);
      try {
        const response = await giveawayService.checkEligibility(giveawayDetails._id, user._id);
        setEligibilityStatus(response.data || response);
        eligibilityCheckedRef.current = giveawayDetails._id;
      } catch (error) {
        console.error('Eligibility check failed:', error);
        setEligibilityStatus({
          eligible: false,
          reasons: ['Unable to verify eligibility. Please try again.']
        });
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [user?._id, giveawayDetails?._id, hasApplied, winner]);
  // ===== Check if Current User is Winner =====
  const checkIfCurrentUserIsWinner = useCallback((winner) => {
    if (!user || !winner) return false;
    // console.log('Checking winner:', winner, 'for user:', user);
    return (
      user._id === winner._id ||
      user._id === winner.userId ||
      user.userName === winner.userName ||
      user.userName === winner.displayName ||
      user.name === winner.name
    );
  }, [user]);
  // ===== Memoized Socket Event Handlers =====
  const handleApplicationUpdate = useCallback((data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const currentGiveawayId = giveawayDetails?._id;

    if (!dataGiveawayId || !currentGiveawayId) return;
    if (dataGiveawayId.toString() !== currentGiveawayId.toString()) return;

    // console.log('📥 Application update received:', data);

    // Update applicants list
    if (data.applicants && Array.isArray(data.applicants)) {
      setApplicantsList(data.applicants);

      // Check if current user is in the list
      setHasApplied(prev => {
        const nowApplied = data.applicants.includes(userId);
        if (nowApplied !== prev) {
          console.log('✅ User application status changed:', nowApplied);
        }
        return nowApplied;
      });
    }

    // Update giveaway details with new applicant count
    setGiveawayDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        applicants: data.applicants || prev.applicants,
        stats: {
          ...(prev.stats || {}),
          totalApplicants: data.count || data.applicants?.length || 0
        }
      };
    });
  }, [giveawayDetails?._id, userId]);

  const handleRollingStart = useCallback((data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const currentGiveawayId = giveawayDetails?._id;

    if (!dataGiveawayId || !currentGiveawayId) return;
    if (dataGiveawayId.toString() !== currentGiveawayId.toString()) return;

    // console.log('🎲 Rolling started:', data);
    setIsRolling(true);
    setCountdown(data.countdownSeconds || 10);
  }, [giveawayDetails?._id]);

  const handleCountdownTick = useCallback((data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const currentGiveawayId = giveawayDetails?._id;

    if (!dataGiveawayId || !currentGiveawayId) return;
    if (dataGiveawayId.toString() !== currentGiveawayId.toString()) return;

    setCountdown(data.countdown);
  }, [giveawayDetails?._id]);

  const handleWinnerSelected = useCallback(async (data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const currentGiveawayId = giveawayDetails?._id;

    if (!dataGiveawayId || !currentGiveawayId) return;
    if (dataGiveawayId.toString() !== currentGiveawayId.toString()) return;

    // console.log('🏆 Winner selected:', data);

    setIsRolling(false);
    setCountdown(0);
    setWinner(data.winner);

    // Check if current user is the winner
    const isCurrentUserWinner = checkIfCurrentUserIsWinner(data.winner);
    setIsWinner(isCurrentUserWinner);

    // console.log('🎯 Is current user winner?', isCurrentUserWinner);

    // Refresh giveaway details to get complete updated data
    try {
      const response = await giveawayService.getGiveawayDetails(currentGiveawayId);
      if (response.success && response.data) {
        console.log('✅ Refreshed giveaway details after winner selection');
        setGiveawayDetails(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to refresh giveaway details:', error);
    }
  }, [giveawayDetails?._id, checkIfCurrentUserIsWinner]);

  const handleGiveawayEnded = useCallback(async (data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const currentGiveawayId = giveawayDetails?._id;

    if (!dataGiveawayId || !currentGiveawayId) return;
    if (dataGiveawayId.toString() !== currentGiveawayId.toString()) return;

    // console.log('🔚 Giveaway ended:', data);

    setIsRolling(false);
    setCountdown(0);

    // Update giveaway details to show ended status
    setGiveawayDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        isGiveawayEnded: true,
        isActive: false,
      };
    });

    // Refresh to get complete updated data
    try {
      const response = await giveawayService.getGiveawayDetails(currentGiveawayId);
      if (response.success && response.data) {
        console.log('✅ Refreshed giveaway details after end');
        setGiveawayDetails(response.data);
      }
    } catch (error) {
      console.error('❌ Failed to refresh giveaway details after end:', error);
    }
  }, [giveawayDetails?._id]);

  const handleGiveawayStarted = useCallback(async (data) => {
    const dataGiveawayId = data.giveawayId || data._id;
    const dataStreamId = data.streamId;

    // Filter by stream ID to ensure it's for this stream
    if (!dataStreamId || dataStreamId.toString() !== streamId.toString()) {
      console.log('❌ Stream ID mismatch, ignoring giveaway start');
      return;
    }

    console.log('🎁 NEW Giveaway started:', data);

    // Clear previous giveaway state
    setIsRolling(false);
    setCountdown(0);
    setWinner(null);
    setIsWinner(false);
    setHasApplied(false);
    setApplicantsList([]);

    // Reset eligibility check
    eligibilityCheckedRef.current = null;

    // Fetch fresh giveaway details
    try {
      console.log('🔄 Fetching fresh giveaway details for:', dataGiveawayId);
      const response = await giveawayService.getGiveawayDetails(dataGiveawayId);

      if (response.success && response.data) {
        console.log('✅ Successfully loaded new giveaway details');
        setGiveawayDetails(response.data);
        setApplicantsList(response.data.applicants || []);
        setHasApplied(response.data.applicants?.includes(userId) || false);

        // Auto-show the modal if it was closed
        if (!isOpen && onClose) {
          console.log('📖 Auto-opening giveaway modal for new giveaway');
          // Note: This would require the parent to manage modal state
        }
      } else {
        console.warn('⚠️ Failed to get new giveaway details, falling back to socket data');
        // Fallback to socket data if API fails
        setGiveawayDetails(data);
        setApplicantsList(data.applicants || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch new giveaway details:', error);
      // Fallback to socket data
      setGiveawayDetails(data);
      setApplicantsList(data.applicants || []);
    }
  }, [streamId, userId, isOpen, onClose]);


  // ✅ APPSYNC: Setup AppSync subscription for giveaway events
  useEffect(() => {
    if (!streamId || !user) {
      console.log('⚠️ GiveawayUserInterface: Missing streamId or user, skipping AppSync setup');
      return;
    }

    const currentGiveawayId = giveawayDetails?._id;

    const setupAppSync = async () => {
      try {
        // console.log('🔌 [GiveawayUserInterface] Setting up AppSync for stream:', streamId);

        // Configure AppSync
        await configureAppSync();

        // Get the giveaways channel path
        const channelPath = getGiveawaysChannelPath(streamId);

        // Connect to the channel
        const channel = await connectToChannel(channelPath);

        // Subscribe to giveaway events
        const subscription = await subscribeToChannel(channel, (data) => {
          // console.log('📨 [GiveawayUserInterface AppSync] Received event:', data);

          // Extract the actual event from the data wrapper
          const eventData = data.event;
          if (!eventData || !eventData.eventType) {
            console.warn('⚠️ [GiveawayUserInterface AppSync] Invalid event structure:', data);
            return;
          }

          // console.log('📨 [GiveawayUserInterface AppSync] Processing event type:', eventData.eventType);

          switch (eventData.eventType) {
            case 'giveaway_started': {
              const startData = eventData;
              handleGiveawayStarted(startData);
            }

            case 'giveaway_application':
            case 'user_giveaway_application': {
              const appData = eventData;
              handleApplicationUpdate(appData);
              break;
            }

            case 'giveaway_rolling':
            case 'giveaway_rolling_started': {
              const rollData = eventData;
              handleRollingStart(rollData);
              break;
            }

            case 'giveaway_countdown_tick': {
              const tickData = eventData;
              handleCountdownTick(tickData);
              break;
            }

            case 'giveaway_winner_selected': {
              const winnerData = eventData;
              handleWinnerSelected(winnerData);
              break;
            }

            case 'giveaway_ended': {
              const endData = eventData;
              handleGiveawayEnded(endData);
              break;
            }

            default:
              console.log('⚠️ [GiveawayUserInterface AppSync] Unknown event:', eventData.eventType);
          }
        });

        // console.log('✅ [GiveawayUserInterface] AppSync subscriptions active');

        // Cleanup function
        return () => {
          // console.log('🧹 [GiveawayUserInterface] Cleaning up AppSync subscriptions');
          closeChannel(channel);
        };

      } catch (error) {
        console.error('❌ [GiveawayUserInterface] Failed to setup AppSync:', error);
      }
    };

    const cleanup = setupAppSync();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [streamId, user, giveawayDetails?._id, userId, checkIfCurrentUserIsWinner]);


  // Auto-close countdown for winner
  useEffect(() => {
    let autoCloseTimer;
    let countdownInterval;

    if (winner && onClose) {
      setAutoCloseCountdown(30);

      countdownInterval = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev === null || prev <= 1) return null;
          return prev - 1;
        });
      }, 1000);

      autoCloseTimer = setTimeout(() => {
        onClose();
      }, 30000);
    }

    return () => {
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      setAutoCloseCountdown(null);
    };
  }, [winner, isWinner, onClose]);

  // Apply to giveaway
  const handleApplyGiveaway = async () => {
    if (!user) {
      Toast('Please log in to apply for the giveaway.');
      return;
    }

    const giveawayId = giveawayDetails?._id;
    if (!giveawayId) {
      Toast('Giveaway not found. Please try again.');
      return;
    }

    if (eligibilityStatus && !eligibilityStatus.eligible) {
      const reason = eligibilityStatus.reasons?.[0] || 'You do not meet the tier requirements';
      Toast(reason);
      return;
    }
    Toast("By entering the giveaway, you're accepting our Terms & Conditions")

    setApplyLoading(true);

    try {
      const response = await giveawayService.applyToGiveaway(giveawayId, userId);

      if (response.success) {
        // Toast('Successfully applied to giveaway! Good luck!');

        // Toast("By entering the giveaway, you're accepting our Terms & Conditions")
        setHasApplied(true);

        const updatedResponse = await giveawayService.getGiveawayDetails(giveawayId);
        if (updatedResponse.success && updatedResponse.data) {
          setGiveawayDetails(updatedResponse.data);
          setApplicantsList(updatedResponse.data.applicants || []);
        }
      } else {
        const errorMessage = response.error || response.message || 'Failed to apply to giveaway.';
        Toast(errorMessage);
      }
    } catch (error) {
      console.error('Failed to apply to giveaway:', error);
      Toast('Failed to apply to giveaway. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  // ✅ AUTH CHECK: Show auth required UI if user not authenticated
  if (!user && isOpen) {
    return (
      <Animated.View
        style={[
          styles.banner,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.closeButtonGradient}
          >
            <X size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.authRequiredContainer}>
          <Gift size={48} color="#FBBF24" />
          <Text style={styles.authRequiredTitle}>Authentication Required</Text>
          <Text style={styles.authRequiredSubtitle}>
            Please log in to participate in giveaways and see active prizes.
          </Text>
          <TouchableOpacity
            onPress={() => {
              onClose();
              navigation.navigate('Login');
            }}
            style={styles.loginButton}
          >
            <LinearGradient
              colors={['#FBBF24', '#F59E0B']}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (!isOpen) return null;

  // Helper function to safely get product ID
  const getProductIdSafely = (productField) => {
    if (!productField) return null;
    if (typeof productField === "object" && productField !== null && productField._id) {
      return productField._id.toString();
    }
    return productField.toString();
  };

  // Loading state UI
  if (loading) {
    return (
      <Animated.View
        style={[
          styles.banner,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.closeButtonGradient}
          >
            <X size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FBBF24" />
          <Text style={styles.loadingText}>Loading giveaway details...</Text>
        </View>
      </Animated.View>
    );
  }

  // No active giveaway UI
  if (!giveawayDetails) {
    return (
      <Animated.View
        style={[
          styles.banner,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.closeButtonGradient}
          >
            <X size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.emptyContainer}>
          <Gift size={48} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Active Giveaway</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no active giveaways for this stream.
          </Text>
        </View>
      </Animated.View>
    );
  }

  const productTitle = giveawayDetails?.productTitle || 'Unknown Product';
  const currentTier = giveawayDetails?.giveawayTier || giveawayDetails?.tier || 'bronze';
  const tierInfo = tierConfig[currentTier] || tierConfig.bronze;
  const isButtonDisabled = applyLoading || checkingEligibility || (eligibilityStatus && !eligibilityStatus.eligible);
  const isIneligibleUser = !winner && eligibilityStatus && !eligibilityStatus.eligible;
  const productDisplayId = getProductIdSafely(giveawayDetails?.productId);
  const productImageUrl = signedUrls?.[productDisplayId] || `${AWS_CDN_URL}${giveawayDetails?.productDetails?.images[0]?.key}`;

  // Status checks
  const isActive = giveawayDetails?.isActive === true;
  const isGiveawayEnded = giveawayDetails?.isGiveawayEnded === true;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateX: slideAnim }],
          // borderColor: isIneligibleUser ? '#EF4444' : 'rgba(250, 204, 21, 0.5)',
        }
      ]}
    >
      {/* Close Button */}
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <LinearGradient
          colors={['#EF4444', '#DC2626']}
          style={styles.closeButtonGradient}
        >
          <X size={14} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Winner Status Bar */}
      {/* {!winner && (
        <LinearGradient
          colors={['#FBBF24', '#F59E0B']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.winnerStatusBar}
        >
          <View style={styles.winnerStatusContent}>
            <View style={styles.winnerStatusLeft}>
              <Animated.View style={{transform: [{scale: pulseAnim}]}}>
                <Trophy size={16} color="#000" />
              </Animated.View>
              <Text style={styles.winnerStatusText}>
                {checkIfCurrentUserIsWinner(winner) ? 'YOU WON!' : 'We Have a Winner'}
              </Text>
            </View>
            {autoCloseCountdown !== null && (
              <View style={styles.countdownBadge}>
                <Clock size={12} color="#000" />
                <Text style={styles.countdownText}>{autoCloseCountdown}s</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      )} */}

      {/* Rolling Status */}
      {isRolling && (
        <LinearGradient
          colors={['#7C3AED', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rollingStatusBar}
        >
          <Animated.View style={{
            transform: [{
              rotate: pulseAnim.interpolate({
                inputRange: [1, 1.1],
                outputRange: ['0deg', '360deg']
              })
            }]
          }}>
            <Clock size={14} color="#fff" />
          </Animated.View>
          <Text style={styles.rollingStatusText}>Rolling...</Text>
          {countdown > 0 && (
            <Text style={styles.rollingCountdown}>{countdown}</Text>
          )}
        </LinearGradient>
      )}

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.titleHeader}>
          <Gift size={16} color="#FBBF24" />
          <Text style={styles.titleHeaderText}>Active Giveaway</Text>
        </View>

        {/* Product Info - Compact Layout */}
        <View style={styles.productInfoSection}>
          <View style={styles.productHeader}>
            {/* Product Image */}
            <Image
              source={{ uri: productImageUrl || 'https://via.placeholder.com/150' }}
              style={styles.productImage}
              resizeMode="cover"
            />

            {/* Product Title and Status */}
            <View style={styles.productDetails}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {productTitle}
              </Text>

              {/* Status Badges */}
              <View style={styles.statusBadgesRow}>
                {!isGiveawayEnded && !isActive && !isRolling && (
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusBadgeText}>Not Started</Text>
                  </View>
                )}

                {isGiveawayEnded && (
                  <View style={[styles.statusBadge, styles.statusBadgeEnded]}>
                    <View style={[styles.statusDot, styles.statusDotEnded]} />
                    <Text style={[styles.statusBadgeText, styles.statusBadgeTextEnded]}>Ended</Text>
                  </View>
                )}

                {!isGiveawayEnded && isActive && !isRolling && (
                  <View style={[styles.statusBadge, styles.statusBadgeActive]}>
                    <View style={[styles.statusDot, styles.statusDotActive]} />
                    <Text style={[styles.statusBadgeText, styles.statusBadgeTextActive]}>Active</Text>
                  </View>
                )}

                {isRolling && (
                  <View style={[styles.statusBadge, styles.statusBadgeRolling]}>
                    <View style={[styles.statusDot, styles.statusDotRolling]} />
                    <Text style={[styles.statusBadgeText, styles.statusBadgeTextRolling]}>Rolling</Text>
                  </View>
                )}

                {giveawayDetails?.requireAutoFollow && (
                  <View style={styles.autoFollowBadge}>
                    <Text style={styles.autoFollowText}>Auto-follow</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Tier Badge */}
          {tierInfo && !isGiveawayEnded && (
            <View style={styles.tierBadge}>
              <Text style={styles.tierIcon}>{tierInfo.icon}</Text>
              <Text style={[styles.tierLabel, { color: tierInfo.textColor }]}>
                {tierInfo.label}
              </Text>
            </View>
          )}

          {/* Sponsor Display - Compact */}
          {(giveawayDetails.isSponsored || giveawayDetails.isSponsorProduct) &&
            (giveawayDetails.sponsorId || giveawayDetails.sponsoredBy) && (() => {
              const sponsorData = giveawayDetails.sponsorId || giveawayDetails.sponsoredBy;
              const sponsorUserName = sponsorData?.userInfo?.userName || sponsorData?._id;
              const sponsorCompanyName = sponsorData?.companyName || sponsorData?.businessName || 'Sponsor';
              const sponsorProfileKey = sponsorData?.userInfo?.profileURL?.key || sponsorData?.profileURL;
              const sponsorType = giveawayDetails.sponsorType || 'basic';

              return (
                <View style={styles.sponsorSection}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ViewSellerProdile', {
                      id: sponsorUserName
                    })}
                    style={styles.sponsorCard}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(245, 158, 11, 0.05)', 'rgba(249, 115, 22, 0.05)']}
                      style={styles.sponsorGradient}
                    >
                      {/* Sponsor Avatar */}
                      <View style={styles.sponsorAvatarWrapper}>
                        {sponsorProfileKey ? (
                          <Image
                            source={{ uri: `${AWS_CDN_URL}${sponsorProfileKey}` }}
                            style={styles.sponsorAvatar}
                          />
                        ) : (
                          <View style={styles.sponsorAvatarPlaceholder}>
                            <Text style={styles.sponsorAvatarText}>
                              {sponsorCompanyName?.charAt(0)?.toUpperCase() || 'S'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Sponsor Details */}
                      <View style={styles.sponsorInfo}>
                        <View style={styles.sponsorHeader}>
                          <Text style={styles.sponsoredLabel}>✨ SPONSORED</Text>
                          <View style={styles.sponsorTypeBadge}>
                            <Text style={styles.sponsorTypeText}>
                              {sponsorType.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.sponsorCompanyName} numberOfLines={1}>
                          {sponsorCompanyName}
                        </Text>
                      </View>

                      {/* Arrow */}
                      <View style={styles.sponsorArrow}>
                        <Text style={styles.arrowText}>›</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })()}
        </View>

        {/* Winner Display */}
        {winner && (
          <View style={styles.winnerDisplayCard}>
            <View style={styles.winnerHeader}>
              <Text style={styles.winnerIcon}>👑</Text>
              <Text style={styles.winnerHeaderText}>Giveaway Winner</Text>
            </View>

            <Text style={styles.winnerNameText}>
              {winner.displayName || winner.userName || winner.name || 'Winner Selected'}
            </Text>

            <View style={styles.winnerDivider} />

            <Text style={styles.winnerParticipants}>
              Participants: {applicantsList.length}
            </Text>
          </View>
        )}

        {/* Participant Count */}
        {applicantsList.length > 0 && !winner && (
          <View style={styles.participantContainer}>
            <View style={styles.participantHeader}>
              <Users size={16} color="#FBBF24" />
              <Text style={styles.participantHeaderText}>Participants</Text>
            </View>

            <View style={styles.participantDivider} />

            <Animated.Text style={[styles.participantCountLarge, { transform: [{ scale: pulseAnim }] }]}>
              {applicantsList.length}
            </Animated.Text>
          </View>
        )}

        {/* Eligibility Warning */}
        {isIneligibleUser && eligibilityStatus?.reasons?.[0] && (
          <View style={styles.eligibilityWarning}>
            <View style={styles.eligibilityWarningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={styles.eligibilityWarningContent}>
                <Text style={styles.eligibilityWarningTitle}>Not Eligible</Text>
                <Text style={styles.eligibilityWarningText}>
                  {eligibilityStatus.reasons[0]}
                </Text>
              </View>
            </View>
          </View>
        )}
        {!winner && !isGiveawayEnded && (
          <>
            <TouchableOpacity
              onPress={() => setShowTermsModal(true)}
              style={styles.termsLink}
              activeOpacity={0.7}
            >
              <Text style={[styles.termsLinkText, { color: '#999', lineHeight: 10, textDecorationLine: 'none' }]}> By entering the giveaway, you're accepting our <Text style={styles.termsLinkText}>Terms & Conditions</Text></Text>
            </TouchableOpacity>

            {/* Acceptance Disclaimer */}
            {/* <View style={styles.acceptanceDisclaimer}>
      <Text style={styles.acceptanceDisclaimerText}>
        By entering the giveaway, you're accepting our Terms & Conditions
      </Text>
    </View> */}
          </>
        )}

        {/* Action Button - Only show when: not applied, no winner, not rolling, not ended */}
        {!hasApplied && !winner && !isRolling && !isGiveawayEnded && (
          <TouchableOpacity
            onPress={handleApplyGiveaway}
            disabled={isButtonDisabled}
            style={[
              styles.applyButton,
              isButtonDisabled && styles.disabledButton
            ]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isButtonDisabled ? ['#9CA3AF', '#6B7280'] : ['#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyButtonGradient}
            >
              {applyLoading || checkingEligibility ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Gift size={12} color="#000" />
              )}
              <Text style={styles.applyButtonText}>
                {checkingEligibility ? 'Checking...' :
                  applyLoading ? 'Entering...' :
                    (eligibilityStatus && !eligibilityStatus.eligible) ? 'Not Eligible' :
                      'Enter FREE'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Applied Status - Show when applied but not winner, not ended, not rolling */}
        {hasApplied && !winner && !isGiveawayEnded && !isRolling && (
          <View style={styles.appliedStatus}>
            <CheckCircle size={14} color="#10B981" />
            <Text style={styles.appliedText}>You're in! Good luck</Text>
          </View>
        )}

        {/* Terms & Conditions Link - Show below Enter FREE button or Applied status */}


      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalMainTitle}>Flykup Giveaway – Universal Terms & Conditions</Text>

              <Text style={styles.modalIntro}>
                These Terms & Conditions ("Terms") apply to all giveaways hosted on the Flykup platform ("Giveaway"), either by Kaps NextGen Private Limited ("Company") or by registered sellers using the Flykup app and services.
              </Text>

              <Text style={styles.modalIntro}>
                By participating in any Giveaway on Flykup, users agree to follow these Terms.
              </Text>

              {/* Section 1 */}
              <Text style={styles.sectionTitle}>1️⃣ Eligibility</Text>
              <Text style={styles.sectionText}>1. Only individuals 18 years or older residing in India may participate.</Text>
              <Text style={styles.sectionText}>2. Users must have a valid mobile number registered on Flykup.</Text>
              <Text style={styles.sectionText}>3. Company may request ID proof for winner confirmation.</Text>
              <Text style={styles.sectionText}>4. Employees and associates of the Company or the Giveaway host (seller) are not eligible.</Text>

              {/* Section 2 */}
              <Text style={styles.sectionTitle}>2️⃣ Free Entry Compliance</Text>
              <Text style={styles.sectionText}>1. No purchase is required to enter any Giveaway on Flykup.</Text>
              <Text style={styles.sectionText}>2. Participation is completely free for everyone.</Text>
              <Text style={styles.sectionText}>3. Any purchase-based actions (if provided) shall only give bonus entries and do not improve eligibility requirement.</Text>

              {/* Section 3 */}
              <Text style={styles.sectionTitle}>3️⃣ Participation Rules</Text>
              <Text style={styles.sectionText}>To enter a Giveaway, a user may be required to:</Text>
              <Text style={styles.sectionBullet}>• Join the live or view the applicable content</Text>
              <Text style={styles.sectionBullet}>• Follow the seller (may happen automatically on joining Giveaway)</Text>
              <Text style={styles.sectionBullet}>• Watch for a minimum duration as defined in the rules</Text>
              <Text style={styles.sectionBullet}>• Perform engagement tasks such as polls, chat, share, wishlist, etc.</Text>
              <Text style={styles.sectionText}>Participation requirements may vary between Giveaways and will be displayed inside the app.</Text>
              <Text style={styles.sectionText}>Only entries recorded on Flykup servers are valid.</Text>

              {/* Section 4 */}
              <Text style={styles.sectionTitle}>4️⃣ Winner Selection & Announcement</Text>
              <Text style={styles.sectionText}>1. Winners are selected through a fair computerized random process.</Text>
              <Text style={styles.sectionText}>2. Company's decision is final and binding.</Text>
              <Text style={styles.sectionText}>3. Failure to respond with necessary details within 48 hours results in loss of prize.</Text>
              <Text style={styles.sectionText}>4. If fraud or invalid data is detected, Company may disqualify the winner and reselect another.</Text>

              {/* Section 5 */}
              <Text style={styles.sectionTitle}>5️⃣ Prizes & Delivery</Text>
              <Text style={styles.sectionText}>1. Prize details (type, quantity, value) will be mentioned on the Giveaway page.</Text>
              <Text style={styles.sectionText}>2. Shipping charges, taxes, duties, courier fees, and any related logistics costs must be paid by the winner.</Text>
              <Text style={styles.sectionText}>3. Prizes cannot be:</Text>
              <Text style={styles.sectionBullet}>• Exchanged for cash</Text>
              <Text style={styles.sectionBullet}>• Transferred to another person</Text>
              <Text style={styles.sectionBullet}>• Returned or refunded</Text>
              <Text style={styles.sectionText}>4. Delivery timing depends on logistics and product availability.</Text>
              <Text style={styles.sectionText}>5. Travel prizes (if any) are subject to 3rd-party provider terms.</Text>

              {/* Section 6 */}
              <Text style={styles.sectionTitle}>6️⃣ Platform Rights & Cancellation</Text>
              <Text style={styles.sectionText}>Company retains the right to:</Text>
              <Text style={styles.sectionBullet}>• Modify Giveaway rules at any time</Text>
              <Text style={styles.sectionBullet}>• Cancel, withdraw, suspend or reschedule any Giveaway</Text>
              <Text style={styles.sectionBullet}>• Replace any prize with another of equal or higher value</Text>
              <Text style={styles.sectionBullet}>• Restrict or modify eligibility criteria</Text>
              <Text style={styles.sectionText}>No liability arises from such changes.</Text>

              {/* Section 7 */}
              <Text style={styles.sectionTitle}>7️⃣ Fraud & Abuse Prevention</Text>
              <Text style={styles.sectionText}>The Company may disqualify users for:</Text>
              <Text style={styles.sectionBullet}>• Multiple accounts linked to same person/device</Text>
              <Text style={styles.sectionBullet}>• Use of bots/automation</Text>
              <Text style={styles.sectionBullet}>• False identity or incorrect details</Text>
              <Text style={styles.sectionBullet}>• Tampering or manipulating platform</Text>
              <Text style={styles.sectionBullet}>• Misuse of referral systems</Text>
              <Text style={styles.sectionBullet}>• Abusing simulcast/sharing systems</Text>
              <Text style={styles.sectionText}>Company may block the account permanently for severe violations.</Text>

              {/* Section 8 */}
              <Text style={styles.sectionTitle}>8️⃣ Intellectual Property & Publicity Consent</Text>
              <Text style={styles.sectionText}>1. All Flykup content including livestream video, images, graphics belong to the Company or respective sellers.</Text>
              <Text style={styles.sectionText}>2. By participating, users agree that:</Text>
              <Text style={styles.sectionBullet}>• Names, profile, photos, voice and likeness</Text>
              <Text style={styles.sectionBullet}>• Participation videos, chat messages</Text>
              <Text style={styles.sectionText}>May be used by Company for marketing or promotional purposes without compensation.</Text>

              {/* Section 9 */}
              <Text style={styles.sectionTitle}>9️⃣ Data Usage</Text>
              <Text style={styles.sectionText}>Data collected during Giveaway participation may be used for:</Text>
              <Text style={styles.sectionBullet}>• Administration of Giveaways</Text>
              <Text style={styles.sectionBullet}>• Verification of winners</Text>
              <Text style={styles.sectionBullet}>• Analysis and fraud prevention</Text>
              <Text style={styles.sectionBullet}>• Marketing communication related to Flykup</Text>
              <Text style={styles.sectionText}>Data will be handled as per Flykup Privacy Policy.</Text>

              {/* Section 10 */}
              <Text style={styles.sectionTitle}>🔟 Liability</Text>
              <Text style={styles.sectionText}>Company is not responsible for:</Text>
              <Text style={styles.sectionBullet}>• Network delays / internet issues</Text>
              <Text style={styles.sectionBullet}>• Device or app failures</Text>
              <Text style={styles.sectionBullet}>• Entry not recorded due to technical issues</Text>
              <Text style={styles.sectionBullet}>• Seller failing to provide prize on time</Text>
              <Text style={styles.sectionBullet}>• Losses due to incorrect personal information provided by the user</Text>
              <Text style={styles.sectionText}>Participation is voluntary and at user's sole risk.</Text>

              {/* Section 11 */}
              <Text style={styles.sectionTitle}>1️⃣1️⃣ Governing Law</Text>
              <Text style={styles.sectionText}>These Terms are governed by the laws of India.</Text>
              <Text style={styles.sectionText}>All disputes shall be subject to the exclusive jurisdiction of courts in Chennai, Tamil Nadu.</Text>

              {/* Section 12 */}
              <Text style={styles.sectionTitle}>1️⃣2️⃣ Acceptance of Terms</Text>
              <Text style={styles.sectionText}>By clicking JOIN GIVEAWAY or participating, the user confirms:</Text>
              <Text style={styles.sectionBullet}>✔ They accept these Terms</Text>
              <Text style={styles.sectionBullet}>✔ They agree to Flykup rules & decisions</Text>
              <Text style={styles.sectionBullet}>✔ They understand free entry is always available</Text>

              {/* Company Details */}
              <Text style={styles.companyTitle}>Company Details</Text>
              <Text style={styles.companyText}>Kaps NextGen Private Limited</Text>
              <Text style={styles.companyText}>Trade Name: Flykup</Text>
              <Text style={styles.companyText}>Registered Office Address:</Text>
              <Text style={styles.companyText}>No.7, Kambar Street, SRP Mills, Janatha Nagar, Saravanampatti, Coimbatore South, Coimbatore - 641035, Tamil Nadu, India</Text>
              <Text style={styles.companyText}>Contact no: +91 9994677447</Text>
              <Text style={styles.companyText}>Email: support@flylup.in</Text>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowTermsModal(false)}
                style={styles.modalAcceptButton}
              >
                <LinearGradient
                  colors={['#FBBF24', '#F59E0B']}
                  style={styles.modalAcceptGradient}
                >
                  <Text style={styles.modalAcceptText}>I Understand</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 140,
    right: 20,
    width: 300,
    maxHeight: height * 0.7,
    backgroundColor: '#1C1917',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    zIndex: 1001,
    shadowRadius: 20,
    elevation: 21,
    borderWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  closeButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerStatusBar: {
    padding: 8,
  },
  winnerStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  winnerStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  winnerStatusText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countdownText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rollingStatusBar: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rollingStatusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  rollingCountdown: {
    color: '#FCD34D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  authRequiredContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRequiredTitle: {
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  authRequiredSubtitle: {
    color: '#D1D5DB',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  loginButton: {
    marginTop: 24,
    borderRadius: 8,
    overflow: 'hidden',
    width: '80%',
  },
  loginButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  titleHeaderText: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productInfoSection: {
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(107, 114, 128, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.5)',
  },
  statusBadgeEnded: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  statusBadgeRolling: {
    backgroundColor: 'rgba(234, 179, 8, 0.8)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  statusDotEnded: {
    backgroundColor: '#EF4444',
  },
  statusDotActive: {
    backgroundColor: '#22C55E',
  },
  statusDotRolling: {
    backgroundColor: '#EAB308',
  },
  statusBadgeText: {
    color: '#D1D5DB',
    fontSize: 9,
    fontWeight: '600',
  },
  statusBadgeTextEnded: {
    color: '#FECACA',
  },
  statusBadgeTextActive: {
    color: '#BBF7D0',
  },
  statusBadgeTextRolling: {
    color: '#FEF08A',
  },
  autoFollowBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  autoFollowText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '600',
  },
  tierBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  tierIcon: {
    fontSize: 28,
  },
  tierLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  sponsorSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.5)',
  },
  sponsorCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    overflow: 'hidden',
  },
  sponsorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  sponsorAvatarWrapper: {
    marginRight: 10,
  },
  sponsorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sponsorAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  sponsorAvatarText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  sponsoredLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: 'rgba(234, 179, 8, 0.9)',
    letterSpacing: 0.3,
  },
  sponsorTypeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sponsorTypeText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FBBF24',
  },
  sponsorCompanyName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sponsorArrow: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 20,
    color: '#FBBF24',
    opacity: 0.6,
  },
  participantContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    borderWidth: 2,
    borderColor: '#EAB308',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantLabel: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  participantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FBBF24',
  },
  liveDots: {
    flexDirection: 'row',
    gap: 2,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  liveDot1: {
    opacity: 1,
  },
  liveDot2: {
    opacity: 0.6,
  },
  liveDot3: {
    opacity: 0.3,
  },
  winnerDisplay: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerLabel: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '600',
  },
  winnerName: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  applyButton: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  applyButtonText: {
    fontSize: 12,
    fontWeight: 'semibold',
    color: '#000',
  },
  disabledButton: {
    opacity: 0.6,
  },
  appliedStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    flex: 1,
    lineHeight: 16,
  },
  winnerDisplayCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  winnerIcon: {
    fontSize: 16,
  },
  winnerHeaderText: {
    fontSize: 13,
    color: '#FBBF24',
    fontWeight: '600',
  },
  winnerNameText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerDivider: {
    height: 1,
    backgroundColor: 'rgba(75, 85, 99, 0.5)',
    marginVertical: 8,
  },
  winnerParticipants: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  participantHeaderText: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: '700',
  },
  participantDivider: {
    height: 1,
    backgroundColor: '#4B5563',
    marginVertical: 8,
  },
  participantCountLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  eligibilityWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  eligibilityWarningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningIcon: {
    fontSize: 18,
  },
  eligibilityWarningContent: {
    flex: 1,
  },
  eligibilityWarningTitle: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '700',
    marginBottom: 4,
  },
  eligibilityWarningText: {
    fontSize: 12,
    color: '#FECACA',
    lineHeight: 16,
  },
  termsLink: {
    marginHorizontal: 12,
    marginBottom: 4,
    alignItems: 'center',
    paddingVertical: 8,
  },
  termsLinkText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  acceptanceDisclaimer: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  acceptanceDisclaimerText: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.85)',
    // backgroundColor:'red',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1C1917',
    borderRadius: 16,
    width: '100%',
    height: 600,
    maxHeight: 600,
    borderWidth: 2,
    borderColor: '#FBBF24',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.3)',
  },
  modalTitle: {
    color: '#FBBF24',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalMainTitle: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalIntro: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 6,
  },
  sectionBullet: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
    paddingLeft: 8,
  },
  companyTitle: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  companyText: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 191, 36, 0.3)',
  },
  modalAcceptButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalAcceptGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalAcceptText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default GiveAwayUsers;
