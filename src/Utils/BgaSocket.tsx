// BGA Socket Connection for Giveaway Real-time Features (React Native)
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { bgaSocketUrl } from '../../Config';

// BGA Socket instance - Always connected
const bgaSocket = io(bgaSocketUrl, {
  transports: ['websocket'], // RN works best with websocket only
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  // timeout: 30000,
  auth: async (cb) => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');
      const userId = userData ? JSON.parse(userData).id : null;

      cb({
        userId,
        token: accessToken,
      });
    } catch (err) {
      console.error('❌ Failed to get auth data from AsyncStorage:', err);
      cb({});
    }
  },
});

// Connection state
let isConnected = false;

// Connection handlers
bgaSocket.on('connect', () => {
  console.log('✅ BGA Socket connected:', bgaSocket.id);
  isConnected = true;
});

bgaSocket.on('disconnect', (reason) => {
  console.log('🔄 BGA Socket disconnected, will auto-reconnect:', reason);
  isConnected = false;
});

bgaSocket.on('reconnect', (attemptNumber) => {
  console.log('✅ BGA Socket reconnected after', attemptNumber, 'attempts');
  isConnected = true;
});

bgaSocket.on('reconnect_attempt', (attemptNumber) => {
  console.log('🔄 BGA Socket reconnection attempt:', attemptNumber);
});

bgaSocket.on('connect_error', (error) => {
  console.log('❌ BGA Socket connection error:', error);
  isConnected = false;
});

// Connection management functions
export const connectBgaSocket = () => {
  return Promise.resolve(bgaSocket);
};

export const disconnectBgaSocket = () => {
  console.log('🚫 BGA Socket disconnect disabled - keeping connection alive');
  // Do nothing - socket stays connected
};

// Stream and giveaway room management
export const joinGiveawayRoom = (giveawayId, streamId) => {
  if (!isConnected) {
    console.warn('BGA Socket not connected. Cannot join giveaway room.');
    return false;
  }
  // console.warn('BGA Socksaoom.');
  bgaSocket.emit('join_giveaway', { giveawayId, streamId });
  return true;
};

export const leaveGiveawayRoom = (giveawayId) => {
  if (!isConnected) return false;
  bgaSocket.emit('leave_giveaway', { giveawayId });
  return true;
};

export const joinStreamRoom = (streamId, userId) => {
  if (!isConnected) {
    console.warn('BGA Socket not connected. Cannot join stream room.');
    return false;
  }

  bgaSocket.emit('join_stream', { streamId });

  if (userId) {
    bgaSocket.emit('user_joins_live', { userId, streamId });
  }
// console.log("successfully connected too stream")
  return true;
};

export const leaveStreamRoom = (streamId) => {
  if (!isConnected) return false;
  bgaSocket.emit('leave_stream', { streamId });
  return true;
};

// Giveaway interaction
export const applyToGiveaway = (giveawayId, userId) => {
  if (!isConnected) {
    console.warn('BGA Socket not connected. Cannot send giveaway application.');
    return false;
  }
  bgaSocket.emit('giveaway_apply_attempt', { giveawayId, userId });
  return true;
};

// Event listeners management
const eventListeners = new Map();

export const addBgaSocketListener = (event, callback) => {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event).add(callback);
  bgaSocket.on(event, callback);
};

export const removeBgaSocketListener = (event, callback) => {
  if (eventListeners.has(event)) {
    eventListeners.get(event).delete(callback);
    if (eventListeners.get(event).size === 0) {
      eventListeners.delete(event);
    }
  }
  bgaSocket.off(event, callback);
};

export const removeAllBgaSocketListeners = (event) => {
  if (event) {
    if (eventListeners.has(event)) {
      eventListeners.delete(event);
    }
    bgaSocket.removeAllListeners(event);
  } else {
    eventListeners.clear();
    bgaSocket.removeAllListeners();
  }
};

// Utility functions
export const getBgaSocketId = () => bgaSocket.id;
export const isBgaSocketConnected = () => isConnected && bgaSocket.connected;

// Update socket auth (for when tokens refresh)
export const updateBgaSocketAuth = async () => {
  if (isConnected) {
    // Force reconnect with updated auth
    bgaSocket.disconnect();
    bgaSocket.connect();
  }
  return Promise.resolve(bgaSocket);
};

// Export socket instance
export default bgaSocket;

// Handle app state changes (keep connection alive)
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    console.log('📴 App in background, socket stays alive');
  } else if (state === 'active') {
    console.log('📲 App active, socket ready');
  }
});
