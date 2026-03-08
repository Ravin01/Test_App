import React, {useCallback, useContext, useEffect, useState, useRef} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator} from 'react-native';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {useNavigation} from '@react-navigation/native';
import {Trophy, AlertCircle} from 'lucide-react-native';
import {AuthContext} from '../../../Context/AuthContext';
import axiosInstance from '../../../Utils/Api';
import AuctionCheckoutSlider from '../Payment/AuctionCheckout';
import bgaAxiosInstance from '../../../Utils/bgaAxiosInstance';
import { Toast } from '../../../Utils/dateUtils';
import { connectToChannel,
  getAuctionsChannelPath,
  subscribeToChannel,
  closeChannel } from '../../../Utils/appSyncConfig';

const AuctionComponent = ({item, streamId, currentAuction}) => {
  const imageUrl = item?.productId?.images?.[0]?.key
    ? `${AWS_CDN_URL}${item.productId?.images[0].key}`
    : null;
    // console.log(imageUrl)
  const navigation = useNavigation();
  const {user} = useContext(AuthContext);

  // ✅ State variables (from web app)
  const [isActive, setIsActive] = useState(false);
  const [hasOrderedPrize, setHasOrderedPrize] = useState(false);
  const [orderCheckLoading, setOrderCheckLoading] = useState(false);
  const [isAuctionWinner, setIsAuctionWinner] = useState(false);
  const [bidderWon, setBidderWon] = useState(null);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [auctionWinnerData, setAuctionWinnerData] = useState(null);
  const [currentAuctionId, setCurrentAuctionId] = useState(null);
  const [shouldRefreshOrderStatus, setShouldRefreshOrderStatus] = useState(false);


  // ✅ Get correct IDs (from web app logic)
  const productId = item?.productId?._id || item?._id;
  const myAuctionId = item?._id || item?.auctionObjectId || item?.auctionId;
  
  // ✅ Use refs to maintain stable references for socket handlers
  const myAuctionIdRef = useRef(myAuctionId);
  const highestBidRef = useRef(highestBid);
  const winnerAuctionIdRef = useRef(null); // ✅ Track WHICH specific auction has winner data
   // ✅ NEW: Pre-bid states
  const [preBids, setPreBids] = useState([]);
  const [highestPreBid, setHighestPreBid] = useState(0);
  const [preBidCount, setPreBidCount] = useState(0);
  const [myPreBid, setMyPreBid] = useState(null);
  const [loadingPreBid, setLoadingPreBid] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState(''); // User's custom input
  const [bidError, setBidError] = useState(''); // Error message for validation
  const [liveBidError, setLiveBidError] = useState(''); // Error message for live auction bids
  
  // ✅ FIX: Use ref for smooth input without re-render interruptions
  const customBidInputRef = useRef('');
  
  const channelRef = useRef(null);
  const subscriptionRef = useRef(null);
  // ✅ NEW: Pre-bid animation states (inline, no modal)
  const [isShowingPreBidAnimation, setIsShowingPreBidAnimation] = useState(false);
  const [animatedPreBidAmount, setAnimatedPreBidAmount] = useState(0);
  const [animatedPreBidder, setAnimatedPreBidder] = useState(null)
  // Keep refs in sync
  useEffect(() => {
    // ✅ CRITICAL: If myAuctionId changed to a different auction, clear winner protection AND state
    if (myAuctionIdRef.current && myAuctionIdRef.current !== myAuctionId) {
      // console.log('🔄 Auction ID changed from', myAuctionIdRef.current, 'to', myAuctionId, '- resetting component state');
      winnerAuctionIdRef.current = null;
      
      // Clear all auction state for the old auction
      setBidderWon(null);
      setAuctionWinnerData(null);
      setCurrentAuctionId(null);
      setIsActive(false);
      setHighestBid(0);
      setHighestBidder(null);
    }
    myAuctionIdRef.current = myAuctionId;
  }, [myAuctionId]);
  
  useEffect(() => {
    highestBidRef.current = highestBid;
  }, [highestBid]);

  // ✅ Load auction data from API/props (from web app)
  useEffect(() => {
    if (item) {
      const product =item;
         // ✅ Load pre-bid data from consolidated API response
      if (product.preBidData) {
        setPreBids(product.preBidData.preBids || []);
        setHighestPreBid(product.preBidData.highestPreBid || 0);
        setPreBidCount(product.preBidData.preBidCount || 0);
        setMyPreBid(product.preBidData.userPreBid || null);
        
      }
      
      if (item.isAuctionEnded) {
        setIsActive(false);
        setHighestBid(item.winningBid || item.currentHighestBid || 0);
        setHighestBidder(item.highestBidder || null);
        setBidderWon(item.bidderWon || item.winner || null);
        
        const hasWinner = item.winner || item.bidderWon;
        
        setAuctionWinnerData({
          winner: hasWinner,
          winningBid: item.winningBid || item.currentHighestBid,
          reserveMet: item.reserveMet,
          auctionId: item._id
        });
        
        // ✅ CRITICAL: Store the specific auction ID that has winner data
        if (hasWinner) {
          winnerAuctionIdRef.current = item._id;
          console.log('✅ Auction ended - loaded winner from API for auction:', item._id);
        } else {
          console.log('✅ Auction ended - no winner data, allowing updates');
        }
      } else if (item.isActive) {
        setIsActive(true);
        setHighestBid(item.currentHighestBid || 0);
        setHighestBidder(item.highestBidder || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id, item?.isAuctionEnded, item?.winner, item?.bidderWon]);

  // ✅ FIXED: Sync with currentAuction prop whenever it changes
  useEffect(() => {
    if (currentAuction && currentAuction.auctionId === myAuctionId) {
      
      setHighestBid(currentAuction?.currentHighestBid || 0);
      setHighestBidder(currentAuction?.highestBidder || null);
      setIsActive(currentAuction?.isActive || false);
      setBidderWon(currentAuction?.bidderWon || null);
    }
  }, [currentAuction, myAuctionId]); // ✅ Re-run when currentAuction changes

  // ✅ Fetch pre-bids on mount
  useEffect(() => {
    fetchPreBids();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Initial data comes from consolidated API (product.preBidData)
  const fetchPreBids = useCallback(async () => {
    if (!myAuctionId) return;
    
    try {
      const response = await bgaAxiosInstance.get(`api/auctions/${myAuctionId}/pre-bids`);
      if (response.data.success) {
        setPreBids(response.data.data.preBids || []);
        setHighestPreBid(response.data.data.highestPreBid || 0);
        setPreBidCount(response.data.data.preBidCount || 0);
        
        // Check if current user has a pre-bid
        if (user && response.data.data.preBids) {
          const userPreBid = response.data.data.preBids.find(
            pb => pb.user._id === user._id
          );
          setMyPreBid(userPreBid || null);
        }
      }
    } catch (error) {
      console.log('Failed to fetch pre-bids:', error);
    }
  }, [myAuctionId, user]);

  // ✅ FIX: Handle text change without causing re-renders
  const handleBidInputChange = useCallback((text) => {
    customBidInputRef.current = text;
    setCustomBidAmount(text);
    setBidError('');
  }, []);

  // ✅ UPDATED: Validate and place pre-bid with INCREMENT logic
  const handlePlacePreBid = useCallback(async () => {
    // console.log('💰 Attempting to place pre-bid with increment amount:', customBidAmount);
    if (!user) {
      Toast('Please login to place a bid');
      return;
    }
    
    // Get increment amount from input (use ref for most current value)
    const inputValue = customBidInputRef.current || customBidAmount;
    const incrementAmount = parseFloat(inputValue);
    
    // Validation
    if (!inputValue || isNaN(incrementAmount)) {
      setBidError('Please enter a valid increment amount');
      return;
    }
    
    // Minimum increment is ₹10
    if (incrementAmount < 10) {
      setBidError('Minimum increment is ₹10');
      return;
    }
    if (incrementAmount % 10 !== 0) {
      setBidError('Only multiples of 10 are allowed (10, 20, 30, etc.)');
      return;
    }
    // Calculate final bid amount: current highest + increment
    const currentHighest = highestPreBid > 0 ? highestPreBid : (item?.startingBid || 0);
    const finalBidAmount = currentHighest + incrementAmount;
    

    // Clear any previous errors
    setBidError('');
    
    setLoadingPreBid(true);
    try {
      const response = await bgaAxiosInstance.post('api/auctions/pre-bid', {
        auctionId: myAuctionId,
        amount: finalBidAmount // Send the calculated final amount
      });
      
      if (response.data.success) {
        console.log('✅ Pre-bid placed successfully:', finalBidAmount);
        customBidInputRef.current = '';
        setCustomBidAmount(''); // Clear input after success
        // No need to fetch - socket will update automatically
      }
    } catch (error) {
      console.log('Failed to place pre-bid:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place pre-bid';
      setBidError(errorMsg);
    } finally {
      setLoadingPreBid(false);
    }
  }, [user, customBidAmount, highestPreBid, item?.startingBid, myAuctionId]);

  // ✅ Helper function for bid state updates 
  const updateBidState = useCallback((data) => {
    // console.log('🔄 updateBidState called with:', data?.highestBid);
    
    setHighestBid(prev => {
      // console.log('💰 Updating highestBid from', prev, 'to', data?.highestBid);
      return data?.highestBid ?? prev;
    });
    
    setHighestBidder(prev => {
      // console.log('👤 Updating highestBidder to:', data?.highestBidder?.name);
      return data?.highestBidder ?? prev;
    });
  }, []);

  // ✅ Optimized throttle references
  const lastBidUpdate = useRef(0);
  const pendingBidUpdate = useRef(null);
  const bidUpdateTimer = useRef(null);


  // AppSync subscription effect - replaces socket listeners
  useEffect(() => {
    if (!streamId || !productId) return;
    
    let channel = null;
    let subscription = null;

    const setupAppSyncSubscription = async () => {
      try {
        // console.log('🔌 Connecting to AppSync auctions channel:', streamId);
        
        // Connect to the auctions channel for this stream
        channel = await connectToChannel(getAuctionsChannelPath(streamId));
        channelRef.current = channel;
        
      
        
        // Subscribe to auction events
        subscription = subscribeToChannel(
          channel,
          (eventData) => {
         
            // Handle multiple possible event structures
            let eventType;
            let data;
            
            if (eventData?.eventType) {
              // Direct: {eventType: 'xxx', ...}
              eventType = eventData.eventType;
              data = eventData;
              // console.log('✅ Using direct structure');
            } else if (eventData?.event?.eventType) {
              // Single nest: {event: {eventType: 'xxx', ...}}
              eventType = eventData.event.eventType;
              data = eventData.event;
              // console.log('✅ Using single-nested structure');
            } else if (eventData?.event?.event?.eventType) {
              // Double nest: {event: {event: {eventType: 'xxx', ...}}}
              eventType = eventData.event.event.eventType;
              data = eventData.event.event;
              // console.log('✅ Using double-nested structure');
            } else {
              console.warn('⚠️ Unknown event structure, skipping');
              return;
            }
            
            // console.log('📨 Processed event:', eventType, data);
            
            // Ignore frontend command events (only handle backend response events)
            const frontendCommands = ['start_auction', 'place_bid', 'clear_auction'];
            if (frontendCommands.includes(eventType)) {
              // console.log('⏭️ Ignoring f/rontend command echo:', eventType);
              return;
            }
            
            // Route events to appropriate handlers
            switch (eventType) {
              case 'auction_started':
                handleAuctionStarted(data);
                break;
              case 'timer_update':
                handleTimerUpdate(data);
                break;
              case 'bid_updated':
                handleBidUpdated(data);
                break;
              case 'pre_bid_updated':
                handlePreBidUpdated(data);
                break;
              case 'auction_ended':
                handleAuctionEnded(data);
                break;
              case 'bid_rejected':
                handleBidRejected(data);
                break;
              case 'clear_auction':
                handleClearScreen(data);
                break;
              default:
                console.log('Unknown auction event type:', eventType);
            }
          },
          (error) => {
            console.error('❌ AppSync subscription error:', error);
          }
        );
        
        subscriptionRef.current = subscription;
        
        // console.log('✅ AppSync auction subscription established');
      } catch (error) {
        console.error('❌ Failed to setup AppSync subscription:', error);
      }
    };

  
    const handleAuctionStarted = (data) => {
      // console.log('🎬 auctionStarted:', data.auctionId);
      
      // ✅ Match by auctionId, NOT productId
      if (data.auctionId !== myAuctionIdRef.current) return;
      
      // ✅ CRITICAL FIX: Only block if THIS SPECIFIC auction ID already has winner data
      // Allow new auctions with different IDs to start
      if (winnerAuctionIdRef.current && winnerAuctionIdRef.current === data.auctionId) {
        console.log('⚠️ Ignoring auctionStarted - this specific auction already ended with winner');
        return;
      }
      
      // ✅ New auction starting - clear previous winner data for this component
      winnerAuctionIdRef.current = null;
      
      setCurrentAuctionId(data.auctionId);
      
      // ✅ NEW: Handle pre-bid history animation
      if (data.hasPreBids && data.preBidHistory && data.preBidHistory.length > 0) {
        console.log('🎬 Starting inline pre-bid animation with', data.preBidHistory.length, 'bids');
        
        setIsShowingPreBidAnimation(true);
        setIsActive(true);
        setAnimatedPreBidAmount(data.originalStartingBid || data.startingBid);
        setAnimatedPreBidder(null);
        
        const totalAnimationTime = 2000;
        const msPerBid = Math.max(150, totalAnimationTime / data.preBidHistory.length);
        
        let currentIndex = 0;
        const animationInterval = setInterval(() => {
          if (currentIndex < data.preBidHistory.length) {
            const currentBid = data.preBidHistory[currentIndex];
            setAnimatedPreBidAmount(currentBid.amount);
            setAnimatedPreBidder(currentBid.user);
            currentIndex++;
          } else {
            clearInterval(animationInterval);
            setIsShowingPreBidAnimation(false);
            
            setHighestBid(data.startingBid);
            
            if (data.preBidHistory && data.preBidHistory.length > 0) {
              const lastPreBid = data.preBidHistory[data.preBidHistory.length - 1];
              setHighestBidder(lastPreBid.user);
            } else {
              setHighestBidder(data.initialBidder ? { _id: data.initialBidder } : null);
            }
            
            setIsActive(true);
          }
        }, msPerBid);
      } else {
        setHighestBid(data.startingBid);
        setIsActive(true);
        setHighestBidder(null);
      }
    };

    const handleTimerUpdate = (data) => {
      if (data.auctionId !== myAuctionIdRef.current) return;
      
      // ✅ Only block timer updates for the specific auction that ended
      if (winnerAuctionIdRef.current && winnerAuctionIdRef.current === data.auctionId) {
        return;
      }
      
      if (data.remainingTime !== undefined) {
        setIsActive(data.remainingTime > 0);
      }
    };

    const handleAuctionEnded = (data) => {
      // console.log('🏁 auctionEnded:', data);
      
      if (data.auctionId !== myAuctionIdRef.current) return;
      
      setIsActive(false);
      
      const winner = data?.winner || data?.highestBidder || data?.bidderWon;
      const winningBid = data?.winningBid || data?.highestBid || highestBidRef.current;
      
      setBidderWon(winner);
      setHighestBid(winningBid);
      
      // ✅ Set complete auction winner data immediately
      if (winner) {
        const completeWinnerData = {
          winner: winner,
          winningBid: winningBid,
          reserveMet: data?.reserveMet,
          auctionId: data?.auctionId || myAuctionIdRef.current
        };
        
        setAuctionWinnerData(completeWinnerData);
        winnerAuctionIdRef.current = data?.auctionId || myAuctionIdRef.current; // ✅ Store specific auction ID
      }
    };

    const handleClearScreen = (data) => {
      // ✅ CRITICAL FIX: Only clear if this auction is targeted or no specific auction ID
      // If data.auctionId exists and doesn't match, ignore the clear
      if (data?.auctionId && data.auctionId !== myAuctionIdRef.current) return;
      
      // ✅ Only protect the specific auction that ended with winner
      if (winnerAuctionIdRef.current && (!data?.auctionId || data.auctionId === winnerAuctionIdRef.current)) {
        // console.log('⚠️ Ignoring clrScr - auction', winnerAuctionIdRef.current, 'already ended with winner');
        return;
      }
      
      // Only clear if this is a global clear (no auctionId) or specifically for this auction
      setHighestBid(0);
      setHighestBidder(null);
      setBidderWon(null);
      setIsActive(false);
      setAuctionWinnerData(null);
      setCurrentAuctionId(null);
    };

    // ✅ Optimized throttled bid update (from web app)
    const handleBidUpdated = (data) => {
      if (data.auctionId !== myAuctionIdRef.current||!user?._id ) return;
      
      // ✅ Only block bids for the specific auction that ended
      if (winnerAuctionIdRef.current && winnerAuctionIdRef.current === data.auctionId) {
        return;
      }
     
      const now = Date.now();
      const timeSinceLastUpdate = now - lastBidUpdate.current;
      
      pendingBidUpdate.current = data;
       setPreBidCount(data.preBidCount || 0);
      setPreBids(data.preBids || []);
         if (user && data.preBids) {
        const userPreBid = data.preBids.find(
          pb => pb.user?._id === user?._id || pb.user?.id === user?._id
        );
        setMyPreBid(userPreBid || null);
        // console.log('👤 User pre-bid updated:', userPreBid ? `₹${userPreBid.amount}` : 'none');
      }
      
      // Throttle to 50ms intervals
      if (timeSinceLastUpdate < 50) {
        if (bidUpdateTimer.current) {
          clearTimeout(bidUpdateTimer.current);
        }
        
        bidUpdateTimer.current = setTimeout(() => {
          if (pendingBidUpdate.current) {
            updateBidState(pendingBidUpdate.current);
            pendingBidUpdate.current = null;
            lastBidUpdate.current = Date.now();
          }
        }, 50 - timeSinceLastUpdate);
        return;
      }
      
      updateBidState(data);
      lastBidUpdate.current = now;
    };

    // ✅ NEW: Handle real-time pre-bid updates
    const handlePreBidUpdated = (data) => {
 
      if (data.auctionId !== myAuctionIdRef.current) {
        // console.log('⚠️ Pre-bid update not for this auction, ignoring');
        return;
      }
      
      // console.log('✅ Pre-bid update matches - updating ALL pre-bid data from socket');
      
      setHighestPreBid(data.highestPreBid || 0);
      setPreBidCount(data.preBidCount || 0);
      setPreBids(data.preBids || []);
      
      if (user && data.preBids) {
        const userPreBid = data.preBids.find(
          pb => pb.user._id === user._id || pb.user.id === user._id
        );
        setMyPreBid(userPreBid || null);
        console.log('👤 User pre-bid updated:', userPreBid ? `₹${userPreBid.amount}` : 'none');
      }
      
      
    };

    const handleBidRejected = (data) => {
      // console.log('⚠️ Bid validation:', data.message);
      setLiveBidError(data.message);
      
      setTimeout(() => {
        setLiveBidError('');
      }, 5000);
    };

    setupAppSyncSubscription();

    return () => {
      // console.log('🧹 Cleaning up AppSync subscription');
      
      if (subscription) {
        subscription.unsubscribe();
      }
      
      if (channel) {
        closeChannel(channel);
      }
      
      channelRef.current = null;
      subscriptionRef.current = null;
    };
  }, [streamId, productId, bidderWon, auctionWinnerData, myAuctionId, updateBidState, user, highestBid]);

  // ✅ Check order status (from web app logic with correct auctionId)
  const checkAuctionOrderStatus = useCallback(async () => {
    const auctionId = currentAuction?.auctionId || auctionWinnerData?.auctionId || currentAuctionId;

    // console.log('🔹 Checking order for auctionId:', auctionId);

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
      Toast(error.response?.data?.message || 'Failed to check order status');
      setHasOrderedPrize(false);
    } finally {
      setOrderCheckLoading(false);
    }
  }, [currentAuction, auctionWinnerData, currentAuctionId, user]);

  // ✅ Check order when winner is determined (from web app)
  useEffect(() => {
    const isWinner = user?._id === (bidderWon?._id || auctionWinnerData?.winner?._id);
    if (isWinner && (bidderWon || auctionWinnerData?.winner)) {
      checkAuctionOrderStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidderWon, auctionWinnerData?.winner, shouldRefreshOrderStatus]);

  // ✅ Handle checkout completion (from web app)
  const handleCheckoutComplete = useCallback(() => {
    // console.log('Auction checkout completed, refreshing order status');
    setShouldRefreshOrderStatus(prev => !prev);
  }, []);

  // ✅ Determine display values (from web app logic)
  const displayWinner = auctionWinnerData?.winner || bidderWon;
  const displayHighestBid = auctionWinnerData?.winningBid || highestBid;
  const shouldShowWinner = displayWinner && (!auctionWinnerData || auctionWinnerData?.reserveMet !== false);
  const shouldShowReserveNotMet = displayWinner && auctionWinnerData?.reserveMet === false;

  const bidderKey = displayWinner?.profileURL?.key || item?.productId?.images?.[0]?.key;

  return (
    <View style={styles.auctionCard}>
      <View className="flex-row justify-between w-full">
        {imageUrl ? (
          <Image source={{uri: imageUrl}} style={styles.productImage}
          // onError={(e)=>console.log("these is sna ",e)}
          />
        ) : (
          <View
            style={[
              styles.productImage,
              {justifyContent: 'center', alignItems: 'center'},
            ]}>
            <Text style={styles.imagePlaceholder}>No Img</Text>
          </View>
        )}

        <TouchableOpacity style={styles.auctionInfo} onPress={()=>navigation.navigate("ProductDetails",{id:item?.productId?._id})} activeOpacity={0.2}>
          <Text style={styles.productName} numberOfLines={2}>{item?.productId?.title}</Text>
           {item.startingPrice==0 && item?.startingBid==0 &&<Text style={styles.productName}>{item?.productId?.description}</Text>}
         {item.startingPrice!=0 && item?.startingBid!=0 && <Text style={styles.bidText}>
            Starting bid - ₹{item.startingPrice || item?.startingBid|| 'n/a'}
          </Text>}
         {/* {item.reservedPrice!=0&& <Text style={styles.bidText}>
            Reserved bid - ₹{item.reservedPrice || 'n/a'}
          </Text>} */}
        </TouchableOpacity>

        <View style={styles.auctionActions}>
          {isActive && !displayWinner && (
            <View style={styles.liveTag}>
              <Text style={styles.liveText}>{'Live'}</Text>
            </View>
          )}
          <Text style={styles.timeText}>{item.timeLeft}</Text>
          {isActive && !displayWinner && (
            <TouchableOpacity
              style={[styles.joinButton, !isActive && styles.disabledButton]}
              onPress={() => navigation.goBack()}
              disabled={!isActive}>
              <Text style={styles.joinButtonText}>
                {isActive ? 'Join auction' : 'Upcoming..'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* ✅ Show checkout button only for winner with reserve met */}
          {user?._id === displayWinner?._id && shouldShowWinner && (
            <TouchableOpacity
              style={[
                styles.joinButton,
                hasOrderedPrize || orderCheckLoading
                  ? {backgroundColor: 'gray'}
                  : {backgroundColor: 'green'},
              ]}
              activeOpacity={0.2}
              disabled={hasOrderedPrize || orderCheckLoading}
              onPress={() => setIsAuctionWinner(true)}>
              {orderCheckLoading ? (
                <Text style={[styles.joinButtonText, {color: '#fff'}]}>
                  Checking....
                </Text>
              ) : hasOrderedPrize ? (
                <Text style={[styles.joinButtonText, {color: '#fff'}]}>
                  ✓ Purchased
                </Text>
              ) : (
                <Text style={[styles.joinButtonText, {color: '#fff'}]}>
                  Check Out
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ✅ Pre-Bid Section - Mobile Optimized */}
      {!isActive && !item?.isAuctionEnded && !bidderWon && !displayWinner && user && item?.preBidsEnabled && (
        <View style={styles.preBidContainer}>
          {/* Header */}
          <View style={styles.preBidHeader}>
            <View style={styles.preBidHeaderLeft}>
              <View style={styles.preBidPulse} />
              <Text style={styles.preBidHeaderText}>PRE-BIDDING</Text>
            </View>
            {preBidCount > 0 && (
              <View style={styles.preBidCountBadge}>
                <Text style={styles.preBidCountText}>
                  {preBidCount} {preBidCount === 1 ? 'bid' : 'bids'}
                </Text>
              </View>
            )}
          </View>

          {/* Current Highest Pre-Bid Display */}
          {highestPreBid === 0 ? (
            <View style={styles.preBidDisplayContainer}>
              <Text style={styles.preBidDisplayLabel}>Starting Bid:</Text>
              <View style={styles.preBidAmountRow}>
                <Text style={styles.preBidRupee}>₹</Text>
                <Text style={styles.preBidAmount}>
                  {(item?.startingBid || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.preBidDisplayContainer, styles.preBidDisplayActive]}>
              <Text style={styles.preBidDisplayLabel}>Highest Pre-Bid:</Text>
              <View style={styles.preBidAmountRow}>
                <Text style={styles.preBidRupee}>₹</Text>
                <Text style={styles.preBidAmount}>
                  {highestPreBid.toLocaleString()}
                </Text>
              </View>
              {user && preBids[0]?.user?._id === user?._id ? (
                <Text style={styles.preBidLeadText}>🏆 You lead</Text>
              ) : preBids[0]?.user && (
                <TouchableOpacity style={styles.preBidLeaderRow} onPress={()=>navigation.navigate("ViewSellerProdile",{id:preBids[0]?.user?.userName})} activeOpacity={0.2}>
                  {preBids[0]?.user?.profileURL?.key && (
                    <Image 
                      source={{uri: `${AWS_CDN_URL}${preBids[0].user.profileURL.key}`}}
                      style={styles.preBidLeaderAvatar}
                    />
                  )}
                  <Text style={styles.preBidLeaderName}>
                    {preBids[0]?.user?.name || preBids[0]?.user?.userName}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Input Section */}
          <View style={styles.preBidInputSection}>
            <View style={styles.preBidInputWrapper}>
              <Text style={styles.preBidInputPrefix}>+₹</Text>
              <TextInput
                style={styles.preBidInput}
                value={customBidAmount}
                onChangeText={handleBidInputChange}
                placeholder="Increment (min ₹10)"
                placeholderTextColor="#78716c"
                keyboardType="numeric"
                defaultValue={customBidAmount}
              />
            </View>
            
            {bidError ? (
              <Text style={styles.preBidErrorText}>{bidError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.preBidButton,
                (loadingPreBid) && styles.preBidButtonDisabled
              ]}
              onPress={handlePlacePreBid}
              activeOpacity={0.1}
              disabled={loadingPreBid}
            >
              {loadingPreBid ? (
                <View style={styles.preBidButtonContent}>
                  <ActivityIndicator color="#1c1917" size="small" />
                  <Text style={styles.preBidButtonText}>Placing Bid...</Text>
                </View>
              ) : (
                <View style={styles.preBidButtonContent}>
                  <Trophy color="#1c1917" size={18} />
                  <Text style={styles.preBidButtonText}>Place Bid</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ✅ Current Bid Display (with animation support) */}
      {isActive && !displayWinner && (
        <View style={[
          styles.currentBidContainer,
          isShowingPreBidAnimation && styles.currentBidContainerAnimating
        ]}>
          <Text style={styles.currentBidLabel}>
            {isShowingPreBidAnimation ? 'Pre-Bid History ⚡' : 'Current Bid'}
          </Text>
          <View style={styles.currentBidAmountWrapper}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.currentBidAmount}>
              {(isShowingPreBidAnimation ? animatedPreBidAmount : displayHighestBid)?.toLocaleString() || '0'}
            </Text>
          </View>
          
          {/* Show animated bidder during pre-bid animation */}
          {isShowingPreBidAnimation && animatedPreBidder && (
            <View style={styles.animatedBidderContainer}>
              {animatedPreBidder?.profileURL?.key && (
                <Image 
                  source={{uri: `${AWS_CDN_URL}${animatedPreBidder?.profileURL?.key}`}}
                  style={styles.animatedBidderAvatar}
                />
              )}
              <Text style={styles.animatedBidderName}>
                {animatedPreBidder?.name || animatedPreBidder?.userName}
              </Text>
            </View>
          )}
          
          {!isShowingPreBidAnimation && highestBidder && (
            <View style={styles.highestBidderContainer}>
              <Trophy color="#EAB308" size={16} style={styles.trophyIcon} />
              <Text style={styles.highestBidderText}>
                Highest: {highestBidder.name || highestBidder.userName || 'Unknown'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ✅ Current Bid Display (like web app) */}
      {false && isActive && !displayWinner && (
        <View style={styles.currentBidContainer}>
          <Text style={styles.currentBidLabel}>Current Bid</Text>
          <View style={styles.currentBidAmountWrapper}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.currentBidAmount}>
              {displayHighestBid?.toLocaleString() || '0'}
            </Text>
          </View>
          {highestBidder && (
            <View style={styles.highestBidderContainer}>
              <Trophy color="#EAB308" size={16} style={styles.trophyIcon} />
              <Text style={styles.highestBidderText}>
                Highest: {highestBidder.name || highestBidder.userName || 'Unknown'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ✅ Winner/Reserve Not Met Display (from web app logic) */}
      {displayWinner != null && (
        <View className="bg-secondary-color rounded-2xl p-2 mx-4 my-4 shadow-2xl border border-[#333]">
          <View className="items-center">
            {bidderKey != null && (
              <View className="relative mb-1">
                <View className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full">
                  <Image
                    source={{uri: `${AWS_CDN_URL}${bidderKey}`}}
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                    resizeMode="cover"
                  />
                </View>

               
              </View>
            )}

            {shouldShowReserveNotMet ? (
              <View className="items-center">
                <View className="flex-row items-center justify-center gap-2 mb-2">
                  <AlertCircle size={20} color="#ef4444" />
                  <Text className="text-lg font-semibold text-red-500">
                    Reserve Not Met
                  </Text>
                </View>
                <Text className="text-sm text-gray-300">
                  Last bid: ₹{displayHighestBid?.toLocaleString() || '0'}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  Last bidder: {displayWinner?.name || 'Unknown'}
                </Text>
              </View>
            ) : shouldShowWinner ? (
              <>
                <TouchableOpacity 
                onPress={()=>navigation.navigate("ViewSellerProdile" as never, {id:displayWinner?.userName} as never)}
                className="flex-row items-center justify-center gap-2">
                  <Trophy size={20} color="#f59e0b" />
                  <Text className="text-lg font-semibold text-white">
                    Winner: {displayWinner?.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>
                <Text className="text-sm text-white mt-1">
                  Final bid: ₹{displayHighestBid?.toLocaleString() || '0'}
                </Text>
                {auctionWinnerData?.reserveMet !== undefined && (
                  <Text className="text-xs text-gray-400 mt-1">
                    Reserve Met
                  </Text>
                )}
                <View className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-full px-6 py-2">
                  <Text className="text-green-700 font-semibold">
                    🎉 Winning Bidder
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      )}

      <AuctionCheckoutSlider
        isOpen={isAuctionWinner}
        showId={streamId}
        onClose={() => setIsAuctionWinner(false)}
        onCheckoutComplete={handleCheckoutComplete}
        _auctionData={{
          ...auctionWinnerData,
          winner: displayWinner,
          winningBid: displayHighestBid,
          product: item?.productId || item,
          auctionId: currentAuctionId || auctionWinnerData?.auctionId
        }}
        onPaymentStateChange={()=>null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  auctionCard: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    backgroundColor: '#FED7AA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  imagePlaceholder: {
    fontSize: 8,
  },
  auctionInfo: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  bidText: {
    color: '#EAB308',
    fontSize: 12,
    marginBottom: 4,
  },
  auctionActions: {
    alignItems: 'flex-end',
  },
  liveTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '500',
  },
  // ✅ Current Bid Styles (like web app)
  currentBidContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Yellow tint
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  currentBidLabel: {
    fontSize: 12,
    color: 'rgba(234, 179, 8, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  currentBidAmountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAB308',
  },
  currentBidAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EAB308',
  },
  highestBidderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  trophyIcon: {
    flexShrink: 0,
  },
  highestBidderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EAB308',
  },
  // ✅ Pre-Bid Styles - Mobile Optimized
  preBidContainer: {
    backgroundColor: '#1c1917',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  preBidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preBidHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  preBidPulse: {
    width: 6,
    height: 6,
    backgroundColor: '#EAB308',
    borderRadius: 3,
  },
  preBidHeaderText: {
    fontSize: 10,
    color: '#EAB308',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  preBidCountBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  preBidCountText: {
    fontSize: 10,
    color: '#EAB308',
    fontWeight: '600',
  },
  preBidDisplayContainer: {
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderColor: '#44403c',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  preBidDisplayActive: {
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  preBidDisplayLabel: {
    fontSize: 10,
    color: '#a8a29e',
    marginBottom: 4,
  },
  preBidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  preBidRupee: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EAB308',
  },
  preBidAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EAB308',
  },
  preBidLeadText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  preBidLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  preBidLeaderAvatar: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
  },
  preBidLeaderName: {
    fontSize: 10,
    color: '#EAB308',
    fontWeight: '500',
  },
  preBidInputSection: {
    gap: 6,
  },
  preBidInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292524',
    borderColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  preBidInputPrefix: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EAB308',
    marginRight: 4,
  },
  preBidInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    padding: 0,
  },
  preBidErrorText: {
    fontSize: 10,
    color: '#ef4444',
// marginVertical:5,
marginBottom:5,
    // textAlign: 'center',
  },
  preBidButton: {
    backgroundColor: '#EAB308',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  preBidButtonDisabled: {
    opacity: 0.5,
  },
  preBidButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  preBidButtonText: {
    color: '#1c1917',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // ✅ Animation styles
  currentBidContainerAnimating: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
    // shadowColor: '#EAB308',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 4,
  },
  animatedBidderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  animatedBidderAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderColor: 'rgba(234, 179, 8, 0.5)',
    borderWidth: 1,
  },
  animatedBidderName: {
    fontSize: 12,
    color: '#EAB308',
    fontWeight: '600',
  },
});

export default AuctionComponent;
