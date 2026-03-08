// ai code

// chatscreen ai scrolltobottom fixed code

// ai code

import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {File, Image as ImageIcon, Store} from 'lucide-react-native';
import DocumentPicker from 'react-native-document-picker';
import {shareUrl} from '../../../Config';
import {launchImageLibrary} from 'react-native-image-picker';
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
  NativeModules,
  AppState,
  InteractionManager,
  ToastAndroid,
  Keyboard,
} from 'react-native';
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
import {io} from 'socket.io-client';
import {socketurl} from '../../../Config';
import axiosInstance from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import {Toast} from '../../Utils/dateUtils';
import {AWS_CDN_URL} from '../../Utils/aws';
import {colors} from '../../Utils/Colors';
import LinearGradient from 'react-native-linear-gradient';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MessageItem from './MessageItem';
import EmojiPicker from './EmojiPicker';
import Sound from 'react-native-sound';
import {ro} from 'rn-emoji-keyboard';
import {uploadImageToS3} from '../../Utils/aws';
import ProductShareModal from './components/ProductShareModal';
import {useChat} from '../../Context/ChatContext';
import { useAccess } from '../../Context/AccessContext';

const socket = io(socketurl, {
  transports: ['websocket'],
});

const {width} = Dimensions.get('window');

  const formatDate = timestamp => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages = []) => {
  const groups = [];
  let currentDate = null;
  let currentGroup = [];

  messages.forEach(msg => {
      const date = new Date(msg.createdAt);
    const msgDate = date.toISOString().split('T')[0]; 
   // const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (msgDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }
      currentDate = msgDate;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  });
  if (currentGroup.length > 0) groups.push({ date: currentDate, messages: currentGroup });
  return groups;
};

