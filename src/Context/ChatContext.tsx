import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../Utils/Api';
import {socketurl} from '../../Config';
import {io} from 'socket.io-client';
import { AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from './AuthContext';

const ChatContext = createContext<any>(null);

// ✅ OPTIMIZATION: Create socket lazily, don't connect immediately
let socket = null;

export const ChatProvider = ({ children }) => {
  const {user}=useAuthContext()
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState(null);

  // ✅ Create socket initialization function
  const initializeSocket = useCallback(() => {
    if (!socket) {
      socket = io(socketurl, {
        transports: ['websocket'],
        autoConnect: false, // Don't connect automatically
      });
    }
  }, []);

  const fetchUnreadChatCount = useCallback(async () => {
    // ✅ CRITICAL FIX: Only fetch if user is authenticated
    if (!user) {
      console.log('⏭️ [ChatContext] Skipping fetch - no user');
      return;
    }

    // const timestamp = new Date().toLocaleTimeString();
    // console.log(`🔄 [ChatContext] fetchUnreadChatCount called at ${timestamp}`);
    // console.log(`   Socket connected: ${socket.connected}`);
    // console.log(`   Socket ID: ${socket.id || 'Not connected'}`);

    try {
      // 🔥 NEW: Request unread people count via socket instead of API
      socket.emit('get_unread_people_count');
    } catch (error) {
      console.error('❌ [ChatContext] Error requesting unread chat count:', error);
    }
  }, [user]);

//   useEffect(() => {
//   const subscription = DeviceEventEmitter.addListener(
//     'updateUnreadCount',
//     () => {
//       fetchUnreadChatCount();
//     }
//   );
//   return () => subscription.remove();
// }, [fetchUnreadChatCount]);


useEffect(() => {
  // IDEA: Fetch when app comes to foreground
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      fetchUnreadChatCount();
    }
  });
  
  return () => subscription?.remove();
}, [fetchUnreadChatCount]);

  useEffect(() => {
    // ✅ CRITICAL FIX: Only run if user is authenticated
    if (!user) {
      // Reset unread count when user logs out
      setUnreadChatCount(0);
      // Disconnect socket if user logs out
      if (socket && socket.connected) {
        socket.disconnect();
      }
      return;
    }

    // ✅ Initialize socket (following AuthContext pattern)
    initializeSocket();

    if (!socket) return;

    // ✅ Connect socket with user authentication (CRITICAL FIX)
    socket.auth = {userId: user.username || user._id};
    if (!socket.connected) {
      socket.connect();
    }

    // Request initial count from socket
    //socket.emit('request-notification-count', user.username || user._id);

    // Initial fetch via socket
    fetchUnreadChatCount();

    // 🔥 NEW: Listen for unread people count updates via socket
    const handleUnreadPeopleCountUpdate = (data) => {
      // console.log('📊 Unread people count update:', data);
      setUnreadChatCount(data.totalPeople || 0);
    };

    // ✅ Listen for new messages
    const handleNewMessage = (data) => {
      // console.log('📩 New message received:', data);
      // Socket will emit updated count, so we just request it
      fetchUnreadChatCount();
    };

    // ✅ Listen for message read - CRITICAL FIX
    const handleMessageRead = (data) => {
      // console.log('✅ Message read event:', data);
      // Socket will emit updated count, so we just request it
      fetchUnreadChatCount();
    };

    // ✅ Listen for all messages read - CRITICAL FIX
    const handleAllMessagesRead = (data) => {
      // console.log('📭 All messages read event:', data);
      // Socket will emit updated count, so we just request it
      fetchUnreadChatCount();
    };

    // ✅ Listen for chat room updated event
    const handleChatRoomUpdated = (data) => {
      // console.log('🔄 Chat room updated:', data);
      fetchUnreadChatCount();
    };

    // 🔥 NEW: Primary socket event for unread count updates
    socket.on('unread_people_count_update', handleUnreadPeopleCountUpdate);
    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('all_messages_read', handleAllMessagesRead);
    socket.on('chat_room_updated', handleChatRoomUpdated);

    // Log socket connection status
    // console.log('🔌 [ChatContext] Setting up socket listeners');
    // console.log(`   Socket connected: ${socket.connected}`);
    // console.log(`   Socket ID: ${socket.id || 'Not connected'}`);

    // Add connection/disconnection listeners
    const handleConnect = () => {
      // console.log('✅ [ChatContext] Socket connected!', socket.id);
      fetchUnreadChatCount(); // Fetch immediately on connection
    };
    
    const handleDisconnect = (reason) => {
      console.log('❌ [ChatContext] Socket disconnected:', reason);
    };

    const handleConnectError = (error) => {
      console.error('🚨 [ChatContext] Socket connection error:', error.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    // Reduced polling fallback to every 60 seconds (since we're using sockets now)
    //console.log('⏰ [ChatContext] Setting up 60-second polling interval');
    //let pollCount = 0;
    const interval = setInterval(() => {
      //pollCount++;
      //console.log(`⏰ [ChatContext] Polling interval #${pollCount} triggered`);
      fetchUnreadChatCount();
    }, 60000);

    return () => {
      console.log('🧹 [ChatContext] Cleaning up socket listeners and interval');
      socket.off('unread_people_count_update', handleUnreadPeopleCountUpdate);
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('all_messages_read', handleAllMessagesRead);
      socket.off('chat_room_updated', handleChatRoomUpdated);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      clearInterval(interval);
    };
  }, [fetchUnreadChatCount, activeRoomId, user])

  return (
    <ChatContext.Provider value={{ 
      unreadChatCount, 
      setUnreadChatCount,
      fetchUnreadChatCount,
      activeRoomId,
      setActiveRoomId 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
