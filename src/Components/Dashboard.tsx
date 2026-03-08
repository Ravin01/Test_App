/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ToastAndroid,
  BackHandler,
  Image,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  PixelRatio,
  DeviceEventEmitter,
  Animated,
  TouchableWithoutFeedback,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import ReanimatedAnimated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import FastImage from 'react-native-fast-image';
import { AuthContext } from '../Context/AuthContext';
import { useChat } from "../Context/ChatContext";
import { useAccess } from '../Context/AccessContext';
import Header from './Reuse/Header';
import SkeletonLoader from './Skeletons/SkeletonLoader';
import StatusModal from './ShipperComponents/StatusModal';
import CategoriesScreen from './CategoriesScreen/CategoriesModal';
import ProfileSetupModal from './AuthScreens/ProfileSetupModal';
import MobileVerificationModal from './AuthScreens/MobileVerificationModal';
import { colors, overlay } from '../Utils/Colors';
import { AWS_CDN_URL, streamingBackendUrl } from '../../Config';
import api from '../Utils/Api';
import { getStatusBarHeight, formatTimeDayForDisplay, formatFollowerCount, formatCurrency } from '../Utils/dateUtils';
import { SafeAreaView } from 'react-native-safe-area-context';

import LinearGradient from 'react-native-linear-gradient';
import { Eye } from 'lucide-react-native';
import { io } from 'socket.io-client';
import Marquee from './DashboardComponents/Marquee';
import RegionalSection from './DashboardComponents/RegionalSection';
import BecomeSellerBanner from './DashboardComponents/BecomeSellerBanner';
import TrendingNow from './DashboardComponents/TrendingNow';
import TopStores from './DashboardComponents/TopStores';
import TextTicker from 'react-native-text-ticker';
import MixedGrid from './DashboardComponents/MixedGrid';
import { useCountdown } from './DashboardComponents/hooks/useCountdown';

import useFlashSales from './DashboardComponents/hooks/useFlashSales';
import FlashGrid from './DashboardComponents/FlashGrid';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { se } from 'rn-emoji-keyboard';
import { useWishlist } from '../Context/WhistlistContext';
import { SearchAPI } from './GloabalSearch/hooks/SearchService';
import { SearchDataStorage } from './GloabalSearch/hooks/SearchStores';
import FIcon from 'react-native-vector-icons/FontAwesome';
import { useBatteryOptimization } from '../hooks/useBatteryOptimization';
import { useDashboardNav } from '../hooks/useDashboardNav';
//import { SaleGif, Upcoming } from '../assets/assets.js';
import { 
  becomeSeller, 
  categoryIcon1, categoryIcon2, categoryIcon3, categoryIcon4, categoryIcon5, 
  categoryIcon6, categoryIcon7, categoryIcon8, categoryIcon9, categoryIcon10,
  categoryIcon11, categoryIcon12, categoryIcon13, categoryIcon14, categoryIcon15,
  categoryIcon16, categoryIcon17, categoryIcon18,
  SaleGif, storeIcon, Upcoming, 
  shopVideo
} from '../assets/assets.js';
import { all } from 'axios';
import { useStreamViewerCounts } from '../hooks/useStreamViewerCount';
import {StreamEventEmitter} from '../Utils/StreamEventEmitter';
import {RegisterEventEmitter} from '../Utils/RegisterEventEmitter';
import { useShowsStore, useLiveShows, useUpcomingShows } from '../stores/useShowsStore';
import {
  configureAppSync,
  connectToChannel,
  getIVSChannelPath,
  getRegistrationChannelPath,
  subscribeToChannel,
  closeChannel,
  getGlobalChannelPath
} from '../Utils/appSyncConfig';

//Live Appsync Subscriptions at context level
import { useStreamSubscriptionControl, useStreamEventTimestamps } from '../Context/StreamEventContext';

//import * as IVS from 'amazon-ivs-react-native-broadcast';

// ==================== UTILITY FUNCTIONS ====================
export const responsiveFontSize = size => {
  const scale = PixelRatio.getFontScale();
  return size * scale;
};

const getUserInitials = userName => {
  if (!userName) return null;

  const alphanumericChars = userName.replace(/[^a-zA-Z0-9]/g, '');

  if (!alphanumericChars) return null;

  return alphanumericChars.substring(0, 2).toUpperCase();
};

// ==================== CONSTANTS ====================
const breadCrumbCategories = [
  { label: 'All', value: 'all' },
  { label: '🔴 Live', value: 'Live' },
  { label: '🏷️ Fashion', value: 'Fashion & Accessories' },
  { label: '💄 Beauty', value: 'Beauty & Personal Care' },
  { label: '🐾 Pets', value: 'Pets' },
  { label: '🎮 Gaming', value: 'Gaming' },
  { label: '🛠️ Tools & Hardware', value: 'Tools & Hardware' },
  { label: '⚽ Sports', value: 'Sports & Fitness' },
  { label: '🎁 Gifts', value: 'Gifts & Festive Needs' },
  { label: '🏗️ Construction Materials', value: 'Construction Materials' },
  { label: '👶 Baby & Kids', value: 'Baby & Kids' },
  { label: '📱 Electronics', value: 'Electronics & Gadgets' },
  { label: '🍔 Food & Beverages', value: 'Food & Beverages' },
  { label: '📦 Miscellaneous', value: 'Miscellaneous' },
  { label: '💎 Luxury & Collectibles', value: 'Luxury & Collectibles' },
  { label: '🏠 Home & Living', value: 'Home & Living' },
  { label: '🩺 Health & Wellness', value: 'Health & Wellness' },
  {
    label: '📚 Books, Hobbies & Stationery',
    value: 'Books, Hobbies & Stationery',
  },
  { label: '🚗 Automobiles & Accessories', value: 'Automobiles & Accessories' },
  { label: '🔬 Industrial & Scientific', value: 'Industrial & Scientific' },
];

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2 - 25;
const ITEM_WIDTH_ROW = width / 2.3 - 25;
const ITEM_WIDTH_COLUMN = width / 2 - 25;

//new
// For store cards
const CARD_MIN_WIDTH = 120; // min width you want for each card
const numColumns = Math.floor(width / CARD_MIN_WIDTH);

// For live cards
const LIVE_CARD_MIN_WIDTH = 120; // min width you want for each card
const LiveNumColumns = Math.floor(width / LIVE_CARD_MIN_WIDTH);

