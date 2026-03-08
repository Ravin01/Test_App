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
  Linking,
  NativeModules,
} from 'react-native';

// Third-party Libraries
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Global tracking for shown giveaway winner modals to prevent duplicates across screens
const SHOWN_GIVEAWAY_WINS_KEY = '@shown_giveaway_wins';

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
import { bgaSocketUrl, shareUrl, socketurl } from '../../../Config';
import { AWS_CDN_URL } from '../../Utils/aws';

// Hooks
import { usePictureInPicture } from '../../hooks/usePictureInPicture';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useFollowApi } from '../../Utils/FollowersApi';
import { useCallDetection } from '../Reels/hooks/useCallDetection';

// Context
import { AuthContext } from '../../Context/AuthContext';

// Services & APIs
import axiosInstance from '../../Utils/Api';
import { connectBgaSocket } from '../../Utils/BgaSocket';
import { formatFollowerCount, Toast } from '../../Utils/dateUtils';
import bgaSocket from '../../Utils/BgaSocket';
import giveawayService from './Services/giveawayService';
import livestreamShareService from '../../Services/livestreamShareService';
import { StreamEventEmitter } from '../../Utils/StreamEventEmitter';

import { RegisterEventEmitter } from '../../Utils/RegisterEventEmitter';
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
import { WinnerModal } from './Utils/WInnerModal';
import { GiveawayWinnerModal } from './Utils/WinnerGiveawayModal';
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
  getRegistrationChannelPath,
} from '../../Utils/appSyncConfig';

// ✅ NEW: Import flash sale AppSync configuration
import {
  subscribeToFlashSaleChannel,
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES,
} from '../../Utils/appSyncFlashSaleConfig';
import { flashbuynow, Gifts, noteWhite, wallet } from '../../assets/assets';
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
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

  return { isKeyboardVisible, keyboardHeight };
};

