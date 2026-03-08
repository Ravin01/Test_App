// ============================================================================
// IMPORTS
// ============================================================================

// React & Core
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useContext,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Keyboard,
  ToastAndroid,
  Dimensions,
  Platform,
  AppState,
  ActivityIndicator,
  BackHandler,
} from 'react-native';

// Third-party Libraries
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {BlurView} from '@react-native-community/blur';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Icons
import {
  UserRound,
  Users,
  Zap,
  Minimize2,
  Maximize2,
  Cast,
} from 'lucide-react-native';
import Octicons from 'react-native-vector-icons/Octicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Config & Constants
import {bgaSocketUrl, shareUrl, socketurl} from '../../../Config';
import {AWS_CDN_URL} from '../../Utils/aws';

// Hooks
import {usePictureInPicture} from '../../hooks/usePictureInPicture';
import {useBackHandler} from '../../hooks/useBackHandler';
import {useFollowApi} from '../../Utils/FollowersApi';

// Context
import {AuthContext} from '../../Context/AuthContext';

// Services & APIs
import axiosInstance from '../../Utils/Api';
import {connectBgaSocket} from '../../Utils/BgaSocket';
import {formatFollowerCount, Toast} from '../../Utils/dateUtils';
import bgaSocket from '../../Utils/BgaSocket';
import giveawayService from './Services/giveawayService';
import livestreamShareService from '../../Services/livestreamShareService';
import {StreamEventEmitter} from '../../Utils/StreamEventEmitter';

import {RegisterEventEmitter} from '../../Utils/RegisterEventEmitter';
// Components - Overlays & Modals
import LiveFlashSaleOverlay from './Components/FlashSale/LiveFlashSaleOverlay';
import AuctionsOverlay from './Utils/AuctionOverlay';
// import LiveComments from './LiveComments';
import LiveComments from './LiveComments.appsync';
import PaymentBottomSheet from './Utils/OptionBottomSheet';
import ReportBottomSheet from './ReportBottomSheet';
import ShareModal from '../Reuse/ShareModal';
// import NoteModal from '../SellerComponents/LiveStreaming/Utils/NoteModal';
import NotesBottomSheet from './Utils/NotesBottomSheet'; // ✅ NEW: Bottom sheet implementation
import RollingEffectModal from './Utils/RollingEffectModal';
import {WinnerModal} from './Utils/WInnerModal';
import {GiveawayWinnerModal} from './Utils/WinnerGiveawayModal';
import SimulcastModal from './Components/Simulcast/SimulcastModal';
import SimulcastShareModal from './Components/Simulcast/SimulcastShareModal';

// Components - Giveaway & Checkout
import GiveawayUserInterface from './Components/GiveAway/GiveawayUserInterface';
import LiveFlashSaleCheckoutSlider from './Components/FlashSale/LiveFlashSaleCheckoutSlider';
import CheckoutSlider from '../Reuse/CheckOutGlobal';
import AuctionCheckoutSlider from './Payment/AuctionCheckout';
import BundleCheckoutSlider from './Payment/BundleCheckoutSlider';
import GiveawayCheckoutSlider from './Payment/GiveawayCheckOut';

import { events } from 'aws-amplify/data';
// Components - Reusable
import LikeButton from '../Reuse/LikeButton';
import Viewer from './Viewer';
import likeService from '../../Services/likeService';
import {
  configureAppSync,
  connectToChannel,
  getGiveawaysChannelPath,
  subscribeToChannel,
  closeChannel,
  getAuctionsChannelPath,
} from '../../Utils/appSyncConfig';

// ✅ NEW: Import flash sale AppSync configuration
import {
  subscribeToFlashSaleChannel,
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES,
} from '../../Utils/appSyncFlashSaleConfig';
interface RouteParams {
  stream?: any;
  simulcast?: string;
  id?: string;
}