const Dashboard = React.memo(() => {
  const backPressCount = useRef(0);
  const backPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  const navigation = useNavigation();

  // Navigation hook for optimized, memoized navigation functions
  const {
    navigateToProductDetails,
    navigateToGlobalSearch,
    navigateToShowsTab,
    navigateToProductsTab,
    navigateToVideosTab,
    navigateToUsersTab,
    navigateToCategory,
    navigateToSellerProfile,
    navigateToProfileWithOwnershipCheck,
    navigateToLiveScreen,
    navigateToReel,
    navigateToComment,
    navigateToSellerPortal,
    navigateToProfileSetup,
    navigateToWishlist,
    navigateToDropshipperForm,
  } = useDashboardNav();

  // Get wishlist count from context

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isVideo, setIsVideo] = useState(true);
  const [isExclusiveFullScreen, setExclusiveFullScreen] = useState(true); //useState(false);
  const [isForYouFullScreen, setForYouFullScreen] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [profileSetupModalVisible, setProfileSetupModalVisible] = useState(false);
  const [mobileVerificationModalVisible, setMobileVerificationModalVisible] = useState(false)
  const [videos, setVideos] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const { user, fetchuser }: any = useContext(AuthContext);
  const { unreadChatCount } = useChat();
  const { isEnteringAccessMode, isAccessMode, exitAccessMode, enterAccessMode } = useAccess();
  const wishlistData = useWishlist();
  const wishlistCount = wishlistData?.wishlistCount || 0;

  // 🔋 Battery optimization hook
  const { isLowPowerMode, batteryLevel } = useBatteryOptimization();

  // console.log('reels===', shows[0]);

  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingUpComingShows, setLoadingUpcomingShows] = useState(false);

  const [products, setProducts] = useState([]);

  const categories = ['Followed','Trending','Clothes', 'Toys','Furnitures','Accessories'];
  const [selectedCategory, setSelectedCategory] = useState('Followed');

  // eslint-disable-next-line no-trailing-spaces

  // console.log(Object.keys(IVS)); // This will show available exports

  const [breadCrumbVisible, setBreadCrumbVisible] = useState(true);

  const [activeStore, setActiveStore] = useState(null);

  const [sellers, setSellers] = useState([]);
  // console.log('seller state===', sellers);

  const [loadingProducts, setLoadingProducts] = useState(false);

  const [refreshing, setRefreshing] = useState(false); // Add refreshing state

  const [cities, setCities] = useState([]);

  const { liveSales, upcomingSales, isLoading, refreshAll: refreshFlashSales } = useFlashSales();

  const maxEndTime = useMemo(() => {
    if (!liveSales?.length) return null;

    // find the max endTime
    const latest = liveSales.reduce((max, sale) => {
      const end = new Date(sale.endTime).getTime();
      return end > max ? end : max;
    }, 0);

    return new Date(latest);
  }, [liveSales]);

  // const {days, hours, minutes, seconds} = useCountdown(liveSales[0]?.endTime);

  const { days, hours, minutes, seconds } = useCountdown(maxEndTime);

  //console.log('live sales', liveSales);

  const {
    days: startDay,
    hours: startHour,
    minutes: startMinute,
    seconds: startSecond,
  } = useCountdown(upcomingSales[0]?.startTime);

  useEffect(() => {
    // Preload search data when dashboard mounts
    const preloadSearchData = async () => {
      try {
        const result = await SearchAPI.preloadData();
        if (result.success) {
          SearchDataStorage.setPreloadedData(result.data);
          // console.log('Search data preloaded successfully');
        }
      } catch (error) {
        console.error('Failed to preload search data:', error);
      }
    };

    preloadSearchData();
  }, []);
  // console.log('rendering');

  // console.log('Live Sales:', liveSales);
  // console.log('Upcoming Sales:', upcomingSales);

 const isFocused = useIsFocused();


  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Replace local state with Zustand store
  const { 
    shows: allShows, 
    isLoading: showsLoading,
    hasMore,
    fetchShows: fetchShowsFromStore,
    loadMore: loadMoreShows,
    refreshToCurrentPage,
    updateShow: updateShowInStore,
    updateShows: updateShowsInStore,
    reset: resetShowsStore
  } = useShowsStore();
  
  // Use useMemo to filter shows and prevent infinite loops
  const liveShows = useMemo(() => {
    return allShows.filter(show => show.isLive);
  }, [allShows]);
  
  const upcomingShows = useMemo(() => {
    const now = new Date();
    return allShows.filter(show => 
      // show.scheduledAt &&
      // new Date(show.scheduledAt) > now &&
      !show.isLive
    );
  }, [allShows]);

  //console.log('upcoming shows length===', upcomingShows.length);

  // 🎯 Filtered lists to prevent duplication in UI
  // Exclude shows already displayed in Premium Live Banner
  const filteredLiveShows = useMemo(() => {
    // Exclude first live show (shown in premium banner)
    return liveShows.length > 1 ? liveShows.slice(1) : [];
  }, [liveShows]);

  const filteredUpcomingShows = useMemo(() => {
    if (liveShows.length > 0) {
      // Live shows exist, so upcoming wasn't used in premium banner - show all
      return upcomingShows;
    } else {
      // No live shows, first upcoming was shown in premium banner - exclude it
      return upcomingShows.length > 1 ? upcomingShows.slice(1) : [];
    }
  }, [liveShows.length, upcomingShows]);

  // Initialize viewer count hook for real-time updates
  const {viewerCounts}= useStreamViewerCounts(allShows);


  {/* Critical fix: 🎯 Exit access upon app restart */}
  useEffect(() => {

    if(!isAccessMode) return

    if (!isEnteringAccessMode && isAccessMode && exitAccessMode) {
      exitAccessMode();
    } else {
      console.log('⚠️ [Dashboard] exitAccessMode function not available');
    }
    
  }, [isAccessMode])

  //console.log('allshows', allShows);

  // No longer need to sync - derived from Zustand store via selectors

  // Initialize socket connection - Direct connection like StartStream.jsx
  useEffect(() => {
    const serverUrl = streamingBackendUrl;
    // console.log(`🔌 [(Dashboard)] Connecting to socket server: ${serverUrl}`);

    socketRef.current = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      forceNew: true,
    });

    socketRef.current.on("connect", () => {
      // console.log(`✅ [Dashboard] Socket connected: ${socketRef.current.id}`);
      setIsConnected(true);
    });

    socketRef.current.on("connect_error", (error) => {
      // console.log(`❌ [Dashboard] Socket connection error:`, error.message);
      setIsConnected(false);
    });

    socketRef.current.on("disconnect", (reason) => {
      // console.log(`🔌 [Dashboard] Socket disconnected:`, reason);
      setIsConnected(false);
    });

    socketRef.current.on("reconnect", (attemptNumber) => {
      // console.log(`🔄 [Dashboard] Socket reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
    });

    return () => {
      // console.log('🧹 [Dashboard] Disconnecting socket');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Add state for wishlist items and loading
  // const [wishlistLoading, setWishlistLoading] = useState(new Set());

  // const handleToggleWishlist = async productId => {
  //   // Add product to loading set
  //   setWishlistLoading(prev => new Set(prev).add(productId));

  //   try {
  //     const response = await api.post(`/wishlist/${productId}/toggle`);

  //     if (response.status === 200 && response.data.status) {
  //       const isAddedToWishlist = response.data.data.isInWishlist;

  //       // Update the isInWishlist property directly on the product object
  //       setProducts(prevProducts => {
  //         return prevProducts.map(product =>
  //           product._id === productId
  //             ? { ...product, isInWishlist: isAddedToWishlist }
  //             : product,
  //         );
  //       });

  //       ToastAndroid.show(
  //         response.data.message ||
  //         (isAddedToWishlist ? 'Added to wishlist' : 'Removed from wishlist'),
  //         ToastAndroid.SHORT,
  //       );
  //     } else {
  //       ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
  //     }
  //   } catch (error) {
  //     console.error('Error toggling wishlist:', error);
  //     ToastAndroid.show('Failed to update wishlist', ToastAndroid.SHORT);
  //   } finally {
  //     // Remove product from loading set
  //     setWishlistLoading(prev => {
  //       const newSet = new Set(prev);
  //       newSet.delete(productId);
  //       return newSet;
  //     });
  //   }
  // };

  // Join socket rooms for all displayed shows - FIXED: Use show._id instead of show.liveStreamId
  // useEffect(() => {
  //   // console.log('🎯 [LiveShoppingPage] useEffect: Room joining triggered');
  //   // console.log('   Socket:', socketRef.current ? 'EXISTS' : 'NULL');
  //   // console.log('   IsConnected:', isConnected);
  //   // console.log('   Shows count:', allShows.length);

  //   if (!socketRef.current) {
  //     console.log('❌ [Dashboard] Socket is NULL - cannot join rooms');
  //     return;
  //   }

  //   if (!isConnected) {
  //      console.log('⚠️ [Dashboard] Socket exists but NOT CONNECTED yet');
  //     return;
  //   }

  //   if (allShows.length === 0) {
  //     console.log('📭 [Dashboard] No shows to join rooms for');
  //     return;
  //   }

  //   // console.log('🔌 [LiveShoppingPage] ✅ All conditions met! Joining stream rooms...');
  //   // console.log('   Socket ID:', socketRef.current.id);
  //   // console.log('   Shows to join:', allShows.map(s => ({ id: s.liveStreamId, title: s.title, isLive: s.isLive })));

  //   // // Join rooms for all displayed shows
  //   // console.log('🚀 [LiveShoppingPage] Starting to join rooms...');
  //   allShows.forEach((show, index) => {
  //     // 🔥CRITICAL FIX: Use show._id (MongoDB document ID) not show.liveStreamId
  //     // Backend emits to room: `stream:${MongoDB_Stream_Record_ID}`
  //     const roomToJoin = show._id;
  //     const roomName = `stream:${roomToJoin}`;

  //     // console.log(`📍 [LiveShoppingPage] [${index + 1}/${allShows.length}] Joining room: ${roomName}`);
  //     // console.log(`   Show Title: ${show.title}`);
  //     // console.log(`   Show MongoDB ID: ${show._id} ← CORRECT ROOM ID`);
  //     // console.log(`   Live Stream ID: ${show.liveStreamId || 'N/A'} ← AWS IVS ID (not for rooms)`);
  //     // console.log(`   Is Live: ${show.isLive}`);

  //     try {
  //       // Direct socket emit - same as StartStream.jsx
  //       socketRef.current.emit('join-stream-room', roomToJoin);
  //       // console.log(`   ✅ Joined/ room successfully: ${roomName}`);
  //     } catch (error) {
  //       console.error(`   ❌ Error joining room:`, error);
  //     }
  //   });

  //   // Cleanup: Leave all rooms when component unmounts or shows change
  //   return () => {
  //     // console.log('🧹 [Dashboard] Cleaning up - leaving all stream rooms');
  //     allShows.forEach(show => {
  //       const roomToLeave = show._id;
  //       const roomName = `stream:${roomToLeave}`;
  //       // console.log(`📍 [Dashboard] Leaving room: ${roomName}`);
  //       try {
  //         socketRef.current.emit('leave', { room: roomName });
  //       } catch (error) {
  //         console.error(`   ❌ Error leaving room:`, error);
  //       }
  //     });
  //   };
  // }, [isConnected, allShows]);

  // Listen for real-time stream events - Direct socket listeners like StartStream.jsx
  useEffect(() => {
    // console.log('🎧 [LiveShoppingPage] useEffect: Event listener setup triggered');

    if (!socketRef.current) {
      console.log('❌ [Dashboard] Socket is NULL - cannot attach listeners');
      return;
    }

    if (!isConnected) {
      console.log('⚠️ [Dashboard] Socket exists but NOT CONNECTED - skipping listeners');
      return;
    }

    // console.log('👂 [Dashboard] ✅ Setting up stream event listeners...');
    // console.log('   Socket ID:', socketRef.current.id);
    // console.log('   Current listeners:', socketRef.current.listeners('stream:started').length);

    // Handler for when stream starts
    const handleStreamStarted = (data) => {
      // console.log('🎬 [LiveShoppingPage] ===== STREAM STARTED EVENT =====');
      // console.log('   Stream ID:', data.streamId);
      // console.log('   Status:', data.status);
      // console.log('   Seller ID:', data.sellerId);
      // console.log('   Live Stream ID:', data.liveStreamId);
      // console.log('   Viewer Count:', data.viewerCount || 0);
      // console.log('   Started At:', data.startedAt);

      // Update the specific show to LIVE status using Zustand
      updateShowInStore(data.streamId, {
        isLive: true,
        streamStatus: 'live',
        liveStreamId: data.liveStreamId,
        viewerCount: data.viewerCount || 0
      });

      console.log('🚀 [Dashboard] Updated show to LIVE via Zustand!');
    };

    // Handler for stream:live event - Refreshes entire shows list from Zustand store
    const handleStreamLive = async (data) => {
      console.log('🔴 [Dashboard] Stream went live, refreshing shows via Zustand...');
      // console.log('   Event Data:', data);
      // console.log('   Stream ID:', data.streamId);
      // console.log('   Seller ID:', data.sellerId);
      // console.log('   Stream Status:', data.streamStatus);
      // console.log('   Stream Type:', data.streamType);

      
      try {
        // Use Zustand's fetchShows instead of manual API call
        await fetchShowsFromStore(true); // Reset to page 0 and fetch fresh data
        console.log('✅ [Dashboard] Shows refreshed successfully via Zustand!');
      } catch (error) {
        console.log('❌ [Dashboard] Error refreshing shows:', error);
      }
    };

    // Handler for when stream ends - Refreshes entire shows list from Zustand store
    const handleStreamEnded = async (data) => {
      console.log('🛑 [Dashboard] Stream ended, refreshing shows via Zustand...');
      // console.log('   Event Data:', data);
      // console.log('   Live Stream ID:', data.liveStreamId);
      // console.log('   Stream ID:', data.streamId);

      try {
        // Use Zustand's fetchShows instead of manual API call
        await fetchShowsFromStore(true); // Reset to page 0 and fetch fresh data
        console.log('✅ [Dashboard] Shows refreshed successfully via Zustand!');
      } catch (error) {
        console.log('❌ [Dashboard] Error refreshing shows:', error);
      }
    };

    // Handler for viewer count updates
    const handleViewerJoined = (data) => {
      // console.log('👥 [LiveShoppingPage] Viewer JOINED:', {
      //   streamId: data.streamId,
      //   viewerCount: data.viewerCount,
      //   webrtcViewers: data.webrtcViewers,
      //   hlsViewers: data.hlsViewers
      // });

      // Update viewer count using Zustand
      updateShowInStore(data.streamId, {
        viewerCount: data.viewerCount
      });

      console.log(`✅ [Dashboard] Updated viewer count via Zustand: ${data.viewerCount}`);
    };

    const handleViewerLeft = (data) => {
      // console.log('👋 [LiveShoppingPage] Viewer LEFT:', {
      //   streamId: data.streamId,
      //   viewerCount: data.viewerCount,
      //   webrtcViewers: data.webrtcViewers,
      //   hlsViewers: data.hlsViewers
      // });

      // Update viewer count using Zustand
      updateShowInStore(data.streamId, {
        viewerCount: data.viewerCount
      });

      console.log(`   ✅ [Dashboard] Updated viewer count via Zustand: ${data.viewerCount}`);
    };

    // Attach event listeners - Direct socket like StartStream.jsx
    // console.log('🔗 [Dashboard] Attaching event listeners...');

    socketRef.current.on('stream:started', handleStreamStarted);
    // console.log('   ✅ Attached: stream:started');/

    socketRef.current.on('stream:ended', handleStreamEnded);
    // console.log('   ✅ Attached: stream:ended');

    socketRef.current.on('stream:viewer:joined', handleViewerJoined);
    // console.log('   ✅ Attached: stream:viewer:joined');

    socketRef.current.on('stream:viewer:left', handleViewerLeft);
    // console.log('   ✅ Attached: stream:viewer:left');

    socketRef.current.on('stream:live', handleStreamLive);
    // console.log('   ✅ Attached: stream:live (calls search API)');

    // console.log('✅ [Dashboard] All 5 event listeners attached successfully!');
    // console.log('   Listener counts:', {
    //   'stream:started': socketRef.current.listeners('stream:started').length,
    //   'stream:ended': socketRef.current.listeners('stream:ended').length,
    //   'stream:viewer:joined': socketRef.current.listeners('stream:viewer:joined').length,
    //   'stream:viewer:left': socketRef.current.listeners('stream:viewer:left').length,
    //   'stream:live': socketRef.current.listeners('stream:live').length
    // });

    // Cleanup: Remove event listeners when component unmounts
    return () => {
      // console.log('🧹 [Dashboard] Removing event listeners...');
      if (socketRef.current) {
        socketRef.current.off('stream:started', handleStreamStarted);
        socketRef.current.off('stream:ended', handleStreamEnded);
        socketRef.current.off('stream:viewer:joined', handleViewerJoined);
        socketRef.current.off('stream:viewer:left', handleViewerLeft);
        socketRef.current.off('stream:live', handleStreamLive);
      }
      // console.log('✅ [Dashboard] Event listeners removed');
    };
  }, [isConnected]);


const { activateSubscription, deactivateSubscription, isSubscriptionActive } = useStreamSubscriptionControl();
const { lastStreamLiveAt, lastStreamEndedAt } = useStreamEventTimestamps();

// Activate/deactivate subscription when all shows are loaded
useEffect(() => {
  const shouldBeActive = allShows.length > 0;

  if (shouldBeActive && !isSubscriptionActive) {
    console.log('📡 [Dashboard] Activating live Context subscription for Start/end...');
    activateSubscription();
  }

  // if (!shouldBeActive && isSubscriptionActive) {
  //   console.log('📡 [Dashboard] Deactivating live Context subscription for Start/end...');
  //   deactivateSubscription();
  // }
}, [
  allShows.length,
  isSubscriptionActive,
  activateSubscription,
  deactivateSubscription
]);

// Refresh shows when lastStreamLiveAt or lastStreamEndedAt changes
useEffect(() => {
  if(lastStreamLiveAt || lastStreamEndedAt){
    fetchShowsFromStore(true).catch(err => console.log('Error refreshing shows:', err));
  }
}, [lastStreamLiveAt, lastStreamEndedAt])

useEffect(
  () => {
    // Screen is focused - setup subscriptions
    if (allShows.length === 0) return;

    // const CLIENT_ID = '6997e0c5ca9c15eff99a6894';
    
    // // Track all channels and subscriptions for proper cleanup
    // let globalChannel = null;
    // let globalSubscription = null;
    
    // Use maps to track multiple registration channels
    const registrationChannels = new Map();
    const registrationSubscriptions = new Map();

    const setupAppSyncSubscriptions = async () => {
      try {
        console.log('🔌 [Dashboard AppSync] Setting up subscriptions for registercount');
        
        // Configure AppSync once
        await configureAppSync();

        // ✅ OPTIMIZED: Connect to global channel ONCE (not in a loop)
        // const globalChannelPath = getGlobalChannelPath(CLIENT_ID, false);
        // console.log(`📡 [Dashboard AppSync] Connecting to global channel: ${globalChannelPath}`);

        // globalChannel = await connectToChannel(globalChannelPath);

        // // Subscribe to global channel for stream events
        // globalSubscription = subscribeToChannel(
        //   globalChannel,
        //   (data) => {
        //     console.log('📨 [Dashboard AppSync] Global event received:', data);
        //     try {
        //       const eventData = data?.event?.event || data?.event || data;

        //       if (!eventData || !eventData.eventType) {
        //         console.warn('⚠️ [Dashboard AppSync] Invalid event structure:', data);
        //         return;
        //       }

        //       console.log(`📨 [Dashboard AppSync] Processing ${eventData.eventType}`);

        //       // Handle stream:live event
        //       if (eventData.eventType === 'stream:live') {
        //         console.log('🎬 [Dashboard AppSync] Stream started:', eventData.streamId);
        //         fetchShowsFromStore(true).catch(err => console.log('Error refreshing shows:', err));
        //       }
        //       // Handle stream:ended event
        //       else if (eventData.eventType === 'stream:ended') {
        //         console.log('🛑 [Dashboard AppSync] Stream ended:', eventData.streamId);
        //         setTimeout(() => {
        //           fetchShowsFromStore(true).catch(err => console.log('Error refreshing shows:', err));
        //         }, 2000);
        //       }
        //     } catch (error) {
        //       console.error('❌ [Dashboard AppSync] Error processing event:', error);
        //     }
        //   },
        //   (error) => {
        //     console.error('❌ [Dashboard AppSync] Global subscription error:', error);
        //   }
        // );

        // Subscribe to registration channels for each show
        for (const show of allShows) {
          try {
            const registrationChannelPath = getRegistrationChannelPath(show._id);
            const channel = await connectToChannel(registrationChannelPath);
            
            // Store channel in map
            registrationChannels.set(show._id, channel);

            const subscription = subscribeToChannel(
              channel,
              (data) => {
                try {
                  const eventData = data?.event?.event || data?.event || data;
                  if (!eventData || !eventData.eventType) return;

                  if (eventData.eventType === 'registration:count-update') {
                    console.log(`🔔 Registration count updated for show ${show._id}:`, eventData.registrationCount);
                    updateShowInStore(show._id, {
                      registrationCount: eventData.registrationCount
                    });
                  }
                } catch (error) {
                  console.error(`Error processing registration event for ${show._id}:`, error);
                }
              },
              (error) => console.error(`Registration error for ${show._id}:`, error)
            );

            // Store subscription in map
            registrationSubscriptions.set(show._id, subscription);
            
          } catch (error) {
            console.error(`Failed to setup registration for ${show._id}:`, error);
          }
        }

        console.log(`✅ [Dashboard AppSync] Subscribed to global channel and ${registrationChannels.size} registration channels`);
      } catch (error) {
        console.error('❌ [Dashboard AppSync] Failed to setup subscriptions:', error);
      }
    };

    setupAppSyncSubscriptions();

    // Cleanup when screen loses focus
    return () => {
      console.log('🧹 [Dashboard AppSync] Cleaning up subscriptions');
      
      // Cleanup global subscription and channel
      // try {
      //   if (globalSubscription && typeof globalSubscription.unsubscribe === 'function') {
      //     globalSubscription.unsubscribe();
      //   }
      //   if (globalChannel) {
      //     closeChannel(globalChannel);
      //   }
      // } catch (error) {
      //   console.error('Error cleaning up global channel:', error);
      // }
      
      // Cleanup all registration subscriptions and channels
      registrationSubscriptions.forEach((subscription, showId) => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
        } catch (error) {
          console.error(`Error unsubscribing registration for ${showId}:`, error);
        }
      });
      
      registrationChannels.forEach((channel, showId) => {
        try {
          closeChannel(channel);
        } catch (error) {
          console.error(`Error closing registration channel for ${showId}:`, error);
        }
      });
      
      // Clear maps
      registrationSubscriptions.clear();
      registrationChannels.clear();
      
      console.log('✅ [Dashboard AppSync] Cleanup complete');
    };
  }, [allShows.length, fetchShowsFromStore, updateShowInStore])


  const [topStores, setTopStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [hasMoreStores, setHasMoreStores] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(6); // you can adjust page size

  const fetchSellersByCity = useCallback(
    async (city = 'chennai', pageNum = 1) => {
      if (!city) return;

      setLoadingStores(true);
      try {
        const { data: resData } = await api.get('/seller-cities/sellers/city', {
          params: {
            city: encodeURIComponent(city),
            page: pageNum,
            limit,
          },
        });

        const sellers = Array.isArray(resData?.data)
          ? resData.data.filter(u => u?._id !== user?._id)
          : [];

        if (isMounted.current) {
          if (pageNum === 1) {
            setTopStores(sellers); // reset for first page
          } else {
            setTopStores(prev => [...prev, ...sellers]); // append for next page
          }

          // Update hasMoreStores based on the response
          // If we received fewer items than the limit, there are no more stores
          setHasMoreStores(sellers.length >= limit);
        }
      } catch (error) {
        console.log(
          'Fetch sellers error:',
          error?.response?.data || error?.message,
        );
        if (isMounted.current) {
          // ToastAndroid.show('Failed to load content', ToastAndroid.SHORT);
        }
      } finally {
        if (isMounted.current) {
          setLoadingStores(false);
        }
      }
    },
    [user?._id, limit],
  );

  const [loadingCities, setLoadingCities] = useState(false);
  const fetchTopSellerCities = async () => {
    try {
      setLoadingCities(true);
      const response = await api.get('seller-cities/cities/top');

      // console.log('Top seller cities response:', response?.data);
      if (response?.data?.status) {
        // console.log(response?.data?.data); // list of cities with sellerCount
        setCities(response?.data?.data || []);
      } else {
        console.warn(
          '⚠️Top seller cities API responded with failure:',
          response?.data?.message,
        );
        setCities([]);
      }
    } catch (error) {
      console.error('❌ Error fetching top seller cities:', error.message);
    } finally {
      setLoadingCities(false);
    }
  };

  // Rendering recommended product items
  const renderRecommendedItem = ({ item, index }) => {
    if (!item) return null; // avoid crashing on bad data
    const price = item?.productPrice;
    const mrp = item?.MRP;
    const hasDiscount = mrp != null && price != null && mrp > price;
    const discountPercent = hasDiscount
      ? Math.round(((mrp - price) / mrp) * 100)
      : 0;
    // console.log(mrp,price)

    // console.log(item)

    // Check if the item is currently in the wishlist and if it's loading
    const isInWishlist = item?.isInWishlist; //wishlistItems.has(item._id);
    const isLoading = wishlistLoading.has(item._id);

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.trendingItem}
        onPress={() => navigateToProductDetails(item._id)}>
        <Text style={styles.trendingRank}>#{index + 1 || 'N/A'}</Text>

        <Image
          source={{
            uri: item?.images?.[0]?.key
              ? `${AWS_CDN_URL}${item?.images[0].key}`
              : undefined,
          }}
          style={styles.trendingImage}
          //  onError={(e) => { e.nativeEvent.target.src = PLACEHOLDER_IMAGE; }}
          resizeMode="cover"
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.trendingTitle}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item?.title || 'No Title Provided'}
          </Text>
          {/* <Text style={styles.trendingMeta}>
            {item?.category }
          </Text> */}
        </View>
        <View>
          <Text style={styles.trendingPrice}>
            {formatCurrency(item?.productPrice)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const [selectedIndex, setSelectedIndex] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Use useFocusEffect to properly handle animation lifecycle when screen gains/loses focus
  useFocusEffect(
    useCallback(() => {
      // 🔋 Skip animation in low power mode - save battery
      if (isLowPowerMode) {
        pulseAnim.setValue(0.5); // Set to mid-value for static appearance
        return;
      }

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000, // half of 2s
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();

      // Cleanup function to stop animation when screen loses focus (navigating away)
      return () => {
        animation.stop();
        pulseAnim.stopAnimation();
        console.log('Cleaning up category animation');
      };
    }, [pulseAnim, isLowPowerMode])
  );

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,0,64,0.1)', 'rgba(255,0,64,0.2)'],
  });

  // const renderCategoriesBreadcrumb = () => {
  //   return (
  //     <View style={styles.Breadcrumbcontainer}>
  //       {/* <Text style={styles.heading}>Categories</Text> */}
  //       <ScrollView
  //         horizontal
  //         showsHorizontalScrollIndicator={false}
  //         contentContainerStyle={styles.scrollContainer}>
  //         {breadCrumbCategories.map((item, index) => {
  //           const isSelected = selectedIndex === index;
  //           return (
  //             <Animated.View
  //               key={index}
  //               style={[
  //                 styles.categoryItem,
  //                 isSelected && styles.selectedCategoryItem,
  //                 index === 1 && {
  //                   backgroundColor,
  //                   borderColor: 'rgba(255,0,64,0.2)',
  //                   borderWidth: 1,
  //                 },
  //               ]}>
  //               <TouchableOpacity
  //                 key={index}
  //                 // style={[
  //                 //   styles.categoryItem,
  //                 //   isSelected && styles.selectedCategoryItem,
  //                 // ]}
  //                 onPress={() => setSelectedIndex(index)}>
  //                 <Text
  //                   style={[
  //                     styles.categoryLabel,
  //                     isSelected && styles.selectedCategoryLabel,
  //                   ]}>
  //                   {item?.label}
  //                 </Text>
  //               </TouchableOpacity>
  //             </Animated.View>
  //           );
  //         })}
  //       </ScrollView>
  //     </View>
  //   );
  // };

  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
  
  // Scroll indicator states
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(true);
  const scrollViewRef = useRef(null);

  const handleCategoryPress = useCallback((item, index) => {
    setSelectedFilterIndex(index);

    // Global filter behavior - navigate to GlobalSearch
    if (item.value === 'all') {
      // Navigate to products without category filter
      navigateToShowsTab();
    } else if (item.value === 'Live') {
      // Navigate to shows tab
      navigateToShowsTab();
    } else {
      // Navigate with specific category filter
      navigateToCategory(item.value, 'shows');
    }
  }, [navigation]);

  // Handle scroll event to show/hide indicators
  const handleScroll = useCallback((event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;

    // Show left indicator if scrolled right
    setShowLeftIndicator(scrollX > 10);
    
    // Show right indicator if not at the end
    setShowRightIndicator(scrollX < maxScrollX - 10);
  }, []);

  // Clone component with global filter functionality
  const renderCategoriesBreadcrumbWithGlobalFilter = () => {
    return (
      <View style={styles.Breadcrumbcontainer}>
        {/* Left Scroll Indicator */}
        {showLeftIndicator && (
          <LinearGradient
            colors={['rgba(30,30,30,0.95)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scrollIndicatorLeft}
            pointerEvents="none">
            <MaterialIcons name="chevron-left" size={24} color="#FFD700" />
          </LinearGradient>
        )}

        {/* Right Scroll Indicator */}
        {showRightIndicator && (
          <LinearGradient
            colors={['transparent', 'rgba(30,30,30,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scrollIndicatorRight}
            pointerEvents="none">
            <MaterialIcons name="chevron-right" size={24} color="#FFD700" />
          </LinearGradient>
        )}

        <FlatList
          ref={scrollViewRef}
          data={breadCrumbCategories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item.value || index.toString()}
          contentContainerStyle={styles.scrollContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            const isSelected = selectedFilterIndex === index;
            return (
              <Animated.View
                style={[
                  styles.categoryItem,
                  isSelected && styles.selectedCategoryItem,
                  index === 1 && {
                    backgroundColor,
                    borderColor: 'rgba(255,0,64,0.2)',
                    borderWidth: 1,
                  },
                ]}>
                <TouchableOpacity
                  onPress={() => handleCategoryPress(item, index)}>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.selectedCategoryLabel,
                    ]}>
                    {item?.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 90,
            offset: 90 * index,
            index,
          })}
        />
      </View>
    );
  };

  const [isTopSellersFullScreen, setTopSellersFullScreen] = useState(false);

  const renderSeller = ({ item }) => {
    const userInitials = getUserInitials(item?.userName);
    return (
      <View style={styles.sellerCard}>
        <View style={styles.leftSection}>
          {/* <Image source={{  uri: `${AWS_CDN_URL}${item?.profileURL}`}} 
        style={styles.avatar}  defaultSource={{uri:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg'}}/> */}
          <View style={styles.avatar}>
            {item?.profileURL ? (
              <Image
                source={{ uri: `${AWS_CDN_URL}${item?.profileURL}` }}
                style={styles.avatar}
                defaultSource={{
                  uri: 'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg',
                }}
                onError={() => {
                  // Fallback to initials if image fails to load
                }}
              />
            ) : null}

            {!item?.profileURL && userInitials ? (
              <View style={styles.initialsFallback}>
                <Text style={styles.initialsText}>{userInitials}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.reviews}>
                {item?.reviews || '0'}
                {'\u00A0'}reviews
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.followBtn}
          onPress={() => navigateToSellerProfile(item?.userName)}>
          <Text style={styles.followText}>View</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderUsers = ({ item }) => {
    const userInitials = getUserInitials(item?.userName);
    return (
      <View style={styles.sellerCard}>
        <View style={styles.leftSection}>
          {/* <Image source={{  uri: `${AWS_CDN_URL}${item?.profileURL}`}} 
        style={styles.avatar}  defaultSource={{uri:'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg'}}/> */}
          <View style={styles.avatar}>
            {item?.profileURL ? (
              <Image
                source={{ uri: `${AWS_CDN_URL}${item?.profileURL}` }}
                style={styles.avatar}
                defaultSource={{
                  uri: 'https://st4.depositphotos.com/15648834/23779/v/450/depositphotos_237795804-stock-illustration-unknown-person-silhouette-profile-picture.jpg',
                }}
                onError={() => {
                  // Fallback to initials if image fails to load
                }}
              />
            ) : null}

            {!item?.profileURL && userInitials ? (
              <View style={styles.initialsFallback}>
                <Text style={styles.initialsText}>{userInitials}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {/* <View style={styles.ratingRow}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.reviews}>{item?.reviews || '0'}{'\u00A0'}reviews</Text>
            </View> */}
          </View>
        </View>
        <TouchableOpacity
          style={styles.followBtn}
          onPress={() => navigateToSellerProfile(item?.userName)}>
          <Text style={styles.followText}>View</Text>
        </TouchableOpacity>
      </View>
    );
  };

  //Live Banner Component
  const PremiumLiveBanner = React.memo(({ item }) => {
    const navigation = useNavigation();
    const [showOverlay, setShowOverlay] = useState(false);

    const [isRegistered, setIsRegistered] = useState(item?.isRegistered);
    const [isRegistering, setIsRegistering] = useState(false);
    const [localRegistrationCount, setLocalRegistrationCount] = useState(item?.registrationCount || 0);

    // Check if current user is the show owner
    const isOwnShow = useMemo(() => {
      if (!user || !item) return false;
      // Check multiple possible seller ID fields
      return user._id === item.sellerId || 
             user._id === item.hostId || 
             user.userName === item.sellerUserName;
    }, [user, item]);

    const handleRegister = async () => {
      if (isRegistering) return;

      // Prevent sellers from registering to their own shows
      if (isOwnShow) {
        ToastAndroid.show(
          'You cannot register for your own show',
          ToastAndroid.SHORT,
        );
        return;
      }

      setIsRegistering(true);

      // Optimistic update - increment count immediately
      setLocalRegistrationCount(prev => prev + 1);
      setIsRegistered(true);

      try {
        const response = await api.post(`register-show/${item?._id}/register`);
        if (response.data.status) {
          // Update Zustand store for persistence
          updateShowInStore(item._id, {
            registrationCount: (item.registrationCount || 0) + 1,
            isRegistered: true
          });
          
          // ✅ Emit registration event for cross-screen updates
          RegisterEventEmitter.emitShowRegistered({
            showId: item._id,
            userId: user?._id,
            registeredAt: new Date().toISOString(),
            newCount: (item.registrationCount || 0) + 1
          });
          
          ToastAndroid.show('Successfully registered!', ToastAndroid.SHORT);
        } else {
          // Revert optimistic update on failure
          setLocalRegistrationCount(prev => prev - 1);
          setIsRegistered(false);
          ToastAndroid.show(
            response.data.message || 'Registration failed',
            ToastAndroid.LONG,
          );
        }
      } catch (error) {
        console.warn('Registration error:', error);
        if (
          error.response?.status === 400 &&
          error.response.data?.message?.includes('already registered')
        ) {
          // Already registered is success, keep the optimistic update
          updateShowInStore(item._id, { isRegistered: true });
          
          // ✅ Emit registration event even for "already registered" case
          RegisterEventEmitter.emitShowRegistered({
            showId: item._id,
            userId: user?._id,
            registeredAt: new Date().toISOString(),
            newCount: item.registrationCount || 0
          });
          
          ToastAndroid.show('Already registered.', ToastAndroid.SHORT);
        } else {
          // Revert optimistic update on error
          setLocalRegistrationCount(prev => prev - 1);
          setIsRegistered(false);
          ToastAndroid.show(
            'An error occurred during registration.',
            ToastAndroid.LONG,
          );
        }
      } finally {
        setIsRegistering(false);
        setTimeout(() => setShowOverlay(false), 1500);
      }
    };
    // console.log(item)
    // ✅ Fixed: Use consistent variable names
    // const scaleAnim = useRef(new Animated.Value(1)).current;
    // const opacityAnim = useRef(new Animated.Value(1)).current;

    // useEffect(() => {
    //   let animationRef = null; // ✅ Store animation reference for cleanup

    //   // 🔋 Skip animation in low power mode - save battery
    //   if (isLowPowerMode || !item?.isLive) {
    //     if (isLowPowerMode && item?.isLive) {
    //      // console.log('🔋 [LiveCard] Low Power Mode - Disabling LIVE badge animation');
    //     }
    //     scaleAnim.stopAnimation();
    //     opacityAnim.stopAnimation();
    //     scaleAnim.setValue(1);
    //     opacityAnim.setValue(1);
    //     return;
    //   }

    //   if (item?.isLive) {
    //     animationRef = Animated.loop(
    //       Animated.parallel([
    //         Animated.sequence([
    //           Animated.timing(scaleAnim, {
    //             toValue: 1.2, //animate size
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //           Animated.timing(scaleAnim, {
    //             toValue: 1,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //         ]),
    //         Animated.sequence([
    //           Animated.timing(opacityAnim, {
    //             toValue: 0.4,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //           Animated.timing(opacityAnim, {
    //             toValue: 1,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //         ]),
    //       ]),
    //     );
    //     animationRef.start();
    //   }

    //   // ✅ Cleanup function to prevent memory leaks
    //   return () => {
    //     if (animationRef) {
    //       animationRef.stop();
    //     }
    //     scaleAnim.stopAnimation();
    //     opacityAnim.stopAnimation();
    //   };
    // }, [item?.isLive, isLowPowerMode]); // ✅ Add isLowPowerMode dependency

    //  useEffect(() => {
    //   let timer;
    //   if (showOverlay) {
    //     timer = setTimeout(() => {
    //       setShowOverlay(false);
    //     }, 3000); // autoclose after 3 seconds
    //   }
    //   return () => clearTimeout(timer);
    // }, [showOverlay]);

    return (
      <View style={[styles.liveCard1, { position: 'relative', marginBottom: 0 }]}>
        <TouchableOpacity
          onPress={() => {
            if (item?.isLive) {
              navigateToLiveScreen(item);
            } else {
              ToastAndroid.show(
                'This show is not live yet',
                ToastAndroid.SHORT,
              );
              // setShowOverlay(true);

              //commented
              // navigation.navigate('UpcomingShowDetail', {
              //   id: item._id,
              //   hostId: item.hostId,
              // });
              navigateToLiveScreen(item);
            }
          }}
        // onLongPress={() => { setShowOverlay(true) }}
        >
          <FastImage
            source={{ 
              uri: `${AWS_CDN_URL}${item?.thumbnailImage}`,
              priority: FastImage.priority.high,
            }}
            style={styles.liveImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View
            style={[
              styles.liveBadge1,
              !item?.isLive
                ? { backgroundColor: colors.primaryButtonColor }
                : null,
            ]}>
            {item?.isLive && (
              <Animated.View
                style={[
                  styles.dotLive1,
                 // item?.isLive && { transform: [{ scale: scaleAnim }] },
                ]}
              />
            )}
            <Text
              style={[styles.liveBadgeText1, !item?.isLive && { color: '#000' }]}>
              {item?.isLive ? 'LIVE' : 'UPCOMING'}
            </Text>
          </View>

          {!item?.isLive && item?.registrationCount > 0 &&(
            <View style={[styles.liveViewers, { top: 30 }]}>
              <Ionicons name="people" size={10} color="#fff" />
              <Text style={styles.liveViewersText}>{formatFollowerCount(localRegistrationCount)}</Text>
            </View>)
          }

          {
          item?.isLive && viewerCounts[item?._id] > 0
          && (
            <View style={[styles.liveViewers, { top: 30 }]}>
              <Ionicons name="people" size={10} color="#fff" />
              <Text style={styles.liveViewersText}>
                {viewerCounts[item?._id] ?? formatFollowerCount(viewerCounts[item?._id] || item?.viewerCount) ?? 0}
              </Text>
            </View>)
          }

          <TouchableOpacity
            onPress={() => navigateToProfileWithOwnershipCheck(item?.sellerUserName, 'Premium Live Banner')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              position: 'absolute',
              top: 6,
              left: 6,
            }}>
            <FastImage
              source={{
                uri: item?.sellerProfileURL
                  ? `${AWS_CDN_URL}${item?.sellerProfileURL}`
                  : undefined,
                priority: FastImage.priority.normal,
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#ffcc00',
                alignSelf: 'flex-start',
                backgroundColor: '#000',
              }}
            />
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                textShadowColor: 'rgba(0, 0, 0, 0.75)', // shadow color
                textShadowOffset: { width: 1, height: 1 }, // x & y offset
                textShadowRadius: 2, // blur radius
              }}
              numberOfLines={1}
              ellipsizeMode="tail">
              {item?.sellerUserName || 'Anonymous user'}
            </Text>
          </TouchableOpacity>

          {/* <View style={styles.liveViewers1}>
          <Ionicons name="people" size={10} color="#fff" />
          <Text style={styles.liveViewersText1}>{item?.viewerCount}</Text>
        </View> */}
          <View style={styles.liveInfoGrad1}>
            <View style={{ flex: 1, marginRight: 20 }}>
              <Text
                style={styles.liveSeller1}
                numberOfLines={1}
                ellipsizeMode="tail">
                {item.title}
              </Text>
              <Text style={styles.liveProduct1}>
                {formatTimeDayForDisplay(item.scheduledAt)}
              </Text>
            </View>
            {item?.isLive ? (
              <TouchableOpacity
                style={[styles.remindBtn]}
                onPress={() =>
                  //{}
                  navigateToLiveScreen(item)
                }>
                {<Text style={[styles.remindText]}>JOIN LIVE</Text>}
              </TouchableOpacity>
            ) : isOwnShow ? (
              <TouchableOpacity
                style={[
                  styles.remindBtn,
                  { backgroundColor: '#444', borderColor: '#666' },
                ]}
                disabled={true}>
                <Text
                  style={[
                    styles.remindText,
                    { color: '#999' },
                  ]}>
                  Your Show
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.remindBtn,
                  isRegistered && styles.remindBtnActive,
                ]}
                onPress={() => handleRegister()}
                disabled={isRegistering || isRegistered}>
                {isRegistering ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text
                    style={[
                      styles.remindText,
                      isRegistered && styles.remindTextActive,
                    ]}>
                    {isRegistered ? 'Registered' : 'Register'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Overlay */}
        {showOverlay && !item?.isLive && (
          <TouchableWithoutFeedback onPress={() => setShowOverlay(false)}>
            <View style={styles.overlayWrapper}>
              <TouchableWithoutFeedback>
                <View style={styles.overlayCard}>
                  <TouchableOpacity
                    style={[
                      styles.calendarButton,
                      isRegistered && { backgroundColor: 'green' },
                    ]}
                    disabled={isRegistering || isRegistered}
                    onPress={() => {
                      handleRegister(); // Register for the show
                      // setShowOverlay(false);
                    }}>
                    {isRegistering ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : isRegistered ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Ionicons name="calendar" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    );
  });


  const LiveCard = React.memo(({ item }) => {
    // console.log('LiveCard item:', item);

    const navigation = useNavigation();

    const [showOverlay, setShowOverlay] = useState(false);

    const [isRegistered, setIsRegistered] = useState(item?.isRegistered);
    const [isRegistering, setIsRegistering] = useState(false);
    const [localRegistrationCount, setLocalRegistrationCount] = useState(item?.registrationCount || 0);

    // Check if current user is the show owner
    const isOwnShow = useMemo(() => {
      if (!user || !item) return false;
      // Check multiple possible seller ID fields
      return user._id === item.sellerId || 
             user._id === item.hostId || 
             user.userName === item.sellerUserName;
    }, [user, item]);

    const handleRegister = async () => {
      if (isRegistering) return;

      // Prevent sellers from registering to their own shows
      if (isOwnShow) {
        ToastAndroid.show(
          'You cannot register for your own show',
          ToastAndroid.SHORT,
        );
        return;
      }

      setIsRegistering(true);

      // Optimistic update - increment count immediately
      setLocalRegistrationCount(prev => prev + 1);
      setIsRegistered(true);

      try {
        const response = await api.post(`register-show/${item?._id}/register`);
        if (response.data.status) {
          // Update Zustand store for persistence
          updateShowInStore(item._id, {
            registrationCount: (item.registrationCount || 0) + 1,
            isRegistered: true
          });
          ToastAndroid.show('Successfully registered!', ToastAndroid.SHORT);
        } else {
          // Revert optimistic update on failure
          setLocalRegistrationCount(prev => prev - 1);
          setIsRegistered(false);
          ToastAndroid.show(
            response.data.message || 'Registration failed',
            ToastAndroid.LONG,
          );
        }
      } catch (error) {
        console.warn('Registration error:', error);
        if (
          error.response?.status === 400 &&
          error.response.data?.message?.includes('already registered')
        ) {
          // Already registered is success, keep the optimistic update
          updateShowInStore(item._id, { isRegistered: true });
          ToastAndroid.show('Already registered.', ToastAndroid.SHORT);
        } else {
          // Revert optimistic update on error
          setLocalRegistrationCount(prev => prev - 1);
          setIsRegistered(false);
          ToastAndroid.show(
            'An error occurred during registration.',
            ToastAndroid.LONG,
          );
        }
      } finally {
        setIsRegistering(false);
        setTimeout(() => setShowOverlay(false), 1500);
      }
    };

    // ✅ Fixed: Use consistent variable names
    // const scaleAnim = useRef(new Animated.Value(1)).current;
    // const opacityAnim = useRef(new Animated.Value(1)).current;

    // useEffect(() => {
    //   let animationRef = null; // ✅ Store animation reference for cleanup

    //   // 🔋 Skip animation in low power mode - save battery
    //   if (isLowPowerMode || !item?.isLive) {
    //     if (isLowPowerMode && item?.isLive) {
    //       //console.log('🔋 [LiveCard] Low Power Mode - Disabling LIVE badge animation');
    //     }
    //     scaleAnim.stopAnimation();
    //     opacityAnim.stopAnimation();
    //     scaleAnim.setValue(1);
    //     opacityAnim.setValue(1);
    //     return;
    //   }

    //   if (item?.isLive) {
    //     animationRef = Animated.loop(
    //       Animated.parallel([
    //         Animated.sequence([
    //           Animated.timing(scaleAnim, {
    //             toValue: 1.5, //animate size
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //           Animated.timing(scaleAnim, {
    //             toValue: 1,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //         ]),
    //         Animated.sequence([
    //           Animated.timing(opacityAnim, {
    //             toValue: 0.4,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //           Animated.timing(opacityAnim, {
    //             toValue: 1,
    //             duration: 700,
    //             useNativeDriver: true,
    //           }),
    //         ]),
    //       ]),
    //     );
    //     animationRef.start();
    //   }

    //   // ✅ Cleanup function to prevent memory leaks
    //   return () => {
    //     if (animationRef) {
    //       animationRef.stop();
    //     }
    //     scaleAnim.stopAnimation();
    //     opacityAnim.stopAnimation();
    //   };
    // }, [item?.isLive, isLowPowerMode]); // ✅ Add isLowPowerMode dependency

    //  useEffect(() => {
    //   let timer;
    //   if (showOverlay) {
    //     timer = setTimeout(() => {
    //       setShowOverlay(false);
    //     }, 3000); // autoclose after 3 seconds
    //   }
    //   return () => clearTimeout(timer);
    // }, [showOverlay]);

    return (
      <View style={[styles.liveCard, { position: 'relative' }]}>
        <TouchableOpacity
          onPress={() => {
            if (item?.isLive) {
              navigateToLiveScreen(item);
            } else {
              ToastAndroid.show(
                'This show is not live yet',
                ToastAndroid.SHORT,
              );
              // navigation.navigate('UpcomingShowDetail', {
              //   id: item._id,
              //   hostId: item.hostId,
              // });
              navigateToLiveScreen(item);

              // setShowOverlay(true);
            }
          }}
          onLongPress={() => {
            setShowOverlay(true); // ✅ overlay only on long press
          }}>
          <FastImage
            source={{ 
              uri: `${AWS_CDN_URL}${item?.thumbnailImage}`,
              priority: FastImage.priority.high,
            }}
            style={styles.liveImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View
            style={[
              styles.liveBadge,
              !item?.isLive && {
                backgroundColor: '#FFD700',
                borderColor: 'rgba(255,0,64,0.2)',
                borderWidth: 1,
              },
            ]}>
            {item?.isLive && (
              <Animated.View
                style={[
                  styles.dotLive,
                //  item?.isLive && { transform: [{ scale: scaleAnim }] },
                ]}
              />
            )}
            <Text
              style={[
                styles.liveBadgeText,
                { color: item?.isLive ? '#fff' : '#000' },
              ]}>
              {item?.isLive ? 'LIVE' : 'Upcoming'}
            </Text>
          </View>
          {item?.isLive && viewerCounts[item?._id] > 0 && (
        <View style={styles.liveViewers}>
          <Ionicons name="people" size={10} color="#fff" />
          <Text style={styles.liveViewersText}>
            {viewerCounts[item?._id] ?? formatFollowerCount(viewerCounts[item?._id] || item?.viewerCount) ?? 0}
          </Text>
        </View>)
        }

          {!item?.isLive && item?.registrationCount > 0 && (
            <View style={styles.liveViewers}>
              <Ionicons name="people" size={10} color="#fff" />
              <Text style={styles.liveViewersText}>{formatFollowerCount(localRegistrationCount)}</Text>
            </View>)
          }
          <View style={styles.liveInfoGrad}>
            <Text
              style={styles.liveSeller}
              numberOfLines={1}
              ellipsizeMode="tail">
              {item.title}
            </Text>
            {!item?.isLive && <Text style={styles.liveProduct}>
              {formatTimeDayForDisplay(item.scheduledAt)}
            </Text>}
          </View>
        </TouchableOpacity>

        {/* Overlay */}
        {showOverlay && !item?.isLive && !isOwnShow && (
          <TouchableWithoutFeedback onPress={() => setShowOverlay(false)}>
            <View style={styles.overlayWrapper}>
              <TouchableWithoutFeedback>
                <View style={styles.overlayCard}>
                  <TouchableOpacity
                    style={[
                      styles.calendarButton,
                      isRegistered && { backgroundColor: 'green' },
                    ]}
                    disabled={isRegistering || isRegistered}
                    onPress={() => {
                      handleRegister(); // Register for the show
                      // setShowOverlay(false);
                    }}>
                    {isRegistering ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : isRegistered ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Ionicons name="calendar" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    );
  });

  const renderTopSellers = useCallback(
    () => (
      <View style={{ marginBottom: 20 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{'Top Sellers'}</Text>
          {/* <View style={styles.dividerLine} /> */}
          <TouchableOpacity
            onPress={() =>
              navigateToUsersTab()
            }>
            <Text style={styles.seeAll}>
              {isTopSellersFullScreen ? 'Shrink' : 'View all'}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingSellers ? (
          <ActivityIndicator
            size="small"
            color="#F7CE45"
            style={{ marginVertical: 10 }}
          />
        ) : sellers.length === 0 ? (
          <Text style={styles.empty}>No sellers found.</Text>
        ) : (
          <FlatList
            data={sellers}
            renderItem={renderSeller}
            keyExtractor={item => item?._id}
            scrollEnabled={false}
          />
        )}
      </View>
    ),
    [sellers, renderSeller, isTopSellersFullScreen, setTopSellersFullScreen],
  );

  const fetchSellers = useCallback(async () => {
    setLoadingSellers(true);
    try {
      const { data: resData } = await api.get('/search/top-seller', {
        params: {
          page: 0,
          limit: 5,
        },
      });
      //  console.log('user data====',resData);
      // const sellers = resData?.data; //?.filter(user=>user?.role==='seller')
      const sellers = resData?.data.filter(u => u?._id !== user?._id);
      //   console.log('sellers==',sellers);
      setSellers(sellers);
    } catch (error) {
      console.log('Fetch users error:', error?.response?.data);
      if (isMounted.current) {
        ToastAndroid.show('Failed to load content', ToastAndroid.SHORT);
      }
    } finally {
      setLoadingSellers(false);
    }
  }, [user]);

  const fetchVideos = useCallback(async (selectedCategory = 'all') => {
    console.log('🎯 [Dashboard] Fetching videos................');
    try {
      if (isMounted.current) {
        const response = await api.get(`/shoppable-videos/`, {
          params: {
            limit: 90,
            page: 1,
          },
        });
        console.log('reels count===', response?.data?.data?.length);
        const publicReels = response?.data?.data?.filter(
          reel => reel.visibility === 'public',
        ) || [];

        const filteredReels =
          selectedCategory === 'all'
            ? publicReels
            : publicReels.filter(reel => reel.category === selectedCategory);

        setIsVideo(true);
        setVideos(filteredReels || []);
      }
    } catch (error) {
      console.log('Fetch videos error:', error.response.data);
      if (isMounted.current) {
        ToastAndroid.show('Failed to load content', ToastAndroid.SHORT);
      }
    } finally {
      setBreadCrumbVisible(true);
      if (isMounted.current) {
        setIsInitialLoad(false);
      }
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    try {
      setLoadingProducts(true);
      // loadingProducts(true);
      const response = await api.get('/search/products', {
        params: { limit: 4 },
      });
      setProducts(response?.data?.data || []);
      // console.log('Product data fetched:', response.data.data);
    } catch (error) {
      console.log('Error fetching Product data:', error);
    } finally {
      // setSimilarLoading(false);
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    // Call Zustand store's fetchShows method AND local fetchShows for videos/reels
    const loadInitialData = async () => {
      // console.log('🎯 [Dashboard] Starting initial data load...');
      try {
        // console.log('📡 [Dashboard] Fetching shows from Zustand store...');
        await fetchShowsFromStore(true); // reset to page 0 - populates allShows (live/upcoming)
        // console.log('✅ [Dashboard] Shows fetched from Zustand. Count:', allShows.length);
        
        // console.log('📡 [Dashboard] Fetching videos/reels, products, cities, sellers, users, and stores...');
        await Promise.all([
          fetchVideos(), // Fetch videos/reels for renderVideoSection
          fetchProduct(),
          fetchTopSellerCities(),
          fetchSellers(),
          fetchSellersByCity('chennai', 1) // Load top stores
        ]);
        console.log('✅ [Dashboard] All initial data fetched successfully');
      } catch (error) {
        console.error('❌ [Dashboard] Error loading initial data:', error);
      } finally {
        // console.log('🏁 [Dashboard] Setting isInitialLoad to false');
        setIsInitialLoad(false);
      }
    };
    
    loadInitialData();
  }, [fetchShowsFromStore, fetchVideos, fetchSellers, fetchSellersByCity]);

  const onRefresh = useCallback(async () => {
    console.log('Autorefresh on mount');
    setRefreshing(true);
    try {
      await Promise.all([
        refreshToCurrentPage(), //  refresh Zustand shows
        fetchVideos(breadCrumbCategories[selectedIndex]?.value || 'all'), // Refresh videos/reels
        fetchSellers(),
        fetchProduct(),
        refreshFlashSales(), // ✅ Trigger flash sale refresh
        exitAccessMode && exitAccessMode(),
      ]);
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshToCurrentPage, fetchVideos, fetchSellers, fetchProduct, refreshFlashSales, selectedIndex]);

  useEffect(() => {
    if (user?.sellerInfo?.approvalStatus === 'pending') {
      intervalRef.current = setInterval(() => {
        if (isMounted.current) {
          fetchuser();
        }
      }, 5000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, fetchuser]);

  //console.log('user', user)

  // Modal sequencing logic to prevent race conditions
  useEffect(() => {
    if (!user) return;

    // Priority 1: Profile Setup - Navigate to screen instead of modal
    if (!user.userName || !user.name || user?.onboardingStatus !== 'completed') {
      navigateToProfileSetup();
      return;
    }

    // Priority 2: Mobile Verification (only if profile is complete)
    if (!user?.isMobileVerified) {
      setMobileVerificationModalVisible(true);
    }

    // Priority 3: Category Selection (only if profile and mobile verification are complete)
    if (!user.categories || user.categories.length === 0) {
      setCategoryModalVisible(true);
      return;
    }

  }, [user, navigation]);

  //console.log('user =========', user);

  // ✅ Listen for stream ended events from LiveScreen (Legacy code)
  // useEffect(() => {
  //   const subscription = StreamEventEmitter.onStreamEnded((payload) => {
  //     // console.log('📡 [Dashboard] Received stream ended event:', payload.streamId);

  //     // Optionally refresh shows via Zustand
  //     //fetchShowsFromStore(true).catch(err => console.log('Error refreshing shows:', err));

  //     refreshToCurrentPage() //  refresh Zustand shows
  //   });

  //   return () => {
  //     subscription.remove();
  //   };
  // }, [refreshToCurrentPage]);

  // ✅ Listen for show registration events
  // useEffect(() => {
  //   const subscription = RegisterEventEmitter.onShowRegistered((payload) => {
  //     // console.log('📡 [Dashboard] Received show registration event:', payload.showId);
      
  //     // Update the specific show's registration count using Zustand
  //     updateShowInStore(payload.showId, {
  //       registrationCount: payload.newCount,
  //       isRegistered: true
  //     });
      
  //     // console.log('✅ [Dashboard] Updated registration count via Zustand for show:', payload.showId);
  //   });

  //   return () => {
  //     subscription.remove();
  //   };
  // }, [updateShowInStore]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);


  // const handleGlobalFilterCategoryPress = useCallback((item, index) => {
  //   setSelectedFilterIndex(index);

  //   // Global filter behavior - navigate to GlobalSearch
  //   if (item.value !== 'all' && item.value !== 'Live') {
  //     navigation.navigate('GlobalSearch', {
  //       categories: item.value,
  //       tabName: 'products',
  //     });
  //   } else if (item.value === 'Live') {
  //     navigation.navigate('GlobalSearch', {
  //       tabName: 'shows',
  //     });
  //   }
  // }, [navigation]);

  const renderCard = useCallback(
    ({ item }) => {
      if (!item) return null;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('LiveScreen', { stream: item })}>
          <Image
            source={{
              uri: `${AWS_CDN_URL}${item?.thumbnailImage}`,
            }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={e => console.log('Image load error:', e.nativeEvent.error)}
          />
          <View style={styles.overlayCard}>
            <View style={styles.cardOverlay}>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.title || 'No title'}
              </Text>
              <TouchableOpacity
                style={styles.sellerInfo}
                onPress={() =>
                  navigation.navigate('ViewSellerProdile', {
                    id: item?.sellerUserName,
                  })
                }>
                {item?.sellerProfileURL ? (
                  <FastImage
                    source={{
                      uri: `${AWS_CDN_URL}${item?.sellerProfileURL}`,
                    }}
                    style={styles.sellerImage}
                    onError={e =>
                      console.log('Profile image error:', e.nativeEvent.error)
                    }
                  />
                ) : (
                  <View style={styles.sellerInitial}>
                    <Text style={styles.sellerInitialText}>
                      {item?.sellerUserName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <Text style={styles.sellerName} numberOfLines={1}>
                  {item?.sellerUserName || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.liveInfoContainer}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <View style={styles.viewerCount}>
              <View style={styles.viewerIcon}>
                <MaterialIcons name="group" size={14} color="white" />
              </View>
              <Text style={styles.viewerText}>
                {formatFollowerCount(item.views) || 0}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation, formatFollowerCount],
  );


  // For shoppable video
  const renderClipItem = useCallback(
    ({ item }) => {
      if (!item) return null;

      return (
        <TouchableOpacity
          style={[
            styles.card,
            //  isExclusiveFullScreen && {width: ITEM_WIDTH_COLUMN, height: 'auto'},
          ]}
          onPress={() => navigateToReel(item._id)}>
          <Image
            source={
              item?.thumbnailBlobName
                ? { uri: `${AWS_CDN_URL}${item?.thumbnailBlobName}` }
                : undefined
            }
            style={styles.cardImage}
            resizeMode="cover"
            onError={e => console.log('Clip image error:', e.nativeEvent.error)}
          />
          <View style={styles.videoIcon}>
            <Image
              source={{uri:shopVideo}}
              style={styles.videoIconImage}
              onError={e =>
                console.log('Video icon error:', e.nativeEvent.error)
              }
            />
          </View>
          {/* Views count */}
          {/* <View style={styles.videoStats}>

           <Ionicons name="play" size={10} color="#fff" />
            <Text style={[styles.viewsText, { marginLeft: 4 }]} numberOfLines={1}>
              {formatFollowerCount(item.viewCount) || 0 }  views
            </Text>

          </View> */}

          <TouchableOpacity 
            onPress={() => navigateToProfileWithOwnershipCheck(item?.host?.userInfo?.userName, 'Shoppable Videos')} 
            style={[styles.bottomInfo, { gap: 10 }]}>
            {item?.host?.userInfo?.profileURL?.key ? (<Image
              source={{
                uri: item?.host?.userInfo?.profileURL.key
                  ? `${AWS_CDN_URL}${item?.host?.userInfo?.profileURL.key}`
                  : undefined
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#ffcc00',
                alignSelf: 'flex-start',
              }}
            />) : (
              <FIcon
                name="user-circle"
                size={24}
                color="#808080" // default gray
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  borderWidth: 1,
                  paddingLeft: 1,
                  paddingTop: 1,
                  backgroundColor: '#fff',
                  borderColor: "#ffcc00", // golden border
                }}
              />
            )
            }
            <Text style={styles.viewsText}>
              {/* {console.log(item?.host?.userInfo)} */}
              {item?.host?.companyName
                ? (() => {
                  const firstWord = item.host.companyName.split(" ")[0];
                  return firstWord.length > 10 ? firstWord.slice(0, 10) + "..." : firstWord;
                })()
                : "N/A"}
            </Text>
          </TouchableOpacity>

        </TouchableOpacity>
      );
    },
    [navigation, formatFollowerCount, isExclusiveFullScreen, user, navigateToSellerProfile],
  );

  const renderVideoSection = useCallback(
    () => (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {!isVideo ? 'Exclusive Events' : '📹 Shoppable Videos'}
          </Text>
          {/* <View style={styles.dividerLine} /> */}
          <TouchableOpacity
            onPress={() =>
              navigateToVideosTab()
              //setExclusiveFullScreen(!isExclusiveFullScreen)
            }>
            <Text style={styles.seeAll}>
              {isExclusiveFullScreen ? 'View all →' : 'Shrink'}
            </Text>
          </TouchableOpacity>
        </View>

        {isExclusiveFullScreen ? (
          <FlatList
            data={videos.slice(0, 4)}
            numColumns={2}
            key="exclusive-grid"
            keyExtractor={(item, index) => `exclusive-${item._id || index}`}
            renderItem={isVideo ? renderClipItem : renderCard}
            contentContainerStyle={styles.twoColumnContainer}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            style={{ width: '97%', alignSelf: 'center' }}
            removeClippedSubviews={true}
            scrollEnabled
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 250,
              offset: 250 * index,
              index,
            })}
          />
        ) : (
          <FlatList
            data={videos}
            horizontal
            key="exclusive-horizontal"
            keyExtractor={(item, index) => `exclusive-h-${item._id || index}`}
            renderItem={isVideo ? renderClipItem : renderCard}
            contentContainerStyle={styles.cardContainer}
            removeClippedSubviews={true}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    ),
    [videos, isVideo, isExclusiveFullScreen, renderClipItem, renderCard],
  );

   useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If we're at the root of the tab, implement double-tap to exit
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

          // Reset after 2 seconds using ref to persist across renders
          backPressTimeoutRef.current = setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);

          return true; // prevent default behavior
        }

        // Second press within 2 seconds - exit app immediately
        if (backPressTimeoutRef.current) {
          clearTimeout(backPressTimeoutRef.current);
          backPressTimeoutRef.current = null;
        }
        backPressCount.current = 0; // Reset before exiting
        BackHandler.exitApp()
        manualcrass
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
        if (backPressTimeoutRef.current) {
          clearTimeout(backPressTimeoutRef.current);
          backPressTimeoutRef.current = null;
        }
        // Reset count when screen loses focus to avoid stale state
        backPressCount.current = 0;
      };
    }, []),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'notificationNavigation',
      data => {
        console.log(data);
        if (data.screen === 'Comment') {
          // Navigate to Comment screen
          navigation.navigate('Comment', {
            // Pass any additional data from the notification
            ...data,
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const SectionHeader = ({
    title,
    right = 'See all →',
    leftIcon,
    liveCount,
    onPressRight,
  }: {
    title: string;
    right?: string;
    leftIcon?: React.ReactNode;
    liveCount?: number;
    onPressRight?: () => void;
  }) => (
    <View style={styles.sectionHeader1}>
      <View style={styles.sectionTitleWrap}>
        {leftIcon}
        <Text style={styles.sectionTitleText}>{title}</Text>
        {/* {typeof liveCount === 'number' && <LiveCount value={liveCount} />} */}
      </View>
      <TouchableOpacity onPress={onPressRight}>
        <Text style={styles.seeMore}>{right}</Text>
      </TouchableOpacity>
    </View>
  );

  const ListHeaderComponent = useCallback(
    () => (
      <View>
        {/* <Header navigation={navigation} /> */}

        {/* <Marquee isFocused={isFocused} /> */}

        {/* <Marquee/> */}

        {/* <TextTicker
      style={{ fontSize: 24, color: "white", backgroundColor: "black" }}
      duration={10000}
      loop
      bounce={false}
      repeatSpacer={50}
      marqueeDelay={1000}
    >
      📢 This is a React Native ticker example using react-native-text-ticker 🚀
    </TextTicker> */}

        {/* {isMounted && breadCrumbVisible && renderCategoriesBreadcrumb()} */}

        {/* {isMounted && renderCategoriesBreadcrumbWithGlobalFilter()} */}

        {(upcomingShows?.length > 0 || liveShows?.length > 0) && (
          <View style={[styles.section, {paddingTop: 0,marginTop: 5}]}>
            {upcomingShows?.length === 0 && liveShows?.length === 0 ? (
              <Text style={styles.emptyText}>No Premium shows</Text>
            ) : (
              <FlatList
                data={
                  liveShows?.length > 0
                    ?
                    liveShows.slice(0, 1) // show first live show
                    : 
                    upcomingShows.slice(0, 1)    // fallback to first upcoming show
                }
                renderItem={({ item }) => (
                  <PremiumLiveBanner item={item} />
                )}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.liveGrid}
              />
            )}
          </View>
        )}

        {/* Live Now */}

        {filteredLiveShows.length > 0 && (
          <View style={[styles.section, { paddingTop: 5 }]}>
            <SectionHeader
              title="🔴 Live"
              leftIcon={null}
              //liveCount={2847}
              onPressRight={() => navigateToGlobalSearch()}
            />

            {filteredLiveShows.length === 0 ? (
              <Text style={styles.emptyText}>No live shows</Text>
            ) : (
              <FlatList
                data={filteredLiveShows}
                renderItem={({ item }) => (
                  <LiveCard item={item} />
                )}
                keyExtractor={(item, index) => `live-${item._id}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 5 }}
                ListFooterComponent={() => (
                  hasMore && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => loadMoreShows()}
                      disabled={showsLoading}
                    >
                      {showsLoading ? (
                        <ActivityIndicator size="small" color="#F7CE45" />
                      ) : (
                        <>
                          <Icon name="chevron-double-right" size={20} color="#F7CE45" />
                          <Text style={styles.loadMoreText}>Load More</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                )}
              />
            )}
          </View>
        )}

        {/* Upcoming shows*/}
        

        {filteredUpcomingShows.length > 0 && (
          <View style={[styles.section, { paddingTop: 5 }]}>
            <SectionHeader
              title="🔴 Upcoming Live"
              leftIcon={null}
              //liveCount={2847}
              onPressRight={() => navigateToGlobalSearch()}
            />

            {filteredUpcomingShows.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming shows</Text>
            ) : (
              <FlatList
                data={filteredUpcomingShows}
                renderItem={({ item }) => (
                  <LiveCard item={item} />
                )}
                keyExtractor={(item, index) => `upcoming-${item._id}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 5 }}
                ListFooterComponent={() => (
                  hasMore && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => loadMoreShows()}
                      disabled={showsLoading}
                    >
                      {showsLoading ? (
                        <ActivityIndicator size="small" color="#F7CE45" />
                      ) : (
                        <>
                          <Icon name="chevron-double-right" size={20} color="#F7CE45" />
                          <Text style={styles.loadMoreText}>Load More</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                )}
              />
            )}
          </View>
        )}

        {/* Flash Banner */}
        {liveSales.length > 0 && (
          <LinearGradient
            colors={['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.flashBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flashTitle}>⚡ Flash Sale LIVE</Text>
              {/* <Text style={styles.flashTimer}>Ends in 23:45:12</Text> */}
              {liveSales[0]?.endTime ? (
                <Text style={styles.flashTimer}>
                  Ends in {days > 0 ? `${days}d ` : ''}
                  {String(hours).padStart(2, '0')}h{` `}:
                  {String(minutes).padStart(2, '0')}m
                  {/* {String(seconds).padStart(2, "0")} s */}
                </Text>
              ) : (
                <Text style={styles.flashTimer}>Ends soon</Text>
              )}
            </View>
            {/* <TouchableOpacity style={styles.flashCta}>
              <Text style={styles.flashCtaText}>Shop Now</Text>
            </TouchableOpacity> */}
            <FastImage source={{ uri: SaleGif }} style={{ width: 80, height: 40 }} />
          </LinearGradient>
        )}

        {/* Flash Grid */}
        {liveSales.length > 0 && (
          <FlatList
            data={liveSales}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item?._id || index.toString()}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <FlashGrid
                navigation={navigation}
                sale={item}
                isLoading={isLoading && liveSales.length === 0}
              />
            )}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}

        {/* Upcoming Flash Sales Header */}
        {upcomingSales.length > 0 && (
          <LinearGradient
            colors={['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.flashBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flashTitle}>⚡ Flash Sale UPCOMING</Text>
              {/* <Text style={styles.flashTimer}>starts in 23:45:12</Text> */}
              {upcomingSales[0]?.startTime ? (
                <Text style={styles.flashTimer}>
                  Starts in {startDay > 0 ? `${startDay}d ` : ''}
                  {String(startHour).padStart(2, '0')}h{` `}:
                  {String(startMinute).padStart(2, '0')}m
                  {/* {String(startSecond).padStart(2, "0")} */}
                </Text>
              ) : (
                <Text style={styles.flashTimer}>starts soon</Text>
              )}
            </View>
            {/* <TouchableOpacity style={styles.flashCta}>
              <Text style={styles.flashCtaText}>Coming soon</Text>
            </TouchableOpacity> */}
            <FastImage source={{ uri: Upcoming }} style={{ width: 80, height: 40 }} />
          </LinearGradient>
        )}

        {/* Upcoming Flash sale Product Grid */}
        {upcomingSales.length > 0 && (
          <FlatList
            data={upcomingSales}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item?._id || index.toString()}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <FlashGrid
                navigation={navigation}
                sale={item}
                isLoading={isLoading && upcomingSales.length === 0}
              />
            )}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}

        {videos.length > 0 && renderVideoSection()}

        {/* Regional Section */}
        <RegionalSection
          regions={cities}
          fetchSellersByCity={fetchSellersByCity}
          onLoadCities={setLoadingCities}
        />

        {/* Stores */}
        {Array.isArray(topStores) && topStores.length > 0 && (
          <TopStores
            stores={topStores}
            loadingStores={loadingStores}
            hasMoreStores={hasMoreStores}
            activeStore={activeStore}
            page={page}
            onStorePress={(userName) => navigateToProfileWithOwnershipCheck(userName, 'TopStores')}
            onLoadMore={(nextPage) => {
              setPage(nextPage);
              fetchSellersByCity('chennai', nextPage);
            }}
          />
        )}

        {/* {renderUpcomingLive} */}

        {/* {console.log(user?.role ,
          user?.sellerInfo?.approvalStatus)} */}

        {/* {sellers.length > 0 && renderTopSellers()} */}
        {user?.role === 'user' &&
          user?.sellerInfo?.approvalStatus !== 'pending' &&
          user?.sellerInfo?.approvalStatus !== 'manual_review' && (
          <BecomeSellerBanner onBecomeSellerPress={navigateToSellerPortal} />
        )}


        {(loadingProducts || products?.length > 0) && (
          <TrendingNow
            products={products}
            loadingProducts={loadingProducts}
            isTopSellersFullScreen={isTopSellersFullScreen}
            onProductPress={navigateToProductDetails}
            onViewAllPress={navigateToProductsTab}
            formatCurrency={formatCurrency}
          />
        )}
      </View>
    ),
    [
      navigation,
      isVideo,
      videos,
      renderVideoSection,
      renderTopSellers,
    ],
  );

  const renderMainContent = useCallback(
    () => (
      <FlatList
        data={[{ id: 'main-content' }]}
        keyExtractor={item => item.id}
        renderItem={ListHeaderComponent}
        contentContainerStyle={[
          styles.container,
          !isInitialLoad && !(videos.length > 0) && styles.flexContainer,
        ]}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        refreshControl={
          // Add RefreshControl here
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F7CE45"
            colors={['#F7CE45']}
            progressBackgroundColor="#1e1e1e"
          />
        }
      />
    ),
    [ListHeaderComponent, isInitialLoad, videos, refreshing, onRefresh],
  );

  if (isInitialLoad || refreshing) {
    return (
      <View
        style={[styles.fullScreenLoader, { paddingTop: getStatusBarHeight() }]}>
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {/* <SafeAreaView edges={['top']}> */}
      {/* ProfileSetupModal is now replaced with ProfileSetupScreen navigation */}

      {/* Mobile Verification Modal */}
      {mobileVerificationModalVisible && !profileSetupModalVisible && !categoryModalVisible && (
        <MobileVerificationModal
          isOpen={mobileVerificationModalVisible}
          onClose={() => setMobileVerificationModalVisible(false)}
          onSuccess={() => {
            console.log('Mobile verification successful!');
            setMobileVerificationModalVisible(false);
            ToastAndroid.show('Mobile verified successfully!', ToastAndroid.SHORT);
            // Refresh user data to update isMobileVerified status
            fetchuser();
            if (!user.categories || user.categories.length === 0) {
              setCategoryModalVisible(true);
            }
          }}
        />
      )}

      {/* Category Selection Modal */}
      {categoryModalVisible && !profileSetupModalVisible && (
        <View style={styles.categoryModalContainer}>
          <CategoriesScreen
            categoryModalVisible={categoryModalVisible}
            setCategoryModalVisible={setCategoryModalVisible}
          />
        </View>
      )}

      <Header navigation={navigation} />

      <Marquee />

      {isMounted && renderCategoriesBreadcrumbWithGlobalFilter()}

      {renderMainContent()}

      {/* Floating Quick Actions */}
      {/* <View style={styles.quickFloat}>
          <TouchableOpacity style={styles.floatBtn}><Text style={styles.floatEmoji}>🎯</Text></TouchableOpacity>
          <TouchableOpacity style={styles.floatBtn} onPress={()=>{navigation.navigate('NotificationScreen')}}><Text style={styles.floatEmoji}>🔔</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.floatBtn, styles.floatPrimary]} onPress={()=>{navigation.navigate('GlobalSearch', {tabName: 'products'})}}><Text style={styles.floatEmojiBig}>🛍️</Text></TouchableOpacity>
        </View> */}

      {/* {statusModalVisible && (
        <StatusModal
          visible={statusModalVisible}
          onClose={() => setStatusModalVisible(false)}
          navigation={() => {
            setStatusModalVisible(false);
            navigation.navigate('DropshipperForm');
          }}
        />
      )} */}
      {/* </SafeAreaView> */}
      {/* Floating Quick Actions */}
      <View style={styles.quickFloat}>
        {/* <TouchableOpacity style={styles.floatBtn}><Text style={styles.floatEmoji}>🎯</Text></TouchableOpacity> */}
        <TouchableOpacity
          style={styles.floatBtn}
          onPress={() => navigateToComment()}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.floatEmoji}>💬</Text>
            {unreadChatCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadChatCount > 99 ? '99+' : unreadChatCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatBtn, styles.floatPrimary]}
          //onPress={()=>{navigation.navigate('GlobalSearch', {tabName: 'products'})}}
          onPress={() => {
            navigateToWishlist();
          }}
        // onPress = {()=>{navigation.navigate('SavedScreen', {tabName:'product'})}}
        >
          {wishlistCount > 0 && (
            <View
              className="absolute  top-0 right-0 bg-red-700 rounded-full px-2 py-1 items-center justify-center z-10"
              style={{ backgroundColor: 'red' ,top:-2}}>
              <Text className="text-white text-xs font-bold">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </Text>
            </View>
          )}

          <Text style={styles.floatEmojiBig}>🛍️</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay for Access Mode */}
      {isEnteringAccessMode && (
        <ReanimatedAnimated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.accessModeOverlayWrapper
          ]}
          entering={FadeIn.duration(200)}
        >
          <View style={styles.accessModeLoadingOverlay}>
            <ReanimatedAnimated.View
              style={styles.accessModeLoadingContainer}
              entering={FadeInUp.delay(100).duration(400).springify()}
            >
              <View style={styles.accessModeIconContainer}>
                <Icon name="shield-check" size={48} color="#F7CE45" />
              </View>
              <ActivityIndicator size="large" color="#F7CE45" style={styles.accessModeSpinner} />
              <Text style={styles.accessModeLoadingText}>Entering Access Mode</Text>
              <Text style={styles.accessModeSubtext}>Please wait while we verify your access...</Text>
              <View style={styles.accessModeDots}>
                <ReanimatedAnimated.View
                  style={[styles.accessModeDot, styles.accessModeDot1]}
                  entering={FadeIn.delay(300).duration(600)}
                />
                <ReanimatedAnimated.View
                  style={[styles.accessModeDot, styles.accessModeDot2]}
                  entering={FadeIn.delay(400).duration(600)}
                />
                <ReanimatedAnimated.View
                  style={[styles.accessModeDot, styles.accessModeDot3]}
                  entering={FadeIn.delay(500).duration(600)}
                />
              </View>
            </ReanimatedAnimated.View>
          </View>
        </ReanimatedAnimated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    paddingHorizontal: 5,
    paddingTop: 5,
    // backgroundColor:'#fff'
    backgroundColor: colors.primaryColor,
    //   paddingBottom: 10
    paddingBottom: 40,
  },
  flexContainer: {
    // flex: 1,
  },
  fullScreenLoader: {
    // flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: colors.primaryColor,
  },
  categoryModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
    // flex:1,
    backgroundColor: colors.primaryColor,
    zIndex: 1000,
  },

  // Story styles
  storyContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    marginTop: 6,
  },
  storiesContainer: {
    paddingHorizontal: 5,
  },
  storyItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  storyImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  liveIndicator: {
    backgroundColor: '#FF3B30',
    color: 'white',
    bottom: 18,
    position: 'absolute',
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
    fontWeight: '500',
  },
  storySellerName: {
    color: '#fff',
    fontSize: 11,
    marginTop: 10,
  },

  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    //  gap: 5,
    marginBottom: 10,
    marginHorizontal: 2,
    marginTop: 20, //5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#D9D9D94F',
    marginBottom: 10,
    width: '40%',
  },
  viewAll: {
    fontSize: 12,
    color: '#A0A0A0',
  },

  // For You section styles
  forYouHeader: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  forYouTitle: {
    fontSize: 16,
    color: '#fff',
  },
  forYouDivider: {
    backgroundColor: '#D9D9D94F',
    height: 1,
    marginTop: 3,
    width: '80%',
    marginRight: 100,
  },

  // Card styles
  cardContainer: {
    paddingHorizontal: 5,
  },
  twoColumnContainer: {
    // paddingHorizontal: 5,
  },
  card: {
    width: ITEM_WIDTH, //ITEM_WIDTH_ROW,
    height: 'auto', //220,
    //marginRight: 10,
    margin: 3,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    shadowColor: '#000',
    shadowRadius: 5,
    shadowOpacity: 0.3,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  card1: {
    width: ITEM_WIDTH_ROW,
    height: 220,
    //marginRight: 10,
    margin: 3,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
    shadowColor: '#000',
    shadowRadius: 5,
    shadowOpacity: 0.3,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  overlayCard: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 7,
    justifyContent: 'space-between',
    borderRadius: 10,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: 'bold',
  },

  // Seller info styles
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sellerImage: {
    height: 20,
    width: 20,
    borderRadius: 10,
  },
  sellerInitial: {
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitialText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sellerName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },

  // Live info styles
  liveInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  liveBadge: {
    height: 30,
  },
  liveText: {
    fontSize: 11,
    backgroundColor: '#FF3B30',
    color: '#fff',
    fontWeight: 'bold',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewerCount: {
    alignItems: 'center',
  },
  viewerIcon: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 5,
  },
  viewerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },

  // Video clip styles
  videoIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 1,
  },
  videoIconImage: {
    width: 15,
    height: 15,
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  viewsText: {
    //  position: 'absolute',
    //  bottom: 10,
    //  left: 10,
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category styles
  categoriesContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  categoryChip: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#FFD700',
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
  },
  selectedCategoryText: {
    color: 'black',
    fontWeight: 'bold',
  },

  //Gradient box styles
  box: {
    height: 123,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title1: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  Breadcrumbcontainer: {
    marginTop: 24,
    paddingHorizontal: 8,
    position: 'relative',
     marginBottom: 18,   //14,
  },
  heading: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  scrollIndicatorLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 8,
    zIndex: 10,
  },
  scrollIndicatorRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 10,
  },
  categoryItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 4, //10,
    // width: 70,
    // height: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    color: '#fff', //'#FFD700',
    fontSize: 13,
    fontWeight: '500',
  },

  selectedCategoryItem: {
    //  backgroundColor: '#F7CE45'      //'#FFD700',
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.2)',
  },

  selectedCategoryLabel: {
    color: '#FFD700', //'#1e1e1e',
  },

  //Top seller
  sellerContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#F7CE45', //'#FFD700',
    fontWeight: '500',
    marginRight: 4,
  },
  sellerCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
  },
  info: {
    marginLeft: 12,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  star: {
    fontSize: responsiveFontSize(12),
    color: '#F7CE45',
  },
  rating: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
  },
  dot: {
    color: '#888',
    marginHorizontal: 4,
  },
  reviews: {
    color: '#888',
    fontSize: responsiveFontSize(12),
  },
  followBtn: {
    backgroundColor: '#F7CE45', //'#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  followText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    color: '#aaa',
    fontSize: 14,
  },

  //Upcoming Live container
  upcomingLiveContainer: {
    marginTop: 20, //0,
    marginBottom: 10,
    paddingHorizontal: 8,
  },

  livecard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    height: 190,
  },
  liveImage: {
    height: '100%',
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    // padding: 10,
  },
  imageRadius: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  timeTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    position: 'absolute',
    top: 4,
    right: 10,
  },
  timeText: {
    color: '#fff',
    fontSize: 11,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  absoluteBottom: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  preBidBtn: {
    //flex: 1,
    backgroundColor: '#F7CE45', //'#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  waitlistBtn: {
    // flex: 1,
    backgroundColor: '#F7CE45', //'#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnTextDark: {
    fontWeight: '600',
    color: '#000',
    fontSize: 13,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },

  //category with icon
  catContainer: {
    // paddingHorizontal: 16,
    marginBottom: 24,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryscroll: {
    flexDirection: 'row',
  },
  categoryitem: {
    width: 70,
    height: 70,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryImage: {
    width: 28,
    height: 28,
    marginBottom: 6,
    tintColor: '#F7CE45', //'#FFD700',
  },
  categorylabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    position: 'absolute',
    bottom: 8,
  },

  //Initial for seller name
  initialsFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 1000,
  },
  initialsText: {
    color: '#f7cf4b',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },

  //Product scroll style

  recommendationsScroll: {
    // marginTop: 8,
  },
  recommendedItem: {
    backgroundColor: '#222', //'#2D3748',
    marginRight: 12,
    borderRadius: 8,
    padding: 0,
    width: 164,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendedImage: {
    width: '100%',
    height: 128,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedName: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recommendedPrice: {
    color: '#FBBF24',
    marginBottom: 4,
  },
  imageContainer: {
    aspectRatio: 1,
    // backgroundColor: '#1A1A1A',
    // padding: 10,
  },
  discountTag: {
    // position: 'absolute',
    // top: -150,
    // left: 10,
    // backgroundColor: '#ff4d4f',
    // paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    // elevation:3,
    paddingVertical: 3,
    borderRadius: 7,
  },
  discountText: {
    color: '#ddd',
    textTransform: 'capitalize',
    fontSize: 10,
    // elevation:4,
    fontWeight: '600',
  },
  productImage1: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    //borderRadius: 8,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
  },
  cardBody: {
    padding: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
    color: '#fff',
    marginBottom: 2,
  },

  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    // width: '50%',
    marginBottom: 5,
  },
  sellerImage: {
    width: 20,
    height: 20,
    backgroundColor: '#435862',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginRight: 5,
  },
  sellerName: {
    fontSize: 12,
    color: '#fff',
    // textTransform: 'capitalize',
  },
  priceContainer: {
    // flexDirection: 'row',
    // alignItems: 'baseline',
    // alignSelf: 'flex-start',
    //  justifyContent:'space-between',
    //  width: '100%',
    // gap: 5,
    // marginBottom: 5,
    //backgroundColor:'red'
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  leftContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    position: 'absolute',
    top: 10,
  },
  leftButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 15,
    alignItems: 'center',
    padding: 3,
  },
  color: {
    width: 6,
    height: 6,
    padding: 3,
    borderRadius: 20,
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationsContainer: {
    paddingHorizontal: 0, //8,
    // paddingTop: 24,
    //  paddingBottom: 32,
    // backgroundColor: '#2C2C2C',   //'#1F2937',
    marginTop: 0,   //20,
    borderRadius: 12,

    marginBottom: 20, //80,   //newly added
  },
  mrpText: {
    fontSize: responsiveFontSize(12),
    // fontWeight: '400',
    color: '#B0B0B0',
    textDecorationLine: 'line-through',
  },
  discountButton: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal: 5,
  },

  buyButtonText: { fontSize: 10, fontWeight: '500' },
  buyButton: {
    backgroundColor: '#F7CE45',
    padding: 5,
    paddingHorizontal: 10,
    height: 25,
    borderRadius: 15,
  },

  flashBanner: {
    marginHorizontal: 0,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4d6d',
  },
  flashTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  flashTimer: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  flashCta: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  flashCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  storesGrid: {
    flexDirection: 'row',
    // flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  storeCard: {
    // width: (375 - 20 - 16) / 3,

    flexShrink: 1,
    flexBasis: (width - 24 - 10) / 3,
    //width: (width - 24 - 10) / 3,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  activeStoreCard: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    borderWidth: 0.2,
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  storeAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    resizeMode: 'cover',
  },
  storeAvatarEmoji: { fontSize: 20 },
  storeStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#141414',
  },
  storeName: { fontSize: 10, fontWeight: '700', color: '#fff', marginBottom: 2 },
  storeCategory: { fontSize: 9, color: '#888', marginBottom: 4 },
  storeRating: { fontSize: 9, color: '#FFD700' },

  section: { paddingTop:12, //12,
     flexDirection: 'column' },
  sectionHeader1: {
    marginTop: 20,
    marginHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitleText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  seeMore: { fontSize: 11, color: '#FFD700', fontWeight: '600' },

  videoStats: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },

  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    //  backgroundColor: '#141414',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  trendingRank: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    minWidth: 25,
  },
  trendingImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  trendingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  trendingMeta: { fontSize: 9, color: '#888' },
  trendingPrice: { fontSize: 13, fontWeight: '700', color: '#FFD700' },

  quickFloat: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    bottom: 90,
    gap: 8,
  },
  floatBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(20,20,20,0.9)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  floatPrimary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFA500',
  },
  floatEmoji: { fontSize: 16 },
  floatEmojiBig: { fontSize: 20 },

  categoryShowcase: { paddingHorizontal: 0, paddingTop: 12 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 12,
    paddingVertical: 16,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconEmoji: { fontSize: 16 },
  categoryName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  categoryCount: { fontSize: 10, color: '#888' },

  mixedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mixedCard: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexGrow: 1,
  },
  mixedWide: { width: ((100 - 10 * 2 - 6) / 3) * 2 },
  mixedTall: { height: 246 },

  flashGrid: { flexDirection: 'row', gap: 6, paddingHorizontal: 0, marginTop: 8 },
  flashItem: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,0,64,0.2)',
  },
  flashImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  discountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff0040',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  flashPrice: { fontSize: 12, fontWeight: '700', color: '#FFD700' },
  flashOriginal: {
    fontSize: 9,
    color: '#666',
    textDecorationLine: 'line-through',
  },

  liveGrid: {
    flexDirection: 'row',
    //flex: 1,
    //flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  liveCard: {
    flexShrink: 1,
    shadowColor: 'red',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Android Shadow
    elevation: 5,
    marginBottom: 12,
    height: 200,
    width: (width - 25 - 18) / 3,
    aspectRatio: 3 / 4,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,0,64,0.2)',
    overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#ff0040',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 2,
  },
  dotLive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  liveViewers: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  liveViewersText: { fontSize: 9, color: '#fff' },
  liveInfoGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  liveSeller: { fontSize: 10, fontWeight: '700', color: '#fff', marginBottom: 2 },
  liveProduct: { fontSize: 9, color: '#FFD700' },

  overlayCard: {
    position: 'absolute',
    top: '20%', // adjust relative to card height
    left: '7%',
    //  right: "10%",
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  overlaySubtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'red',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 10,
    marginBottom: 10,
  },
  calendarText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#444',
    borderRadius: 8,
  },

  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)', // optional dim
    zIndex: 10,
  },

  overlayCard: {
    backgroundColor: 'transparent', //"#222",
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'red',
    padding: 2,
    borderRadius: 4,
  },

  profileInitials: {
    color: 'black',
    fontSize: 28,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  //Upcoming card style

  liveCard1: {
    // marginHorizontal: 5,
    flexShrink: 1,
    shadowColor: 'red',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Android Shadow
    elevation: 5,
    marginBottom: 12,
    height: 200,
    width: '100%',
    // aspectRatio: 8/4,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,0,64,0.2)',
    overflow: 'hidden',
  },
  liveBadge1: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 0, 64, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 2,
  },
  dotLive1: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText1: { fontSize: 9, fontWeight: '700', color: '#fff' },
  liveViewers1: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  liveViewersText1: { fontSize: 9, color: '#fff' },
  liveInfoGrad1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  liveSeller1: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  liveProduct1: { fontSize: 11, color: '#FFD700' },

  remindBtn: {
    // width: "100%",
    height: 32,
    width: 100,
    padding: 8,
    paddingVertical: 4,
    backgroundColor: colors.primaryButtonColor, //"rgba(255, 215, 0, 0.1)", // fallback
    borderWidth: 1,
    borderColor: '#FFD700', // var(--border-gold) → gold hex
    borderRadius: 16, //8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remindBtnActive: {
    backgroundColor: colors.primaryButtonColor, //"rgba(0, 255, 136, 0.2)", // RN doesn’t support gradients natively
    borderColor: '#444', //"#00FF88", // var(--success-green)
  },
  remindText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000', // var(--primary-gold)
  },
  remindTextActive: {
    color: '#000', //"#00FF88", // var(--success-green)
  },

  badgeContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconContainer: {
    position: 'relative',
  },
  accessModeOverlayWrapper: {
    zIndex: 9999,
    elevation: 9999,
  },
  accessModeLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  accessModeLoadingContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F7CE45',
    minWidth: 280,
    maxWidth: 340,
    shadowColor: '#F7CE45',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  accessModeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(247, 206, 69, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  accessModeSpinner: {
    marginVertical: 16,
  },
  accessModeLoadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  accessModeSubtext: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  accessModeDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  accessModeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F7CE45',
  },
  accessModeDot1: {
    opacity: 0.4,
  },
  accessModeDot2: {
    opacity: 0.6,
  },
  accessModeDot3: {
    opacity: 0.8,
  },
  loadMoreButton: {
    width: (width - 25 - 18) / 3,
    height: 150,
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadMoreText: {
    color: '#F7CE45',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  loadMoreGradientButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreGradientButtonDisabled: {
    opacity: 0.5,
  },
  loadMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadMoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7CE45',
  },
  loadMoreArrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7CE45',
  },
});

Dashboard.displayName = 'Dashboard';
export default Dashboard;
