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
} from 'react-native';
import io from 'socket.io-client';
import Feather from 'react-native-vector-icons/Feather';
import Octicons from 'react-native-vector-icons/Octicons';
import moment from 'moment';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import {AuthContext} from '../../Context/AuthContext';
import EmojiInput from './EmojiInput';
import {actionUrl, bgaSocketUrl, socketurl} from '../../../Config';
import {AWS_CDN_URL} from '../../Utils/aws';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypo from 'react-native-vector-icons/Entypo';
import BuyNowCard from './BuyNowCard';
import axios from 'axios';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

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
  'Deepa'
];

// Function to get a random username
const getRandomUsername = () => {
  const randomIndex = Math.floor(Math.random() * RANDOM_USERNAMES.length);
  return RANDOM_USERNAMES[randomIndex];
};

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
  const flatListRef = useRef(null);
  
  // Socket management
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

 // Cache for storing consistent random usernames for each comment
  const randomUsernameCache = useRef({});
  
  // Function to get a consistent random username for a specific comment
  const getConsistentRandomUsername = useCallback((commentId) => {
    // If we already generated a username for this comment, return it
    if (randomUsernameCache.current[commentId]) {
      return randomUsernameCache.current[commentId];
    }
    
    // Otherwise, generate a new one and cache it
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

  const fetchPreviousComments = useCallback(async () => {
    if (!streamId) return;

    setIsLoadingHistory(true);
    try {
      // Add limit parameter to fetch more comments (adjust as needed)
      const response = await axios.get(
        `${bgaSocketUrl}/api/comments/show/${streamId}?limit=1000`,
      );
      const result = response.data;
      console.log("📊 Previous comments received from API:", result.data?.length || 0)

      if (result.success && result.data) {
        // Ensure we have an array and it's not empty
        const commentsArray = Array.isArray(result.data) ? result.data : [];
        console.log("📥 Setting", commentsArray.length, "comments to state");

        setComments(commentsArray);
        setHasLoadedHistory(true);
        setTimeout(() => {
          if (commentsContainerRef.current) {
            commentsContainerRef.current.scrollToEnd({animated: true});
          }
        }, 100);
      } else {
        console.log('No comments found or API error');
        setHasLoadedHistory(true);
      }
    } catch (error) {
      console.log('Error fetching comments:', error.response?.data || error.message);
      setHasLoadedHistory(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [streamId]);

  // Load previous comments when component mounts or streamId changes
  useEffect(() => {
    if (streamId) {
      // Reset loading state
      setHasLoadedHistory(false);
      
      // If prevComments are provided, use them directly
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
        // Otherwise fetch from API
        console.log('📡 Fetching previous comments from API');
        setComments([]);
        fetchPreviousComments();
      }
    }
  }, [streamId, prevComments, fetchPreviousComments]);
  //  const [selectedProduct, setSelectedProduct] = useState(null);   //mock

  //mock
  //  useEffect(() => {
  //   if (auctionProducts?.length > 0) {
  //     const randomIndex = Math.floor(Math.random() * auctionProducts.length);
  //     setSelectedProduct(auctionProducts[randomIndex]);
  //   }
  // }, [auctionProducts]);

  // console.log('auctionProduct====', auctionProducts);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!streamId) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up existing socket if any
    if (socketRef.current) {
      console.log('🔌 Cleaning up existing socket connection');
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Initializing new socket connection for stream:', streamId);

    // Create new socket instance
    socketRef.current = io(bgaSocketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsSocketConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Join room after connection
      socket.emit('joinRoom', streamId);
      console.log('🚪 Joined room:', streamId);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error.message);
      setIsSocketConnected(false);
      reconnectAttemptsRef.current++;
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setIsSocketConnected(true);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.log('❌ Socket reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Socket reconnection failed after all attempts');
      setIsSocketConnected(false);
    });

    // Comment event handler
    socket.on(`commentAdded-${streamId}`, (comment) => {
      if (comment) {
        // console.log('💬 New comment received:', comment.text?.substring(0, 50));
        setComments(prev => {
          const updated = [...prev, comment];
          setTimeout(scrollToBottom, 100);
          return updated;
        });
      }
    });

    return socket;
  }, [streamId, scrollToBottom]);

  // Handle app state changes (background/foreground) for mobile
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground
        console.log('📱 App came to foreground, checking socket connection');
        
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            console.log('🔌 Socket disconnected, attempting to reconnect...');
            socketRef.current.connect();
          } else {
            console.log('✅ Socket already connected');
            // Re-join room to ensure we're receiving updates
            socketRef.current.emit('joinRoom', streamId);
          }
        } else {
          console.log('🔌 No socket instance, initializing...');
          initializeSocket();
        }
      } else if (nextAppState === 'background') {
        // App went to background
        console.log('📱 App went to background');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [streamId, initializeSocket]);

  // Socket connection and event listeners
  useEffect(() => {
    if (!streamId) return;

    // Initialize socket connection
    initializeSocket();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsSocketConnected(false);
    };
  }, [streamId, initializeSocket]);

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
        setShowScrollButton(distanceFromBottom > 100);
      }
    }
  }, []);

  const handleContentSizeChange = useCallback(() => {
    // Auto-scroll to bottom when content size changes (new comments)
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [scrollToBottom]);

  const handleSend = useCallback(() => {
    if (input.trim() && user && socketRef.current) {
      if (!socketRef.current.connected) {
        console.log('⚠️ Socket not connected, attempting to reconnect...');
        socketRef.current.connect();
        // Retry send after a short delay
        setTimeout(() => {
          if (socketRef.current?.connected) {
            const newComment = {
              user,
              text: input,
              timestamp: new Date().toISOString(),
              streamId,
            };
            socketRef.current.emit('newComment', newComment);
            setInput('');
            scrollToBottom();
          } else {
            console.log('❌ Failed to send comment: Socket still disconnected');
          }
        }, 1000);
      } else {
        const newComment = {
          user,
          text: input,
          timestamp: new Date().toISOString(),
          streamId,
        };
        console.log('📤 Sending comment:', newComment.text?.substring(0, 50));
        socketRef.current.emit('newComment', newComment);
        setInput('');
        scrollToBottom();
      }
    } else if (!socketRef.current) {
      console.log('❌ No socket instance available');
    }
  }, [input, user, streamId, scrollToBottom]);

  const toggleCommentExpansion = useCallback(commentId => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  // Handle emoji selection from EmojiInput component
  const handleEmojiSelect = useCallback((emoji: string) => {
    // Append emoji to current input text
    setInput(prevInput => prevInput + emoji);
  }, []);

  const renderItem = useCallback(
    ({item, index}) => {
      // Skip rendering if item is invalid
      if (!item || !item._id) {
        console.log(`Skipping invalid comment at index ${index}`);
        return null;
      }

      // console.log(`Rendering comment ${index}:`, item.text);

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
                {
                item?.user?.userName?.charAt(0) ||
                 '👤'}
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
              <Text style={styles.username} numberOfLines={1}>
                {
                item?.user?.userName || item?.user?.name || 
                getConsistentRandomUsername(item._id)}
              </Text>
              {/* <Icon name="diamond" size={18} color={selectedPair.diamond} /> */}
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
    [expandedComments, toggleCommentExpansion, getConsistentRandomUsername],
  );

  // console.log(comments)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
      style={[styles.container]}>
      {/* Chat Messages */}
      <View style={styles.commentsWrapper}>
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          ref={commentsContainerRef}
          data={comments}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            // Defensive key extraction
            if (!item || !item._id) {
              console.log(`Using fallback key for index ${index}`);
              return `fallback-${index}`;
            }
            return item._id.toString();
          }}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          //scrollEventThrottle={16}  // will slow down scrolling
          style={[
            styles.commentsList,
            !commentsVisible && {height: 0, opacity: 0},
          ]}
          contentContainerStyle={{
            flexGrow: 1, 
            justifyContent: 'flex-end',
            paddingBottom: isKeyboardVisible ? 10 : 0
          }}
          showsVerticalScrollIndicator={true}
          maintainVisibleContentPosition={
            !isKeyboardVisible ? {
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            } : undefined
          }
          removeClippedSubviews={false}
          initialNumToRender={comments.length || 50}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          nestedScrollEnabled={false}
          scrollEnabled={true}
          directionalLockEnabled={true}
          alwaysBounceVertical={false}
          bounces={true}
          disableIntervalMomentum={false}
          decelerationRate="normal"
        />
      </View>

      {/* Scroll Button */}
      {showScrollButton && (
        <TouchableOpacity onPress={scrollToBottom} style={styles.scrollButton}>
          <Feather name="chevrons-down" size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* {!auctionActive && !isKeyboardVisible && auctionVisible && (
         <BuyNowCard   onAuctionComplete={onAuctionComplete} onSwipeComplete = {onSwipeComplete} product={selectedProduct}/>
       )}
     */}
      {emojiVisible && (
        <View
          style={[
            styles.emojiInputContainer,
          //  isKeyboardVisible && {width: '84%'},
          ]}>
          <EmojiInput onEmojiSelect={handleEmojiSelect} />
        </View>
      )}

      {/* Chat Input */}
      <View
        style={[styles.inputContainer, isKeyboardVisible && {width: '86%'
        //'84%'
        }, isShowUpcoming && {width: '100%', flexDirection:'row-reverse'}]}>
        {/* { !isKeyboardVisible && <TouchableOpacity style={styles.actionIcon} 
     onPress={() => {
    Keyboard.dismiss(); // Dismiss the keyboard first
    feedBack();         // Then call the feedback function
  }}
    //onPress= {()=>{}}
    >
        <Entypo name="dots-three-horizontal" color="#eee" size={22} />
      </TouchableOpacity>
} */}
        {!isShowUpcoming && <LinearGradient
          //colors={['rgba(148, 148, 148, 0.16)', 'rgba(250, 250, 250, 0.16)']}
          // colors={['rgba(0, 0, 0, 0.16)', 'rgba(0, 0, 0, 0.16)']}
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
          />

           {/* <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setEmojiVisible(!emojiVisible)}>
            <Entypo name={'emoji-happy'} color="#aaa" size={25} />
          </TouchableOpacity> */}

          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || !user}
            style={styles.sendButton}>
            <Octicons
              name="paper-airplane"
              size={20}
              color={input.trim() && user ? '#fff' : '#aaa'}
            />
          </TouchableOpacity>
        </LinearGradient>}

         {!isShowUpcoming && <TouchableOpacity
            style={styles.actionIcon}
            onPress={() => setEmojiVisible(!emojiVisible)}>
            <Entypo name={'emoji-happy'} color="#eee" size={25} />
          </TouchableOpacity>}

        {!isKeyboardVisible && (
          <>
            {!isShowUpcoming && <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => setCommentsVisible(!commentsVisible)}>
              <Ionicons
                name={commentsVisible ? 'eye' : 'eye-off'}
                color="#eee"
                size={25}
              />
            </TouchableOpacity>}
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={navigateToStore}>
              <Ionicons name="storefront-outline" color="#ffd700" size={25} />
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.actionIcon} onPress={()=>{}}>
        <MaterialIcons name="local-fire-department" color="#eee" size={25} />
      </TouchableOpacity> */}
          </>
        )}

      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //backgroundColor: 'transparent',
    width: '100%', //'86%'  // '80%',
    // backgroundColor:'#fff',
    //paddingLeft: width * 0.08,
  },
  commentsWrapper: {
    flex: 1,
    position: 'relative',
    // backgroundColor:'red',
    //backgroundColor:'transparent',
    //maxWidth: '86%',   // commented to make as full width to fix scroll issue
    // marginBottom:10,
    overflow: 'hidden',
  },
  commentsList: {
    flex: 1,
    height: 'auto',
    padding: 1,
  //  backgroundColor:'green',
   // maxWidth: '86%',
    // height:400,
    //paddingLeft: width * 0.04, //width*0.08
  },
  topFadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    zIndex: 1,
    width: '60%',
  },
  emojiInputContainer: {
    height: 54,
    backgroundColor: 'transparent',
    // paddingRight: 24, //40,
    paddingHorizontal: 10,
    width: '94%',
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 10,
   // backgroundColor:'blue',
    paddingEnd: 100
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: '#333',  // 'gray',
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
    //      backgroundColor: randomColor,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  username: {
    color: '#fff',
    fontSize: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
    fontWeight: '400',
    maxWidth: '90%',
  },

  commentText: {
    color: 'white',
    fontWeight: '400',
    fontSize:16,  //18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },

  seeMoreText: {
    color: '#4da6ff',
    fontSize: 12,  //14,
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },

  scrollButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 10,
    zIndex: 10,
  },
  inputContainer: {
    // flexDirection: 'row',
    // position: 'absolute',
    // bottom: 0,
    // left:10,
    // right:20,
    // alignItems: 'center',
    // paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    // paddingHorizontal: 10,
    // // width: '76%', //'64%',       //'50%',  //'85%'
    // marginBottom: 0, //10,
    // gap: 4,

      flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    paddingHorizontal: 10,
  width: '64%',  //'75%',  //'85%'
    // marginBottom:10,
  gap:4
  },
  inputGradient: {
    borderRadius: 30,
    paddingLeft: 17,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: black semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(LiveComments);
// import React, {
//   useState,
//   useEffect,
//   useRef,
//   useContext,
//   useCallback,
//   useMemo,
// } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   AppState,
//   ViewStyle,
// } from 'react-native';
// import io from 'socket.io-client';
// import Feather from 'react-native-vector-icons/Feather';
// import Octicons from 'react-native-vector-icons/Octicons';
// import LinearGradient from 'react-native-linear-gradient';
// import {AuthContext} from '../../Context/AuthContext';
// import {bgaSocketUrl} from '../../../Config';
// import {AWS_CDN_URL} from '../../Utils/aws';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import axios from 'axios';

// // Array of random usernames to use when user info is not available
// const RANDOM_USERNAMES = [
//   'ArunKumar',
//   'Kavya',
//   'Prakash',
//   'Divya',
//   'Suresh',
//   'Lakshmi',
//   'Vijay',
//   'Revathi',
//   'Manikandan',
//   'Sandhya',
//   'Ramesh',
//   'Meena',
//   'Senthil',
//   'Priya',
//   'Murugan',
//   'Anitha',
//   'Karthik',
//   'Janani',
//   'Saravanan',
//   'Deepa'
// ];

// // Pre-compute color pairs outside component
// const COLOR_PAIRS = [
//   {bg: 'rgba(0, 128, 0, 0.3)', diamond: 'lightgreen'},
//   {bg: 'rgba(0, 0, 255, 0.3)', diamond: 'lightblue'},
//   {bg: 'rgba(255, 192, 203, 0.3)', diamond: 'lightpink'},
// ];

// // Function to get color pair based on user ID (moved outside component)
// const getColorPair = (identifier: string) => {
//   const idStr = identifier?.toString() || '0';
//   let hash = 0;
//   for (let i = 0; i < idStr.length; i++) {
//     hash += idStr.charCodeAt(i);
//   }
//   const index = hash % COLOR_PAIRS.length;
//   return COLOR_PAIRS[index];
// };

// // Memoized comment item component for better performance
// interface CommentItemProps {
//   item: any;
//   expandedComments: Record<string, boolean>;
//   toggleCommentExpansion: (commentId: string) => void;
//   getConsistentRandomUsername: (commentId: string) => string;
// }

// const CommentItem = React.memo(({
//   item,
//   expandedComments,
//   toggleCommentExpansion,
//   getConsistentRandomUsername,
// }: CommentItemProps) => {
//   // Call hooks before any early returns
//   const selectedPair = useMemo(() => getColorPair(item?.user?._id || '0'), [item?.user?._id]);
//   const username = useMemo(() => {
//     return item?.user?.userName || item?.user?.name || getConsistentRandomUsername(item?._id);
//   }, [item?.user?.userName, item?.user?.name, item?._id, getConsistentRandomUsername]);

//   // Skip rendering if item is invalid (after hooks)
//   if (!item || !item._id) {
//     return null;
//   }

//   const isExpanded = expandedComments[item._id] || false;
//   const commentText = item?.text || '';
//   const isLongComment = commentText.length > 90;

//   return (
//     <View style={styles.commentContainer} pointerEvents="box-none">
//       <View style={styles.avatarContainer} pointerEvents="none">
//         {item?.user?.profileURL?.key ? (
//           <Image
//             source={{uri: `${AWS_CDN_URL}${item.user.profileURL.key}`}}
//             style={styles.avatarImage}
//           />
//         ) : (
//           <Text style={styles.avatarText}>
//             {item?.user?.userName?.charAt(0) || '👤'}
//           </Text>
//         )}
//       </View>
//       <View style={styles.commentContent} pointerEvents="box-none">
//         <View
//           pointerEvents="none"
//           style={[
//             styles.commentHeader,
//             {backgroundColor: selectedPair.bg},
//           ]}>
//           <Text style={styles.username} numberOfLines={1}>
//             {username}
//           </Text>
//         </View>
//         <View pointerEvents="none">
//           <Text
//             style={styles.commentText}
//             numberOfLines={isExpanded ? undefined : 3}
//             ellipsizeMode="tail">
//             {commentText}
//           </Text>
//         </View>
//         {isLongComment && (
//           <TouchableOpacity
//             activeOpacity={0.7}
//             delayPressIn={100}
//             onPress={() => toggleCommentExpansion(item._id)}>
//             <Text style={styles.seeMoreText}>
//               {isExpanded ? 'See less' : 'See more'}
//             </Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// });

// CommentItem.displayName = 'CommentItem';

// const LiveComments = ({
//   streamId,
//   prevComments,
//   navigateToStore,
//   isKeyboardVisible,
//   isShowUpcoming,
// }: any) => {
//   const [comments, setComments] = useState(prevComments || []);
//   const [input, setInput] = useState('');
//   const {user} = useContext(AuthContext);
//   const [showScrollButton, setShowScrollButton] = useState(false);
//   const commentsContainerRef = useRef<FlatList>(null);
//   const keyboardOffset = Platform.OS === 'ios' ? 90 : 0;

//   const [commentsVisible, setCommentsVisible] = useState(true);
//   const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
//   // Socket management
//   const socketRef = useRef<any>(null);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const reconnectAttemptsRef = useRef(0);

//   // Cache for storing consistent random usernames for each comment
//   const randomUsernameCache = useRef<Record<string, string>>({});
  
//   // Debounce scroll operations
//   const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const isScrollingRef = useRef(false);
  
//   // Function to get a consistent random username for a specific comment
//   const getConsistentRandomUsername = useCallback((commentId: string) => {
//     if (randomUsernameCache.current[commentId]) {
//       return randomUsernameCache.current[commentId];
//     }
    
//     const randomIndex = Math.floor(Math.random() * RANDOM_USERNAMES.length);
//     const randomUsername = RANDOM_USERNAMES[randomIndex];
//     randomUsernameCache.current[commentId] = randomUsername;
    
//     return randomUsername;
//   }, []);

//   // Optimized scroll to bottom with debouncing
//   const scrollToBottom = useCallback((animated = true) => {
//     if (isScrollingRef.current) return;
    
//     if (scrollTimeoutRef.current) {
//       clearTimeout(scrollTimeoutRef.current);
//     }
    
//     scrollTimeoutRef.current = setTimeout(() => {
//       if (commentsContainerRef.current) {
//         isScrollingRef.current = true;
//         commentsContainerRef.current.scrollToEnd({animated});
//         setTimeout(() => {
//           isScrollingRef.current = false;
//         }, 300);
//       }
//     }, 50);
//   }, []);

//   const fetchPreviousComments = useCallback(async () => {
//     if (!streamId) return;

//     try {
//       const response = await axios.get(
//         `${bgaSocketUrl}/api/comments/show/${streamId}?limit=1000`,
//       );
//       const result = response.data;

//       if (result.success && result.data) {
//         const commentsArray = Array.isArray(result.data) ? result.data : [];
//         setComments(commentsArray);
//         // Delay scroll to ensure list is rendered
//         requestAnimationFrame(() => {
//           scrollToBottom(false);
//         });
//       }
//     } catch (error: any) {
//       console.error('Error fetching comments:', error.message);
//     }
//   }, [streamId, scrollToBottom]);

//   // Load previous comments when component mounts or streamId changes
//   useEffect(() => {
//     if (streamId) {
//       if (prevComments && prevComments.length > 0) {
//         setComments(prevComments);
//         requestAnimationFrame(() => {
//           scrollToBottom(false);
//         });
//       } else {
//         setComments([]);
//         fetchPreviousComments();
//       }
//     }
//   }, [streamId, prevComments, fetchPreviousComments, scrollToBottom]);

//   // Initialize socket connection
//   const initializeSocket = useCallback(() => {
//     if (!streamId) return;

//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//       reconnectTimeoutRef.current = null;
//     }

//     if (socketRef.current) {
//       socketRef.current.off();
//       socketRef.current.disconnect();
//       socketRef.current = null;
//     }

//     socketRef.current = io(bgaSocketUrl, {
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: Infinity,
//       timeout: 20000,
//     });

//     const socket = socketRef.current;

//     socket.on('connect', () => {
//       reconnectAttemptsRef.current = 0;
//       socket.emit('joinRoom', streamId);
//     });

//     socket.on('disconnect', () => {
//       // Handle disconnect
//     });

//     socket.on('connect_error', () => {
//       reconnectAttemptsRef.current++;
//     });

//     socket.on('reconnect', () => {
//       reconnectAttemptsRef.current = 0;
//     });

//     // Optimized comment handler - batch updates
//     socket.on(`commentAdded-${streamId}`, (comment: any) => {
//       if (comment) {
//         setComments((prev: any[]) => [...prev, comment]);
//         // Only scroll if user is near bottom
//         requestAnimationFrame(() => {
//           scrollToBottom(true);
//         });
//       }
//     });

//     return socket;
//   }, [streamId, scrollToBottom]);

//   // Handle app state changes (background/foreground) for mobile
//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', (nextAppState) => {
//       if (nextAppState === 'active') {
//         if (socketRef.current) {
//           if (!socketRef.current.connected) {
//             socketRef.current.connect();
//           } else {
//             socketRef.current.emit('joinRoom', streamId);
//           }
//         } else {
//           initializeSocket();
//         }
//       }
//     });

//     return () => {
//       subscription?.remove();
//     };
//   }, [streamId, initializeSocket]);

//   // Socket connection and event listeners
//   useEffect(() => {
//     if (!streamId) return;

//     initializeSocket();

//     return () => {
//       if (scrollTimeoutRef.current) {
//         clearTimeout(scrollTimeoutRef.current);
//       }
      
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//         reconnectTimeoutRef.current = null;
//       }

//       if (socketRef.current) {
//         socketRef.current.off();
//         socketRef.current.disconnect();
//         socketRef.current = null;
//       }
//     };
//   }, [streamId, initializeSocket]);

//   // Optimized scroll handler with throttling
//   const handleScroll = useCallback((e: any) => {
//     if (e?.nativeEvent) {
//       const {contentSize, contentOffset, layoutMeasurement} = e.nativeEvent;
//       if (contentSize && contentOffset && layoutMeasurement) {
//         const distanceFromBottom =
//           contentSize.height - contentOffset.y - layoutMeasurement.height;
//         setShowScrollButton(distanceFromBottom > 100);
//       }
//     }
//   }, []);

//   // Simplified content size change handler
//   const handleContentSizeChange = useCallback(() => {
//     // Only auto-scroll if keyboard is not visible to prevent interference
//     if (!isKeyboardVisible) {
//       requestAnimationFrame(() => {
//         scrollToBottom(false);
//       });
//     }
//   }, [isKeyboardVisible, scrollToBottom]);

//   // Optimized send handler
//   const handleSend = useCallback(() => {
//     if (input.trim() && user && socketRef.current) {
//       const newComment = {
//         user,
//         text: input,
//         timestamp: new Date().toISOString(),
//         streamId,
//       };
      
//       if (!socketRef.current.connected) {
//         socketRef.current.connect();
//         setTimeout(() => {
//           if (socketRef.current?.connected) {
//             socketRef.current.emit('newComment', newComment);
//           }
//         }, 1000);
//       } else {
//         socketRef.current.emit('newComment', newComment);
//       }
      
//       setInput('');
//       // Scroll after sending
//       requestAnimationFrame(() => {
//         scrollToBottom(true);
//       });
//     }
//   }, [input, user, streamId, scrollToBottom]);

//   const toggleCommentExpansion = useCallback((commentId: string) => {
//     setExpandedComments(prev => ({
//       ...prev,
//       [commentId]: !prev[commentId],
//     }));
//   }, []);

//   // Optimized render item with memoization
//   const renderItem = useCallback(
//     ({item}: any) => (
//       <CommentItem
//         item={item}
//         expandedComments={expandedComments}
//         toggleCommentExpansion={toggleCommentExpansion}
//         getConsistentRandomUsername={getConsistentRandomUsername}
//       />
//     ),
//     [expandedComments, toggleCommentExpansion, getConsistentRandomUsername],
//   );

//   const keyExtractor = useCallback((item: any, index: number) => {
//     if (!item || !item._id) {
//       return `fallback-${index}`;
//     }
//     return item._id.toString();
//   }, []);

//   // Memoize FlatList content container style
//   const contentContainerStyle = useMemo((): ViewStyle => ({
//     flexGrow: 1, 
//     justifyContent: 'flex-end' as const,
//     paddingBottom: isKeyboardVisible ? 10 : 0
//   }), [isKeyboardVisible]);

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       keyboardVerticalOffset={keyboardOffset}
//       style={styles.container}>
//       {/* Chat Messages */}
//       <View style={styles.commentsWrapper}>
//         <FlatList
//           keyboardShouldPersistTaps="handled"
//           keyboardDismissMode="on-drag"
//           ref={commentsContainerRef}
//           data={comments}
//           renderItem={renderItem}
//           keyExtractor={keyExtractor}
//           onContentSizeChange={handleContentSizeChange}
//           onScroll={handleScroll}
//           scrollEventThrottle={16}
//           style={[
//             styles.commentsList,
//             !commentsVisible && {height: 0, opacity: 0},
//           ]}
//           contentContainerStyle={contentContainerStyle}
//           showsVerticalScrollIndicator={true}
//           maintainVisibleContentPosition={
//             !isKeyboardVisible ? {
//               minIndexForVisible: 0,
//               autoscrollToTopThreshold: 10,
//             } : undefined
//           }
//           removeClippedSubviews={true}
//           initialNumToRender={15}
//           maxToRenderPerBatch={5}
//           updateCellsBatchingPeriod={100}
//           windowSize={10}
//         />
//       </View>

//       {/* Scroll Button */}
//       {showScrollButton && (
//         <TouchableOpacity onPress={() => scrollToBottom(true)} style={styles.scrollButton}>
//           <Feather name="chevrons-down" size={24} color="white" />
//         </TouchableOpacity>
//       )}

//       {/* Chat Input */}
//       <View
//         style={[styles.inputContainer, isKeyboardVisible && {width: '96%'}]}>
//         <LinearGradient
//           colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.3)']}
//           start={{x: 0, y: 0}}
//           end={{x: 1, y: 0}}
//           style={styles.inputGradient}>
//           <TextInput
//             style={styles.textInput}
//             value={input}
//             onChangeText={setInput}
//             placeholder="Say Hello!"
//             placeholderTextColor="#ddd"
//             onSubmitEditing={handleSend}
//             returnKeyType="send"
//             editable={!isShowUpcoming}
//             multiline={false}
//             blurOnSubmit={false}
//           />
//           <TouchableOpacity
//             onPress={handleSend}
//             disabled={!input.trim() || !user}
//             style={styles.sendButton}>
//             <Octicons
//               name="paper-airplane"
//               size={20}
//               color={input.trim() && user ? '#fff' : '#aaa'}
//             />
//           </TouchableOpacity>
//         </LinearGradient>

//         {!isKeyboardVisible && (
//           <>
//             <TouchableOpacity
//               style={styles.actionIcon}
//               onPress={() => setCommentsVisible(!commentsVisible)}>
//               <Ionicons
//                 name={commentsVisible ? 'eye' : 'eye-off'}
//                 color="#eee"
//                 size={25}
//               />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={styles.actionIcon}
//               onPress={navigateToStore}>
//               <Ionicons name="storefront-outline" color="#eee" size={25} />
//             </TouchableOpacity>
//           </>
//         )}
//       </View>
//     </KeyboardAvoidingView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     width: '100%',
//   },
//   commentsWrapper: {
//     flex: 1,
//     position: 'relative',
//     overflow: 'hidden',
//   },
//   commentsList: {
//     flex: 1,
//     height: 'auto',
//     padding: 1,
//   },
//   commentContainer: {
//     flexDirection: 'row',
//     padding: 10,
//     paddingEnd: 100
//   },
//   avatarContainer: {
//     width: 30,
//     height: 30,
//     borderRadius: 20,
//     backgroundColor: '#333',
//     justifyContent: 'center',
//     alignItems: 'center',
//     overflow: 'hidden',
//   },
//   avatarImage: {
//     width: '100%',
//     height: '100%',
//   },
//   avatarText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 18,
//     textTransform: 'uppercase',
//   },
//   commentContent: {
//     flex: 1,
//     marginLeft: 10,
//   },
//   commentHeader: {
//     flexDirection: 'row',
//     alignSelf: 'flex-start',
//     gap: 8,
//     paddingHorizontal: 4,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   username: {
//     color: '#fff',
//     fontSize: 15,
//     textShadowColor: 'rgba(0, 0, 0, 0.8)',
//     textShadowOffset: {width: 1, height: 1},
//     textShadowRadius: 4,
//     fontWeight: '400',
//     maxWidth: '90%',
//   },
//   commentText: {
//     color: 'white',
//     fontWeight: '400',
//     fontSize: 16,
//     textShadowColor: 'rgba(0, 0, 0, 0.8)',
//     textShadowOffset: {width: 1, height: 1},
//     textShadowRadius: 4,
//   },
//   seeMoreText: {
//     color: '#4da6ff',
//     fontSize: 12,
//     fontWeight: '500',
//     marginTop: 4,
//     textShadowColor: 'rgba(0, 0, 0, 0.8)',
//     textShadowOffset: {width: 1, height: 1},
//     textShadowRadius: 3,
//   },
//   scrollButton: {
//     position: 'absolute',
//     bottom: 80,
//     right: 20,
//     backgroundColor: '#333',
//     borderRadius: 20,
//     padding: 10,
//     zIndex: 10,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingBottom: Platform.OS === 'ios' ? 25 : 15,
//     paddingHorizontal: 10,
//     width: '75%',
//     gap: 4
//   },
//   inputGradient: {
//     borderRadius: 30,
//     paddingLeft: 17,
//     paddingRight: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     width: '100%',
//   },
//   textInput: {
//     color: 'white',
//     flex: 1,
//     paddingVertical: 10,
//   },
//   sendButton: {
//     padding: 4,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   actionIcon: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.3)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export default React.memo(LiveComments);
