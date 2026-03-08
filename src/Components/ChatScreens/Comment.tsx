import React, {useCallback, useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ToastAndroid,
} from 'react-native';

import Feather from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import {useFollowApi} from '../../Utils/FollowersApi';
import {AuthContext} from '../../Context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../../Utils/Colors';
import {
  ArrowLeftCircle,
  Search,
  MessageCircle,
  MoreVertical,
  Pin,
  X,
  Star,
  RefreshCw,
  VolumeOff,
  Volume,
  Volume1,
  Volume2,
  UserX,
} from 'lucide-react-native';
import { useChat } from '../../Context/ChatContext';
import {AWS_CDN_URL} from '../../Utils/aws';
import SearchComponent from '../GloabalSearch/SearchComponent';
import axiosInstance from '../../Utils/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {io} from 'socket.io-client';
import {socketurl} from '../../../Config';
import {SafeAreaView} from 'react-native-safe-area-context';
import ImageModal from '../Profile/ImageModal';
import Sound from 'react-native-sound';
import { measure } from 'react-native-reanimated';
import TabBar from '../ChatScreens/components/TabBar';
import { useAccess } from '../../Context/AccessContext';

// import {formatDistanceToNow} from 'date-fns';
const socket = io(socketurl, {
  transports: ['websocket'],
});
const {height, width} = Dimensions.get('window');

