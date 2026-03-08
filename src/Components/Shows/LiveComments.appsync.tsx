// Reach half of commentContainer to fetch next batch of comments

import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Keyboard,
  Dimensions,
  AppState,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Octicons from 'react-native-vector-icons/Octicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import moment from 'moment';
import LinearGradient from 'react-native-linear-gradient';
import {AuthContext} from '../../Context/AuthContext';
import EmojiInput from './EmojiInput';
import {bgaSocketUrl, bgaBackendUrl} from '../../../Config';
import {AWS_CDN_URL} from '../../Utils/aws';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import axios from 'axios';

// Import AppSync Events utilities
import {
  connectToChannel,
  subscribeToChannel,
  closeChannel,
  getCommentsChannelPath,
  type Channel,
  type EventData,
  type Subscription,
} from '../../Utils/appSyncConfig';

const {width, height} = Dimensions.get('window');

// Array of random usernames to use when user info is not available
const RANDOM_USERNAMES = [
  'ArunKumar',
  'Kavya',
  'Prakash',
  'Divya',
  'Suresh',
  'Lakshmi',
  'Vijay',
  'Revathi',
  'Manikandan',
  'Sandhya',
  'Ramesh',
  'Meena',
  'Senthil',
  'Priya',
  'Murugan',
  'Anitha',
  'Karthik',
  'Janani',
  'Saravanan',
  'Deepa',
];