interface NavigationProp {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface LiveScreenProps {
  route: {
    params: RouteParams;
  };
  navigation: NavigationProp;
}

interface ShowData {
  _id?: string;
  host?: {
    _id?: string;
    userInfo?: {
      _id?: string;
      userName?: string;
      profileURL?: {
        key?: string;
      };
    };
    companyName?: string;
  };
  liveStreamId?: string;
  showStatus?: string;
  thumbnailImage?: string;
  scheduledAt?: string;
  notes?: string;
  buyNowProducts?: any[];
  auctionProducts?: any[];
  giveawayProducts?: any[];
  currentGiveaway?: {
    _id?: string;
    giveawayId?: string;
    isActive?: boolean;
    isGiveawayEnded?: boolean;
    applicants?: any[];
    stats?: {
      totalApplicants?: number;
    };
  };
  likedBy?: string[];
  comments?: any[];
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Screen dimensions
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Action button positioning constants
const ACTION_BUTTON_POSITIONS = {
  withKeyboard: 120,
  withoutAuction: 200,
  withAuction: 330,
};


/**
 * Safely extracts product ID from various product field formats
 * @param productField - Product field that may contain ID
 * @returns Product ID as string or null
 */
const getProductIdSafely = productField => {
  if (!productField) return null;
  if (
    typeof productField === 'object' &&
    productField !== null &&
    productField?._id
  ) {
    return productField?._id.toString();
  }
  return productField.toString();
};

/**
 * Formats show date/time based on proximity to current time
 * @param scheduledDate - Scheduled date of the show
 * @returns Formatted date/time string
 */
const formatShowDateTime = scheduledDate => {
  if (!scheduledDate) return 'Time not set';

  const date = new Date(scheduledDate);
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Check if today
  const isToday = date.toDateString() === now.toDateString();

  // Format time (e.g., "8:30pm")
  const timeStr = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (diffInDays <= 7 && diffInDays > 0) {
    // Within a week - show weekday
    const weekday = date.toLocaleString('en-US', {weekday: 'short'});
    return `${weekday}, ${timeStr}`;
  } else {
    // More than a week - show full date
    const dateStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr}, ${timeStr}`;
  }
};

/**
 * Custom hook to track keyboard visibility and height
 * @returns Object with keyboard visibility state and height
 */
const useKeyboard = () => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return {isKeyboardVisible, keyboardHeight};
};

const LiveStreamScreen = React.memo<LiveScreenProps>(({route, navigation}) => {
  const insets = useSafeAreaInsets();
  const {stream, simulcast} = route.params;

  // const [productInterests, setProductInterests] = useState({});
  const data = route.params;
  const streamId = stream?._id || data?.id;
  const {selectedAddress, user, storePendingAction}: any =
    useContext(AuthContext);

  const {isKeyboardVisible, keyboardHeight} = useKeyboard();
  // ✅ FIX: Initialize sockets inside component with refs for proper cleanup
  const socketFlashRef = useRef(null);

  // Track app state for PIP mode detection (more reliable than PIP events)
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  // Picture-in-Picture functionality
  const [pipState, pipActions] = usePictureInPicture({
    autoEnterOnBackground: true,
    onPIPStatusChanged: isActive => {
      if (isActive) {
        // Toast('Entering Picture-in-Picture mode');
        // Close all modals when entering PIP
        setModalStates({
          optionModalVisible: false,
          isGiveawayVisible: false,
          reportVisible: false,
        });
        setShareModal(false);
        setNoteModal(false);
        setShowWinnerModal(false);
        setShowCheckOut(false);
        setShowWinnerGiveaway(false);
        setCheckoutOpen(false);
        setShowRollingModal(false);
      } else {
        // Toast('Exited Picture-in-Picture mode');
      }
    },
    onError: error => {
      Toast(`PIP Error: ${error}`);
    },
  });
  // Monitor app state to determine if we should show UI
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const isBackground =
        nextAppState === 'background' || nextAppState === 'inactive';
      setIsAppInBackground(isBackground);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const [isFollowing, setIsFollowing] = useState(false);
  const {followUser, checkFollowStatus, unfollowUser} = useFollowApi();
  const [totalRegistrations, setTotalRegistrations] = useState(0);

  // State management - grouped by functionality
  const [streamData, setStreamData] = useState({
    show: {},
    messages: [],
    isDataLoaded: false,
  });
  const [userInteractions, setUserInteractions] = useState({
    liked: false,
    likes: 0,
    muted: false,
  });

  const [liveFeatures, setLiveFeatures] = useState({
    currentAuction: null,
    viewerCount: 0,
    auctionVisible: true,
  });

  const [modalStates, setModalStates] = useState({
    optionModalVisible: false,
    isGiveawayVisible: false,
    reportVisible: false,
  });

  const [activeFlashSales, setActiveFlashSales] = useState([]);
  const [combinedBuyNowProducts, setCombinedBuyNowProducts] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutType, setCheckoutType] = useState('static');
  const [checkoutFlashSaleId, setCheckoutFlashSaleId] = useState(null);
  const [checkoutBundleData, setCheckoutBundleData] = useState(null);

  // ✅ NEW: 1-second visual timer (same as seller side)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  // ✅ NEW: Utility functions (same as seller side)
  const calculateDiscount = useCallback((originalPrice, flashPrice) => {
    if (!originalPrice || originalPrice === 0 || !flashPrice) return 0;
    return Math.round(((originalPrice - flashPrice) / originalPrice) * 100);
  }, []);

  const calculateTimeLeft = useCallback((endTime, now) => {
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, []);

  const calculateProgress = useCallback((startTime, endTime, now) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    if (now >= end) return 100;
    if (now <= start) return 0;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, (elapsed / total) * 100);
  }, []);

  const formatTime = useCallback(seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  // ✅ OPTIMIZED: Batch flash sale updates to prevent excessive re-renders
  // Flash sale socket listeners
  useEffect(() => {
    const id = streamId;
    const socketFlash = socketFlashRef.current;

    if (!socketFlash || !id) {
      return;
    }

    // ✅ Use ref to batch multiple updates
    const pendingUpdatesRef = { current: [] };
    const updateTimerRef = { current: null };

    // ✅ Batch update function - debounces rapid updates
    const batchFlashSaleUpdate = (updateFn) => {
      pendingUpdatesRef.current.push(updateFn);
      
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      updateTimerRef.current = setTimeout(() => {
        if (pendingUpdatesRef.current.length > 0) {
          setActiveFlashSales(prev => {
            let result = prev;
            pendingUpdatesRef.current.forEach(fn => {
              result = fn(result);
            });
            pendingUpdatesRef.current = [];
            return result;
          });
        }
      }, 50); // 50ms debounce
    };

    const handleConnect = () => {
      socketFlash.emit('JOIN_LIVE_STREAM', id);
    };

    // ===== REGULAR FLH SALE HANDLERS =====
    const handleCurrentActiveSales = sales => {
      batchFlashSaleUpdate(prev => {
        // Keep existing bundles, add new products
        const existingBundles = prev.filter(s => s.isBundle);
        const newProducts = sales.map(sale => ({
          ...sale,
          flashSaleId: sale.flashSaleId || sale._id,
          isBundle: false,
        }));
        return [...existingBundles, ...newProducts];
      });
    };

    // ===== BUNDLE FLASH SALE HANDLERS ===
    const handleCurrentActiveBundleSales = sales => {
      batchFlashSaleUpdate(prev => {
        // Keep existing products, add new bundles
        const existingProducts = prev.filter(s => !s.isBundle);
        const newBundles = sales.map(sale => {
          // Ensure all required fields are present for LiveFlashSaleOverlay
          const mappedSale = {
            ...sale,
            isBundle: true,
            // Ensure endTime exists (critical for overlay display)
            endTime: sale.endTime || sale.endsAt || sale.flashSaleEndTime,
            // Ensure startTime exists
            startTime:
              sale.startTime || sale.startsAt || sale.flashSaleStartTime,
            // Ensure flashSaleId exists
            flashSaleId: sale.flashSaleId || sale._id,
            // Ensure bundle-specific fields
            bundleId: sale.bundleId || sale._id,
            bundleTitle: sale.bundleTitle || sale.title || 'Bundle Flash Sale',
            bundleQuantity: sale.bundleQuantity || 0,
            bundleImage: sale.bundleImage || {},
            // Ensure pricing fields
            flashPrice: sale.flashPrice || sale.bundlePrice || 0,
            originalPrice: sale.originalPrice || sale.bundleMRP || 0,
          };
          return mappedSale;
        });
        return [...existingProducts, ...newBundles];
      });
    };

    const handleFlashSaleStarted = data => {
      batchFlashSaleUpdate(prev => {
        const exists = prev.some(sale => sale._id === data._id);
        if (!exists) {
          return [...prev, {...data, flashSaleId: data._id, isBundle: false}];
        }
        return prev;
      });
    };

    const handleFlashSaleEnded = data => {
      batchFlashSaleUpdate(prevActive => {
        const endedSale = prevActive.find(
          sale =>
            !sale.isBundle &&
            (sale._id === data.flashSaleId ||
              sale.flashSaleId === data.flashSaleId),
        );
        if (endedSale) {
          // setFlashSaleHistory(prevHistory => [
          //   { ...endedSale, status: 'ended', endedAt: data.endedAt || new Date() },
          //   ...prevHistory
          // ]);
        }
        return prevActive.filter(
          sale =>
            sale.isBundle ||
            (sale._id !== data.flashSaleId &&
              sale.flashSaleId !== data.flashSaleId),
        );
      });
    };

    const handleStockUpdate = data => {
      console.log('stock update received ', data);
      batchFlashSaleUpdate(prev =>
        prev.map(sale => {
          if (
            !sale.isBundle &&
            (sale._id === data.flashSaleId ||
              sale.flashSaleId === data.flashSaleId)
          ) {
            const updatedProducts = sale.products?.map(p =>
              p.productId === data.productId
                ? {...p, currentFlashStock: data.currentStock}
                : p,
            );
            return {
              ...sale,
              currentStock:
                sale.productId === data.productId
                  ? data.currentStock
                  : sale.currentStock,
              products: updatedProducts,
            };
          }
          return sale;
        }),
      );
    };

    const handleBundleFlashSaleStarted = data => {
      batchFlashSaleUpdate(prev => {
        const exists = prev.some(sale => sale.flashSaleId === data.flashSaleId);
        if (!exists) {
          // Ensure all required fields are present
          const newBundleSale = {
            ...data,
            isBundle: true,
            // Ensure endTime exists (critical for overlay display)
            endTime: data.endTime || data.endsAt || data.flashSaleEndTime,
            // Ensure startTime exists
            startTime:
              data.startTime || data.startsAt || data.flashSaleStartTime,
            // Ensure flashSaleId exists
            flashSaleId: data.flashSaleId || data._id,
            // Ensure bundle-specific fields
            bundleId: data.bundleId || data._id,
            bundleTitle: data.bundleTitle || data.title || 'Bundle Flash Sale',
            bundleQuantity: data.bundleQuantity || 0,
            bundleImage: data.bundleImage || {},
            // Ensure pricing fields
            flashPrice: data.flashPrice || data.bundlePrice || 0,
            originalPrice: data.originalPrice || data.bundleMRP || 0,
          };
          return [...prev, newBundleSale];
        }
        return prev;
      });
    };

    const handleBundleStockUpdate = data => {
      console.log('bundle socket update', data);
      batchFlashSaleUpdate(prev => {
        const updated = prev.map((sale, index) => {
          if (sale.isBundle && sale.flashSaleId === data.flashSaleId) {
            const updatedSale = {
              ...sale,
              bundleQuantity: data.bundleQuantity,
              products: data.products,
              limitingProduct: data.limitingProduct,
              bundlesSold: data.bundlesSold,
              _lastUpdate: Date.now(),
            };
            return updatedSale;
          }
          return sale;
        });
        return updated;
      });
    };

    const handleBundleFlashSaleEnded = data => {
      batchFlashSaleUpdate(prevActive => {
        const endedSale = prevActive.find(
          sale => sale.isBundle && sale.flashSaleId === data.flashSaleId,
        );
        if (endedSale) {
          // setFlashSaleHistory(prevHistory => [
          //   { ...endedSale, status: 'ended', endedAt: data.endedAt || new Date() },
          //   ...prevHistory
          // ]);
        }
        return prevActive.filter(
          sale => !sale.isBundle || sale.flashSaleId !== data.flashSaleId,
        );
      });
    };

    // This ensures listeners are ready to receive initial data

    // Register connection handler
    socketFlash.on('connect', handleConnect);

    // Register regular flash sale event listeners
    socketFlash.on('CURRENT_ACTIVE_FLASH_SALES', handleCurrentActiveSales);
    socketFlash.on('LIVE_STREAM_FLASH_SALE_STARTED', handleFlashSaleStarted);
    socketFlash.on('LIVE_STREAM_FLASH_SALE_ENDED', handleFlashSaleEnded);
    // socketFlash.on('LIVE_STREAM_STOCK_UPDATE', handleStockUpdate);
    socketFlash.on('LIVE_STREAM_STOCK_UPDATE', handleStockUpdate);

    // Register bundle flash sale event listeners
    socketFlash.on(
      'CURRENT_ACTIVE_BUNDLE_FLASH_SALES',
      handleCurrentActiveBundleSales,
    );
    socketFlash.on('BUNDLE_FLASH_SALE_STARTED', handleBundleFlashSaleStarted);
    socketFlash.on('BUNDLE_STOCK_UPDATE', handleBundleStockUpdate);
    socketFlash.on('BUNDLE_FLASH_SALE_ENDED', handleBundleFlashSaleEnded);

    // Error handlers
    socketFlash.on('LIVE_STREAM_FLASH_SALE_ERROR', data => {
      Toast(data.message || 'Flash sale error occurred');
    });

    socketFlash.on('BUNDLE_FLASH_SALE_ERROR', data => {
      // negative(data.message || 'Bundle flash sale error occurred');
    });

    // After all listeners are registered, immediately join the room
    // Use setImmediate/nextTick equivalent for React (wrapped in setTimeout(0))

    // Join room in next tick to ensure all handlers are registered
    const joinTimer = setTimeout(() => {
      // Clear any existing flash sales to prevent stale data
      // Do this right before emitting to minimize race condition
      setActiveFlashSales([]);

      // Always emit JOIN_LIVE_STREAM to request fresh data
      socketFlash.emit('JOIN_LIVE_STREAM', id);
    }, 0);

    return () => {
      clearTimeout(joinTimer);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      // Regular flash sale cleanup
      socketFlash.off('connect', handleConnect);
      socketFlash.off('LIVE_STREAM_FLASH_SALE_STARTED', handleFlashSaleStarted);
      socketFlash.off('LIVE_STREAM_FLASH_SALE_ENDED', handleFlashSaleEnded);
      socketFlash.off('LIVE_STREAM_STOCK_UPDATE', handleStockUpdate);
      socketFlash.off('LIVE_STREAM_FLASH_SALE_ERROR');

      socketFlash.off('CURRENT_ACTIVE_FLASH_SALES', handleCurrentActiveSales);
      // Bundle flash sale cleanup
      socketFlash.off(
        'CURRENT_ACTIVE_BUNDLE_FLASH_SALES',
        handleCurrentActiveBundleSales,
      );
      socketFlash.off(
        'BUNDLE_FLASH_SALE_STARTED',
        handleBundleFlashSaleStarted,
      );
      socketFlash.off('BUNDLE_STOCK_UPDATE', handleBundleStockUpdate);
      socketFlash.off('BUNDLE_FLASH_SALE_ENDED', handleBundleFlashSaleEnded);
      socketFlash.off('BUNDLE_FLASH_SALE_ERROR');
    };
  }, [streamId]);

  // Destructure for easier access
  // Replace all accesses to streamData.show with safe access
  const show = streamData?.show || {};
  const [giveawayWon, setGiveawayWon] = useState(null);
  const [bidderWon, setBidderWon] = useState(null);
  const [auctionActive, setAuctionActive] = useState(false);
  const [currentAuction, setCurrentAuction] = useState(null);
  const [currentGiveaway, setCurrentGiveaway] = useState({});

  const [giveawayApplicantsCount, setGiveawayApplicantsCount] = useState(0);
  const [showRollingModal, setShowRollingModal] = useState(false);
  const [rollingCountdown, setRollingCountdown] = useState(0);
  const [rollingParticipants, setRollingParticipants] = useState([]);
  const [rollingProductInfo, setRollingProductInfo] = useState({
    title: '',
    image: '',
  });
  const [rollingGiveawayId, setRollingGiveawayId] = useState(null);

  // Track if user is on this screen using useFocusEffect
  const [isScreenActive, setIsScreenActive] = useState(false);
  // Simulcast modal state
  const [showSimulcastModal, setShowSimulcastModal] = useState(false);
  const [showSimulcastShareModal, setShowSimulcastShareModal] = useState(false);

  // Check if simulcast parameter is present in route params (from deep link)
  // simulcast=true or simulcast='' (empty string) both indicate simulcast setup mode
  const showSimulcastSetup = simulcast === 'true' || simulcast === '';

  // Auto-open simulcast modal when deep link contains simulcast parameter
  // useEffect(() => {
  //   if (showSimulcastSetup && user?._id !== host && !show?.liveStreamId) {
  //     // Small delay to ensure component is fully mounted
  //     const timer = setTimeout(() => {
  //       console.log('🎬 Auto-opening Simulcast modal from deep link');
  //       setShowSimulcastModal(true);
  //     }, 500);

  //     return () => clearTimeout(timer);
  //   }
  // }, [showSimulcastSetup, user?._id, host, show?.liveStreamId]);

  const host = show?.host?.userInfo?._id || null;
  const handleCheckStats = async () => {
    try {
      if (!host) return;
      const followStatus = await checkFollowStatus(host);
      setIsFollowing(followStatus.isFollowing);
    } catch (err) {
      // Error checking follow status
    }
  };
  useEffect(() => {
    handleCheckStats();
  }, [host]);

  const shows = show;
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [shouldCleanupViewer, setShouldCleanupViewer] = useState(false);

  // Exit confirmation modal handlers
  const handleConfirmExit = async () => {
    setShowExitConfirmModal(false);
    // Set flag to true so native view knows to cleanup
    setShouldCleanupViewer(true);

    // ✅ Emit stream ended event to notify Dashboard
    if (streamId && show?.liveStreamId) {
      console.log('📡 [LiveScreen] Emitting stream ended event:', streamId);
      StreamEventEmitter.emitStreamEnded({
        streamId: streamId,
        liveStreamId: show.liveStreamId,
        endedAt: new Date().toISOString(),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    const routes = navigation?.getState()?.routes;
    const index = navigation?.getState()?.index;

    const previousRoute = routes[index - 1]?.name;
    // Small delay to ensure flag is propagated before navigation
    const token = await AsyncStorage.getItem('accessToken');
    if (navigation?.canGoBack()) {
      if (previousRoute === 'Login') {
        navigation.navigate('bottomtabbar');
      } else {
        navigation.goBack();
      }
    } else {
      if (token) navigation.navigate('bottomtabbar');
      else navigation.navigate('Login');
    }
  };

  const handleCancelExit = () => {
    setShowExitConfirmModal(false);
  };

  // ✅ CONSOLIDATED BackHandler - handles both modal closing and exit confirmation
  useEffect(() => {
    const onBackPress = async () => {
      // ✅ PRIORITY 1: Check if any modals/bottom sheets are open - close them first
      const hasOpenModals =
        modalStates.optionModalVisible ||
        modalStates.isGiveawayVisible ||
        modalStates.reportVisible ||
        shareModal ||
        noteModal || // ✅ Notes bottom sheet check
        showWinnerModal ||
        showChekout ||
        showWinnerGiveaway ||
        showGiveawayChekout ||
        checkoutOpen ||
        showRollingModal ||
        showSimulcastModal ||
        showSimulcastShareModal;

      if (hasOpenModals) {
        // Close all modals/bottom sheets instead of navigating
        setModalStates({
          optionModalVisible: false,
          isGiveawayVisible: false,
          reportVisible: false,
        });
        setShareModal(false);
        setNoteModal(false); // ✅ Close notes bottom sheet
        setShowWinnerModal(false);
        setShowCheckOut(false);
        setShowWinnerGiveaway(false);
        setShowGiveawayCheckOut(false);
        setCheckoutOpen(false);
        setShowRollingModal(false);
        setShowSimulcastModal(false);
        setShowSimulcastShareModal(false);

        return true; // Block back press when closing modals
      }

      // ✅ PRIORITY 2: Show exit confirmation if actively watching a live stream
      if (
        show?.liveStreamId &&
        show?.showStatus !== 'created' &&
        isScreenActive
      ) {
        setShowExitConfirmModal(true);
        return true; // Prevent default back behavior
      }
      const routes = navigation?.getState()?.routes;
      const index = navigation?.getState()?.index;

      const previousRoute = routes[index - 1]?.name;
      // ✅ PRIORITY 3: For non-live streams or no modals open, navigate normally
      const token = await AsyncStorage.getItem('accessToken');
      if (navigation?.canGoBack()) {
        if (previousRoute === 'Login') {
          navigation.navigate('bottomtabbar');
        } else {
          navigation.goBack();
        }
      } else {
        if (token) navigation.navigate('bottomtabbar');
        else navigation.navigate('Login');
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [
    navigation,
    show?.liveStreamId,
    show?.showStatus,
    isScreenActive,
    modalStates,
    shareModal,
    noteModal, // ✅ Include noteModal in dependencies
    showWinnerModal,
    showChekout,
    showWinnerGiveaway,
    showGiveawayChekout,
    checkoutOpen,
    showRollingModal,
    showSimulcastModal,
    showSimulcastShareModal,
  ]);
  const getCombinedBuyNowProducts = useCallback(() => {
    const normalProducts = shows?.buyNowProducts || [];

    // Convert active flash sales to buy now product format
    const flashSaleProducts = activeFlashSales
      .map(flashSale => {
        let productData = null;

        // Try different locations for product data
        if (flashSale.productId && typeof flashSale.productId === 'object') {
          productData = flashSale.productId;
        } else if (
          flashSale.products &&
          flashSale.products[0] &&
          flashSale.products[0].productId
        ) {
          productData = flashSale.products[0].productId;
        }

        if (!productData) {
          return null;
        }

        // ✅ FIXED: Proper price handling
        const flashPrice = Number(flashSale.flashPrice) || 0;
        const originalPrice =
          Number(flashSale.originalPrice) ||
          Number(productData.MRP) ||
          Number(productData.productPrice) ||
          0;

        // Get current stock from flash sale data
        const currentStock =
          Number(flashSale.currentStock) ||
          Number(flashSale?.currentFlashStock) ||
          0; // Number(flashSale.availableStock)

        return {
          productId: {
            ...productData,
            // ✅ FIXED: Proper price assignment
            productPrice:
              flashPrice > 0 ? flashPrice : productData.productPrice || 0,
            MRP: originalPrice,
            // Add flash sale metadata
            isFlashSale: true,
            flashSaleId: flashSale.flashSaleId || flashSale._id,
            flashSaleEndTime: flashSale.endTime,
            flashSaleStock: currentStock,
          },
          // ✅ FIXED: Add productPrice at top level for BuyProducts component
          productPrice:
            flashPrice > 0 ? flashPrice : productData.productPrice || 0,
          // Additional metadata
          _isFlashSale: true,
          _flashSaleData: flashSale,
        };
      })
      .filter(Boolean);

    // Combine and remove duplicates (flash sale products take priority)
    const combined = [...normalProducts];

    flashSaleProducts.forEach(flashProduct => {
      const flashProductId = getProductIdSafely(flashProduct.productId);
      const existingIndex = combined.findIndex(
        p => getProductIdSafely(p.productId) === flashProductId,
      );

      if (existingIndex !== -1) {
        combined[existingIndex] = flashProduct;
      } else {
        combined.push(flashProduct);
      }
    });

    return combined;
  }, [shows?.buyNowProducts, activeFlashSales]);

  // Update combined products when dependencies change
  useEffect(() => {
    setCombinedBuyNowProducts(getCombinedBuyNowProducts);
  }, [getCombinedBuyNowProducts]);

  const isAuthenticated = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    return !!(accessToken && user);
  };

  // ✅ ENHANCED: Authentication wrapper with pending action storage
  const requireAuth = async (actionName?: string) => {
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      console.log(
        '🔐 User not authenticated, storing pending action:',
        actionName,
      );

      // Store current screen and params for return navigation after login
      await storePendingAction({
        screen: 'LiveScreen',
        params: {
          stream: stream,
          simulcast: simulcast,
          id: streamId,
        },
        action: actionName || 'view_livestream',
      });

      // Show message to user
      Toast('Please login to continue');

      // Navigate to Login screen
      navigation.navigate('Login');

      return false;
    }

    return true;
  };
  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutProduct(null);
    setCheckoutFlashSaleId(null);
    setCheckoutBundleData(null);
  };

  const fetchProductStocks = async productIds => {
    if (!productIds.length) return {};

    try {
      const response = await axiosInstance.post('/products/stocks/batch', {
        productIds: productIds,
      });
      return response.data.data || {};
    } catch (error) {
      return {};
    }
  };
  // Add these functions to ShowDetailsPage
  const handleFlashSalePurchase = async (
    flashSaleId,
    productId,
    quantity = 1,
  ) => {
    const isAuth = await requireAuth();

    if (!isAuth) {
      return; // Exit if not authenticated
    }

    // Find the flash sale
    const flashSale = activeFlashSales.find(
      sale => sale.flashSaleId === flashSaleId || sale._id === flashSaleId,
    );
    // console.log(flashSale)
    if (!flashSale) {
      ToastAndroid.show('Flash sale not found or has ended', ToastAndroid.LONG);
      return;
    }

    // ✅ CHECK IF THIS IS A BUNDLE FLASH SALE
    if (flashSale.isBundle) {
      // Bundle flash sale - open BundleCheckoutSlider
      setCheckoutBundleData({
        bundleId: flashSale.bundleId || productId,
        flashSaleData: {
          flashSaleId: flashSale.flashSaleId || flashSale._id,
          flashPrice: flashSale.flashPrice,
          flashSaleEndTime: flashSale.endTime,
        },
        showId: streamId,
      });
      setCheckoutType('bundle_flash_sale');
      setCheckoutOpen(true);
      // ToastAndroid.show('Opening bundle checkout!', ToastAndroid.SHORT);
      return;
    }

    // ✅ REGULAR PRODUCT FLASH SALE - GET PRODUCT DATA FROM THE CORRECT LOCATION
    let productData = null;

    // Try direct productId first (populated product)
    if (flashSale.productId && typeof flashSale.productId === 'object') {
      productData = flashSale.productId;
    }
    // Try products array with full product data
    else if (
      flashSale.products &&
      flashSale.products[0] &&
      flashSale.products[0].fullProductData
    ) {
      productData = flashSale.products[0].fullProductData;
    }
    // Try products array - construct product object from available data
    else if (flashSale.products && flashSale.products[0]) {
      const firstProduct = flashSale.products[0];
      productData = {
        _id: firstProduct.productId, // This is the ID string
        title:
          firstProduct.productTitle || flashSale.title || 'Flash Sale Product',
        MRP: firstProduct.originalPrice || 0,
        productPrice: firstProduct.originalPrice || 0,
        images: firstProduct.productImage
          ? [{key: firstProduct.productImage}]
          : [],
        category: 'General',
        gstRate: 0,
        weight: {value: 230, unit: 'grams'},
      };
    }
    // Fallback - create minimal product
    else {
      productData = {
        _id: productId,
        title: flashSale.title || 'Flash Sale Product',
        productPrice: flashSale.originalPrice || 0,
        //MRP: flashSale.originalPrice || 0,
        images: [],
        category: 'General',
        gstRate: 0,
        weight: {value: 230, unit: 'grams'},
      };
    }

    if (!productData) {
      ToastAndroid.show(
        'Product information not available',
        ToastAndroid.SHORT,
      );
      return;
    }

    // Enhance with flash sale info
    const enhancedProduct = {
      ...productData,
      flashSale: {
        isActive: true,
        flashPrice: flashSale.flashPrice || flashSale.products?.[0]?.flashPrice,
        flashSaleId: flashSale.flashSaleId || flashSale._id,
        endsAt: flashSale.endTime,
        flashStock:
          flashSale.currentStock ||
          flashSale.products?.[0]?.currentFlashStock ||
          0,
        startsAt: flashSale.startTime,
      },
    };

    // Set checkout state
    setCheckoutProduct(enhancedProduct);
    //console.log('🛒 Setting checkout product:', enhancedProduct);
    setCheckoutType('flash_sale');
    setCheckoutFlashSaleId(flashSale.flashSaleId || flashSale._id);
    setCheckoutOpen(true);

    // ToastAndroid.show(
    //   'Opening checkout for flash sale item!',
    //   ToastAndroid.SHORT,
    // );
  };
  const {messages, isDataLoaded} = streamData;
  const {liked, likes, muted} = userInteractions;
  const {viewerCount, auctionVisible} = liveFeatures;
  const {optionModalVisible, reportVisible} = modalStates;

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showChekout, setShowCheckOut] = useState(false);
  const [showGiveawayChekout, setShowGiveawayCheckOut] = useState(false);
  const [showWinnerGiveaway, setShowWinnerGiveaway] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);

  // states for show registration
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [localRegistrationCount, setLocalRegistrationCount] = useState(0);
  const [productStocks, setProductStocks] = useState({});
  // Fetch stream data
  // console.log(show.host.userInfo._id)
  const fetchStreamData = useCallback(async () => {
    if (!streamId) return;

    try {
      setStreamData(prev => ({...prev, isDataLoaded: true}));

      const [response, userId] = await Promise.all([
        axiosInstance.get(`/shows/get/live/${streamId}`),
        AsyncStorage.getItem('userId'),
      ]);
      const showData = response.data;

      const buyNowProductIds =
        showData?.buyNowProducts
          ?.map(p => getProductIdSafely(p.productId))
          .filter(Boolean) || [];

      if (buyNowProductIds.length > 0) {
        const stocks = await fetchProductStocks(buyNowProductIds);
        setProductStocks(stocks);
      }

      // ✅ FIX: Extract and populate current auction state from API response
      if (showData?.currentAuction) {
        console.log('📦 [LiveScreen] Loading current auction from API:', showData.currentAuction);
        setAuctionActive(showData.currentAuction.isActive || false);
        setCurrentAuction({
          ...showData.currentAuction,
          timeRemaining: showData.currentAuction.timeRemaining || showData.currentAuction.duration || 30,
          duration: showData.currentAuction.duration || 30,
        });
      }

      setStreamData(prev => ({
        ...prev,
        show: response?.data,
        messages: response?.data?.comments || [],
        isDataLoaded: false,
      }));

      setUserInteractions(prev => ({
        ...prev,
        liked: response?.data?.likedBy?.includes(userId),
        likes: response?.data?.likedBy?.length || 0,
      }));
    } catch (error) {
      setStreamData(prev => ({...prev, isDataLoaded: false}));
    }
  }, [streamId]);
  // const fetchAuctionWinner = async id => {
  //   try {
  //     const response = auctionService.getAuctionWinner(streamId, id);

  //     const data = response;
  //     setBidderWon(data.data);
  //     setShowWinnerModal(true);
  //   } catch (error) {
  //     // Error fetching auction winner
  //   }
  // };
  // Initial data fetch
  useEffect(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  const handleCloseWinner = () => {
    setShowWinnerModal(false);
  };

  useEffect(() => {
    if (!streamId || !user) return;
    const id = streamId;

    // ✅ FIX: Use refs for cleanup to prevent silent failures
    const auctionChannelRef = { current: null };
    const auctionSubscriptionRef = { current: null };
    const cleanupCalledRef = { current: false };

    const setupAuctionAppSync = async () => {
      try {
        // console.log('🔌 [User] Setting up AppSync auction subscriptions for stream:', streamId);

        // Configure AppSync
        await configureAppSync();

        // Get the auctions channel path
        const channelPath = getAuctionsChannelPath(streamId);

        // Connect to the channel
        auctionChannelRef.current = await connectToChannel(channelPath);

        // ✅ FIX: Publish join_room event to request current auction state
        try {
          await events.post(channelPath, {
            eventType: 'join_room',
            streamId: streamId,
            timestamp: new Date().toISOString()
          });
          console.log('📤 [AuctionAppSync] Published join_room event to request current state');
        } catch (joinErr) {
          console.log('❌ [AuctionAppSync] Failed to publish join_room:', joinErr);
        }

        // Subscribe to auction events from backend
        auctionSubscriptionRef.current = await subscribeToChannel(auctionChannelRef.current, data => {
          try {
            // Extract event data with multiple fallback paths
            let eventType;
            let eventData;
            
            if (data?.eventType) {
              // Direct: {eventType: 'xxx', ...}
              eventType = data.eventType;
              eventData = data;
              // console.log('✅ Using direct structure');
            } else if (data?.event?.eventType) {
              // Single nest: {event: {eventType: 'xxx', ...}}
              eventType = data.event.eventType;
              eventData = data.event;
              // console.log('✅ Using single-nested structure');
            } else if (data?.event?.event?.eventType) {
              // Double nest: {event: {event: {eventType: 'xxx', ...}}}
              eventType = data.event.event.eventType;
              eventData = data.event.event;
              // console.log('✅ Using double-nested structure');
            } else {
              console.warn('⚠️ Unknown event structure, skipping');
              return;
            }
            

            // Skip if no valid eventType found
            if (!eventData || !eventData.eventType) {
              if (data && Object.keys(data).length > 0) {
                console.log(
                  '⚠️ [User Auction] Skipping invalid event structure',
                );
              }
              return;
            }

            // console.log(
            //   '📨 [User Auction AppSync] Received event:',
            //   eventData.eventType,
            //   eventData,
            // );

            // Ignore frontend command events
            const frontendCommands = [
              'start_auction',
              'place_bid',
              'clear_auction',
            ];
            if (frontendCommands.includes(eventData.eventType)) {
              console.log(
                '⏭️ [User Auction] Ignoring frontend command echo:',
                eventData.eventType,
              );
              return;
            }

            // Route to appropriate handler
            switch (eventData.eventType) {
              case 'auction_started':
                handleAuctionStarted(eventData);
                break;
              case 'timer_update':
                handleTimerUpdate(eventData);
                break;
              case 'auction_ended':
                handleAuctionEnded(eventData);
                break;
              case 'bid_updated':
                handleBidUpdated(eventData);
                break;
              default:
                console.log(
                  '⚠️ [User Auction AppSync] Unknown event type:',
                  eventData.eventType,
                );
            }
          } catch (error) {
            console.log('❌ [User Auction] Error processing event:', error);
          }
        });

        // console.log('✅ [User Auction] AppSync subscriptions active');
      } catch (error) {
        console.log('❌ [User Auction] Failed to setup AppSync:', error);
      }
    };

    const handleAuctionStarted = data => {
      console.log('🎬 [User Auction] Auction started:', data);

      setBidderWon('');
      handleCloseWinner();

      if (data.streamId === id || data.streamId === id.toString()) {
        setAuctionActive(true);
        // Ensure we use the initial timer values from the event
        const auctionData = {
          ...data,
          timeRemaining: data.timeRemaining || data.duration || 30,
          duration: data.duration || 30,
        };
        setCurrentAuction(auctionData);
        handleAuctionStart(auctionData);
      }
    };

    const handleTimerUpdate = data => {
      // console.log('⏱️ [User Auction] Timer update:', data);
      if (data.streamId === id || data.streamId === id.toString()) {
        setCurrentAuction(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            timeRemaining: data.timeRemaining,
            duration: data.duration || prev.duration,
          };
        });
      }
    };

    const handleAuctionEnded = data => {
      // console.log('🎯 [User Auction] Auction ended:', data);

      if (data.streamId === id || data.streamId === id.toString()) {
        // if (data.reserveMet) {
        // ✅ ENHANCED: Find and attach full product object
        const safeShow = streamData?.show || {};
        const safeAuctionProducts = safeShow?.auctionProducts || [];
        // console.log('[AUCTION ENDED]', data.auctionId);
        // Find the full product object that matches the auction product ID
        const fullProduct = safeAuctionProducts.find(
          p =>
            getProductIdSafely(p?.productId) ===
            getProductIdSafely(data.product),
        );

        // Enhance bidderWon data with full product object
        const enhancedBidderWon = {
          ...data,
          product: fullProduct?.productId || data.product,
          _fullProductData: fullProduct,
        };
        if (data.winner != null) {
          setBidderWon(enhancedBidderWon);
          setShowWinnerModal(true);
        }
      } else {
        console.log('❌ Stream ID mismatch - ignoring auction end');
      }
      setAuctionActive(false);
      setCurrentAuction(null);
      setStreamData(prev => {
        return {
          ...prev,
          show: {
            ...prev.show,
            currentAuction: null,
          },
        };
      });
    };

    const handleBidUpdated = data => {
      // console.log('💰 [User Auction] Bid updated:', data);

      if (data.streamId === id || data.streamId === id.toString()) {
        setCurrentAuction(prev => ({
          ...prev,
          currentHighestBid: data.highestBid,
          highestBidder: data.highestBidder,
          nextBids: data.nextBids,
        }));
      }
    };

    // Initialize AppSync
    setupAuctionAppSync();

    // Cleanup function
    return () => {
      // console.log('🧹 [User Auction] Cleaning up AppSync subscriptions');
      cleanupCalledRef.current = true;
      
      if (auctionChannelRef.current) {
        try {
          closeChannel(auctionChannelRef.current);
        } catch (error) {
          console.error('❌ [User Auction] Error closing channel:', error);
        }
      }
      
      if (auctionSubscriptionRef.current) {
        try {
          auctionSubscriptionRef.current.unsubscribe?.();
        } catch (error) {
          console.error('❌ [User Auction] Error unsubscribing:', error);
        }
      }
    };
  }, [streamId, user]);

  //   useEffect(() => {
  //     const id = streamId;
  //     if (!socket || !id) {
  //       return;
  //     }

  //     // Ensure socket is connected before joining room
  //     if (!socket.connected) {
  //       socket.connect();
  //     }

  //     socket.emit('joinRoom', id);

  //     socket.on('auctionStarted', data => {
  //       setBidderWon('');
  //       handleCloseWinner();

  //       if (data.streamId === id || data.streamId === id.toString()) {
  //         setAuctionActive(true);
  //         // Ensure we use the initial timer values from the event
  //         const auctionData = {
  //           ...data,
  //           timeRemaining: data.timeRemaining || data.duration || 30,
  //           duration: data.duration || 30,
  //         };
  //         setCurrentAuction(auctionData);
  //         handleAuctionStart(auctionData);
  //       }
  //     });

  //     socket.on('auctionEnded', data => {
  //       if (data.streamId === id || data.streamId === id.toString()) {
  //         // if (data.reserveMet) {
  //           // ✅ ENHANCED: Find and attach full product object
  //           const safeShow = streamData?.show || {};
  //           const safeAuctionProducts = safeShow?.auctionProducts || [];
  //           console.log("[AUCTION ENDED]",data.auctionId)
  //           // Find the full product object that matches the auction product ID
  //           const fullProduct = safeAuctionProducts.find(
  //             p =>
  //               getProductIdSafely(p?.productId) ===
  //               getProductIdSafely(data.product),
  //           );

  //           // Enhance bidderWon data with full product object
  //           const enhancedBidderWon = {
  //             ...data,
  //             product: fullProduct?.productId || data.product,
  //             _fullProductData: fullProduct,
  //           };
  //           if(data.winner!=null)
  // {
  //           setBidderWon(enhancedBidderWon);
  //           setShowWinnerModal(true);}
  //         }

  //         setAuctionActive(false);
  //         setCurrentAuction(null);
  //         setStreamData(prev => {
  //           return {
  //             ...prev,
  //             show: {
  //               ...prev.show,
  //               currentAuction: null,
  //             },
  //           };
  //         });
  //       // }
  //     });

  //     socket.on('bidUpdated', data => {
  //       if (data.streamId === id || data.streamId === id.toString()) {
  //         setCurrentAuction(prev => ({
  //           ...prev,
  //           currentHighestBid: data.highestBid,
  //           highestBidder: data.highestBidder,
  //           nextBids: data.nextBids,
  //         }));
  //       }
  //     });

  //     socket.on('timerUpdate', data => {
  //       if (data.streamId === id || data.streamId === id.toString()) {
  //         setCurrentAuction(prev => {
  //           if (!prev) return prev;
  //           return {
  //             ...prev,
  //             timeRemaining: data.timeRemaining,
  //             duration: data.duration || prev.duration,
  //           };
  //         });
  //       }
  //     });

  //     socket.on('auction_error', data => {
  //       // Auction error occurred
  //     });

  //     socket.on('bidRejected', data => {
  //       // Bid was rejected
  //     });

  //     return () => {
  //       if (socket) {
  //         socket.off('auctionStarted');
  //         socket.off('auctionEnded');
  //         socket.off('bidUpdated');
  //         socket.off('timerUpdate');
  //         socket.off('auction_error');
  //         socket.off('bidRejected');
  //         socket.emit('leaveRoom', id);
  //       }
  //     };
  //   }, [streamId, user, streamData?.show]);

  // Track screen focus/blur state using React Navigation's useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused - user is on this screen
      // console.log('🟢 LiveScreen FOCUSED - Setting isScreenActive = true');
      setIsScreenActive(true);

      // Return cleanup function that runs when screen loses focus
      return () => {
        // console.log('🔴 LiveScreen BLUR - Setting isScreenActive = false');
        setIsScreenActive(false);
      };
    }, []),
  );

  // ADD LOCAL TIMER FOR ROLLING COUNTDOWN
  useEffect(() => {
    if (!showRollingModal || rollingCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRollingCountdown(prev => {
        const newValue = Math.max(0, prev - 1);
        return newValue;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [showRollingModal, rollingCountdown]);

  const handleAuctionStart = data => {
    setStreamData(prev => {
      return {
        ...prev,
        show: {
          ...prev.show,
          currentAuction: data,
        },
      };
    });
  };

  const handleNavigateToProfile = useCallback(() => {
    if (!user) {
      Toast('Please Login to see profile.');
      navigation.navigate('Login');
      return;
    }
    const safeShow = streamData?.show || {};
    navigation.navigate('ViewSellerProdile', {
      id: safeShow?.host?.userInfo?.userName,
    });
  }, [navigation, streamData?.show?.host?.userInfo?.userName]);

  const fetchActiveGiveaway = React.useCallback(async () => {
    if (!streamId) return;

    // console.log('🎁 fetchActiveGiveaway called for streamId:', streamId);

    try {
      const response = await giveawayService.getActiveGiveaway(streamId);
      const data = response.data;

      // console.log('🎁 fetchActiveGiveaway response:', {
      //   success: response.success,
      //   hasData: !!data,
      //   data: data,
      // });

      if (data) {
        setCurrentGiveaway(data);
        // Update applicants count from initial load
        const applicantsCount = data.applicants?.length || 0;
        // console.log('🎁 Setting giveaway as active with', applicantsCount, 'applicants');

        if (!data?.isGiveawayEnded) setGiveawayApplicantsCount(applicantsCount);

        setStreamData(prevData => {
          const prevShow = prevData?.show || {};

          const updatedData = {
            ...prevData,
            show: {
              ...prevShow,
              currentGiveaway: {
                ...(data || {}), // ensure no crash
                isActive: true, // guaranteed to override
                applicants: data?.applicants || [],
                stats: {
                  totalApplicants: applicantsCount,
                  ...(data?.stats || {}),
                },
              },
            },
          };

          // console.log("🎁 Updated show.currentGiveaway:", updatedData.show.currentGiveaway);
          return updatedData;
        });
      } else {
        // console.log('🎁 No active giveaway found or response failed');
        // No active giveaway - clear it
        setGiveawayApplicantsCount(0);
        setCurrentGiveaway(null);
        setStreamData(prevData => ({
          ...prevData,
          show: {
            ...(prevData?.show || {}),
            currentGiveaway: null,
          },
        }));
      }
    } catch (error) {
      // console.error('🎁 fetchActiveGiveaway error:', error);
      setGiveawayApplicantsCount(0);
      setCurrentGiveaway(null);
      // Failed to get giveaway details
    }
  }, [streamId]);
  const handleBgaGiveawayStarted = useCallback(
    data => {
      // console.log(data,"giveaway stream")
      if (!data?._id && !data?.giveawayId) return;

      // FILTER: Only process if this event is for the current stream
      if (data.streamId !== streamId) {
        console.log('❌ Stream ID mismatch, ignoring giveaway start event');
        return;
      }

      // Update applicants count from giveaway data
      const applicantsCount =
        data?.applicants?.length || data?.stats?.totalApplicants || 0;
      if (!data?.isGiveawayEnded) setGiveawayApplicantsCount(applicantsCount);
      setCurrentGiveaway(data);
      // Update applicants count from initial load

      // Auto-popup giveaway start modal - explicitly open it
      setModalStates(prev => ({
        ...prev,
        isGiveawayVisible: true,
      }));

      setStreamData(prevData => {
        const safePrevData = prevData || {
          show: {},
          messages: [],
          isDataLoaded: false,
        };
        const prevShow = safePrevData.show || {};

        const updatedGiveawayProducts =
          prevShow.giveawayProducts?.map(product => {
            if (
              product.giveawayObjectId === data?._id ||
              product.giveawayObjectId === data?.giveawayObjectId
            ) {
              return {
                ...product,
                isActive: true,
                isGiveawayEnded: false,
                giveawayStatus: 'active',
              };
            }
            return product;
          }) || [];

        const updatedCurrentGiveaway = {
          ...data.giveaway,
          isActive: true,
          isGiveawayEnded: false,
          applicants: data?.applicants || [],
          stats: data?.stats || {totalApplicants: 0},
        };

        return {
          ...safePrevData, // Keep messages, isDataLoaded, etc.
          show: {
            ...prevShow, // Keep all existing show properties
            currentGiveaway: updatedCurrentGiveaway,
            giveawayProducts: updatedGiveawayProducts,
          },
        };
      });
    },
    [streamId],
  );

  // Correct handleBgaWinnerSelected
  const handleBgaWinnerSelected = useCallback(
    async data => {
      if (!data) return;
      if (data.streamId !== streamId) {
        console.log('❌ Stream ID mismatch, ignoring rolling event');
        return;
      }
      // Only show modals if user is on this screen
      if (!isScreenActive) return;

      // Close rolling modal immediately when winner is selected
      setShowRollingModal(false);
      setRollingCountdown(0);
      setRollingGiveawayId(null);

      // Close giveaway modal and reset applicants count
      setModalStates(prev => ({
        ...prev,
        isGiveawayVisible: false,
      }));
      setCurrentGiveaway(null);
      setGiveawayApplicantsCount(0);

      const response = await giveawayService.getGiveawayDetails(
        data?.giveawayId,
      );
      setGiveawayWon(response.data);

      // Show winner modal only if screen is active
      setShowWinnerGiveaway(true);
      setStreamData(prevData => {
        const prevShow = prevData?.show;
        if (!prevShow) return prevData;

        const updatedGiveawayProducts =
          prevShow.giveawayProducts?.map(product => {
            if (
              product.giveawayObjectId === data.giveawayId ||
              product.giveawayObjectId === data.giveaway?.giveawayObjectId ||
              getProductIdSafely(product.productId) ===
                getProductIdSafely(data.productId)
            ) {
              return {
                ...product,
                isActive: true,
                isGiveawayEnded: true,
                winner: data.winner,
                giveawayStatus: 'ended',
              };
            }
            return product;
          }) || [];

        return {
          ...prevData, // Keep messages, isDataLoaded, etc.
          show: {
            ...prevShow, // Keep all existing show properties
            currentGiveaway: prevShow.currentGiveaway
              ? {
                  ...prevShow.currentGiveaway,
                  winner: data.winner,
                  isActive: false,
                  isGiveawayEnded: true,
                }
              : null,
            giveawayProducts: updatedGiveawayProducts,
          },
        };
      });
    },
    [isScreenActive],
  );

  // ✅ MIGRATED: AppSync Giveaway Events Subscription
  useEffect(() => {
    if (!streamId || !user) {
      console.log('⚠️ [Giveaway Subscription] Missing streamId or user');
      return;
    }

    // ✅ FIX: Use refs for cleanup to prevent silent failures
    const giveawayChannelRef = { current: null };
    const giveawaySubscriptionRef = { current: null };
    const cleanupCalledRef = { current: false };

    const setupGiveawaySubscription = async () => {
      try {
        // console.log('🔌 [Giveaway Subscription] Setting up AppSync subscription for stream:', streamId);

        // Fetch active giveaway data first
        await fetchActiveGiveaway();

        // Configure AppSync
        await configureAppSync();

        // Get the giveaways channel path
        const channelPath = getGiveawaysChannelPath(streamId);

        // Connect to the channel
        giveawayChannelRef.current = await connectToChannel(channelPath);

        // Subscribe to all giveaway events
        giveawaySubscriptionRef.current = subscribeToChannel(
          giveawayChannelRef.current,
          data => {
            // console.log('📨 [LiveScreen Giveaway AppSync] Received event:', data);

            // Extract the actual event from the data wrapper
            const eventData = data.event;
            if (!eventData || !eventData.eventType) {
              console.warn(
                '⚠️ [LiveScreen Giveaway AppSync] Invalid event structure:',
                data,
              );
              return;
            }

            // console.log('📨 [LiveScreen Giveaway AppSync] Processing event type:', eventData.eventType);

            switch (eventData.eventType) {
              case 'giveaway_started': {
                // console.log('🎁 LiveScreen received giveaway started:', eventData);
                handleBgaGiveawayStarted(eventData);
                break;
              }

              case 'giveaway_application':
              case 'user_giveaway_application': {
                // console.log('👥 LiveScreen received application update:', eventData);

                if (eventData._id && currentGiveaway?._id) {
                  if (eventData._id !== currentGiveaway?._id) {
                    return;
                  }
                }

                const applicantsCount =
                  eventData.count || eventData.applicants?.length || 0;
                if (!eventData?.isGiveawayEnded) {
                  setGiveawayApplicantsCount(applicantsCount);
                }

                setStreamData(prevData => {
                  const prevShow = prevData?.show;
                  if (!prevShow || !prevShow?.currentGiveaway) return prevData;

                  return {
                    ...prevData,
                    show: {
                      ...prevShow,
                      currentGiveaway: {
                        ...prevShow.currentGiveaway,
                        applicants: eventData.applicants || [],
                        stats: {
                          ...prevShow.currentGiveaway.stats,
                          totalApplicants:
                            eventData.count ||
                            prevShow.currentGiveaway?.stats?.totalApplicants ||
                            0,
                        },
                      },
                    },
                  };
                });
                break;
              }

              case 'giveaway_rolling_started': {
                // console.log('🎲 LiveScreen received rolling start:', eventData);

                if (eventData.streamId !== streamId) {
                  console.log('❌ Stream ID mismatch, ignoring rolling event');
                  return;
                }

                if (!isScreenActive) {
                  // console.log('🔴 Rolling modal blocked - user not on LiveScreen');
                  return;
                }

                // console.log('🟢 Rolling modal allowed - user is on LiveScreen');

                const participants =
                  eventData.applicants || eventData.participants || [];
                const productTitle =
                  eventData.productTitle ||
                  eventData.giveaway?.productTitle ||
                  eventData.product?.title ||
                  'Giveaway Prize';
                const productImage =
                  eventData.productImage ||
                  eventData.giveaway?.productImage ||
                  eventData.product?.images?.[0]?.key ||
                  '';
                const giveawayId =
                  eventData.giveawayId ||
                  eventData.giveaway?._id ||
                  eventData._id;

                setRollingParticipants(participants);
                setRollingProductInfo({
                  title: productTitle,
                  image: productImage,
                });
                setRollingCountdown(eventData.countdownSeconds || 5);
                setRollingGiveawayId(giveawayId);
                setShowRollingModal(true);
                break;
              }

              case 'giveaway_countdown_tick': {
                // console.log('⏰ LiveScreen received countdown tick:', eventData);

                const dataGiveawayId =
                  eventData.giveawayId || eventData.giveaway?._id;
                if (
                  dataGiveawayId?.toString() === rollingGiveawayId?.toString()
                ) {
                  setRollingCountdown(eventData.countdown || 0);
                }
                break;
              }

              case 'giveaway_winner_selected': {
                // console.log('🏆 LiveScreen received winner:', eventData);
                handleBgaWinnerSelected(eventData);
                break;
              }

              case 'giveaway_ended': {
                // console.log('🔚 LiveScreen received giveaway ended:', eventData);

                if (!eventData) return;
                if (eventData.streamId !== streamId) return;

                setStreamData(prevData => {
                  const prevShow = prevData?.show;
                  if (!prevShow) return prevData;
                  if (!prevShow?.currentGiveaway) return prevData;

                  return {
                    ...prevData,
                    show: {
                      ...prevShow,
                      currentGiveaway: null,
                    },
                  };
                });

                setCurrentGiveaway(null);
                setGiveawayApplicantsCount(0);
                break;
              }

              default:
                console.log(
                  '⚠️ [LiveScreen Giveaway AppSync] Unknown event:',
                  eventData.eventType,
                );
            }
          },
          error => {
            console.error('❌ [Giveaway Subscription] AppSync error:', error);
          },
        );

        // console.log('✅ [Giveaway Subscription] AppSync subscription established');
      } catch (error) {
        console.error(
          '❌ [Giveaway Subscription] Failed to setup AppSync:',
          error,
        );
      }
    };

    setupGiveawaySubscription();

    return () => {
      // console.log('🧹 [Giveaway Subscription] Cleaning up AppSync subscriptions');
      cleanupCalledRef.current = true;
      
      if (giveawaySubscriptionRef.current) {
        try {
          giveawaySubscriptionRef.current.unsubscribe?.();
        } catch (error) {
          console.error('❌ [Giveaway Subscription] Error unsubscribing:', error);
        }
      }
      
      if (giveawayChannelRef.current) {
        try {
          closeChannel(giveawayChannelRef.current);
        } catch (error) {
          console.error('❌ [Giveaway Subscription] Error closing channel:', error);
        }
      }
    };
  }, [
    streamId,
    user,
    fetchActiveGiveaway,
    handleBgaGiveawayStarted,
    handleBgaWinnerSelected,
    isScreenActive,
    rollingGiveawayId,
    currentGiveaway,
  ]);

  // ✅ KEEP: BGA Socket for non-giveaway events (if any other events use BGA socket)
  useEffect(() => {
    const initBgaSocket = async () => {
      const id = streamId;
      if (!streamId || !user) return;

      try {
        await connectBgaSocket();

        bgaSocket.emit('join_stream', {streamId: streamId});
        bgaSocket.emit('user_joins_live', {userId: user?._id, streamId: id});

        // Note: Giveaway events are now handled by AppSync (see above useEffect)
        // Only keep BGA socket listeners for non-giveaway events if needed

        return () => {
          // Cleanup any remaining BGA socket listeners if needed
        };
      } catch (error) {
        console.error('Failed to setup BGA socket:', error);
      }
    };

    initBgaSocket();
  }, [streamId, user]);
  const handleLike = useCallback(async () => {
    try {
      // console.log('🔥 [Like] Button clicked!');

      // ✅ Check authentication before allowing like
      const isAuth = await requireAuth('like_stream');
      if (!isAuth) {
        return; // Exit if not authenticated - user will be navigated to login
      }

      const userId = await AsyncStorage.getItem('userId');
      if (!userId || !user) {
        return;
      }

      // console.log('✅ [Like] User authenticated:', {
      //   userId,
      //   userObjectId: user._id,
      //   userName: user.userName || user.name
      // });

      // Optimistic UI update
      const wasLiked = userInteractions.liked;
      setUserInteractions(prev => ({
        ...prev,
        liked: !prev.liked,
        likes: prev.liked ? Math.max(0, prev.likes - 1) : prev.likes + 1,
      }));

      // Call REST API to toggle like (which will trigger AppSync Events)
      try {
        await likeService.toggleLike(
          streamId,
          user._id,
          user.userName || user.name || 'User',
        );

        console.log('✅ [Like] API call successful');
      } catch (error) {
        console.error(
          '❌ [Like] API call failed, reverting optimistic update:',
          error,
        );

        // Revert optimistic update on error
        setUserInteractions(prev => ({
          ...prev,
          liked: wasLiked,
          likes: wasLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1),
        }));

        Toast('Failed to update like. Please try again.');
      }
    } catch (error) {
      console.error('❌ [Like] Error in like action:', error);
    }
  }, [streamId, user, userInteractions.liked]);
  // ✅ MIGRATED: AppSync Events subscription for like updates
  useEffect(() => {
    if (!streamId || !user) {
      // console.log('⚠️ [Like Subscription] Missing streamId or user');
      return;
    }

    // ✅ FIX: Use ref for cleanup to prevent silent failures
    const cleanupFnRef = { current: null };
    const cleanupCalledRef = { current: false };

    const setupLikeSubscription = async () => {
      try {
        // console.log('🔌 [Like Subscription] Setting up AppSync subscription for stream:', streamId);

        cleanupFnRef.current = await likeService.subscribeLikeUpdates(
          streamId,
          likeData => {
            // console.log('💛 [Like Subscription] Received like update:', likeData);

            // Update UI with received data
            setUserInteractions(prev => ({
              ...prev,
              likes: likeData.likes || 0,
              liked: likeData.likedBy?.includes(user._id) || false,
            }));
          },
          error => {
            console.error('❌ [Like Subscription] AppSync error:', error);
            // Don't show error to user, subscription will auto-retry
          },
        );

        // console.log('✅ [Like Subscription] AppSync subscription established');
      } catch (error) {
        console.error('❌ [Like Subscription] Failed to setup:', error);
      }
    };

    setupLikeSubscription();

    return () => {
      // console.log('🔌 [Like Subscription] Cleaning up');
      cleanupCalledRef.current = true;
      
      if (cleanupFnRef.current) {
        try {
          cleanupFnRef.current();
        } catch (error) {
          console.error('❌ [Like Subscription] Error during cleanup:', error);
        }
      }
    };
  }, [streamId, user]);
  // ✅ CONSOLIDATED Socket listener for like updates - BGA Socket only
  // useEffect(() => {
  //   const initBgaLikeSocket = async () => {
  //     if (!streamId || !user) {
  //       return;
  //     }

  //     try {
  //       await connectBgaSocket();

  //       // BGA Like Event Handler
  //       const handleBgaLikesUpdated = data => {
  //         // Filter: Only process if this event is for the current stream
  //         if (data.streamId !== streamId) {
  //           return;
  //         }

  //         setUserInteractions(prev => ({
  //           ...prev,
  //           likes: data.likes,
  //           liked: data.likedBy?.includes(user?._id) || false,
  //         }));
  //       };

  //       // Listen for BGA like events
  //       addBgaSocketListener('likes_updated', handleBgaLikesUpdated);

  //       return () => {
  //         removeBgaSocketListener('likes_updated', handleBgaLikesUpdated);
  //       };
  //     } catch (error) {
  //       // Error during like socket setup
  //     }
  //   };

  //   initBgaLikeSocket();
  // }, [streamId, user]);
  const currentAuctionProduct = useMemo(() => {
    const safeShow = streamData?.show || {};
    const safeAuctionProducts = safeShow?.auctionProducts || [];
    const safeCurrentAuction = currentAuction || {};

    return safeAuctionProducts.find(
      p =>
        getProductIdSafely(p?.productId) ===
        getProductIdSafely(safeCurrentAuction?.product),
    );
  }, [streamData?.show, currentAuction]);

  // Calculate action button position based on keyboard and auction state
  const actionButtonBottom = useMemo(() => {
    if (isKeyboardVisible) return ACTION_BUTTON_POSITIONS.withKeyboard;
    // Show lower position when either auction is active OR flash sales are active
    if (auctionActive || (activeFlashSales && activeFlashSales.length > 0)) {
      return ACTION_BUTTON_POSITIONS.withAuction;
    }
    return ACTION_BUTTON_POSITIONS.withoutAuction;
  }, [isKeyboardVisible, auctionActive, activeFlashSales]);

  // Calculate main content container positioning - RESPONSIVE FIX
  const mainContentStyle = useMemo(() => {
    const baseStyle = {
      position: 'absolute',
      left: 0,
      right: 10,
      // backgroundColor:'red',

      zIndex: 1,
      // borderWidth:2,borderColor:'gray',
      // right:isKeyboardVisible?0:65,
      // width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'box-none',
    };

    if (isKeyboardVisible) {
      // Calculate available space above keyboard
      const topReservedSpace = insets.top + 150; // Header + controls space
      const availableHeight = SCREEN_HEIGHT - keyboardHeight - topReservedSpace;
      const minHeight = 400; // Minimum height to show comments

      // Ensure we have enough space to show comments
      const calculatedHeight = Math.max(
        minHeight,
        Math.min(availableHeight, SCREEN_HEIGHT * 0.6),
      );

      return {
        ...baseStyle,
        bottom: keyboardHeight + 6, // Small padding above keyboard
        height: calculatedHeight,
      };
    }

    // Default positioning when keyboard is hidden
    // When auction is active, need more space for both auction overlay and comments
    const auctionOverlayHeight = auctionActive ? 200 : 0; // Auction overlay takes ~200px
    const minCommentsHeight = 400; // Minimum height for comments
    const totalRequiredHeight = auctionOverlayHeight + minCommentsHeight;

    // Check if Add Info button is visible (matches the condition in the render)
    const isAddInfoVisible =
      !streamData?.show?.liveStreamId ||
      streamData?.show?.showStatus === 'created';

    return {
      ...baseStyle,
      bottom: isAddInfoVisible ? 60 : 6,
      height: Math.max(totalRequiredHeight, Math.min(SCREEN_HEIGHT * 0.6, 600)), // Ensure at least 600px when auction active
    };
  }, [
    isKeyboardVisible,
    keyboardHeight,
    insets.top,
    auctionActive,
    streamData?.show?.liveStreamId,
    streamData?.show?.showStatus,
  ]);
  //
  // console.log(mainContentStyle)
  // Handlers
  const handleOpenGiveawayModal = useCallback(() => {
    setModalStates(prev => ({
      ...prev,
      isGiveawayVisible: !prev.isGiveawayVisible,
    }));
    // return;
    // if (safeShow?.currentGiveaway?.isActive) {
    // } else {
    //   ToastAndroid.show('Giveaway is not active', ToastAndroid.SHORT);
    //   setModalStates(prev => ({...prev, isGiveawayVisible: false}));
    // }
  }, []);

  const handleNavigateToStore = useCallback(
    (activeTab = '') => {
      if (!user) {
        Toast('Please Login to see store.');
        navigation.navigate('Login');
        return;
      }
      // Make sure we're not passing any event objects in navigation params
      const params = activeTab
        ? {
            id: streamId,
            activeTab: activeTab || null,
            combinedBuyNowProducts: combinedBuyNowProducts || null,
            productStocks: productStocks || null,
          }
        : {
            id: streamId,
            combinedBuyNowProducts: combinedBuyNowProducts || null,
            productStocks: productStocks || null,
          };
      navigation.navigate('StoreScreen', params);
    },
    [navigation, streamId, combinedBuyNowProducts, productStocks],
  );

  const handleunfollowfollow = async () => {
    // ✅ Check authentication before allowing follow/unfollow
    const isAuth = await requireAuth('follow_user');
    if (!isAuth) {
      return; // Exit if not authenticated - user will be navigated to login
    }

    if (isFollowing) {
      setIsFollowing(false);
      unfollowUser(host);
    } else {
      setIsFollowing(true);
      followUser(host);
    }
  };
  // Component renderers
  const renderStreamerInfo = () => (
    <View style={[styles.streamerInfo]}>
      <TouchableOpacity
        onPress={handleNavigateToProfile}
        style={styles.streamerInfoContent}>
        {stream?.sellerProfileURL || show?.host?.userInfo?.profileURL?.key ? (
          <Image
            source={{
              uri: `${AWS_CDN_URL}${
                stream?.sellerProfileURL ||
                show?.host?.userInfo?.profileURL?.key
              }`,
            }}
            style={styles.streamerImage}
          />
        ) : (
          <View style={styles.streamerImagePlaceholder}>
            <Text style={styles.streamerInitial}>
              {show?.host?.companyName?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {/* {console.log('stream info render',stream)} */}
      <View style={styles.streamerDetails}>
        <TouchableOpacity onPress={handleNavigateToProfile}>
          <Text style={styles.streamerName}>
            {show?.host?.companyName || 'Anonymous'}
          </Text>
        </TouchableOpacity>
        {user?._id != host && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && {backgroundColor: '#F7CE45'},
            ]}
            onPress={handleunfollowfollow}>
            <Text
              style={[
                styles.followButtonText,
                isFollowing ? {color: '#000'} : styles.shadowcolor,
              ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.topRightActions}>
        {show?.showStatus === 'created' && !show?.liveStreamId ? (
          <View style={[styles.viewerCountContainer, {marginTop: 10}]}>
            <TouchableOpacity
              onPress={() =>
                ToastAndroid.show(
                  `${localRegistrationCount} people have registered so far`,
                  ToastAndroid.SHORT,
                )
              }
              style={[
                styles.viewerCountButton,
                {backgroundColor: '#00000080'},
              ]}>
              <UserRound size={16} color="#ffd700" />
              <Text style={[styles.viewerCountText, {color: '#fff'}]}>
                {localRegistrationCount}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.viewerCountContainer, {marginTop: 10}]}>
            <TouchableOpacity style={styles.viewerCountButton}>
              <UserRound size={16} color="white" />
              <Text style={styles.viewerCountText}>
                {formatFollowerCount(viewerCount)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {show?.showStatus !== 'created' && show?.liveStreamId && (
          <TouchableOpacity
            style={[styles.actionIcon, {alignSelf: 'center'}]}
            onPress={() => setShareModal(true)}>
            <Feather
              name="upload"
              size={20}
              color="#eee"
              style={styles.iconShadow}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={[styles.actionButtonsContainer, {bottom: actionButtonBottom}]}>
      <View style={styles.actionButton}>
        <LikeButton
          initialLiked={liked}
          initialLikes={likes || 0}
          onLike={handleLike}
          isShowUpcoming={show?.showStatus === 'created' || !show?.liveStreamId}
        />
        {likes > 0 && <Text style={styles.actionText}>{likes}</Text>}
      </View>

      <TouchableOpacity
        disabled={show?.showStatus === 'created' || !show?.liveStreamId}
        style={styles.actionIcon}
        onPress={() =>
          setUserInteractions(prev => ({...prev, muted: !prev.muted}))
        }>
        <Octicons name={muted ? 'mute' : 'unmute'} size={25} color="#fff" />
      </TouchableOpacity>

      {/* Picture-in-Picture Button */}
      {pipState.isSupported && show?.liveStreamId && (
        <TouchableOpacity
          style={[
            styles.actionIcon,
            pipState.isLoading && styles.actionIconDisabled,
          ]}
          onPress={pipActions.togglePIP}
          disabled={pipState.isLoading || show?.showStatus === 'created'}
          accessibilityLabel={
            pipState.isActive
              ? 'Exit Picture-in-Picture'
              : 'Enter Picture-in-Picture'
          }>
          {pipState.isActive ? (
            <Maximize2 size={25} color="#F7CE45" />
          ) : (
            <Minimize2 size={25} color="#fff" />
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.actionIcon}
        onPress={() =>
          setModalStates(prev => ({...prev, optionModalVisible: true}))
        }>
        <Image
          source={require('../../assets/images/wallet.png')}
          style={styles.actionImage}
        />
      </TouchableOpacity>
      {!isKeyboardVisible && (
        <TouchableOpacity
          style={styles.flashSaleButton}
          onPress={() => {
            if (activeFlashSales.length > 0) {
              handleNavigateToStore('Buy now');
            } else {
              Toast('No active flash sales at the moment.');
            }
          }}
          accessibilityLabel={`Flash Sales (${activeFlashSales.length} active)`}>
          <View style={styles.flashSaleContent}>
            <Zap size={18} color="#ffffff" />
            {activeFlashSales.length > 0 && (
              <View style={styles.flashSaleBadge}>
                <Text style={styles.flashSaleBadgeText}>
                  {activeFlashSales.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTopActions = () => {
    // Debug log
    // console.log('🎁 Giveaway Badge Debug:', {
    //   hasCurrentGiveaway: !!show?.currentGiveaway,
    //   isActive: show?.currentGiveaway?.isActive,
    //   applicantsCount: giveawayApplicantsCount,
    // });

    return (
      <View
        style={[
          styles.topActionsContainer,
          {
            top: insets.top + 66,
            zIndex: isKeyboardVisible ? 1 : 2,
            // borderWidth:2,borderColor:'red'
          },
        ]}>
        <TouchableOpacity
          style={styles.giveawayButton}
          onPress={() => handleOpenGiveawayModal()}>
          <Image
            source={require('../../assets/images/gift-box.png')}
            style={styles.actionImage}
          />
          {/* Show green badge with count when there are applicants AND giveaway is NOT ended */}
          {giveawayApplicantsCount > 0 &&
            !show?.currentGiveaway?.isGiveawayEnded &&
            !currentGiveaway?.isGiveawayEnded && (
              <View style={styles.giveawayApplicantBadge}>
                <Users size={12} color="#fff" />
                <Text style={styles.giveawayBadgeText}>
                  {giveawayApplicantsCount > 99
                    ? '99+'
                    : giveawayApplicantsCount}
                </Text>
              </View>
            )}
          {/* Show red dot when giveaway is active but no applicants yet */}
          {(show?.currentGiveaway?.isActive || currentGiveaway) &&
            !show?.currentGiveaway?.isGiveawayEnded &&
            !currentGiveaway?.isGiveawayEnded &&
            giveawayApplicantsCount == 0 && (
              <View style={styles.giveawayBadge} />
            )}
        </TouchableOpacity>
      </View>
    );
  };
  const handleShareSuccess = async (platform, _chatIds) => {
    try {
      if (!user?._id || !streamId) return;

      // Record the share in backend
      const response = await livestreamShareService.recordShare(
        streamId,
        user._id,
        platform,
      );

      if (response.success) {
        // Successfully recorded share
      }
    } catch (error) {
      // Failed to record share
      // Don't show error to user, they successfully shared even if tracking failed
    }
  };
  // console.log('show', show?.host?.userInfo?._id, user?._id);

  // Show Registration handler with optimistic update
  const handleRegistration = async () => {
    if (user?._id === show?.host?.userInfo?._id) {
      Toast('You cannot register for your own show.');
      return;
    }

    if (!user) {
      navigation.navigate('Login');
      return;
    }
    if (isRegistering || isRegistered) return;

    setIsRegistering(true);

    // Optimistic update - increment count immediately
    const newCount = localRegistrationCount + 1;
    setLocalRegistrationCount(newCount);
    setIsRegistered(true);

    try {
      const res = await axiosInstance.post(
        `register-show/${streamId}/register`,
      );
      if (res.data.status) {
        // Success - keep the optimistic update and emit event to Dashboard
        Toast('Successfully registered for the show!');

        // ✅ Emit registration event to notify Dashboard
        console.log(
          '📡 [LiveScreen] Emitting show registration event:',
          streamId,
        );
        RegisterEventEmitter.emitShowRegistered({
          showId: streamId,
          newCount: newCount,
          userId: user._id,
          registeredAt: new Date().toISOString(),
        });
      } else {
        // Revert optimistic update on failure
        setLocalRegistrationCount(prev => prev - 1);
        setIsRegistered(false);
        Toast(res.data.message || 'Registration failed');
      }
    } catch (err) {
      // Revert optimistic update on error
      setLocalRegistrationCount(prev => prev - 1);
      setIsRegistered(false);

      if (
        err.response?.status === 400 &&
        err.response.data?.message?.includes('already registered')
      ) {
        // Already registered is success, keep the optimistic update
        setLocalRegistrationCount(prev => prev + 1);
        setIsRegistered(true);
        Toast('Already registered.');

        // ✅ Emit registration event even for "already registered" case
        console.log(
          '📡 [LiveScreen] Emitting show registration event (already registered):',
          streamId,
        );
        RegisterEventEmitter.emitShowRegistered({
          showId: streamId,
          newCount: localRegistrationCount + 1,
          userId: user._id,
          registeredAt: new Date().toISOString(),
        });
      } else {
        Toast('Failed to register. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const checkRegistrationStatus = useCallback(async () => {
    try {
      const res = await axiosInstance.get(
        `/register-show/${streamId}/check-registration`,
      );
      if (res.data.status) {
        setIsRegistered(res.data.data.isRegistered);
        setTotalRegistrations(res.data.data.totalRegistrations || 0);
        // Initialize local count from server
        setLocalRegistrationCount(res.data.data.totalRegistrations || 0);
      }
    } catch (err) {
      // Error checking registration status
      console.log(err);
    }
  }, [streamId, user]);

  useEffect(() => {
    if (user) checkRegistrationStatus();
  }, [user, checkRegistrationStatus]);

  // Enable/disable auto-PIP based on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const {PictureInPictureModule} = require('react-native').NativeModules;

      // Enable auto-PIP when screen is focused
      if (PictureInPictureModule?.setAutoEnterPIP) {
        PictureInPictureModule.setAutoEnterPIP(true);
      }

      // Disable auto-PIP when screen loses focus (navigating away)
      return () => {
        if (PictureInPictureModule?.setAutoEnterPIP) {
          PictureInPictureModule.setAutoEnterPIP(false);
        }
      };
    }, []),
  );

  // ✅ FIX: Comprehensive cleanup on unmount with mounted flag
  // useEffect(() => {
  //   // Set mounted flag to true
  //   isMountedRef.current = true;

  //   return () => {
  //     // ✅ Set mounted flag to false FIRST to prevent any state updates
  //     isMountedRef.current = false;

  //     // ✅ Reset navigation flag on unmount
  //     isNavigatingRef.current = false;

  //     // Cleanup socket listeners
  //     if (socket && streamId) {
  //       socket.emit('leaveRoom', streamId);
  //       socket.off('auctionStarted');
  //       socket.off('auctionEnded');
  //       socket.off('bidUpdated');
  //       socket.off('timerUpdate');
  //       socket.off('auction_error');
  //       socket.off('bidRejected');
  //       socket.off(`likesUpdated-${streamId}`);
  //     }

  //     // Note: Giveaway events cleanup is now handled by AppSync subscription cleanup
  //     // BGA socket cleanup for other events (if any) can remain here
  //   };
  // }, []);
  // Loading state
  if (isDataLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F7CE45" />
        <Text style={styles.loadingText}>Loading Stream...</Text>
      </View>
    );
  }

  // console.log(WinnerModal,"STREAMADAA")
  // console.log(modalStates.isGiveawayVisible ,"------shodaataa")
  return (
    // <SafeAreaView edges={["bottom"]}>
    <SafeAreaView style={styles.container}>
      {/* Hide all UI when app is in background (PIP mode) */}
      {!isAppInBackground && optionModalVisible && (
        <PaymentBottomSheet
          isOpen={optionModalVisible}
          selectedAddress={selectedAddress}
          navigation={navigation}
          isCLose={() =>
            setModalStates(prev => ({...prev, optionModalVisible: false}))
          }
        />
      )}
      <ShareModal
        isOpen={shareModal}
        onClose={() => setShareModal(false)}
        onShare={handleShareSuccess}
        liveStreamData={show}
        source={'liveVideo'}
        shareUrl={`${shareUrl}user/show/${show?._id}`}
        shareContent={`Premimum Stream live now! don't miss it\n`}
      />
      <NotesBottomSheet
        visible={noteModal}
        onClose={() => setNoteModal(false)}
        note={show?.notes}
      />
      {/* Video and UI Container */}
      <View style={styles.contentContainer}>
        {/* Always render video in the same container - just hide UI when in background */}
        <View
          style={[
            isAppInBackground ? styles.pipOnlyContainer : styles.videoContainer,
            {borderWidth: 0, borderColor: 'red'},
          ]}>
          {!(!show?.liveStreamId || show?.showStatus === 'created') ? (
            <Viewer
              setViewerCount={count =>
                setLiveFeatures(prev => ({...prev, viewerCount: count}))
              }
              navigation={navigation}
              isMuted={muted}
              setIsMuted={muted =>
                setUserInteractions(prev => ({...prev, muted}))
              }
              streamId={show?.liveStreamId}
            />
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Image
                source={{
                  uri: `${AWS_CDN_URL}${show?.thumbnailImage}`,
                }}
                style={{width: '100%', height: '100%'}}
              />

              {/* Overlay Container with Blur Effect */}
              <View style={styles.upcomingShowOverlay}>
                <View style={styles.blurContainer}>
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="dark"
                    blurAmount={6}
                    reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.8)"
                  />
                  <View style={styles.blurContent}>
                    <Text style={styles.showStartsLabel}>Show Starts</Text>
                    <Text style={styles.showTimeText}>
                      {formatShowDateTime(show?.scheduledAt)}
                    </Text>

                    <TouchableOpacity
                      style={styles.shareShowButton}
                      onPress={async () => {
                        const isAuth = await requireAuth('share_show');
                        if (isAuth) {
                          setShareModal(true);
                        }
                      }}>
                      <Feather name="upload" size={18} color="#000" />
                      <Text style={styles.shareShowButtonText}>Share Show</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleRegistration}
                      style={[
                        styles.addToCalendarButton,
                        (isRegistering || isRegistered) &&
                          styles.addToCalendarButtonDisabled,
                      ]}
                      disabled={isRegistering || isRegistered}>
                      {isRegistering ? (
                        <>
                          <ActivityIndicator size="small" color="#000" />
                          <Text style={styles.addToCalendarButtonText}>
                            Registering...
                          </Text>
                        </>
                      ) : isRegistered ? (
                        <>
                          <MaterialIcons
                            name="check-circle"
                            size={18}
                            color="#4CAF50"
                          />
                          <Text
                            style={[
                              styles.addToCalendarButtonText,
                              {color: '#4CAF50'},
                            ]}>
                            Registered
                          </Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="event" size={18} color="#000" />
                          <Text style={styles.addToCalendarButtonText}>
                            Register
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {user?._id === host && (
                      <TouchableOpacity
                        style={styles.simulcastShareButton}
                        onPress={() => setShowSimulcastShareModal(true)}>
                        <Cast size={18} color="#a855f7" />
                        <Text style={styles.simulcastShareButtonText}>
                          Simulcast
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Simulcast Share Button - Only for Users with simulcast link*/}
                    {showSimulcastSetup &&
                      user?._id !== host &&
                      !show?.liveStreamId && (
                        <TouchableOpacity
                          style={styles.simulcastShareButton}
                          onPress={() => setShowSimulcastModal(true)}>
                          <Cast size={18} color="#a855f7" />
                          <Text style={styles.simulcastShareButtonText}>
                            Simulcast
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Hide ALL UI elements when app is in background - only show when app is active */}
        {!isAppInBackground && (
          <>
            {/* Streamer info */}
            {renderStreamerInfo()}

            {/* Notes Button */}
            {(show?.liveStreamId || show?.showStatus !== 'created') && (
              <TouchableOpacity
                style={[styles.notesButton, {top: insets.top + 70}]}
                onPress={() => setNoteModal(!noteModal)}>
                <Image
                  source={require('../../assets/images/notes.png')}
                  style={styles.actionImage}
                />
              </TouchableOpacity>
            )}

            {/* Overlays Container - Position at bottom */}
            {!isKeyboardVisible && (
              <View style={styles.overlaysContainer}>
                {(!show?.liveStreamId || show?.showStatus === 'created') && (
                  <TouchableOpacity
                    style={[styles.shareShowButton, styles.addInfoButton]}
                    onPress={async () => {
                      const isAuth = await requireAuth('add_info');
                      if (isAuth) {
                        setModalStates(prev => ({
                          ...prev,
                          optionModalVisible: true,
                        }));
                      }
                    }}>
                    {user &&
                    user?._id === show?.host?.userInfo?._id &&
                    !show?.liveStreamId &&
                    show?.showStatus === 'created' ? (
                      <>
                        <Feather name="play-circle" size={18} color="#000" />
                        <Text style={styles.shareShowButtonText}>
                          Start show
                        </Text>
                      </>
                    ) : (
                      <>
                        <Feather name="plus" size={18} color="#000" />
                        <Text style={styles.shareShowButtonText}>Add Info</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Comments Container - Position above overlays */}
            <View style={mainContentStyle}>
              <LiveComments
                streamId={streamId}
                prevComments={messages}
                feedBack={() =>
                  setModalStates(prev => ({...prev, reportVisible: true}))
                }
                navigateToStore={() => handleNavigateToStore()}
                isKeyboardVisible={isKeyboardVisible}
                requireAuth={requireAuth}
                onSwipeComplete={() =>
                  setModalStates(prev => ({
                    ...prev,
                    optionModalVisible: true,
                  }))
                }
                isShowUpcoming={
                  show?.showStatus === 'created' || !show?.liveStreamId
                }
              />

              {!isKeyboardVisible && (
                <LiveFlashSaleOverlay
                  activeFlashSales={activeFlashSales}
                  currentTime={currentTime}
                  onPurchase={handleFlashSalePurchase}
                  requireAuth={requireAuth}
                  formatTime={formatTime}
                  calculateTimeLeft={calculateTimeLeft}
                  calculateProgress={calculateProgress}
                  calculateDiscount={calculateDiscount}
                />
              )}
              {auctionActive && !isKeyboardVisible && (
                // <View style={styles.auctionWrapper}>
                <AuctionsOverlay
                  currentAuction={currentAuction}
                  streamId={streamId}
                  navigation={navigation}
                  product={currentAuctionProduct}
                />
                // </View>
              )}
            </View>
            {/* Top actions and action buttons */}
            {show?.liveStreamId &&
              show?.showStatus !== 'created' &&
              renderTopActions()}
            {!isKeyboardVisible &&
              show?.liveStreamId &&
              show?.showStatus !== 'created' &&
              renderActionButtons()}

            {/* Giveaway Overlay */}
            {modalStates.isGiveawayVisible && (
              <>
                {/* Backdrop for click-outside-to-close */}
                <TouchableOpacity
                  style={styles.giveawayBackdrop}
                  activeOpacity={1}
                  onPress={() => handleOpenGiveawayModal()}
                />

                {/* Modal Content */}
                <GiveawayUserInterface
                  streamId={streamId}
                  giveawayId={
                    show?.currentGiveaway?._id ||
                    show?.currentGiveaway?.giveawayId
                  }
                  onClose={() => handleOpenGiveawayModal()}
                  navigation={navigation}
                  isOpen={modalStates.isGiveawayVisible}
                  showData={show}
                  onFollowUpdate={() => handleCheckStats()}
                />
              </>
            )}
          </>
        )}
      </View>

      {/* Hide modals when app is in background */}
      {!isAppInBackground && (
        <ReportBottomSheet
          isOpen={reportVisible}
          isClose={() =>
            setModalStates(prev => ({...prev, reportVisible: false}))
          }
        />
      )}
      {checkoutOpen && (
        <>
          {checkoutType === 'bundle_flash_sale' ? (
            <BundleCheckoutSlider
              isOpen={checkoutOpen}
              onClose={handleCloseCheckout}
              bundleId={checkoutBundleData?.bundleId}
              flashSaleData={checkoutBundleData?.flashSaleData}
              showId={checkoutBundleData?.showId}
              currentTime={currentTime}
            />
          ) : checkoutType === 'flash_sale' ? (
            <LiveFlashSaleCheckoutSlider
              isOpen={checkoutOpen}
              onClose={handleCloseCheckout}
              product={checkoutProduct}
              flashSaleId={checkoutFlashSaleId}
              socketFlash={socketFlash}
              showId={streamId}
            />
          ) : (
            <CheckoutSlider
              isOpen={checkoutOpen}
              onClose={handleCloseCheckout}
              product={checkoutProduct}
              type={checkoutType}
            />
          )}
        </>
      )}
      {!isAppInBackground && (
        <WinnerModal
          isVisible={showWinnerModal}
          onClose={handleCloseWinner}
          auctionData={bidderWon}
          onCheckout={() => setShowCheckOut(true)}
          // product={currentAuctionProduct}
        />
      )}

      <AuctionCheckoutSlider
        isOpen={showChekout}
        onClose={() => setShowCheckOut(false)}
        auctionData={bidderWon}
        onCheckoutComplete={handleCloseWinner}
      />

      <GiveawayCheckoutSlider
        isOpen={showGiveawayChekout}
        onClose={() => setShowGiveawayCheckOut(false)}
        streamId={streamId}
        winnerInfo={giveawayWon?.winner}
        giveawayProduct={giveawayWon?.productDetails}
        giveawayId={
          show?.currentGiveaway?._id || show?.currentGiveaway?.giveawayId
        }
        onCheckoutComplete={() => {
          setShowWinnerGiveaway(false);
          setShowGiveawayCheckOut(false);
        }}
      />

      {/* Giveaway Winner Modal - Only show when user is on this screen and app is active */}
      {!isAppInBackground && isScreenActive && giveawayWon && showWinnerGiveaway && (
        <View >
        <GiveawayWinnerModal
          isVisible={showWinnerGiveaway}
          onClose={() => setShowWinnerGiveaway(false)}
          giveawayData={giveawayWon}
          winner={giveawayWon?.winner}
          onChecout={() => setShowGiveawayCheckOut(true)}
          isWinner={giveawayWon?.winner?.userId === user?._id}
        /></View>
      )}

      {/* Rolling Effect Modal for Giveaway - Only show when user is on this screen and app is active */}
      {!isAppInBackground && isScreenActive && (
             <View >
        <RollingEffectModal
          isVisible={showRollingModal}
          countdown={rollingCountdown}
          participants={rollingParticipants}
          productTitle={rollingProductInfo.title}
          productImage={rollingProductInfo.image}
          onComplete={() => {
            setShowRollingModal(false);
            setRollingCountdown(0);
            setRollingGiveawayId(null);
          }}
        />
        </View>
      )}
      {/* Simulcast Modal */}
      <SimulcastModal
        visible={showSimulcastModal}
        onClose={() => setShowSimulcastModal(false)}
        streamId={streamId}
        userId={user?._id}
        sellerId={show?.host?._id}
      />

      {/* Simulcast Share Modal */}
      <SimulcastShareModal
        visible={showSimulcastShareModal}
        onClose={() => setShowSimulcastShareModal(false)}
        streamId={streamId}
      />
      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && isScreenActive && !isAppInBackground && (
        <View style={styles.exitConfirmOverlay}>
          <View style={styles.exitConfirmModal}>
            <Text style={styles.exitConfirmTitle}>Leave Live Stream?</Text>
            <Text style={styles.exitConfirmMessage}>
              Are you sure you want to leave this live streaming?
            </Text>
            <View style={styles.exitConfirmButtons}>
              <TouchableOpacity
                style={[styles.exitConfirmButton, styles.exitCancelButton]}
                onPress={handleCancelExit}>
                <Text style={styles.exitCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitConfirmButton, styles.exitLeaveButton]}
                onPress={handleConfirmExit}>
                <Text style={styles.exitLeaveButtonText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
    // </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    height: 350,
    // backgroundColor:'#333',
    width: '80%',
    zIndex: 1,
    gap: 5,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: 200, // Ensure minimum height
  },
  pipOnlyContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  streamerInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
    // borderWidth:2,borderColor:'yellow',
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },

  flashSaleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  flashSaleContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  flashSaleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffd700', //'#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1c1917',
  },
  flashSaleBadgeText: {
    color: '#000', //'#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  streamerInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  streamerImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    // backgroundColor: '#455a64',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  streamerInitial: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  streamerDetails: {
    flex: 1,
    marginLeft: 5,
  },
  streamerName: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  followButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250, 250, 250, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  shadowcolor: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesButton: {
    position: 'absolute',
    left: 20,
    zIndex: 5,
    padding: 10,
  },
  topActionsContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  viewerCountContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  viewerCountButton: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  viewerCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  giveawayButton: {
    padding: 8,
    borderRadius: 20,
    position: 'relative',
  },
  giveawayBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: 'red',
    borderRadius: 8,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giveawayApplicantBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    gap: 2,
    minWidth: 28,
    flexDirection: 'row',
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  giveawayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 1,
    gap: 10,
    // borderWidth:2,borderColor:'green'
    // backgroundColor:'green'
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    borderRadius: 25,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
  actionImage: {
    height: 28,
    width: 28,
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  giveawayContainer1: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    width: '100%',
    zIndex: 3,
  },
  giveawayContainer: {
    position: 'absolute',
    top: 130,
    right: 60,
    width: '80%',
    zIndex: 3,
  },
  upcomingShowOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  blurContainer: {
    borderRadius: 16,
    width: '100%', // '90%',
    maxWidth: 350,
    // borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  blurContent: {
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  showStartsLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.9,
  },
  showTimeText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  shareShowButton: {
    backgroundColor: '#F7CE45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, //12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  shareShowButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  addToCalendarButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, //12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    gap: 8,
  },
  addToCalendarButtonDisabled: {
    // opacity: 0.7,
  },
  addToCalendarButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  overlaysContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 2,
  },
  addInfoButton: {
    alignSelf: 'center',
    width: '92%',
  },
  auctionWrapper: {
    marginBottom: 10,
    justifyContent: 'center',
    // backgroundColor:'red',
    // position:'absolute',
    height: 200,
    alignItems: 'center',
  },
  auctionContainer: {
    position: 'absolute',
    // bottom: 0,
    // left: 10,
    // right: 20,
  },
  simulcastShareButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  simulcastShareButtonText: {
    color: '#a855f7',
    fontSize: 16,
    fontWeight: '600',
  },

  exitConfirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  exitConfirmModal: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#333',
  },
  exitConfirmTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  exitConfirmMessage: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  exitConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exitConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exitCancelButton: {
    backgroundColor: '#333',
  },
  exitLeaveButton: {
    backgroundColor: '#dc2626',
  },
  exitCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exitLeaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  giveawayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  modalPortal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    elevation: 9998,
  },
});

export default LiveStreamScreen;
