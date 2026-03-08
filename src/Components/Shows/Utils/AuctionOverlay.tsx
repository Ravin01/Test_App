import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  I18nManager,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AWS_CDN_URL } from '../../../../Config';
import { AuthContext } from '../../../Context/AuthContext';
import SwipeableBuyButton from '../../AnimatedButtons';
import { events } from 'aws-amplify/data';
import RestrictModule from './RestrictModule';
import useLiveStreamTracker from './useLiveStreamTracker';
import {
  connectToChannel,
  getAuctionsChannelPath,
  subscribeToChannel,
  closeChannel,
} from '../../../Utils/appSyncConfig';

I18nManager.forceRTL(false);

const AuctionsOverlay = ({ streamId, currentAuction, product, navigation }) => {
  const [_isActive, setIsActive] = useState(currentAuction ? true : false);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState(null);
  const [timer, setTimer] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0); // Track total auction duration
  const [uniqueStreamId, setUniqueStreamId] = useState(null);
  const [_totalBids, _setTotalBids] = useState(0);
  const { user }: any = useContext(AuthContext);
  const { trackAuctionBid } = useLiveStreamTracker(streamId);
  const [restrictModalvisible, setRestrictVisible] = useState(false);
  const [nextBids, setNextBids] = useState(currentAuction?.nextBids || []);
  // Use singleton socket
  // const socketRef = useRef(getSocket());

  const [isUserHighestBidder, setIsUserHighestBidder] = useState(false);
  const dismissTimerRef = useRef(null);

  // ✅ CRITICAL FIX: Initialize pre-bid animation state based on currentAuction prop
  // This prevents normal UI from flashing before prebid animation starts
  const initialHasPreBids = currentAuction?.preBidHistory &&
    Array.isArray(currentAuction.preBidHistory) &&
    currentAuction.preBidHistory.length > 0;

  // ✅ NEW: Pre-bid animation states (inline, no modal)
  // Initialize with true if pre-bids exist to prevent UI flash
  const [isShowingPreBidAnimation, setIsShowingPreBidAnimation] =
    useState(initialHasPreBids);
  const [animatedPreBidAmount, setAnimatedPreBidAmount] = useState(
    initialHasPreBids ? (currentAuction?.originalStartingBid || currentAuction?.startingBid || 0) : 0
  );
  const [animatedPreBidder, setAnimatedPreBidder] = useState(null);
  // console.log(product)
  // Animation values for smooth transitions
  const preBidScaleAnim = useRef(new Animated.Value(1)).current;
  const preBidOpacityAnim = useRef(new Animated.Value(1)).current;

  // ✅ Track which auction we've shown prebid animation for (to prevent duplicates)
  const shownPreBidForAuction = useRef(null);
  const { productTitle, productImage } = useMemo(() => {
    if (!product) return { productTitle: '', productImage: '' };

    const title =
      product.productId?.title ||
      product.productTitle ||
      product.title ||
      'Auction Product';

    const image =
      product?.productId?.images[0]?.key ||
      product.productId?.images?.[0]?.jpgURL ||
      product.images?.[0]?.jpgURL ||
      '/placeholder.svg';

    return { productTitle: title, productImage: image };
  }, [product]);

  // 🔧 FIX FOR LATE JOINERS: Sync component state from currentAuction prop with proper unit handling
  const hasInitializedFromProp = useRef(false);
  const hasShownPreBidAnimation = useRef(false); // Track if we've shown prebid animation for current auction
  const currentAuctionId = useRef(null); // Track current auction ID

  useEffect(() => {
    if (currentAuction && !currentAuction.isAuctionEnded && !hasInitializedFromProp.current) {
      console.log('✅ [AuctionsOverlay] INITIAL SYNC from currentAuction prop (late joiner fix):', currentAuction);

      hasInitializedFromProp.current = true;

      // Check if this is a new auction
      const auctionId = currentAuction.uniqueStreamId || currentAuction._id;
      const isNewAuction = currentAuctionId.current !== auctionId;

      if (isNewAuction) {
        // Reset prebid animation flag for new auction
        hasShownPreBidAnimation.current = false;
        currentAuctionId.current = auctionId;
      }

      setUniqueStreamId(currentAuction.uniqueStreamId);

      // ✅ FIX: Calculate actual total duration from remaining time for accurate progress bar
      // Use remaining time as the totalDuration so progress bar matches actual timer
      let totalDurationMs = 0;
      let remainingMs = 0;

      // Calculate remaining time first
      if (currentAuction.endsAt) {
        const endsAtTimestamp = typeof currentAuction.endsAt === 'number'
          ? currentAuction.endsAt
          : new Date(currentAuction.endsAt).getTime();
        remainingMs = Math.max(0, endsAtTimestamp - Date.now());
      } else if (currentAuction.remainingTime !== undefined) {
        remainingMs = currentAuction.remainingTime > 1000 ? currentAuction.remainingTime : currentAuction.remainingTime * 1000;
      } else if (currentAuction.timeRemaining !== undefined) {
        remainingMs = currentAuction.timeRemaining > 1000 ? currentAuction.timeRemaining : currentAuction.timeRemaining * 1000;
      } else if (currentAuction.duration) {
        remainingMs = currentAuction.duration * 1000;
      }

      // Use remaining time as totalDuration for accurate progress bar
      totalDurationMs = remainingMs;
      setTotalDuration(totalDurationMs);
      // console.log('📊 [AuctionsOverlay] TotalDuration set to:', totalDurationMs, 'ms (equals remaining time for accurate progress)');

      // ✅ FIX: Only show prebid animation once per auction
      if (
        !hasShownPreBidAnimation.current &&
        currentAuction.preBidHistory &&
        Array.isArray(currentAuction.preBidHistory) &&
        currentAuction.preBidHistory.length > 0
      ) {
        // Mark that we've shown the animation for this auction
        hasShownPreBidAnimation.current = true;
        // console.log('🎬 [AuctionsOverlay] Initial sync: Starting pre-bid animation with', currentAuction.preBidHistory.length, 'bids');

        // Show animation state
        setIsShowingPreBidAnimation(true);
        setIsActive(true);
        setAnimatedPreBidAmount(currentAuction.originalStartingBid || currentAuction.startingBid || 0);
        setAnimatedPreBidder(null);

        // Set initial next bids based on starting amount
        const serverIncrement = currentAuction.bidIncrement || 50;
        const startingAmount = currentAuction.originalStartingBid || currentAuction.startingBid || 0;
        setNextBids([
          Math.round(startingAmount + serverIncrement),
          Math.round(startingAmount + serverIncrement * 2),
        ]);

        // Calculate timing: 2000ms total / number of bids = ms per bid
        const totalAnimationTime = 2000; // 2 seconds
        const msPerBid = Math.max(150, totalAnimationTime / currentAuction.preBidHistory.length);

        // Animate through each pre-bid
        let currentIndex = 0;
        const animationInterval = setInterval(() => {
          if (currentIndex < currentAuction.preBidHistory.length) {
            const currentBid = currentAuction.preBidHistory[currentIndex];

            // Animate the bid update with scale and fade effect
            Animated.sequence([
              Animated.parallel([
                Animated.timing(preBidScaleAnim, {
                  toValue: 1.2,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(preBidOpacityAnim, {
                  toValue: 0.7,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(preBidScaleAnim, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(preBidOpacityAnim, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();

            setAnimatedPreBidAmount(currentBid.amount);
            setAnimatedPreBidder(currentBid.user);

            // Update next bids based on current animated amount
            setNextBids([
              Math.round(currentBid.amount + serverIncrement),
              Math.round(currentBid.amount + serverIncrement * 2),
            ]);

            currentIndex++;
          } else {
            // Animation complete - transition to normal auction
            // console.log('✅ [AuctionsOverlay] Initial sync: Animation complete, transitioning to normal auction');
            clearInterval(animationInterval);
            setIsShowingPreBidAnimation(false);

            // Set final auction state
            setHighestBid(currentAuction.highestBid || currentAuction.startingBid || 0);

            // Set the complete highest bidder object from the last pre-bid
            if (currentAuction.preBidHistory && currentAuction.preBidHistory.length > 0) {
              const lastPreBid = currentAuction.preBidHistory[currentAuction.preBidHistory.length - 1];
              setHighestBidder(lastPreBid.user);
            } else {
              setHighestBidder(currentAuction.highestBidder || null);
            }

            setIsActive(true);

            // Calculate remaining time - prioritize endsAt for accuracy
            let remainingMs;
            if (currentAuction.endsAt) {
              const endsAtTimestamp = typeof currentAuction.endsAt === 'number'
                ? currentAuction.endsAt
                : new Date(currentAuction.endsAt).getTime();
              remainingMs = Math.max(0, endsAtTimestamp - Date.now());
            } else if (currentAuction.remainingTime !== undefined) {
              remainingMs = currentAuction.remainingTime > 1000 ? currentAuction.remainingTime : currentAuction.remainingTime * 1000;
            } else if (currentAuction.timeRemaining !== undefined) {
              remainingMs = currentAuction.timeRemaining > 1000 ? currentAuction.timeRemaining : currentAuction.timeRemaining * 1000;
            } else {
              remainingMs = totalDurationMs;
            }
            setTimer(remainingMs);

            if (currentAuction.nextBids && currentAuction.nextBids.length > 0) {
              setNextBids(currentAuction.nextBids);
            } else {
              const finalBid = currentAuction.highestBid || currentAuction.startingBid || 0;
              setNextBids([
                Math.round(finalBid + serverIncrement),
                Math.round(finalBid + serverIncrement * 2),
              ]);
            }
          }
        }, msPerBid);
      } else {

        setIsActive(true);
        setHighestBid(currentAuction.highestBid || currentAuction.startingBid || 0);
        setHighestBidder(currentAuction.highestBidder || null);

        // Calculate remaining time with proper priority and unit handling
        let remainingMs;
        if (currentAuction.endsAt) {
          const endsAtTimestamp = typeof currentAuction.endsAt === 'number'
            ? currentAuction.endsAt
            : new Date(currentAuction.endsAt).getTime();
          remainingMs = Math.max(0, endsAtTimestamp - Date.now());
        } else if (currentAuction.remainingTime !== undefined) {
          remainingMs = currentAuction.remainingTime > 1000 ? currentAuction.remainingTime : currentAuction.remainingTime * 1000;
        } else if (currentAuction.timeRemaining !== undefined) {
          remainingMs = currentAuction.timeRemaining > 1000 ? currentAuction.timeRemaining : currentAuction.timeRemaining * 1000;
        } else {
          remainingMs = totalDurationMs;
        }
        setTimer(remainingMs);
        // console.log('⏱️ [AuctionsOverlay] Timer set to:', remainingMs, 'ms');

        // Set next bids
        if (currentAuction.nextBids && currentAuction.nextBids.length > 0) {
          setNextBids(currentAuction.nextBids);
        } else {
          const increment = currentAuction.bidIncrement || 50;
          const currentBid = currentAuction.highestBid || currentAuction.startingBid || 0;
          setNextBids([
            Math.round(currentBid + increment),
            Math.round(currentBid + increment * 2)
          ]);
        }
      }

      console.log('✅ [AuctionsOverlay] Initial sync complete');
    } else if (!currentAuction && hasInitializedFromProp.current) {
      console.log('🔄 [AuctionsOverlay] Auction cleared/ended, resetting state');
      setIsActive(false);
      hasInitializedFromProp.current = false;
      hasShownPreBidAnimation.current = false; // Reset for next auction
      currentAuctionId.current = null;
    }
  }, [currentAuction, preBidScaleAnim, preBidOpacityAnim]);

  // Auto-dismiss the highest bidder message after 4 seconds
  useEffect(() => {
    if (isUserHighestBidder) {
      // Clear any existing timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Set new timer to dismiss after 4 seconds
      dismissTimerRef.current = setTimeout(() => {
        setIsUserHighestBidder(false);
      }, 4000);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [isUserHighestBidder]);

  const isFirstTimerUpdate = useRef(true);

  const channelRef = useRef(null);
  const subscriptionRef = useRef(null);
  // Socket listeners effect - Use ref to prevent unnecessary cleanup
  // const productIdRef = useRef(product?.productId?._id || product?._id)

// console.log("current auction=====",currentAuction,product)
  useEffect(() => {
    // const productId = productIdRef.current;
    if (!streamId) return;

    let channel = null;
    let subscription = null;

    const setupAppSyncSubscription = async () => {
      try {
        // console.log(
        //   '🔌 AuctionsOverlay: Connecting to AppSync channel:',
        //   streamId,
        // );

        channel = await connectToChannel(getAuctionsChannelPath(streamId));
        channelRef.current = channel;
        try {
          // const { events } = await import('aws-amplify/data');
          await events.post(channel, {
            eventType: 'join_room',
            streamId: streamId,
            timestamp: new Date().toISOString()
          });
          // console.log('📤 [AuctionOverlaayAppSync] Published join_room event to request current state',{
          //   eventType: 'join_room',
          //   streamId: streamId,
          //   timestamp: new Date().toISOString()
          // });
        } catch (joinErr) {
          console.log('❌ [AuctionAppSync] Failed to publish join_room:', joinErr);
        }
        subscription = subscribeToChannel(
          channel,
          eventData => {
            // console.log(
            //   '📡 AuctionsOverlay: AppSync event received:',
            //   eventData,
            // );

            // Handle multiple possible event structures
            let eventType;
            let data;

            if (eventData?.eventType) {
              eventType = eventData.eventType;
              data = eventData;
            } else if (eventData?.event?.eventType) {
              eventType = eventData.event.eventType;
              data = eventData.event;
            } else if (eventData?.event?.event?.eventType) {
              eventType = eventData.event.event.eventType;
              data = eventData.event.event;
            } else {
              console.warn('⚠️ AuctionsOverlay: Unknown event structure');
              return;
            }

            // Ignore frontend command events
            const frontendCommands = [
              'start_auction',
              'place_bid',
              'clear_auction',
            ];
            if (frontendCommands.includes(eventType)) {
              return;
            }

            // Route events to handlers
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
              case 'auction_ended':
                handleAuctionEnded(data);
                break;
              case 'bid_rejected':
                handleBidRejected(data);
                break;
              case 'clear_auction':
                handleClrScr();
                break;
              default:
                console.warn('Unknown auction event:', eventType);
            }
          },
          error => {
            console.log('❌ AuctionsOverlay: AppSync error:', error);
          },
        );

        subscriptionRef.current = subscription;
        // console.log('✅ AuctionsOverlay: AppSync subscription established');
      } catch (error) {
        console.log('❌ AuctionsOverlay: Failed to setup AppSync:', error);
      }
    };

    const handleBidRejected = data => {
      // console.log('⚠️ [AuctionOverlay] Bid rejected:', data);
      // Don't show error toast, just set state to show UI notice
      if (data.userId === user._id || data.userId.toString() === user._id.toString()) {
        if (data?.reason) {
          if (
            data?.reason?.includes('already the highest bidder') ||
            data?.reason?.includes(
              'You are already the highest bidder. Wait for another user to bid.',
            )
          ) {
            setIsUserHighestBidder(true);
          }
        }
      } else {
        // Toast(data.message || 'Bid Rejected');
      }
    };

    const handleAuctionStarted = data => {
      // console.log('🎯 [AuctionOverlay] Auction started:', data);

      // ✅ CRITICAL FIX: Check for pre-bid history FIRST and set animation state immediately
      // This prevents normal UI from flashing before prebid animation
      const hasPreBids = data.preBidHistory &&
        Array.isArray(data.preBidHistory) &&
        data.preBidHistory.length > 0;

      // ✅ CRITICAL FIX: Only show prebid animation once per auction
      const auctionIdentifier = data.uniqueStreamId || data._id;
      const alreadyShownForThisAuction = shownPreBidForAuction.current === auctionIdentifier;

      // ✅ Set animation state FIRST if prebids exist AND we haven't shown it yet - before any other state updates
      if (hasPreBids && !alreadyShownForThisAuction) {
        // console.log(
        //   '🎬 AuctionOverlay: Starting pre-bid animation with',
        //   data.preBidHistory.length,
        //   'bids',
        // );

        // Mark that we've shown the animation for this auction
        shownPreBidForAuction.current = auctionIdentifier;

        setIsShowingPreBidAnimation(true);
        setAnimatedPreBidAmount(data.originalStartingBid || data.startingBid);
        setAnimatedPreBidder(null);
        setIsActive(true);
      }

      // Now set other states after animation state is set
      setUniqueStreamId(data.uniqueStreamId);

      // ✅ FIX: Calculate remaining time first, then use it as totalDuration for accurate progress bar
      let auctionDurationMs = 0;
      let initialRemainingMs = 0;

      // Calculate remaining time
      if (data.remainingTime !== undefined) {
        initialRemainingMs = Math.max(0, data.remainingTime);
      } else if (data.endsAt) {
        const endsAtTimestamp = typeof data.endsAt === 'string'
          ? new Date(data.endsAt).getTime()
          : data.endsAt;
        initialRemainingMs = Math.max(0, endsAtTimestamp - Date.now());
      } else if (data.duration) {
        initialRemainingMs = data.duration * 1000;
      }

      // Use remaining time as totalDuration so progress bar matches timer
      auctionDurationMs = initialRemainingMs;
      setTotalDuration(auctionDurationMs);
      console.log('📊 [auction_started] totalDuration:', auctionDurationMs, 'ms (equals initial remaining time)');

      if (hasPreBids && !alreadyShownForThisAuction) {

        // ✅ Set initial next bids based on starting amount
        const serverIncrement = data.bidIncrement || 50;
        setNextBids([
          Math.round(
            (data.originalStartingBid || data.startingBid) + serverIncrement,
          ),
          Math.round(
            (data.originalStartingBid || data.startingBid) +
            serverIncrement * 2,
          ),
        ]);

        // Calculate timing: 2000ms total / number of bids = ms per bid
        const totalAnimationTime = 2000; // 2 seconds
        const msPerBid = Math.max(
          150,
          totalAnimationTime / data.preBidHistory.length,
        ); // Minimum 150ms per bid

        // Animate through each pre-bid
        let currentIndex = 0;
        const animationInterval = setInterval(() => {
          if (currentIndex < data.preBidHistory.length) {
            const currentBid = data.preBidHistory[currentIndex];
            // console.log(
            //   `🎬 AuctionOverlay: Animating bid ${currentIndex + 1}/${
            //     data.preBidHistory.length
            //   }:`,
            //   currentBid.amount,
            //   currentBid.user?.name,
            // );

            // Animate the bid update with scale and fade effect
            Animated.sequence([
              Animated.parallel([
                Animated.timing(preBidScaleAnim, {
                  toValue: 1.2,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(preBidOpacityAnim, {
                  toValue: 0.7,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(preBidScaleAnim, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(preBidOpacityAnim, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]),
            ]).start();

            setAnimatedPreBidAmount(currentBid.amount);
            setAnimatedPreBidder(currentBid.user);

            // ✅ UPDATE: Dynamically update next bids based on current animated amount
            setNextBids([
              Math.round(currentBid.amount + serverIncrement),
              Math.round(currentBid.amount + serverIncrement * 2),
            ]);

            currentIndex++;
          } else {
            // Animation complete - transition to normal auction
            // console.log(
            //   '✅ AuctionOverlay: Animation complete, transitioning to normal auction',
            // );
            clearInterval(animationInterval);
            setIsShowingPreBidAnimation(false);

            // Set final auction state
            setHighestBid(data.startingBid);

            // ✅ FIX: Set the complete highest bidder object from the last pre-bid
            if (data.preBidHistory && data.preBidHistory.length > 0) {
              const lastPreBid =
                data.preBidHistory[data.preBidHistory.length - 1];
              setHighestBidder(lastPreBid.user); // Set complete user object with name
            } else {
              setHighestBidder(
                data.initialBidder ? { _id: data.initialBidder } : null,
              );
            }

            setIsActive(true);

            // ✅ FIX: Set timer after pre-bid animation with proper unit handling
            // remainingTime from backend is already in milliseconds
            let remainingTimeMs = auctionDurationMs; // Default to full duration
            if (data.endsAt) {
              // Most accurate - calculate from server timestamp
              const endsAtTimestamp = typeof data.endsAt === 'number' ? data.endsAt : new Date(data.endsAt).getTime();
              remainingTimeMs = Math.max(0, endsAtTimestamp - Date.now());
            } else if (data.remainingTime !== undefined) {
              // remainingTime is already in milliseconds from backend
              remainingTimeMs = data.remainingTime;
            } else if (data.timeRemaining !== undefined) {
              // timeRemaining could be in seconds or milliseconds, check value
              remainingTimeMs = data.timeRemaining > 1000 ? data.timeRemaining : data.timeRemaining * 1000;
            }
            setTimer(remainingTimeMs);
            console.log('✅ [Pre-bid complete] totalDuration:', auctionDurationMs, 'ms, remainingTime:', remainingTimeMs, 'ms');

            if (data.nextBids && data.nextBids.length > 0) {
              setNextBids(data.nextBids);
            } else {
              setNextBids([
                Math.round(data.startingBid + serverIncrement),
                Math.round(data.startingBid + serverIncrement * 2),
              ]);
            }
          }
        }, msPerBid);
      } else {
        // No pre-bids - set normal auction state
        const startBid = data.startingBid || data.highestBid || 0;
        setHighestBid(startBid);
        setIsActive(true);

        // Calculate remaining time
        let remainingTime;
        if (data.remainingTime !== undefined) {
          remainingTime = Math.max(0, data.remainingTime);
          // console.log('🎯 [AuctionOverlay] Using server remainingTime:', remainingTime);
        } else {
          const endsAtTimestamp =
            typeof data.endsAt === 'string'
              ? new Date(data.endsAt).getTime()
              : data.endsAt;
          remainingTime = Math.max(0, endsAtTimestamp - Date.now());
          // console.log('🎯 [AuctionOverlay] Calculated from endsAt:', remainingTime);
        }
        setTimer(remainingTime);

        if (data.nextBids && data.nextBids.length > 0) {
          setNextBids(data.nextBids);
        } else {
          const serverIncrement = data.bidIncrement || 50;
          setNextBids([
            Math.round(startBid + serverIncrement),
            Math.round(startBid + serverIncrement * 2),
          ]);
        }
        // If there's a highestBidder in the started data, set it
        if (data.highestBidder) {
          setHighestBidder(data.highestBidder);
        } else {
          setHighestBidder(null);
        }
      }
    };

    const handleTimerUpdate = (data) => {
      // console.log("🔔 [timer_update] Received:", {
      //   remainingTime: data.remainingTime,
      //   duration: data.duration,
      //   currentTotalDuration: totalDuration
      // });

      if (data.remainingTime !== undefined) {
        // ✅ FIX: remainingTime from backend is in milliseconds
        const remainingTimeMs = data.remainingTime;

        // ✅ FIX: NEVER overwrite totalDuration if it's already set (from auction_started or initial sync)
        // Only set it on first timer update if totalDuration is still 0 AND we have actual data
        if (totalDuration === 0 && isFirstTimerUpdate.current && data.duration) {
          let durationMs = data.duration * 1000; // Convert seconds to milliseconds
          setTotalDuration(durationMs);
          // console.log("🎯 [handleTimerUpdate] Set totalDuration to:", durationMs, "ms (from duration:", data.duration, "seconds)");
        }

        // Mark first timer update as processed
        if (isFirstTimerUpdate.current) {
          isFirstTimerUpdate.current = false;
        }

        setTimer(remainingTimeMs);

        // ✅ FIX: Don't update isActive during pre-bid animation to prevent UI from hiding
        if (!isShowingPreBidAnimation) {
          setIsActive(remainingTimeMs > 0);
        }

        // console.log("⏱️ [timer_update] Updated timer:", {
        //   remainingMs: remainingTimeMs,
        //   totalDurationMs: totalDuration,
        //   progressPercentage: totalDuration > 0 ? ((totalDuration - remainingTimeMs) / totalDuration * 100).toFixed(1) : 0
        // });
      }
    };

    const handleAuctionEnded = (data) => {
      if (data.streamId === streamId) {
        // Reset timer and progress bar
        setTimer(0);
        setTotalDuration(0);
        setIsActive(false);

        // Reset bid-related state
        setHighestBid(0);
        setHighestBidder(null);
        setNextBids([]);

        // Reset pre-bid animation state
        setIsShowingPreBidAnimation(false);
        setAnimatedPreBidAmount(0);
        setAnimatedPreBidder(null);

        // Reset first timer update flag for the next auction
        isFirstTimerUpdate.current = true;

        // ✅ BLINKING FIX: Reset initialization flag to allow syncing for next auction
        hasInitializedFromProp.current = false;

        // ✅ Reset prebid animation tracking for next auction
        shownPreBidForAuction.current = null;
      }
    };


    const handleClrScr = () => {
      setHighestBid(0);
      setHighestBidder(null);
      setTimer(0);
      setTotalDuration(0);
      setIsActive(false);
    };

    const handleBidUpdated = data => {
      // console.log('🎯 [AuctionOverlay] Bid update received:', data);
      // if (data.product !== productId) return;

      if (data.streamId === streamId) {
        // Reset the highest bidder message when someone else bids
        setIsUserHighestBidder(false);

        // Update highest bid - ensure we always set it even if it's 0
        if (data?.highestBid !== undefined) {
          // console.log('🎯 [AuctionOverlay] Updating bid to:', data.highestBid);
          setHighestBid(data.highestBid);
        }
        if (data.nextBids && data.nextBids.length > 0) {
          setNextBids(data.nextBids);
        } else {
          const increment = data.bidIncrement || 50;
          setNextBids([
            Math.round(data.highestBid + increment),
            Math.round(data.highestBid + increment * 2),
          ]);
        }
        // Handle highestBidder - can be null, string ID, or object
        if (data?.highestBidder) {
          // If it's already an object with name, use it
          if (
            typeof data.highestBidder === 'object' &&
            data.highestBidder.name
          ) {
            // console.log('🎯 [AuctionOverlay] Setting bidder (object with name):', data.highestBidder.name);
            setHighestBidder(data.highestBidder);
          } else if (typeof data.highestBidder === 'string') {
            // If it's just an ID string, keep existing bidder or set to null
            // console.log('⚠️ [AuctionOverlay] Received bidder ID string, waiting for full data');
            // Don't update - keep current bidder
          } else if (typeof data.highestBidder === 'object') {
            // Object but no name - still set it
            // console.log('🎯 [AuctionOverlay] Setting bidder (object without name):', data.highestBidder);
            setHighestBidder(data.highestBidder);
          }
        } else {
          // Explicitly null - clear the bidder
          // console.log('🎯 [AuctionOverlay] Clearing bidder (null)');
          setHighestBidder(null);
        }
      }
    };

    setupAppSyncSubscription();

    return () => {
      // console.log('🧹 AuctionsOverlay: Cleaning up AppSync');

      if (subscription) {
        subscription.unsubscribe();
      }

      if (channel) {
        closeChannel(channel);
      }

      channelRef.current = null;
      subscriptionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, user, isShowingPreBidAnimation]);

  useEffect(() => {
    if (!_isActive) return;

    const interval = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer <= 1000) {
          setIsActive(false);
          return 0;
        }
        return prevTimer - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [_isActive]); // Only depend on isActive, not timer

  const formatTime = ms => {
    // Ensure we never show negative time
    const milliseconds = Math.max(0, ms);
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Memoize progress bar percentage to avoid recalculation on every render
  const progressPercentage = useMemo(() => {
    // ✅ FIX: Don't show progress if totalDuration hasn't been set yet
    if (totalDuration === 0) return 0;

    const durationMs = totalDuration;
    const timerMs = timer;

    // If timer is zero or negative, show complete (100%)
    if (timerMs <= 0) return 100;

    // ✅ FIX: If timer is greater than duration, we're still initializing - show 0%
    if (timerMs > durationMs) return 0;

    // Calculate elapsed time (how much time has passed)
    const elapsedTimeMs = durationMs - timerMs;
    const progress = (elapsedTimeMs / durationMs) * 100;

    // Clamp between 0 and 100
    return Math.min(Math.max(progress, 0), 100);
  }, [timer, totalDuration]);



  // console.log("Progress Percentagae",progressPercentage)

  const handleBid = newBid => {
    if (!user) {
      navigation?.navigate('LoginScreen');
      return;
    }

    // ✅ FIX: Prevent bidding if user is already the highest bidder (like web app)
    // Check if current user is the highest bidder
    const currentUserId = user._id?.toString();
    const highestBidderId = highestBidder?._id?.toString();

    if (currentUserId && highestBidderId && currentUserId === highestBidderId) {
      // User is already the highest bidder - show message and prevent bid
      setIsUserHighestBidder(true);
      console.log('⚠️ [handleBid] Prevented bid - user is already highest bidder');
      return;
    }

    const channel = channelRef.current;
    if (newBid > 0 && channel) {
      const auctionId =
        currentAuction?.auctionId ||
        currentAuction?._id ||
        product?.auctionId ||
        product?.auctionObjectId ||
        product?._id;

      if (!auctionId) {
        console.log('❌ No auctionId available for bidding!');
        return;
      }

      // ✅ CRITICAL FIX: True optimistic update BEFORE network call
      const previousBid = highestBid;
      const previousBidder = highestBidder;
      const bidIncrement = currentAuction?.bidIncrement || 50;

      // Update UI instantly for immediate feedback (<100ms)
      setHighestBid(newBid);
      setHighestBidder({
        _id: user._id,
        name: user.name || user.userName,
      });
      setNextBids([
        Math.round(newBid + bidIncrement),
        Math.round(newBid + bidIncrement * 2),
      ]);

      // ✅ CRITICAL FIX: Fire-and-forget - no await, publish in background
      channel.publish({
        event: {
          eventType: 'place_bid',
          streamId,
          userId: user._id,
          userName: user.name || user.userName,
          userInfo: user,
          bidAmount: newBid,
          currentHighestBid: previousBid,
          bidDirection: currentAuction?.bidDirection || 'incremental',
          reservedPrice: currentAuction?.reservedPrice || 0,
          bidIncrement: bidIncrement,
          auctionId: auctionId,
          product: product?.productId?._id || product?._id,
          uniqueStreamId: uniqueStreamId || currentAuction?.uniqueStreamId,
          timestamp: new Date().toISOString(),
        },
      }).catch(error => {
        // Rollback on error
        console.log('❌ Bid publish failed, rolling back:', error);
        setHighestBid(previousBid);
        setHighestBidder(previousBidder);
        setNextBids([
          Math.round(previousBid + bidIncrement),
          Math.round(previousBid + bidIncrement * 2),
        ]);
      });

      // Track analytics (non-blocking)
      trackAuctionBid(product?.productId?._id || product?._id, newBid);
    }
  };

  const imageUrl = `${AWS_CDN_URL}${productImage}`;

  return (
    <View style={styles.container}>
      <RestrictModule
        visible={restrictModalvisible}
        onClose={() => setRestrictVisible(false)}
        mode1={'access'}
        sellerName={''}
        profileURL=""
      />

      <View style={styles.auctionCard}>
        {/* Header with Auction Badge and Timer */}
        <View style={styles.header}>
          <View style={styles.auctionBadge}>
            <Icon name="gavel" size={20} color="#fbbf24" />
            <Text style={styles.auctionText}>LIVE AUCTION</Text>
          </View>
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={16} color="#fbbf24" />
            <Text
              style={timer / 1000 < 15 ? styles.timerDanger : styles.timerText}>
              {formatTime(timer)}
            </Text>
          </View>
        </View>

        {/* Content - Product Image and Info */}
        {/* {_isActive && ( */}
        <View style={styles.content}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} />

          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {productTitle || 'Not Yet Started'}
            </Text>

            {/* Current Bid Display - With Animation Support */}
            <View style={styles.bidInfoContainer}>
              <Text style={styles.currentBidLabel}>Current Bid:</Text>
              <Animated.Text
                style={[
                  styles.currentBidAmount,
                  {
                    transform: [{ scale: preBidScaleAnim }],
                    opacity: preBidOpacityAnim,
                  }
                ]}>
                ₹{isShowingPreBidAnimation ? animatedPreBidAmount : (highestBid || 0)}
              </Animated.Text>
            </View>

            {/* Top Bidder Info - Shows animated or actual bidder */}
            <View style={styles.topBidderInfo}>
              {(isShowingPreBidAnimation && animatedPreBidder?.name) || highestBidder?.name ? (
                <>
                  <Icon
                    name="account-star"
                    size={14}
                    color="rgba(255, 255, 255, 0.8)"
                  />
                  <Text style={styles.topBidderName}>
                    {isShowingPreBidAnimation && animatedPreBidder?.name
                      ? animatedPreBidder.name
                      : highestBidder.name}
                  </Text>
                </>
              ) : (
                <Text style={styles.topBidderPlaceholder}>
                  {isShowingPreBidAnimation ? 'Processing pre-bids...' : 'Waiting for bids...'}
                </Text>
              )}
            </View>
          </View>
        </View>
        {/* )} */}

        {/* Progress Bar */}
        {/* {_isActive && ( */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarBackground,
              timer / 1000 < 15 && { backgroundColor: '#4B5563' }, // Gray track
            ]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercentage}%`,
                },
                timer / 1000 < 15 && { backgroundColor: '#dc2626' }, // Red fill
              ]}
            />
          </View>
        </View>
        {/* )} */}

        {/* Bid Rejection Message */}
        {isUserHighestBidder && (
          <View style={styles.bidRejectionBanner}>
            <Icon name="information" size={18} color="#fbbf24" />
            <Text style={styles.bidRejectionText}>
              You're the highest bidder! Wait for others to bid before placing
              another.
            </Text>
          </View>
        )}

        {/* Bid Button - Only show when nextBids are available (like web app) */}
        {nextBids.length > 0 && (
          <View style={styles.bidButtonContainer}>
            <SwipeableBuyButton
              text={`Bid ₹ ${nextBids[0]?.toLocaleString()} ❯❯`}
              onComplete={() => handleBid(nextBids[0])}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
    // marginBottom:10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auctionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    // paddingBottom:20,
    // borderWidth:2,
    // borderColor:'red',
    borderRadius: 12,
    padding: 12,
    minHeight: 240,
    width: '93%',
    maxWidth: 420,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auctionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timerDanger: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  bidInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  currentBidLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  currentBidAmount: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 18,
  },
  topBidderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBidderName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  topBidderPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBarBackground: {
    backgroundColor: '#4B5563',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: 'green',
    height: '100%',
    borderRadius: 4,
  },
  bidButtonContainer: {
    width: '100%',
    paddingTop: 40,
  },
  bidRejectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  bidRejectionText: {
    flex: 1,
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});

export default React.memo(AuctionsOverlay);
