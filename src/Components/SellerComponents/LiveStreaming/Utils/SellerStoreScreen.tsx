import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ToastAndroid,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {io} from 'socket.io-client';
import {socketurl} from '../../../../../Config';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import {colors} from '../../../../Utils/Colors';
import SellerHeader from '../../SellerForm/Header';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import LiveStreamFlashSaleSeller from './../FlashSale/LiveStreamFlashSaleSeller';
import BuyProductsSeller from '../BuyNow/BuyProductsSeller';
import AuctionSellerControl from './AuctionSellerControl';
import GiveawaySellerControl from './GiveawaySellerControl';
import SoldProductsTab from './SoldProductsTab';
import api from '../../../../Utils/Api';
import bgaAxiosInstance from '../../../../Utils/bgaAxiosInstance';
import giveawayService from '../../../Shows/Services/giveawayService';
import axiosInstance from '../../../../Utils/Api';
import flashSaleLiveService from '../../../../Services/flashSaleLiveService';

const socket = io(socketurl, {
  transports: ['websocket'],
});

const SellerStoreScreen = ({navigation, route}) => {
  const {
    products = {auction: [], buynow: [], giveaway: [], bundleSales: []},
    flashSaleData,
  } = route.params || {};
  // console.log(products)
  const [activeTab, setActiveTab] = useState('Auction');

  // ✅ Flash sale state management (local to this screen) - NORMALIZE INITIAL DATA
  const [activeFlashSales, setActiveFlashSales] = useState(() => {
    const initialSales = flashSaleData?.activeFlashSales || [];
    return initialSales.map(sale => ({
      ...sale,
      // Ensure consistent field names for timer
      startTime: sale.startTime || sale.saleStartTime || sale.createdAt,
      endTime: sale.endTime || sale.saleEndTime,
      // Preserve flashSaleId if not present
      flashSaleId: sale.flashSaleId || sale._id,
    }));
  });
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
  const skipNextFocusRefresh = useRef(false); // Prevent API overwriting socket updates


  const [isAutoNavigate, setIsAutoNavigate] = useState(false);

  const streamId = flashSaleData?.showId;

  const showId = streamId;
  // Auction pagination state
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
  const [initialLoadingGiveaways, setInitialLoadingGiveaways] = useState(true);
  const [allGiveawayIds, setAllGiveawayIds] = useState([]);
  const isLoadingGiveawaysRef = useRef(false);

  // ✅ NEW: Buy now items from API (matching web version)
  const [buyNowItems, setBuyNowItems] = useState([]);
  const [buyNowDetails, setBuyNowDetails] = useState({});
  const [loadingBuyNow, setLoadingBuyNow] = useState(false);
  const [hasMoreBuyNow, setHasMoreBuyNow] = useState(true);

  const fetchAuction = useCallback(
    async (page = 1, isInitial = false) => {
      if (isInitial) {
        setInitialLoadingAuctions(true);
      } else {
        setLoadingMoreAuctions(true);
      }

      try {
        const response = await bgaAxiosInstance.get(
          `api/auctions/by-show/${streamId}?page=${page}&limit=10`,
        );
        const {data, pagination} = response.data;

        if (!data || data.length === 0) {
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
        ToastAndroid.show('Failed to load auctions', ToastAndroid.SHORT);
      } finally {
        setInitialLoadingAuctions(false);
        setLoadingMoreAuctions(false);
      }
    },
    [streamId],
  );
  const handleLoadMoreAuctions = useCallback(() => {
    // console.log('🔄 Load more triggered', {loadingMoreAuctions, hasMoreAuctions, auctionPage, totalPagesAuctions});
    if (
      !loadingMoreAuctions &&
      hasMoreAuctions &&
      auctionPage < totalPagesAuctions
    ) {
      fetchAuction(auctionPage + 1, false);
    }
  }, [
    loadingMoreAuctions,
    hasMoreAuctions,
    auctionPage,
    totalPagesAuctions,
    fetchAuction,
  ]);
  // Fetch auctions when Auction tab is active
  useEffect(() => {
    if (activeTab === 'Auction' && streamId) {
      setAuctionPage(1);
      setHasMoreAuctions(true);
      setAuctionData([]);
      fetchAuction(1, true);
    }
  }, [activeTab, streamId, fetchAuction]);

  // Fetch giveaways when Giveaway tab is active
  useEffect(() => {
    const loadGiveaways = async () => {
      if (activeTab !== 'Giveaway' || !streamId) return;

      // Prevent duplicate calls
      if (isLoadingGiveawaysRef.current) {
        return;
      }

      isLoadingGiveawaysRef.current = true;

      if (giveawayPage === 1) {
        setInitialLoadingGiveaways(true);
      } else {
        setLoadingMoreGiveaways(true);
      }

      try {
        const response = await giveawayService.getGiveawaysByShowId(
          streamId,
          giveawayPage,
          10,
        );

        if (response.success && response.data) {
          if (response.data.length === 0) {
            setHasMoreGiveaways(false);
            return;
          }

          setGiveawayDetails(prev => {
            const newDetails = {...prev};
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
        // Failed to load giveaways
      } finally {
        setInitialLoadingGiveaways(false);
        setLoadingMoreGiveaways(false);
        isLoadingGiveawaysRef.current = false;
      }
    };

    loadGiveaways();
  }, [activeTab, giveawayPage, streamId]);

  // Reset pagination when switching to Giveaway tab
  useEffect(() => {
    if (activeTab === 'Giveaway') {
      setGiveawayPage(1);
      setAllGiveawayIds([]);
      setGiveawayDetails({});
      setHasMoreGiveaways(true);
      isLoadingGiveawaysRef.current = false;
    }
  }, [activeTab]);

  // Handle load more for giveaways
  const handleLoadMoreGiveaways = useCallback(() => {
    if (
      !loadingMoreGiveaways &&
      !isLoadingGiveawaysRef.current &&
      hasMoreGiveaways
    ) {
      setGiveawayPage(prev => prev + 1);
    }
  }, [loadingMoreGiveaways, hasMoreGiveaways]);

  console.log('loadingBuyNow', loadingBuyNow);

  // ✅ NEW: Fetch buy now items from API (matching web version)
  useEffect(() => {
    const loadBuyNowItems = async () => {
      console.log('useEffect loadBuyNowItems triggered', {activeTab, streamId});
      if (activeTab !== 'Buy now' || !streamId) return;

      // Prevent duplicate calls
      if (loadingBuyNow) {
        return;
      }

      console.log('loadBuyNowItems called');

      setLoadingBuyNow(true);
      try {
        console.log('📦 [SellerStore] Fetching buy now items from API');
        const response = await axiosInstance.get(
          `/shows/${streamId}/buy-now-items`,
          {
            params: {
              page: 1,
              limit: 100,
              sort: 'newest'
            }
          }
        );

        if (response.data.success) {
          console.log('✅ [SellerStore] Buy now items loaded:', response.data.data.length);
          
          // Store items with stock data
          const itemsMap = {};
          response.data.data.forEach(item => {
            itemsMap[item.itemId] = item;
          });
          
          setBuyNowDetails(itemsMap);
          setBuyNowItems(response.data.data.map(item => item.itemId));
          setHasMoreBuyNow(response.data.pagination?.hasMore || false);
        }
      } catch (error) {
        console.error('❌ [SellerStore] Failed to load buy now items:', error);
        ToastAndroid.show('Failed to load products', ToastAndroid.SHORT);
      } finally {
        setLoadingBuyNow(false);
      }
    };

    loadBuyNowItems();
  }, [activeTab, streamId]);

  // ✅ Reset buy now data when switching to Buy now tab
  useEffect(() => {
    if (activeTab === 'Buy now') {
      setBuyNowItems([]);
      setBuyNowDetails({});
      setHasMoreBuyNow(true);
      setLoadingBuyNow(false);
    }
  }, [activeTab]);
  // ✅ Show loading indicator when switching to FlashSale tab
  useEffect(() => {
    if (activeTab === 'FlashSale') {
      // Reset and show loading every time FlashSale tab is activated
      setHasRenderedFlashSale(false);
      const timer = setTimeout(() => {
        setHasRenderedFlashSale(true);
      }, 100); // Quick 100ms to allow smooth transition
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

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
      const response = await api.get(
        `/flash-live/${streamId}/flash-sale/history`,
      );
      if (response.data.success) {
        setFlashSaleHistory(response.data.data || []);
      }
    } catch (error) {
      setFlashSaleApiError('Failed to load history');
    } finally {
      setFlashSaleLoading(false);
    }
  }, [streamId]);
  // ✅ Re-fetch flash sale data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchInitialData = async () => {
        if (!showId || !socket) return;

        // Skip if we just started a flash sale (prevent overwriting socket update)
        if (skipNextFocusRefresh.current) {
          skipNextFocusRefresh.current = false;
          return;
        }

        setFlashSaleLoading(true);
        try {
          // 1. Get current active sales
          const response = await axiosInstance.get(
            `/flash-live/${showId}/flash-sale/active`,
          );
          if (response.data.success && response.data.data) {
            // ✅ Normalize field names AND preserve product details
            const normalizedFlashSales = (response.data.data.activeFlashSales || []).map(sale => {
              // Ensure productDetails exists for UI compatibility
              const productDetails = sale.productDetails || sale.productId || {};
              
              return {
                ...sale,
                // Ensure consistent field names for timer
                startTime: sale.startTime || sale.saleStartTime || sale.createdAt,
                endTime: sale.endTime || sale.saleEndTime,
                // Preserve flashSaleId if not present
                flashSaleId: sale.flashSaleId || sale._id,
                // ✅ Ensure productDetails is always present for UI
                productDetails: productDetails,
                // ✅ Preserve top-level fields for backward compatibility
                originalPrice: sale.originalPrice || sale.MRP || productDetails.MRP || 0,
                flashPrice: sale.flashPrice || productDetails.flashPrice || 0,
              };
            });
            setActiveFlashSales(normalizedFlashSales);
          }

          // 2. Get history
          await fetchFlashSaleHistory();

          // 3. Poke backend to initialize timers
          await axiosInstance.post(
            `/flash-live/${showId}/flash-sale/initialize-timers`,
          );
        } catch (error) {
          setFlashSaleApiError('Failed to load initial flash sale data');
        } finally {
          setFlashSaleLoading(false);
        }
      };

      fetchInitialData();
    }, [showId, fetchFlashSaleHistory]),
  );

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

    // 🔥 CRITICAL: Set flag to prevent useFocusEffect from overwriting socket update
    skipNextFocusRefresh.current = true;

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
      const errorMsg =
        error.response?.data?.message || 'Failed to start flash sale';
      setFlashSaleApiError(errorMsg);
      // negative(errorMsg);
      // Reset flag on error
      skipNextFocusRefresh.current = false;
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

    // 🔥 CRITICAL: Set flag to prevent useFocusEffect from overwriting socket update
    skipNextFocusRefresh.current = true;

    setFlashSaleLoading(true);
    setFlashSaleApiError(null);
    try {
      const bundleId = selectedBundle.bundleSaleId || selectedBundle._id;

      await axiosInstance.post(`/seller/bundle-flash-sale/start`, {
        showId: showId,
        bundleId: bundleId,
        flashPrice: parseFloat(formData.flashPrice),
        duration: formData.duration,
      });

      // positive('Bundle flash sale started successfully!');
      if (onStartedCallback) onStartedCallback();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || 'Failed to start bundle flash sale';
      setFlashSaleApiError(errorMsg);
      // negative(errorMsg);
      // Reset flag on error
      skipNextFocusRefresh.current = false;
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
        socket.emit('JOIN_LIVE_STREAM', streamId);
        setIsFlashSaleInitialized(true);
      } catch (error) {
        setIsFlashSaleInitialized(true); // Set anyway to prevent infinite loading
      }
    };

    // Initialize immediately on mount
    initializeFlashSale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, flashSaleData]);

  // ===========================================================================================
  // ✅ AppSync: FLASH SALE SUBSCRIPTIONS (REPLACING SOCKET.IO)
  // ===========================================================================================
  useEffect(() => {
    if (!streamId || !showId) {
      return;
    }

    let cleanup: (() => void) | null = null;

    const setupFlashSaleAppSync = async () => {
      try {
        console.log('🔌 [SellerStore] Setting up AppSync flash sale subscriptions');

        cleanup = await flashSaleLiveService.subscribeToLiveStreamFlashSales(showId, {
          // Regular Flash Sale Handlers
          onFlashSaleStarted: (data: any) => {
            console.log('✅ [SellerStore] Flash sale started:', data);
            setFlashSaleApiError(null);

            setActiveFlashSales(prev => {
              // Get the product ID from the flash sale data
              const flashProductId = data.productId?._id || data.productId;

              // Check if there's already a flash sale for this product
              const existingIndex = prev.findIndex(sale => {
                if (sale.isBundle) return false;
                const saleProductId = sale.productId?._id || sale.productId;
                return saleProductId === flashProductId || sale._id === data._id;
              });

              const normalizedFlashSale = {
                ...data,
                flashSaleId: data._id,
                isBundle: false,
                // Ensure consistent field names for timer
                startTime: data.startTime || data.saleStartTime || data.createdAt,
                endTime: data.endTime || data.saleEndTime,
              };

              if (existingIndex !== -1) {
                // Update existing flash sale at the same index
                const updated = [...prev];
                updated[existingIndex] = normalizedFlashSale;
                return updated;
              } else {
                // Add new flash sale
                return [...prev, normalizedFlashSale];
              }
            });
          },

          onFlashSaleEnded: (data: any) => {
            console.log('🔚 [SellerStore] Flash sale ended:', data.flashSaleId);
            setActiveFlashSales(prevActive =>
              prevActive.filter(
                sale =>
                  sale.isBundle ||
                  (sale._id !== data.flashSaleId &&
                    sale.flashSaleId !== data.flashSaleId),
              ),
            );
            setTimeout(() => fetchFlashSaleHistory(), 1000);
          },

          onStockUpdate: (data: any) => {
            console.log('📦 [SellerStore] Stock update:', data);
            setActiveFlashSales(prev =>
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
                    currentStock: data.currentStock,
                    products: updatedProducts,
                  };
                }
                return sale;
              }),
            );
          },

          // Bundle Flash Sale Handlers
          onBundleFlashSaleStarted: (data: any) => {
            console.log('✅ [SellerStore] Bundle flash sale started:', data);
            setFlashSaleApiError(null);

            setActiveFlashSales(prev => {
              const exists = prev.some(sale => sale.flashSaleId === data.flashSaleId);
              if (!exists) {
                return [
                  ...prev,
                  {
                    ...data,
                    isBundle: true,
                    // Ensure consistent field names for timer
                    startTime: data.startTime || data.saleStartTime || data.createdAt,
                    endTime: data.endTime || data.saleEndTime,
                  },
                ];
              }
              return prev;
            });
          },

          onBundleFlashSaleEnded: (data: any) => {
            console.log('🔚 [SellerStore] Bundle flash sale ended:', data.flashSaleId);
            setActiveFlashSales(prevActive =>
              prevActive.filter(
                sale => !sale.isBundle || sale.flashSaleId !== data.flashSaleId,
              ),
            );
            setTimeout(() => fetchFlashSaleHistory(), 1000);
          },

          onBundleStockUpdate: (data: any) => {
            console.log('📦 [SellerStore] Bundle stock update:', data);
            setActiveFlashSales(prev =>
              prev.map(sale => {
                if (sale.isBundle && sale.flashSaleId === data.flashSaleId) {
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
          },

          onError: (data: any) => {
            console.error('❌ [SellerStore] Flash Sale Error:', data.message);
            setFlashSaleApiError(data.message || 'An unknown error occurred');
            setFlashSaleLoading(false);
          },
        });

        console.log('✅ [SellerStore] AppSync flash sale subscriptions active');
        setIsFlashSaleInitialized(true);
      } catch (error) {
        console.error('❌ [SellerStore] Failed to setup AppSync:', error);
        setIsFlashSaleInitialized(true); // Set anyway to prevent infinite loading
      }
    };

    setupFlashSaleAppSync();

    return () => {
      console.log('🧹 [SellerStore] Cleaning up AppSync flash sale subscriptions');
      if (cleanup) cleanup();
    };
  }, [streamId, showId, fetchFlashSaleHistory, activeTab]);

  // ✅ Timer for visual updates - Active on ALL tabs for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Debug: Log state changes
  // useEffect(() => {
  //   // console.log('📊 State updated - Active:', activeFlashSales.length, 'History:', flashSaleHistory.length);
  // }, [activeFlashSales, flashSaleHistory]);

  // ✅ Memoized render function to prevent unnecessary re-renders
  const renderAuctionItem = useCallback(
    ({item}) => {
      const auctionDetail = item;
      const showAuctionProduct = products?.auction?.find(
        ap => ap.auctionObjectId === auctionDetail._id,
      );

      const mergedProduct = {
        productId: auctionDetail.productId,
        auctionObjectId: auctionDetail._id,
        auctionId: auctionDetail._id,
        startingPrice:
          showAuctionProduct?.startingPrice || auctionDetail.startingBid,
        reservedPrice:
          showAuctionProduct?.reservedPrice || auctionDetail.reservedPrice,
        productOwnerSellerId: auctionDetail.productOwnerSellerId,
        ...auctionDetail,
      };

      return (
        <AuctionSellerControl
          item={{
            currentAuction: mergedProduct,
            streamId: streamId,
          }}
          product={mergedProduct}
          currentAuction={mergedProduct}
          streamId={streamId}
        />
      );
    },
    [products?.auction, streamId],
  );

  // ✅ Memoized key extractor for auctions
  const auctionKeyExtractor = useCallback(item => {
    const auctionId = item?.auctionObjectId || item?.auctionId || item?._id;
    return `auction-${auctionId}`;
  }, []);

  // ✅ NEW: Render function using API data
  const renderBuyNowItemWithComponent = useCallback(
    ({item: itemId}) => {
      const itemData = buyNowDetails[itemId];
      if (!itemData) return null;
      
      const isBundle = itemData.type === 'bundle';
      
      return (
        <BuyProductsSeller
          showId={streamId}
          streamId={streamId}
          product={itemData.data} // ✅ Now includes stock fields!
          calculateTimeLeft={calculateTimeLeft}
          currentTime={currentTime}
          activeFlashSales={activeFlashSales}
          calculateDiscount={calculateDiscount}
          formatTime={formatTime}
          onStartFlashSale={prod => {
            setSelectedProductForFlashSale(prod);
            setShowStartModal(true);
            setActiveTab('FlashSale');
            setIsAutoNavigate(true);
          }}
          isBundle={isBundle}
        />
      );
    },
    [streamId, activeFlashSales, currentTime, calculateTimeLeft, calculateDiscount, formatTime, buyNowDetails],
  );

  // ✅ NEW: Key extractor using itemId
  const buyNowKeyExtractor = useCallback((itemId) => {
    return `buynow-${itemId}`;
  }, []);

  // ✅ Helper function to safely get product ID
  const getProductIdSafely = useCallback((productField) => {
    if (!productField) return null;
    if (typeof productField === 'object' && productField !== null && productField?._id) {
      return productField._id.toString();
    }
    return productField.toString();
  }, []);

  // ✅ Combine buy now products with active flash sales and deduplicate
  const getCombinedBuyNowProducts = useCallback(() => {
    const normalProducts = products?.buynow || [];
    const bundleProducts = products?.bundleSales || [];

    // Create Maps for deduplication from the start
    const productMap = new Map();
    const bundleMap = new Map();

    // Add all regular products to map
    normalProducts.forEach(product => {
      const productId = getProductIdSafely(product.productId || product._id);
      if (productId) {
        productMap.set(productId, product);
      }
    });

    // Add all bundles to map
    bundleProducts.forEach(bundle => {
      const bundleId = bundle.bundleSaleId || bundle._id;
      if (bundleId) {
        bundleMap.set(bundleId, bundle);
      }
    });

    // Process active flash sales - Merge with existing or add new
    activeFlashSales.forEach(flashSale => {
      if (flashSale.isBundle) {
        // Handle bundle flash sales
        const flashBundleId = flashSale.bundleId || flashSale._id;
        const existingBundle = bundleMap.get(flashBundleId);
        
        if (existingBundle) {
          // Merge flash sale data with existing bundle
          bundleMap.set(flashBundleId, {
            ...existingBundle,
            ...flashSale,
            bundleSaleId: flashBundleId,
            _isFlashSale: true,
            _flashSaleData: flashSale,
          });
        } else {
          // Add new bundle flash sale
          bundleMap.set(flashBundleId, {
            ...flashSale,
            bundleSaleId: flashBundleId,
            _isFlashSale: true,
            _flashSaleData: flashSale,
          });
        }
      } else {
        // Handle regular product flash sales
        const flashProductId = flashSale.productId?._id || flashSale.productId;
        if (!flashProductId) return;

        const productIdStr = getProductIdSafely(flashProductId);
        const existingProduct = productMap.get(productIdStr);
        
        if (existingProduct) {
          // Merge flash sale data with existing product
          productMap.set(productIdStr, {
            ...existingProduct,
            ...flashSale,
            productId: flashSale.productId,
            _id: existingProduct._id || flashProductId,
            _isFlashSale: true,
            _flashSaleData: flashSale,
          });
        } else {
          // Add new product flash sale (product not in original list)
          productMap.set(productIdStr, {
            ...flashSale,
            productId: flashSale.productId,
            _id: flashProductId,
            _isFlashSale: true,
            _flashSaleData: flashSale,
          });
        }
      }
    });

    // Combine results from both maps
    const combined = [
      ...Array.from(productMap.values()), 
      ...Array.from(bundleMap.values())
    ];
    
    return combined;
  }, [products?.buynow, products?.bundleSales, activeFlashSales, getProductIdSafely]);

  // ✅ Memoized render function for giveaway items
  const renderGiveawayItem = useCallback(
    ({item}) => {
      const giveawayId = item?._id || item?.giveawayId;
      const giveawayData = giveawayDetails[giveawayId] || item;

      return (
        <GiveawaySellerControl
          streamId={streamId}
          giveawayId={giveawayId}
          initialGiveawayDetails={giveawayData}
        />
      );
    },
    [streamId, giveawayDetails],
  );

  // ✅ Memoized key extractor for giveaways
  const giveawayKeyExtractor = useCallback(item => {
    return `giveaway-${item?._id || item?.giveawayId}`;
  }, []);


  // ✅ Render FlashSale content with loading state
  const renderFlashSaleContent = () => {
    // Show loading spinner when first switching to FlashSale tab
    if (activeTab === 'FlashSale' && !hasRenderedFlashSale) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading flash sales...</Text>
        </View>
      );
    }

    if (!flashSaleData || !streamId) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.emptyText}>Flash sale data not available</Text>
        </View>
      );
    }

    return (
      <View style={{flex: 1}}>
        <LiveStreamFlashSaleSeller
          showId={streamId}
          sellerId={flashSaleData.sellerId}
          socket={socket}
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
              setActiveTab('Buy now');
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <SellerHeader navigation={navigation} message={'Seller Store'} />
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContent}
        style={styles.tabContainer}>
        {['Auction', 'Buy now', 'Giveaway', 'FlashSale', 'Sold'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Auction' && (
          <>
            {initialLoadingAuctions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EAB308" />
                <Text style={styles.loadingText}>Loading auctions...</Text>
              </View>
            ) : (
              <FlatList
                data={auctionData}
                renderItem={renderAuctionItem}
                keyExtractor={auctionKeyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                onEndReached={handleLoadMoreAuctions}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No auction products found
                  </Text>
                }
                ListFooterComponent={() =>
                  loadingMoreAuctions ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#EAB308" />
                      <Text style={styles.footerText}>Loading more...</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}

        {console.log('🔄 Rendering Buy Now Tab', activeTab,loadingBuyNow)}

        {activeTab === 'Buy now' && (
          <>
            {loadingBuyNow ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffd700" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : (
              <FlatList
                data={buyNowItems}
                renderItem={renderBuyNowItemWithComponent}
                keyExtractor={buyNowKeyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No buy now products found</Text>
                }
              />
            )}
          </>
        )}

        {activeTab === 'Giveaway' && (
          <>
            {initialLoadingGiveaways ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading giveaways...</Text>
              </View>
            ) : (
              <FlatList
                data={allGiveawayIds.map(id => ({
                  _id: id,
                  ...giveawayDetails[id],
                }))}
                renderItem={renderGiveawayItem}
                keyExtractor={giveawayKeyExtractor}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                onEndReached={handleLoadMoreGiveaways}
                onEndReachedThreshold={0.3}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No giveaway products found
                  </Text>
                }
                ListFooterComponent={() =>
                  loadingMoreGiveaways ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#10B981" />
                      <Text style={styles.footerText}>Loading more...</Text>
                    </View>
                  ) : !hasMoreGiveaways && allGiveawayIds.length > 0 ? (
                    <View style={styles.footerLoader}>
                      <Text style={styles.footerText}>No more giveaways</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}

        {activeTab === 'FlashSale' && renderFlashSaleContent()}

        {activeTab === 'Sold' && (
          <View style={styles.listContainer}>
            <SoldProductsTab showId={streamId} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// Add this to your styles
const styles = StyleSheet.create({
  // ... your existing styles

  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryColor,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
    //backgroundColor: 'red',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    borderWidth: 2,
    borderColor: '#B38728',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    paddingVertical: 3,
    borderRadius: 15,
    marginTop: 10,
    maxHeight: 50,
    marginHorizontal: 5,
    borderBottomWidth: 1,
    backgroundColor: '#D9D9D924',
  },
  tabScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tab: {
    paddingBottom: 8,
    paddingHorizontal: 20,
    marginHorizontal: 4,
  },
  activeTab: {},
  tabText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  activeTabText: {
    color: '#EAB308',
    borderBottomWidth: 2,
    borderBottomColor: '#EAB308',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Auction Styles - Matching the left image
  auctionCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    // flexDirection:'row',
    // borderLeftWidth: 4,
    // borderLeftColor: '#EAB308',
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    width: '60%',
    marginBottom: 12,
  },
  priceInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  priceValue: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '600',
  },
  bidInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  bidValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  soldBadge: {
    backgroundColor: '#10B981',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  upcomingBadge: {
    backgroundColor: '#F59E0B',
  },
  lowStockBadge: {
    backgroundColor: '#FEF9C3',
  },
  outOfStockBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  soldText: {
    color: '#FFFFFF',
  },
  activeText: {
    color: '#15803D',
  },
  upcomingText: {
    color: '#FFFFFF',
  },
  lowStockText: {
    color: '#A16207',
  },
  outOfStockText: {
    color: '#B91C1C',
  },

  // Buy Now Styles - Matching the middle image
  buyNowCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: 0,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  productImageBuyNow: {
    width: 100,
    // height: 180,
    backgroundColor: '#374151',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  buyNowContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  buyNowTitle: {
    color: '#FFFFFF',
    flexShrink: 2,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buyNowCategory: {
    color: '#9CA3AF',
    fontSize: 12,
    flexShrink: 3,
    marginBottom: 8,
  },
  buyNowPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  buyNowStrikePrice: {
    color: '#ccc',
    fontSize: 14,
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginBottom: 8,
  },
  buyNowStats: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#777',
    paddingTop: 10,
    alignItems: 'center',
  },
  statsText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 4,
  },
  buyNowStatusContainer: {
    justifyContent: 'center',
    paddingRight: 12,
  },

  // Giveaway Styles - Matching the right image
  giveawayCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: 0,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  giveawayImage: {
    width: 80,
    // height: 100,
    backgroundColor: '#374151',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  giveawayContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  giveawayTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  giveawayCategory: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  giveawayPrice: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  winnerText: {
    color: '#10B981',
    fontSize: 12,
    marginBottom: 4,
  },
  entriesText: {
    color: '#9CA3AF',
    // fontSize: 16,
    fontWeight: 'bold',
  },
  giveawayStatusContainer: {
    justifyContent: 'flex-start',
    paddingRight: 12,
    paddingTop: 12,
  },

  flashButton: {
    alignSelf: 'flex-end',
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  flashButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 12,
  },
});

export default SellerStoreScreen;
//export default SellerStoreScreen;
