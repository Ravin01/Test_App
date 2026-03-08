import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
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
  AppState,
  ViewStyle,
} from 'react-native';
import io from 'socket.io-client';
import Feather from 'react-native-vector-icons/Feather';
import Octicons from 'react-native-vector-icons/Octicons';
import LinearGradient from 'react-native-linear-gradient';
import {AuthContext} from '../../Context/AuthContext';
import {bgaBackendUrl, bgaSocketUrl} from '../../../Config';
import {AWS_CDN_URL} from '../../Utils/aws';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================
// 1. Limited comments to last 100 (reduces memory)
// 2. Memoized components with React.memo
// 3. Throttled scroll events
// 4. Batched socket event updates
// 5. Removed clipped subviews for better performance
// 6. Optimized FlatList configuration
// ============================================================================

const RANDOM_USERNAMES = [
  'ArunKumar', 'Kavya', 'Prakash', 'Divya', 'Suresh',
  'Lakshmi', 'Vijay', 'Revathi', 'Manikandan', 'Sandhya',
  'Ramesh', 'Meena', 'Senthil', 'Priya', 'Murugan',
  'Anitha', 'Karthik', 'Janani', 'Saravanan', 'Deepa'
];

const COLOR_PAIRS = [
  {bg: 'rgba(0, 128, 0, 0.3)', diamond: 'lightgreen'},
  {bg: 'rgba(0, 0, 255, 0.3)', diamond: 'lightblue'},
  {bg: 'rgba(255, 192, 203, 0.3)', diamond: 'lightpink'},
];

const MAX_COMMENTS = 100; // Limit visible comments for performance

const getColorPair = (identifier: string) => {
  const idStr = identifier?.toString() || '0';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash += idStr.charCodeAt(i);
  }
  return COLOR_PAIRS[hash % COLOR_PAIRS.length];
};

// ============================================================================
// MEMOIZED COMMENT ITEM COMPONENT
// ============================================================================

interface CommentItemProps {
  item: any;
  expandedComments: Record<string, boolean>;
  toggleCommentExpansion: (commentId: string) => void;
  getConsistentRandomUsername: (commentId: string) => string;
}

const CommentItem = React.memo(({
  item,
  expandedComments,
  toggleCommentExpansion,
  getConsistentRandomUsername,
}: CommentItemProps) => {
  const selectedPair = useMemo(() => getColorPair(item?.user?._id || '0'), [item?.user?._id]);
  const username = useMemo(() => {
    return item?.user?.userName || item?.user?.name || getConsistentRandomUsername(item?._id);
  }, [item?.user?.userName, item?.user?.name, item?._id, getConsistentRandomUsername]);

  if (!item || !item._id) {
    return null;
  }

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
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
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
});