const ChatBar = ({
  chatRooms,
  activeChatRoom,
  onRoomSelect,
  onRefresh,
  onLoadMore, // NEW: For infinite scroll pagination
  onInvalidateCache, // NEW: For cache invalidation
  totalUnreadCount = 0,
  socketConnected = false,
  //newly added for tab management
  activeTab = 'all',
  loading = false,
  loadingMore = false, // NEW: Loading state for pagination
  hasMore = false, // NEW: Whether there are more rooms to load
  handleTabChange = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [typingUsersInRooms, setTypingUsersInRooms] = useState(new Map());
  const [localUnreadCounts, setLocalUnreadCounts] = useState(new Map());
  const {user}: any = useContext(AuthContext);
  const { isAccessMode, accessUserId, sellerInfo } = useAccess();
  const [imageModal,setImageModal]=useState(false)
  const [imageUrl,setImageUrl]=useState('')

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRoomForOptions, setSelectedRoomForOptions] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [optionsMenuPosition, setOptionsMenuPosition] = useState({x: 0, y: 0});

  // State for room options (you might want to move this to a parent component or global state)
  const [mutedRooms, setMutedRooms] = useState(new Set());
  const [pinnedRooms, setPinnedRooms] = useState(new Set());
  const [favoritedRooms, setFavoriteRooms] = useState(new Set());

 const { fetchUnreadChatCount } = useChat();

 useEffect(() => {
  // Cleanup function - runs when component unmounts
  return () => {
    // console.log('📤 Comment.tsx unmounting - updating unread count');
    fetchUnreadChatCount();
  };
}, [fetchUnreadChatCount]);


  // Initialize muted rooms from chatRooms data
  useEffect(() => {
    const mutedIds = new Set();
    chatRooms.forEach(room => {
      if (room.isMuted) {
        mutedIds.add(room._id);
      }
    });
    setMutedRooms(mutedIds);
  }, [chatRooms]);

  // Initialize pinned rooms from chatRooms data
  useEffect(() => {
    const pinnedIds = new Set();
    chatRooms.forEach(room => {
      if (room.isPinned) {
        pinnedIds.add(room._id);
      }
    });
    setPinnedRooms(pinnedIds);
  }, [chatRooms]);

  // Initialize favorited rooms from chatRooms data
  useEffect(() => {
    const favoritedIds = new Set();
    chatRooms.forEach(room => {
      if (room.isFavorite) {
        favoritedIds.add(room._id);
      }
    });
    setFavoriteRooms(favoritedIds);
  }, [chatRooms]);

const handleOptionsPress = (room, event) => {
  event.stopPropagation();
  // Get the position of the clicked item relative to the screen
  const { pageX, pageY } = event.nativeEvent;

  // Adjust position to account for menu size and screen boundaries
  const adjustedX = Math.min(pageX, width - 250); // 200 is the menu width
  const adjustedY = Math.min(pageY, height - 180); // 150 is an estimate of menu height

  setOptionsMenuPosition({x: adjustedX, y: adjustedY});
  setSelectedRoomForOptions(room);
  setShowOptionsMenu(true);
};


  const toggleFavoriteChatRoomAPI = async roomId => {
    try {
      const response = await axiosInstance.patch(`/chat/${roomId}/favorite`);
      console.log(response.data.message);
      return {success: true, data: response.data.data};
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };

  const toggleFavorite = useCallback(
    async (roomId, e) => {
      e.stopPropagation(); // Prevent room selection

      try {
        
        // Optimistic update
        setFavoriteRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });

        // API call
        const result = await toggleFavoriteChatRoomAPI(roomId);

        if (!result.success) {
          // Revert optimistic update on failure
          setFavoriteRooms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roomId)) {
              newSet.delete(roomId);
            } else {
              newSet.add(roomId);
            }
            return newSet;
          });

          console.error('Failed to toggle favorite:', result.error);
        } else {
          // Refresh rooms data after successful favorite toggle
          await onRefresh();
        }
      } catch (error) {
        // Revert optimistic update on error
        setFavoriteRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });
        console.error('Error in toggleFavorite:', error);
      }
    },
    [onRefresh],
  );
  // Function to load favorites when component mounts or when favorites tab is selected
  const loadFavorites = useCallback(async () => {
      try {
          const result = await getFavoriteChatRoomsAPI();
          
          if (result.success) {
              // Update favoriteRooms state with the fetched data
              const favoriteIds = new Set(result.data.map(room => room._id));
              setFavoriteRooms(favoriteIds);
              
              // Optionally update the main chatRooms array if needed
              // This depends on how your parent component manages the chat rooms data
          } else {
              console.error('Failed to load favorites:', result.error);
          }
      } catch (error) {
          console.error('Error loading favorites:', error);
      }
  }, []);
  
  // Add this useEffect to load favorites when component mounts
  useEffect(() => {
      loadFavorites();
  }, [loadFavorites]);

  // Toggle pin status for a chat room
  const togglePinChatRoomAPI = async roomId => {
    try {
      const response = await axiosInstance.patch(`/chat/chat/${roomId}/pin`);
      return {success: true, data: response.data.data};
    } catch (error) {
      console.error('Error toggling pin:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };

  const togglePin = useCallback(
    async (roomId, e) => {
      e.stopPropagation(); // Prevent room selection

      try {
        // Optimistic update
        setPinnedRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });

        // API call
        const result = await togglePinChatRoomAPI(roomId);

        if (!result.success) {
          // Revert optimistic update on failure
          setPinnedRooms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roomId)) {
              newSet.delete(roomId);
            } else {
              newSet.add(roomId);
            }
            return newSet;
          });

          console.error('Failed to toggle pin:', result.error);
        } else {
          // ✅ ADD THIS: Refresh rooms data after successful pin toggle
          await onRefresh();
        }
      } catch (error) {
        // Revert optimistic update on error
        setPinnedRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });
        console.error('Error in togglePin:', error);
      }
    },
    [onRefresh],
  ); // ✅ ADD onRefresh to dependencies

  const toggleMuteChatRoomAPI = async roomId => {
    try {
      const response = await axiosInstance.patch(`chat/rooms/${roomId}/mute`);
      // console.log(response.data.message/)
      return {success: true, data: response.data.data};
    } catch (error) {
      console.error('Error toggling mute:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  };
// Get favorite chat rooms
const getFavoriteChatRoomsAPI = async () => {
  try {
    const response = await axiosInstance.get("/chat/favorites/list");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

  // Add after togglePin function
  const toggleMute = useCallback(
    async (roomId, e) => {
      e.stopPropagation(); // Prevent room selection

      try {
        // Optimistic update
        setMutedRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });

        // API call
        const result = await toggleMuteChatRoomAPI(roomId);

        if (!result.success) {
          // Revert optimistic update on failure
          setMutedRooms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roomId)) {
              newSet.delete(roomId);
            } else {
              newSet.add(roomId);
            }
            return newSet;
          });

          console.error('Failed to toggle mute:', result.error);
        } else {
          // Invalidate muted tab cache and refresh
          if (onInvalidateCache) {
            onInvalidateCache('muted');
          }
          await onRefresh();
        }
      } catch (error) {
        // Revert optimistic update on error
        setMutedRooms(prev => {
          const newSet = new Set(prev);
          if (newSet.has(roomId)) {
            newSet.delete(roomId);
          } else {
            newSet.add(roomId);
          }
          return newSet;
        });
        console.error('Error in toggleMute:', error);
      }
    },
    [onRefresh],
  );

  useEffect(() => {
    const countsMap = new Map();
    chatRooms.forEach(room => {
      countsMap.set(room._id, room.unreadCount || 0);
    });
    setLocalUnreadCounts(countsMap);
  }, [chatRooms]);

  // Initialize local unread counts from props
  useEffect(() => {
    const countsMap = new Map();
    chatRooms.forEach(room => {
      countsMap.set(room._id, room.unreadCount || 0);
    });
    setLocalUnreadCounts(countsMap);
  }, [chatRooms]);
  useEffect(() => {
    if (!user) return;

    const handleUserStatusChanged = data => {
      // console.log('👥 User status changed in ChatBar:', datad);
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          status: data.status,
          lastSeen: data.lastSeen,
        });
        return newMap;
      });
    };

    const handleUserTyping = data => {
      console.log('⌨️ User typing in ChatBar:', data);
      if (data.userId !== user._id) {
        setTypingUsersInRooms(prev => {
          const newMap = new Map(prev);
          const roomTypingUsers = newMap.get(data.chatRoomId) || new Set();
          roomTypingUsers.add(data.userId);
          newMap.set(data.chatRoomId, roomTypingUsers);
          return newMap;
        });

        // Auto-clear typing after 3 seconds if no stop event
        setTimeout(() => {
          setTypingUsersInRooms(prev => {
            const newMap = new Map(prev);
            const roomTypingUsers = newMap.get(data.chatRoomId);
            if (roomTypingUsers) {
              roomTypingUsers.delete(data.userId);
              if (roomTypingUsers.size === 0) {
                newMap.delete(data.chatRoomId);
              } else {
                newMap.set(data.chatRoomId, roomTypingUsers);
              }
            }
            return newMap;
          });
        }, 3000);
      }
    };

    const handleUserStoppedTyping = data => {
      console.log('⌨️ User stopped typing in ChatBar:', data);
      if (data.userId !== user._id) {
        setTypingUsersInRooms(prev => {
          const newMap = new Map(prev);
          const roomTypingUsers = newMap.get(data.chatRoomId);
          if (roomTypingUsers) {
            roomTypingUsers.delete(data.userId);
            if (roomTypingUsers.size === 0) {
              newMap.delete(data.chatRoomId);
            } else {
              newMap.set(data.chatRoomId, roomTypingUsers);
            }
          }
          return newMap;
        });
      }
    };

    const handleNewMessage = message => {
      console.log('📨 New message in ChatBar:', message);

      // Update unread count for the specific room
      if (message.senderId._id !== user._id) {
        const isActiveRoom = activeChatRoom?._id === message.chatRoomId;

        if (!isActiveRoom) {
          setLocalUnreadCounts(prev => {
            const newMap = new Map(prev);
            const currentCount = newMap.get(message.chatRoomId) || 0;
            newMap.set(message.chatRoomId, currentCount + 1);
            return newMap;
          });
        }
      }
    };

    const handleUnreadCountUpdate = data => {
      console.log('📊 Unread count update in ChatBar:', data);

      setLocalUnreadCounts(prev => {
        const newMap = new Map(prev);

        if (data.increment) {
          const currentCount = newMap.get(data.chatRoomId) || 0;
          newMap.set(
            data.chatRoomId,
            Math.max(0, currentCount + data.increment),
          );
        } else if (typeof data.unreadCount === 'number') {
          newMap.set(data.chatRoomId, Math.max(0, data.unreadCount));
        }

        return newMap;
      });
    };

    const handleAllMessagesRead = data => {
      console.log('👁️ All messages read in ChatBar:', data);

      // Reset unread count for the room
      setLocalUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(data.chatRoomId, 0);
        return newMap;
      });
    };

    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('new_message', handleNewMessage);
    socket.on('unread_count_updated', handleUnreadCountUpdate);
    socket.on('all_messages_read', handleAllMessagesRead);

    return () => {
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('new_message', handleNewMessage);
      socket.off('unread_count_updated', handleUnreadCountUpdate);
      socket.off('all_messages_read', handleAllMessagesRead);
    };
  }, [user, activeChatRoom]);

  // Use accessUserId when in access mode, otherwise use user._id
  const effectiveUserId = isAccessMode ? accessUserId : user?._id;

  const getOtherParticipant = useCallback(
    room => {
      if (!room?.participants || !effectiveUserId) return null;
      return room.participants.find(
        p => p?.userId?._id && p.userId._id !== effectiveUserId,
      );
    },
    [effectiveUserId],
  );

  const getUserInitials = useCallback(name => {
    if (!name) return '??';
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 2)
      .toUpperCase();
  }, []);

  const getLastMessagePreview = useCallback(
    room => {
      // Check if someone is typing in this room
      const typingUsers = typingUsersInRooms.get(room._id);
      if (typingUsers && typingUsers.size > 0) {
        return 'typing...';
      }

      if (!room.lastActivity?.lastMessagePreview) {
        return 'No messages yet';
      }
      return room.lastActivity.lastMessagePreview;
    },
    [typingUsersInRooms],
  );

  const getLastMessageTime = useCallback(room => {
    if (!room?.lastActivity?.lastMessageAt) return '';

    try {
      const date = new Date(room.lastActivity.lastMessageAt);
      const now = new Date();

      const isSameDay = date.toDateString() === now.toDateString();

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (isSameDay)
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      if (isYesterday) return 'Yesterday';

      return date.toLocaleDateString([], {month: 'short', day: 'numeric'}); // e.g., "Jul 20"
    } catch {
      return '';
    }
  }, []);

  const isUserOnline = useCallback(
    userId => {
      const userStatus = onlineUsers.get(userId);
      return userStatus?.status === 'online';
    },
    [onlineUsers],
  );

  const getUserLastSeen = useCallback(
    userId => {
      const userStatus = onlineUsers.get(userId);
      if (userStatus?.status === 'online') return 'Online';
      if (userStatus?.lastSeen) {
        try {
          return new Date(userStatus.lastSeen).toLocaleTimeString();
          // return formatDistanceToNow(new Date(userStatus.lastSeen), { addSuffix: true });
        } catch {
          return 'Offline';
        }
      }
      return 'Offline';
    },
    [onlineUsers],
  );

  const isTypingInRoom = useCallback(
    roomId => {
      const typingUsers = typingUsersInRooms.get(roomId);
      return typingUsers && typingUsers.size > 0;
    },
    [typingUsersInRooms],
  );

  const getUnreadCount = useCallback(
    roomId => {
      // Use local unread count which is more accurate
      const localCount = localUnreadCounts.get(roomId) || 0;
      const roomCount = chatRooms.find(r => r._id === roomId)?.unreadCount || 0;
      return Math.max(localCount, roomCount);
    },
    [localUnreadCounts, chatRooms],
  );

  const handleRoomClick = useCallback(
    room => {
      // Reset local unread count for this room
      setLocalUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.set(room._id, 0);
        return newMap;
      });

      onRoomSelect(room);
    },
    [onRoomSelect, getUnreadCount],
  );

  const filteredRooms = chatRooms.filter(room => {
    const otherParticipant = getOtherParticipant(room);
    const participantName = otherParticipant?.userId?.name || '';
    return participantName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  const filters=[
    {name:"All",value:""},
    {name:"Unread",value:"unread"},
    {name:"Fav",value:"favoirte"},
    {name:"Mute",value:"mute"},
  ]
  // console.log(isRefreshing);
  return (
    <View style={styles.chatBarContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        {/* <View style={styles.headerRow}>
          <View style={styles.titleContainer1}>
            <Text style={styles.headerTitle}>Conversations</Text>
            {totalUnreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerControls}>
            <View
              style={[
                styles.connectionIndicator,
                {backgroundColor: socketConnected ? '#4CAF50' : '#F44336'},
              ]}
            />
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={styles.refreshButton}>
              <RefreshCw
                size={20}
                color="#E1E1E1"
                style={refreshing ? styles.refreshingIcon : null}
              />
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#777" style={styles.searchIcon} />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#777"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        
      <TabBar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalUnreadCount={totalUnreadCount}
        />
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredRooms}
        keyExtractor={item => item._id}
        style={styles.chatList}
        contentContainerStyle={
          filteredRooms.length === 0 && styles.emptyListContainer
        }
        onEndReached={() => {
          // Load more when user scrolls to bottom
          if (onLoadMore && hasMore && !loadingMore && !loading) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#777" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No conversations found'
              : activeTab === 'unread' 
            ? 'No unread conversations'
            : activeTab === 'online'
                ? 'No online contacts'
                : activeTab === 'recent'
                    ? 'No recent conversations'
                    : activeTab === 'favorites'
                        ? 'No favorite conversations'
                        : activeTab === 'muted'
                            ? 'No muted conversations'
              :'No conversations yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try searching with a different name'
                : "Start a conversation from someone's profile"}
            </Text>
          </View>
        )}
        renderItem={({item: room}) => {
          const otherParticipant = getOtherParticipant(room);
          const isActive = activeChatRoom?._id === room._id;
          const isOnline = otherParticipant
            ? isUserOnline(otherParticipant.userId._id)
            : false;
          const lastSeen = otherParticipant
            ? getUserLastSeen(otherParticipant.userId._id)
            : '';
          const unreadCount = getUnreadCount(room._id);
          const isTyping = isTypingInRoom(room._id);

          if (!otherParticipant) return null;

          // const [profileVisible, setvisible] = useState(false);
          return (
            <TouchableOpacity
              key={room._id}
              onPress={() => handleRoomClick(room)}
              style={[
                styles.chatItemContainer,
                isActive && styles.activeChatItem,
                unreadCount > 0 && styles.unreadChatItem,
              ]}>
                <ImageModal imageUri={imageUrl} onClose={()=>setImageModal(false)} visible={imageModal}/>
              <View style={styles.chatItemContent}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#FFD700', '#FCED9C', '#FAFAFA']}
                    style={styles.avatarGradient}>
                    <View style={styles.avatarInner}>
                      {otherParticipant.userId.profileURL?.key ? (
                        <TouchableOpacity onPress={()=>{
                          setImageUrl(`${AWS_CDN_URL}${otherParticipant.userId.profileURL.key}`)
                          setImageModal(true)}}>
                        <Image
                          source={{
                            uri: `${AWS_CDN_URL}${otherParticipant.userId.profileURL.key}`,
                          }}
                          style={styles.avatarImage}
                        /></TouchableOpacity>
                      ) : (
                        <View style={styles.avatarInitialsContainer}>
                          <Text style={styles.avatarInitials}>
                            {getUserInitials(otherParticipant.userId.name)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>

                  {/* Online status indicator */}
                  <View
                    style={[
                      styles.onlineStatus,
                      isOnline ? styles.online : styles.offline,
                    ]}
                  />

                  {/* Typing indicator on avatar */}
                  {isTyping && (
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDot} />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.chatDetails}>
                  <View style={styles.chatHeader}>
                    <Text
                      style={[
                        styles.chatName,
                        unreadCount > 0 && styles.unreadChatName,
                      ]}
                      numberOfLines={1}>
                      {otherParticipant.userId.name}
                    </Text>
                    <View style={styles.chatMeta}>
                      <Text style={styles.chatTime}>
                        {getLastMessageTime(room)}
                      </Text>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.chatPreviewRow}>
                    <Text
                      style={[
                        styles.chatPreview,
                        isTyping && styles.typingPreview,
                        unreadCount > 0 && styles.unreadPreview,
                      ]}
                      numberOfLines={1}>
                      {isTyping ? 'Typing...' : getLastMessagePreview(room)}
                      {/* {} */}
                    </Text>
                  </View>

                  {/* Online status text */}
                  {/* <Text style={styles.lastSeenText}>
                    {isTyping ? 'Typing...' : ''}
                  </Text> */}

                  {/* Chat type indicator */}
                  {/* {room.roomType !== 'direct_message' && (
                    <View style={styles.chatTypeBadge}>
                      <Text style={styles.chatTypeText}>
                        {room.roomType.replace('_', ' ')}
                      </Text>
                    </View>
                  )} */}
                </View>
                <View style={styles.statusIndicators}>
                  {pinnedRooms.has(room._id) && (
                    <Pin
                      size={12}
                      color={colors.primaryButtonColor}
                      style={styles.statusIcon}
                    />
                  )}
                  {favoritedRooms.has(room._id) && (
                    <Star
                      size={12}
                      color={colors.primaryButtonColor}
                      fill={colors.primaryButtonColor}
                      style={styles.statusIcon}
                    />
                  )}
                  {mutedRooms.has(room._id) && (
                    // <View style={styles.statusIcon}>
                    <VolumeOff color="#fff" size={13} />
                    // </View>
                  )}
                </View>

                {/* More options */}
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={e => handleOptionsPress(room, e)}>
                  <MoreVertical size={18} color="#777" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={() => {
          // Show loading indicator at bottom when loading more
          if (loadingMore) {
            return (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                <Text style={styles.loadingMoreText}>Loading more conversations...</Text>
              </View>
            );
          }
          // Show "No more conversations" when reached end
          if (!hasMore && filteredRooms.length > 0 && !loading) {
            return (
              <View style={styles.endOfListContainer}>
                <Text style={styles.endOfListText}>No more conversations</Text>
              </View>
            );
          }
          return null;
        }}
        refreshing={isRefreshing}
        onRefresh={() => {
          setIsRefreshing(true);
          onRefresh().finally(() => setIsRefreshing(false));
        }}
      />
     <OptionsMenu
  visible={showOptionsMenu}
  onClose={() => {
    setShowOptionsMenu(false);
    setSelectedRoomForOptions(null);
  }}
  position={optionsMenuPosition}
  room={selectedRoomForOptions}
  onMute={toggleMute}
  onPin={togglePin}
  onFavorite={toggleFavorite}
  isMuted={
    selectedRoomForOptions
      ? mutedRooms.has(selectedRoomForOptions._id)
      : false
  }
  isPinned={
    selectedRoomForOptions
      ? pinnedRooms.has(selectedRoomForOptions._id)
      : false
  }
  isFavorited={
    selectedRoomForOptions
      ? favoritedRooms.has(selectedRoomForOptions._id)
      : false
  }
/>

      {/* Footer with stats */}
      {/* <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {filteredRooms.length} conversation
          {filteredRooms.length !== 1 ? 's' : ''}
        </Text>
        <Text
          style={[
            styles.footerText,
            socketConnected ? styles.connectedText : styles.disconnectedText,
          ]}>
          {socketConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View> */}
    </View>
  );
};

const Comment = ({navigation, route}) => {
  // const {getFollowers} = useFollowApi();
  const {user}: any = useContext(AuthContext);
  const { isAccessMode, sellerInfo } = useAccess();
  const [sound, setSound] = useState(null);
  const roomId = route.params;
  
    const [isPlaying, setIsPlaying] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  // NEW: Tab caching system for instant switching
    const [tabCache, setTabCache] = useState({
        all: [],
        online: [],
        muted: [],
        unread: [],
        favorites: []
    });
      const [isRefreshing, setIsRefreshing] = useState(false);

  // const [searchvisible, setvisiblrSearch] = useState(false);

  // if (socket.connected) {
  //   console.log('✅ Socket is connected');
  // } else {
  //   console.log('❌ Socket is NOT connected');
  // }

  // const fetchChatRooms = async () => {
  //   try {
  //     if (!chatRooms) setLoading(true);
  //     const response = await axiosInstance.get(`/chat/rooms`);
  //     // console.log(response.data)
  //     if (response.data.status) {
  //       const rooms = response.data.data || [];
  //       setChatRooms(rooms);
  //       // Calculate total unread count
  //       const total = rooms.reduce(
  //         (sum, room) => sum + (room.unreadCount || 0),
  //         0,
  //       );
  //       setTotalUnreadCount(total);
  //     }
  //   } catch (error) {
  //     console.log('Error fetching chat rooms:', error.response.data);
  //   } finally {
  //     setLoading(false);
  //      setIsRefreshing(false);
  //   }
  // };

      const fetchChatRooms = async (tab = activeTab, isBackgroundRefresh = false) => {
        try {
            // Only show full loading on initial load or when cache is empty
            const hasCache = tabCache[tab].length > 0;
            
            if (!hasCache && !isBackgroundRefresh) {
                setLoading(true);
            } else if (isBackgroundRefresh) {
                setIsRefreshing(true);
            }
            
            // Select API endpoint based on tab
            let endpoint;
            switch (tab) {
                case 'online':
                    endpoint = "chat/rooms/online";
                    break;
                case 'muted':
                    endpoint = "chat/rooms/muted";
                    break;
                case 'unread':
                    endpoint = "chat/rooms/unread";
                    break;
                case 'favorites':
                    endpoint = "chat/favorites/list";
                    break;
                case 'all':
                default:
                    endpoint = "chat/rooms";
                    break;
            }

            const response = await axiosInstance.get(endpoint);

            if (response.data.status) {
                // Handle different response structures from backend
                let rooms = [];
                
                // Check for nested structures first, then direct array
                if (response.data.data?.chatRooms && Array.isArray(response.data.data.chatRooms)) {
                    rooms = response.data.data.chatRooms;
                } else if (response.data.data?.onlineUsers && Array.isArray(response.data.data.onlineUsers)) {
                    // Handle online users response - the API returns users, not chat rooms
                    // We need to filter existing chat rooms to show only those with online users
                    const onlineUserIds = new Set(response.data.data.onlineUsers.map(user => user._id || user.userId));
                    
                    // Filter chat rooms from cache or fetch all rooms first
                    if (tabCache.all && tabCache.all.length > 0) {
                        // Use cached 'all' rooms and filter for online users
                        rooms = tabCache.all.filter(room => {
                            const otherParticipant = room.participants?.find(p => p?.userId?._id && p.userId._id !== user._id);
                            return otherParticipant && onlineUserIds.has(otherParticipant.userId._id);
                        });
                    } else {
                        // Fetch all rooms first, then filter
                        const allRoomsResponse = await axiosInstance.get("chat/rooms");
                        if (allRoomsResponse.data.status) {
                            const allRooms = Array.isArray(allRoomsResponse.data.data) 
                                ? allRoomsResponse.data.data 
                                : allRoomsResponse.data.data?.chatRooms || [];
                            
                            // Update 'all' cache
                            setTabCache(prev => ({
                                ...prev,
                                all: allRooms
                            }));
                            
                            // Filter for online users
                            rooms = allRooms.filter(room => {
                                const otherParticipant = room.participants?.find(p => p?.userId?._id && p.userId._id !== user._id);
                                return otherParticipant && onlineUserIds.has(otherParticipant.userId._id);
                            });
                        }
                    }
                } else if (Array.isArray(response.data.data)) {
                    // Handle direct array response (e.g., muted rooms, unread rooms, favorites)
                    rooms = response.data.data;
                } else {
                    console.warn('⚠️ Unexpected API response structure:', response.data);
                    rooms = [];
                }
                
                // Update cache for this tab
                setTabCache(prev => ({
                    ...prev,
                    [tab]: rooms
                }));
                
                // Update current chat rooms
                setChatRooms(rooms);
                
                // Calculate initial total unread count
                updateTotalUnreadCount(rooms);
            } else {
                ToastAndroid.show('Failed to load conversations', ToastAndroid.SHORT);
            }
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
          //  negative('Failed to load conversations');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

        // NEW: Handle tab change with instant switching using cache
    const handleTabChange = useCallback((newTab: string) => {
        // ✅ IMPROVED: Immediately clear old data and switch tab for better UX
        setActiveTab(newTab);
        setChatRooms([]); // Clear immediately to prevent old data flash
        setTotalUnreadCount(0);
        setLoading(true); // Show loading state immediately
        
        // Check if we have cached data for this tab
        const cachedData = tabCache[newTab];
        const hasCache = cachedData && cachedData.length > 0;
        
        if (hasCache) {
            // ✅ Use cached data immediately (but after clearing)
            setTimeout(() => {
                setChatRooms(cachedData);
                updateTotalUnreadCount(cachedData);
                setLoading(false);
            }, 0);
            
            // Fetch fresh data in background
            fetchChatRooms(newTab, true);
        } else {
            // No cache: Fetch new data
            fetchChatRooms(newTab, false);
        }
    }, [tabCache, updateTotalUnreadCount, fetchChatRooms]);

        // NEW: Function to invalidate specific tab cache
    const invalidateTabCache = useCallback((tabName) => {
        setTabCache(prev => ({
            ...prev,
            [tabName]: []
        }));
    }, []);

  const getOtherParticipant = useCallback(
    room => {
      if (!room?.participants || !user?._id) return null;
      return room.participants.find(
        p => p?.userId?._id && p.userId._id !== user?._id,
      );
    },
    [user?._id],
  );

  const handleRoomSelect = room => {
    setActiveChatRoom(room);

    // Mark all messages as read when entering chat room
    if (room._id && user._id && socket.connected) {
      socket.emit('mark_all_messages_read', {
        chatRoomId: room._id,
        userId: user._id,
      });

      // Update local unread count immediately
      setChatRooms(prev =>
        prev.map(r => (r._id === room._id ? {...r, unreadCount: 0} : r)),
      );
    }

    const participant = getOtherParticipant(room);
    const userId = participant?.userId?._id;

    if (userId && room?._id && room) {
      navigation.navigate('ChatScreen', {
        userId,
        roomId: room._id,
        chatRoom: room,
      });
    } else {
      console.warn(
        'Missing navigation data',
        userId,
        room?._id,
        activeChatRoom,
      );
    }
  };

  // Add this useEffect to clear activeChatRoom when component comes back into focus
  useFocusEffect(
    useCallback(() => {
      // Clear active chat room when returning to the chat list
      setActiveChatRoom(null);
      fetchChatRooms();
    }, []),
  );

  const handleRefresh = async () => {
    await fetchChatRooms();
  };
  const getMessagePreview = message => {
    switch (message.messageType) {
      case 'text':
        return message.content?.text?.substring(0, 100) || 'New message';
      case 'image':
        return '📷 Image';
      case 'video':
        return '🎥 Video';
      case 'audio':
        return '🎵 Audio';
      case 'file':
        return `📎 ${message.content?.media?.fileName || 'File'}`;
      case 'product_share':
        return `🛍️ Shared a product`;
      case 'live_stream_share':
        return `🔴 Shared a live stream`;
      case 'location':
        return '📍 Location';
      default:
        return 'New message';
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchChatRooms();
    }, []),
  );
  useEffect(() => {
    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);
    const handleNotify=async(data)=>{
      const mutedIds = new Set();
      chatRooms.forEach(room => {
      if (room.isMuted) {
        mutedIds.add(room._id);
      }
    });
      const roomId =await AsyncStorage.getItem('active_chat_room_id');
      // console.log("handling notification",roomId,data.chatRoomId,mutedIds.has(data.chatRoomId))
      if(data.chatRoomId==roomId && !mutedIds.has(data.chatRoomId)){
        // console.log("plyaing sound")
        // playPause()
      }
    }
  //   useEffect(()=>{
  //     const loadDevice=async()=>{
  // const audioFile = new Sound('soundtrack.wav', Sound.MAIN_BUNDLE, (error) => {
  //         // setIsLoading(false);
          
  //         if (error) {
  //           console.log('Failed to load the sound', error);
  //           // Alert.alert('Error', 'Failed to load audio file');
  //           return;
  //         }
          
  //         // Audio loaded successfully
  //         // console.log('Audio loaded successfully');
  //         // console.log('Duration:', audioFile.getDuration(), 'seconds');
  //         setSound(audioFile);
  //       });
  //     }
  //     loadDevice()
  //   },[])
      const playPause = () => {
       
        // const sound=audioFile
        if (!sound) {
          console.log('Audio not loaded yet');
          // Alert.alert('Error', 'Audio not loaded yet');
          return;
        }
    
        if (isPlaying) {
          // Pause the audio
          sound.pause(() => {
            setIsPlaying(false);
          });
        } else {
          // Play the audio
          sound.play((success) => {
            if (success) {
              console.log('Audio played successfully');
            } else {
              console.log('Audio playback failed');
              // Alert.alert('Error', 'Failed to play audio');
            }
            setIsPlaying(false);
          });
          setIsPlaying(true);
        }
      };
  useEffect(() => {
    if (!user) return;

    const handleNewChatRoom = newChatRoom => {
      console.log('📢 New chat room received:', newChatRoom._id);

      setChatRooms(prev => {
        const exists = prev.some(room => room._id === newChatRoom._id);
        if (exists) return prev;

        const updatedRooms = [newChatRoom, ...prev];
        updateTotalUnreadCount(updatedRooms);
        return updatedRooms;
      });
    };

    // ENHANCED: Handle new messages for chat list updates
    const handleNewMessage = message => {
      console.log('📨 New message received in Chat component:', message);
handleNotify(message)
      setChatRooms(prev =>
        prev.map(room => {
          if (room._id === message.chatRoomId) {
            const isActiveChat = activeChatRoom?._id === message.chatRoomId;
            const isFromCurrentUser = message.senderId._id === user._id;

            // Only increment unread if it's not the active chat and not from current user
            let newUnreadCount = room.unreadCount || 0;
            if (!isActiveChat && !isFromCurrentUser) {
              newUnreadCount += 1;
            }

            const updatedRoom = {
              ...room,
              lastActivity: {
                lastMessageAt: message.createdAt,
                lastMessagePreview: getMessagePreview(message),
              },
              unreadCount: newUnreadCount,
            };

            return updatedRoom;
          }
          return room;
        }),
      );

      // Update total unread count
      if (
        message.senderId._id !== user._id &&
        activeChatRoom?._id !== message.chatRoomId
      ) {
        setTotalUnreadCount(prev => prev + 1);
      }

      // setLastUpdateTime(Date.now());
    };

    // ENHANCED: Handle chat room updates from socket
    const handleChatRoomUpdated = data => {
      console.log('📨 Chat room updated in Chat component:', data);

      setChatRooms(prev =>
        prev.map(room => {
          if (room._id === data.chatRoomId) {
            const updatedRoom = {
              ...room,
              lastActivity: data.lastActivity || room.lastActivity,
              unreadCount:
                data.unreadCount !== undefined
                  ? data.unreadCount
                  : room.unreadCount,
            };
            return updatedRoom;
          }
          return room;
        }),
      );

      // setLastUpdateTime(Date.now());
    };

    const handleMessageRead = data => {
      console.log('👁️ Message read event in Chat component:', data);

      // Update message read status in chat rooms if needed
      if (data.readBy !== user._id) {
        setChatRooms(prev =>
          prev.map(room => {
            if (room._id === data.chatRoomId) {
              return {
                ...room,
                lastReadMessageId: data.messageId,
                lastReadAt: data.readAt,
              };
            }
            return room;
          }),
        );
      }
    };

    const handleAllMessagesRead = data => {
      console.log('👁️ All messages read event in Chat component:', data);

      if (data.readBy !== user._id) {
        setChatRooms(prev =>
          prev.map(room => {
            if (room._id === data.chatRoomId) {
              return {
                ...room,
                lastReadMessageId: data.lastReadMessageId,
                lastReadAt: data.readAt,
              };
            }
            return room;
          }),
        );
      }
    };

    const handleUnreadCountUpdate = data => {
      console.log('📊 Unread count update in Chat component:', data);

      setChatRooms(prev => {
        const updatedRooms = prev.map(room => {
          if (room._id === data.chatRoomId) {
            let newUnreadCount = room.unreadCount || 0;

            if (data.increment) {
              newUnreadCount += data.increment;
            } else if (typeof data.unreadCount === 'number') {
              newUnreadCount = data.unreadCount;
            }

            return {
              ...room,
              unreadCount: Math.max(0, newUnreadCount),
            };
          }
          return room;
        });

        updateTotalUnreadCount(updatedRooms);
        return updatedRooms;
      });
    };

    // ENHANCED: Handle user block events for chat list
    const handleUserBlocked = data => {
      console.log('🚫 User blocked event:', data);
      // Refresh chat rooms to get updated status
      fetchChatRooms();
    };

    const handleUserUnblocked = data => {
      console.log('✅ User unblocked event:', data);
      // Refresh chat rooms to get updated status
      fetchChatRooms();
    };

    socket.on('new_chat_room', handleNewChatRoom);
    socket.on('new_message', handleNewMessage);
    socket.on('chat_room_updated', handleChatRoomUpdated);
    socket.on('message_read', handleMessageRead);
    socket.on('all_messages_read', handleAllMessagesRead);
    socket.on('unread_count_updated', handleUnreadCountUpdate);
    socket.on('user_blocked_you', handleUserBlocked);
    socket.on('user_unblocked_you', handleUserUnblocked);
    socket.on('user_block_success', handleUserBlocked);
    socket.on('user_unblock_success', handleUserUnblocked);

    return () => {
      socket.off('new_chat_room', handleNewChatRoom);
      socket.off('new_message', handleNewMessage);
      socket.off('chat_room_updated', handleChatRoomUpdated);
      socket.off('message_read', handleMessageRead);
      socket.off('all_messages_read', handleAllMessagesRead);
      socket.off('unread_count_updated', handleUnreadCountUpdate);
      socket.off('user_blocked_you', handleUserBlocked);
      socket.off('user_unblocked_you', handleUserUnblocked);
      socket.off('user_block_success', handleUserBlocked);
      socket.off('user_unblock_success', handleUserUnblocked);
    };
  }, [user, activeChatRoom]);

  // ENHANCED: Calculate total unread count with better accuracy
  const updateTotalUnreadCount = useCallback(rooms => {
    if (!Array.isArray(rooms)) {
            console.warn('⚠️ updateTotalUnreadCount: rooms is not an array', rooms);
            setTotalUnreadCount(0);
            return;
        }
    const total = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
    setTotalUnreadCount(total);
  }, []);

  // Update total unread count when chat rooms change
  useEffect(() => {
    updateTotalUnreadCount(chatRooms);
  }, [chatRooms, updateTotalUnreadCount]);

    useEffect(() => {
      const onBackPress = () => {
        // console.log('back pressed')
        // console.log(navigation.canGoBack())
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true; // prevent default behavior
        } else {
          // Handle async navigation outside the sync callback
          AsyncStorage.getItem('accessToken').then(token => {
            if(token)
              navigation.navigate('bottomtabbar')
            else
              navigation.navigate('Login')
          });
          return true;
        }
      };
  
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
  
      return () => backHandler.remove();
    }, [navigation]);
const handleNavigation = async() => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else{
      const token =await AsyncStorage.getItem('accessToken')
      if(token)
      navigation.navigate('bottomtabbar')
    else
      navigation.navigate('Login')
    };
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleNavigation}>
          <ArrowLeftCircle color="#fff" size={30} />
        </TouchableOpacity>

        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerTitleContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
        </LinearGradient>
        {/* {!searchvisible && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setvisiblrSearch(!searchvisible)}>
            <Feather name="search" size={22} color="#E1E1E1" />
          </TouchableOpacity>
        )} */}
      </View>

      {/* Access Mode Indicator */}
      {!loading && isAccessMode && sellerInfo && (
        <View style={styles.accessModeIndicator}>
          <View style={styles.accessModeContent}>
            <View style={styles.accessModeLeft}>
              <UserX size={14} color="#FBBF24" />
              <Text style={styles.accessModeText}>
                Viewing {sellerInfo.userName || sellerInfo.name || sellerInfo.userInfo?.name || sellerInfo.userInfo?.userName}'s Inbox
              </Text>
            </View>
            <Text style={styles.accessModeBadge}>
              Access Mode
            </Text>
          </View>
        </View>
      )}

      {/* Main Chat Bar Component */}
      {!loading ? (
        <ChatBar
          chatRooms={chatRooms}
          activeChatRoom={activeChatRoom}
          onRoomSelect={handleRoomSelect}
          onRefresh={handleRefresh}
          totalUnreadCount={totalUnreadCount}
          socketConnected={socketConnected}
          handleTabChange={handleTabChange}
          activeTab={activeTab}
          isRefreshing={isRefreshing}
          loading={loading}
        />
      ) : (
        <View style={styles.chatBarContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#777" style={styles.searchIcon} />
              <TextInput
                placeholder="Search conversations..."
                placeholderTextColor="#777"
                editable={false}
                style={styles.searchInput}
              />
            </View>
            <TabBar 
              activeTab={activeTab}
              onTabChange={handleTabChange}
              totalUnreadCount={totalUnreadCount}
            />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primaryButtonColor} size={'small'} />
            <Text style={styles.loadingText}>loading...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
const OptionsMenu = ({
  visible,
  onClose,
  room,
  onMute,
  onPin,
  onFavorite,
  isMuted,
  isPinned,
  isFavorited,
  position,
}) => {
  if (!visible || !room) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.optionsMenuOverlay}>
          <View style={[styles.optionsMenuContainer, {
            position: 'absolute',
            top: position.y,
            left: position.x,
            // Ensure menu stays within screen bounds
            maxWidth: width * 0.8,
          }]}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={e => {
                  onPin(room._id, e);
                  onClose();
                }}>
                <Pin size={16} color={isPinned ? '#FFD700' : '#E1E1E1'} />
                <Text style={[styles.optionText, isPinned && {color: '#FFD700'}]}>
                  {isPinned ? 'Unpin Chat' : 'Pin Chat'}
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={e => {
                onFavorite(room._id, e);
                onClose();
              }}>
              <Star
                size={16}
                color={isFavorited ? '#FFD700' : '#E1E1E1'}
                fill={isFavorited ? '#FFD700' : 'transparent'}
              />
              <Text
                style={[styles.optionText, isFavorited && {color: '#FFD700'}]}>
                {isFavorited ? 'Remove Favorite' : 'Add to Favorites'}
              </Text>
            </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={e => {
                  onMute(room._id, e);
                  onClose();
                }}>
                {isMuted ? <Volume2 color={'#FFD700'} size={18}/> : <VolumeOff color={'#fff'} size={18}/>}
                <Text style={[styles.optionText, isMuted && {color: '#FFD700'}]}>
                  {isMuted ? 'Unmute Chat' : 'Mute Chat'}
                </Text>
              </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  statusIndicators: {
    flexDirection: 'row',
    // marginRight: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  optionsMenuOverlay: {
    flex: 1,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
 optionsMenuContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#E1E1E1',
  },

  pinnedChatItem: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  mutedPreview: {
    opacity: 0.6,
  },
  moreButton: {
    padding: 8,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ios: 10, android: height * 0.02}),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
  },
  backButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: height * 0.05,
    color: 'white',
    paddingLeft: 10,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 8,
    borderWidth:1,
    borderColor:'#333',
    paddingHorizontal: 5,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  headerTitleContainer: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.045,
    width: width * 0.5,
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryButtonColor,
  },
  onlineIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#03DAC6',
    borderWidth: 2,
    borderColor: '#121212',
    bottom: 0,
    right: 0,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    // backgroundColor:'#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  chatDetails: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    flexShrink: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#BBBBBB',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: '#BBBBBB',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    color: '#121212',
    fontWeight: '600',
  },
  chatList: {
    // paddingHorizontal: 6,
    padding: 2,
    // backgroundColor:'#fff'
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#BBBBBB',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recentText: {
    textTransform: 'uppercase',
    color: '#ccc',
    fontSize: 13,
    letterSpacing: 1.2,
    marginBottom: 6, // reduced from 10
    marginTop: 4, // reduced from 10
    // paddingHorizontal: 10,
  },

  recentName: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4, // reduced vertical gap
    maxWidth: 60, // prevent text overflow
  },

  chatBarContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#777',
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: colors.primaryColor,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unreadBadge1: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  refreshButton: {
    padding: 4,
  },
  refreshingIcon: {
    transform: [{rotate: '360deg'}],
  },

  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    height: '100%',
  },

  chatItemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  activeChatItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRightWidth: 2,
    borderRightColor: '#FFD700',
  },
  unreadChatItem: {
    backgroundColor: 'rgba(42, 42, 42, 0.3)',
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
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
  onlineStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#777',
  },
  typingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  unreadChatName: {
    fontWeight: 'bold',
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: '#777',
  },
  chatUnreadBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  chatUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatPreviewRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#777',
    flex: 1,
  },
  typingPreview: {
    color: 'green',
    fontStyle: 'italic',
  },
  unreadPreview: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  lastSeenText: {
    fontSize: 12,
    color: '#777',
  },
  chatTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  chatTypeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  footerText: {
    fontSize: 12,
    color: '#777',
  },
  connectedText: {
    color: '#4CAF50',
  },
  disconnectedText: {
    color: '#F44336',
  },
  accessModeIndicator: {
    marginHorizontal: 16,
    marginBottom: 0,
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
  },
  accessModeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accessModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accessModeText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  accessModeBadge: {
    color: 'rgba(251, 191, 36, 0.6)',
    fontSize: 12,
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    color: '#777',
    fontSize: 14,
  },
  endOfListContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfListText: {
    color: '#777',
    fontSize: 14,
  },
});

export default Comment;
/* */
