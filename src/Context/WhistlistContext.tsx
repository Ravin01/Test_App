import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { socketurl } from '../../Config';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

const WishlistContext = createContext<any>(undefined);

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
  const {user} = useContext(AuthContext);
  const socketRef = useRef(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const listenersSetup = useRef(false);
  
  // Initialize socket connection
  useEffect(() => {
    // Only initialize if we have a user
    if (!user?._id) {
      return;
    }

    console.log('🔌 [WishlistContext] Initializing socket connection for user:', user._id);
    
    socketRef.current = io(socketurl, {
      auth: {
        userId: user._id  // Pass userId for server-side authentication and room joining
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ [WishlistContext] Socket connected:', socketRef.current.id);
      setIsSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ [WishlistContext] Socket disconnected');
      setIsSocketConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('❌ [WishlistContext] Socket connection error:', error);
      setIsSocketConnected(false);
    });

    return () => {
      if (socketRef.current) {
        console.log('🧹 [WishlistContext] Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsSocketConnected(false);
        listenersSetup.current = false;
      }
    };
  }, [user?._id]);

  // Stable handler for wishlist count updates
  const handleWishlistCount = useCallback((eventName: string) => (count) => {
    console.log(`📊 [WishlistContext] Received wishlist count from '${eventName}':`, count);
    setWishlistCount(count);
  }, []);

  // Setup socket listeners once and keep them active
  useEffect(() => {
    if (!socketRef.current || !isSocketConnected || listenersSetup.current) {
      return;
    }

    console.log('🎧 [WishlistContext] Setting up wishlist listeners');

    // Setup socket listeners with stable handler that logs event name
    const wishlistCountHandler = handleWishlistCount('wishlist-count');
    const wishlistCountUpdateHandler = handleWishlistCount('wishlist-count-update');
    
    socketRef.current.on('wishlist-count', wishlistCountHandler);
    socketRef.current.on('wishlist-count-update', wishlistCountUpdateHandler);
    
    listenersSetup.current = true;

    return () => {
      if (socketRef.current) {
        socketRef.current.off('wishlist-count', wishlistCountHandler);
        socketRef.current.off('wishlist-count-update', wishlistCountUpdateHandler);
        listenersSetup.current = false;
      }
    };
  }, [isSocketConnected, handleWishlistCount]);

  // Request wishlist count when socket connects
  useEffect(() => {
    if (!socketRef.current || !isSocketConnected || !user?._id) {
      return;
    }

    console.log('📤 [WishlistContext] Requesting wishlist count for user:', user._id);
    socketRef.current.emit('request-wishlist-count', user._id);
  }, [user?._id, isSocketConnected]);

  return (
    <WishlistContext.Provider value={{wishlistCount}} >
      {children}
    </WishlistContext.Provider>
  );
};
