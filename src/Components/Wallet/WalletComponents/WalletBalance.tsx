import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  useSharedValue,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { getWalletBalance, WalletBalanceData } from '../../../Services/walletService';

const WalletBalance = () => {
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Animation values
  const bgRotation1 = useSharedValue(0);
  const bgRotation2 = useSharedValue(0);
  const bgScale1 = useSharedValue(1);
  const bgScale2 = useSharedValue(1.2);
  const refreshRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    fetchBalance();
    startBackgroundAnimations();
  }, []);

  const startBackgroundAnimations = () => {
    bgRotation1.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    bgRotation2.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );
    bgScale1.value = withRepeat(
      withTiming(1.2, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    bgScale2.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulseScale.value = withRepeat(
      withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  };

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      const data = await getWalletBalance();
      console.log('Wallet balance fetched:', data);
      setBalance(data as WalletBalanceData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleRefresh = () => {
    refreshRotation.value = withSequence(
      withTiming(360, { duration: 600, easing: Easing.linear }),
      withTiming(0, { duration: 0 })
    );
    fetchBalance();
  };

  const bg1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bgRotation1.value}deg` },
      { scale: bgScale1.value },
    ],
  }));

  const bg2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bgRotation2.value}deg` },
      { scale: bgScale2.value },
    ],
  }));

  const refreshAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Loading State
  if (loading
    // && !balance
    ) {
    return (
      <Animated.View entering={FadeIn} style={styles.container}>
        <LinearGradient
          colors={['#2a2a2a', '#1a1a1a']}
          style={styles.loadingCard}
        >
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonIcon} />
          </View>
          <View style={styles.skeletonBalance} />
          <View style={styles.skeletonSubtext} />
          <View style={styles.skeletonButton} />
          {/* <ActivityIndicator
            size="small"
            color="#FFD700"
            style={styles.loadingIndicator}
          /> */}
        </LinearGradient>
      </Animated.View>
    );
  }

  // Error State
  if (error) {
    return (
      <Animated.View entering={FadeIn} style={styles.container}>
        <LinearGradient
          colors={['#ef444410', '#dc262610']}
          style={styles.errorCard}
        >
          <View style={styles.errorIconContainer}>
            <Icon name="alert-circle" size={32} color="#f87171" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={fetchBalance}
            activeOpacity={0.7}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Animated Backgrounds */}
        <View style={styles.bgContainer}>
          <Animated.View style={[styles.bgCircle1, bg1AnimatedStyle]} />
          <Animated.View style={[styles.bgCircle2, bg2AnimatedStyle]} />
        </View>

        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <FontAwesome6 name="wallet" size={20} color="#000" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>WALLET BALANCE</Text>
                <View style={styles.statusContainer}>
                  <Animated.View style={[styles.statusDot, pulseAnimatedStyle]} />
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowBalance(!showBalance)}
              activeOpacity={0.7}
              style={styles.eyeButton}
            >
              <Icon
                name={showBalance ? 'eye' : 'eye-off'}
                size={18}
                color="#000"
              />
            </TouchableOpacity>
          </View>

          {/* Balance Display */}
          {showBalance ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.balanceContainer}>
              <View style={styles.balanceRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.balanceAmount}>
                  {balance?.balance != null ? balance.balance.toFixed(2) : '0.00'}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.hiddenBalance}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.hiddenDot} />
              ))}
            </Animated.View>
          )}

          {/* Locked Balance */}
          {balance?.lockedBalance != null && balance.lockedBalance > 0 && (
            <Animated.View entering={FadeIn.delay(300)} style={styles.lockedContainer}>
              <Icon name="lock" size={16} color="#000" />
              <View style={styles.lockedContent}>
                <Text style={styles.lockedLabel}>LOCKED</Text>
                <Text style={styles.lockedAmount}>
                  ₹{balance.lockedBalance.toFixed(2)}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              activeOpacity={0.7}
              style={[styles.actionButton, isRefreshing && styles.disabledButton]}
            >
              <Animated.View style={refreshAnimatedStyle}>
                <Icon name="refresh" size={16} color="#000" />
              </Animated.View>
              <Text style={styles.actionButtonText}>Refresh</Text>
            </TouchableOpacity>

            <View style={styles.actionButton}>
              <Icon name="trending-up" size={16} color="#000" />
              <Text style={styles.actionButtonText}>Available</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFD70050',
    minHeight: 200,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 200,
  },
  errorCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ef444420',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#00000030',
  },
  contentContainer: {
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#00000020',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00000030',
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#00000080',
    letterSpacing: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00000060',
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#00000020',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00000030',
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 6,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: -1,
  },
  balanceDivider: {
    height: 2,
    backgroundColor: '#00000030',
    borderRadius: 1,
  },
  hiddenBalance: {
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 16,
  },
  hiddenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00000040',
    marginRight: 6,
  },
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00000020',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00000030',
  },
  lockedContent: {
    marginLeft: 10,
    flex: 1,
  },
  lockedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#00000070',
    letterSpacing: 1,
  },
  lockedAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000030',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00000040',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  // Loading Skeleton Styles
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonTitle: {
    width: 100,
    height: 20,
    backgroundColor: '#ffffff20',
    borderRadius: 8,
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffff20',
    borderRadius: 16,
  },
  skeletonBalance: {
    width: '60%',
    height: 48,
    backgroundColor: '#ffffff20',
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonSubtext: {
    width: '30%',
    height: 12,
    backgroundColor: '#ffffff20',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonButton: {
    width: '100%',
    height: 40,
    backgroundColor: '#ffffff20',
    borderRadius: 12,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  // Error State Styles
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef444420',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ef444420',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
});

export default WalletBalance;
