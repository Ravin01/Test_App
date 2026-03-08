import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  AppState,
  InteractionManager,
  DeviceEventEmitter,
  Vibration,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  LongPressGestureHandler,
} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Feather';
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Flag,
  UserX,
  X,
  Shield,
} from 'lucide-react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmojiPicker from 'rn-emoji-keyboard';

// Import ultra-performance chat components
import UltraChatEngine from './UltraChatEngine';
import OfflineMessageSync from './OfflineMessageSync';
import { ChatMetrics, ChatMetricsDashboard } from './ChatMetrics';
import ChatSoundManager from './ChatSoundManager';
import {
  PulseEnergyIndicator,
  EmotionWaveTyping,
  ImpactReactionPicker,
  SmartTonePicker,
  GestureMagicWrapper,
  VibeIndicator,
} from './FlykupChatInnovations';
import {
  InteractiveProductCard,
  InChatOrderTracking,
  // AIShoppingAssistant removed - No AI features
  QuickPaymentWidget,
} from './CommerceChat';
import QuickChatBubble from './QuickChatBubble';

// Original imports
import axiosInstance from '../../Utils/Api';
import { AuthContext } from '../../Context/AuthContext';
import { Toast } from '../../Utils/dateUtils';
import { AWS_CDN_URL } from '../../Utils/aws';
import { colors } from '../../Utils/Colors';
import MessageItem from './MessageItem';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

/**
 * 🚀 INTEGRATED ULTRA CHAT SCREEN
 * Combines the original ChatScreen with ultra-performance features
 * Seamlessly integrates all new innovations while maintaining compatibility
 */
const IntegratedUltraChatScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const data = route.params || '';
  const chatRoom = data?.chatRoom;
  
  // Original state
  const [inputText, setInputText] = useState('');
  const [lastTypingSoundTime, setLastTypingSoundTime] = useState(0);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [userOnlineStatus, setUserOnlineStatus] = useState('offline');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    blockedByCurrentUser: false,
    blockedByOtherUser: false,
    blockMessage: null,
    canUnblock: false,
  });
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
  
  // Ultra-performance state - ALWAYS ON (No basic mode)
  const ultraMode = true; // Permanently enabled - FLYKUP only uses Ultra mode
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false);
  // const [showShoppingAssistant, setShowShoppingAssistant] = useState(false); // Removed - No AI
  const [currentUserVibe, setCurrentUserVibe] = useState('productive');
  const [smartToneMode, setSmartToneMode] = useState('adaptive');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [trackingOrders, setTrackingOrders] = useState([]);
  const [paymentInProgress, setPaymentInProgress] = useState(null);
  
  // Advanced User Management States
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [quickChatEnabled, setQuickChatEnabled] = useState(false);
  const [showQuickChatBubble, setShowQuickChatBubble] = useState(false);
  
  // Refs
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  
  // Animated values for ultra features
  const messageScale = useSharedValue(1);
  const pulseAnimation = useSharedValue(0);
  const gestureIndicator = useSharedValue(0);
  
  // Get other participant info
  const getOtherParticipant = useCallback(() => {
    if (!chatRoom?.participants || !user?._id) return null;
    return chatRoom.participants.find(
      p => p?.userId?._id && p.userId._id !== user._id,
    );
  }, [chatRoom?.participants, user?._id]);
  
  const otherParticipant = getOtherParticipant();
  
  /**
   * 🚀 ULTRA CHAT ENGINE INITIALIZATION
   */
  useEffect(() => {
    const initializeUltraChat = async () => {
      try {
        if (ultraMode && user?._id) {
          // Initialize ultra chat engine
          const connected = await UltraChatEngine.connect(user._id, chatRoom?._id);
          setSocketConnected(connected);
          
          console.log('🚀 Ultra Chat Engine initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Ultra Chat Engine:', error);
        // Fallback to original implementation
        setUltraMode(false);
      }
    };
    
    initializeUltraChat();
    
    return () => {
      UltraChatEngine.disconnect();
    };
  }, [ultraMode, user?._id, chatRoom?._id]);
  
  /**
   * 📊 SETUP ULTRA METRICS
   */
  useEffect(() => {
    if (!ultraMode) return;
    
    const metricsListener = DeviceEventEmitter.addListener('metricsUpdate', (data) => {
      // Handle metrics updates for real-time monitoring
      if (data.realTime.currentLatency > 1000) {
        // Show performance warning
        Toast('Network latency high - optimizing performance...');
      }
    });
    
    const alertListener = DeviceEventEmitter.addListener('performanceAlert', (alert) => {
      if (alert.type === 'critical') {
        Toast(`Performance Alert: ${alert.message}`);
      }
    });
    
    return () => {
      metricsListener.remove();
      alertListener.remove();
    };
  }, [ultraMode]);
  
  /**
   * 💬 ULTRA MESSAGE SENDING
   */
  const handleUltraSendMessage = useCallback(async () => {
    if (!inputText.trim() || !ultraMode) {
      return handleOriginalSendMessage();
    }
    
    try {
      // 🔊 Play send sound immediately for instant feedback
      ChatSoundManager.playMessageSent();
      
      // Add haptic feedback
      Vibration.vibrate(10);
      
      // Animate send action
      messageScale.value = withSpring(0.95, {}, () => {
        messageScale.value = withSpring(1);
      });
      
      const message = await UltraChatEngine.sendMessage(
        inputText.trim(),
        chatRoom._id,
        {
          recipientId: otherParticipant?.userId?._id,
          replyTo: replyToMessage?.id,
          priority: 'normal',
        }
      );
      
      // Add to messages with optimistic update
      setMessages(prev => [...prev, message]);
      
      // Clear input and reply
      setInputText('');
      setReplyToMessage(null);
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Ultra message send failed:', error);
      // Fallback to original implementation
      handleOriginalSendMessage();
    }
  }, [inputText, ultraMode, chatRoom._id, otherParticipant, replyToMessage]);
  
  /**
   * 📱 ORIGINAL MESSAGE SENDING (FALLBACK)
   */
  const handleOriginalSendMessage = useCallback(async () => {
    if (!inputText.trim() || !user || blockStatus.isBlocked) {
      return;
    }
    
    try {
      // 🔊 Play send sound for regular messages too
      ChatSoundManager.playMessageSent();
      
      setSending(true);
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const tempMessage = {
        _id: tempId,
        chatRoomId: chatRoom._id,
        senderId: {
          _id: user._id,
          name: user.name || 'You',
          profileURL: user.profileURL || null,
        },
        messageType: 'text',
        content: { text: inputText.trim() },
        createdAt: new Date().toISOString(),
        status: 'sending',
        deliveryStatus: [],
        reactions: [],
        metadata: {
          editHistory: [],
          editedAt: null,
          isEdited: false,
        },
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      const response = await axiosInstance.post(
        `chat/rooms/${chatRoom._id}/messages`,
        {
          messageType: 'text',
          content: { text: inputText.trim() },
          metadata: {},
        },
      );
      
      if (response.data.status) {
        const newMessage = response.data.data;
        setMessages(prev =>
          prev.map(msg => (msg._id === tempId ? newMessage : msg)),
        );
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
        Toast(response.data.message || 'Failed to send message');
      }
      
      setInputText('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m._id.startsWith('temp_')));
      Toast('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [inputText, user, blockStatus.isBlocked, chatRoom._id]);
  
  /**
   * ⌨️ ULTRA TYPING HANDLER
   */
  const handleUltraTyping = useCallback((text) => {
    setInputText(text);
    
    // 🔊 Play subtle typing sound (throttled to avoid spam)
    const now = Date.now();
    if (text.length > inputText.length && now - lastTypingSoundTime > 100) {
      ChatSoundManager.playTypingSound();
      setLastTypingSoundTime(now);
    }
    
    if (ultraMode) {
      // Enhanced typing with emotion detection
      const isExcited = text.includes('!') || text.includes('🎉') || text.includes('🔥');
      const isThinking = text.includes('...') || text.includes('🤔');
      const isHappy = text.includes('😊') || text.includes('😄') || text.includes('❤️');
      
      let emotion = 'neutral';
      if (isExcited) emotion = 'excited';
      else if (isThinking) emotion = 'thinking';
      else if (isHappy) emotion = 'happy';
      
      UltraChatEngine.sendTyping(chatRoom._id, text.length > 0, emotion);
    } else {
      // Original typing logic
      if (text.length > 0) {
        // Handle original typing
      }
    }
  }, [ultraMode, chatRoom._id, inputText.length, lastTypingSoundTime]);
  
  /**
   * 😀 ULTRA REACTION HANDLER
   */
  const handleUltraReaction = useCallback(async (messageId, reactionType) => {
    if (ultraMode) {
      try {
        await UltraChatEngine.addReaction(messageId, reactionType, true);
        
        // Trigger haptic feedback based on reaction type
        const hapticPatterns = {
          spark: [50, 100, 50],
          boom: [100, 200, 100],
          heart: [30, 50, 30],
          'mind-blown': [100, 50, 100, 50, 100],
          fire: [75, 150, 75],
          ice: [25, 100, 25],
        };
        
        Vibration.vibrate(hapticPatterns[reactionType] || [50]);
        
      } catch (error) {
        console.error('Ultra reaction failed:', error);
      }
    }
  }, [ultraMode]);
  
  /**
   * 🛒 COMMERCE INTEGRATION HANDLERS
   */
  const handleProductShare = useCallback(async (product) => {
    if (ultraMode) {
      try {
        await UltraChatEngine.shareProduct(
          {
            id: product.id,
            title: product.title,
            price: product.price,
            imageUrl: product.imageUrl,
            available: true,
            quickBuyEnabled: true,
          },
          chatRoom._id
        );
        
        setShowProductPicker(false);
        Toast('Product shared successfully!');
        
      } catch (error) {
        console.error('Product share failed:', error);
        Toast('Failed to share product');
      }
    }
  }, [ultraMode, chatRoom._id]);
  
  const handleQuickPayment = useCallback(async (amount, productName) => {
    if (ultraMode) {
      setPaymentInProgress({ amount, productName });
    }
  }, [ultraMode]);
  
  /**
   * 🎨 GESTURE HANDLERS
   */
  const handleMessageGesture = useCallback((gesture, messageId) => {
    if (!ultraMode) return;
    
    switch (gesture) {
      case 'reply':
        const message = messages.find(m => m._id === messageId);
        setReplyToMessage(message);
        break;
      case 'react':
        setSelectedMessageForReaction(messageId);
        setShowEmojiPicker(true);
        break;
      case 'save':
        // Handle save message
        Toast('Message saved!');
        break;
      case 'forward':
        // Handle forward message
        Toast('Forward feature coming soon!');
        break;
      case 'translate':
        // Handle translate message
        Toast('Translation feature coming soon!');
        break;
      case 'shop':
        if (messages.find(m => m._id === messageId)?.products) {
          setShowProductPicker(true);
        }
        break;
    }
  }, [ultraMode, messages]);

  /**
   * ⭐ INNOVATIVE FAVORITES SYSTEM
   */
  const handleToggleFavorite = useCallback(async () => {
    try {
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);
      
      // 🔊 Play special sound for favorites
      if (newFavoriteStatus) {
        ChatSoundManager.playReactionAdded(); // Star sound
        console.log('⭐ Added to favorites - Quick chat enabled!');
      }
      
      // Save to backend
      await axiosInstance.post(`/chat/favorites/${otherParticipant?.userId?._id}`, {
        isFavorite: newFavoriteStatus,
        quickChatEnabled: newFavoriteStatus,
      });
      
      // Enable quick chat features for favorites
      setQuickChatEnabled(newFavoriteStatus);
      
      // Show/hide quick chat bubble
      setShowQuickChatBubble(newFavoriteStatus);
      
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      // Revert on error
      setIsFavorite(!isFavorite);
    }
  }, [isFavorite, otherParticipant?.userId?._id]);

  /**
   * 💬 QUICK MESSAGE HANDLER (For Quick Chat Bubble)
   */
  const handleQuickMessage = useCallback(async (message: string) => {
    try {
      console.log('💬 Sending quick message:', message);
      
      // Use the same send logic but with pre-defined message
      setInputText(message);
      
      // Send immediately
      if (ultraMode) {
        handleUltraSendMessage();
      } else {
        handleOriginalSendMessage();
      }
      
      // Clear input after sending
      setTimeout(() => setInputText(''), 100);
      
    } catch (error) {
      console.error('❌ Quick message failed:', error);
    }
  }, [ultraMode]);

  /**
   * 🔇 MUTE USER HANDLER
   */
  const handleMuteUser = useCallback(async () => {
    try {
      const newMutedStatus = !isMuted;
      setIsMuted(newMutedStatus);
      
      await axiosInstance.post(`/chat/mute/${otherParticipant?.userId?._id}`, {
        isMuted: newMutedStatus,
      });
      
      console.log(`🔇 User ${newMutedStatus ? 'MUTED' : 'UNMUTED'}`);
      
    } catch (error) {
      console.error('❌ Failed to mute user:', error);
      setIsMuted(!isMuted);
    }
  }, [isMuted, otherParticipant?.userId?._id]);

  /**
   * 🚫 BLOCK USER HANDLER
   */
  const handleBlockUser = useCallback(async () => {
    try {
      await axiosInstance.post(`/chat/block/${otherParticipant?.userId?._id}`);
      
      setBlockStatus({
        isBlocked: true,
        blockedByCurrentUser: true,
        blockedByOtherUser: false,
        blockMessage: 'You have blocked this user',
        canUnblock: true,
      });
      
      console.log('🚫 User blocked successfully');
      
    } catch (error) {
      console.error('❌ Failed to block user:', error);
    }
  }, [otherParticipant?.userId?._id]);

  /**
   * 🚨 REPORT USER HANDLER
   */
  const handleReportUser = useCallback(async () => {
    try {
      const reportReason = 'inappropriate_content'; // Could be from a picker
      
      await axiosInstance.post(`/chat/report/${otherParticipant?.userId?._id}`, {
        reason: reportReason,
        chatRoomId: chatRoom._id,
      });
      
      console.log('🚨 User reported successfully');
      
    } catch (error) {
      console.error('❌ Failed to report user:', error);
    }
  }, [otherParticipant?.userId?._id, chatRoom._id]);
  
  /**
   * 📱 ORIGINAL CHAT FUNCTIONS (PRESERVED)
   */
  
  // Focus handling
  useFocusEffect(
    useCallback(() => {
      const onFocus = async (chatRoomId) => {
        await AsyncStorage.setItem('active_chat_room_id', chatRoomId);
      };
      
      const onBlur = async () => {
        await AsyncStorage.removeItem('active_chat_room_id');
      };
      
      onFocus(chatRoom?._id);
      return () => onBlur();
    }, [chatRoom?._id])
  );
  
  // Load messages
  const fetchMessages = useCallback(async () => {
    if (!chatRoom?._id) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/chat/rooms/${chatRoom._id}/messages`,
        { params: { page: 1, limit: 50 } },
      );
      
      if (response.data.status) {
        const fetchedMessages = response.data.data || [];
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chatRoom?._id]);
  
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);
  
  // Render message with ultra features
  const renderUltraMessage = useCallback(({ item: message, index }) => {
    if (ultraMode) {
      return (
        <GestureMagicWrapper
          messageId={message._id}
          onGesture={handleMessageGesture}
        >
          <View style={styles.ultraMessageContainer}>
            {/* Original message component */}
            <MessageItem
              message={message}
              index={index}
              messages={messages}
              currentUserId={user?._id}
              otherParticipant={otherParticipant}
              navigation={navigation}
              onReaction={(id) => setSelectedMessageForReaction(id)}
              onRemoveReaction={() => {}}
            />
            
            {/* Ultra features overlay */}
            {message.senderId._id === user?._id && (
              <PulseEnergyIndicator
                messageId={message._id}
                status={message.status || 'sent'}
                isOwnMessage={true}
              />
            )}
            
            {/* Impact reactions */}
            <ImpactReactionPicker
              messageId={message._id}
              onReact={handleUltraReaction}
              reactions={message.reactions || []}
            />
            
            {/* Product cards */}
            {message.products?.map((product) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {}}
                onQuickBuy={() => handleQuickPayment(product.price, product.title)}
                onChatWithSeller={() => {}}
                onViewDetails={() => {}}
                chatContext={true}
              />
            ))}
          </View>
        </GestureMagicWrapper>
      );
    } else {
      return (
        <MessageItem
          message={message}
          index={index}
          messages={messages}
          currentUserId={user?._id}
          otherParticipant={otherParticipant}
          navigation={navigation}
          onReaction={(id) => setSelectedMessageForReaction(id)}
          onRemoveReaction={() => {}}
        />
      );
    }
  }, [ultraMode, messages, user?._id, otherParticipant, navigation, handleMessageGesture, handleUltraReaction, handleQuickPayment]);
  
  // Ordered messages
  const orderedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
  }, [messages]);
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Ultra Performance Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#F7CE45" />
          </TouchableOpacity>
          
          <LinearGradient
            colors={['#FFD700', '#FCED9C', '#FAFAFA']}
            style={styles.avatarGradient}
          >
            <TouchableOpacity
              style={styles.avatarInner}
              onPress={() =>
                navigation.navigate('ViewSellerProdile', {
                  id: otherParticipant?.userId?.userName,
                })
              }
            >
              {otherParticipant?.userId?.profileURL?.key ? (
                <FastImage
                  source={{
                    uri: `${AWS_CDN_URL}${otherParticipant?.userId?.profileURL?.key}`,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarInitialsContainer}>
                  <Text style={styles.avatarInitials}>
                    {otherParticipant?.userId?.name
                      ?.replace(/[^a-zA-Z0-9]/g, '')
                      ?.substring(0, 2)
                      ?.toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherParticipant?.userId?.name || 'Unknown User'}
            </Text>
            
            {/* Ultra vibe indicator */}
            {ultraMode ? (
              <VibeIndicator
                userId={otherParticipant?.userId?._id}
                currentVibe={currentUserVibe}
                lastSeen={Date.now() - 5 * 60 * 1000}
              />
            ) : (
              <View style={styles.statusContainer}>
                {typingUsers.length > 0 ? (
                  ultraMode ? (
                    <EmotionWaveTyping
                      isTyping={true}
                      userName={otherParticipant?.userId?.name || 'User'}
                      emotion="neutral"
                    />
                  ) : (
                    <Text style={{ color: '#ccc' }}>typing... </Text>
                  )
                ) : (
                  <>
                    <View
                      style={[
                        styles.activeIndicator,
                        {
                          backgroundColor:
                            userOnlineStatus === 'online' ? '#22C55E' : '#999',
                        },
                      ]}
                    />
                    <Text style={styles.headerStatus}>
                      {userOnlineStatus === 'online'
                        ? 'Online'
                        : 'Last seen recently'}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            {/* 🛍️ COMMERCE: Quick Product Share Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowProductPicker(true)}
            >
              <Icon name="shopping-bag" size={20} color="#F7CE45" />
            </TouchableOpacity>
            
            {/* ⭐ FAVORITES: Quick Add to Favorites */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleFavorite()}
            >
              <Icon 
                name={isFavorite ? "star" : "star"} 
                size={20} 
                color={isFavorite ? "#FFD700" : "#F7CE45"} 
                fill={isFavorite ? "#FFD700" : "transparent"}
              />
            </TouchableOpacity>
            
            {/* ⚙️ OPTIONS: Advanced User Management */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowOptionsMenu(true)}
            >
              <MoreVertical size={20} color="#F7CE45" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Block status */}
        {blockStatus.isBlocked && (
          <View style={styles.blockContainer}>
            <Shield color={'#fff'} size={25} />
            <Text style={styles.blockText}>
              {blockStatus.blockMessage ||
                'Cannot send or receive messages due to blocking.'}
            </Text>
          </View>
        )}
        
        {/* Order tracking */}
        {ultraMode && trackingOrders.length > 0 && (
          <View style={styles.trackingContainer}>
            {trackingOrders.map((order) => (
              <InChatOrderTracking
                key={order.orderId}
                tracking={order}
                onTrackOrder={() => {}}
                onContactSupport={() => {}}
              />
            ))}
          </View>
        )}
        
        {/* Main Chat Area */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.chatBody}>
            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator
                  color={colors.primaryButtonColor}
                  size={'small'}
                />
              </View>
            ) : orderedMessages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start a conversation with{' '}
                  {otherParticipant?.userId?.name || 'this user'}
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={orderedMessages}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderUltraMessage}
                contentContainerStyle={styles.messagesContainer}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                windowSize={10}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={100}
                initialNumToRender={20}
                onContentSizeChange={() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: true });
                  }
                }}
                onLayout={() => {
                  setTimeout(() => {
                    if (flatListRef.current) {
                      flatListRef.current.scrollToEnd({ animated: false });
                    }
                  }, 100);
                }}
              />
            )}
            
            {/* Ultra typing indicator */}
            {ultraMode && typingUsers.length > 0 && (
              <EmotionWaveTyping
                isTyping={true}
                userName={otherParticipant?.userId?.name || 'User'}
                emotion="neutral"
              />
            )}
          </View>
          
          {/* Reply bar */}
          {ultraMode && replyToMessage && (
            <Reanimated.View style={styles.replyBar}>
              <View style={styles.replyContent}>
                <View style={styles.replyLine} />
                <View style={styles.replyTextContainer}>
                  <Text style={styles.replyName}>
                    {replyToMessage.senderId._id === user?._id ? 'You' : otherParticipant?.userId?.name}
                  </Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyToMessage.content?.text}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyToMessage(null)}>
                <Icon name="x" size={20} color="#666" />
              </TouchableOpacity>
            </Reanimated.View>
          )}
          
          {/* Input Area */}
          <Reanimated.View style={[styles.inputContainer, { transform: [{ scale: messageScale }] }]}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowAttachMenu(true)}
              >
                <Ionicons name="add" size={24} color="#F7CE45" />
              </TouchableOpacity>
              
              <TextInput
                value={inputText}
                onChangeText={handleUltraTyping}
                placeholder="Message..."
                placeholderTextColor="#999"
                style={styles.input}
                multiline
                maxLength={1000}
                textAlignVertical="center"
              />
              
              <TouchableOpacity
                style={styles.emojiButton}
                onPress={() => {
                  console.log('😊 Emoji button pressed - opening picker');
                  setSelectedMessageForReaction(null);
                  setShowEmojiPicker(true);
                }}
              >
                <Text style={styles.emojiText}>😊</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              onPress={ultraMode ? handleUltraSendMessage : handleOriginalSendMessage}
              style={[
                styles.sendButton,
                { opacity: inputText.trim().length === 0 ? 0.5 : 1 },
              ]}
              disabled={inputText.trim().length === 0 || sending}
            >
              {sending ? (
                <Ionicons name="hourglass-outline" size={20} color="#000" />
              ) : (
                <Ionicons name="send" size={20} color="#000" />
              )}
            </TouchableOpacity>
          </Reanimated.View>
        </KeyboardAvoidingView>
        
        {/* Ultra Features Modals */}
        
        {/* AI Shopping Assistant removed - No AI features */}
        
        {/* Metrics Dashboard */}
        {ultraMode && (
          <ChatMetricsDashboard
            visible={showMetricsDashboard}
            onClose={() => setShowMetricsDashboard(false)}
          />
        )}
        
        {/* Quick Payment */}
        {ultraMode && paymentInProgress && (
          <Modal visible={ultraMode && paymentInProgress} transparent animationType="fade">
            <View style={styles.modalContainer}>
              <QuickPaymentWidget
                amount={paymentInProgress.amount}
                productName={paymentInProgress.productName}
                sellerId={otherParticipant?.userId?._id}
                onPaymentComplete={() => setPaymentInProgress(null)}
                onPaymentCancel={() => setPaymentInProgress(null)}
              />
            </View>
          </Modal>
        )}
        
        {/* Smart Tone Picker */}
        {/* 🚀 ENHANCED USER MANAGEMENT MENU */}
        {/* {showOptionsMenu && ( */}
          <Modal visible={showOptionsMenu} style={{}} transparent animationType="slide" onRequestClose={()=>setShowOptionsMenu(false)}>
            {/* <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowOptionsMenu(false)}
            > */}
            <View style={styles.modalOverlay}>
              <ScrollView style={styles.enhancedOptionsMenu} scrollEnabled>
                <View style={styles.optionsHeader}>
                  <Text style={styles.optionsTitle}>Chat Options</Text>
                  <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                    <X size={24} color="#999" />
                  </TouchableOpacity>
                </View>
                
                {/* ⭐ FAVORITES SECTION */}
                <View style={styles.optionsSection}>
                  <Text style={styles.sectionTitle}>Quick Access</Text>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      handleToggleFavorite();
                      setShowOptionsMenu(false);
                    }}
                  >
                    <Icon 
                      name="star" 
                      size={20} 
                      color={isFavorite ? "#FFD700" : "#666"} 
                    />
                    <Text style={styles.optionText}>
                      {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </Text>
                    {isFavorite && <Text style={styles.statusBadge}>★</Text>}
                  </TouchableOpacity>
                  
                  {isFavorite && (
                    <View style={styles.subOption}>
                      <Text style={styles.subOptionText}>
                        🚀 Quick chat enabled - Instant access from favorites bar
                      </Text>
                    </View>
                  )}
                </View>

                {/* 🔇 PRIVACY CONTROLS */}
                <View style={styles.optionsSection}>
                  <Text style={styles.sectionTitle}>Privacy & Controls</Text>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      handleMuteUser();
                      setShowOptionsMenu(false);
                    }}
                  >
                    <Icon 
                      name={isMuted ? "volume-x" : "volume-2"} 
                      size={20} 
                      color={isMuted ? "#FF6B6B" : "#666"} 
                    />
                    <Text style={styles.optionText}>
                      {isMuted ? 'Unmute Messages' : 'Mute Messages'}
                    </Text>
                    {isMuted && <Text style={styles.statusBadge}>🔇</Text>}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      handleBlockUser();
                      setShowOptionsMenu(false);
                    }}
                  >
                    <Icon name="user-x" size={20} color="#FF6B6B" />
                    <Text style={[styles.optionText, { color: '#FF6B6B' }]}>
                      Block User
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      handleReportUser();
                      setShowOptionsMenu(false);
                    }}
                  >
                    <Icon name="flag" size={20} color="#FF9500" />
                    <Text style={[styles.optionText, { color: '#FF9500' }]}>
                      Report User
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 🎨 CUSTOMIZATION */}
                <View style={styles.optionsSection}>
                  <Text style={styles.sectionTitle}>Chat Customization</Text>
                  
                  <View style={styles.optionItem}>
                    <Icon name="feather" size={20} color="#666" />
                    <Text style={styles.optionText}>Chat Theme</Text>
                  </View>
                  
                  <SmartTonePicker
                    chatId={chatRoom._id}
                    currentTone={smartToneMode}
                    onToneChange={setSmartToneMode}
                  />
                </View>


                {/* 🛍️ COMMERCE FEATURES */}
                <View style={styles.optionsSection}>
                  <Text style={styles.sectionTitle}>Commerce</Text>
                  
                  <TouchableOpacity 
                    style={styles.optionItem}
                    onPress={() => {
                      setShowProductPicker(true);
                      setShowOptionsMenu(false);
                    }}
                  >
                    <Icon name="shopping-cart" size={20} color="#4CAF50" />
                    <Text style={styles.optionText}>Share Products</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.optionItem}>
                    <Icon name="credit-card" size={20} color="#2196F3" />
                    <Text style={styles.optionText}>Payment History</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              </View>
            {/* </Pressable> */}
          </Modal>
        {/* )} */}
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            open={showEmojiPicker}
            onClose={() => {
              setShowEmojiPicker(false);
              setSelectedMessageForReaction(null);
            }}
            onEmojiSelected={(emoji) => {
              try {
                if (selectedMessageForReaction) {
                  // Add emoji as reaction to message
                  console.log('📧 Adding emoji reaction:', emoji.emoji, 'to message:', selectedMessageForReaction);
                  handleUltraReaction(selectedMessageForReaction, emoji.emoji);
                  setSelectedMessageForReaction(null);
                } else {
                  // Add emoji to text input
                  console.log('😊 Adding emoji to input:', emoji.emoji);
                  setInputText(prev => (prev || '') + emoji.emoji);
                }
                setShowEmojiPicker(false);
              } catch (error) {
                console.error('❌ Emoji selection failed:', error);
                setShowEmojiPicker(false);
              }
            }}
            theme={{
              knob: '#766dfc',
              container: '#282829',
              header: '#fff',
              skinTonesContainer: '#252427',
              category: {
                icon: '#766dfc',
                iconActive: '#fff',
                container: '#252427',
                containerActive: '#766dfc',
              },
            }}
          />
        )}
        
        {/* 🚀 INNOVATIVE QUICK CHAT BUBBLE */}
        {quickChatEnabled && showQuickChatBubble && otherParticipant && (
          <QuickChatBubble
            user={{
              _id: otherParticipant.userId._id,
              name: otherParticipant.userId.name,
              profileURL: otherParticipant.userId.profileURL,
            }}
            isVisible={showQuickChatBubble}
            onQuickMessage={handleQuickMessage}
            onNavigateToChat={() => {
              setShowQuickChatBubble(false);
              // Already in chat, just focus input
              console.log('📱 Already in chat - focusing input');
            }}
            onClose={() => setShowQuickChatBubble(false)}
          />
        )}
        
        {/* Ultra Mode Always Active - No toggle needed */}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 28,
    padding: 2,
    marginLeft: 12,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    padding: 1,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarInitialsContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    color: '#F7CE45',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  activeIndicator: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    height: 8,
    width: 8,
    marginRight: 6,
  },
  headerStatus: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  blockContainer: {
    padding: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    gap: 10,
  },
  blockText: {
    color: '#fff',
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
  },
  trackingContainer: {
    paddingHorizontal: 10,
  },
  chatBody: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  ultraMessageContainer: {
    position: 'relative',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  replyContent: {
    flex: 1,
    flexDirection: 'row',
  },
  replyLine: {
    width: 3,
    backgroundColor: colors.primaryButtonColor,
    marginRight: 10,
  },
  replyTextContainer: {
    flex: 1,
  },
  replyName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryButtonColor,
  },
  replyText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 40,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlignVertical: 'center',
  },
  attachButton: {
    marginRight: 8,
    padding: 4,
  },
  emojiButton: {
    marginLeft: 8,
    padding: 4,
  },
  emojiText: {
    fontSize: 20,
  },
  sendButton: {
    backgroundColor: '#F7CE45',
    borderRadius: 20,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  closeButton: {
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  ultraToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 1000,
  },
  ultraToggleText: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // 🚀 ENHANCED OPTIONS MENU STYLES
  modalOverlay: {
    position:'absolute',
    // top:0,
    // bottom:0,
    // flex: 1,
    height:600,
    paddingHorizontal:10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    // backgroundColor:'red',
    justifyContent: 'flex-end',
  },
  enhancedOptionsMenu: {
    backgroundColor: '#1A1A1A',
    // backgroundColor:'red',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    // maxHeight: height * 0.8,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  optionsTitle: {
    color: '#F7CE45',
    fontSize: 20,
    fontWeight: 'bold',
  },
  optionsSection: {
    // backgroundColor:'red',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#2A2A2A',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#F7CE45',
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  subOption: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    marginLeft: 35,
  },
  subOptionText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default IntegratedUltraChatScreen;