const ChatScreen = ({navigation, route}) => {
  const {user} = useContext(AuthContext);
  const [inputText, setInputText] = useState('');
  const data = route.params || '';
  const [chatRoom, setChatRoom] = useState(data?.chatRoom || {});
  // console.log(data.roomId)
  // const chatRoom = data?.chatRoom;

  //console.log('role========',user?.role);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [userOnlineStatus, setUserOnlineStatus] = useState('offline');
  const flatListRef = useRef(null);
  const optionsMenuRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const typingTimeoutRef = useRef(null);
  const {ActiveChatModule} = NativeModules;
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef(null);

  // Product share states
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { isAccessMode, accessUserId, sellerInfo } = useAccess();

  const {fetchUnreadChatCount} = useChat();

  useEffect(() => {
    // Cleanup function - runs when component unmounts
    return () => {
      // console.log('📤 Comment.tsx unmounting - updating unread count');
      fetchUnreadChatCount();
    };
  }, [fetchUnreadChatCount]);

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        // console.log("loades")
        if (data?.chatRoom) return;
        setLoadingRoom(true);
        const response = await axiosInstance.get(`/chat/room/${data?.roomId}`);
        // console.log(response.data.data)
        setChatRoom(response.data.data);
      } catch (error) {
        console.log('error getting chat', error.response.data);
      } finally {
        setLoadingRoom(false);
      }
    };
    fetchRoomData();
  }, [data?.roomId]);

  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      console.log('Selected media:', asset);

      // ✅ Validate file type
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!validTypes.includes(asset.type)) {
        ToastAndroid.show(
          'Please select a valid image file (JPG, PNG, GIF, or WebP)',
          ToastAndroid.SHORT,
        );
        return;
      }

      // ✅ Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxSize) {
        ToastAndroid.show(
          'Image size should be less than 10MB',
          ToastAndroid.SHORT,
        );
        return;
      }

      // ✅ Save and preview
      setSelectedImage(asset);
      setImagePreview(asset.uri);

      // Optional: start upload
      // await uploadImage(asset);
    } catch (error) {
      console.error('Image Picker Error:', error);
      ToastAndroid.show(
        'Failed to pick image. Please try again.',
        ToastAndroid.SHORT,
      );
    } finally {
      setIsUploadingImage(false);
      setShowAttachMenu(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };


  // Handle product share
  const handleProductShare = product => {
    const productUrl = `${shareUrl}/user/product/${product._id}`;
// console.log("this one ")
    // Add product URL to message
    const newMessage = inputText ? `${inputText}\n${productUrl}` : productUrl;
    handleSendMessage({
      text: newMessage,
    });

    setShowProductPicker(false);
    // Close product share modal

    // Focus textarea
    //   textareaRef.current?.focus();

    //  positive('Product link added to message');
  };

  const onChatScreenFocus = async chatRoomId => {
    console.log(chatRoomId);
    await AsyncStorage.setItem('active_chat_room_id', chatRoomId);
    if (Platform.OS === 'android') {
      ActiveChatModule.setActiveChatRoomId(chatRoomId);
    }
  };
  // Called when the screen is unfocused (navigated away)
  const onChatScreenBlur = async () => {
    await AsyncStorage.removeItem('active_chat_room_id');
    if (Platform.OS === 'android') {
      ActiveChatModule.clearActiveChatRoomId();
    }
  };

  useFocusEffect(
    useCallback(() => {
      onChatScreenFocus(chatRoom?._id);

      return () => {
        onChatScreenBlur();
      };
    }, [chatRoom?._id]),
  );
  useEffect(() => {
    onChatScreenFocus(chatRoom?._id);
    return () => {
      onChatScreenBlur();
    };
  }, [chatRoom]);
  // Enhanced state management
  const [blockStatus, setBlockStatus] = useState({
    isBlocked: false,
    blockedByCurrentUser: false,
    blockedByOtherUser: false,
    blockMessage: null,
    canUnblock: false,
  });

  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] =
    useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scroll to bottom button state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Pagination states
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState(null);
  const fetchInProgressRef = useRef(false);
  const hasScrolledToBottomRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  // Animation for message reactions
  const reactionAnim = useRef(new Animated.Value(0)).current;

  // Animation for scroll button
  const scrollButtonAnim = useRef(new Animated.Value(0)).current;

  // Keyboard height state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  // Messages should be ordered in reverse chronological order for inverted FlatList (newest first)
  const orderedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [messages]);

   // Use accessUserId when in access mode, otherwise use user._id
  const effectiveUserId = isAccessMode ? accessUserId : user?._id;

  // Get other participant info
  const getOtherParticipant = useCallback(() => {
    if (!chatRoom?.participants || !effectiveUserId) return null;
    return chatRoom.participants.find(
      p => p?.userId?._id && p.userId._id !== effectiveUserId,
    );
  }, [chatRoom?.participants, effectiveUserId]);

  const otherParticipant = getOtherParticipant();

  // === OPTIMIZED READ/UNREAD FUNCTIONS ===
  const markAllMessagesAsRead = useCallback(async () => {
    if (!chatRoom?._id || !user || !isVisible || blockStatus.isBlocked) return;

    try {
      const response = await axiosInstance.patch(
        `/chat/rooms/${chatRoom._id}/messages/read`,
        {messageIds: 'all'},
      );

      if (response.data.status) {
        const {lastReadMessageId} = response.data.data;
        setLastReadMessageId(lastReadMessageId);
        setUnreadCount(0);

        if (socketConnected) {
          socket.emit('mark_all_messages_read', {
            chatRoomId: chatRoom._id,
          });
        }

        setMessages(prev =>
          prev.map(msg => {
            if (msg.senderId._id !== user._id) {
              return {...msg, status: 'read'};
            }
            return msg;
          }),
        );
      }
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  }, [chatRoom?._id, user, socketConnected, isVisible, blockStatus.isBlocked]);

  // Optimized typing handler with debouncing
  const handleTyping = useCallback(
    isTyping => {
      if (!socketConnected || blockStatus.isBlocked) return;

      if (isTyping) {
        socket.emit('typing_start', {chatRoomId: chatRoom._id});

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing_stop', {chatRoomId: chatRoom._id});
        }, 2000);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        socket.emit('typing_stop', {chatRoomId: chatRoom._id});
      }
    },
    [socketConnected, blockStatus.isBlocked, chatRoom?._id],
  );

  // === BLOCK STATUS MANAGEMENT ===
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!otherParticipant) return;
      try {
        const response = await axiosInstance.get(
          `chat/blocked-status/${otherParticipant.userId._id}`,
        );
        if (response.data.status) {
          setBlockStatus(response.data.data);
        }
      } catch (error) {
        console.error('Error checking block status:', error);
      }
    };

    checkBlockStatus();
  }, [otherParticipant]);

  // Block/Unblock user function
  const handleBlockUser = useCallback(async () => {
    if (!otherParticipant) return;

    try {
      const endpoint = `chat/block/${otherParticipant.userId._id}`;
      if (blockStatus.blockedByCurrentUser) {
        await axiosInstance.delete(endpoint);
        setBlockStatus({
          isBlocked: false,
          blockedByCurrentUser: false,
          blockedByOtherUser: false,
          blockMessage: null,
          canUnblock: false,
        });
        Toast('User unblocked successfully');
      } else {
        await axiosInstance.post(endpoint, {
          reason: 'Blocked from chat',
          blockType: 'block',
        });
        setBlockStatus({
          isBlocked: true,
          blockedByCurrentUser: true,
          blockedByOtherUser: false,
          blockMessage:
            'You have blocked this user. Messages cannot be sent or received.',
          canUnblock: true,
        });
        Toast('User blocked successfully');
      }
      setShowOptionsMenu(false);
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      Toast(error.response?.data?.message || 'Failed to block/unblock user');
    }
  }, [otherParticipant, blockStatus.blockedByCurrentUser]);

  // === REACTION MANAGEMENT ===
  const handleMessageDoubleClick = useCallback(
    messageId => {
      if (blockStatus.isBlocked) return;
      setSelectedMessageForReaction(messageId);
      setShowEmojiPicker(true);
    },
    [blockStatus.isBlocked],
  );

  // Add reaction to message
  const handleAddReaction = useCallback(
    async emoji => {
      // console.log("emoji",emoji)
      if (!socketConnected || !user || blockStatus.isBlocked) {
        if (!selectedMessageForReaction) {
          handleTyping(true);
          setInputText(prev => prev + emoji);
          return;
        }
        return;
      }

      if (!selectedMessageForReaction) {
        handleTyping(true);
        setInputText(prev => prev + emoji);
        // Don't close emoji picker when adding emoji to text input
        return;
      }

      try {
        socket.emit('add_reaction', {
          messageId: selectedMessageForReaction,
          emoji,
          chatRoomId: chatRoom._id,
        });

        // Animate the reaction
        reactionAnim.setValue(0);
        Animated.spring(reactionAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();

        setShowEmojiPicker(false);
        setSelectedMessageForReaction(null);
      } catch (error) {
        console.error('Error adding reaction:', error);
        Toast('Failed to add reaction');
      }
    },
    [
      socketConnected,
      user,
      blockStatus.isBlocked,
      selectedMessageForReaction,
      chatRoom._id,
      handleTyping,
    ],
  );

  // Remove reaction from message
  const handleRemoveReaction = useCallback(
    async (messageId, emoji) => {
      if (!socketConnected || !user || blockStatus.isBlocked) return;

      try {
        socket.emit('remove_reaction', {
          messageId,
          emoji,
          chatRoomId: chatRoom._id,
        });
      } catch (error) {
        console.error('Error removing reaction:', error);
        Toast('Failed to remove reaction');
      }
    },
    [socketConnected, user, blockStatus.isBlocked, chatRoom._id],
  );

  // Handle edit message
  const handleEditMessage = useCallback(
    async (messageId, newText) => {
      if (!socketConnected || !user || blockStatus.isBlocked) {
        Toast('Cannot edit message at this time');
        return;
      }

      try {
        console.log('✏️ [EDIT] Emitting edit_message:', { messageId, newText, chatRoomId: chatRoom._id });
        
        // Emit socket event to edit message - MATCHES WEB VERSION
        socket.emit('edit_message', {
          messageId,
          newContent: { text: newText },
          chatRoomId: chatRoom._id
        });

        // Optimistically update the message in local state
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? {
                  ...msg,
                  content: {
                    ...msg.content,
                    text: newText,
                  },
                  metadata: {
                    ...msg.metadata,
                    isEdited: true,
                    editedAt: new Date().toISOString(),
                  },
                }
              : msg,
          ),
        );
      } catch (error) {
        console.error('❌ [EDIT] Error editing message:', error);
        Toast('Failed to edit message');
      }
    },
    [socketConnected, user, blockStatus.isBlocked, chatRoom._id],
  );

  // === PAGE VISIBILITY DETECTION ===
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        setIsVisible(true);
        markAllMessagesAsRead();
      } else {
        setIsVisible(false);
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [markAllMessagesAsRead]);

  // === SOCKET CONNECTION MANAGEMENT ===
  useEffect(() => {
    const connectSocket = async () => {
      try {
        await new Promise(resolve => {
          if (socket.connected) return resolve();
          socket.on('connect', resolve);
          socket.connect();
        });
        setSocketConnected(true);
      } catch (error) {
        console.error('Socket connection failed:', error);
        setSocketConnected(false);
      }
    };

    connectSocket();
    return () => socket.off('connect');
  }, []);

  // === SOCKET EVENT LISTENERS ===
  useEffect(() => {
    if (!chatRoom?._id || !socketConnected || !user) return;

    socket.emit('identify_user', {userId: user._id});
    socket.emit('join_chat_room', {chatRoomId: chatRoom._id});

    // Update the socket event handler for new messages:
    const handleNewMessage = message => {
      if (message.chatRoomId === chatRoom._id) {
        setMessages(prev => {
          const filteredPrev = prev.filter(
            m =>
              !m._id.startsWith('temp_') ||
              m.content?.text !== message.content?.text,
          );

          const exists = filteredPrev.some(m => m._id === message._id);
          if (exists) return filteredPrev;

          const newMessages = [...filteredPrev, message];

          if (message.senderId._id !== user._id && isVisible) {
            setTimeout(() => {
              // markMessageAsRead logic here
            }, 1000);
          } else if (message.senderId._id !== user._id) {
            setUnreadCount(prev => prev + 1);
          }

          return newMessages;
        });
      }
    };
    const handleMessageRead = data => {
      if (data.chatRoomId === chatRoom._id) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId) {
              return {...msg, status: 'read', readAt: data.readAt};
            }
            return msg;
          }),
        );
      }
    };

    const handleAllMessagesRead = data => {
      if (data.chatRoomId === chatRoom._id && data.readBy !== user._id) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg.senderId._id === user._id) {
              return {...msg, status: 'read', readAt: data.readAt};
            }
            return msg;
          }),
        );
      }
    };

    const handleUserTyping = data => {
      if (data.chatRoomId === chatRoom._id && data.userId !== user._id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      }
    };

    const handleUserStoppedTyping = data => {
      if (data.chatRoomId === chatRoom._id) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };

    const handleUserStatusChanged = data => {
      if (otherParticipant && data.userId === otherParticipant.userId._id) {
        setUserOnlineStatus(data.status);
      }
    };

    const handleReactionAdded = data => {
      if (data.messageId) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId) {
              const updatedReactions = [...(msg.reactions || [])];
              const existingIndex = updatedReactions.findIndex(
                r =>
                  r.userId === data.reaction.userId &&
                  r.emoji === data.reaction.emoji,
              );
              if (existingIndex === -1) {
                updatedReactions.push(data.reaction);
              }
              return {...msg, reactions: updatedReactions};
            }
            return msg;
          }),
        );
      }
    };

    const handleReactionRemoved = data => {
      if (data.messageId) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === data.messageId) {
              const updatedReactions = (msg.reactions || []).filter(
                r => !(r.userId === data.userId && r.emoji === data.emoji),
              );
              return {...msg, reactions: updatedReactions};
            }
            return msg;
          }),
        );
      }
    };

    // Get user status on connect
    if (otherParticipant) {
      socket.emit('get_user_status', {userId: otherParticipant.userId._id});
    }

    // Attach event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('all_messages_read', handleAllMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('user_status_changed', handleUserStatusChanged);
        socket.on('reaction_added', handleReactionAdded);
        socket.on('reaction_removed', handleReactionRemoved);

        // Handle message edit events
        const handleMessageEdited = (data) => {
          console.log('✏️ [EDIT] Received message_edited:', data);
          
          if (data.chatRoomId === chatRoom._id) {
            setMessages(prev => prev.map(msg => 
              msg._id === data.messageId
                ? {
                    ...msg,
                    content: data.content,
                    metadata: data.metadata
                  }
                : msg
            ));
          }
        };

        const handleMessageEditSuccess = (data) => {
          console.log('✅ [EDIT] Message edit confirmed:', data);
        };

        socket.on('message_edited', handleMessageEdited);
        socket.on('message_edit_success', handleMessageEditSuccess);

        return () => {
      socket.emit('leave_chat_room', {chatRoomId: chatRoom._id});
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('all_messages_read', handleAllMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
            socket.off('user_status_changed', handleUserStatusChanged);
            socket.off('reaction_added', handleReactionAdded);
            socket.off('reaction_removed', handleReactionRemoved);
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_edit_success', handleMessageEditSuccess);
        };
  }, [
    chatRoom?._id,
    socketConnected,
    user,
    otherParticipant,
    isVisible,
    blockStatus.isBlocked,
  ]);

  // === DATA FETCHING WITH PAGINATION ===
