import React, {useRef, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SectionList,
  ToastAndroid,
  ScrollView,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import {bgaSocketUrl, socketurl} from '../../../../../Config';
import {io} from 'socket.io-client';
import Feather from 'react-native-vector-icons/Feather';
import GiveawaySellerControls from './GiveawaySellerControl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuctionsSellerControl from './AuctionSellerControl';
import bgaAxiosInstance from '../../../../Utils/bgaAxiosInstance';
import { ActivityIndicator } from 'react-native';
import giveawayService from '../../../Shows/Services/giveawayService';
import axiosInstance from '../../../../Utils/Api';
import BuyProductsSellers from '../BuyNow/BuyProductsSeller';
import LiveStreamFlashSaleSeller from '../FlashSale/LiveStreamFlashSaleSeller';

const socket = io(bgaSocketUrl,{
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
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
const socketFlash = io(socketurl, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});

socket.on("connect", () => {
  console.log("✅ BGA Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.log("❌ BGA Socket connection error:", err.message);
});

socketFlash.on("connect", () => {
  console.log("✅ Flash Socket connected:", socketFlash.id);
});

socketFlash.on("connect_error", (err) => {
  console.log("❌ Flash Socket connection error:", err.message);
});

const ProductsBottomSheet = ({
  matchedProducts,
  isOpen,
  streamId,
  onClose,
  onGiveaway: _onGiveaway,
  flashSaleData,
}) => {
  const bottomSheetRef = useRef(null);
  const loadedPagesRef = useRef(new Set());
  const hasInitialLoadedRef = useRef(false);
  const [activeTab, setActiveTab] = useState('auction');
  
  // Auction pagination states
  const [auctionPage, setAuctionPage] = useState(1);
  const [hasMoreAuctions, setHasMoreAuctions] = useState(true);
  const [initialLoadingAuctions, setInitialLoadingAuctions] = useState(true);
  const [loadingMoreAuctions, setLoadingMoreAuctions] = useState(false);
  const [totalPagesAuctions, setTotalPagesAuctions] = useState(0);
  const [auctionData, setAuctionData] = useState([]);
  
  // Giveaway pagination state
  const [giveawayDetails, setGiveawayDetails] = useState({});
  const [giveawayPage, setGiveawayPage] = useState(1);
  const [hasMoreGiveaways, setHasMoreGiveaways] = useState(true);
  const [loadingMoreGiveaways, setLoadingMoreGiveaways] = useState(false);
  const [initialLoadingGiveaways, setInitialLoadingGiveaways] = useState(false);
  const [allGiveawayIds, setAllGiveawayIds] = useState([]);
  // console.log(matchedProducts.bundleSales)
  // Fetch giveaways when Giveaway tab is active

 // ✅ Flash sale state management (local to this screen)
  const [activeFlashSales, setActiveFlashSales] = useState(
    flashSaleData?.activeFlashSales || [],
  );
  const [flashSaleHistory, setFlashSaleHistory] = useState(
    flashSaleData?.flashSaleHistory || [],
  );
  const [flashSaleLoading, setFlashSaleLoading] = useState(false);
  const [flashSaleApiError, setFlashSaleApiError] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedProductForFlashSale, setSelectedProductForFlashSale] =
    useState(null);
  const [isFlashSaleInitialized, setIsFlashSaleInitialized] = useState(false);
  const [hasRenderedFlashSale, setHasRenderedFlashSale] = useState(false);
  const [isAutoNavigate, setIsAutoNavigate] = useState(false);
  
const showId=streamId
    // ✅ Utility functions (same as Streaming.tsx)
  const calculateDiscount = useCallback((originalPrice, flashPrice) => {
    if (!originalPrice || originalPrice === 0 || !flashPrice) return 0;
    return Math.round(((originalPrice - flashPrice) / originalPrice) * 100);
  }, []);

  const calculateTimeLeft = useCallback((endTime, now) => {
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.ceil((end - now) / 1000));
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

  // ✅ API handlers - Define these BEFORE useEffect that uses them
  const fetchFlashSaleHistory = useCallback(async () => {
    if (!streamId) return;
    setFlashSaleLoading(true);
    try {
      const response = await axiosInstance.get(
        `/flash-live/${streamId}/flash-sale/history`,
      );
      if (response.data.success) {
        setFlashSaleHistory(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching flash sale history:', error);
      setFlashSaleApiError('Failed to load history');
    } finally {
      setFlashSaleLoading(false);
    }
  }, [streamId]);
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!showId || !socket) return;

      setFlashSaleLoading(true);
      try {
        // 1. Get current active sales
        const response = await axiosInstance.get(
          `/flash-live/${showId}/flash-sale/active`,
        );
        if (response.data.success && response.data.data) {
          setActiveFlashSales(response.data.data.activeFlashSales || []);
        }

        // 2. Get history
        await fetchFlashSaleHistory();

        // 3. Poke backend to initialize timers
        await axiosInstance.post(
          `/flash-live/${showId}/flash-sale/initialize-timers`,
        );
        console.log('✅ Backend timers initialized.');
      } catch (error) {
        console.error('❌ Error fetching initial flash sale data:', error);
        setFlashSaleApiError('Failed to load initial flash sale data');
      } finally {
        setFlashSaleLoading(false);
      }
    };

    fetchInitialData();
  }, [showId, fetchFlashSaleHistory]);

  // ✅ NEW: API Handlers to pass to child - REGULAR PRODUCTS
  const handleStartFlashSale = async (
    selectedProduct,
    formData,
    onStartedCallback,
  ) => {
    if (!selectedProduct) {
      setFlashSaleApiError('Please select a product');
      return;
    }

    // Check if it's a bundle - if so, use bundle handler
    if (selectedProduct.isBundle || selectedProduct.bundleSaleId) {
      return handleStartBundleFlashSale(
        selectedProduct,
        formData,
        onStartedCallback,
      );
    }

    setFlashSaleLoading(true);
    setFlashSaleApiError(null);
    try {
      await axiosInstance.post(`flash-live/${showId}/flash-sale/start`, {
        productId: selectedProduct._id,
        flashPrice: parseFloat(formData.flashPrice),
        duration: formData.duration,
      });
      if (onStartedCallback) onStartedCallback();
    } catch (error) {
      console.error('❌ Error starting regular flash sale:', error);
      const errorMsg =
        error.response?.data?.message || 'Failed to start flash sale';
      setFlashSaleApiError(errorMsg);
      // negative(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  // ✅ NEW: Bundle Flash Sale Start Handler
  const handleStartBundleFlashSale = async (
    selectedBundle,
    formData,
    onStartedCallback,
  ) => {
    if (!selectedBundle) {
      setFlashSaleApiError('Please select a bundle');
      return;
    }

    setFlashSaleLoading(true);
    setFlashSaleApiError(null);
    try {
      const bundleId = selectedBundle.bundleSaleId || selectedBundle._id;

      console.log('🎁 Starting bundle flash sale:', {
        bundleId,
        flashPrice: formData.flashPrice,
        duration: formData.duration,
      });

      await axiosInstance.post(`/seller/bundle-flash-sale/start`, {
        showId: showId,
        bundleId: bundleId,
        flashPrice: parseFloat(formData.flashPrice),
        duration: formData.duration,
      });

      // positive('Bundle flash sale started successfully!');
      if (onStartedCallback) onStartedCallback();
    } catch (error) {
      console.log('❌ Error starting bundle flash sale:', error.response.data);
      const errorMsg =
        error.response?.data?.message || 'Failed to start bundle flash sale';
      setFlashSaleApiError(errorMsg);
      // negative(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  const handleEndFlashSale = async flashSaleId => {
    if (!flashSaleId) return;
    setFlashSaleLoading(true);
    try {
      await axiosInstance.post(`flash-live/${showId}/flash-sale/end`, {
        flashSaleId,
      });
      // State update happens via socket event
    } catch (error) {
      console.error('❌ Error ending flash sale:', error);
      const errorMsg =
        error.response?.data?.message || 'Failed to end flash sale';
      setFlashSaleApiError(errorMsg);
      // negative(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  // ✅ Initialize flash sale data on component mount (preload for faster tab switch)
  useEffect(() => {
    if (!streamId || !flashSaleData) return;

    const initializeFlashSale = async () => {
      try {
        socketFlash.emit('JOIN_LIVE_STREAM', streamId);
        setIsFlashSaleInitialized(true);
      } catch (error) {
        console.error('Error initializing flash sale:', error);
        setIsFlashSaleInitialized(true); // Set anyway to prevent infinite loading
      }
    };

    // Initialize immediately on mount
    initializeFlashSale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, flashSaleData]);

  // 🔥 CRITICAL FIX: Socket listeners active on ALL tabs for consistent updates
  useEffect(() => {
    console.log(
      '⚡️ Running Flash Sale Listener useEffect. Socket connected?',
      !!socketFlash,
      'Show ID:',
      showId,
    );

    if (!socketFlash || !showId) {
      console.log('⚠️ Skipping listener setup: Socket or Show ID missing.');
      return;
    }

    console.log(
      `🔌 Setting up listeners for showId: ${showId} on socketFlash: ${socketFlash.id}`,
    );

    // Join the room using the flash sale socket
    socketFlash.emit('JOIN_LIVE_STREAM', showId);
    console.log(`🚀 Emitted JOIN_LIVE_STREAM for ${showId} on socketFlash`);

    // ===== REGULAR FLASH SALE HANDLERS =====
    const handleLiveStreamFlashSaleStarted = data => {
      console.log('✅ SELLER: Regular flash sale started:', data);
      setFlashSaleApiError(null);

      setActiveFlashSales(prev => {
        const exists = prev.some(sale => sale._id === data._id);
        if (!exists) {
          return [
            ...prev,
            {
              ...data,
              flashSaleId: data._id,
              isBundle: false,
              // Ensure consistent field names for timer
              startTime: data.startTime || data.saleStartTime || data.createdAt,
              endTime: data.endTime || data.saleEndTime,
            },
          ];
        }
        return prev;
      });
      // positive('Flash sale started!');
    };

    const handleLiveStreamFlashSaleEnded = data => {
      console.log('⏹️ SELLER: Regular flash sale ended:', data);

      setActiveFlashSales(prevActive =>
        prevActive.filter(
          sale =>
            sale.isBundle ||
            (sale._id !== data.flashSaleId &&
              sale.flashSaleId !== data.flashSaleId),
        ),
      );

      // caution('Flash sale has ended');
      setTimeout(() => fetchFlashSaleHistory(), 1000);
    };

    const handleLiveStreamStockUpdate = data => {
      console.log('🔄 SELLER: Regular stock updated:', data);
      setActiveFlashSales(prev =>
        prev.map(sale => {
          if (
            !sale.isBundle &&
            (sale._id === data.flashSaleId ||
              sale.flashSaleId === data.flashSaleId)
          ) {
            console.log(
              `📊 Updating stock for regular flash sale ${
                sale._id || sale.flashSaleId
              }: ${data.currentStock}`,
            );

            const updatedProducts = sale.products?.map(p =>
              p.productId === data.productId
                ? {...p, currentFlashStock: data.currentStock}
                : p,
            );

            return {
              ...sale,
              currentStock: data.currentStock,
              products: updatedProducts,
            };
          }
          return sale;
        }),
      );
    };

    // ===== BUNDLE FLASH SALE HANDLERS =====
    const handleBundleFlashSaleStarted = data => {
      console.log('🎁 SELLER: Bundle flash sale started:', data);
      setFlashSaleApiError(null);

      setActiveFlashSales(prev => {
        const exists = prev.some(sale => sale.flashSaleId === data.flashSaleId);
        if (!exists) {
          return [...prev, {
            ...data, 
            isBundle: true,
            // Ensure consistent field names for timer
            startTime: data.startTime || data.saleStartTime || data.createdAt,
            endTime: data.endTime || data.saleEndTime,
          }];
        }
        return prev;
      });
      // positive('Bundle flash sale started!');
    };

    const handleBundleStockUpdate = data => {
      console.log('🔄 SELLER: Bundle stock updated:', data);
      setActiveFlashSales(prev =>
        prev.map(sale => {
          if (sale.isBundle && sale.flashSaleId === data.flashSaleId) {
            console.log('📊 Updating bundle stock:', {
              bundleId: data.bundleId,
              newQuantity: data.bundleQuantity,
              bundlesSold: data.bundlesSold,
            });
            return {
              ...sale,
              bundleQuantity: data.bundleQuantity,
              products: data.products,
              limitingProduct: data.limitingProduct,
              bundlesSold: data.bundlesSold,
            };
          }
          return sale;
        }),
      );
    };

    const handleBundleFlashSaleEnded = data => {
      console.log('⏹️ SELLER: Bundle flash sale ended:', data);

      setActiveFlashSales(prevActive =>
        prevActive.filter(
          sale => !sale.isBundle || sale.flashSaleId !== data.flashSaleId,
        ),
      );

      // caution('Bundle flash sale has ended');
      setTimeout(() => fetchFlashSaleHistory(), 1000);
    };

    const handleFlashSaleError = data => {
      console.error('❌ SELLER: Flash Sale Error:', data.message);
      setFlashSaleApiError(data.message || 'An unknown error occurred');
      // negative(data.message || 'Flash Sale Error');
      setFlashSaleLoading(false);
    };

    const handleBundleFlashSaleError = data => {
      console.error('❌ SELLER: Bundle Flash Sale Error:', data.message);
      setFlashSaleApiError(data.message || 'An unknown error occurred');
      // negative(data.message || 'Bundle Flash Sale Error');
      setFlashSaleLoading(false);
    };

    // Register regular flash sale event listeners
    socketFlash.on(
      'LIVE_STREAM_FLASH_SALE_STARTED',
      handleLiveStreamFlashSaleStarted,
    );
    socketFlash.on('LIVE_STREAM_FLASH_SALE_ENDED', handleLiveStreamFlashSaleEnded);
    socketFlash.on('LIVE_STREAM_STOCK_UPDATE', handleLiveStreamStockUpdate);
    socketFlash.on('LIVE_STREAM_FLASH_SALE_ERROR', handleFlashSaleError);

    // Register bundle flash sale event listeners
    socketFlash.on('BUNDLE_FLASH_SALE_STARTED', handleBundleFlashSaleStarted);
    socketFlash.on('BUNDLE_STOCK_UPDATE', handleBundleStockUpdate);
    socketFlash.on('BUNDLE_FLASH_SALE_ENDED', handleBundleFlashSaleEnded);
    socketFlash.on('BUNDLE_FLASH_SALE_ERROR', handleBundleFlashSaleError);

    // Cleanup
    return () => {
      // Regular flash sale cleanup
      socketFlash.off(
        'LIVE_STREAM_FLASH_SALE_STARTED',
        handleLiveStreamFlashSaleStarted,
      );
      socketFlash.off(
        'LIVE_STREAM_FLASH_SALE_ENDED',
        handleLiveStreamFlashSaleEnded,
      );
      socketFlash.off('LIVE_STREAM_STOCK_UPDATE', handleLiveStreamStockUpdate);
      socketFlash.off('LIVE_STREAM_FLASH_SALE_ERROR', handleFlashSaleError);

      // Bundle flash sale cleanup
      socketFlash.off('BUNDLE_FLASH_SALE_STARTED', handleBundleFlashSaleStarted);
      socketFlash.off('BUNDLE_STOCK_UPDATE', handleBundleStockUpdate);
      socketFlash.off('BUNDLE_FLASH_SALE_ENDED', handleBundleFlashSaleEnded);
      socketFlash.off('BUNDLE_FLASH_SALE_ERROR', handleBundleFlashSaleError);
    };
    // }, [socket, showId, positive, negative, caution, fetchFlashSaleHistory]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, fetchFlashSaleHistory, isFlashSaleInitialized, activeTab]);

  // ✅ Timer for visual updates - Active on ALL tabs for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const loadGiveaways = async () => {
      if (activeTab !== 'giveaway' || !streamId) return;
        
      if (loadedPagesRef.current.has(giveawayPage)) {
        return;
      }
        
      if (loadingMoreGiveaways) {
        return;
      }
        
      loadedPagesRef.current.add(giveawayPage);
        
      if (giveawayPage === 1) {
        setInitialLoadingGiveaways(true);
      } else if (giveawayPage > 1) {
        setLoadingMoreGiveaways(true);
      }
        
      try {
        const response = await giveawayService.getGiveawaysByShowId(streamId, giveawayPage, 10);
          
        if (response.success && response.data) {
          setGiveawayDetails(prev => {
            const newDetails = { ...prev };
            response.data.forEach(giveaway => {
              newDetails[giveaway._id] = giveaway;
            });
            return newDetails;
          });
            
          setAllGiveawayIds(prev => {
            const newIds = response.data.map(g => g._id);
            const existingIds = new Set(prev);
            const uniqueNewIds = newIds.filter(id => !existingIds.has(id));
            return [...prev, ...uniqueNewIds];
          });
            
          setHasMoreGiveaways(response.pagination?.hasMore || false);
        }
      } catch (error) {
        console.log('Failed to load giveaways:', error);
        ToastAndroid.show('Failed to load giveaways', ToastAndroid.SHORT);
      } finally {
        setInitialLoadingGiveaways(false);
        setLoadingMoreGiveaways(false);
      }
    };
  
    loadGiveaways();
  }, [activeTab, giveawayPage, streamId, loadingMoreGiveaways]);
    
  // Reset pagination when switching to Giveaway tab
  useEffect(() => {
    if (activeTab === 'giveaway') {
      setGiveawayPage(1);
      setAllGiveawayIds([]);
      setGiveawayDetails({});
      setHasMoreGiveaways(true);
      loadedPagesRef.current.clear();
    }
  }, [activeTab]);
  
  // Handle load more for giveaways
  const handleLoadMoreGiveaways = useCallback(() => {
    if (!loadingMoreGiveaways && hasMoreGiveaways) {
      setGiveawayPage(prev => prev + 1);
    }
  }, [loadingMoreGiveaways, hasMoreGiveaways]);

  // ✅ Show loading indicator when switching to FlashSale tab
  useEffect(() => {
    if (activeTab === 'flashsale') {
      // Reset and show loading every time FlashSale tab is activated
      setHasRenderedFlashSale(false);
      const timer = setTimeout(() => {
        setHasRenderedFlashSale(true);
      }, 100); // Quick 100ms to allow smooth transition
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const fetchAuction = useCallback(async (page = 1, isInitial = false) => {
    if (isInitial) {
      setInitialLoadingAuctions(true);
    } else {
      setLoadingMoreAuctions(true);
    }

    try {
      const response = await bgaAxiosInstance.get(`api/auctions/by-show/${streamId}?page=${page}&limit=10`);
      const {data, pagination} = response.data;
      
      if(!data || data.length === 0){
        setHasMoreAuctions(false);
        setInitialLoadingAuctions(false);
        setLoadingMoreAuctions(false);
        return;
      }
      
      if (page === 1) {
        setAuctionData(data);
      } else {
        setAuctionData(prev => {
          const existingIds = new Set(prev.map(a => a._id));
          const newData = data.filter(a => !existingIds.has(a._id));
          return [...prev, ...newData];
        });
      }

      setHasMoreAuctions(pagination.hasMore);
      setTotalPagesAuctions(pagination.totalPages);
      setAuctionPage(page);

    } catch (err) {
      console.log('Error fetching auctions:', err.response?.data || err.message);
      ToastAndroid.show('Failed to load auctions', ToastAndroid.SHORT);
    } finally {
      setInitialLoadingAuctions(false);
      setLoadingMoreAuctions(false);
    }
  }, [streamId]);
  
  const handleLoadMoreAuctions = useCallback(() => {
    if (!loadingMoreAuctions && hasMoreAuctions && auctionPage < totalPagesAuctions) {
      fetchAuction(auctionPage + 1, false);
    }
  }, [loadingMoreAuctions, hasMoreAuctions, auctionPage, totalPagesAuctions, fetchAuction]);

  // Fetch all data for initial tab when sheet opens
  useEffect(() => {
    if (isOpen && streamId && !hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      // Fetch auction data (initial tab)
      setAuctionPage(1);
      setHasMoreAuctions(true);
      setAuctionData([]);
      fetchAuction(1, true);
    }
    
    if (isOpen) {
      bottomSheetRef.current?.open();
    } else {
      bottomSheetRef.current?.close();
      hasInitialLoadedRef.current = false;
    }
  }, [isOpen, streamId, fetchAuction]);

  // Fetch data when switching tabs
  useEffect(() => {
    if (!isOpen || !streamId) return;
    
    if (activeTab === 'auction' && !hasInitialLoadedRef.current) {
      setAuctionPage(1);
      setHasMoreAuctions(true);
      setAuctionData([]);
      fetchAuction(1, true);
    }
  }, [activeTab, streamId, isOpen, fetchAuction]);

  const renderTabButton = (tabKey, label) => (
    <TouchableOpacity
      key={tabKey}
      style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
      onPress={() => setActiveTab(tabKey)}>
      <Text
        style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Prepare sections for SectionList
  const sections = React.useMemo(() => {
    if (activeTab === 'auction') {
      return [{ title: 'Auctions', data: auctionData }];
    } else if (activeTab === 'giveaway') {
      const giveawayData = allGiveawayIds.map(id => giveawayDetails[id]).filter(Boolean);
      return [{ title: 'Giveaways', data: giveawayData }];
    } else {
      return [{ title: 'Buy Now', data:[...(matchedProducts.buynow || []), ...(matchedProducts.bundleSales || [])]}];
    }
  }, [activeTab, auctionData, allGiveawayIds, giveawayDetails, matchedProducts]);

  const renderSectionItem = useCallback(({item}) => {
    if(activeTab === 'auction'){
      const auctionDetail = item;
      if (!auctionDetail) return null;
                        
      const showAuctionProduct = matchedProducts?.auction?.find(
        ap => ap.auctionObjectId === auctionDetail._id
      );
      
      const mergedProduct = {
        productId: auctionDetail.productId,
        auctionObjectId: auctionDetail._id,
        auctionId: auctionDetail._id,
        startingPrice: showAuctionProduct?.startingPrice || auctionDetail.startingBid,
        reservedPrice: showAuctionProduct?.reservedPrice || auctionDetail.reservedPrice,
        productOwnerSellerId: auctionDetail.productOwnerSellerId,
        ...auctionDetail
      };
      
      return <AuctionsSellerControl 
        streamId={streamId} 
        product={mergedProduct} 
        currentAuction={mergedProduct}
      />;
    } else if(activeTab === 'giveaway'){
      return (
        <GiveawaySellerControls
          streamId={streamId}
          giveawayId={item?._id}
          initialGiveawayDetails={item}
        />
      );
    }else {
       const isBundle = item.bundleSaleId ? true : false;
      // console.log(item)
      return (
        <BuyProductsSellers
          showId={streamId}
          streamId={streamId}
          product={item}
          calculateTimeLeft={calculateTimeLeft}
          currentTime={currentTime}
          activeFlashSales={activeFlashSales}
          calculateDiscount={calculateDiscount}
          formatTime={formatTime}
          onStartFlashSale={prod => {
            setSelectedProductForFlashSale(prod);
            setShowStartModal(true);
            setActiveTab('flashsale');
            setIsAutoNavigate(true);
          }}
          isBundle={isBundle}
        />
      );
    }

  }, [activeTab, matchedProducts, streamId, activeFlashSales, currentTime, calculateTimeLeft, calculateDiscount, formatTime]);

  const renderFooter = () => {
    if (activeTab === 'auction') {
      if (initialLoadingAuctions) return null;
      
      if (loadingMoreAuctions) {
        return (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size={'small'} color={'#fff'} />
            <Text style={styles.loadingText}>Loading more auctions...</Text>
          </View>
        );
      }
      
      if (!hasMoreAuctions && auctionData.length > 0) {
        return (
          <View style={styles.loadingFooter}>
            <Text style={styles.loadingText}>No more auctions</Text>
          </View>
        );
      }
    }
    
    if (activeTab === 'giveaway') {
      if (initialLoadingGiveaways) return null;
      
      if (loadingMoreGiveaways) {
        return (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size={'small'} color={'#fff'} />
            <Text style={styles.loadingText}>Loading more giveaways...</Text>
          </View>
        );
      }
      
      if (!hasMoreGiveaways && allGiveawayIds.length > 0) {
        return (
          <View style={styles.loadingFooter}>
            <Text style={styles.loadingText}>No more giveaways</Text>
          </View>
        );
      }
    }
    
    return null;
  };

  // Separate loader component
  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderContent}>
        <ActivityIndicator size="large" color="#F7CE45" />
        <Text style={styles.loaderText}>
          {activeTab === 'auction' ? 'Loading auctions...' :
           activeTab === 'giveaway' ? 'Loading giveaways...' :
           'Loading products...'}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    const isLoading = activeTab === 'auction' ? initialLoadingAuctions : 
                     activeTab === 'giveaway' ? initialLoadingGiveaways : false;
    
    if (isLoading) {
      return renderLoader();
    }

    const getEmptyStateConfig = () => {
      switch (activeTab) {
        case 'auction':
          return {
            icon: 'trending-up',
            title: 'No Auctions Available',
            message: 'Add auction products to start live bidding'
          };
        case 'buynow':
          return {
            icon: 'shopping-bag',
            title: 'No Buy Now Products',
            message: 'Add products available for instant purchase'
          };
        case 'giveaway':
          return {
            icon: 'gift',
            title: 'No Giveaways Yet',
            message: 'Create giveaways to engage with your audience'
          };
        default:
          return {
            icon: 'package',
            title: 'No Products Yet',
            message: 'Add products through the products tab'
          };
      }
    };

    const config = getEmptyStateConfig();

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Feather name={config.icon} size={40} color="white" />
        </View>
        <Text style={styles.emptyTitle}>
          {config.title}
        </Text>
        <Text style={styles.emptyMessage}>
          {config.message}
        </Text>
      </View>
    );
  };

  return (
    <>
     

      <RBSheet
        ref={bottomSheetRef}
        height={600}
        draggable={true}
        closeOnPressBack
        openDuration={50}
        customStyles={{
          container: {
            backgroundColor: '#121212',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 10,
          },
          draggableIcon: {
            backgroundColor: '#666',
          },
        }}
        onClose={onClose}>
      <View style={{flex: 1}}>
          <View className="flex-1">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContent}
              style={styles.tabScrollContainer}
            >
              <View style={styles.tabContainer}>
                {renderTabButton('auction', 'Auction')}
                {renderTabButton('buynow', 'Buy now')}
                {renderTabButton('giveaway', 'Giveaway')}
                {renderTabButton('flashsale', 'Flash Sale')}
              </View>
            </ScrollView>
            
            {activeTab === 'flashsale' ? (
              // ✅ Render Flash Sale content
              hasRenderedFlashSale ? (
                <View style={{flex: 1, paddingVertical: 10}}>
                  <LiveStreamFlashSaleSeller
                    showId={streamId}
                    sellerId={flashSaleData?.sellerId}
                    socket={socketFlash}
                    signedUrls={{}}
                    // State
                    activeFlashSales={activeFlashSales}
                    history={flashSaleHistory}
                    loading={flashSaleLoading}
                    apiError={flashSaleApiError}
                    currentTime={currentTime}
                    // Handlers
                    onStartFlashSale={handleStartFlashSale}
                    onEndFlashSale={handleEndFlashSale}
                    onRefreshHistory={fetchFlashSaleHistory}
                    clearApiError={() => setFlashSaleApiError(null)}
                    // Modal control
                    showStartModal={showStartModal}
                    onOpenFlashSaleModal={() => setShowStartModal(true)}
          onCloseFlashSaleModal={() => {
            setShowStartModal(false);
            setSelectedProductForFlashSale(null);
            if (isAutoNavigate) {
              setActiveTab('buynow');
              setIsAutoNavigate(false);
            }
          }}
                    preSelectedProduct={selectedProductForFlashSale}
                    // Utility functions
                    formatTime={formatTime}
                    calculateProgress={calculateProgress}
                    calculateTimeLeft={calculateTimeLeft}
                    calculateDiscount={calculateDiscount}
                  />
                </View>
              ) : (
                renderLoader()
              )
            ) : (activeTab === 'auction' && initialLoadingAuctions) || 
               (activeTab === 'giveaway' && initialLoadingGiveaways) ? (
              renderLoader()
            ) : sections[0]?.data?.length === 0 ? (
              renderEmpty()
            ) : (
              <SectionList
                sections={sections}
                renderItem={renderSectionItem}
                renderSectionHeader={() => null}
                keyExtractor={(item, index) => item?._id || item?.giveawayObjectId || index.toString()}
                style={styles.productsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.productsListContent}
                onEndReached={activeTab === 'auction' ? handleLoadMoreAuctions : 
                             activeTab === 'giveaway' ? handleLoadMoreGiveaways : null}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
                stickySectionHeadersEnabled={false}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
              />
            )}
          </View>
      </View>
    </RBSheet>
    </>  
  );
};

const styles = StyleSheet.create({
  tabScrollContainer: {
    marginBottom: 16,
    
    maxHeight: 50,
  },
  tabScrollContent: {
    paddingHorizontal: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    gap: 3,
    padding: 4,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    minWidth: 100,
  },
  disabledButton: {
    backgroundColor: '#3333',
  },
  activeTabButton: {
    backgroundColor: '#F7CE45',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: 20,
    // backgroundColor:'red',
    flexGrow: 1,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#ccc',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  priceText: {
    color: '#fff',
  },
  discountText: {
    fontSize: 8,
    color: '#08E85B',
  },
  productPrice: {
    color: '#ffd700',
    fontSize: 13,
    marginBottom: 2,
  },
  productBid: {
    color: '#888',
    fontSize: 12,
  },
  actionContainer: {
    alignItems: 'flex-end',
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  auctionButton: {
    backgroundColor: '#ffd700',
  },
  buyNowButton: {
    backgroundColor: '#ffd700',
  },
  giveawayButton: {
    backgroundColor: '#ffd700',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  settingSection: {
    marginBottom: 20,
  },
  settingsLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  activeSettingsButton: {
    backgroundColor: '#F7CE45',
  },
  settingsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeSettingsText: {
    color: '#000',
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfButton: {
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 0,
  },
  dropdownListContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownPlaceholder: {
    color: '#666',
    fontSize: 14,
  },
  halfInputContainer: {
    flex: 1,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 12,
  },
  fullTextInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  startAuctionButton: {
    flex: 1,
    backgroundColor: '#F7CE45',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startAuctionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyLoadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loaderContent: {
    alignItems: 'center',
    gap: 16,
  },
  loaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProductsBottomSheet;
