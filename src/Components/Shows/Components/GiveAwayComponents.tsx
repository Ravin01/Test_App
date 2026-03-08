import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {AuthContext} from '../../../Context/AuthContext';
import {X, ShoppingBag, ChevronRight} from 'lucide-react-native';
import giveawayService from '../Services/giveawayService';
import {useFollowApi} from '../../../Utils/FollowersApi';
import axiosInstance from '../../../Utils/Api';
import GiveawayCheckoutSlider from '../Payment/GiveawayCheckOut';
import {useNavigation} from '@react-navigation/native';
import {
  configureAppSync,
  connectToChannel,
  getGiveawaysChannelPath,
  subscribeToChannel,
  closeChannel
} from '../../../Utils/appSyncConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Global tracking for shown giveaway winner modals to prevent duplicates across screens
const SHOWN_GIVEAWAY_WINS_KEY = '@shown_giveaway_wins';

const GiveawayComponent = ({item, streamId, giveawayId, showData, trackGiveawayEntry, batchEligibilityData, isInStoreView = false}) => {
  const imageUrl = item?.productDetails?.images?.[0]?.key
    ? `${AWS_CDN_URL}${item?.productDetails?.images[0].key}`
    : null;
  
  const {user} = useContext(AuthContext);
  const {followUser, checkFollowStatus} = useFollowApi();
  
  // ===== Core State =====
  const [giveawayDetails, setGiveawayDetails] = useState(item || null);
  const [applyLoading, setApplyLoading] = useState(false);
  
  // ===== Applicants State =====
  const [applicantsList, setApplicantsList] = useState(item?.applicants || []);
  
  const [displayApplicant, setDisplayApplicant] = useState(null);
  // ===== Status State =====
  const [isGiveawayActive, setIsGiveawayActive] = useState(Boolean(item?.isActive));
  const [isGiveawayEnded, setIsGiveawayEnded] = useState(Boolean(item?.isGiveawayEnded));
  const [isRolling, setIsRolling] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // ===== Winner State =====
  const [winnerInfo, setWinnerInfo] = useState(item?.winner?.userId!=null?item?.winner:null);
  
  // ===== Eligibility State =====
  const [eligibilityStatus, setEligibilityStatus] = useState(batchEligibilityData || null);
  const [isEligible, setIsEligible] = useState(true);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  
  // ===== Notification State =====
  const [_notification, setNotification] = useState({
    message: '',
    type: '',
    show: false
  });
  
  // ===== Checkout State =====
  const [showWinnerGiveaway, setShowWinnerGiveaway] = useState(false);
  const [hasOrderedPrize, setHasOrderedPrize] = useState(false);
  const [orderCheckLoading, setOrderCheckLoading] = useState(false);
  const [shouldRefreshOrderStatus, setShouldRefreshOrderStatus] = useState(false);
  
  // ===== Winner Modal State =====
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const hasShownWinnerModalRef = useRef(false);
  
  const rollingIntervalRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const winnerPulseAnim = useRef(new Animated.Value(1)).current;
  const participantsScrollAnim = useRef(new Animated.Value(0)).current;

  // ===== Tier Configuration =====
  const tierConfig = {
    bronze: {
      label: 'Bronze',
      color: ['#CD7F32', '#8B5A00'],
      textColor: '#CD7F32',
      description: 'Open to all users',
      icon: '🥉'
    },
    gold: {
      label: 'Gold',
      color: ['#FFD700', '#FFA500'],
      textColor: '#FFD700',
      description: 'Must follow the seller',
      icon: '🥇'
    },
    diamond: {
      label: 'Diamond',
      color: ['#00CED1', '#4682B4'],
      textColor: '#00CED1',
      description: 'Must have purchased ≥1 product',
      icon: '💎'
    },
    platinum: {
      label: 'Platinum',
      color: ['#E5E4E2', '#C0C0C0'],
      textColor: '#E5E4E2',
      description: 'Must have purchased ≥2 products',
      icon: '⭐'
    },
    silver: { 
      label: 'Silver', 
      color: ['#C0C0C0', '#A9A9A9'],
      textColor: 'text-gray-300',
      description: 'Share stream to participate',
      requirements: 'Share stream - No purchase requirements',
      icon: '🥈'
    }
  };

  // ===== Helper Functions =====
  const Toast = (message) => {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  };

  // ===== Notification Helper =====
  const showNotification = (message, type) => {
    setNotification({message, type, show: true});
    setTimeout(() => {
      setNotification(prev => ({...prev, show: false}));
    }, 3000);
  };

  const positive = (message) => showNotification(message, 'success');
  const showError = (message) => showNotification(message, 'error');

  // ===== Check if Current User is Winner =====
  const checkIfCurrentUserIsWinner = useCallback((winnerInfo) => {
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
  }, [user]);

  // ===== Check Order Status =====
  const checkGiveawayOrderStatus = useCallback(async () => {
    if (!giveawayId || !user?._id) return;

    setOrderCheckLoading(true);

    try {
      const response = await axiosInstance.post(
        "/order/check-order",
        {
          sourceRefId: giveawayId,
          userId: user._id,
          sourceType: 'giveaway'
        }
      );

      const data = response.data;

      if (data.success && data.hasOrdered) {
        setHasOrderedPrize(true);
      } else {
        setHasOrderedPrize(false);
      }
    } catch (error) {
      console.log("Failed to check giveaway order status:", error.response?.data);
      setHasOrderedPrize(false);
    } finally {
      setOrderCheckLoading(false);
    }
  }, [giveawayId, user]);

  // ===== Check if user has applied =====
  const hasApplied = useMemo(() => {
    const fromDetails = giveawayDetails?.applicants?.includes(user?._id) || false;
    const fromList = applicantsList?.includes(user?._id) || false;
    return fromDetails || fromList;
  }, [giveawayDetails?.applicants, applicantsList, user?._id]);

  // ===== Check Eligibility =====
  useEffect(() => {
    if (batchEligibilityData) {
      // console.log('✅ Using batch eligibility data, skipping individual API call');
      setEligibilityStatus(batchEligibilityData);
      
      if (batchEligibilityData.eligible === false) {
        setIsEligible(false);
        setEligibilityMessage(batchEligibilityData.reasons?.[0] || 'Not eligible');
      }
    }
  }, [batchEligibilityData]);

  useEffect(() => {
    if (batchEligibilityData) {
      // console.log('✅ Batch eligibility data updated:', batchEligibilityData);
      setEligibilityStatus(batchEligibilityData);
      
      if (batchEligibilityData.eligible === false) {
        setIsEligible(false);
        setEligibilityMessage(batchEligibilityData.reasons?.[0] || 'Not eligible');
      }
    }
  }, [batchEligibilityData]);

  // ===== Check order status when winner is announced =====
  useEffect(() => {
    if (isGiveawayEnded && winnerInfo && checkIfCurrentUserIsWinner(winnerInfo)) {
      checkGiveawayOrderStatus();
    }
  }, [isGiveawayEnded, winnerInfo, checkIfCurrentUserIsWinner, checkGiveawayOrderStatus, shouldRefreshOrderStatus]);

  // ===== Update when parent data changes =====
  useEffect(() => {
    if (item) {
      setGiveawayDetails(item);
      setApplicantsList(item.applicants || []);
      setWinnerInfo(item.winner || null);
      setIsGiveawayActive(Boolean(item.isActive));
      setIsGiveawayEnded(Boolean(item.isGiveawayEnded));
    }
  }, [item]);

  // ===== Helper to get applicant display name =====
  const getApplicantName = useCallback((applicant) => {
    if (!applicant) return 'Participant';
    
    // If applicant is a string (user ID), return a generic name
    if (typeof applicant === 'string') {
      return 'Participant';
    }
    
    // If applicant is an object, extract the name
    return applicant.displayName || 
           applicant.userName || 
           applicant.name || 
           'Participant';
  }, []);

  // ===== Rolling Effect Functions =====
  const startRollingEffect = useCallback((allApplicants) => {
    if (!allApplicants || allApplicants.length === 0) return;

    if (rollingIntervalRef.current) {
      clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = null;
    }

    let currentIndex = 0;
    
    rollingIntervalRef.current = setInterval(() => {
      // Cycle through actual applicants
      const applicant = allApplicants[currentIndex % allApplicants.length];
      const displayName = getApplicantName(applicant);
      
      setDisplayApplicant({
        _id: applicant?._id || applicant || Date.now().toString(),
        userName: displayName,
        name: displayName,
        displayName: displayName,
      });
      
      currentIndex++;
    }, 100);
  }, [getApplicantName]);

  const stopRollingEffect = useCallback(() => {
    if (rollingIntervalRef.current) {
      clearInterval(rollingIntervalRef.current);
      rollingIntervalRef.current = null;
    }
    setDisplayApplicant(null);
  }, []);

  // ===== Cleanup rolling effect =====
  useEffect(() => {
    return () => {
      stopRollingEffect();
    };
  }, [stopRollingEffect]);

  // ===== Rolling effect based on state =====
  useEffect(() => {
    if (isRolling && applicantsList.length > 0) {
      startRollingEffect(applicantsList);
    } else {
      stopRollingEffect();
      if (!isGiveawayEnded) {
        setDisplayApplicant(null);
      }
    }
  }, [isRolling, applicantsList, isGiveawayEnded, startRollingEffect, stopRollingEffect]);

  // ===== Pulse Animation for Rolling Modal =====
  useEffect(() => {
    if (isRolling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRolling, pulseAnim]);

  // ===== Winner Modal Animation =====
  useEffect(() => {
    if (showWinnerModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(winnerPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(winnerPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showWinnerModal, winnerPulseAnim]);


  // ===== AppSync Event Handlers =====
  useEffect(() => {
    if (!streamId || !user?._id || !giveawayId) {
      // console.log('⚠️ GiveawayComponent: Missing required data, skipping AppSync setup');
      return;
    }

    const setupAppSync = async () => {
      try {
        // console.log('🔌 [GiveawayComponent] Setting up AppSync for stream:', streamId);
        
        // Configure AppSync
        await configureAppSync();
        
        // Get the giveaways channel path
        const channelPath = getGiveawaysChannelPath(streamId);
        
        // Connect to the channel
        const channel = await connectToChannel(channelPath);
        
        // Subscribe to all giveaway events
        await subscribeToChannel(channel, (data) => {
          // console.log('📨 [GiveawayComponent AppSync] Received event:', data);
          
          // Extract the actual event from the data wrapper
          const eventData = data.event;
          if (!eventData || !eventData.eventType) {
            console.warn('⚠️ [GiveawayComponent AppSync] Invalid event structure:', data);
            return;
          }
          
          // console.log('📨 [GiveawayComponent AppSync] Processing event type:', eventData.eventType);
          
          switch (eventData.eventType) {
            case 'giveaway_started': {
              // console.log('🎁 GiveawayComponent received giveaway started:', eventData);
              
              const incomingGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (incomingGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Not our giveaway, ignoring giveaway started event');
                return;
              }
              
              // console.log('✅ Our giveaway is being activated');
              setIsGiveawayActive(true);
              setIsGiveawayEnded(false);
              
              if (eventData.giveaway) {
                setGiveawayDetails(prev => ({
                  ...prev,
                  ...eventData.giveaway,
                  isActive: true,
                  isGiveawayEnded: false,
                }));
                setApplicantsList(eventData.giveaway.applicants || []);
              }
              break;
            }
            
            case 'giveaway_application': {
              console.log('👥 GiveawayComponent received application update:', eventData);
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Application update not for our giveaway, ignoring');
                return;
              }
              
              if (eventData.applicants && Array.isArray(eventData.applicants)) {
                setApplicantsList(eventData.applicants);
                setGiveawayDetails(prev => ({
                  ...prev,
                  applicants: eventData.applicants
                }));
              }
              break;
            }
            
            case 'user_giveaway_application': {
              console.log('👥 GiveawayComponent received user application count update:', eventData);
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ User application not for our giveaway, ignoring');
                return;
              }
              
              if (eventData.applicants && Array.isArray(eventData.applicants)) {
                setApplicantsList(eventData.applicants);
                setGiveawayDetails(prev => ({
                  ...prev,
                  applicants: eventData.applicants
                }));
              }
              break;
            }
            
            case 'giveaway_rolling_started': {
              // console.log('🎲 GiveawayComponent received rolling start:', eventData);
              
              if (!eventData.streamId || eventData.streamId !== streamId.toString()) {
                console.log('❌ Stream ID mismatch, ignoring rolling start');
                return;
              }
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Rolling start not for our giveaway, ignoring');
                return;
              }
              
              console.log('✅ Setting rolling state for our giveaway');
              setIsRolling(true);
              setCountdown(eventData.countdownSeconds || 5);
              
              if (eventData.applicants && Array.isArray(eventData.applicants)) {
                setApplicantsList(eventData.applicants);
              }
              break;
            }
            
            case 'giveaway_countdown_tick': {
              // console.log('⏰ GiveawayComponent received countdown tick:', eventData);
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Countdown tick not for our giveaway, ignoring');
                return;
              }
              
              setCountdown(eventData.countdown);
              break;
            }
            
            case 'giveaway_winner_selected': {
              // console.log('🏆 GiveawayComponent received winner:', eventData);
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Winner selected not for our giveaway, ignoring');
                return;
              }
              
              // console.log('🏆 Winner selected - updating states immediately');
              
              // Set states immediately to trigger modal
              setIsRolling(false);
              setCountdown(0);
              stopRollingEffect();
              
              if (eventData.winner) {
                setWinnerInfo(eventData.winner);
                
                // ✅ FIX: Only show winner modal if not already shown (to prevent duplicates)
                if (!hasShownWinnerModalRef.current && isInStoreView) {
                  // Check if this giveaway win was already shown globally
                  const checkAndShowModal = async () => {
                    try {
                      const giveawayWinKey = `${dataGiveawayId}_${user?._id}`;
                      const shownWinsJson = await AsyncStorage.getItem(SHOWN_GIVEAWAY_WINS_KEY);
                      const shownWins = shownWinsJson ? JSON.parse(shownWinsJson) : [];
                      
                      if (!shownWins.includes(giveawayWinKey)) {
                        // Mark as shown globally
                        shownWins.push(giveawayWinKey);
                        await AsyncStorage.setItem(SHOWN_GIVEAWAY_WINS_KEY, JSON.stringify(shownWins));
                        
                        // Show the modal
                        hasShownWinnerModalRef.current = true;
                        setShowWinnerModal(true);
                        console.log('✅ [GiveawayComponent] Showing winner modal for:', giveawayWinKey);
                      } else {
                        console.log('🔄 [GiveawayComponent] Winner modal already shown for:', giveawayWinKey);
                      }
                    } catch (error) {
                      console.log('❌ [GiveawayComponent] Error checking shown wins:', error);
                      // Still show modal on error to ensure user sees it
                      hasShownWinnerModalRef.current = true;
                      setShowWinnerModal(true);
                    }
                  };
                  
                  checkAndShowModal();
                }
              }
              
              // Set giveaway as ended IMMEDIATELY before API call
              setIsGiveawayEnded(true);
              setIsGiveawayActive(false);
              
              // Then fetch fresh data from API for any additional details
              giveawayService.getGiveawayDetails(giveawayId)
                .then(response => {
                  if (response.success && response.data) {
                    setGiveawayDetails(response.data);
                    setIsGiveawayEnded(Boolean(response.data.isGiveawayEnded));
                    setIsGiveawayActive(Boolean(response.data.isActive));
                  }
                })
                .catch(error => {
                  console.log('Failed to refresh giveaway details:', error);
                });
              break;
            }
            
            case 'giveaway_ended': {
              // console.log('🔚 GiveawayComponent received giveaway ended:', eventData);
              
              const dataGiveawayId = eventData.giveawayId || eventData.giveaway?.giveawayObjectId || eventData.giveaway?._id;
              
              if (dataGiveawayId?.toString() !== giveawayId?.toString()) {
                console.log('❌ Giveaway ended not for our giveaway, ignoring');
                return;
              }
              
              setIsGiveawayEnded(true);
              setIsGiveawayActive(false);
              setIsRolling(false);
              setCountdown(0);
              stopRollingEffect();
              
              if (eventData.winner) {
                setWinnerInfo(eventData.winner);
              }
              break;
            }
            
            default:
              console.log('⚠️ [GiveawayComponent AppSync] Unknown event:', eventData.eventType);
          }
        });
        
        // console.log('✅ [GiveawayComponent] AppSync subscriptions active');
        
        // Cleanup function
        return () => {
          // console.log('🧹 [GiveawayComponent] Cleaning up AppSync subscriptions');
          closeChannel(channel);
        };
        
      } catch (error) {
        console.error('❌ [GiveawayComponent] Failed to setup AppSync:', error);
      }
    };

    const cleanup = setupAppSync();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [streamId, giveawayId, user?._id, stopRollingEffect]);

  // ===== Auto Follow Handler =====
  const handleAutoFollow = async (hostUserId) => {
    try {
      const followStatus = await checkFollowStatus(hostUserId);
      const isAlreadyFollowing = followStatus?.isFollowing || false;
      
      if (!isAlreadyFollowing) {
        await followUser(hostUserId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedFollowStatus = await checkFollowStatus(hostUserId);
        const isNowFollowing = updatedFollowStatus?.isFollowing || false;
        
        if (showData?.onFollowUpdate) {
          showData.onFollowUpdate(hostUserId, isNowFollowing);
        }
        
        return isNowFollowing;
      }
      
      return true;
    } catch (error) {
      console.log('Auto-follow failed:', error);
      return false;
    }
  };

  // ===== Helper to safely get product ID =====
  const getProductIdSafely = (productField) => {
    if (!productField) return null;
    if (typeof productField === 'object' && productField !== null && productField._id) {
      return productField._id.toString();
    }
    return productField.toString();
  };

  // ===== Apply to Giveaway =====
  const handleApplyGiveaway = async () => {
    if (!user) {
      Toast('Please log in to apply for the giveaway.');
      return;
    }

    if (!isGiveawayActive) {
      Toast('Seller has not started the giveaway yet.');
      return;
    }

    if (hasApplied) {
      Toast('You have already applied for this giveaway.');
      return;
    }

    setApplyLoading(true);

    try {
      const requireAutoFollow = giveawayDetails?.requireAutoFollow || false;
      
      if (requireAutoFollow) {
        const hostUserId = showData?.host?.userInfo?._id || null;
        
        if (hostUserId) {
          const followSuccess = await handleAutoFollow(hostUserId);
          
          if (followSuccess) {
            positive('Auto-followed seller for giveaway participation!');
            Toast('Auto-followed seller for giveaway participation!');
          }
        }
      }

      const response = await giveawayService.applyToGiveaway(giveawayId, user?._id);

      if (response && response.success) {
        setGiveawayDetails(prev => {
          const currentApplicants = prev?.applicants || [];
          const updatedApplicants = currentApplicants.includes(user?._id) 
            ? currentApplicants 
            : [...currentApplicants, user?._id];
          
          return {
            ...prev,
            applicants: updatedApplicants,
            stats: {
              ...prev?.stats,
              totalApplicants: updatedApplicants.length
            }
          };
        });
        
        setApplicantsList(prev => {
          if (prev.includes(user?._id)) {
            return prev;
          }
          return [...prev, user?._id];
        });
        
        positive('Successfully applied to giveaway! Good luck!');
        Toast('Successfully applied to giveaway! Good luck!');
        
        if (trackGiveawayEntry) {
          try {
            const productIdForTracking = getProductIdSafely(giveawayDetails?.productId) || giveawayId;
            await trackGiveawayEntry(productIdForTracking);
          } catch (trackingError) {
            console.log('❌ Failed to track giveaway entry:', trackingError);
          }
        }
      } else {
        const errorMessage = response?.error || response?.message || 'Failed to apply to giveaway';
        setIsEligible(false);
        setEligibilityMessage(errorMessage);
        showError(errorMessage);
        Toast(errorMessage);
      }
    } catch (error) {
      console.log('❌ Failed to apply to giveaway:', error);
      const errorMessage = error.response?.data?.error || 'Failed to apply to giveaway. Please try again.';
      setIsEligible(false);
      setEligibilityMessage(errorMessage);
      showError(errorMessage);
      Toast(errorMessage);
    } finally {
      setApplyLoading(false);
    }
  };

  // ===== Checkout Handlers =====
  const handleCheckoutClick = useCallback(() => {
    if (!giveawayDetails) {
      Toast("Giveaway details not loaded. Please try again.");
      return;
    }
    
    setShowWinnerGiveaway(true);
  }, [giveawayDetails]);

  const handleCloseCheckout = useCallback(() => {
    setShowWinnerGiveaway(false);
  }, []);

  const handleCheckoutComplete = useCallback(() => {
    setShouldRefreshOrderStatus(prev => !prev);
  }, []);

  // ===== Button State Logic =====
  const getButtonState = () => {
    if (isGiveawayEnded) {
      return {text: 'Giveaway Ended', disabled: true, show: false};
    }

    if (eligibilityStatus && !eligibilityStatus.eligible) {
      return {text: 'Not Eligible', disabled: true, show: true};
    }

    if (!isGiveawayActive) {
      return {text: 'Not Yet Active', disabled: true, show: true};
    }

    if (isRolling) {
      return {text: countdown > 0 ? `Rolling... ${countdown}s` : 'Rolling...', disabled: true, show: false};
    }

    if (applyLoading) {
      return {text: 'Applying...', disabled: true, show: true};
    }

    if (hasApplied) {
      return {text: 'Applied ✓', disabled: true, show: true};
    }

    if (isGiveawayActive && eligibilityStatus?.eligible) {
      return {text: 'Apply Now', disabled: false, show: true};
    }

    if (isGiveawayActive) {
      return {text: 'Apply Now', disabled: false, show: true};
    }

    return {text: 'Apply Now', disabled: false, show: true};
  };

  const buttonState = getButtonState();
  const currentTier = giveawayDetails?.giveawayTier || 'silver';
  const tierInfo = tierConfig[currentTier];
  const navigation = useNavigation();

  const isIneligibleUser = !isGiveawayEnded && eligibilityStatus && !eligibilityStatus.eligible;

  // ===== Create repeated names for scrolling =====
  const repeatedNames = useMemo(() => {
    if (!applicantsList || applicantsList.length === 0) return [];
    
    const names = [];
    const repeatCount = Math.max(8, Math.ceil(40 / applicantsList.length));
    
    for (let i = 0; i < repeatCount; i++) {
      applicantsList.forEach((applicant, index) => {
        const displayName = getApplicantName(applicant);
        names.push({
          id: `${i}-${index}-${applicant?._id || applicant}`,
          name: displayName,
          key: `${i}-${index}-${displayName}-${Math.random()}`
        });
      });
    }
    
    return names;
  }, [applicantsList, getApplicantName]);

  // ===== Animate scrolling participants =====
  useEffect(() => {
    if (isRolling && repeatedNames.length > 0) {
      const totalHeight = repeatedNames.length * 32; // 32px per item
      participantsScrollAnim.setValue(0);
      
      Animated.loop(
        Animated.timing(participantsScrollAnim, {
          toValue: -totalHeight / 2,
          duration: 12000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isRolling, repeatedNames.length, participantsScrollAnim]);

  // ===== Render Scrolling Participants =====
  const renderScrollingParticipants = () => {
    if (!applicantsList || applicantsList.length === 0) {
      return (
        <View style={styles.scrollingParticipantsEmpty}>
          <Text style={styles.emptyParticipantsText}>No participants yet...</Text>
        </View>
      );
    }

    return (
      <View style={styles.scrollingParticipantsContainer}>
        <Animated.View 
          style={[
            styles.scrollingContent,
            { transform: [{ translateY: participantsScrollAnim }] }
          ]}>
          {repeatedNames.map((item) => (
            <View key={item.key} style={styles.participantBubble}>
              <Text style={styles.participantBubbleText}>
                {item.name}
              </Text>
            </View>
          ))}
        </Animated.View>
        <LinearGradient
          colors={['rgba(28, 25, 23, 1)', 'transparent']}
          style={styles.scrollGradientTop}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(28, 25, 23, 1)']}
          style={styles.scrollGradientBottom}
          pointerEvents="none"
        />
      </View>
    );
  };
  
  return (
    <>
      {/* Winner Modal - Only show when in StoreView */}
      {isInStoreView && (
        <Modal
          visible={showWinnerModal}
          transparent
          animationType="fade"
          statusBarTranslucent>
        <View style={styles.winnerModalOverlay}>
          <View style={styles.winnerModalContainer}>
            <LinearGradient
              colors={['rgba(255, 193, 0, 0.05)', 'transparent', 'rgba(255, 193, 0, 0.05)']}
              style={styles.winnerModalGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
            />
            
            {/* Sparkles Decorations */}
            <View style={styles.sparkleTopLeft}>
              <Ionicons name="sparkles" size={16} color="#FFC100" />
            </View>
            <View style={styles.sparkleTopRight}>
              <Ionicons name="sparkles" size={12} color="#FFC100" />
            </View>
            
            {/* Trophy Icon */}
            <Animated.View 
              style={[
                styles.winnerTrophyContainer,
                { transform: [{ scale: winnerPulseAnim }] }
              ]}>
              <LinearGradient
                colors={['#FFD700', '#FFC107']}
                style={styles.winnerTrophyCircle}>
                <Ionicons name="trophy" size={32} color="#000" />
              </LinearGradient>
              <View style={styles.trophyGlow} />
            </Animated.View>

            {/* Title */}
            <Text style={styles.winnerModalTitle}>
              {checkIfCurrentUserIsWinner(winnerInfo) ? 'Congratulations!' : 'Winner Selected!'}
            </Text>

            {/* Winner Badge */}
            <View style={[
              styles.winnerBadge,
              checkIfCurrentUserIsWinner(winnerInfo) && styles.winnerBadgeGreen
            ]}>
              <Text style={styles.winnerBadgeText}>
                {checkIfCurrentUserIsWinner(winnerInfo) 
                  ? '🎉 You are the Winner!' 
                  : `Winner: ${winnerInfo?.displayName || winnerInfo?.userName || winnerInfo?.name || 'Winner'}`
                }
              </Text>
            </View>

            {/* Product Won */}
            {giveawayDetails?.productTitle && (
              <View style={styles.productWonContainer}>
                <View style={styles.productWonHeader}>
                  <Ionicons name="gift" size={14} color="#FFC100" />
                  <Text style={styles.productWonLabel}>Won Product</Text>
                </View>
                <Text style={styles.productWonTitle}>
                  {giveawayDetails.productTitle}
                </Text>
              </View>
            )}

            {/* Sponsor Section */}
            {giveawayDetails?.isSponsored && giveawayDetails?.sponsorId && (
              <TouchableOpacity
                onPress={() => {
                  const userName = giveawayDetails.sponsorId?.userInfo?.userName;
                  if (userName) {
                    setShowWinnerModal(false);
                    navigation.navigate('ViewSellerProdile' as never, { id: userName } as never);
                  }
                }}
                style={styles.winnerSponsorContainer}>
                <Image
                  source={{
                    uri: giveawayDetails.sponsorId?.userInfo?.profileURL?.key
                      ? `${AWS_CDN_URL}${giveawayDetails.sponsorId.userInfo.profileURL.key}`
                      : 'https://via.placeholder.com/32'
                  }}
                  style={styles.winnerSponsorAvatar}
                />
                <View style={styles.winnerSponsorInfo}>
                  <Text style={styles.winnerSponsorLabel}>★ SPONSORED</Text>
                  <Text style={styles.winnerSponsorName} numberOfLines={1}>
                    {giveawayDetails.sponsorId?.companyName || 'Sponsor'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#FFD700" />
              </TouchableOpacity>
            )}

            {/* Congrats Message */}
            <View style={styles.congratsContainer}>
              <Text style={styles.congratsText}>
                {checkIfCurrentUserIsWinner(winnerInfo)
                  ? '🎊 Check your notifications for claim instructions!'
                  : `🎉 Congratulations to ${winnerInfo?.displayName || winnerInfo?.userName || 'the winner'}!`
                }
              </Text>
            </View>

            {/* Auto Close Countdown */}
            {/* <View style={styles.autoCloseContainer}>
              <Text style={styles.autoCloseText}>
                Closes in {formatCountdownTime(autoCloseCountdown)}
              </Text>
            </View> */}
              {checkIfCurrentUserIsWinner(winnerInfo) && (
            <TouchableOpacity
              style={[
                styles.winnerCloseButton,
                styles.claimButtonCompact,
                (hasOrderedPrize || orderCheckLoading) && styles.claimButtonDisabled
              ]}
              disabled={hasOrderedPrize || orderCheckLoading}
              activeOpacity={0.2}
              onPress={handleCheckoutClick}>
              {orderCheckLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.claimButtonText}>Checking...</Text>
                </>
              ) : hasOrderedPrize ? (
                <>
                  <ShoppingBag size={14} color="#fff" />
                  <Text style={styles.claimButtonText}>Prize Claimed ✓</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} color="#fff" />
                  <Text style={styles.claimButtonText}>Claim Your Prize</Text>
                </>
              )}
            </TouchableOpacity>
          )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.winnerCloseButton}
              onPress={() => setShowWinnerModal(false)}>
              <X size={16} color="#FFF" />
              <Text style={styles.winnerCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </Modal>
      )}

      {/* Rolling Modal - Only show when in StoreView */}
      {isInStoreView && (
        <Modal
          visible={isRolling && countdown > 0}
          transparent
          animationType="fade"
          statusBarTranslucent>
        <View style={styles.rollingModalOverlay}>
          <View style={styles.rollingModalContainer}>
            <LinearGradient
              colors={['rgba(255, 193, 0, 0.05)', 'transparent', 'rgba(255, 193, 0, 0.05)']}
              style={styles.rollingModalGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
            />
            
            {/* Clock Icon */}
            <Animated.View 
              style={[
                styles.rollingIconContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}>
              <LinearGradient
                colors={['#FFC100', '#EAB308']}
                style={styles.rollingIcon}>
                <Ionicons name="time" size={28} color="#000" />
              </LinearGradient>
            </Animated.View>

            {/* Title */}
            <Text style={styles.rollingTitle}>Rolling for Winner</Text>

            {/* Countdown */}
            <Animated.View 
              style={[
                styles.countdownContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <View style={styles.countdownLine} />
            </Animated.View>

            {/* Participants Section */}
            <View style={styles.participantsLabelContainer}>
              <Text style={styles.participantsLabel}>Live Participants:</Text>
            </View>
            
            {renderScrollingParticipants()}

            {/* Bottom Text */}
            <View style={styles.rollingBottomText}>
              <Ionicons name="sparkles" size={14} color="#FFC100" />
              <Text style={styles.selectingText}>Selecting winner...</Text>
              <Ionicons name="sparkles" size={14} color="#FFC100" />
            </View>
          </View>
        </View>
        </Modal>
      )}

      <View style={[
        styles.compactContainer,
        isIneligibleUser && styles.ineligibleBorder
      ]}>
      {/* Product Info Header */}
      <TouchableOpacity 
          onPress={() => {
              navigation.navigate('ProductDetails', { id: giveawayDetails?.productDetails?._id });
          }} style={styles.productHeader}>
        <Image
          source={{uri: imageUrl || 'https://via.placeholder.com/48'}}
          style={styles.productImageSmall}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productNameSmall} numberOfLines={3}>
            {giveawayDetails?.productTitle || 'Unknown Product'}
          </Text>
          <Text style={styles.productCategory} numberOfLines={1}>
            {giveawayDetails?.productDetails?.category || 'Giveaway'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Sponsor Section */}
      {giveawayDetails?.isSponsored && giveawayDetails?.sponsorId && (
        <TouchableOpacity 
          onPress={() => {
            const userName = giveawayDetails.sponsorId?.userInfo?.userName;
            if (userName) {
              navigation.navigate('ViewSellerProdile' as never, { id: userName } as never);
            }
          }}
          style={styles.sponsorCompact}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 193, 0, 0.05)']}
            style={styles.sponsorGradient}>
            <Image
              source={{
                uri: giveawayDetails.sponsorId?.userInfo?.profileURL?.key
                  ? `${AWS_CDN_URL}${giveawayDetails.sponsorId.userInfo.profileURL.key}`
                  : 'https://via.placeholder.com/28'
              }}
              style={styles.sponsorAvatarSmall}
            />
            <View style={styles.sponsorInfoCompact}>
              <Text style={styles.sponsorLabelSmall}>SPONSORED BY</Text>
              <Text style={styles.sponsorNameSmall} numberOfLines={1}>
                {giveawayDetails.sponsorId?.companyName || 'Sponsor'}
              </Text>
            </View>
            <ChevronRight size={12} color="#FFD700" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Tier and Status Row */}
      <View style={styles.tierStatusRow}>
        {tierInfo && (
          <View style={styles.tierBadgeCompact}>
            <Text style={styles.tierIcon}>{tierInfo.icon}</Text>
            <Text style={styles.tierLabelSmall}>{tierInfo.label}</Text>
          </View>
        )}

        {/* Status Badge */}
        {!isGiveawayEnded && !isGiveawayActive && !isRolling && (
          <View style={[styles.statusBadgeCompact, styles.notStartedBadge]}>
            <View style={[styles.statusDotSmall, {backgroundColor: '#9CA3AF'}]} />
            <Text style={[styles.statusTextSmall, {color: '#D1D5DB'}]}>Not Started</Text>
          </View>
        )}

        {isGiveawayEnded && (
          <View style={[styles.statusBadgeCompact, styles.endedBadgeCompact]}>
            <View style={[styles.statusDotSmall, {backgroundColor: '#EF4444'}]} />
            <Text style={[styles.statusTextSmall, {color: '#FCA5A5'}]}>Ended</Text>
          </View>
        )}

        {!isGiveawayEnded && isGiveawayActive && !isRolling && (
          <View style={[styles.statusBadgeCompact, styles.activeBadgeCompact]}>
            <View style={[styles.statusDotSmall, {backgroundColor: '#10B981'}]} />
            <Text style={[styles.statusTextSmall, {color: '#86EFAC'}]}>Active</Text>
          </View>
        )}

        {isRolling && (
          <View style={[styles.statusBadgeCompact, styles.rollingBadgeCompact]}>
            <View style={[styles.statusDotSmall, {backgroundColor: '#FFC100'}]} />
            <Text style={[styles.statusTextSmall, {color: '#FDE68A'}]}>Rolling...</Text>
          </View>
        )}
      </View>

      {/* Winner Section */}
      {isGiveawayEnded && winnerInfo && (
        <View style={styles.winnerSectionCompact}>
          <View style={styles.winnerHeaderCompact}>
            <Text style={styles.winnerCrown}>👑</Text>
            <Text style={styles.winnerTitleCompact}>Giveaway Winner</Text>
          </View>
 <TouchableOpacity
                onPress={() => {
                  const userName =winnerInfo?.userName;
                  if (userName) {
                    setShowWinnerModal(false);
                    navigation.navigate('ViewSellerProdile' as never, { id: userName } as never);
                  }
                }} activeOpacity={0.1}>
          <Text style={styles.winnerNameCompact} numberOfLines={1}>
            {winnerInfo?.displayName || winnerInfo?.userName || winnerInfo?.name || 'Winner Selected'}
          </Text></TouchableOpacity>

          {checkIfCurrentUserIsWinner(winnerInfo) && (
            <TouchableOpacity
              style={[
                styles.claimButtonCompact,
                (hasOrderedPrize || orderCheckLoading) && styles.claimButtonDisabled
              ]}
              disabled={hasOrderedPrize || orderCheckLoading}
              activeOpacity={0.2}
              onPress={handleCheckoutClick}>
              {orderCheckLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.claimButtonText}>Checking...</Text>
                </>
              ) : hasOrderedPrize ? (
                <>
                  <ShoppingBag size={14} color="#fff" />
                  <Text style={styles.claimButtonText}>Prize Claimed ✓</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} color="#fff" />
                  <Text style={styles.claimButtonText}>Claim Your Prize</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.winnerDivider} />

          <View style={styles.winnerStatsCompact}>
            <View style={styles.winnerStatItem}>
              <Text style={styles.winnerStatLabel}>Participants</Text>
              <Text style={styles.winnerStatValue}>{applicantsList.length}</Text>
            </View>
            {giveawayDetails?.endedAt && (
              <View style={styles.winnerStatItem}>
                <Text style={styles.winnerStatLabel}>Finished</Text>
                <Text style={styles.winnerStatValue}>
                  {new Date(giveawayDetails.endedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* No Winner Message */}
      {isGiveawayEnded && !winnerInfo && (
        <View style={styles.noWinnerSection}>
          <Text style={styles.noWinnerTitle}>⚠️ Giveaway Ended</Text>
          <Text style={styles.noWinnerText}>
            This giveaway has ended without a winner being selected.
          </Text>
        </View>
      )}

      {/* Eligibility Warning */}
      {!isEligible && eligibilityMessage && (
        <View style={styles.eligibilityWarning}>
          <Ionicons name="alert-circle" size={16} color="#FCA5A5" />
          <Text style={styles.eligibilityWarningText}>{eligibilityMessage}</Text>
        </View>
      )}

      {/* Participants Counter */}
      {applicantsList.length > 0 && !isGiveawayEnded && (
        <View style={styles.participantsSection}>
          <View style={styles.participantsHeader}>
            <Ionicons name="people" size={20} color="#EAB308" />
            <Text style={styles.participantsTitle}>No of Participants</Text>
          </View>
          <View style={styles.participantsDivider} />
          <Text style={styles.participantsCount}>{applicantsList.length}</Text>
        </View>
      )}

      {/* Apply Button */}
      {buttonState?.show && (
        <TouchableOpacity
          style={[
            styles.applyButtonCompact,
            buttonState.disabled && styles.applyButtonDisabled
          ]}
          onPress={handleApplyGiveaway}
          disabled={buttonState.disabled || applyLoading}>
          {applyLoading || isRolling ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="gift" size={14} color="#000" />
          )}
          <Text style={styles.applyButtonText}>
            {applyLoading ? 'Applying...' : buttonState.text}
          </Text>
        </TouchableOpacity>
      )}

      {/* Checkout Slider */}
      <GiveawayCheckoutSlider
        isOpen={showWinnerGiveaway}
        onClose={handleCloseCheckout}
        winnerInfo={winnerInfo}
        giveawayId={giveawayId}
        streamId={streamId}
        giveawayProduct={giveawayDetails?.productDetails}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    backgroundColor: 'rgba(28, 25, 23, 0.95)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 113, 108, 0.3)',
  },
  ineligibleBorder: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImageSmall: {
    width: 68,
    height: 68,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  productInfo: {
    flex: 1,
  },
  productNameSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productCategory: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  sponsorCompact: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sponsorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  sponsorAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  sponsorInfoCompact: {
    flex: 1,
  },
  sponsorLabelSmall: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sponsorNameSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tierStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tierIcon: {
    fontSize: 16,
  },
  tierLabelSmall: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  notStartedBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.5)',
  },
  endedBadgeCompact: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  activeBadgeCompact: {
    backgroundColor: 'rgba(16, 185, 129, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  rollingBadgeCompact: {
    backgroundColor: 'rgba(255, 193, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.5)',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
  winnerSectionCompact: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  winnerHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  winnerCrown: {
    fontSize: 16,
  },
  winnerTitleCompact: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
  },
  winnerNameCompact: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  claimButtonCompact: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal:20,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  claimButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  winnerDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  winnerStatsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  winnerStatItem: {
    alignItems: 'center',
  },
  winnerStatLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 4,
  },
  winnerStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  noWinnerSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  noWinnerTitle: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  noWinnerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  eligibilityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  eligibilityWarningText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  participantsSection: {
    borderWidth: 2,
    borderColor: '#EAB308',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  participantsTitle: {
    color: '#EAB308',
    fontSize: 14,
    fontWeight: '700',
  },
  participantsDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  participantsCount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  applyButtonCompact: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal:20,  
    borderRadius: 20,
    gap: 6,
  },
  applyButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.5,
  },
  applyButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  // Rolling Modal Styles
  rollingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  rollingModalContainer: {
    backgroundColor: 'rgba(28, 25, 23, 0.98)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  rollingModalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rollingIconContainer: {
    marginBottom: 16,
    shadowColor: '#FFC100',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  rollingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rollingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFC100',
    marginBottom: 8,
  },
  countdownLine: {
    width: 48,
    height: 2,
    backgroundColor: '#FFC100',
    borderRadius: 1,
  },
  participantsLabelContainer: {
    marginBottom: 8,
  },
  participantsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  scrollingParticipantsContainer: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.2)',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollingParticipants: {
    flex: 1,
  },
  scrollingContent: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  participantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.3)',
  },
  participantBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  scrollGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  scrollingParticipantsEmpty: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.2)',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyParticipantsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  rollingBottomText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  // Winner Modal Styles
  winnerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  winnerModalContainer: {
    backgroundColor: 'rgba(28, 25, 23, 0.98)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  winnerModalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  winnerTrophyContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerTrophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  trophyGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 193, 0, 0.2)',
    top: -9,
  },
  winnerModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  winnerBadge: {
    backgroundColor: 'rgba(255, 193, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  winnerBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  winnerBadgeText: {
    color: '#FFC100',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  productWonContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  productWonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  productWonLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  productWonTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  winnerSponsorContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 0, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  winnerSponsorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerSponsorInfo: {
    flex: 1,
  },
  winnerSponsorLabel: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  winnerSponsorName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  congratsContainer: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  congratsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  autoCloseContainer: {
    marginBottom: 12,
  },
  autoCloseText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
  winnerCloseButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  winnerCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GiveawayComponent;