CommentItem.displayName = 'CommentItem';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LiveComments = ({
  streamId,
  prevComments,
  navigateToStore,
  isKeyboardVisible,
  isShowUpcoming,
}: any) => {
  // ✅ OPTIMIZED: Limit comments to last 100 for performance
  const [comments, setComments] = useState(() => {
    const initial = prevComments || [];
    return initial.slice(-MAX_COMMENTS);
  });
  
  const [input, setInput] = useState('');
  const {user} = useContext(AuthContext);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const commentsContainerRef = useRef<FlatList>(null);
  const keyboardOffset = Platform.OS === 'ios' ? 90 : 0;

  const [commentsVisible, setCommentsVisible] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  const socketRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const randomUsernameCache = useRef<Record<string, string>>({});
  
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  
  // ✅ OPTIMIZED: Batch comment updates
  const pendingCommentsRef = useRef<any[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getConsistentRandomUsername = useCallback((commentId: string) => {
    if (randomUsernameCache.current[commentId]) {
      return randomUsernameCache.current[commentId];
    }
    
    const randomIndex = Math.floor(Math.random() * RANDOM_USERNAMES.length);
    const randomUsername = RANDOM_USERNAMES[randomIndex];
    randomUsernameCache.current[commentId] = randomUsername;
    
    return randomUsername;
  }, []);

  // ✅ OPTIMIZED: Throttled scroll to bottom
  const scrollToBottom = useCallback((animated = true) => {
    if (isScrollingRef.current) return;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (commentsContainerRef.current) {
        isScrollingRef.current = true;
        commentsContainerRef.current.scrollToEnd({animated});
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 300);
      }
    }, 50);
  }, []);

  // ✅ OPTIMIZED: Batch process incoming comments
  const flushPendingComments = useCallback(() => {
    if (pendingCommentsRef.current.length > 0) {
      setComments(prev => {
        const combined = [...prev, ...pendingCommentsRef.current];
        // Keep only last 100 comments
        return combined.slice(-MAX_COMMENTS);
      });
      pendingCommentsRef.current = [];
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [scrollToBottom]);

  const fetchPreviousComments = useCallback(async () => {
    if (!streamId) return;

    try {
      const response = await axios.get(
        `${bgaBackendUrl}/api/comments/show/${streamId}?limit=100`,
      );
      const result = response.data;

      if (result.success && result.data) {
        const commentsArray = Array.isArray(result.data) ? result.data : [];
        // Keep only last 100 comments
        setComments(commentsArray.slice(-MAX_COMMENTS));
        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error.message);
    }
  }, [streamId, scrollToBottom]);

  useEffect(() => {
    if (streamId) {
      if (prevComments && prevComments.length > 0) {
        setComments(prevComments.slice(-MAX_COMMENTS));
        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
      } else {
        setComments([]);
        fetchPreviousComments();
      }
    }
  }, [streamId, prevComments, fetchPreviousComments, scrollToBottom]);

  const initializeSocket = useCallback(() => {
    if (!streamId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    socketRef.current = io(bgaSocketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      reconnectAttemptsRef.current = 0;
      socket.emit('joinRoom', streamId);
    });

    socket.on('disconnect', () => {
      // Handle disconnect
    });

    socket.on('connect_error', () => {
      reconnectAttemptsRef.current++;
    });

    socket.on('reconnect', () => {
      reconnectAttemptsRef.current = 0;
    });

    // ✅ OPTIMIZED: Batch comment updates
    socket.on(`commentAdded-${streamId}`, (comment: any) => {
      if (comment) {
        pendingCommentsRef.current.push(comment);
        
        // Clear existing timer
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
        }
        
        // Flush after 200ms of inactivity or immediately if buffer is large
        if (pendingCommentsRef.current.length >= 5) {
          flushPendingComments();
        } else {
          batchTimerRef.current = setTimeout(flushPendingComments, 200);
        }
      }
    });

    return socket;
  }, [streamId, flushPendingComments]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          } else {
            socketRef.current.emit('joinRoom', streamId);
          }
        } else {
          initializeSocket();
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [streamId, initializeSocket]);

  useEffect(() => {
    if (!streamId) return;

    initializeSocket();

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [streamId, initializeSocket]);

  // ✅ OPTIMIZED: Throttled scroll handler
  const handleScroll = useCallback((e: any) => {
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
    if (!isKeyboardVisible) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  }, [isKeyboardVisible, scrollToBottom]);

  const handleSend = useCallback(() => {
    if (input.trim() && user && socketRef.current) {
      const newComment = {
        user,
        text: input,
        timestamp: new Date().toISOString(),
        streamId,
      };
      
      if (!socketRef.current.connected) {
        socketRef.current.connect();
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('newComment', newComment);
          }
        }, 1000);
      } else {
        socketRef.current.emit('newComment', newComment);
      }
      
      setInput('');
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
  }, [input, user, streamId, scrollToBottom]);

  const toggleCommentExpansion = useCallback((commentId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const renderItem = useCallback(
    ({item}: any) => (
      <CommentItem
        item={item}
        expandedComments={expandedComments}
        toggleCommentExpansion={toggleCommentExpansion}
        getConsistentRandomUsername={getConsistentRandomUsername}
      />
    ),
    [expandedComments, toggleCommentExpansion, getConsistentRandomUsername],
  );

  const keyExtractor = useCallback((item: any, index: number) => {
    if (!item || !item._id) {
      return `fallback-${index}`;
    }
    return item._id.toString();
  }, []);

  const contentContainerStyle = useMemo((): ViewStyle => ({
    flexGrow: 1, 
    justifyContent: 'flex-end' as const,
    paddingBottom: isKeyboardVisible ? 10 : 0
  }), [isKeyboardVisible]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
      style={styles.container}>
      <View style={styles.commentsWrapper}>
        <FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ref={commentsContainerRef}
          data={comments}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={[
            styles.commentsList,
            !commentsVisible && {height: 0, opacity: 0},
          ]}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={true}
          maintainVisibleContentPosition={
            !isKeyboardVisible ? {
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            } : undefined
          }
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          windowSize={10}
        />
      </View>

      {showScrollButton && (
        <TouchableOpacity onPress={() => scrollToBottom(true)} style={styles.scrollButton}>
          <Feather name="chevrons-down" size={24} color="white" />
        </TouchableOpacity>
      )}

      <View
        style={[styles.inputContainer, isKeyboardVisible && {width: '96%'}]}>
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
            multiline={false}
            blurOnSubmit={false}
          />
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
        </LinearGradient>

        {!isKeyboardVisible && (
          <>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => setCommentsVisible(!commentsVisible)}>
              <Ionicons
                name={commentsVisible ? 'eye' : 'eye-off'}
                color="#eee"
                size={25}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={navigateToStore}>
              <Ionicons name="storefront-outline" color="#eee" size={25} />
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
  commentsWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  commentsList: {
    flex: 1,
    height: 'auto',
    padding: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingEnd: 100
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
    fontSize: 16,
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
    bottom: 80,
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
    width: '75%',
    gap: 4
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(LiveComments);
