import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Trophy, X, Gift, Crown, User, ExternalLink, ShoppingCart, CheckCircle } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../../Config';
import { useNavigation } from '@react-navigation/native';
import giveawayService from '../Services/giveawayService';
import { AuthContext } from '../../../Context/AuthContext';
import { Toast } from '../../../Utils/dateUtils';

const { width, height } = Dimensions.get('window');

// Royal Trophy Component with Crown
const RoyalTrophyIcon = () => {
  return (
    <View style={styles.trophyContainer}>
      {/* Glow effect layers */}
      <View style={styles.trophyGlowOuter} />
      <View style={styles.trophyGlowInner} />
      
      {/* Floating Crown Above Trophy */}
      <View style={styles.crownAboveTrophy}>
        <Crown color="#FFD700" size={24} fill="#FFD700" />
      </View>
      
      {/* Trophy with gradient background */}
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.trophyGradient}
      >
        <Trophy color="#1F1F1F" size={36} />
      </LinearGradient>
    </View>
  );
};

// Corner Decoration Component
const CornerDecoration = ({ position }) => (
  <View style={[styles.cornerDecoration, position === 'topLeft' && styles.cornerTopLeft, position === 'topRight' && styles.cornerTopRight]}>
    <LinearGradient
      colors={position === 'topLeft' ? ['#FFD700', 'transparent'] : ['#A855F7', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cornerGradient}
    />
  </View>
);

// Main Giveaway Winner Modal Component
const GiveawayWinnerModal = ({ 
  isVisible, 
  onClose, 
  giveawayData,
  winner,
  onChecout,
  isWinner = false,
  autoCloseDuration = 120000 // 2 minutes like web version
}) => {
  const [_timeRemaining, setTimeRemaining] = useState(autoCloseDuration / 1000);
  const [isClaimingPrize, setIsClaimingPrize] = useState(false);
  const [prizeClaimed, setPrizeClaimed] = useState(false);
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const {user}=useContext(AuthContext)
  const navigation = useNavigation<any>();
  
  const handleClose = React.useCallback(() => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset all states
    setIsClaimingPrize(false);
    setPrizeClaimed(false);
    setCheckingClaimStatus(false);
    setTimeRemaining(autoCloseDuration / 1000);
    
    // Call parent close handler
    onClose?.();
  }, [onClose, autoCloseDuration]);

  // Check if product is already claimed via API
  useEffect(() => {
    const checkClaimStatus = async () => {
      if (!isVisible || !giveawayData?._id || !isWinner) return;
      
      setCheckingClaimStatus(true);
      try {
        const response = await giveawayService.getGiveawayDetails(giveawayData._id);
        
        if (response.success && response.data && isMountedRef.current) {
          // Check if the prize has been claimed
          // Common fields that might indicate claim status:
          const isClaimed = response.data.isClaimed || 
                           response.data.claimed || 
                           response.data.claimStatus === 'claimed' ||
                           response.data.winner?.claimed;
          
          setPrizeClaimed(isClaimed);
        }
      } catch (error) {
        console.error('Failed to check claim status:', error);
      } finally {
        if (isMountedRef.current) {
          setCheckingClaimStatus(false);
        }
      }
    };

    checkClaimStatus();
  }, [isVisible, giveawayData?._id, isWinner]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (isVisible && giveawayData) {
      // Start countdown timer
      setTimeRemaining(autoCloseDuration / 1000);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, giveawayData, autoCloseDuration, handleClose]);

  if (!giveawayData) return null;

  const winnerDisplayName = winner?.userName || winner?.name || winner?.displayName || 'Winner';
  const sponsorData = giveawayData?.sponsor || giveawayData?.sponsorData;
  const isSponsored = giveawayData?.isSponsored || !!sponsorData;
  const sponsorType = giveawayData?.sponsorType || 'basic';



  const handleWinnerProfilePress = () => {
    if(!user){
      Toast('You need to be logged in to view profiles.');
      navigation.navigate("Login");
      handleClose()
      return;
    }
    if (winner?.userName) {
      handleClose(); // Close modal before navigation
      setTimeout(() => {
        navigation.navigate("ViewSellerProdile", { id: winner?.userName });
      }, 300);
    }
  };

  const handleSponsorPress = () => {
     if(!user){
      Toast('You need to be logged in to Sponsor profiles.');
      navigation.navigate("Login");
      handleClose()
      return;
    }
    if (sponsorData?.userInfo?.userName) {
      handleClose(); // Close modal before navigation
      setTimeout(() => {
        navigation.navigate("ViewSellerProdile", { id: sponsorData?.userInfo?.userName });
      }, 300);
    }
  };

const checkIfCurrentUserIsWinner = (winnerInfo) => {
  if (!user || !winnerInfo) {
    // console.log('🔍 Winner Check: Missing user or winnerInfo');
    return false;
  }
  
  // Convert IDs to strings for reliable comparison
  const currentUserId = user._id?.toString();
  const winnerUserId = winnerInfo._id?.toString();
  const winnerUserIdAlt = winnerInfo.userId?.toString();
  
  // console.log('🔍 Winner Check:', {
  //   currentUserId,
  //   winnerUserId,
  //   winnerUserIdAlt,
  //   currentUserName: user.userName,
  //   winnerUserName: winnerInfo.userName,
  //   winnerDisplayName: winnerInfo.displayName
  // });
  
  // PRIMARY: Match by ID (most reliable and unique)
  if (currentUserId && winnerUserId && currentUserId === winnerUserId) {
    // console.log('✅ Winner matched by _id');
    return true;
  }
  
  // SECONDARY: Match by userId field (if _id not available)
  if (currentUserId && winnerUserIdAlt && currentUserId === winnerUserIdAlt) {
    // console.log('✅ Winner matched by userId');
    return true;
  }
  
  // FALLBACK: Username match ONLY if IDs are not available
  // This should rarely be used but prevents edge cases
  if (!currentUserId || (!winnerUserId && !winnerUserIdAlt)) {
    const currentUserName = user.userName?.toLowerCase().trim();
    const winnerUserName = winnerInfo.userName?.toLowerCase().trim();
    
    if (currentUserName && winnerUserName && currentUserName === winnerUserName) {
      // console.log('⚠️ Winner matched by userName (fallback)');
      return true;
    }
  }
  
  // console.log('❌ Winner check failed - no match found');
  return false;
}
  const handleClaimPrize = async () => {
    if (!isWinner || !giveawayData || isClaimingPrize) return;

    setIsClaimingPrize(true);

    try {
      setPrizeClaimed(true);
      
      // Call checkout handler if provided
      if (onChecout) {
        await onChecout();
      }
      
      // Close modal after successful claim
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      console.error('Failed to claim prize:', error);
      if (isMountedRef.current) {
        setIsClaimingPrize(false);
        setPrizeClaimed(false);
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        {/* Radial Gradient Background Effect */}
        <View style={styles.radialGradientEffect} />

        {/* Decorative Background Elements - Stars and Sparkles (commented out) */}
        {/* 
        <DecorativeStar size={12} style={{ position: 'absolute', top: height * 0.15, left: width * 0.1 }} />
        <DecorativeStar size={16} style={{ position: 'absolute', top: height * 0.25, right: width * 0.15 }} />
        <DecorativeStar size={14} style={{ position: 'absolute', top: height * 0.35, left: width * 0.2 }} />
        <DecorativeStar size={10} style={{ position: 'absolute', bottom: height * 0.2, right: width * 0.1 }} />
        <DecorativeSparkle size={12} style={{ position: 'absolute', top: height * 0.2, right: width * 0.25 }} />
        <DecorativeSparkle size={14} style={{ position: 'absolute', bottom: height * 0.25, right: width * 0.2 }} />
        */}

        {/* Main Modal Container with Royal Gradient */}
        <LinearGradient
          colors={['rgba(28, 25, 23, 0.98)', 'rgba(45, 35, 25, 0.98)', 'rgba(28, 25, 23, 0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalContainer}
        >
          {/* Elegant Corner Decorations 
          <CornerDecoration position="topLeft" />
          <CornerDecoration position="topRight" />*/}

          {/* Close Button - Enhanced Royal Style */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
          >
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
              style={styles.closeButtonGradient}
            >
              <X color="#FFD700" size={20} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Royal Glow Effect Around Trophy */}
          <View style={styles.trophyGlowBackground} />

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Royal Trophy with Crown */}
            <View style={styles.trophyWrapper}>
              <RoyalTrophyIcon />
            </View>

            {/* Winner Announcement - Royal Typography */}
            <View style={styles.announcementContainer}>
              <Text style={styles.royalWinnerTitle}>
                {isWinner ? 'Congratulations!' : 'Winner Selected!'}
              </Text>
              
              {/* Winner Badge */}
              <View style={[styles.winnerBadge, isWinner && styles.winnerBadgeGreen]}>
                <Text style={[styles.winnerBadgeText, isWinner && styles.winnerBadgeTextGreen]}>
                  {isWinner ? 'You are the Winner!' : `Winner: ${winnerDisplayName}`}
                </Text>
              </View>
            </View>

            {/* Winner Profile Card - Only show if not current user */}
            {!isWinner && winner && (
              <TouchableOpacity 
                style={styles.winnerProfileCard}
                onPress={handleWinnerProfilePress}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                  style={styles.winnerProfileGradient}
                >
                  <View style={styles.winnerProfileContent}>
                    <View style={styles.avatarWrapper}>
                      {winner.profileURL?.key ? (
                        <Image
                          source={{ uri: `${AWS_CDN_URL}${winner.profileURL.key}` }}
                          style={styles.winnerAvatar as any}
                        />
                      ) : (
                        <View style={styles.winnerAvatarPlaceholder}>
                          <Text style={styles.winnerAvatarInitial}>
                            {winnerDisplayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.winnerInfo}>
                      <Text style={styles.winnerProfileName}>{winnerDisplayName}</Text>
                      <TouchableOpacity style={styles.viewProfileRow} onPress={handleWinnerProfilePress}>
                        <User size={10} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.viewProfileText}>View profile</Text>
                        <ExternalLink size={10} color="rgba(255, 255, 255, 0.6)" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Royal Prize Box */}
            <View style={styles.prizeBoxContainer}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.12)', 'rgba(168, 85, 247, 0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.prizeBox}
              >
                <View style={styles.prizeHeader}>
                  <Gift color="#FFD700" size={18} />
                  <Text style={styles.prizeHeaderText}>Won Product</Text>
                </View>
                <Text style={styles.prizeTitle}>
                  {giveawayData?.productTitle || 'Exclusive Prize'}
                </Text>
              </LinearGradient>
            </View>

            {/* Sponsor Display Section */}
            {isSponsored && sponsorData && (
              <TouchableOpacity 
                style={styles.sponsorCard}
                onPress={handleSponsorPress}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.1)', 'rgba(249, 115, 22, 0.1)']}
                  style={styles.sponsorGradient}
                >
                  <View style={styles.sponsorContent}>
                    {/* Sponsor Avatar */}
                    <View style={styles.sponsorAvatarWrapper}>
                      {sponsorData?.userInfo?.profileURL?.key ? (
                        <Image
                          source={{ uri: `${AWS_CDN_URL}${sponsorData.userInfo.profileURL.key}` }}
                          style={styles.sponsorAvatar as any}
                        />
                      ) : (
                        <View style={styles.sponsorAvatarPlaceholder}>
                          <Text style={styles.sponsorAvatarInitial}>
                            {(sponsorData?.companyName || sponsorData?.businessName || 'S').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Tier Badge */}
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierEmoji}>
                        {sponsorType === 'exclusive' && '🥇'}
                        {sponsorType === 'premium' && '🥈'}
                        {(!sponsorType || sponsorType === 'basic') && '🥉'}
                      </Text>
                    </View>

                    {/* Sponsor Details */}
                    <View style={styles.sponsorInfo}>
                      <View style={styles.sponsorHeaderRow}>
                        <Text style={styles.sponsoredLabel}>★ SPONSORED</Text>
                        <View style={styles.sponsorTypeBadge}>
                          <Text style={styles.sponsorTypeText}>{sponsorType?.toUpperCase() || 'BASIC'}</Text>
                        </View>
                      </View>
                      <Text style={styles.sponsorCompanyName} numberOfLines={1}>
                        {sponsorData?.companyName || sponsorData?.businessName || 'Sponsor'}
                      </Text>
                    </View>

                    {/* Arrow */}
                    <View style={styles.sponsorArrow}>
                      <Text style={styles.arrowText}>›</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {/* Info Message */}
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)']}
              style={styles.infoBox}
            >
              <Text style={styles.infoText}>
                {checkingClaimStatus 
                  ? '🔄 Checking claim status...'
                  : isWinner 
                    ? prizeClaimed 
                      ? '✅ Check your Store Screen to view your prize!'
                      : '🎊 Click "Claim Prize" to add to your orders!'
                    : `🎉 Congratulations to ${winnerDisplayName}!`
                }
              </Text>
            </LinearGradient>
            {/* Claim Prize Button - Only for Winners */}
            {checkIfCurrentUserIsWinner
            (winner) && (
              <TouchableOpacity
                onPress={handleClaimPrize}
                disabled={isClaimingPrize}
                activeOpacity={0.8}
                style={styles.claimPrizeButton}
              >
                <LinearGradient
                  colors={isClaimingPrize 
                    ? ['rgba(251, 191, 36, 0.5)', 'rgba(245, 158, 11, 0.5)'] 
                    : ['#FBBF24', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimPrizeGradient}
                >
                  {isClaimingPrize ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <ShoppingCart size={16} color="#000" />
                  )}
                  <Text style={styles.claimPrizeText}>
                    {isClaimingPrize ? 'Claiming Prize...' : 'Claim Prize'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Prize Claimed Success */}
            {isWinner && prizeClaimed && (
              <View style={styles.prizeClaimedBox}>
                <CheckCircle size={16} color="#22C55E" />
                <Text style={styles.prizeClaimedText}>Prize Claimed! Redirecting...</Text>
              </View>
            )}

          

            {/* Close Button */}
            {/* <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.8}
              style={styles.mainCloseButton}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.mainCloseGradient}
              >
                <X size={14} color="#FFFFFF" />
                <Text style={styles.mainCloseText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity> */}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
      // backgroundColor:"red",
    // backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  radialGradientEffect: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.8,
    height: height * 0.6,
    transform: [{ translateX: -width * 0.4 }, { translateY: -height * 0.3 }],
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    borderRadius: width * 0.4,
    opacity: 0.6,
  },
  modalContainer: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10000,
    zIndex: 10000,
  },
  cornerDecoration: {
    position: 'absolute',
    width: 50,
    height: 50,
    opacity: 0.2,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
  },
  cornerGradient: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    overflow: 'hidden',
  },
  closeButtonGradient: {
    padding: 8,
    borderRadius: 20,
  },
  trophyGlowBackground: {
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    opacity: 0.3,
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 12,
  },
  trophyWrapper: {
    marginBottom: 20,
    marginTop: 4,
  },
  trophyContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGlowOuter: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
  },
  trophyGlowInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  crownAboveTrophy: {
    position: 'absolute',
    top: -16,
    zIndex: 10,
  },
  trophyGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  announcementContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  royalWinnerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  winnerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  winnerBadgeGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  winnerBadgeText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  winnerBadgeTextGreen: {
    color: '#4ADE80',
  },
  winnerProfileCard: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  winnerProfileGradient: {
    padding: 12,
  },
  winnerProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: 12,
  },
  winnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  winnerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#455A64',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  winnerAvatarInitial: {
    fontSize: 18,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  winnerInfo: {
    flex: 1,
  },
  winnerProfileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 2,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  prizeBoxContainer: {
    width: '100%',
    marginBottom: 12,
  },
  prizeBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  prizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  prizeHeaderText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    fontSize: 12,
  },
  prizeTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  sponsorCard: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sponsorGradient: {
    padding: 12,
  },
  sponsorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  sponsorAvatarWrapper: {
    marginRight: 10,
  },
  sponsorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sponsorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#455A64',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sponsorAvatarInitial: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  tierBadge: {
    position: 'absolute',
    top: -4,
    left: 24,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(28, 25, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  tierEmoji: {
    fontSize: 10,
  },
  sponsorInfo: {
    flex: 1,
  },
  sponsorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sponsoredLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(245, 158, 11, 0.9)',
    letterSpacing: 0.5,
  },
  sponsorTypeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
    fontSize: 24,
    color: '#FBBF24',
    opacity: 0.6,
  },
  infoBox: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  mainCloseButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mainCloseGradient: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  claimPrizeButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  claimPrizeGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  claimPrizeText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  prizeClaimedBox: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  prizeClaimedText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '700',
  },
});

export { GiveawayWinnerModal };