const fetchMessages = useCallback(async (beforeMessageId = null) => {
  // ✅ OPTIMIZED: Prevent concurrent fetches
  if (fetchInProgressRef.current) {
    console.log('⚠️ Fetch already in progress, skipping');
    return;
  }
  
  if (!chatRoom?._id) {
    return;
  }
  
  // console.log('📥 Fetching messages, beforeMessageId:', beforeMessageId);
  
  try {
    fetchInProgressRef.current = true;
    
    // Only show loading for "load more", not initial load
    if (beforeMessageId) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    const response = await axiosInstance.get(
      `/chat/rooms/${chatRoom._id}/messages`,
      {
        params: { 
          page: 1, 
          limit: 20,
          beforeMessageId: beforeMessageId || undefined
        }
      }
    );

    const fetchedMessages = response.data.data || [];
    // console.log(fetchedMessages.length)
    if (response.data.status) {
      if (beforeMessageId) {
        // ✅ OPTIMIZED: Prepend older messages and deduplicate
        setMessages(prev => {
          const newMessages = [...fetchedMessages, ...prev];
          // Deduplicate by message ID
          const uniqueMessages = newMessages.filter((msg, index, self) =>
            index === self.findIndex((m) => m._id === msg._id)
          );
          return uniqueMessages;
        });
      } else {
        // Initial load - set messages
        setMessages(fetchedMessages);
        
        // Set last read message from chat room data
        const currentParticipant = chatRoom?.participants?.find(
          p => p?.userId?._id === user?._id,
        );
        if (currentParticipant?.lastReadMessageId) {
          setLastReadMessageId(currentParticipant?.lastReadMessageId);
        }
        
        // Mark as read after initial load (only if messages exist)
        if (fetchedMessages.length > 0) {
          setTimeout(() => {
            markAllMessagesAsRead();
          }, 100);
        }
      }
      
      // ✅ OPTIMIZED: Update pagination state
      setHasMoreMessages(response.data.pagination?.hasMore || false);
      
      // ✅ OPTIMIZED: Find the chronologically oldest message (earliest createdAt)
      if (fetchedMessages.length > 0) {
        const sortedByDate = [...fetchedMessages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setOldestMessageId(sortedByDate[0]._id);
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error.response?.data);
    Toast('Failed to load messages');
  } finally {
    setLoading(false);
    setLoadingMore(false);
    fetchInProgressRef.current = false;
  }
}, [chatRoom?._id, chatRoom?.participants, user?._id, markAllMessagesAsRead]);


  

  const handleSendMessage = useCallback(
    async messageData => {
      console.log('Sending message:', messageData);
      const trimmedText = messageData?.text?.trim();
      if ((!trimmedText && !selectedImage) || !user || blockStatus.isBlocked) {
        if (blockStatus.isBlocked) {
          Toast(
            blockStatus.blockMessage || 'Cannot send message due to blocking',
          );
        }
        return;
      }

      try {
        setSending(true);
setImagePreview(null);
        // Temp ID for optimistic UI
        const tempId = `temp_${Date.now()}_${Math.random()}`;

        // Prepare temporary message
        const tempMessage = {
          _id: tempId,
          chatRoomId: chatRoom._id,
          senderId: {
            _id: user._id,
            name: user.name || 'You',
            profileURL: user.profileURL || null,
          },
          messageType: selectedImage ? 'image' : 'text',
          content: selectedImage
            ? {
                text: trimmedText || '',
                media: {
                  type: 'image',
                  url: imagePreview, // local URI preview
                  fileName: selectedImage.fileName || 'image.jpg',
                  fileSize: selectedImage.fileSize || null,
                  dimensions: {
                    width: selectedImage.width || null,
                    height: selectedImage.height || null,
                  },
                },
              }
            : {text: trimmedText},
          createdAt: new Date().toISOString(),
          status: 'sending',
          deliveryStatus: [],
          reactions: [],
          metadata: {editHistory: [], editedAt: null, isEdited: false},
        };

        // Add temp message for immediate UI feedback
        setMessages(prev => [...prev, tempMessage]);

        // Scroll to bottom - use scrollToOffset for inverted FlatList
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToOffset({offset: 0, animated: true});
          setTimeout(
            () => flatListRef.current?.scrollToOffset({offset: 0, animated: true}),
            150,
          );
        });

        let finalMessageData;

        if (selectedImage) {
          setIsUploadingImage(true);
          try {
            // Upload image to S3 (replace with your upload logic)
            const uploadedImageUrl = await uploadImageToS3(
              selectedImage.uri,
              'chat/images',
            );

            finalMessageData = {
              messageType: 'image',
              content: {
                text: trimmedText || '',
                media: {
                  type: 'image',
                  url: uploadedImageUrl,
                  fileName: selectedImage.fileName || 'image.jpg',
                  fileSize: selectedImage.fileSize || null,
                  dimensions: {
                    width: selectedImage.width || null,
                    height: selectedImage.height || null,
                  },
                },
              },
              metadata: {},
            };
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            Toast('Failed to upload image. Please try again.');
            // Remove temp message
            setMessages(prev => prev.filter(m => m._id !== tempId));
            return;
          } finally {
            setIsUploadingImage(false);
          }
        } else {
          finalMessageData = {
            messageType: 'text',
            content: {text: trimmedText},
            metadata: {},
          };
        }
    
        // Send message to server
        const response = await axiosInstance.post(
          `chat/rooms/${chatRoom._id}/messages`,
          finalMessageData,
        );

        if (response.data.status) {
          const newMessage = response.data.data;
          // Replace temp message with final one
          setMessages(prev =>
            prev.map(msg => (msg._id === tempId ? newMessage : msg)),
          );
        } else {
          setMessages(prev => prev.filter(m => m._id !== tempId));
          Toast(response.data.message || 'Failed to send message');
        }

        // Clear input & image preview
        setInputText('');
        setSelectedImage(null);
        setImagePreview(null);
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(prev => prev.filter(m => !m._id.startsWith('temp_')));
        if (error.response?.data?.blockType) {
          setBlockStatus(prev => ({
            ...prev,
            isBlocked: true,
            blockMessage: error.response.data.message,
          }));
          Toast(error.response.data.message);
        } else {
          Toast('Failed to send message');
        }
      } finally {
        setSending(false);
        //scrollToBottom();
      }
    },
    [user, blockStatus.isBlocked, chatRoom._id, selectedImage, imagePreview],
  );

  const renderMessage = useCallback(
    ({item: message, index}) => (
      <MessageItem
        message={message}
        index={index}
        messages={messages}
        currentUserId={user?._id}
        otherParticipant={otherParticipant}
        navigation={navigation}
        onReaction={handleMessageDoubleClick}
        onRemoveReaction={handleRemoveReaction}
        onEditMessage={handleEditMessage}
      />
    ),
    [
      messages,
      user,
      otherParticipant,
      navigation,
      handleMessageDoubleClick,
      handleRemoveReaction,
      handleEditMessage,
    ],
  );

  const handleSend = useCallback(() => {
    // Use functional update to get latest inputText value
    setInputText(currentText => {
      const trimmedText = currentText.trim();
      
      if (trimmedText.length === 0 && !selectedImage) {
        return currentText; // Don't send, keep current text
      }
      
      // Send message with current text
      handleSendMessage({
        text: trimmedText,
        image: selectedImage,
      });
      
      // Close emoji picker
      setShowEmojiPicker(false);
      
      // Dismiss keyboard
      //Keyboard.dismiss();
      
      // Return empty string to clear input
      return '';
    });
  }, [selectedImage, handleSendMessage]);

  const handleInputChange = useCallback(
    text => {
      setInputText(text);
      handleTyping(text.length > 0);
    },
    [handleTyping],
  );

  const handleInputBlur = useCallback(() => {
    handleTyping(false);
  }, [handleTyping]);

