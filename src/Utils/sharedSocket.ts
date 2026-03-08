/**
 * Shared Socket Instance
 * 
 * This module provides a single socket.io connection shared across the app.
 * Previously, we had 3 separate socket connections:
 * - AuthContext (notifications)
 * - ChatContext (chat)
 * - WishlistContext (wishlist)
 * 
 * Now all contexts share this single connection, reducing overhead and improving performance.
 */

import { io, Socket } from 'socket.io-client';
import { socketurl } from '../../Config';

let sharedSocket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

/**
 * Get or create the shared socket instance
 * @returns Promise<Socket> - The connected socket instance
 */
export const getSharedSocket = (): Promise<Socket> => {
  // If already connected, return immediately
  if (sharedSocket && sharedSocket.connected) {
    return Promise.resolve(sharedSocket);
  }

  // If connection is in progress, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = new Promise((resolve, reject) => {
    if (!sharedSocket) {
      console.log('🔌 Creating shared socket connection...');
      
      sharedSocket = io(socketurl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: false, // Manual connection control
      });

      sharedSocket.on('connect', () => {
        console.log('✅ Shared socket connected:', sharedSocket?.id);
        connectionPromise = null;
        resolve(sharedSocket!);
      });

      sharedSocket.on('connect_error', (error) => {
        console.log('❌ Shared socket connection error:', error);
        connectionPromise = null;
        reject(error);
      });

      sharedSocket.on('disconnect', (reason) => {
        console.log('🔌 Shared socket disconnected:', reason);
      });
    }

    // Connect the socket
    sharedSocket.connect();
  });

  return connectionPromise;
};

/**
 * Initialize socket with user authentication
 * @param userId - The user ID to authenticate with
 */
export const initializeSocketAuth = async (userId: string) => {
  try {
    const socket = await getSharedSocket();
    socket.auth = { userId };
    
    if (!socket.connected) {
      socket.connect();
    }
    
    console.log('🔐 Socket authenticated for user:', userId);
  } catch (error) {
    console.error('❌ Failed to authenticate socket:', error);
  }
};

/**
 * Disconnect and cleanup the shared socket
 */
export const disconnectSharedSocket = () => {
  if (sharedSocket) {
    console.log('🧹 Disconnecting shared socket');
    sharedSocket.disconnect();
    sharedSocket = null;
    connectionPromise = null;
  }
};

/**
 * Check if socket is currently connected
 */
export const isSocketConnected = (): boolean => {
  return sharedSocket?.connected || false;
};

/**
 * Get the socket instance (may be null if not initialized)
 */
export const getSocketInstance = (): Socket | null => {
  return sharedSocket;
};

/**
 * Emit an event on the shared socket
 * @param event - Event name
 * @param data - Data to send
 */
export const emitSocketEvent = async (event: string, data?: any) => {
  try {
    const socket = await getSharedSocket();
    socket.emit(event, data);
  } catch (error) {
    console.error(`❌ Failed to emit socket event ${event}:`, error);
  }
};

/**
 * Listen to a socket event
 * @param event - Event name
 * @param callback - Event callback
 * @returns Cleanup function to remove the listener
 */
export const onSocketEvent = async (
  event: string,
  callback: (...args: any[]) => void
): Promise<(() => void) | null> => {
  try {
    const socket = await getSharedSocket();
    socket.on(event, callback);
    
    // Return cleanup function
    return () => {
      socket.off(event, callback);
    };
  } catch (error) {
    console.error(`❌ Failed to listen to socket event ${event}:`, error);
    return null;
  }
};

/**
 * Remove a socket event listener
 * @param event - Event name
 * @param callback - Event callback (optional, removes all if not provided)
 */
export const offSocketEvent = (event: string, callback?: (...args: any[]) => void) => {
  if (sharedSocket) {
    if (callback) {
      sharedSocket.off(event, callback);
    } else {
      sharedSocket.off(event);
    }
  }
};