const LiveStreamScreen = React.memo<LiveScreenProps>(({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { stream, simulcast, reopenAuctionCheckout, auctionData: routeAuctionData } = route.params || {};

  // const [productInterests, setProductInterests] = useState({});
  const data = route.params;
  const streamId = stream?._id || data?.id;

  console.log('data', data);

  //console.log('🔴 [LiveScreen] Mounted for stream ID:', streamId);
  const { selectedAddress, user, storePendingAction }: any =
    useContext(AuthContext);

  //console.log('selected address', selectedAddress);

  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  // ✅ FIX: Initialize sockets inside component with refs for proper cleanup
  const socketFlashRef = useRef(null);

  // Track app state for PIP mode detection (more reliable than PIP events)
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  // ✅ FIX: Track if any checkout is open to prevent PiP during payment
  const [isAuctionCheckoutOpen, setIsAuctionCheckoutOpen] = useState(false);
  const [isFlashSaleCheckoutOpen, setIsFlashSaleCheckoutOpen] = useState(false);

  // ✅ NEW: Call detection for PIP mode - PIP only activates on incoming calls
  const { isInCall, callType } = useCallDetection();

  // ✅ Sync call state with native module for PIP
  useEffect(() => {
    const { PictureInPictureModule } = NativeModules;
    if (PictureInPictureModule?.setIncomingCallActive) {
      // Only trigger PIP mode on incoming/ringing calls, not outgoing
      const shouldTriggerPIP = isInCall && (callType === 'incoming');
      PictureInPictureModule.setIncomingCallActive(shouldTriggerPIP);
      console.log('📞 [LiveScreen] Call detection - isInCall:', isInCall, 'callType:', callType, 'shouldTriggerPIP:', shouldTriggerPIP);
    }
  }, [isInCall, callType]);

  // Picture-in-Picture functionality
  const [pipState, pipActions] = usePictureInPicture({
    autoEnterOnBackground: false, // ✅ DISABLED: PIP now only activates on incoming calls via native module
    autoEnterOnIncomingCall: true, // ✅ Enable PIP only for incoming calls
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
        setIsAuctionCheckoutOpen(false);
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
  const { followUser, checkFollowStatus, unfollowUser } = useFollowApi();
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

  // ✅ FIX: Use ref instead of state to prevent re-renders every second
  // Child components now manage their own internal timers
  const currentTimeRef = useRef(Date.now());

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutType, setCheckoutType] = useState('static');
  const [checkoutFlashSaleId, setCheckoutFlashSaleId] = useState(null);
  const [checkoutBundleData, setCheckoutBundleData] = useState(null);

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

  // ✅ MIGRATED: AppSync Flash Sale Subscriptions
  useEffect(() => {
    if (!streamId || !user) {
      console.log('⚠️ [Flash Sale Subscription] Missing streamId or user');
      return;
    }

    let channelRef = null;

    // ✅ Fetch initial active flash sales (both regular and bundles from SINGLE endpoint)
    const fetchInitialFlashSales = async () => {
      try {
        // console.log('🔍 [Flash Sale] Fetching initial active flash sales for show:', streamId);

        const response = await axiosInstance.get(`/shows/${streamId}/active-flash-sales`);

        // console.log('📡 [Flash Sale API] Full response:', JSON.stringify(response.data, null, 2));

        if (response.data?.status && response.data?.data?.activeFlashSales) {
          const activeFlashSales = response.data.data.activeFlashSales;

          // console.log(`✅ [Flash Sale] Received ${activeFlashSales.length} active flash sales`);
          // console.log(`   - Regular: ${response.data.data.breakdown?.regular || 0}`);
          // console.log(`   - Bundle: ${response.data.data.breakdown?.bundle || 0}`);

          const allMappedSales = activeFlashSales.map(sale => {
            if (sale.isBundle) {
              // Map bundle flash sale
              const mapped = {
                _id: sale.flashSaleId || sale._id,
                flashSaleId: sale.flashSaleId || sale._id,
                bundleId: sale.bundleId || sale.bundleSaleId || sale._id,
                showId: sale.showId,
                flashPrice: sale.flashPrice || sale.bundlePrice || 0,
                originalPrice: sale.originalPrice || sale.bundleMRP || 0,
                bundleQuantity: sale.bundleQuantity || sale.quantity || 0,
                startTime: sale.saleStartTime || sale.startTime || sale.flashSaleStartTime,
                endTime: sale.saleEndTime || sale.endTime || sale.flashSaleEndTime,
                duration: sale.duration,
                bundleTitle: sale.bundleTitle || sale.title || 'Bundle Flash Sale',
                bundleImage: sale.bundleImage || sale.image || {},
                products: sale.products || [],
                limitingProduct: sale.limitingProduct,
                bundlesSold: sale.bundlesSold || 0,
                isBundle: true,
              };
              // console.log('📦 [Bundle Flash Sale] Mapped:', mapped.flashSaleId);
              return mapped;
            } else {
              // Map regular product flash sale
              const mapped = {
                _id: sale.flashSaleId || sale._id,
                flashSaleId: sale.flashSaleId || sale._id,
                productId: sale.productDetails || sale.productId,
                showId: sale.showId,
                flashPrice: sale.flashPrice,
                originalPrice: sale.originalPrice,
                currentStock: sale.availableStock || sale.currentStock || 0,
                startTime: sale.saleStartTime || sale.startTime,
                endTime: sale.saleEndTime || sale.endTime,
                duration: sale.duration,
                isBundle: false,
              };
              // console.log('🛍️ [Product Flash Sale] Mapped:', mapped.flashSaleId);
              return mapped;
            }
          });

          // console.log('✅ [Flash Sale] Total mapped sales:', allMappedSales.length);
          setActiveFlashSales(allMappedSales);
        } else {
          // console.log('⚠️ [Flash Sale] No active flash sales found');
          setActiveFlashSales([]);
        }
      } catch (error) {
        console.error('❌ [Flash Sale] Failed to fetch initial sales:', error);
        setActiveFlashSales([]);
      }
    };

    // Event handlers
    const handleFlashSaleStarted = (eventData) => {
      // console.log('🎬 [Flash Sale] Processing live_flash_sale_started event');
      const flashSaleData = eventData.flashSale || eventData.data || eventData;
      // console.log('🎬 [Flash Sale] Extracted flash sale data:', JSON.stringify(flashSaleData, null, 2));

      setActiveFlashSales(prev => {
        // console.log('🎬 [Flash Sale] Current active sales before update:', prev.length);

        const saleId = flashSaleData.flashSaleId || flashSaleData._id;
        const exists = prev.some(sale =>
          sale._id === saleId || sale.flashSaleId === saleId
        );
        // console.log('🎬 [Flash Sale] Flash sale exists?', exists, 'ID:', saleId);

        if (!exists) {
          const newSale = {
            _id: saleId,
            flashSaleId: saleId,
            productId: flashSaleData.productDetails || flashSaleData.productId,
            showId: flashSaleData.showId,
            flashPrice: flashSaleData.flashPrice,
            originalPrice: flashSaleData.originalPrice,
            currentStock: flashSaleData.availableStock || flashSaleData.currentStock || 0,
            startTime: flashSaleData.saleStartTime || flashSaleData.startTime,
            endTime: flashSaleData.saleEndTime || flashSaleData.endTime,
            duration: flashSaleData.duration,
            isBundle: false,
          };
          // console.log('🎬 [Flash Sale] Adding new sale:', JSON.stringify(newSale, null, 2));
          const updated = [...prev, newSale];
          // console.log('🎬 [Flash Sale] Updated active sales count:', updated.length);
          return updated;
        }
        // console.log('🎬 [Flash Sale] Sale already exists, skipping');
        return prev;
      });
    };

    const handleFlashSaleEnded = (eventData) => {
      // console.log('🛑 [Flash Sale] Processing live_flash_sale_ended event');
      // console.log('🛑 [Flash Sale] Event data:', JSON.stringify(eventData, null, 2));
      const endedFlashSaleId = eventData.flashSaleId || eventData.data?.flashSaleId || eventData._id;
      // console.log('🛑 [Flash Sale] Ended flash sale ID:', endedFlashSaleId);

      setActiveFlashSales(prev => {
        // console.log('🛑 [Flash Sale] Current active sales before removal:', prev.length);
        const filtered = prev.filter(
          sale =>
            sale.isBundle ||
            (sale._id !== endedFlashSaleId &&
              sale.flashSaleId !== endedFlashSaleId),
        );
        // console.log('🛑 [Flash Sale] Active sales after removal:', filtered.length);
        return filtered;
      });
    };

    const handleStockUpdate = (eventData) => {
      // console.log('📦 [Stock Update] Received event:', JSON.stringify(eventData, null, 2));
      // console.log('📦 [Stock Update] Flash Sale ID:', eventData.flashSaleId);
      // console.log('📦 [Stock Update] New Stock:', eventData.currentStock || eventData.availableStock);

      setActiveFlashSales(prev => {
        // console.log('📦 [Stock Update] Current active sales before update:', prev.length);
        const updated = prev.map(sale => {
          if (!sale.isBundle) {
            const matches = sale._id === eventData.flashSaleId || sale.flashSaleId === eventData.flashSaleId;
            // console.log(`📦 [Stock Update] Checking sale ${sale.flashSaleId}: matches=${matches}`);

            if (matches) {
              const newStock = eventData.currentStock || eventData.availableStock || 0;
              // console.log(`✅ [Stock Update] Updating stock for ${sale.flashSaleId}: ${sale.currentStock} → ${newStock}`);
              return {
                ...sale,
                currentStock: newStock,
              };
            }
          }
          return sale;
        });

        // console.log('📦 [Stock Update] Update complete');
        return updated;
      });
    };

    const setupFlashSaleSubscription = async () => {
      try {
        // console.log('🔌 [Flash Sale Subscription] Setting up AppSync subscription for stream:', streamId);

        // ✅ First, fetch initial data
        await fetchInitialFlashSales();

        // Configure AppSync
        await configureAppSync();

        // Get the channel path using the provided function
        const channelPath = FLASH_SALE_CHANNELS.getLiveStreamChannel(streamId);

        // Subscribe to flash sale channel - returns channel object
        channelRef = await subscribeToFlashSaleChannel(
          channelPath,
          (eventData) => {
            // console.log('📨 [Flash Sale AppSync] Received event:', eventData.eventType);
            // console.log('📦 [Flash Sale AppSync] Full eventData:', JSON.stringify(eventData, null, 2));

            switch (eventData.eventType) {
              case 'CURRENT_ACTIVE_FLASH_SALES':
              case 'current_active_sales': {
                // Handle initial active sales
                const sales = eventData.activeSales || eventData.data || [];
                setActiveFlashSales(prev => {
                  const existingBundles = prev.filter(s => s.isBundle);
                  const newProducts = sales.map(sale => ({
                    ...sale,
                    flashSaleId: sale.flashSaleId || sale._id,
                    isBundle: false,
                  }));
                  return [...existingBundles, ...newProducts];
                });
                break;
              }

              case 'CURRENT_ACTIVE_BUNDLE_FLASH_SALES':
              case 'current_active_bundle_sales': {
                // Handle initial active bundle sales
                const sales = eventData.activeSales || eventData.data || [];
                setActiveFlashSales(prev => {
                  const existingProducts = prev.filter(s => !s.isBundle);
                  const newBundles = sales.map(sale => ({
                    ...sale,
                    isBundle: true,
                    endTime: sale.endTime || sale.endsAt || sale.flashSaleEndTime,
                    startTime: sale.startTime || sale.startsAt || sale.flashSaleStartTime,
                    flashSaleId: sale.flashSaleId || sale._id,
                    bundleId: sale.bundleId || sale._id,
                    bundleTitle: sale.bundleTitle || sale.title || 'Bundle Flash Sale',
                    bundleQuantity: sale.bundleQuantity || 0,
                    bundleImage: sale.bundleImage || {},
                    flashPrice: sale.flashPrice || sale.bundlePrice || 0,
                    originalPrice: sale.originalPrice || sale.bundleMRP || 0,
                  }));
                  return [...existingProducts, ...newBundles];
                });
                break;
              }

              case 'LIVE_STREAM_FLASH_SALE_STARTED':
              case 'live_flash_sale_started':
              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_STARTED:
                handleFlashSaleStarted(eventData);
                break;

              case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_STARTED:
              case 'BUNDLE_FLASH_SALE_STARTED':
              case 'bundle_flash_sale_started': {
                // Handle new bundle flash sale started
                // console.log('🎁 [Bundle Flash Sale] Processing bundle_flash_sale_started event');
                const data = eventData.flashSale || eventData;

                setActiveFlashSales(prev => {
                  const saleId = data.flashSaleId || data._id;
                  const exists = prev.some(sale =>
                    sale.flashSaleId === saleId || sale._id === saleId
                  );

                  // console.log('🎁 [Bundle Flash Sale] Bundle exists?', exists, 'ID:', saleId);

                  if (!exists) {
                    const newBundleSale = {
                      _id: saleId,
                      flashSaleId: saleId,
                      bundleId: data.bundleId || data.bundleSaleId || saleId,
                      showId: data.showId,
                      flashPrice: data.flashPrice || 0,
                      originalPrice: data.originalPrice || 0,
                      bundleQuantity: data.bundleQuantity || 0,
                      startTime: data.saleStartTime || data.startTime,
                      endTime: data.saleEndTime || data.endTime,
                      duration: data.duration,
                      bundleTitle: data.bundleTitle || 'Bundle Flash Sale',
                      bundleImage: data.bundleImage || {},
                      products: data.products || [],
                      limitingProduct: data.limitingProduct,
                      bundlesSold: data.bundlesSold || 0,
                      isBundle: true,
                    };
                    // console.log('🎁 [Bundle Flash Sale] Adding new bundle:', JSON.stringify(newBundleSale, null, 2));
                    const updated = [...prev, newBundleSale];
                    // console.log('🎁 [Bundle Flash Sale] Updated active sales count:', updated.length);
                    return updated;
                  }
                  // console.log('🎁 [Bundle Flash Sale] Bundle already exists, skipping');
                  return prev;
                });
                break;
              }

              case 'LIVE_STREAM_STOCK_UPDATE':
              case 'live_stream_stock_update':
              case 'stock_update':
              case FLASH_SALE_EVENT_TYPES.LIVE_STOCK_UPDATE:
              case FLASH_SALE_EVENT_TYPES.STOCK_UPDATE:
                // console.log('✅ [Flash Sale AppSync] Stock update event matched!');
                handleStockUpdate(eventData);
                break;

              case FLASH_SALE_EVENT_TYPES.BUNDLE_STOCK_UPDATE:
              // case 'BUNDLE_STOCK_UPDATE':
              case 'bundle_flash_sale_stock_update': {
                // Handle bundle stock update
                // console.log('📦 [Bundle Stock Update] Received event:', JSON.stringify(eventData, null, 2));
                setActiveFlashSales(prev => {
                  // console.log('📦 [Bundle Stock Update] Current bundles:', prev.filter(s => s.isBundle).length);
                  const updated = prev.map(sale => {
                    if (sale.isBundle && sale.flashSaleId === eventData.flashSaleId) {
                      // console.log(`✅ [Bundle Stock Update] Updating bundle ${sale.flashSaleId}`);
                      return {
                        ...sale,
                        bundleQuantity: eventData.bundleQuantity,
                        products: eventData.products,
                        limitingProduct: eventData.limitingProduct,
                        bundlesSold: eventData.bundlesSold,
                        _lastUpdate: Date.now(),
                      };
                    }
                    return sale;
                  });
                  return updated;
                });
                break;
              }

              case 'LIVE_STREAM_FLASH_SALE_ENDED':
              case 'live_flash_sale_ended':
              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ENDED:
              case FLASH_SALE_EVENT_TYPES.FLASH_SALE_ENDED:
                handleFlashSaleEnded(eventData);
                break;

              case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_ENDED:
              case 'BUNDLE_FLASH_SALE_ENDED': {
                // Handle bundle flash sale ended
                setActiveFlashSales(prev =>
                  prev.filter(
                    sale =>
                      !sale.isBundle || sale.flashSaleId !== eventData.flashSaleId,
                  ),
                );
                break;
              }

              default:
                console.log('⚠️ [Flash Sale AppSync] Unknown event type:', eventData.eventType);
            }
          }
        );

        // console.log('✅ [Flash Sale Subscription] AppSync subscription established');
      } catch (error) {
        console.error('❌ [Flash Sale Subscription] Failed to setup AppSync:', error);
      }
    };

    setupFlashSaleSubscription();

    return () => {
      // console.log('🧹 [Flash Sale Subscription] Cleaning up AppSync subscriptions');
      if (channelRef) {
        closeChannel(channelRef);
      }
    };
  }, [streamId, user]);

  // Destructure for easier access
  // Replace all accesses to streamData.show with safe access
  const show = streamData?.show || {};
  const [giveawayWon, setGiveawayWon] = useState(null);
  const [bidderWon, setBidderWon] = useState(null);
  const [auctionActive, setAuctionActive] = useState(false);
  const [currentAuction, setCurrentAuction] = useState(null);
  const [currentGiveaway, setCurrentGiveaway] = useState({});
  const currentGiveawayRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    currentGiveawayRef.current = currentGiveaway;
  }, [currentGiveaway]);

  //console.log('show',show);

  // ✅ FIX: Track if API has loaded auction data (shared across effects)
  const hasLoadedAuctionFromAPIRef = useRef(false);

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

  // ✅ FIX: Track giveaway wins that have already shown modal to prevent duplicates
  const shownGiveawayWinsRef = useRef<Set<string>>(new Set());
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

    // ✅ Emit stream ended event to notify Dashboard (Legacy code)
    // if (streamId && show?.liveStreamId) {
    //   // console.log('📡 [LiveScreen] Emitting stream ended event:', streamId);
    //   StreamEventEmitter.emitStreamEnded({
    //     streamId: streamId,
    //     liveStreamId: show.liveStreamId,
    //     endedAt: new Date().toISOString(),
    //   });
    // }
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
        showSimulcastShareModal ||
        showMiniProfile;

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
        setShowMiniProfile(false);

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
    setIsFlashSaleCheckoutOpen(false); // ✅ Re-enable PiP when flash sale checkout closes
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
    if (flashSale.productDetails && typeof flashSale.productDetails === 'object') {
      // Socket event has productDetails with full product info
      productData = flashSale.productDetails;

      //console.log('🛒 Using productDetails from flash sale:', productData);
    }
    else if (flashSale.productId && typeof flashSale.productId === 'object') {
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
          ? [{ key: firstProduct.productImage }]
          : [],
        category: 'General',
        gstRate: 0,
        weight: { value: 230, unit: 'grams' },

        // parentProductId: firstProduct.parentProductId ||  null,
        // childVariantIds: firstProduct.childVariantIds ||  [],
        // variantAttributes: firstProduct.variantAttributes ||  null,
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
        weight: { value: 230, unit: 'grams' },

        // parentProductId: flashSale.parentProductId ||  null,
        // childVariantIds: flashSale.childVariantIds ||  [],
        // variantAttributes: flashSale.variantAttributes ||  null,
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
      // ✅ Ensure weight field exists for delivery calculation
      weight: productData.weight || { value: 230, unit: 'grams' },
      flashSale: {
        isActive: true,
        flashPrice: flashSale.flashPrice || flashSale.products?.[0]?.flashPrice,
        flashSaleId: flashSale.flashSaleId || flashSale._id,
        endsAt: flashSale.saleEndTime || flashSale.endTime || flashSale.endsAt,

        childVariantIds: productData.childVariantIds || [],
        parentProductId: productData.parentProductId || null,
        isVariant: productData.isVariant || false,
        variantAttributes: productData.variantAttributes || [],
        flashStock:
          flashSale.currentStock ||
          flashSale.products?.[0]?.currentFlashStock ||
          0,
        startsAt: flashSale.saleStartTime || flashSale.startTime || flashSale.startsAt,
      },
    };

    // Set checkout state
    setCheckoutProduct(enhancedProduct);
    //console.log('🛒 Setting checkout product:', enhancedProduct);
    setCheckoutType('flash_sale');
    setCheckoutFlashSaleId(flashSale.flashSaleId || flashSale._id);
    setCheckoutOpen(true);
    setIsFlashSaleCheckoutOpen(true); // ✅ Disable auto-PiP when opening flash sale checkout

    // ToastAndroid.show(
    //   'Opening checkout for flash sale item!',
    //   ToastAndroid.SHORT,
    // );
  };
  const { messages, isDataLoaded } = streamData;
  const { liked, likes, muted } = userInteractions;
  const { viewerCount, auctionVisible } = liveFeatures;
  const { optionModalVisible, reportVisible } = modalStates;

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showChekout, setShowCheckOut] = useState(false);
  const [showGiveawayChekout, setShowGiveawayCheckOut] = useState(false);
  const [showWinnerGiveaway, setShowWinnerGiveaway] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  // ✅ Track if user has viewed notes in this session
  const [hasViewedNotes, setHasViewedNotes] = useState(false);

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
      setStreamData(prev => ({ ...prev, isDataLoaded: true }));

      const [response, userId] = await Promise.all([
        // axiosInstance.get(`/shows/get/live/${streamId}`),
        axiosInstance.get(`/shows/${streamId}/page-init`),
        AsyncStorage.getItem('userId'),
      ]);

      const { show: showData, registration, follow, address } = response?.data?.data;

      // console.log('📦 [LiveScreen] Fetched show data:', showData);
      // console.log('📦 [LiveScreen] Fetched registration data:', registration);
      // console.log('📦 [LiveScreen] Fetched follow data:', follow);
      // console.log('📦 [LiveScreen] Fetched address data:', address);
      // console.log('📦 [LiveScreen] Fetched user ID:', userId);
      // console.log('comment', showData?.comments);    // undefined

      setIsFollowing(follow?.isFollowing);

      const buyNowProductIds =
        showData?.buyNowProducts
          ?.map(p => getProductIdSafely(p.productId))
          .filter(Boolean) || [];

      if (buyNowProductIds.length > 0) {
        const stocks = await fetchProductStocks(buyNowProductIds);
        setProductStocks(stocks);
      }

      // ✅ FIX: Extract and populate current auction state from API response
      // console.log('📦 [LiveScreen] Loading current auction from API:', showData);
      // if (showData?.currentAuction) {
      //   // console.log('📦 [LiveScreen] Current auction isActive:', showData.currentAuction.isActive);

      //   // ✅ CRITICAL: Set both state variables to ensure auction displays after refresh
      //   const isActive = showData.currentAuction.isActive || false;
      //   setAuctionActive(isActive);

      //   const auctionData = {
      //     ...showData.currentAuction,
      //     isActive: isActive, // ✅ Ensure isActive is in the auction object
      //     timeRemaining: showData.currentAuction.timeRemaining || showData.currentAuction.duration || 30,
      //     duration: showData.currentAuction.duration || 30,
      //   };

      //   setCurrentAuction(auctionData);

      //   // ✅ CRITICAL: Mark that API has loaded auction data
      //   hasLoadedAuctionFromAPIRef.current = true;

      //   // console.log('✅ [LiveScreen] Auction state set from API:', {
      //   //   auctionActive: isActive,
      //   //   hasLoadedFromAPI: true,
      //   //   auctionData: auctionData
      //   // });
      // } else {
      //   // console.log('⚠️ [LiveScreen] No current auction in API response');
      //   setAuctionActive(false);
      //   setCurrentAuction(null);
      //   hasLoadedAuctionFromAPIRef.current = false;
      // }

      setStreamData(prev => ({
        ...prev,
        // show: response?.data,
        // messages: response?.data?.comments || [],

        show: showData,
        messages: showData?.comments || [],
        isDataLoaded: false,
      }));

      setUserInteractions(prev => ({
        ...prev,
        // liked: response?.data?.likedBy?.includes(userId),
        // likes: response?.data?.likedBy?.length || 0,

        liked: showData?.likedBy?.includes(userId),
        likes: showData?.likedBy?.length || 0,
      }));
    } catch (error) {
      setStreamData(prev => ({ ...prev, isDataLoaded: false }));
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

  const handleCloseWinner = useCallback(() => {
    setShowWinnerModal(false);
  }, []);

  // ✅ OPTIMIZED: Memoize auction checkout close handler to prevent rerenders
  const handleCloseAuctionCheckout = useCallback(() => {
    setShowCheckOut(false);
    setIsAuctionCheckoutOpen(false);
  }, []);

  // ✅ FIX: Reopen auction checkout modal when returning from address edit
  useEffect(() => {
    if (reopenAuctionCheckout && routeAuctionData) {
      console.log('🔓 [LiveScreen] Reopening auction checkout modal after address edit');
      setBidderWon(routeAuctionData);
      setShowCheckOut(true);
      setIsAuctionCheckoutOpen(true);

      // Clear the route params to prevent reopening on future navigations
      // Note: We don't need to clear as the navigation will naturally reset when leaving
    }
  }, [reopenAuctionCheckout, routeAuctionData]);

  // console.log(flashbuynow)
  useEffect(() => {
    if (!streamId || !user) return;
    const id = streamId;

    // ✅ FIX: Use refs for cleanup to prevent silent failures
    const auctionChannelRef = { current: null };
    const auctionSubscriptionRef = { current: null };
    const cleanupCalledRef = { current: false };

    const setupAuctionAppSync = async () => {
      try {
        // console.log('🔌 [LiveScreen AuctionAppSync] Setting up subscription for stream:', streamId);

        // Configure AppSync
        await configureAppSync();

        // Get the auctions channel path
        const channelPath = getAuctionsChannelPath(streamId);

        // Connect to the channel
        auctionChannelRef.current = await connectToChannel(channelPath);

        // ✅ CRITICAL FIX: Subscribe to auction events FIRST, THEN publish join_room
        // This ensures the subscription is ready to receive the backend's response
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
              // console.log(
              //   '⏭️ [User Auction] Ignoring frontend command echo:',
              //   eventData.eventType,
              // );
              return;
            }

            // Route to appropriate handler
            switch (eventData.eventType) {
              case 'auction_started':
                // console.log('🎬 [User Auction] Processing auction_started event');
                handleAuctionStarted(eventData);
                break;

              case 'current_auction_state':
              case 'auction_state':
              case 'request_current_auction_state_response':
                // ✅ Handle current auction state response (for late joiners)
                console.log('🔄 [User Auction] Received current auction state event:', eventData.eventType);
                console.log('🔄 [User Auction] Full event data:', JSON.stringify(eventData, null, 2));

                // Try multiple data extraction paths
                let auctionData = null;

                if (eventData.auction && typeof eventData.auction === 'object') {
                  // Path 1: eventData.auction
                  auctionData = eventData.auction;
                  console.log('✅ [User Auction] Extracted auction from eventData.auction');
                } else if (eventData.data && typeof eventData.data === 'object') {
                  // Path 2: eventData.data
                  auctionData = eventData.data;
                  console.log('✅ [User Auction] Extracted auction from eventData.data');
                } else if (eventData.currentAuction && typeof eventData.currentAuction === 'object') {
                  // Path 3: eventData.currentAuction
                  auctionData = eventData.currentAuction;
                  console.log('✅ [User Auction] Extracted auction from eventData.currentAuction');
                } else if (eventData.isActive !== undefined) {
                  // Path 4: eventData itself is the auction data
                  auctionData = eventData;
                  console.log('✅ [User Auction] Using eventData as auction data directly');
                }

                if (auctionData && (auctionData.isActive === true || auctionData.active === true)) {
                  console.log('✅ [User Auction] Active auction found, calling handleAuctionStarted');
                  handleAuctionStarted(auctionData);
                } else {
                  console.log('⚠️ [User Auction] No active auction in current state response');
                  console.log('⚠️ [User Auction] Auction data:', auctionData);
                }
                break;

              case 'timer_update':
                handleTimerUpdate(eventData);
                break;

              case 'auction_ended':
                // console.log('🎯 [User Auction] Processing auction_ended event');
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

        // ✅ NOW publish join_room AFTER subscription is set up
        // This ensures we can receive the backend's response with current auction state
        try {
          console.log('📤 [LiveScreen AuctionAppSync] Publishing join_room event for late joiner sync');

          await events.post(channelPath, {
            eventType: 'join_room',
            streamId: streamId,
            userId: user?._id,
            timestamp: new Date().toISOString(),
            requestCurrentState: true
          });

          console.log('✅ [LiveScreen AuctionAppSync] join_room published successfully');
        } catch (joinErr) {
          console.error('❌ [LiveScreen AuctionAppSync] Failed to publish join_room:', joinErr);
        }

      } catch (error) {
        console.log('❌ [User Auction] Failed to setup AppSync:', error);
      }
    };

    const handleAuctionStarted = data => {
      // console.log('🎬 [User Auction] Auction started event received');
      // console.log('🎬 [User Auction] Data:', {
      //   auctionId: data.auctionId,
      //   streamId: data.streamId,
      //   isActive: data.isActive,
      //   currentHighestBid: data.currentHighestBid,
      //   hasProduct: !!data.product
      // });
      // console.log('🎬 [User Auction] Current streamId:', id, 'Event streamId:', data.streamId);
      // console.log('🎬 [User Auction] Current auctionActive:', auctionActive, 'Current auction:', currentAuction);

      setBidderWon('');
      handleCloseWinner();

      if (data.streamId === id || data.streamId === id.toString()) {
        // console.log('✅ [User Auction] Stream ID match - processing auction start');

        // ✅ Mark that we've loaded auction data from AppSync
        hasLoadedAuctionFromAPIRef.current = true;

        // ✅ CRITICAL: Ensure we set isActive flag explicitly from event data
        const isActiveFromEvent = data.isActive !== undefined ? data.isActive : true;

        setAuctionActive(isActiveFromEvent);
        // console.log('✅ [LiveScreen] Setting auctionActive =', isActiveFromEvent, 'from handleAuctionStarted');

        // Ensure we use the initial timer values from the event
        const auctionData = {
          ...data,
          isActive: isActiveFromEvent, // ✅ Ensure isActive is in the auction object
          timeRemaining: data.timeRemaining || data.duration || 30,
          duration: data.duration || 30,
        };

        setCurrentAuction(auctionData);
        // console.log('✅ [LiveScreen] currentAuction set to:', {
        //   auctionId: auctionData.auctionId,
        //   isActive: auctionData.isActive,
        //   highestBid: auctionData.currentHighestBid,
        //   product: auctionData.product
        // });

        handleAuctionStart(auctionData);

        // ✅ Force re-render by updating stream data
        setStreamData(prev => ({
          ...prev,
          show: {
            ...prev.show,
            currentAuction: auctionData,
          },
        }));

        // console.log('✅ [LiveScreen] Auction state fully initialized for late joiner');
      } else {
        console.log('❌ [LiveScreen] Stream ID mismatch - ignoring auction start', {
          expected: id,
          received: data.streamId
        });
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

    const handleAuctionEnded = (data) => {
      // console.log('🎯 [User Auction] Auction ended:', data);

      if (data.streamId === id || data.streamId === id.toString()) {
        // console.log('✅ Auction ended - updating auction state');

        // 🔴 Stop auction state
        setAuctionActive(false);
        setCurrentAuction(null);

        // Clear currentAuction from stream data
        setStreamData(prev => ({
          ...prev,
          show: {
            ...prev?.show,
            currentAuction: null,
          },
        }));

        // ✅ Find full product data (same idea as web)
        const safeShow = streamData?.show || {};
        const auctionProducts = safeShow?.auctionProducts || [];

        let fullProductData = data.product;

        // If product is ID or incomplete, resolve it
        if (typeof data.product === 'string' || !data.product?.title) {
          const productId =
            typeof data.product === 'string'
              ? data.product
              : data.product?._id;

          const auctionProduct = auctionProducts.find(
            ap =>
              getProductIdSafely(ap?.productId) === productId ||
              ap?.auctionObjectId === data.auctionId
          );

          if (auctionProduct?.productId) {
            fullProductData = auctionProduct.productId;
            console.log('✅ Found full product data:', fullProductData);
          } else {
            console.warn('⚠️ Full product data not found, using fallback');
          }
        }

        // ✅ Enhance winner payload (mobile + web combined)
        const enhancedBidderWon = {
          ...data,
          _productId: data.product || currentAuction?._id,
          product: fullProductData,
          _fullProductData: fullProductData,
        };

        // 🏆 Show winner modal only if winner exists
        if (data.winner != null) {
          setBidderWon(enhancedBidderWon);

          // Optional delay like web
          setTimeout(() => {
            setShowWinnerModal(true);
          }, 800);
        }
      } else {
        console.log('❌ Stream ID mismatch - ignoring auction end');
      }
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

    // ✅ Initialize AppSync subscription
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

  //   useEffect(() => 
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

  const handleShowMiniProfile = useCallback(() => {
    if (!user) {
      Toast('Please Login to see profile.');
      navigation.navigate('Login');
      return;
    }
    setShowMiniProfile(true);
  }, [user]);

  const handleNavigateToProfile = useCallback(() => {
    if (!user) {
      Toast('Please Login to see profile.');
      navigation.navigate('Login');
      return;
    }
    const safeShow = streamData?.show || {};
    const userName = safeShow?.host?.userInfo?.userName;

    if (!userName) {
      console.warn('Cannot navigate: host has no userName.');
      return;
    }

    // Check if the clicked user is the logged-in user (own profile)
    const isOwnProfile = user?.userName === userName;

    if (isOwnProfile) {
      // Navigate to own profile screen in the bottom tab
      console.log('Navigating to own profile: AboutUserProfile');
      (navigation as any).navigate('bottomtabbar', {
        screen: 'HomeTabs',
        params: {
          screen: 'profile'
        }
      });
    } else {
      // Navigate to other user's profile
      console.log('Navigating to other user profile: ViewSellerProdile');
      navigation.navigate('ViewSellerProdile', {
        id: userName,
      });
    }
  }, [navigation, user, streamData?.show?.host?.userInfo?.userName]);

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

      // Auto-popup giveaway start modal - only if show is live
      // Don't auto-open for upcoming/scheduled shows (showStatus='created' without liveStreamId)
      if (show?.showStatus !== 'created' || show?.liveStreamId) {
        setModalStates(prev => ({
          ...prev,
          isGiveawayVisible: true,
        }));
      }

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
          stats: data?.stats || { totalApplicants: 0 },
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

      // ✅ FIX: Only show winner modal if this giveaway win hasn't been shown before (global tracking)
      const giveawayWinKey = `${data?.giveawayId}_${user?._id}`;

      // Check local ref first for quick check
      if (shownGiveawayWinsRef.current.has(giveawayWinKey)) {
        console.log('🔄 [LiveScreen] Giveaway winner modal already shown (local):', giveawayWinKey);
        return;
      }

      // Check global AsyncStorage for cross-screen tracking
      try {
        const shownWinsJson = await AsyncStorage.getItem(SHOWN_GIVEAWAY_WINS_KEY);
        const shownWins = shownWinsJson ? JSON.parse(shownWinsJson) : [];

        if (shownWins.includes(giveawayWinKey)) {
          console.log('🔄 [LiveScreen] Giveaway winner modal already shown (global):', giveawayWinKey);
          shownGiveawayWinsRef.current.add(giveawayWinKey); // Sync local ref
          return;
        }

        // Mark this giveaway win as shown globally
        shownWins.push(giveawayWinKey);
        await AsyncStorage.setItem(SHOWN_GIVEAWAY_WINS_KEY, JSON.stringify(shownWins));
        shownGiveawayWinsRef.current.add(giveawayWinKey);

        console.log('✅ [LiveScreen] Showing giveaway winner modal for:', giveawayWinKey);

        // Show winner modal only if screen is active and not already shown
        setShowWinnerGiveaway(true);
      } catch (error) {
        console.log('❌ [LiveScreen] Error checking shown wins:', error);
        // Still show modal on error to ensure user sees it
        shownGiveawayWinsRef.current.add(giveawayWinKey);
        setShowWinnerGiveaway(true);
      }
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

                const currentG = currentGiveawayRef.current;
                if (eventData._id && currentG?._id) {
                  if (eventData._id !== currentG?._id) {
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
            console.log('❌ [Giveaway Subscription] AppSync error:', error);
          },
        );

        // console.log('✅ [Giveaway Subscription] AppSync subscription established');
      } catch (error) {
        console.log(
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
  ]);

  // ✅ KEEP: BGA Socket for non-giveaway events (if any other events use BGA socket)
  // useEffect(() => {
  //   const initBgaSocket = async () => {
  //     const id = streamId;
  //     if (!streamId || !user) return;

  //     try {
  //       await connectBgaSocket();

  //       bgaSocket.emit('join_stream', {streamId: streamId});
  //       bgaSocket.emit('user_joins_live', {userId: user?._id, streamId: id});

  //       // Note: Giveaway events are now handled by AppSync (see above useEffect)
  //       // Only keep BGA socket listeners for non-giveaway events if needed

  //       return () => {
  //         // Cleanup any remaining BGA socket listeners if needed
  //       };
  //     } catch (error) {
  //       console.error('Failed to setup BGA socket:', error);
  //     }
  //   };

  //   initBgaSocket();
  // }, [streamId, user]);
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

  // ✅ AppSync: Setup registration count subscriptions
  useEffect(() => {
    if (!streamId) return;

    let registrationChannel = null;

    const setupRegistrationAppSync = async () => {
      try {
        console.log('🔌 [LiveScreen] Setting up AppSync registration subscriptions for show:', streamId);

        // Configure AppSync
        await configureAppSync();

        // Get the registration channel path
        const channelPath = getRegistrationChannelPath(streamId);

        // Connect to the channel
        registrationChannel = await connectToChannel(channelPath);

        // Subscribe to registration events
        const subscription = await subscribeToChannel(registrationChannel, (data) => {
          try {
            console.log('📨 [LiveScreen Registration AppSync] Received event:', data);

            const eventData = data?.event?.event || data?.event || data;

            if (!eventData || !eventData.eventType) {
              console.warn('⚠️ [LiveScreen Registration] Invalid event structure:', data);
              return;
            }

            // Handle registration count update
            if (eventData.eventType === 'registration:count-update') {
              console.log(`🔔 [LiveScreen Registration] Registration count updated for show ${streamId}:`, eventData.registrationCount);
              setLocalRegistrationCount(eventData.registrationCount);
              setTotalRegistrations(eventData.registrationCount);
            }
          } catch (error) {
            console.error('❌ [LiveScreen Registration] Error processing event:', error);
          }
        });

        console.log('✅ [LiveScreen Registration] AppSync subscriptions active');
      } catch (error) {
        console.error('❌ [LiveScreen Registration] Failed to setup AppSync:', error);
      }
    };

    setupRegistrationAppSync();

    // Cleanup function
    return () => {
      console.log('🧹 [LiveScreen Registration] Cleaning up AppSync subscriptions');
      if (registrationChannel) {
        closeChannel(registrationChannel);
      }
    };
  }, [streamId]);

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
      // ✅ FIX: Ensure activeTab is a valid string, not an event object
      // This prevents non-serializable values (like event.currentTarget) from being passed to navigation
      const validActiveTab = typeof activeTab === 'string' ? activeTab : '';

      if (!user) {
        Toast('Please Login to see store.');
        navigation.navigate('Login');
        return;
      }
      // ✅ Pass showData to StoreScreen to avoid redundant API call
      const params = validActiveTab
        ? {
          id: streamId,
          activeTab: validActiveTab,
          showData: show, // ✅ Pass show data
          combinedBuyNowProducts: combinedBuyNowProducts || null,
          productStocks: productStocks || null,
        }
        : {
          id: streamId,
          showData: show, // ✅ Pass show data
          combinedBuyNowProducts: combinedBuyNowProducts || null,
          productStocks: productStocks || null,
        };
      navigation.navigate('StoreScreen', params);
    },
    [navigation, streamId, show, combinedBuyNowProducts, productStocks, user],
  );

  // ✅ OPTIMIZED: Memoize feedback callback for LiveComments
  const handleFeedback = useCallback(() => {
    setModalStates(prev => ({ ...prev, reportVisible: true }));
  }, []);

  // ✅ OPTIMIZED: Memoize swipe complete callback for LiveComments
  const handleSwipeComplete = useCallback(() => {
    setModalStates(prev => ({
      ...prev,
      optionModalVisible: true,
    }));
  }, []);

  // ✅ OPTIMIZED: Memoize simulcast modal close handlers
  const handleCloseSimulcastModal = useCallback(() => {
    setShowSimulcastModal(false);
  }, []);

  const handleCloseSimulcastShareModal = useCallback(() => {
    setShowSimulcastShareModal(false);
  }, []);

  // ✅ OPTIMIZED: Memoize Viewer component callbacks
  const handleSetViewerCount = useCallback((count: number) => {
    setLiveFeatures(prev => ({ ...prev, viewerCount: count }));
  }, []);

  const handleSetIsMuted = useCallback((muted: boolean) => {
    setUserInteractions(prev => ({ ...prev, muted }));
  }, []);

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
        onPress={handleShowMiniProfile}
        style={styles.streamerInfoContent}>
        {stream?.sellerProfileURL || show?.host?.userInfo?.profileURL?.key ? (
          <Image
            source={{
              uri: `${AWS_CDN_URL}${stream?.sellerProfileURL ||
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
        <TouchableOpacity onPress={handleShowMiniProfile}>
          <Text style={styles.streamerName}>
            {show?.host?.companyName || 'Anonymous'}
          </Text>
        </TouchableOpacity>
        {user?._id != host && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && { backgroundColor: '#F7CE45' },
            ]}
            onPress={handleunfollowfollow}>
            <Text
              style={[
                styles.followButtonText,
                isFollowing ? { color: '#000' } : styles.shadowcolor,
              ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.topRightActions}>
        {show?.showStatus === 'created' && !show?.liveStreamId ? (
          <View style={[styles.viewerCountContainer, { marginTop: 10 }]}>
            <TouchableOpacity
              onPress={() =>
                ToastAndroid.show(
                  `${localRegistrationCount} people have registered so far`,
                  ToastAndroid.SHORT,
                )
              }
              style={[
                styles.viewerCountButton,
                { backgroundColor: '#00000080' },
              ]}>
              <UserRound size={16} color="#ffd700" />
              <Text style={[styles.viewerCountText, { color: '#fff' }]}>
                {localRegistrationCount}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.viewerCountContainer, { marginTop: 10 }]}>
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
            style={[styles.actionIcon, { alignSelf: 'center' }]}
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
    <View style={[styles.actionButtonsContainer, { bottom: actionButtonBottom }]}>
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
          setUserInteractions(prev => ({ ...prev, muted: !prev.muted }))
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
          setModalStates(prev => ({ ...prev, optionModalVisible: true }))
        }>
        <Image
          source={{ uri: wallet }}
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
            source={{ uri: Gifts }}
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

    if (show?.showStatus !== 'created') {
      ToastAndroid.show('Registration time for this show over', ToastAndroid.SHORT);
      return
    }

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

    // ✅ FIX: Capture the count value BEFORE optimistic update for proper reversion
    const originalCount = localRegistrationCount;
    const newCount = originalCount + 1;

    // Optimistic update - increment count immediately
    setLocalRegistrationCount(newCount);
    setIsRegistered(true);

    try {
      const res = await axiosInstance.post(
        `register-show/${streamId}/register`,
      );
      if (res.data.status) {
        // Success - keep the optimistic update and emit event to Dashboard
        Toast('Successfully registered for the show!');

        // ✅ Emit registration event to notify Dashboard with correct count
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
        // Revert optimistic update on failure to original count
        setLocalRegistrationCount(originalCount);
        setIsRegistered(false);
        Toast(res.data.message || 'Registration failed');
      }
    } catch (err) {
      if (
        err.response?.status === 400 &&
        err.response.data?.message?.includes('already registered')
      ) {
        // ✅ FIX: Already registered is success - keep the incremented count
        // No need to revert and re-increment, just keep the optimistic update
        setIsRegistered(true);
        Toast('Already registered.');

        // ✅ Emit registration event with correct count (already incremented optimistically)
        console.log(
          '📡 [LiveScreen] Emitting show registration event (already registered):',
          streamId,
        );
        RegisterEventEmitter.emitShowRegistered({
          showId: streamId,
          newCount: newCount,
          userId: user._id,
          registeredAt: new Date().toISOString(),
        });
      } else {
        // Other errors - revert optimistic update to original count
        setLocalRegistrationCount(originalCount);
        setIsRegistered(false);
        Toast('Failed to register. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  //   const checkRegistrationStatus = useCallback(async () => {
  //   try {
  //     const res = await axiosInstance.get(
  //       `/register-show/${streamId}/check-registration`,
  //     );
  //     if (res.data.status) {
  //       setIsRegistered(res.data.data.isRegistered);
  //       setTotalRegistrations(res.data.data.totalRegistrations || 0);
  //       // Initialize local count from server
  //       setLocalRegistrationCount(res.data.data.totalRegistrations || 0);
  //     }
  //   } catch (err) {
  //     // Error checking registration status
  //     console.log(err);
  //   }
  // }, [streamId, user]);

  // useEffect(() => {
  //   if (user) checkRegistrationStatus();
  // }, [user, checkRegistrationStatus]);

  // ✅ OPTIMIZED: Use registration data from route params instead of API call
  // The stream data already contains isRegistered and registrationCount from the parent screen
  const checkRegistrationStatus = useCallback(() => {
    // Use data from route params if available (passed from Dashboard/ShowDetailsPage)
    if (stream?.isRegistered !== undefined) {
      setIsRegistered(stream.isRegistered);
    }

    // Use registrationCount from stream data if available
    const registrationCount = stream?.registrationCount || 0;
    setTotalRegistrations(registrationCount);
    setLocalRegistrationCount(registrationCount);

    console.log('📝 [LiveScreen] Using registration data from params:', {
      isRegistered: stream?.isRegistered,
      registrationCount: registrationCount
    });
  }, [stream?.isRegistered, stream?.registrationCount]);

  useEffect(() => {
    // Initialize from params immediately when component mounts
    checkRegistrationStatus();
  }, [checkRegistrationStatus]);

  // Enable/disable auto-PIP based on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const { PictureInPictureModule } = require('react-native').NativeModules;

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
            setModalStates(prev => ({ ...prev, optionModalVisible: false }))
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
            { borderWidth: 0, borderColor: 'red' },
          ]}>
          {!(!show?.liveStreamId || show?.showStatus === 'created') ? (
            <Viewer
              setViewerCount={handleSetViewerCount}
              navigation={navigation}
              isMuted={muted}
              setIsMuted={handleSetIsMuted}
              streamId={show?.liveStreamId}
              user={user}
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
                style={{ width: '100%', height: '100%' }}
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

                    {user?._id !== show?.host?.userInfo?._id ? <TouchableOpacity
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
                              { color: '#4CAF50' },
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
                    </TouchableOpacity> : <TouchableOpacity
                      onPress={async () => {
                        // Check if user is host and show conditions for "Start show"
                        if (
                          user &&
                          user?._id === show?.host?.userInfo?._id &&
                          !show?.liveStreamId &&
                          show?.showStatus === 'created'
                        ) {
                          // Check authentication before starting show
                          const isAuth = await requireAuth('start_show');
                          if (isAuth) {
                            navigation.navigate('LiveStream');
                          }
                        }
                      }
                      }
                      style={[
                        styles.addToCalendarButton
                      ]}
                    >
                      <>
                        <MaterialIcons name="event" size={18} color="#000" />
                        <Text style={styles.addToCalendarButtonText}>
                          Reschedule
                        </Text>
                      </>
                    </TouchableOpacity>}
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
                style={[styles.notesButton, { top: insets.top + 70 }]}
                onPress={() => {
                  setNoteModal(!noteModal);
                  // ✅ Mark notes as viewed on first click
                  if (!hasViewedNotes) {
                    setHasViewedNotes(true);
                  }
                }}>
                <Image
                  source={{ uri: noteWhite }}
                  style={styles.actionImage}
                />
                {/* ✅ Show badge when notes exist and haven't been viewed */}
                {
                  show?.notes && !hasViewedNotes && (
                    <View style={styles.notesBadge} />
                  )}
              </TouchableOpacity>
            )}

            {/* Overlays Container - Position at bottom */}
            {!isKeyboardVisible && (
              <View style={styles.overlaysContainer}>
                {(!show?.liveStreamId || show?.showStatus === 'created') && (
                  <TouchableOpacity
                    style={[styles.shareShowButton, styles.addInfoButton]}
                    onPress={async () => {
                      // Check if user is host and show conditions for "Start show"
                      if (
                        user &&
                        user?._id === show?.host?.userInfo?._id &&
                        !show?.liveStreamId &&
                        show?.showStatus === 'created'
                      ) {
                        // Check authentication before starting show
                        const isAuth = await requireAuth('start_show');
                        if (isAuth) {
                          // navigation.navigate('LiveStream');
                          Linking.openURL(`${shareUrl}seller/show/${show?._id}/seller`)
                        }
                      } else {
                        const isAuth = await requireAuth('add_info');
                        if (isAuth) {
                          setModalStates(prev => ({
                            ...prev,
                            optionModalVisible: true,
                          }));
                        }
                      }
                    }}
                  >
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
                feedBack={handleFeedback}
                navigateToStore={handleNavigateToStore}
                isKeyboardVisible={isKeyboardVisible}
                requireAuth={requireAuth}
                onSwipeComplete={handleSwipeComplete}
                isShowUpcoming={
                  show?.showStatus === 'created' || !show?.liveStreamId
                }
              />

              {!isKeyboardVisible && (show?.showStatus !== 'created' || show?.liveStreamId) && (
                <LiveFlashSaleOverlay
                  activeFlashSales={activeFlashSales}
                  currentTime={Date.now()}
                  onPurchase={handleFlashSalePurchase}
                  requireAuth={requireAuth}
                  formatTime={formatTime}
                  calculateTimeLeft={calculateTimeLeft}
                  calculateProgress={calculateProgress}
                  calculateDiscount={calculateDiscount}
                  navigation={navigation}
                />
              )}
              {auctionActive && !isKeyboardVisible && (show?.showStatus !== 'created' || show?.liveStreamId) && (
                <>
                  {/* {console.log('🎨 [LiveScreen Render] Rendering AuctionsOverlay:', {
                    auctionActive,
                    isKeyboardVisible,
             currentAuction,
                   currentAuctionProduct,
                    isScreenActive
                  })} */}
                  <AuctionsOverlay
                    currentAuction={currentAuction}
                    streamId={streamId}
                    navigation={navigation}
                    product={currentAuctionProduct}
                  />
                </>
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
            setModalStates(prev => ({ ...prev, reportVisible: false }))
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
              currentTime={Date.now()}
            />
          ) : checkoutType === 'flash_sale' ? (
            <LiveFlashSaleCheckoutSlider
              isOpen={checkoutOpen}
              onClose={handleCloseCheckout}
              product={checkoutProduct}
              flashSaleId={checkoutFlashSaleId}
              // socketFlash={socketFlash}
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
      {!isAppInBackground && (show?.showStatus !== 'created' || show?.liveStreamId) && (
        <WinnerModal
          isVisible={showWinnerModal}
          onClose={handleCloseWinner}
          auctionData={bidderWon}
          onCheckout={() => {
            setShowCheckOut(true);
            handleCloseWinner();
            setIsAuctionCheckoutOpen(true); // ✅ Disable auto-PiP when opening checkout
          }}
        // product={currentAuctionProduct}
        />
      )}

      <AuctionCheckoutSlider
        isOpen={showChekout}
        showId={streamId}
        onClose={handleCloseAuctionCheckout}
        _auctionData={bidderWon}
        onCheckoutComplete={handleCloseWinner}
        onPaymentStateChange={()=>null}
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
      {!isAppInBackground && isScreenActive && giveawayWon && showWinnerGiveaway && (show?.showStatus !== 'created' || show?.liveStreamId) && (
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
      {!isAppInBackground && isScreenActive && (show?.showStatus !== 'created' || show?.liveStreamId) && (
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
        onClose={handleCloseSimulcastModal}
        streamId={streamId}
        userId={user?._id}
        sellerId={show?.host?._id}
      />

      {/* Simulcast Share Modal */}
      <SimulcastShareModal
        visible={showSimulcastShareModal}
        onClose={handleCloseSimulcastShareModal}
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

      {/* Mini Profile Modal */}
      {showMiniProfile && !isAppInBackground && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.miniProfileBackdrop}
            activeOpacity={1}
            onPress={() => setShowMiniProfile(false)}
          />

          {/* Mini Profile Content */}
          <View style={styles.miniProfileContainer}>
            <View style={styles.miniProfileContent}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.miniProfileCloseButton}
                onPress={() => setShowMiniProfile(false)}>
                <Feather name="x" size={20} color="#999" />
              </TouchableOpacity>

              {/* Profile Header with Gradient */}
              <View style={styles.miniProfileHeader}>
                {/* Profile Image */}
                {show?.host?.userInfo?.profileURL?.key ? (
                  <Image
                    source={{
                      uri: `${AWS_CDN_URL}${show?.host?.userInfo?.profileURL?.key}`,
                    }}
                    style={styles.miniProfileImage}
                  />
                ) : (
                  <View style={[styles.miniProfileImage, styles.miniProfileImagePlaceholder]}>
                    <Text style={styles.miniProfileInitial}>
                      {show?.host?.companyName?.charAt(0)?.toUpperCase() || 'A'}
                    </Text>
                  </View>
                )}

                {/* Company Name & Username */}
                <Text style={styles.miniProfileName}>
                  {show?.host?.companyName || 'Anonymous'}
                </Text>
                {show?.host?.userInfo?.userName && (
                  <Text style={styles.miniProfileUsername}>
                    @{show?.host?.userInfo?.userName}
                  </Text>
                )}

                {/* Follow Status Badge */}
                {isFollowing && (
                  <View style={styles.miniProfileFollowBadge}>
                    <Users size={12} color="#4CAF50" />
                    <Text style={styles.miniProfileFollowText}>Following</Text>
                  </View>
                )}
              </View>

              {/* Stats Section */}
              {/* <View style={styles.miniProfileStats}>
                <View style={styles.miniProfileStatItem}>
                  <Text style={styles.miniProfileStatValue}>
                    {formatFollowerCount(show?.host?.followersCount || 0)}
                  </Text>
                  <Text style={styles.miniProfileStatLabel}>Followers</Text>
                </View>
                <View style={styles.miniProfileStatDivider} />
                <View style={styles.miniProfileStatItem}>
                  <Text style={styles.miniProfileStatValue}>
                    {show?.host?.productsCount || show?.buyNowProducts?.length || 0}
                  </Text>
                  <Text style={styles.miniProfileStatLabel}>Products</Text>
                </View>
                <View style={styles.miniProfileStatDivider} />
                <View style={styles.miniProfileStatItem}>
                  <Text style={styles.miniProfileStatValue}>
                    {show?.host?.showsCount || 0}
                  </Text>
                  <Text style={styles.miniProfileStatLabel}>Shows</Text>
                </View>
              </View> */}

              {/* Action Buttons - Split Button Style */}
              <View style={styles.miniProfileActions}>
                <TouchableOpacity
                  style={styles.miniProfileMessageButton}
                  onPress={async () => {
                    try {
                      setShowMiniProfile(false);
                      const userId = await AsyncStorage.getItem('userId');

                      // Check if trying to message self
                      if (userId == show?.host?.userInfo?._id) {
                        Toast('You cannot message yourself');
                        return;
                      }

                      // Create/get direct message room
                      const response = await axiosInstance.post('/chat/direct-message', {
                        userId: show?.host?.userInfo?._id,
                        userType: 'seller', // Host is always a seller
                      });

                      // Navigate to chat screen with room ID
                      navigation.navigate('ChatScreen', {
                        roomId: response?.data?.data?._id
                      });

                      Toast(response.data.message || 'Opening chat...');
                    } catch (err) {
                      console.log('Error opening chat:', err);
                      Toast('Failed to open chat. Please try again.');
                    }
                  }}>
                  <Feather name="message-circle" size={18} color="#000" />
                  <Text style={styles.miniProfileMessageText}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.miniProfileViewButton}
                  onPress={() => {
                    setShowMiniProfile(false);
                    handleNavigateToProfile();
                  }}>
                  <Text style={styles.miniProfileViewText}>View</Text>
                  <Feather name="external-link" size={16} color="#F7CE45" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
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
    textShadowOffset: { width: 1, height: 1 },
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
    textShadowOffset: { width: 1, height: 1 },
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
    textShadowOffset: { width: 1, height: 1 },
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
    // opacity: 0.7
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
  miniProfileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9997,
  },
  miniProfileContainer: {
    position: 'absolute',
    top: '35%',  //'35%',
    left: '10%',
    right: '10%',
    zIndex: 9998,
    alignItems: 'center',
  },
  miniProfileContent: {
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  miniProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#F7CE45',
  },
  miniProfileImagePlaceholder: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniProfileInitial: {
    fontSize: 32,
    color: 'white',
    fontWeight: '700',
  },
  miniProfileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  miniProfileFollowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  miniProfileFollowText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  miniProfileViewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    minHeight: 48,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: '#F7CE45',
  },
  miniProfileViewText: {
    color: '#F7CE45',
    fontSize: 16,
    fontWeight: '600',
  },
  miniProfileCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniProfileHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  miniProfileUsername: {
    color: '#999',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  miniProfileStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  miniProfileStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniProfileStatValue: {
    color: '#F7CE45',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  miniProfileStatLabel: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  miniProfileStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  miniProfileActions: {
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 8,
  },
  miniProfileMessageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE45',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    minHeight: 48,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0, 0, 0, 0.2)',
  },
  miniProfileMessageText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  notesBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#ffd700',
    borderRadius: 8,
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
});

export default LiveStreamScreen;