useEffect(() => {
  if (chatRoom?._id && !initialFetchDoneRef.current) {
    initialFetchDoneRef.current = true;
    fetchMessages();
  }
}, [chatRoom?._id]);


useEffect(() => {
  if (messages.length > 0 && isVisible && !blockStatus.isBlocked) {
    const timer = setTimeout(() => {
      markAllMessagesAsRead();
    }, 500);
    return () => clearTimeout(timer);
  }
}, [messages.length, isVisible, blockStatus.isBlocked, markAllMessagesAsRead]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard show/hide events
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      },
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const grouped = useMemo(() => groupMessagesByDate(messages), [messages]);

const flattenedMessages = useMemo(() => {
  const result = [];
  grouped.forEach(group => {
    result.push({ type: 'date', id: group.date, label: formatDate(group.date) });
    group.messages.forEach(msg => result.push({ type: 'message', ...msg }));
  });
  return result.sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id));
}, [grouped]);


  // ✅ OPTIMIZED: Handle load more for inverted FlatList
  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages && !loadingMore && !loading && oldestMessageId && !fetchInProgressRef.current) {
      console.log('📥 Loading more messages... Current oldest:', oldestMessageId);
      fetchMessages(oldestMessageId);
    }
  }, [hasMoreMessages, loadingMore, loading, oldestMessageId, fetchMessages]);

  // Handle scroll detection
  const handleScroll = useCallback(
    event => {
      const {contentOffset} = event.nativeEvent;
      
      // For inverted FlatList:
      // contentOffset.y close to 0 = at bottom (newest messages)
      // contentOffset.y > 50 = scrolled up (away from newest)
      const isNearBottom = contentOffset.y < 50;
      
      setIsAtBottom(isNearBottom);

      // Show/hide scroll button with animation
      if (isNearBottom && showScrollButton) {
        Animated.timing(scrollButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() =>
          setShowScrollButton(false)
        );
      } else if (
        !isNearBottom &&
        !showScrollButton &&
        orderedMessages.length > 10
      ) {
        setShowScrollButton(true);
        Animated.timing(scrollButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [showScrollButton, orderedMessages.length, scrollButtonAnim],
  );


  // Scroll to bottom function - resets to newest messages
  const scrollToBottom = useCallback(() => {
    // Hide button and reset count immediately
   // setShowScrollButton(false);
    setNewMessagesCount(0);
    
    // If already at bottom, do nothing
    if (isAtBottom) {
      return;
    }
    
    // If we're far from bottom (more than 50 messages loaded), refetch to get latest
    if (messages.length > 50) {
      setMessages([]); // Clear messages
      setOldestMessageId(null); // Reset pagination
      setHasMoreMessages(true); // Reset has more
      fetchMessages(); // Fetch latest messages
    } else {
      // Just scroll if we're not too far
      // For inverted FlatList, scroll to offset 0 (which is the bottom/newest messages)
      flatListRef.current?.scrollToOffset({offset: 0, animated: true});
      
      // Update isAtBottom state after scroll animation completes
      setTimeout(() => {
        setIsAtBottom(true);
      }, 300);
    }
  }, [messages.length, fetchMessages, isAtBottom]);

  // useEffect(()=>{
  //   console.log('on message scrolltobottom triggered');
  //   if (messages.length > 0) {
  //           scrollToBottom();
  //       }
  // },[messages, scrollToBottom])

  // Track new messages when not at bottom
  useEffect(() => {
    if (!isAtBottom && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.senderId?._id !== user?._id) {
        setNewMessagesCount(prev => prev + 1);
      }
    } else {
      setNewMessagesCount(0);
    }
  }, [messages, isAtBottom, user?._id]);

  const keyExtractor = useCallback(item => item._id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 80, // Approximate height
      offset: 80 * index,
      index,
    }),
    [],
  );

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

  const handleNavigation = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else navigation.navigate('Comment');
  };
  if (loadingRoom) {
    return (
      <View className="flex-1 bg-primary-color items-center justify-center">
        <ActivityIndicator size={'small'} color={colors.primaryButtonColor} />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleNavigation}>
          <ChevronLeft size={28} color="#F7CE45" />
        </TouchableOpacity>
        <LinearGradient
          colors={['#FFD700', '#FCED9C', '#FAFAFA']}
          style={styles.avatarGradient}>
          <TouchableOpacity
            style={styles.avatarInner}
            onPress={() =>
              navigation.navigate(`ViewSellerProdile`, {
                id: otherParticipant?.userId?.userName,
              })
            }>
            {otherParticipant?.userId?.profileURL?.key ? (
              <Image
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
          <View style={styles.statusContainer}>
            {typingUsers.length > 0 ? (
              <Text style={{color: '#ccc'}}>typing... </Text>
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
        </View>
        {/* Header Action Buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowOptionsMenu(true)}>
            <MoreVertical size={20} color="#F7CE45" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Options Menu */}
      {showOptionsMenu && (
        <Pressable
          style={styles.optionsMenuOverlay}
          onPress={() => setShowOptionsMenu(false)}>
          <View ref={optionsMenuRef} style={styles.optionsMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
              <UserX color={'red'} size={18} />
              <Text style={[styles.menuItemText, {color: 'red'}]}>
                {blockStatus.blockedByCurrentUser
                  ? 'Unblock User'
                  : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                Toast('Report feature coming soon');
                setShowOptionsMenu(false);
              }}>
              <Flag color={'orange'} size={18} />
              <Text style={[styles.menuItemText, {color: 'orange'}]}>
                Report User
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {blockStatus.isBlocked && (
        <View style={styles.blockContainer}>
          <Shield color={'#fff'} size={25} />
          <Text style={styles.blockText}>
            {blockStatus.blockMessage ||
              'Cannot send or receive messages due to blocking.'}
          </Text>
        </View>
      )}

      {/* Main Chat Area with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={isKeyboardVisible ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={isKeyboardVisible}
        >
        {/* Chat Body */}
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
                //data={orderedMessages}
                data={flattenedMessages}
               // keyExtractor={(item) => item._id}
               keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
              //  renderItem={renderMessage}

              renderItem={({ item, index }) => {
  if (item.type === 'date') {
    return (
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <Text style={{ color: '#999', fontSize: 12 }}>{item.label}</Text>
      </View>
    );
  }

  return (
    <MessageItem
      message={item}
      index={index}
      messages={messages}
      currentUserId={isAccessMode ? accessUserId : user._id}
      otherParticipant={otherParticipant}
      navigation={navigation}
      onReaction={handleMessageDoubleClick}
      onRemoveReaction={handleRemoveReaction}
      onEditMessage={handleEditMessage}
    />
  );
}}
                contentContainerStyle={styles.messagesContainer}
                keyboardShouldPersistTaps="handled"
                inverted
                removeClippedSubviews={false}
                windowSize={10}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={100}
                initialNumToRender={20}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                      <Text style={styles.loadingMoreText}>Loading more messages...</Text>
                    </View>
                  ) : null
                }
              />
            )}

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <Animated.View
                style={[
                  styles.scrollToBottomButton,
                  {
                    opacity: scrollButtonAnim,
                    transform: [
                      {
                        scale: scrollButtonAnim,
                      },
                    ],
                  },
                ]}>
                <TouchableOpacity
                  style={styles.scrollButtonTouchable}
                  onPress={scrollToBottom}
                  activeOpacity={0.8}>
                  <Ionicons name="arrow-down" size={24} color="#000" />
                 
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>
                  {otherParticipant?.userId?.name || 'User'} is typing...
                </Text>
              </View>
            )}
          </View>

          {/* ✅ Image Preview Area */}
          {imagePreview && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{uri: imagePreview}} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}>
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}


        {/* Message Input Area - Fixed positioning */}
        <View style={styles.inputContainer}>
             {/* Attach Menu Overlay */}
      {showAttachMenu && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowAttachMenu(false)}>
          <View ref={attachMenuRef} style={styles.menu}>
            <TouchableOpacity
              style={styles.menuPickerItem}
              onPress={handlePickImage}>
              <ImageIcon color={'#FFD700'} size={18} />
              <Text style={[styles.menuPickerItemText, {color: '#FFF'}]}>
                Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuPickerItem}
              onPress={() => {
                if (user?.role !== 'seller') {
                  Toast('Only sellers can share products');
                }
                setShowProductPicker(true);
                setShowAttachMenu(false);
              }}
              //  disabled
            >
              <Store color={'#FFD700'} size={18} />
              <Text style={[styles.menuPickerItemText,
              {color: '#FFf'}
                ]}>
                {/* More */}
                product
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowAttachMenu(!showAttachMenu)}
                //disabled
              >
                <Ionicons name={showAttachMenu ? "close" : "add"} size={24} color="#F7CE45" />
              </TouchableOpacity>
              <TextInput
                value={inputText}
                onChangeText={handleInputChange}
                onBlur={handleInputBlur}
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
                  setSelectedMessageForReaction(null);
                  setShowEmojiPicker(true);
                }}>
                <Text style={styles.emojiText}>😊</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                // Close emoji picker first if it's open
                if (showEmojiPicker) {
                  setShowEmojiPicker(false);
                }
                // Then send the message
                handleSend();
              }}
              style={[
                styles.sendButton,
                {
                  opacity:
                    (inputText.trim().length > 0 || selectedImage) && !showEmojiPicker ? 1 : 0.5,
                },
              ]}
              disabled={
                (!(inputText.trim().length > 0 || selectedImage) || sending) && !showEmojiPicker
              }>
              {sending ? (
                <Ionicons name="hourglass-outline" size={20} color="#000" />
              ) : (
                <Ionicons name="send" size={20} color="#000" />
              )}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <>
          <EmojiPicker
            visible={showEmojiPicker}
            onClose={() => {
              setShowEmojiPicker(false);
              setSelectedMessageForReaction(null);
            }}
            onEmojiSelect={emoji => handleAddReaction(emoji)}
            onSend={handleSend}
            canSend={!selectedMessageForReaction && (inputText.trim().length > 0 || !!selectedImage)}
          />
        </>
      )}

     

      {/* Options Menu Overlay */}
      {showProductPicker && (
        <ProductShareModal
          showProductPicker={showProductPicker}
          isSeller={user?.role === 'seller'}
          setShowProductPicker={setShowProductPicker}
          handleProductShare={handleProductShare}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    // justifyContent:'space-between',
  },
  optionsMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  optionsMenu: {
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    position: 'absolute',
    right: 20,
    top: 70,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    justifyContent: 'space-around',
  },
  emojiPickerStyle: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    backgroundColor: '#282829',
    height: 400,
    zIndex: 1000,
    borderRadius: 12,
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingLeft: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 28,
    padding: 2,
    marginLeft: 10, //12
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
  chatBody: {
    flex: 1,
    // backgroundColor:'red'
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
   // backgroundColor:'red'
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    color: '#999',
    fontSize: 12,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F7CE45',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#F7CE45',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#2A2A2A',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#F7CE45',
    fontSize: 12,
    textDecorationLine: 'underline',
    textTransform: 'capitalize',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    color: '#000',
    fontSize: 11,
    marginRight: 4,
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productContainer: {
    alignItems: 'center',
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  productName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    color: '#22C55E',
    fontWeight: '700',
    fontSize: 16,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    position: 'absolute',
    bottom: -15,
    right: 10,
    borderRadius: 30,
    padding: 2,
    backgroundColor: '#333',
  },
  reaction: {
    fontSize: 16,
    paddingHorizontal: 2,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    // flex:1,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor:  '#2A2A2A',
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
    // marginRight: 8,
    padding: 10,
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

  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  menu: {
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    position: 'absolute',
    left: 20,
    bottom: 70,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    justifyContent: 'space-around',
  },
  menuPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuPickerItemText: {
    fontSize: 16,
    marginLeft: 10,
  },

  imagePreviewContainer: {
    position: 'absolute',
    bottom: 100,   //80, // just above inputContainer
    left: 10,
    // right: 10,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    //alignItems: 'center',
    //justifyContent: 'center',
  },

  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    padding: 1,
  },

  scrollToBottomButton: {
    position: 'absolute',
    bottom: 40, //80,
    right: 20,
    zIndex: 100,
    elevation: 5,
  },
  scrollButtonTouchable: {
    backgroundColor: '#F7CE45',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  newMessagesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  newMessagesText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingMoreText: {
    color: '#999',
    fontSize: 12,
  },
});

export default ChatScreen;
