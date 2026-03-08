import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  Crown,
  X,
  Clock,
  Trophy,
  Star,
  Sparkles,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react-native';
import { AWS_CDN_URL } from '../../../../Config';
import { AuthContext } from '../../../Context/AuthContext';
import axiosInstance from '../../../Utils/Api';

// Confetti Particle Component
const ConfettiParticle = ({ delay, color }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 3000,
        delay: delay,
        useNativeDriver: true,
      })
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 120],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [{ translateY }, { rotate }],
          opacity,
        },
      ]}
    />
  );
};

// Winner Modal Component
const WinnerModal = ({ 
  isVisible, 
  onClose,
  auctionData,
  onCheckout
}) => {
  // All hooks must be called before any early returns
  const { user } = useContext(AuthContext);
  
  // State for order status check
  const [hasOrderedPrize, setHasOrderedPrize] = useState(false);
  const [orderCheckLoading, setOrderCheckLoading] = useState(false);
  
  // Animation values
  const crownRotation = useRef(new Animated.Value(0)).current;
  const crownScale = useRef(new Animated.Value(1)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.5)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const isReserveMet = auctionData?.reserveMet;
  
  // Validate if the current user is actually the winner
  const isCurrentUserWinner = user?._id && 
    (user._id === auctionData?.winner?._id || user._id.toString() === auctionData?.winner?._id?.toString());
  
  // Check auction order status
  const checkAuctionOrderStatus = useCallback(async () => {
    const auctionId = auctionData?.auctionId || auctionData?._id;

    if (!auctionId || !user?._id) return;

    setOrderCheckLoading(true);

    try {
      const response = await axiosInstance.post(
        '/order/check-order',
        {
          sourceRefId: auctionId,
          sourceType: 'auction',
          userId: user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const data = response.data;

      if (data.success && data.hasOrdered) {
        setHasOrderedPrize(true);
      } else {
        setHasOrderedPrize(false);
      }
    } catch (error) {
      console.log('Failed to check auction order status:', error);
      setHasOrderedPrize(false);
    } finally {
      setOrderCheckLoading(false);
    }
  }, [auctionData, user]);

  // Animations
  useEffect(() => {
    if (isVisible) {
      // Modal entrance animation
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          stiffness: 300,
          damping: 20,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Crown rotation animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(crownRotation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(crownRotation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Crown scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(crownScale, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(crownScale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Sparkle rotation animation
      Animated.loop(
        Animated.timing(sparkleRotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // Check order when modal opens and user is winner
  useEffect(() => {
    if (isVisible && isCurrentUserWinner && isReserveMet) {
      checkAuctionOrderStatus();
    }
  }, [isVisible, isCurrentUserWinner, isReserveMet, checkAuctionOrderStatus]);

  // Early returns after all hooks
  if (!isVisible && !auctionData) {
    return null;
  }

  if (!auctionData) return null;

  // Format date
  const formatDate = (date: string) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const crownRotate = crownRotation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '-5deg', '5deg', '-5deg', '0deg'],
  });

  const sparkleRotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  // console.log(auctionData)

  // Confetti colors
  const confettiColors = ['#FBBF24', '#F59E0B', '#F97316', '#EF4444', '#EC4899'];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalBackground, { opacity: modalOpacity }]}>
       

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
            },
          ]}
        >
          <LinearGradient
            colors={['#292524', '#1C1917', '#292524']}
            style={styles.gradientContainer}
          >
            {/* Golden glow overlay */}
            <LinearGradient
              colors={['rgba(234, 179, 8, 0.1)', 'rgba(245, 158, 11, 0.05)', 'rgba(249, 115, 22, 0.1)']}
              style={styles.glowOverlay}
            />

            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.contentWrapper}>
                {/* Close Button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <X color="#9CA3AF" size={18} />
                </TouchableOpacity>

                {/* Crown Icon with Animation */}
                <View style={styles.crownContainer}>
                  <Animated.View
                    style={[
                      styles.crownWrapper,
                      {
                        transform: [
                          { rotate: crownRotate },
                          { scale: crownScale },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={ ['#FBBF24', '#F59E0B'] }
                      style={styles.crownBackground}
                    >
                      <Crown color="#1C1917" size={40} fill="#1C1917" strokeWidth={2} />
                    </LinearGradient>
                    
                    <Animated.View
                      style={[
                        styles.sparklesBadge,
                        { transform: [{ rotate: sparkleRotate }] },
                      ]}
                    >
                      <Sparkles color="#D97706" size={14} fill="#D97706" />
                    </Animated.View>
                  </Animated.View>
                </View>

                {/* Winner Title */}
                <View style={styles.titleContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.emojiText}>{isReserveMet ? "🎉" : "⚠️"}</Text>
                    {/* <LinearGradient
                      // colors={isReserveMet ? ['#FBBF24', '#F59E0B', '#F97316'] : ['#EF4444', '#F97316', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientTextWrapper}
                    > */}
                      <Text style={styles.winnerText}>
                        {isReserveMet ? 'WINNER!' : 'RESERVE NOT MET'}
                      </Text>
                    {/* </LinearGradient> */}
                    <Text style={styles.emojiText}>{isReserveMet ? "🎉" : "⚠️"}</Text>
                  </View>
                  <Text style={styles.subtitleText}>
                    {isReserveMet 
                      ? `Congratulations on ${isCurrentUserWinner ? 'your' : 'the'} winning bid!`
                      : "The reserve price was not reached"
                    }
                  </Text>
                </View>

                {/* Content Card */}
                <LinearGradient
                  colors={isReserveMet 
                    ? ['rgba(234, 179, 8, 0.1)', 'rgba(245, 158, 11, 0.1)']
                    : ['rgba(239, 68, 68, 0.1)', 'rgba(249, 115, 22, 0.1)']
                  }
                  style={styles.contentCard}
                >
                  {/* Winner Profile Section */}
                  <View style={styles.profileSection}>
                    <View style={styles.profileImageContainer}>
                      <LinearGradient
                        colors={ ['#FBBF24', '#F59E0B']}
                        style={styles.profileImageGradient}
                      >
                        {auctionData?.winner?.profileURL?.key ? (
                          <Image
                            source={{ 
                              uri: `${AWS_CDN_URL}${auctionData?.winner?.profileURL?.key}`
                            }}
                            style={styles.profileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.profileInitial}>
                            {isCurrentUserWinner 
                              ? (isReserveMet ? '🎉' : '😔')
                              : (auctionData?.winner?.name?.charAt(0)?.toUpperCase() || 
                                 auctionData?.winner?.userName?.charAt(0)?.toUpperCase() || 
                                 (isReserveMet ? '🏆' : '📊'))
                            }
                          </Text>
                        )}
                      </LinearGradient>
                      {isReserveMet && (
                        <View style={styles.trophyBadge}>
                          <Trophy color="#1C1917" size={10} fill="#1C1917" />
                        </View>
                      )}
                    </View>

                    <View style={styles.winnerInfo}>
                      <Text style={styles.winnerName} numberOfLines={1}>
                        {isReserveMet 
                          ? (isCurrentUserWinner 
                              ? "You are the winner!" 
                              : auctionData?.winner?.name || auctionData?.winner?.userName || 'Anonymous Winner')
                          : (auctionData?.winner?.name || auctionData?.winner?.userName || 'Last Bidder')
                        }
                      </Text>
                      <View style={styles.badgeRow}>
                        <Star 
                          color={isReserveMet ? "#FBBF24" : "#F97316"} 
                          size={12} 
                          fill={isReserveMet ? "#FBBF24" : "#F97316"} 
                        />
                        <Text style={[styles.badgeText, !isReserveMet && styles.badgeTextRed]}>
                          {isReserveMet ? 'Auction Winner' : 'Last Bid'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Winning Bid */}
                  <View style={[styles.bidContainer, !isReserveMet && styles.bidContainerRed]}>
                    <Text style={styles.bidLabel}>
                      {isReserveMet ? 'Winning Bid' : 'Last Bid Amount'}
                    </Text>
                    <View style={styles.bidAmountRow}>
                      <Text style={[styles.rupeeSymbol, !isReserveMet && styles.rupeeSymbolRed]}>₹</Text>
                      <Text style={[styles.bidAmount, !isReserveMet && styles.bidAmountRed]}>
                        {auctionData?.winningBid?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    {!isReserveMet && (
                      <View style={styles.alertRow}>
                        <AlertCircle color="#F87171" size={12} />
                        <Text style={styles.alertText}>Reserve price not reached</Text>
                      </View>
                    )}
                  </View>

                  {/* Product Section */}
                  {(auctionData?.productName || auctionData?.productImage) && (
                    <View style={styles.productSection}>
                      <View style={styles.productImageContainer}>
                        {auctionData?.productImage ? (
                          <Image
                            source={{ uri: `${AWS_CDN_URL}${auctionData.productImage}` }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.productImagePlaceholder}>
                            <Text style={styles.productImagePlaceholderText}>📦</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {auctionData?.productName || 'Auction Item'}
                        </Text>
                        <Text style={styles.productSubtext}>
                          Product won in auction
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Auction Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                      <Clock color="#9CA3AF" size={16} />
                      <Text style={styles.statLabel}>Ended</Text>
                      <Text style={styles.statValue} numberOfLines={1}>
                        {formatDate(auctionData?.endTime || auctionData?.bidderWon?.updatedAt)}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Star color="#FBBF24" size={16} fill="#FBBF24" />
                      <Text style={styles.statLabel}>Winner Name</Text>
                      <Text style={styles.statValueLarge}>
                        {auctionData?.bidderWon?.name }
                      </Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* Action Button */}
                <View style={styles.buttonContainer}>
                  {isCurrentUserWinner && isReserveMet ? (
                    <TouchableOpacity
                      onPress={onCheckout}
                      style={[
                        styles.checkoutButton,
                        (hasOrderedPrize || orderCheckLoading) && styles.disabledButton
                      ]}
                      disabled={hasOrderedPrize || orderCheckLoading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={
                          hasOrderedPrize || orderCheckLoading
                            ? ['#6B7280', '#4B5563']
                            : ['#10B981', '#059669']
                        }
                        style={styles.buttonGradient}
                      >
                        {!orderCheckLoading && !hasOrderedPrize && (
                          <ShoppingBag color="#FFFFFF" size={18} />
                        )}
                        <Text style={styles.checkoutButtonText}>
                          {orderCheckLoading 
                            ? 'Checking...' 
                            : hasOrderedPrize 
                              ? '✓ Claimed' 
                              : 'Checkout Now'
                          }
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeActionButton}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isReserveMet 
                          ? ['#FBBF24', '#F59E0B']
                          : ['#57534E', '#44403C']
                        }
                        style={styles.buttonGradient}
                      >
                        <Text style={[styles.closeActionButtonText, isReserveMet && styles.closeActionButtonTextDark]}>
                          {isReserveMet 
                            ? (isCurrentUserWinner ? 'Celebrate! 🎉' : 'Got it! 👏')
                            : 'Close'
                          }
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Decorative Elements */}
                <View style={styles.decorativeTopLeft}>
                  <Sparkles color="#FBBF24" size={16} opacity={0.1} />
                </View>
                <View style={styles.decorativeBottomRight}>
                  <Star color="#F59E0B" size={14} opacity={0.1} />
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal:16,
    padding: 8,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiWrapper: {
    position: 'absolute',
    top: -20,
  },
  confettiParticle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalContainer: {
    width: '100%',
    marginHorizontal: 16,
    // borderRadius: 16,
    // overflow: 'hidden',
     maxWidth: 400
  },
  gradientContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  scrollContent: {
    padding: 12,
  },
  contentWrapper: {
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 20,
    padding: 6,
  },
  crownContainer: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  crownWrapper: {
    position: 'relative',
  },
  crownBackground: {
    borderRadius: 50,
    padding: 12,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sparklesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  gradientTextWrapper: {
    borderRadius: 4,
    paddingHorizontal: 4,
    marginHorizontal: 8,
  },
  winnerText: {
    color: '#fff',
    fontWeight: 'bold',

    fontSize: 24,
    letterSpacing: 2,
  },
  subtitleText: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  contentCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  profileImageGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1917',
  },
  trophyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextRed: {
    color: '#F97316',
  },
  bidContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  bidContainerRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  bidLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  bidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rupeeSymbol: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rupeeSymbolRed: {
    color: '#F87171',
  },
  bidAmount: {
    color: '#FBBF24',
    fontSize: 28,
    fontWeight: 'bold',
  },
  bidAmountRed: {
    color: '#F87171',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  alertText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
  },
  productSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  productImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#44403C',
    marginRight: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#57534E',
  },
  productImagePlaceholderText: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  productSubtext: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValueLarge: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 12,
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeActionButtonTextDark: {
    color: '#1C1917',
  },
  decorativeTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  decorativeBottomRight: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
});

export { WinnerModal };
