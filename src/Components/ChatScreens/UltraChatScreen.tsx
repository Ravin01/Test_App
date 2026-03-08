import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Animated,
  Vibration,
  Pressable,
  Image,
  Modal,
  ScrollView,
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
  PanGestureHandler,
  State,
  LongPressGestureHandler,
} from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BlurView } from '@react-native-community/blur';
import LottieView from 'lottie-react-native';
import Sound from 'react-native-sound';
import { colors } from '../../Utils/Colors';
import UltraChatEngine from './UltraChatEngine';
import { AWS_CDN_URL } from '../../Utils/aws';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  media?: any[];
  reactions?: any[];
  replyTo?: any;
  products?: any[];
  voiceNote?: any;
  location?: any;
  poll?: any;
  sticker?: any;
  payment?: any;
}

interface UltraChatScreenProps {
  navigation: any;
  route: any;
}

/**
 * 🚀 ULTRA CHAT SCREEN
 * Next-gen chat interface that beats WhatsApp, Telegram, Instagram & TikTok
 * Features unique Flykup-style UX with commerce integration
 */
const UltraChatScreen: React.FC<UltraChatScreenProps> = ({ navigation, route }) => {
  const { chatRoomId, recipientId, recipientName, recipientAvatar } = route.params;
  
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimerRef = useRef<NodeJS.Timeout>();
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const soundRef = useRef<Sound | null>(null);
  
  // Animated values
  const inputHeight = useSharedValue(50);
  const typingIndicatorOpacity = useSharedValue(0);
  const sendButtonScale = useSharedValue(1);
  const attachMenuHeight = useSharedValue(0);
  const messageScale = useSharedValue(1);
  const pulseAnimation = useSharedValue(0);
  
  // Performance optimizations
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    waitForInteraction: false,
  }).current;
  
  const keyExtractor = useCallback((item: Message) => item.id, []);
  
  /**
   * 🎯 INITIALIZE CHAT
   */
  useEffect(() => {
    initializeChat();
    setupEventListeners();
    loadMessages();
    
    return () => {
      cleanup();
    };
  }, []);
  
  const initializeChat = async () => {
    try {
      const userId = await getUserId();
      await UltraChatEngine.connect(userId, chatRoomId);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setIsLoading(false);
    }
  };
  
  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const setupEventListeners = () => {
    // Message events
    DeviceEventEmitter.addListener('messageReceived', handleMessageReceived);
    DeviceEventEmitter.addListener('messageStatusUpdate', handleMessageStatusUpdate);
    DeviceEventEmitter.addListener('messageEdited', handleMessageEdited);
    DeviceEventEmitter.addListener('messageDeleted', handleMessageDeleted);
    
    // Typing events
    DeviceEventEmitter.addListener('typingStart', handleTypingStart);
    DeviceEventEmitter.addListener('typingStop', handleTypingStop);
    
    // Presence events
    DeviceEventEmitter.addListener('userOnline', handleUserOnline);
    DeviceEventEmitter.addListener('userOffline', handleUserOffline);
    
    // Reaction events
    DeviceEventEmitter.addListener('reactionAdded', handleReactionAdded);
    
    // Commerce events
    DeviceEventEmitter.addListener('productShared', handleProductShared);
    
    // Performance events
    DeviceEventEmitter.addListener('chatMetrics', handleMetrics);
  };
  
  const cleanup = () => {
    DeviceEventEmitter.removeAllListeners();
    UltraChatEngine.disconnect();
    
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (soundRef.current) {
      soundRef.current.release();
    }
  };
  
  /**
   * 💬 SEND MESSAGE
   */
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() && !replyToMessage) return;
    
    // Haptic feedback
    Vibration.vibrate(10);
    
    // Animate send button
    sendButtonScale.value = withSpring(0.8, {}, () => {
      sendButtonScale.value = withSpring(1);
    });
    
    try {
      const message = await UltraChatEngine.sendMessage(
        inputText.trim(),
        chatRoomId,
        {
          recipientId,
          replyTo: replyToMessage?.id,
        }
      );
      
      // Add to messages with animation
      setMessages(prev => [message, ...prev]);
      
      // Play send sound
      playSound('message_sent');
      
      // Clear input
      setInputText('');
      setReplyToMessage(null);
      
      // Reset input height
      inputHeight.value = withTiming(50);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      showErrorToast('Failed to send message');
    }
  }, [inputText, replyToMessage, chatRoomId, recipientId]);
  
  /**
   * ⌨️ HANDLE TYPING
   */
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    
    // Adjust input height dynamically
    const lines = text.split('\n').length;
    const newHeight = Math.min(Math.max(50, lines * 22 + 28), 120);
    inputHeight.value = withTiming(newHeight);
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      UltraChatEngine.sendTyping(chatRoomId, true);
    }
    
    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Stop typing after 3 seconds
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      UltraChatEngine.sendTyping(chatRoomId, false);
    }, 3000);
  }, [chatRoomId, isTyping]);
  
  /**
   * 🎤 VOICE RECORDING
   */
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    
    // Haptic feedback
    Vibration.vibrate(50);
    
    // Start pulse animation
    pulseAnimation.value = withTiming(1, {
      duration: 1000,
    }, () => {
      pulseAnimation.value = withTiming(0, { duration: 1000 });
    });
    
    // Start duration timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    // Start actual recording
    // (Implementation would use react-native-audio-recorder-player)
  }, []);
  
  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    // Stop pulse animation
    pulseAnimation.value = withTiming(0);
    
    // Haptic feedback
    Vibration.vibrate(10);
    
    // Process and send voice note
    // const audioData = await stopAudioRecording();
    // await UltraChatEngine.sendVoiceNote(audioData, chatRoomId);
  }, [chatRoomId]);
  
  /**
   * 🖼️ ATTACH MEDIA
   */
  const showAttachmentMenu = useCallback(() => {
    setShowAttachMenu(true);
    attachMenuHeight.value = withSpring(300);
    
    // Haptic feedback
    Vibration.vibrate(10);
  }, []);
  
  const hideAttachmentMenu = useCallback(() => {
    attachMenuHeight.value = withTiming(0, {}, () => {
      runOnJS(setShowAttachMenu)(false);
    });
  }, []);
  
  /**
   * 🛒 SHARE PRODUCT
   */
  const shareProduct = useCallback(async (product: any) => {
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
        chatRoomId
      );
      
      setShowProductPicker(false);
      playSound('product_shared');
      
    } catch (error) {
      console.error('Failed to share product:', error);
    }
  }, [chatRoomId]);
  
  /**
   * 😀 ADD REACTION
   */
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await UltraChatEngine.addReaction(messageId, emoji);
      
      // Haptic feedback
      Vibration.vibrate(10);
      
      // Play reaction sound
      playSound('reaction_added');
      
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, []);
  
  /**
   * 📍 SHARE LOCATION
   */
  const shareLocation = useCallback(async () => {
    try {
      // Get current location
      // const location = await getCurrentLocation();
      
      // await UltraChatEngine.shareLocation(
      //   {
      //     latitude: location.latitude,
      //     longitude: location.longitude,
      //     accuracy: location.accuracy,
      //   },
      //   chatRoomId
      // );
      
      hideAttachmentMenu();
      
    } catch (error) {
      console.error('Failed to share location:', error);
    }
  }, [chatRoomId]);
  
  /**
   * 🎨 MESSAGE RENDERER
   */
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === getCurrentUserId();
    
    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onLongPress={() => handleMessageLongPress(item)}
        onDoubleTap={() => addReaction(item.id, '❤️')}
        onReply={() => setReplyToMessage(item)}
        onSwipeReply={() => setReplyToMessage(item)}
      />
    );
  }, []);
  
  /**
   * 🎯 TYPING INDICATOR
   */
  const renderTypingIndicator = () => {
    if (!recipientTyping) return null;
    
    return (
      <Reanimated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.typingIndicator}
      >
        <View style={styles.typingDots}>
          <Animated.View style={[styles.dot, { opacity: typingIndicatorOpacity }]} />
          <Animated.View style={[styles.dot, { opacity: typingIndicatorOpacity }]} />
          <Animated.View style={[styles.dot, { opacity: typingIndicatorOpacity }]} />
        </View>
        <Text style={styles.typingText}>{recipientName} is typing...</Text>
      </Reanimated.View>
    );
  };
  
  /**
   * 📎 ATTACHMENT MENU
   */
  const renderAttachmentMenu = () => {
    const menuStyle = useAnimatedStyle(() => ({
      height: attachMenuHeight.value,
      opacity: interpolate(attachMenuHeight.value, [0, 300], [0, 1]),
    }));
    
    return (
      <Reanimated.View style={[styles.attachmentMenu, menuStyle]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.attachOption} onPress={() => {}}>
            <View style={[styles.attachIcon, { backgroundColor: '#007AFF' }]}>
              <Icon name="image" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachOption} onPress={() => {}}>
            <View style={[styles.attachIcon, { backgroundColor: '#FF3B30' }]}>
              <Icon name="camera" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachOption} onPress={() => setShowProductPicker(true)}>
            <View style={[styles.attachIcon, { backgroundColor: '#FF9500' }]}>
              <Icon name="shopping-bag" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Product</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachOption} onPress={shareLocation}>
            <View style={[styles.attachIcon, { backgroundColor: '#4CD964' }]}>
              <Icon name="map-pin" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachOption} onPress={() => {}}>
            <View style={[styles.attachIcon, { backgroundColor: '#5856D6' }]}>
              <Icon name="file" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Document</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachOption} onPress={() => {}}>
            <View style={[styles.attachIcon, { backgroundColor: '#FF2D55' }]}>
              <Icon name="users" size={24} color="#fff" />
            </View>
            <Text style={styles.attachLabel}>Contact</Text>
          </TouchableOpacity>
        </ScrollView>
      </Reanimated.View>
    );
  };
  
  /**
   * 💬 INPUT BAR
   */
  const renderInputBar = () => {
    const inputBarStyle = useAnimatedStyle(() => ({
      minHeight: inputHeight.value,
    }));
    
    const sendButtonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: sendButtonScale.value }],
    }));
    
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {showAttachMenu && renderAttachmentMenu()}
        
        {replyToMessage && (
          <Reanimated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.replyBar}>
            <View style={styles.replyContent}>
              <View style={styles.replyLine} />
              <View style={styles.replyTextContainer}>
                <Text style={styles.replyName}>
                  {replyToMessage.senderId === getCurrentUserId() ? 'You' : recipientName}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {replyToMessage.text}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setReplyToMessage(null)}>
              <Icon name="x" size={20} color="#666" />
            </TouchableOpacity>
          </Reanimated.View>
        )}
        
        <Reanimated.View style={[styles.inputBar, inputBarStyle]}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={showAttachmentMenu}
          >
            <Icon name="paperclip" size={22} color="#666" />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={5000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          
          {inputText.trim() ? (
            <Reanimated.View style={sendButtonStyle}>
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Icon name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </Reanimated.View>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Icon name="mic" size={22} color={isRecording ? '#FF3B30' : '#666'} />
              {isRecording && (
                <Reanimated.View style={[styles.recordingPulse, { opacity: pulseAnimation }]} />
              )}
            </TouchableOpacity>
          )}
        </Reanimated.View>
      </KeyboardAvoidingView>
    );
  };
  
  // Event handlers
  const handleMessageReceived = (message: Message) => {
    setMessages(prev => [message, ...prev]);
    playSound('message_received');
    Vibration.vibrate(20);
  };
  
  const handleMessageStatusUpdate = (data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.id ? { ...msg, status: data.status } : msg
    ));
  };
  
  const handleMessageEdited = (data: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === data.id ? { ...msg, text: data.text, editedAt: data.editedAt } : msg
    ));
  };
  
  const handleMessageDeleted = (data: any) => {
    setMessages(prev => prev.filter(msg => msg.id !== data.id));
  };
  
  const handleTypingStart = (data: any) => {
    if (data.userId === recipientId) {
      setRecipientTyping(true);
      typingIndicatorOpacity.value = withTiming(1);
    }
  };
  
  const handleTypingStop = (data: any) => {
    if (data.userId === recipientId) {
      setRecipientTyping(false);
      typingIndicatorOpacity.value = withTiming(0);
    }
  };
  
  const handleUserOnline = (data: any) => {
    if (data.userId === recipientId) {
      setRecipientOnline(true);
    }
  };
  
  const handleUserOffline = (data: any) => {
    if (data.userId === recipientId) {
      setRecipientOnline(false);
    }
  };
  
  const handleReactionAdded = (data: any) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === data.messageId) {
        const reactions = msg.reactions || [];
        return { ...msg, reactions: [...reactions, data.reaction] };
      }
      return msg;
    }));
  };
  
  const handleProductShared = (data: any) => {
    // Handle product shared event
  };
  
  const handleMetrics = (metrics: any) => {
    console.log('Chat metrics:', metrics);
  };
  
  const handleMessageLongPress = (message: Message) => {
    Vibration.vibrate(50);
    setSelectedMessages(new Set([message.id]));
    // Show action menu
  };
  
  // Helper functions
  const getUserId = async () => {
    // Get current user ID from storage
    return 'current_user_id';
  };
  
  const getCurrentUserId = () => {
    return 'current_user_id';
  };
  
  const loadMessages = async () => {
    // Load messages from storage or API
    setMessages([]);
  };
  
  const playSound = (soundName: string) => {
    // Play sound effect
  };
  
  const showErrorToast = (message: string) => {
    // Show error toast
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryButtonColor} />
      </View>
    );
  }
  
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerInfo} onPress={() => {}}>
          <FastImage
            source={{ uri: recipientAvatar }}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{recipientName}</Text>
            <Text style={styles.headerStatus}>
              {recipientTyping ? 'typing...' : recipientOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="phone" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="video" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="more-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={20}
        ListFooterComponent={renderTypingIndicator}
        refreshing={refreshing}
        onRefresh={() => {}}
      />
      
      {/* Input Bar */}
      {renderInputBar()}
      
      {/* Product Picker Modal */}
      {showProductPicker && (
        <Modal
          visible={showProductPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowProductPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Product</Text>
              {/* Product list would go here */}
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </GestureHandlerRootView>
  );
};

/**
 * 💬 MESSAGE BUBBLE COMPONENT
 */
const MessageBubble: React.FC<{
  message: Message;
  isOwnMessage: boolean;
  onLongPress: () => void;
  onDoubleTap: () => void;
  onReply: () => void;
  onSwipeReply: () => void;
}> = ({ message, isOwnMessage, onLongPress, onDoubleTap, onReply, onSwipeReply }) => {
  const swipeableRef = useRef<Swipeable>(null);
  const translateX = useSharedValue(0);
  
  const renderLeftActions = () => (
    <View style={styles.swipeAction}>
      <Icon name="corner-up-left" size={20} color="#007AFF" />
    </View>
  );
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  
  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={isOwnMessage ? undefined : renderLeftActions}
      renderRightActions={isOwnMessage ? renderLeftActions : undefined}
      onSwipeableOpen={onSwipeReply}
      overshootLeft={false}
      overshootRight={false}
    >
      <Reanimated.View
        style={[
          styles.messageBubbleContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          animatedStyle,
        ]}
      >
        <Pressable
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
          ]}
          onLongPress={onLongPress}
          delayLongPress={300}
        >
          {message.replyTo && (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewLine} />
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                Reply text here
              </Text>
            </View>
          )}
          
          {message.products && message.products.map((product: any) => (
            <TouchableOpacity key={product.id} style={styles.productPreview}>
              <FastImage source={{ uri: product.imageUrl }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>₹{product.price}</Text>
                <TouchableOpacity style={styles.quickBuyButton}>
                  <Text style={styles.quickBuyText}>Quick Buy</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          {message.text ? (
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
              {message.text}
            </Text>
          ) : null}
          
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {new Date(message.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            
            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {message.status === 'read' && (
                  <>
                    <Icon name="check" size={12} color="#4FC3F7" />
                    <Icon name="check" size={12} color="#4FC3F7" style={{ marginLeft: -6 }} />
                  </>
                )}
                {message.status === 'delivered' && (
                  <>
                    <Icon name="check" size={12} color="#999" />
                    <Icon name="check" size={12} color="#999" style={{ marginLeft: -6 }} />
                  </>
                )}
                {message.status === 'sent' && (
                  <Icon name="check" size={12} color="#999" />
                )}
                {message.status === 'sending' && (
                  <ActivityIndicator size="small" color="#999" />
                )}
              </View>
            )}
          </View>
          
          {message.reactions && message.reactions.length > 0 && (
            <View style={styles.reactions}>
              {message.reactions.map((reaction: any, index: number) => (
                <Text key={index} style={styles.reaction}>
                  {reaction.emoji}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      </Reanimated.View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerStatus: {
    fontSize: 13,
    color: '#B0B3C7',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  messageBubbleContainer: {
    marginVertical: 2,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.68,
    padding: 14,
    borderRadius: 22,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ownMessage: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#667eea',
  },
  otherMessage: {
    backgroundColor: '#1E1E2E',
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  messageText: {
    fontSize: 16,
    color: '#E5E5E5',
    lineHeight: 22,
    fontWeight: '400',
  },
  ownMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  messageStatus: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  reactions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -10,
    right: 10,
    backgroundColor: '#2D2D44',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3D3D5A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  reaction: {
    fontSize: 16,
    marginHorizontal: 2,
  },
  replyPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  replyPreviewLine: {
    width: 3,
    backgroundColor: colors.primaryButtonColor,
    marginRight: 8,
  },
  replyPreviewText: {
    fontSize: 14,
    color: '#A0A0A0',
    flex: 1,
    fontWeight: '400',
  },
  productPreview: {
    flexDirection: 'row',
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#3D3D5A',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 10,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryButtonColor,
    marginTop: 4,
  },
  quickBuyButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  quickBuyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  swipeAction: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  attachButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  voiceButton: {
    padding: 12,
    marginLeft: 8,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  recordingPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 59, 48, 0.4)',
    top: -5,
    left: 0,
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
  attachmentMenu: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    overflow: 'hidden',
  },
  attachOption: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  attachIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  typingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
});

export default UltraChatScreen;