const LiveComments = ({
  streamId,
  prevComments,
  feedBack,
  navigateToStore,
  isKeyboardVisible,
  isShowUpcoming,
}) => {
  const [comments, setComments] = useState(prevComments || []);
  const [input, setInput] = useState('');
  const {user} = useContext(AuthContext);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const commentsContainerRef = useRef(null);
  const keyboardOffset = Platform.OS === 'ios' ? 90 : 0;

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [isSending, setIsSending] = useState(false);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [currentSkip, setCurrentSkip] = useState(0);
  const COMMENTS_PER_PAGE = 30;  //25
  
  // AppSync Events management
  const channelRef = useRef<Channel | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Cache for storing consistent random usernames for each comment
  const randomUsernameCache = useRef({});
  
  // Ref to track last pagination trigger time (prevents rapid duplicate loads)
  const lastLoadTimeRef = useRef(0);
  // 🔍 DEBUG THRESHOLD: Debounce time between pagination loads
  const LOAD_DEBOUNCE_MS = 2000; // Minimum 2 seconds between loads (increased to prevent loop)
  
  // Track previous scroll position to detect scroll direction
  const previousScrollYRef = useRef(0);
  
  // Track if we just loaded to prevent immediate re-trigger
  const justLoadedRef = useRef(false);
  
  // 🎨 DEBUG: Visual threshold indicator state
  const [showDebugIndicators, setShowDebugIndicators] = useState(false); // Disabled debug indicators
  
  // Function to get a consistent random username for a specific comment
  const getConsistentRandomUsername = useCallback((commentId) => {
    if (randomUsernameCache.current[commentId]) {
      return randomUsernameCache.current[commentId];
    }
    
    const randomIndex = Math.floor(Math.random() * RANDOM_USERNAMES.length);
    const randomUsername = RANDOM_USERNAMES[randomIndex];
    randomUsernameCache.current[commentId] = randomUsername;
    
    return randomUsername;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollToEnd({animated: true});
    }
  }, []);

  // Fetch previous comments from HTTP API with pagination
  const fetchPreviousComments = useCallback(async (isLoadMore = false) => {
    if (!streamId) return;
    
    // Prevent duplicate loads
    if (isLoadMore && (isLoadingMore || !hasMore)) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingHistory(true);
    }

    try {
      const skipValue = isLoadMore ? currentSkip : 0;
      const response = await axios.get(
        `${bgaBackendUrl}api/comments/show/${streamId}`,
        { params: { limit: COMMENTS_PER_PAGE, skip: skipValue } }
      );
      const result = response.data;
      console.log(`📊 ${isLoadMore ? 'Additional' : 'Initial'} comments received from API:`, result.data?.length || 0);

      if (result.success && result.data) {
        const commentsArray = Array.isArray(result.data) ? result.data : [];
        
        if (isLoadMore) {
          // Prepend older comments to the beginning
          setComments(prev => [...commentsArray, ...prev]);
          setCurrentSkip(prev => prev + commentsArray.length);
          console.log(`📨 Loaded ${commentsArray.length} more comments (total loaded: ${currentSkip + commentsArray.length}/${totalComments})`);
          
          // Set cooldown flag to prevent immediate re-trigger
          justLoadedRef.current = true;
          setTimeout(() => {
            justLoadedRef.current = false;
            console.log('🟢 Cooldown period ended, pagination re-enabled');
          }, 0); // 0 second cooldown after loading
        } else {
          // Initial load - set comments and scroll to bottom
          console.log('📥 Setting', commentsArray.length, 'comments to state');
          setComments(commentsArray);
          setCurrentSkip(COMMENTS_PER_PAGE);
          console.log(`📨 Fetched ${commentsArray.length} initial comments (total: ${result.pagination?.total || commentsArray.length})`);
          
          setTimeout(() => {
            if (commentsContainerRef.current) {
              commentsContainerRef.current.scrollToEnd({animated: true});
            }
          }, 100);
        }
        
        setTotalComments(result.pagination?.total || commentsArray.length);
        setHasMore(result.pagination?.hasMore || false);
        
        if (!isLoadMore) {
          setHasLoadedHistory(true);
        }
      } else {
        console.log('No comments found or API error');
        if (!isLoadMore) {
          setHasLoadedHistory(true);
        }
      }
    } catch (error) {
      console.log('❌ Error fetching comments:', error.response?.data || error.message);
      if (!isLoadMore) {
        setHasLoadedHistory(true);
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoadingHistory(false);
      }
    }
  }, [streamId, isLoadingMore, hasMore, currentSkip, COMMENTS_PER_PAGE, totalComments]);

  // Load previous comments when component mounts or streamId changes
  useEffect(() => {
    if (streamId) {
      setHasLoadedHistory(false);
      
      if (prevComments && prevComments.length > 0) {
        console.log('📥 Previous comments loaded from props:', prevComments.length);
        setComments(prevComments);
        setHasLoadedHistory(true);
        setTimeout(() => {
          if (commentsContainerRef.current) {
            commentsContainerRef.current.scrollToEnd({animated: true});
          }
        }, 100);
      } else {
        console.log('📡 Fetching previous comments from API');
        setComments([]);
        fetchPreviousComments();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, prevComments]);

  // AppSync Events subscription
  useEffect(() => {
    if (!streamId || !hasLoadedHistory) return;

    let channel: Channel | null = null;
    let subscription: Subscription | null = null;
    let isSubscribed = true;

    const setupAppSyncSubscription = async () => {
      try {
        console.log('🔌 Setting up AppSync Events subscription for stream:', streamId);
        
        // Get channel path
        const channelPath = getCommentsChannelPath(streamId);
        console.log('📡 Channel path:', channelPath);
        
        // Connect to channel
        channel = await connectToChannel(channelPath);
        channelRef.current = channel;
        setIsConnected(true);
        console.log('✅ Connected to AppSync Events channel');

        // Subscribe to events
        subscription = subscribeToChannel(
          channel,
          (eventData: EventData) => {
            if (!isSubscribed) return;
            
            console.log('📨 Received comment via AppSync Events:', eventData);
            
            // Extract comment data from event structure
            const commentData = eventData.event || eventData;
            
            setComments((prev) => {
              // Check for duplicates using _id
              const isDuplicate = prev.some(
                existingComment => existingComment._id === commentData._id
              );
              
              if (isDuplicate) {
                console.log('⚠️ Duplicate comment ignored:', commentData._id);
                return prev;
              }
              
              console.log('✅ Adding new comment:', commentData._id);
              const updated = [...prev, commentData];
              
              // Auto-scroll if user is near bottom
              setTimeout(() => {
                if (commentsContainerRef.current) {
                  const {scrollHeight, scrollTop, clientHeight} = commentsContainerRef.current || {};
                  // Since we can't access these in React Native, just scroll
                  scrollToBottom();
                }
              }, 100);
              
              return updated;
            });
          },
          (error) => {
            console.error('❌ AppSync subscription error:', error);
            setIsConnected(false);
            
            // Show user-friendly error
            // Alert.alert(
            //   'Connection Issue',
            //   'Lost connection to live updates. Trying to reconnect...'
            // );
          }
        );

        subscriptionRef.current = subscription;
        console.log('✅ Successfully subscribed to AppSync Events');
        
      } catch (error) {
        console.log('❌ Error setting up AppSync subscription:', error);
        setIsConnected(false);
        
        // Alert.alert(
        //   'Connection Error',
        //   'Failed to connect to live comments. Please check your internet connection.'
        // );
      }
    };

    setupAppSyncSubscription();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up AppSync Events subscription');
      isSubscribed = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      if (channelRef.current) {
        closeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      setIsConnected(false);
    };
  }, [streamId, hasLoadedHistory, scrollToBottom]);

  // Handle app state changes (background/foreground) for mobile
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active' && streamId && hasLoadedHistory) {
        // App came to foreground - reconnect if needed
        console.log('📱 App came to foreground, checking connection');
        
        if (!channelRef.current || !isConnected) {
          console.log('🔄 Reconnecting to AppSync Events...');
          // The useEffect above will handle reconnection
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [streamId, hasLoadedHistory, isConnected]);

  // Reset input when user or stream changes
  useEffect(() => {
    setInput('');
    scrollToBottom();
  }, [user, streamId, scrollToBottom]);

  // Force scroll to bottom when keyboard visibility changes or new comments arrive
  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [isKeyboardVisible, comments.length, scrollToBottom]);

  const handleScroll = useCallback(e => {
    if (e?.nativeEvent) {
      const {contentSize, contentOffset, layoutMeasurement} = e.nativeEvent;
      if (contentSize && contentOffset && layoutMeasurement) {
        const distanceFromBottom =
          contentSize.height - contentOffset.y - layoutMeasurement.height;
          console.log('Distance from bottom', distanceFromBottom);
        setShowScrollButton(distanceFromBottom > 1500);   // 100
        
        // ⚡ PAGINATION TRIGGER POINT - Check if scrolled near top to load more older comments
        const distanceFromTop = contentOffset.y;
        const currentScrollY = contentOffset.y;
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        
        // 🎯 Detect scroll direction - CRITICAL FIX to prevent infinite loop
        const isScrollingUp = currentScrollY < previousScrollYRef.current;
        const scrollDelta = Math.abs(currentScrollY - previousScrollYRef.current);
        
        // Update previous scroll position for next comparison
        previousScrollYRef.current = currentScrollY;
        
        // 🚨 CRITICAL FIX: Conservative threshold - only trigger within 100px of top
        const TRIGGER_DISTANCE = 350;
        const MIN_SCROLL_DELTA = 1; // Minimum intentional scroll movement (very relaxed for easy triggering)
        
        // Only trigger if: near top + scrolling UP + intentional scroll + all conditions met + NOT in cooldown
        const shouldTriggerPagination = 
          distanceFromTop < TRIGGER_DISTANCE && 
          isScrollingUp && 
          scrollDelta > MIN_SCROLL_DELTA &&
          hasMore && 
          !isLoadingMore && 
          !justLoadedRef.current &&  // 🔥 CRITICAL: Block during cooldown period
          hasLoadedHistory &&
          timeSinceLastLoad > LOAD_DEBOUNCE_MS;
        
        if (shouldTriggerPagination) {
          console.log(`🚀 PAGINATION TRIGGERED!`);
          console.log(`   ├─ distanceFromTop: ${distanceFromTop.toFixed(2)}px`);
          console.log(`   ├─ scrollDelta: ${scrollDelta.toFixed(2)}px (intentional scroll)`);
          console.log(`   ├─ isScrollingUp: ${isScrollingUp}`);
          console.log(`   └─ timeSinceLastLoad: ${timeSinceLastLoad}ms`);
          lastLoadTimeRef.current = now;
          fetchPreviousComments(true);
        } else if (distanceFromTop < TRIGGER_DISTANCE && justLoadedRef.current) {
          console.log(`🔴 BLOCKED: In cooldown period after loading (0s)`);
        }
      }
    }
  }, [hasMore, isLoadingMore, hasLoadedHistory, fetchPreviousComments]);

  const handleContentSizeChange = useCallback(() => {
    // Don't auto-scroll when loading more comments (pagination)
    if (isLoadingMore) {
      return;
    }
    // setTimeout(() => {
    //   scrollToBottom();
    // }, 100);
  }, [scrollToBottom, isLoadingMore]);

  const handleSend = useCallback(async () => {
    if (input.trim() && user && !isSending) {
      setIsSending(true);
      try {
        const response = await axios.post(
         `${bgaBackendUrl}/api/comments/show/${streamId}`,
          {
            text: input.trim(),
            source: 'flykup',
            user: {
              _id: user._id,
              userName: user.userName || user.name,
              name: user.name,
              profileURL: user.profileURL,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 200 || response.status === 201) {
          console.log('✅ Comment posted successfully');
          setInput('');
          scrollToBottom();
        }
      } catch (error) {
        console.log('❌ Error posting comment:', error);
        // Alert.alert('Error', 'Failed to send comment. Please try again.');
      } finally {
        setIsSending(false);
      }
    }
  }, [input, user, streamId, scrollToBottom, isSending]);

  const toggleCommentExpansion = useCallback(commentId => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput(prevInput => prevInput + emoji);
  }, []);

  // Get platform icon component based on comment source
  const getPlatformIcon = useCallback((source: string) => {
    switch (source) {
      case 'youtube':
        return <FontAwesome name="youtube-play" size={12} color="#FF0000" />;
      case 'facebook':
        return <FontAwesome name="facebook" size={12} color="#1877F2" />;
      case 'instagram':
        return <FontAwesome name="instagram" size={12} color="#E4405F" />;
      default:
        return null;
    }
  }, []);

  // Get display name based on source
  const getDisplayName = useCallback((comment) => {
    // For Flykup comments or no source, use the Tamil name logic
    if (comment.source === 'flykup' || !comment.source) {
      return comment?.user?.userName || 
             comment?.user?.name || 
             getConsistentRandomUsername(comment._id);
    }
    // For external platform comments, show the external author name
    return comment.externalAuthor || 'Unknown User';
  }, [getConsistentRandomUsername]);

  // Render header component for pagination loading indicator
  const renderListHeader = useCallback(() => {
    if (!hasMore || !hasLoadedHistory || comments.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.loadMoreContainer}>
        {isLoadingMore && (
          <View style={styles.loadingMoreIndicator}>
            <ActivityIndicator size="small" color="#ffd700" />
            {/* <Text style={styles.loadingMoreText}>Loading older comments...</Text> */}
          </View>
        )}
      </View>
    );
  }, [hasMore, hasLoadedHistory, isLoadingMore, comments.length]);

  const renderItem = useCallback(
    ({item, index}) => {
      if (!item || !item._id) {
        console.log(`Skipping invalid comment at index ${index}`);
        return null;
      }

      const colorPairs = [
        {bg: 'rgba(0, 128, 0, 0.3)', diamond: 'lightgreen'},
        {bg: 'rgba(0, 0, 255, 0.3)', diamond: 'lightblue'},
        {bg: 'rgba(255, 192, 203, 0.3)', diamond: 'lightpink'},
      ];

      const getColorPair = identifier => {
        const idStr = identifier?.toString() || '0';
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) {
          hash += idStr.charCodeAt(i);
        }
        const index = hash % colorPairs.length;
        return colorPairs[index];
      };

      const selectedPair = getColorPair(item?.user?._id || '0');
      const isExpanded = expandedComments[item._id] || false;
      const commentText = item?.text || '';
      const isLongComment = commentText.length > 90;

      return (
        <View style={styles.commentContainer} pointerEvents="box-none">
          <View style={styles.avatarContainer} pointerEvents="none">
            {item?.user?.profileURL?.key ? (
              <Image
                source={{uri: `${AWS_CDN_URL}${item.user.profileURL.key}`}}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {item?.user?.userName?.charAt(0) || '👤'}
              </Text>
            )}
          </View>
          <View style={styles.commentContent} pointerEvents="box-none">
            <View
              pointerEvents="none"
              style={[
                styles.commentHeader,
                {backgroundColor: selectedPair.bg},
              ]}>
              {/* <View style={styles.usernameContainer}> */}
                <Text style={styles.username} numberOfLines={1}>
                  {getDisplayName(item)}
                </Text>
                {item.source && item.source !== 'flykup' && (
                  <View style={styles.platformIconContainer}>
                    {getPlatformIcon(item.source)}
                  </View>
                )}
              {/* </View> */}
            </View>
            <View pointerEvents="none">
              <Text
                style={styles.commentText}
                numberOfLines={isExpanded ? undefined : 3}
                ellipsizeMode="tail">
                {commentText}
              </Text>
            </View>
            {isLongComment && (
              <TouchableOpacity
                activeOpacity={0.7}
                delayPressIn={100}
                onPress={() => toggleCommentExpansion(item._id)}>
                <Text style={styles.seeMoreText}>
                  {isExpanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [expandedComments, toggleCommentExpansion, getDisplayName, getPlatformIcon],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
      style={[styles.container]}>
      
      {/* Connection Status Indicator */}
      {/* {!isConnected && hasLoadedHistory && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>
            Connecting to live updates...
          </Text>
        </View>
      )} */}

      {/* Chat Messages */}
      <View style={styles.commentsWrapper}>
        
        {/* 🎨 DEBUG: Visual Threshold Indicators */}
        {showDebugIndicators && (
          <>
            {/* Top threshold indicator - Prefetch trigger zone (top 25%) */}
            <View style={styles.debugTopThreshold}>
              <Text style={styles.debugThresholdText}>
                🚀 PREFETCH ZONE (Top 25% - Loads automatically)
              </Text>
            </View>
            
            {/* Scroll-to-bottom button threshold (100px from bottom) */}
            <View style={styles.debugBottomThreshold}>
              <Text style={styles.debugThresholdText}>
                ⬇️ SCROLL BUTTON ZONE ({'>'}100px from bottom)
              </Text>
            </View>
          </>
        )}
        
        {!isShowUpcoming && <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          ref={commentsContainerRef}
          data={comments}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          keyExtractor={(item, index) => {
            if (!item || !item._id) {
              return `fallback-${index}`;
            }
            return item._id.toString();
          }}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          style={[
            styles.commentsList,
            !commentsVisible && {height: 0, opacity: 0},
          ]}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingBottom: isKeyboardVisible ? 10 : 0,
          }}
          showsVerticalScrollIndicator={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 1,
            autoscrollToTopThreshold: 100,
          }}
          removeClippedSubviews={true}
          initialNumToRender={comments.length || 50}
          maxToRenderPerBatch={10}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          nestedScrollEnabled={false}
          scrollEnabled={true}
          directionalLockEnabled={true}
          alwaysBounceVertical={false}
          bounces={true}
          disableIntervalMomentum={false}
          decelerationRate="normal"
        />}
      </View>

      {/* Scroll Button */}
      {showScrollButton && (
        <TouchableOpacity onPress={scrollToBottom} style={styles.scrollButton}>
          <Feather name="chevrons-down" size={24} color="white" />
        </TouchableOpacity>
      )}

      {emojiVisible && (
        <View style={[styles.emojiInputContainer]}>
          <EmojiInput onEmojiSelect={handleEmojiSelect} />
        </View>
      )}

      {/* Chat Input */}
      <View
        style={[
          styles.inputContainer,
          isKeyboardVisible && {width: '86%'},
          isShowUpcoming && {width: '100%', flexDirection: 'row-reverse'},
        ]}>
        {!isShowUpcoming && (
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.3)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.inputGradient}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Say Hello!"
              placeholderTextColor="#ddd"
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isShowUpcoming}
              allowFontScaling={false}
            />

            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || !user || isSending}
              style={styles.sendButton}>
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Octicons
                  name="paper-airplane"
                  size={20}
                  color={input.trim() && user ? '#fff' : '#aaa'}
                />
              )}
            </TouchableOpacity>
          </LinearGradient>
        )}

        {!isShowUpcoming && (
          <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setEmojiVisible(!emojiVisible)}>
            <Entypo name={'emoji-happy'} color="#eee" size={25} />
          </TouchableOpacity>
        )}

        {!isKeyboardVisible && (
          <>
            {!isShowUpcoming && (
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => setCommentsVisible(!commentsVisible)}>
                <Ionicons
                  name={commentsVisible ? 'eye' : 'eye-off'}
                  color="#eee"
                  size={25}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={navigateToStore}>
              <Ionicons name="storefront-outline" color="#ffd700" size={25} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  connectionBanner: {
    // backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  commentsWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // 🎨 DEBUG STYLES: Visual threshold indicators
  debugTopThreshold: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%', // Top 25% for prefetch zone
    backgroundColor: 'rgba(255, 165, 0, 0.15)', // Orange transparent overlay
    borderBottomWidth: 3,
    borderBottomColor: '#FFA500',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  debugBottomThreshold: {
    position: 'absolute',
    bottom: 80, // Account for input container
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green transparent overlay
    borderTopWidth: 3,
    borderTopColor: '#00ff00',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  debugThresholdText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: 'center',
  },
  commentsList: {
    flex: 1,
    height: 'auto',
    padding: 1,
  },
  emojiInputContainer: {
    height: 54,
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    width: '94%',
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingEnd: 100,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,   //6,
    flex: 1,
  },
  username: {
    color:'#fff',
    fontSize: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    fontWeight: '400',
    //flex: 1,
  },
  platformIconContainer: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentText: {
    color: 'white',
    fontWeight: '400',
    fontSize: 15,  //16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  seeMoreText: {
    color: '#4da6ff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 114,  //80,
    right: 20,
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingHorizontal: 10,
    width: '64%',
    gap: 4,
  },
  inputGradient: {
    borderRadius: 30,
    paddingLeft: 17,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxHeight: 40,  // to prevent excessive height on long comments
  },
  textInput: {
    color: 'white',
    flex: 1,
    paddingVertical: 10,
  },
  sendButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadingMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default React.memo(LiveComments);
