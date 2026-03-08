import React, {useCallback, useEffect, useState, useMemo, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ToastAndroid,
  ActivityIndicator,
  ScrollView,
  InteractionManager,
  Keyboard,
  Platform,
} from 'react-native';
import {GiftIcon, Hammer, ShoppingBag} from 'lucide-react-native';
import {colors} from '../../Utils/Colors';
import {bgaBackendUrl, bgaSocketUrl} from '../../../Config';
import {io} from 'socket.io-client';
import {
  subscribeToFlashSaleChannel,
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES,
} from '../../Utils/appSyncFlashSaleConfig';
import AuctionComponent from './Components/AuctionComponent';
import GiveawayComponent from './Components/GiveAwayComponents';
import {SafeAreaView} from 'react-native-safe-area-context';
import AuctionSellerControl from '../SellerComponents/LiveStreaming/Utils/AuctionSellerControl';
import GiveawaySellerControl from '../SellerComponents/LiveStreaming/Utils/GiveawaySellerControl';
import BuyProductsSeller from '../SellerComponents/LiveStreaming/BuyNow/BuyProductsSeller';
import axiosInstance from '../../Utils/Api';
import SellerHeader from '../SellerComponents/SellerForm/Header';
import bgaAxiosInstance from '../../Utils/bgaAxiosInstance';
import useLiveStreamTracker from './Utils/useLiveStreamTracker';
import {useAuthContext} from '../../Context/AuthContext';
import {useAccess} from '../../Context/AccessContext';
import giveawayService from './Services/giveawayService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BuyProducts from './Components/BuyNow/BuyProducts';
import LiveFlashSaleCheckoutSlider from './Components/FlashSale/LiveFlashSaleCheckoutSlider';
import BundleCheckoutSlider from './Payment/BundleCheckoutSlider';
import SoldProductsTab from '../SellerComponents/LiveStreaming/Utils/SoldProductsTab';
import {Toast} from '../../Utils/dateUtils';
import {productInterestService} from './Services/productInterestService';
import LiveStreamFlashSaleSeller from '../SellerComponents/LiveStreaming/FlashSale/LiveStreamFlashSaleSeller';

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

const StoreScreen = ({navigation, route}) => {
  const data = route.params || [];
  const id = data?.id;

  // ✅ Get passed showData from LiveScreen
  const passedShowData = data?.showData;
  
  const productStocks = data?.productStocks;
  const initialActiveFlashSales = data?.activeFlashSales || [];

  // Socket refs - initialized lazily in useEffect
  const socketRef = useRef(null);
  const flashSaleChannelRef = useRef(null); // ✅ Changed: AppSync channel ref
  const [socketsReady, setSocketsReady] = useState(false);
  const autoOpenedFlashSalesRef = useRef(new Set());

  // Flash sale and combined products state
  const [activeFlashSales, setActiveFlashSales] = useState(
    initialActiveFlashSales,
  );
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [batchEligibilityData, setBatchEligibilityData] = useState({});
  const {trackGiveawayEntry, trackProductInteraction} =
    useLiveStreamTracker(id);
  const initialActiveTab = data?.activeTab;
  // console.log('[StoreScreen] initialActiveTab:', initialActiveTab, 'route.params:', data);
  const [show, setShow] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialActiveTab || 'Auction');
  const [giveawayData, setGiveawayData] = useState([]);
  const {user} = useAuthContext();
  const {enterAccessMode, exitAccessMode, isAccessMode, hasPageAccess, sellerId} = useAccess();
  const [isComponentReady, setIsComponentReady] = useState(false);

  // Giveaway pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPages, setTotalPages] = useState({
    auction: 0,
    giveaway: 0,
    buyNow: 0,
  });
  const [totalProductsCounts, setTotalProductsCounts] = useState({
    auction:0,
    giveaway:0,
    buyNow:0,
  });

  // Auction pagination states
  const [auctionPage, setAuctionPage] = useState(1);
  const [hasMoreAuctions, setHasMoreAuctions] = useState(true);
  const [initialLoadingAuctions, setInitialLoadingAuctions] = useState(true);
  const [loadingMoreAuctions, setLoadingMoreAuctions] = useState(false);
  const [totalPagesAuctions, setTotalPagesAuctions] = useState(0);
  const [allAuctionIds, setAllAuctionIds] = useState([]);
  const [auctionData, setAuctionData] = useState([]);

  // Buy now pagination states
  const [buyNowPage, setBuyNowPage] = useState(1);
  const [hasMoreBuyNow, setHasMoreBuyNow] = useState(true);
  const [initialLoadingBuyNow, setInitialLoadingBuyNow] = useState(true);
  const [loadingMoreBuyNow, setLoadingMoreBuyNow] = useState(false);
  const [totalPagesBuyNow, setTotalPagesBuyNow] = useState(0);
  const [buyNowData, setBuyNowData] = useState({});

  const [buyNowItems, setBuyNowItems] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutType, setCheckoutType] = useState('static');
  const [checkoutFlashSaleId, setCheckoutFlashSaleId] = useState(null);
  const [allGiveawayIds, setAllGiveawayIds] = useState([]);
  
  // Bundle checkout state
  const [bundleCheckoutOpen, setBundleCheckoutOpen] = useState(false);
  const [bundleCheckoutId, setBundleCheckoutId] = useState(null);
  const [bundleFlashSaleData, setBundleFlashSaleData] = useState(null);

  // ✅ NEW: Product Interest State
  const [productInterests, setProductInterests] = useState({}); // { productId: { isInterested: bool, count: number } }
  const [loadingInterests, setLoadingInterests] = useState(false);
  
  // ✅ Flash Sale State
  const [showStartFlashSaleModal, setShowStartFlashSaleModal] = useState(false);
  const [selectedProductForFlashSale, setSelectedProductForFlashSale] = useState(null);
  const [flashSaleLoading, setFlashSaleLoading] = useState(false);
  const [flashSaleApiError, setFlashSaleApiError] = useState(null);
  const [flashSaleHistory, setFlashSaleHistory] = useState([]);
  
  // ✅ Auto-navigate state (like SellerStoreScreen)
  const [isAutoNavigate, setIsAutoNavigate] = useState(false);
  
  // Keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const isAuthenticated = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    return !!(accessToken && user);
  };

  // console.log("[store screen] store screen")
  const requireAuth =useCallback( async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return false;
    }
    return true;
  },[])
  
  // Utility functions for flash sales
  const calculateDiscount = useCallback((originalPrice, flashPrice) => {
    if (!originalPrice || originalPrice === 0 || !flashPrice) return 0;
    return Math.round(((originalPrice - flashPrice) / originalPrice) * 100);
  }, []);

  const calculateTimeLeft = useCallback((endTime, now) => {
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.ceil((end - now) / 1000));
  }, []);

  const formatTime = useCallback(seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);
  
  // ✅ Compute access permissions - determines if user should see seller controls
  const hasAuctionAccess = isAccessMode && hasPageAccess('SHOWS_AUCTION') && sellerId === show?.host?._id;
  const hasBuyNowAccess = isAccessMode && hasPageAccess('SHOWS_BUY_NOW') && sellerId === show?.host?._id;
  const hasGiveawayAccess = isAccessMode && hasPageAccess('SHOWS_GIVEAWAY') && sellerId === show?.host?._id;
  const hasFlashSaleAccess = isAccessMode && hasPageAccess('SHOWS_FLASH_SALE') && sellerId === show?.host?._id;
  
  // ✅ DEBUG: Log access permissions for all tabs
  // console.log('🔍 [StoreScreen Access Check]', {
  //   isAccessMode,
  //   sellerId,
  //   showHostId: show?.host?._id,
  //   sellerIdMatchesHost: sellerId === show?.host?._id,
  //   hasAuctionAccess,
  //   hasBuyNowAccess,
  //   hasGiveawayAccess,
  //   hasFlashSaleAccess,
  //   permissions: {
  //     SHOWS_AUCTION: hasPageAccess('SHOWS_AUCTION'),
  //     SHOWS_BUY_NOW: hasPageAccess('SHOWS_BUY_NOW'),
  //     SHOWS_GIVEAWAY: hasPageAccess('SHOWS_GIVEAWAY'),
  //     SHOWS_FLASH_SALE: hasPageAccess('SHOWS_FLASH_SALE'),
  //   }
  // });
  
  // ✅ Flash Sale Handlers
  const handleStartFlashSale = async (selectedProduct, formData, onStartedCallback) => {
    if (!selectedProduct) {
      setFlashSaleApiError('Please select a product');
      Toast('Please select a product');
      return;
    }
    
    // Check if it's a bundle - if so, use bundle handler
    if (selectedProduct.isBundle || selectedProduct.bundleSaleId) {
      return handleStartBundleFlashSale(selectedProduct, formData, onStartedCallback);
    }
    
    setFlashSaleLoading(true);
    setFlashSaleApiError(null);
    try {
      const productId = selectedProduct._id || selectedProduct.productId?._id;
      await axiosInstance.post(`flash-live/${id}/flash-sale/start`, {
        productId: productId,
        flashPrice: parseFloat(formData.flashPrice),
        duration: formData.duration
      });
      
      Toast('Flash sale started successfully!');
      
      // Close modal and reset state
      setShowStartFlashSaleModal(false);
      setSelectedProductForFlashSale(null);
      
      if (onStartedCallback) onStartedCallback();
    } catch (error) {
      console.error('❌ Error starting regular flash sale:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start flash sale';
      setFlashSaleApiError(errorMsg);
      Toast(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  const handleStartBundleFlashSale = async (selectedBundle, formData, onStartedCallback) => {
    if (!selectedBundle) {
      setFlashSaleApiError('Please select a bundle');
      Toast('Please select a bundle');
      return;
    }
    
    setFlashSaleLoading(true);
    setFlashSaleApiError(null);
    try {
      const bundleId = selectedBundle.bundleSaleId || selectedBundle._id;
      
      await axiosInstance.post(`/seller/bundle-flash-sale/start`, {
        showId: id,
        bundleId: bundleId,
        flashPrice: parseFloat(formData.flashPrice),
        duration: formData.duration
      });
      
      Toast('Bundle flash sale started successfully!');
      
      // Close modal and reset state
      setShowStartFlashSaleModal(false);
      setSelectedProductForFlashSale(null);
      
      if (onStartedCallback) onStartedCallback();
    } catch (error) {
      console.error('❌ Error starting bundle flash sale:', error);
      const errorMsg = error.response?.data?.message || 'Failed to start bundle flash sale';
      setFlashSaleApiError(errorMsg);
      Toast(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  const handleEndFlashSale = async (flashSaleId) => {
    if (!flashSaleId) {
      Toast('No flash sale ID provided');
      return;
    }
    
    setFlashSaleLoading(true);
    try {
      await axiosInstance.post(`flash-live/${id}/flash-sale/end`, {
        flashSaleId
      });
      
      Toast('Flash sale ended successfully!');
      // State update happens via AppSync event
    } catch (error) {
      console.error('❌ Error ending flash sale:', error);
      const errorMsg = error.response?.data?.message || 'Failed to end flash sale';
      setFlashSaleApiError(errorMsg);
      Toast(errorMsg);
    } finally {
      setFlashSaleLoading(false);
    }
  };

  const fetchFlashSaleHistory = useCallback(async () => {
    if (!id) return;
    
    try {
      console.log('📡 [StoreScreen Flash Sale] Fetching flash sale history for show:', id);
      const response = await axiosInstance.get(`/flash-live/${id}/flash-sale/history`);
      
      console.log('🔍 [StoreScreen Flash Sale] Full API response:', response.data);
      
      // ✅ Check for both 'status' and 'success' fields
      if (response.data.status || response.data.success) {
        // Handle different response structures
        let historyData = [];
        
        if (Array.isArray(response.data.data)) {
          historyData = response.data.data;
        } else if (response.data.data && Array.isArray(response.data.data.history)) {
          historyData = response.data.data.history;
        } else if (response.data.data && Array.isArray(response.data.data.sales)) {
          historyData = response.data.data.sales;
        } else if (response.data.history) {
          historyData = response.data.history;
        }
        
        console.log('✅ [StoreScreen Flash Sale] Flash sale history loaded:', historyData);
        setFlashSaleHistory(historyData);
      } else {
        console.warn('⚠️ [StoreScreen Flash Sale] API returned status false:', response.data);
      }
    } catch (error) {
      console.error('❌ [StoreScreen Flash Sale] Error fetching flash sale history:', error);
      // Don't show error to user - history is optional
    }
  }, [id]);

  // ✅ NEW: Product Interest Handlers
  const handleToggleInterest = useCallback( async (itemId, itemType = 'product') => {
    if (!user) {
      await requireAuth();
      return;
    }

    // Store the original state before any changes (outside try-catch)
    const originalState = productInterests[itemId];
    const isCurrentlyInterested = originalState?.isInterested || false;
    const originalCount = originalState?.count || 0;

    try {
      // Calculate new count based on toggle action
      const newCount = isCurrentlyInterested ? Math.max(0, originalCount - 1) : originalCount + 1;

      // Optimistic update with calculated count
      setProductInterests(prev => ({
        ...prev,
        [itemId]: {
          isInterested: !isCurrentlyInterested,
          count: newCount,
        },
      }));

      // Call API with new unified route
      const result = await productInterestService.toggleInterest(
        itemId,
        id,
        itemType,
      );

      if (result.success) {
        // Update with actual data from server if available, otherwise keep optimistic update
        setProductInterests(prev => ({
          ...prev,
          [itemId]: {
            isInterested: result.data.isInterested,
            count: result.data.interestCount !== undefined ? result.data.interestCount : newCount,
          },
        }));
      }
    } catch (error) {
      console.log('Failed to toggle interest:', error);
      // Revert to original state on error
      setProductInterests(prev => ({
        ...prev,
        [itemId]: {
          isInterested: isCurrentlyInterested, // Revert to original
          count: originalCount, // Revert to original
        },
      }));
      Toast('Failed to update interest. Please try again.');
    }
  }, [productInterests, user, id, requireAuth]);

  const fetchGiveaway = useCallback(
    async (page = 1, isInitial = false) => {
      // console.log("[GIVEAWAY] Fetching details for page:", page, "show ID:", id)
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await bgaAxiosInstance.get(
          `show/${id}?page=${page}&limit=10`,
        );
        console.log("[GIVEAWAY] Response received:", response.data);
        setTotalProductsCounts(prev => ({...prev, giveaway: response.data.pagination.total || 0}));
        const {data, pagination} = response.data;

        if (page === 1) {
          setAllGiveawayIds(data.map(g => g._id));
          setGiveawayData(data);
        } else {
          setAllGiveawayIds(prev => {
            const newIds = data.map(g => g._id);
            const existingIds = new Set(prev);
            const uniqueNewIds = newIds.filter(id => !existingIds.has(id));
            return [...prev, ...uniqueNewIds];
          });
          setGiveawayData(prev => [...prev, ...data]);
        }

        setHasMore(pagination.hasMore);
        setTotalPages(pagination.totalPages);
        setCurrentPage(page);
      } catch (err) {
        console.log('[GIVEAWAY] Error loading giveaways:', err);
        ToastAndroid.show('Failed to load giveaways', ToastAndroid.SHORT);
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [id],
  );
  // console.log(bgaBackendUrl)

  const fetchAuction = useCallback(
    async (page = 1, isInitial = false) => {
      if (isInitial) {
        setInitialLoadingAuctions(true);
      } else {
        setLoadingMoreAuctions(true);
      }
      // console.log("[AUCTION] Fetching /data for page:", page)
      try {
        const response = await bgaAxiosInstance.get(
          `api/auctions/by-show/${id}?page=${page}&limit=10`,
        );
        const {data, pagination} = response.data;
        console.log("[AUCTION] Response received, data count:", response.data.totalCount);
        setTotalProductsCounts(prev => ({...prev, auction: response.data.totalCount || 0}));
        if (page === 1) {
          setAllAuctionIds(data.map(a => a._id));
          setAuctionData(data);
        } else {
          setAllAuctionIds(prev => {
            const newIds = data.map(a => a._id);
            const existingIds = new Set(prev);
            const uniqueNewIds = newIds.filter(id => !existingIds.has(id));
            return [...prev, ...uniqueNewIds];
          });
          setAuctionData(prev => [...prev, ...data]);
        }

        setHasMoreAuctions(pagination.hasMore);
        setTotalPagesAuctions(pagination.totalPages);
        setAuctionPage(page);
      } catch (err) {
        console.log('[AUCTION] Error loading auctions:', err);
        // ToastAndroid.show('Failed to load auctions', ToastAndroid.SHORT);
      } finally {
        setInitialLoadingAuctions(false);
        setLoadingMoreAuctions(false);
      }
    },
    [id],
  );

  const fetchBuyNow = useCallback(
    async (page = 1, isInitial = false) => {
      if (isInitial) {
        setInitialLoadingBuyNow(true);
      } else {
        setLoadingMoreBuyNow(true);
      }
      // console.log("[BUY NOW] Fetching data for page:", page, "show ID:", id)
      try {
        const response = await axiosInstance.get(`/shows/${id}/buy-now-items`, {
          params: {page, limit: 10},
        });

const {pagination} = response.data;
console.log("[BUY NOW] Response received, data count:", response.data);
// Update items details map (for quick lookup)
setBuyNowData(prev => {
  const newDetails = { ...prev };
  response.data.data.forEach(item => {
    newDetails[item.itemId] = item;
  });
  return newDetails;
});
setTotalProductsCounts(prev => ({...prev, buyNow: pagination.totalItems || 0}));
           
        // Transform the data structure - extract from nested 'data' property
        // const transformedData = data.map(item => {
        //   if (item.type === 'bundle') {
        //     return {
        //       ...item.data,
        //       itemId: item.itemId,
        //       type: item.type,
        //       createdAt: item.createdAt,
        //       price: item.price,
        //     };
        //   } else {
        //     // For product type
        //     return {
        //       ...item.data,
        //       itemId: item.itemId,
        //       type: item.type,
        //       createdAt: item.createdAt,
        //       price: item.price,
        //     };
        //   }
        // });

        // if (page === 1) {
        //   setBuyNowData(transformedData);
        // } else {
        //   setBuyNowData(prev => [...prev, ...transformedData]);
        // }
         if (pagination?.currentPage === 1) {
            // First page - replace all items
            setBuyNowItems(response.data.data.map(item => item.itemId));
          } else {
            // Subsequent pages - append items (with duplicate check)
            setBuyNowItems(prev => {
              const newIds = response.data.data.map(item => item.itemId);
              const existingIds = new Set(prev);
              const uniqueNewIds = newIds.filter(id => !existingIds.has(id));
              
              if (uniqueNewIds.length === 0) {
                console.warn('⚠️ [Buy Now] No new unique items to add');
              }
              
              return [...prev, ...uniqueNewIds];
            });
          }
          

        setHasMoreBuyNow(pagination?.hasMore);
        setTotalPagesBuyNow(pagination?.totalPages);
        setBuyNowPage(page);
      } catch (err) {
        console.log('[BUY NOW] Error loading buy now items:', err);
        ToastAndroid.show('Failed to load products', ToastAndroid.SHORT);
      } finally {
        setInitialLoadingBuyNow(false);
        setLoadingMoreBuyNow(false);
      }
    },
    [id],
  );

  const handleFlashSalePurchase = useCallback(
    async (flashSaleId, productId, _quantity = 1) => {
      const isAuth = await requireAuth();

      if (!isAuth) {
        return;
      }

      const flashSale = activeFlashSales.find(
        sale => sale.flashSaleId === flashSaleId || sale._id === flashSaleId,
      );

      // console.log('🔍 [handleFlashSalePurchase] Looking for flash sale:', flashSaleId);
      // console.log('🔍 [handleFlashSalePurchase] Active flash sales:', JSON.stringify(activeFlashSales, null, 2));
      // console.log('🔍 [handleFlashSalePurchase] Found flash sale:', JSON.stringify(flashSale, null, 2));

      if (!flashSale) {
        ToastAndroid.show(
          'Flash sale not found or has ended',
          ToastAndroid.LONG,
        );
        return;
      }

      // ✅ Check if this is a bundle flash sale
      if (flashSale.isBundle) {
        console.log('🎁 Opening bundle flash sale checkout');
        setBundleCheckoutId(flashSale.bundleId || flashSale._id);
        setBundleFlashSaleData({
          flashSaleId: flashSale.flashSaleId,
          flashPrice: flashSale.flashPrice || flashSale.bundlePrice,
          flashSaleEndTime: flashSale.endTime,
        });
        setBundleCheckoutOpen(true);
        Toast('Opening checkout for bundle flash sale!');
        return;
      }

      // Regular product flash sale
      let productData = null;
      if(flashSale.productDetails && typeof flashSale.productDetails === 'object') {
        productData = flashSale.productDetails;
      }
      else if (flashSale.productId && typeof flashSale.productId === 'object') {
        productData = flashSale.productId;
      } else if (
        flashSale.products &&
        flashSale.products[0] &&
        flashSale.products[0].fullProductData
      ) {
        productData = flashSale.products[0].fullProductData;
      } else if (flashSale.products && flashSale.products[0]) {
        const firstProduct = flashSale.products[0];
        productData = {
          _id: firstProduct.productId,
          title:
            firstProduct.productTitle ||
            flashSale.title ||
            'Flash Sale Product',
          MRP: firstProduct.originalPrice || 0,
          productPrice: firstProduct.originalPrice || 0,
          images: firstProduct.productImage
            ? [{key: firstProduct.productImage}]
            : [],
          category: 'General',
          gstRate: 0,
          weight: {value: 230, unit: 'grams'},
        };
      } else {
        productData = {
          _id: productId,
          title: flashSale.title || 'Flash Sale Product',
          productPrice: flashSale.originalPrice || 0,
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

      const enhancedProduct = {
        ...productData,
        flashSale: {
          isActive: true,
          flashPrice:
            flashSale.flashPrice || flashSale.products?.[0]?.flashPrice,
          flashSaleId: flashSale.flashSaleId || flashSale._id,
          endsAt: flashSale.saleEndTime || flashSale.endTime || flashSale.endsAt,
          flashStock: flashSale.availableStock ||
            flashSale.currentStock ||
            flashSale.products?.[0]?.currentFlashStock ||
            0,
            
      childVariantIds: productData.childVariantIds || [],
      parentProductId: productData.parentProductId || null,
      isVariant: productData.isVariant || false,
      variantAttributes: productData.variantAttributes || [],
          startsAt: flashSale.saleStartTime || flashSale.startTime || flashSale.startsAt,
        },
      };

      setCheckoutProduct(enhancedProduct);
      setCheckoutType('flash_sale');
      setCheckoutFlashSaleId(flashSale.flashSaleId || flashSale._id);
      setCheckoutOpen(true);

      Toast('Opening checkout for flash sale item!');
    },
    [activeFlashSales, requireAuth],
  );

  const renderAuctionItem = useCallback(
    ({index: _index}) => {
      const auctionDetail = auctionData[_index];
      
      // ✅ Safety check: Return null if auction data doesn't exist yet
      if (!auctionDetail) {
        return null;
      }
      
      // ✅ DEBUG: Log rendering decision
      // console.log('🎨 [renderAuctionItem] Rendering decision:', {
      //   hasAuctionAccess,
      //   willRenderSellerControl: hasAuctionAccess,
      //   auctionId: auctionDetail._id
      // });
      
      // ✅ Render seller control if user has access, otherwise render user component
      if (hasAuctionAccess) {
        console.log('✅ [renderAuctionItem] Rendering AuctionSellerControl');
        return (
          <AuctionSellerControl
            item={{
              streamId: id,
              currentAuction: auctionDetail,
            }}
          />
        );
      }
      
      // console.log('👤 [renderAuctionItem] Rendering AuctionComponent (user view)');
      return (
        <AuctionComponent
          item={auctionDetail}
          streamId={id}
          
          currentAuction={auctionDetail}
        />
      );
    },
    [auctionData, id, hasAuctionAccess],
  );

  const renderBuyNowItem = useCallback(
    ({item: itemId, index}) => {
      const item = buyNowData[itemId];
      
      if (!item) {
        console.warn('⚠️ Item not found for itemId:', itemId);
        return null;
      }

      // Get the item type and data
      const itemType = item.type; // 'product' or 'bundle'
      const itemData = item.data;
      
      // ✅ Render seller control if user has buy now access
      if (hasBuyNowAccess) {
        // Check if this item has an active flash sale
        let flashSaleData = null;
        
        if (itemType === 'bundle') {
          flashSaleData = activeFlashSales.find(
            fs =>
              fs.isBundle &&
              (fs.bundleId === itemData?.bundleSaleId ||
                fs.flashSaleId === itemData?.flashSaleId),
          );
        } else {
          const productId = itemData?.productId?._id || itemData?._id;
          flashSaleData = activeFlashSales.find(
            fs =>
              !fs.isBundle &&
              (fs.productId === productId ||
                fs.productId?._id === productId ||
                fs.products?.some(
                  p => p.productId === productId || p.productId?._id === productId,
                )),
          );
        }

        return (
          <BuyProductsSeller
            showId={id}
            streamId={id}
            product={itemData}
            activeFlashSales={activeFlashSales}
            onStartFlashSale={(product) => {
              console.log('🚀 [StoreScreen] Opening flash sale modal for product:', product);
              setSelectedProductForFlashSale(product);
              setShowStartFlashSaleModal(true);
              setActiveTab('Flash Sale');
              setIsAutoNavigate(true);
            }}
            calculateTimeLeft={calculateTimeLeft}
            currentTime={currentTime}
            calculateDiscount={calculateDiscount}
            formatTime={formatTime}
            isBundle={itemType === 'bundle'}
            interestCount={0}
          />
        );
      }
      
      const isReservedForLive =(
        show?.showStatus?.toString() != 'live' &&
        item?.data?.productId?.reserveForLive == true)||(item.type=="bundle"&&show?.showStatus?.toString() != 'live') ;
      // Determine interest tracking ID
      const itemIdForInterest =
        itemType === 'bundle'
          ? itemData?.bundleSaleId
          : itemData?.productId?._id || itemData?._id;

      const interestData = itemIdForInterest
        ? productInterests[itemIdForInterest]
        : null;
// console.log("Interest data for item:", itemIdForInterest, interestData)
      // Check if this item has an active flash sale
      let enrichedProduct = {...itemData};
      let isBundleFlashSale = false;

      if (itemType === 'bundle') {
        // Check if this bundle is in an active flash sale
        const bundleFlashSale = activeFlashSales.find(
          fs =>
            fs.isBundle &&
            (fs.bundleId === itemData?.bundleSaleId ||
              fs.flashSaleId === itemData?.flashSaleId),
        );

        if (bundleFlashSale) {
          isBundleFlashSale = true;
          enrichedProduct._isFlashSale = true;
          enrichedProduct._flashSaleData = bundleFlashSale;
          enrichedProduct.isBundleFlashSale = true;
          enrichedProduct.flashSaleId = bundleFlashSale.flashSaleId;
          enrichedProduct.flashSaleEndTime = bundleFlashSale.endTime;
        }
      } else {
        // Regular product - check if it's in an active flash sale
        const productId = itemData?.productId?._id || itemData?._id;
        const productFlashSale = activeFlashSales.find(
          fs =>
            !fs.isBundle &&
            (fs.productId === productId ||
              fs.productId?._id === productId ||
              fs.products?.some(
                p => p.productId === productId || p.productId?._id === productId,
              )),
        );

        if (productFlashSale) {
          // ✅ Debug: Log flash sale stock mapping
          console.log('🔍 [renderBuyNowItem] Mapping flash sale stock for product:', productId);
          console.log('🔍 [renderBuyNowItem] Flash sale data:', {
            currentStock: productFlashSale.currentStock,
            currentFlashStock: productFlashSale.currentFlashStock,
            availableStock: productFlashSale.availableStock,
            products: productFlashSale.products
          });
          

          enrichedProduct._isFlashSale = true;
          enrichedProduct._flashSaleData = {
            ...productFlashSale,
            flashSaleId: productFlashSale.flashSaleId || productFlashSale._id,
            flashPrice: productFlashSale.flashPrice || productFlashSale.products?.[0]?.flashPrice || 0,
            originalPrice:
              productFlashSale.originalPrice || itemData?.productId?.MRP,
            saleEndTime: productFlashSale.endTime,
            availableStock:
              productFlashSale.currentStock || productFlashSale.currentFlashStock || productFlashSale.availableStock,
          };
          // Also set flashSaleEndTime on productId for BuyProducts component
          if (enrichedProduct.productId) {
            enrichedProduct.productId.flashSaleEndTime = productFlashSale.endTime;
            enrichedProduct.productId.flashSaleStock = productFlashSale.currentStock || productFlashSale.currentFlashStock || productFlashSale.availableStock;
          }
        }
      }

      return (
        <BuyProducts
          product={enrichedProduct}
          productStocks={productStocks}
          onFlashSalePurchase={handleFlashSalePurchase}
          isBundle={itemType === 'bundle'}
          isBundleFlashSale={isBundleFlashSale}
          streamId={id}
          isReservedForLive={isReservedForLive}
          index={index}
          currentTime={currentTime}
          calculateDiscount={calculateDiscount}
          formatTime={formatTime}
          calculateTimeLeft={calculateTimeLeft}
          requireAuth={requireAuth}
          trackProductInteraction={trackProductInteraction}
          isInterested={interestData?.isInterested || false}
          interestCount={interestData?.count || 0}
          onToggleInterest={handleToggleInterest}
          showStatus={show?.showStatus}
        />
      );
    },
    [
      buyNowData,
      productStocks,
      handleFlashSalePurchase,
      id,
      currentTime,
      calculateDiscount,
      formatTime,
      calculateTimeLeft,
      requireAuth,
      trackProductInteraction,
      productInterests,
      handleToggleInterest,
      activeFlashSales,
      show?.showStatus,
    ],
  );

  const renderGiveawayItem = useCallback(
    ({item, index}) => {
      const giveawayDetail = giveawayData[index];
      
      // ✅ Render seller control if user has giveaway access
      if (hasGiveawayAccess) {
        return (
          <GiveawaySellerControl
            streamId={id}
            giveawayId={item}
            initialGiveawayDetails={giveawayDetail}
          />
        );
      }
      
      // console.log(giveawayDetail._id,batchEligibilityData[item])
      return (
        <GiveawayComponent
          item={giveawayDetail}
          trackGiveawayEntry={trackGiveawayEntry}
          batchEligibilityData={batchEligibilityData[item]}
          giveawayId={item}
          streamId={id}
          showData={show}
          isInStoreView={true}
        />
      );
    },
    [giveawayData, trackGiveawayEntry, batchEligibilityData, id, show, hasGiveawayAccess],
  );

  // Memoized combined products calculation
  const combinedBuyNowProducts = useMemo(() => {
    const normalProducts = show?.buyNowProducts || [];
    const bundleProducts = show?.bundleSales || [];

    if (activeTab !== 'Buy now') {
      return [...normalProducts, ...bundleProducts];
    }

    const flashSaleProducts = activeFlashSales
      .filter(flashSale => !flashSale.isBundle)
      .map(flashSale => {
        let productData = null;
        let productIdToMatch = null;

        if (flashSale.productId && typeof flashSale.productId === 'object') {
          productData = flashSale.productId;
          productIdToMatch = flashSale.productId._id;
        } else if (flashSale.productId) {
          productIdToMatch = flashSale.productId.toString();
          const matchingProduct = normalProducts.find(
            p => getProductIdSafely(p.productId) === productIdToMatch,
          );
          if (matchingProduct) {
            productData = matchingProduct.productId;
          }
        } else if (
          flashSale.products &&
          flashSale.products[0] &&
          flashSale.products[0].productId
        ) {
          const firstProduct = flashSale.products[0];
          if (typeof firstProduct.productId === 'object') {
            productData = firstProduct.productId;
            productIdToMatch = firstProduct.productId._id;
          } else {
            productIdToMatch = firstProduct.productId.toString();
            const matchingProduct = normalProducts.find(
              p => getProductIdSafely(p.productId) === productIdToMatch,
            );
            if (matchingProduct) {
              productData = matchingProduct.productId;
            } else {
              productData = {
                _id: firstProduct.productId,
                title:
                  firstProduct.productTitle ||
                  flashSale.title ||
                  'Flash Sale Product',
                productPrice:
                  firstProduct.flashPrice || firstProduct.originalPrice || 0,
                MRP: firstProduct.originalPrice || 0,
                images: firstProduct.productImage
                  ? [{key: firstProduct.productImage}]
                  : [],
                description: flashSale.description || '',
                category: 'General',
                gstRate: 0,
                weight: {value: 230, unit: 'grams'},
                brand: '',
                manufacturer: '',
                manufacturerAddress: '',
                deliveryCharge: 0,
                estimatedDeliveryDate: 5,
                hasReturn: false,
                returnDays: null,
                returnPolicy: [],
              };
            }
          }
        }

        if (!productData || !productIdToMatch) {
          return null;
        }

        const currentStock =
          Number(flashSale.currentStock) ||
          Number(flashSale.currentFlashStock) ||
          Number(flashSale.products?.[0]?.currentFlashStock) ||
          0;

        const flashPrice =
          flashSale.flashPrice || flashSale.products?.[0]?.flashPrice || 0;
        const originalPrice =
          flashSale.originalPrice ||
          flashSale.products?.[0]?.originalPrice ||
          productData.MRP ||
          0;

        return {
          productId: {
            ...productData,
            productPrice:
              flashPrice > 0 ? flashPrice : productData.productPrice || 0,
            MRP: originalPrice,
            isFlashSale: true,
            flashSaleId: flashSale.flashSaleId || flashSale._id,
            flashSaleEndTime: flashSale.endTime,
            flashSaleStock: currentStock,
          },
          productPrice:
            flashPrice > 0 ? flashPrice : productData.productPrice || 0,
          _isFlashSale: true,
          _flashSaleData: flashSale,
          _productIdToMatch: productIdToMatch,
        };
      })
      .filter(Boolean);

    const bundleFlashSales = activeFlashSales
      .filter(flashSale => flashSale.isBundle)
      .map(flashSale => {
        return {
          bundleSaleId: flashSale.bundleId || flashSale._id,
          bundleTitle: flashSale.bundleTitle || 'Bundle Flash Sale',
          bundleImage: flashSale.bundleImage,
          bundlePrice: flashSale.flashPrice || flashSale.bundlePrice || 0,
          originalPrice: flashSale.originalPrice || flashSale.bundleMRP || 0,
          bundleQuantity: flashSale.bundleQuantity || 0,
          products: flashSale.products || [],
          isBundle: true,
          isBundleFlashSale: true,
          flashSaleId: flashSale.flashSaleId,
          flashSaleEndTime: flashSale.endTime,
          _flashSaleData: flashSale,
        };
      });

    let combined = [...normalProducts, ...bundleProducts];

    flashSaleProducts.forEach(flashProduct => {
      const flashProductId =
        flashProduct._productIdToMatch ||
        getProductIdSafely(flashProduct.productId);

      const existingIndex = combined.findIndex(p => {
        const pId = getProductIdSafely(p.productId);
        const pIdObj = p.productId?._id?.toString();
        return pId === flashProductId || pIdObj === flashProductId;
      });

      if (existingIndex !== -1) {
        combined[existingIndex] = flashProduct;
      } else {
        combined.push(flashProduct);
      }
    });

    bundleFlashSales.forEach(flashBundle => {
      const flashBundleId = flashBundle.bundleSaleId;
      const existingIndex = combined.findIndex(
        p => p.bundleSaleId === flashBundleId,
      );

      if (existingIndex !== -1) {
        combined[existingIndex] = flashBundle;
      } else {
        combined.push(flashBundle);
      }
    });

    const productMap = new Map();
    const bundleMap = new Map();

    combined.forEach(product => {
      const productId = getProductIdSafely(product.productId);
      const bundleId = product.bundleSaleId || product.bundleId;

      if (bundleId) {
        const existing = bundleMap.get(bundleId);

        if (!existing) {
          bundleMap.set(bundleId, product);
        } else {
          const isCurrentFlashBundle =
            product.isBundleFlashSale || product.flashSaleId;
          const isExistingFlashBundle =
            existing.isBundleFlashSale || existing.flashSaleId;

          if (isCurrentFlashBundle && !isExistingFlashBundle) {
            bundleMap.set(bundleId, product);
          }
        }
        return;
      }

      if (!productId) {
        return;
      }

      const existing = productMap.get(productId);

      if (!existing) {
        productMap.set(productId, product);
      } else {
        const isCurrentFlashSale =
          product._isFlashSale || product.productId?.isFlashSale;
        const isExistingFlashSale =
          existing._isFlashSale || existing.productId?.isFlashSale;

        if (isCurrentFlashSale && !isExistingFlashSale) {
          productMap.set(productId, product);
        }
      }
    });

    const deduplicated = [
      ...Array.from(productMap.values()),
      ...Array.from(bundleMap.values()),
    ];

    return deduplicated;
  }, [show?.buyNowProducts, show?.bundleSales, activeFlashSales, activeTab]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Initialize sockets lazily after initial render
  // useEffect(() => {
  //   const task = InteractionManager.runAfterInteractions(() => {
  //     if (!socketRef.current) {
  //       socketRef.current = io(bgaSocketUrl, {
  //         transports: ['websocket'],
  //         autoConnect: false,
  //       });
  //     }

  //     socketRef.current.connect();
  //     setSocketsReady(true);
  //   });

  //   return () => {
  //     task.cancel();
  //     if (socketRef.current) {
  //       socketRef.current.disconnect();
  //       socketRef.current = null;
  //     }
  //   };
  // }, []);
  // ✅ NEW: Auto-open checkout when interested product/bundle goes into flash sale
  useEffect(() => {
    if (!user || !activeFlashSales.length || !Object.keys(productInterests).length) return;

    // Check each active flash sale
    activeFlashSales.forEach(flashSale => {
      const flashSaleId = flashSale.flashSaleId || flashSale._id;
      
      // ✅ Skip if we've already auto-opened this flash sale
      if (autoOpenedFlashSalesRef.current.has(flashSaleId)) {
        return;
      }
      
      // Determine the item ID based on whether it's a bundle or regular product
      let itemId;
      if (flashSale.isBundle) {
        itemId = flashSale.bundleId || flashSale._id;
      } else {
        // For regular products, get the product ID
        if (flashSale.productId && typeof flashSale.productId === 'object') {
          itemId = flashSale.productId._id;
        } else if (flashSale.products && flashSale.products[0]) {
          itemId = flashSale.products[0].productId?._id || flashSale.products[0].productId;
        } else {
          itemId = flashSale.productId;
        }
      }

      // Check if user is interested in this i
      const interest = productInterests[itemId];
      
      if (interest && interest.isInterested) {
        console.log(`🎯 User interested in ${flashSale.isBundle ? 'bundle' : 'product'}: ${itemId}`);
        
        // ✅ If not on Buy Now tab, switch to it first and wait for data
        if (activeTab !== "Buy now") {
          console.log('📍 Switching to Buy Now tab...');
          setActiveTab("Buy now");
          
          // ✅ Mark as auto-opened to prevent re-triggering
          autoOpenedFlashSalesRef.current.add(flashSaleId);
          
          // Wait for Buy Now data to load, then check if item is available
          const checkAndOpenCheckout = () => {
            // Check if the item exists in buyNowDetails
            const itemExists = buyNowItems.some(id => {
              const item = buyNowData[id];
              if (!item) return false;
              
              if (flashSale.isBundle) {
                return item.type === 'bundle' && item.data?.bundleSaleId === itemId;
              } else {
                const productId = item.data?.productId?._id || item.data?._id;
                return productId === itemId;
              }
            });
            
            if (itemExists) {
              console.log('✅ Item found in Buy Now data, opening checkout');
              handleFlashSalePurchase(flashSaleId, itemId, 1);
              // Toast(`Your interested ${flashSale.isBundle ? 'bundle' : 'product'} is now in flash sale! 🎉`);
            } else {
              console.log('⏳ Item not yet in Buy Now data, checking again...');
              // Check again after a short delay
              setTimeout(checkAndOpenCheckout, 500);
            }
          };
          
          // Start checking after initial delay for tab switch
          setTimeout(checkAndOpenCheckout, 1000);
          
        } else if (buyNowItems.length > 0) {
          // Already on Buy Now tab with data loaded
          console.log('✅ Already on Buy Now tab, opening checkout');
          
          // ✅ Mark as auto-opened
          autoOpenedFlashSalesRef.current.add(flashSaleId);
          
          handleFlashSalePurchase(flashSaleId, itemId, 1);
          // Toast(`Your interested ${flashSale.isBundle ? 'bundle' : 'product'} is now in flash sale! 🎉`);
        }
      }
    });
  }, [activeFlashSales, productInterests, user, handleFlashSalePurchase, activeTab, buyNowItems, buyNowData]);

  // 1-second timer for flash sales - defer until component is ready
  useEffect(() => {
    if (!isComponentReady) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isComponentReady]);

  // ✅ AppSync: Setup flash sale subscriptions
  useEffect(() => {
    if (!id || !user) return;

    let mounted = true;

    const setupFlashSaleAppSync = async () => {
      try {
        // console.log('🔌 [StoreScreen Flash Sale] Setting up AppSync flash sale subscriptions for stream:', id);
        // 
        // Get the live stream flash sale channel
        const channelPath = FLASH_SALE_CHANNELS.getLiveStreamChannel(id);
        
        // Subscribe to flash sale events
        flashSaleChannelRef.current = await subscribeToFlashSaleChannel(channelPath, (eventData) => {
          if (!mounted) return;
          
          try {
            // ✅ DEBUG: Log ALL received events with full details
            console.log('📨 [StoreScreen Flash Sale AppSync] === EVENT RECEIVED ===');
            console.log('📨 Event Type:', eventData?.eventType);
            console.log('📨 Full Event Data:', JSON.stringify(eventData, null, 2));
            
            if (!eventData || !eventData.eventType) {
              console.warn('⚠️ [StoreScreen Flash Sale] Invalid event structure:', eventData);
              return;
            }
            
            // Filter: Only process if this event is for the current stream
            if (eventData.streamId !== id && eventData.showId !== id) {
              console.log('❌ [StoreScreen Flash Sale] Stream ID mismatch');
              console.log('❌ Event streamId:', eventData.streamId);
              console.log('❌ Event showId:', eventData.showId);
              console.log('❌ Current id:', id);
              return;
            }
            
            console.log('✅ [StoreScreen Flash Sale] Stream ID match - processing event:', eventData.eventType);
            
            // Route to appropriate handler based on event type
            switch (eventData.eventType) {
              case 'current_active_sales':
              case FLASH_SALE_EVENT_TYPES.CURRENT_ACTIVE_SALES:
                handleCurrentActiveSales(eventData.flashSales || []);
                break;
              case 'current_active_bundle_sales':
              case FLASH_SALE_EVENT_TYPES.CURRENT_ACTIVE_BUNDLE_SALES:
                handleCurrentActiveBundleSales(eventData.flashSales || []);
                break;
              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_STARTED:
              case 'live_flash_sale_started':
                handleFlashSaleStarted(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_STARTED:
              case 'bundle_flash_sale_started':
                handleBundleFlashSaleStarted(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ENDED:
              case 'live_flash_sale_ended':
                handleFlashSaleEnded(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_ENDED:
              case 'bundle_flash_sale_ended':
                handleBundleFlashSaleEnded(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.LIVE_STOCK_UPDATE:
              case 'live_stock_update':
                handleStockUpdate(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.BUNDLE_STOCK_UPDATE:
              case 'bundle_stock_update':
                handleBundleStockUpdate(eventData);
                break;
              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ERROR:
              case FLASH_SALE_EVENT_TYPES.BUNDLE_FLASH_SALE_ERROR:
              case 'live_flash_sale_error':
              case 'bundle_flash_sale_error':
                console.error('❌ Flash Sale Error:', eventData);
                Toast(eventData.message || 'Flash sale error occurred');
                break;
              default:
                console.log('⚠️ [StoreScreen Flash Sale AppSync] Unknown event type:', eventData.eventType);
            }
          } catch (error) {
            console.error('❌ [StoreScreen Flash Sale] Error processing event:', error);
          }
        });
        
        // console.log('✅ [StoreScreen Flash Sale] AppSync subscriptions active');
        
        // ⭐ Request current active flash sales immediately after subscribing
        await requestCurrentActiveFlashSales(id);
        
      } catch (error) {
        console.error('❌ [StoreScreen Flash Sale] Failed to setup AppSync:', error);
      }
    };

    // ⭐ Request function to fetch current active flash sales
    const requestCurrentActiveFlashSales = async (showId) => {
      try {
        // console.log('📡 [StoreScreen Flash Sale] Requesting current active flash sales for show:', showId);
        
        const response = await axiosInstance.get(
          `/shows/${showId}/active-flash-sales`
        );
        
        if (response.data.status && response.data.data.activeFlashSales) {
          const activeFlashSales = response.data.data.activeFlashSales;
          
          // console.log(`✅ [StoreScreen Flash Sale] Received ${activeFlashSales.length} active flash sales`);
          
          // Process each flash sale
          activeFlashSales.forEach(sale => {
            if (sale.isBundle) {
              // Handle as bundle flash sale
              handleCurrentActiveBundleSales([sale]);
            } else {
              // Handle as regular product flash sale
              handleCurrentActiveSales([sale]);
            }
          });
        }
        
      } catch (error) {
        console.error('❌ [StoreScreen Flash Sale] Error requesting current active flash sales:', error);
        // Don't show error to user - they can still see flash sales when they start
      }
    };

    // Event Handlers
    const handleCurrentActiveSales = (sales) => {
      setActiveFlashSales(prev => {
        const existingBundles = prev.filter(s => s.isBundle);
        const newProducts = sales.map(sale => ({
          ...sale,
          flashSaleId: sale.flashSaleId || sale._id,
          isBundle: false,
          // ✅ Map timing fields for compatibility
          endTime: sale.saleEndTime || sale.endTime || sale.endsAt,
          startTime: sale.saleStartTime || sale.startTime || sale.startsAt
        }));
        return [...existingBundles, ...newProducts];
      });
    };

    const handleCurrentActiveBundleSales = (sales) => {
      setActiveFlashSales(prev => {
        const existingProducts = prev.filter(s => !s.isBundle);
        const newBundles = sales.map(sale => ({
          ...sale,
          isBundle: true,
          endTime: sale.saleEndTime || sale.endTime || sale.endsAt || sale.flashSaleEndTime,
          startTime: sale.saleStartTime || sale.startTime || sale.startsAt || sale.flashSaleStartTime,
          flashSaleId: sale.flashSaleId || sale._id,
          bundleId: sale.bundleId || sale._id,
          bundleTitle: sale.bundleTitle || sale.title || 'Bundle Flash Sale',
          bundleQuantity: sale.bundleQuantity || 0,
          bundleImage: sale.bundleImage || {},
          flashPrice: sale.flashPrice || sale.bundlePrice || 0,
          originalPrice: sale.originalPrice || sale.bundleMRP || 0
        }));
        return [...existingProducts, ...newBundles];
      });
    };

    const handleFlashSaleStarted = (data) => {
      // console.log('🚀 Flash Sale Started:', data);
      
      const newFlashSale = { 
        ...data, 
        flashSaleId: data.flashSaleId || data._id, 
        isBundle: false,
        endTime: data.saleEndTime || data.endTime || data.endsAt,
        startTime: data.saleStartTime || data.startTime || data.startsAt
      };
      
      setActiveFlashSales(prev => {
        const exists = prev.some(sale => sale._id === data._id || sale.flashSaleId === data.flashSaleId);
        if (!exists) {
          return [...prev, newFlashSale];
        }
        return prev;
      });
    };

    const handleFlashSaleEnded = (data) => {
      setActiveFlashSales(prevActive => {
        const filtered = prevActive.filter(sale => 
          sale.isBundle || (sale._id !== data.flashSaleId && sale.flashSaleId !== data.flashSaleId)
        );
        return filtered;
      });
      
      // ✅ FIX: Trigger history refresh regardless of active tab (user might be on Buy Now tab)
      if (hasFlashSaleAccess) {
        setTimeout(() => {
          fetchFlashSaleHistory();
        }, 500); // Slightly longer delay to ensure backend has fully processed
      } else {
        console.log('⚠️ [handleFlashSaleEnded] Not refreshing - no Flash Sale access');
      }
    };

    const handleStockUpdate = (data) => {
      setActiveFlashSales(prev =>
        prev.map(sale => {
          if (!sale.isBundle && (sale._id === data.flashSaleId || sale.flashSaleId === data.flashSaleId)) {
            const updatedProducts = sale.products?.map(p =>
              p.productId === data.productId
                ? { ...p, currentFlashStock: data.currentStock }
                : p
            );
            return {
              ...sale,
              currentStock: (sale.productId === data.productId) ? data.currentStock : sale.currentStock,
              products: updatedProducts,
            };
          }
          return sale;
        })
      );
    };

    const handleBundleFlashSaleStarted = (data) => {
      // console.log('🎁 Bundle Flash Sale Started:', data);
      
      const newBundleSale = {
        ...data,
        isBundle: true,
        endTime: data.endTime || data.endsAt || data.flashSaleEndTime || data.saleEndTime,
        startTime: data.startTime || data.startsAt || data.flashSaleStartTime || data.saleStartTime,
        flashSaleId: data.flashSaleId || data._id,
        bundleId: data.bundleId || data._id,
        bundleTitle: data.bundleTitle || data.title || 'Bundle Flash Sale',
        bundleQuantity: data.bundleQuantity || data.availableStock || 0,
        bundleImage: data.bundleImage || data.bundleDetails?.bundleImage || {},
        flashPrice: data.flashPrice || data.bundlePrice || 0,
        originalPrice: data.originalPrice || data.bundleMRP || 0,
        products: data.products || data.bundleDetails?.products || []
      };
      
      setActiveFlashSales(prev => {
        const exists = prev.some(sale => sale.flashSaleId === data.flashSaleId);
        if (!exists) {
          return [...prev, newBundleSale];
        }
        return prev;
      });
    };

    const handleBundleStockUpdate = (data) => {
      setActiveFlashSales(prev =>
        prev.map(sale => {
          if (sale.isBundle && sale.flashSaleId === data.flashSaleId) {
            return {
              ...sale,
              bundleQuantity: data.bundleQuantity,
              products: data.products,
              limitingProduct: data.limitingProduct,
              bundlesSold: data.bundlesSold,
              _lastUpdate: Date.now()
            };
          }
          return sale;
        })
      );
    };

    const handleBundleFlashSaleEnded = (data) => {
      setActiveFlashSales(prevActive => {
        return prevActive.filter(sale => 
          !sale.isBundle || sale.flashSaleId !== data.flashSaleId
        );
      });
    };

    // Initialize AppSync
    setupFlashSaleAppSync();

    // Cleanup function
    return () => {
      // console.log('🧹 [StoreScreen Flash Sale] Cleaning up A??ppSync subscriptions');
      mounted = false;
      // AppSync channels are managed by the config utility
      flashSaleChannelRef.current = null;
    };
  }, [id, user]);

  useEffect(() => {
    const fetchBatchEligibility = async () => {
      if (!user?._id || allGiveawayIds.length === 0 || activeTab !== 'Giveaway')
        return;

      try {
        const result = await giveawayService.checkBatchEligibility(
          allGiveawayIds,
          user._id,
        );
        if (result.success && result.results) {
          const eligibilityMap = {};
          result.results.forEach(item => {
            eligibilityMap[item.giveawayId] = item;
          });
          // console.log("eligibilityMap", eligibilityMap);

          setBatchEligibilityData(eligibilityMap);
        }
      } catch (error) {
        // Batch eligibility check failed
      }
    };

    fetchBatchEligibility();
  }, [allGiveawayIds, user?._id, activeTab]);

  // ✅ OPTIMIZED: Use passed showData instead of fetching
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        // ✅ Use passed showData if available, otherwise fetch
        if (passedShowData && Object.keys(passedShowData).length > 0) {
          // console.log("[INIT] Using passed show data from LiveScreen");
          if (isMounted) {
            setShow(passedShowData);
          }
        } else {
          // ⚠️ Fallback: Fetch only if data wasn't passed (direct navigation)
          console.log("[INIT] No passed data, fetching show data");
          const response = await axiosInstance.get(`/shows/get/live/${id}`);
          if (isMounted) {
            setShow(response.data);
          }
        }

        // Set component ready immediately
        if (isMounted) {
          setIsComponentReady(true);

          // Now fetch the data for the initial tab
          if (initialActiveTab === 'Auction' || !initialActiveTab) {
            fetchAuction(1, true);
          } else {
            setInitialLoadingAuctions(false);
          }

          if (initialActiveTab === 'Giveaway') {
            fetchGiveaway(1, true);
          } else {
            setInitialLoading(false);
          }

          if (initialActiveTab === 'Buy now') {
            fetchBuyNow(1, true);
          } else {
            setInitialLoadingBuyNow(false);
          }
        }
      } catch (err) {
        console.error('[INIT] Error loading initial data:', err);
        if (isMounted) {
          setIsComponentReady(true);
          setInitialLoadingAuctions(false);
          setInitialLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [id, initialActiveTab, passedShowData, fetchAuction, fetchGiveaway, fetchBuyNow]);
  useEffect(() => {
    const buyNowDataLength = Object.keys(buyNowData).length;
    // console.log("[PRODUCT INTEREST] Active tab or buy now data changed:", activeTab, buyNowDataLength);
    if (activeTab !== 'Buy now' || !user || buyNowDataLength === 0) return;

    // Extract ALL product IDs and bundle IDs from buyNowData (which is now an object)
    const itemsToFetch = Object.values(buyNowData)
      ?.map((item: any) => {
        if (!item) return null;

        // For bundles, use bundleSaleId
        if (item.type === 'bundle') {
          return {
            itemId: item.data?.bundleSaleId,
            itemType: 'bundle',
          };
        }

        // For regular products, use productId
        const product = item.data?.productId || item.data;
        return {
          itemId: product?._id,
          itemType: 'product',
        };
      })
      ?.filter((item: any) => item && item.itemId);
// console.log("[ITEMFETCH]",itemsToFetch)
    if (itemsToFetch.length > 0) {
      // Fetch interests for all visible items
      const fetchInterests = async () => {
        try {
          setLoadingInterests(true);
          // Pass the array of objects with itemId and itemType
          const result = await productInterestService.getBatchInterests(
            itemsToFetch,
            id,
          );

          if (result.status && result.data) {
            const interestsMap = {};
            result.data.forEach(item => {
              interestsMap[item.itemId] = {
                isInterested: item.isInterested,
                count: item.interestCount,
              };
            });
            setProductInterests(interestsMap);
            // console.log("[INTERSET SET] Product interests fetched and set:", interestsMap);
          }
          // console.log("[INTERSET NOTSET] Product interests fetched:", result.data);
        } catch (error) {
          console.log('Failed to fetch product interests:', error);
        } finally {
          setLoadingInterests(false);
        }
      };

      // fetchInterests();
    }
  }, [activeTab, buyNowData, user, id]);
  // Lazy load data when switching tabs
  useEffect(() => {
    if (!isComponentReady) {
      // console.log("[TAB_SWITCH] Component not ready yet");
      return;
    }

    // console.log("[TAB_SWITCH] Active tab:", activeTab, "Auction IDs:", allAuctionIds.length, "Giveaway IDs:", allGiveawayIds.length);

    // Fetch auction data if we switched to auction tab and have no data
    if (activeTab === 'Auction' && allAuctionIds.length === 0) {
      // console.log("[TAB_SWITCH] Fetching auction data");
      fetchAuction(1, true);
    }
    // Fetch giveaway data if we switched to giveaway tab and have no data
    if (activeTab === 'Giveaway' && allGiveawayIds.length === 0) {
      // console.log("[TAB_SWITCH] Fetching giveaway data");
      fetchGiveaway(1, true);
    }
    // Fetch buy now data if we switched to buy now tab and have no data
    if (activeTab === 'Buy now' && Object.keys(buyNowData).length === 0) {
      // console.log("[TAB_SWITCH] Fetching buy now data");
      fetchBuyNow(1, true);
    }
  }, [
    activeTab,
    isComponentReady,
    allAuctionIds.length,
    allGiveawayIds.length,
    Object.keys(buyNowData).length,
    fetchAuction,
    fetchGiveaway,
    fetchBuyNow,
  ]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && currentPage < totalPages) {
      fetchGiveaway(currentPage + 1, false);
    }
  };

  const handleLoadMoreAuctions = () => {
    if (
      !loadingMoreAuctions &&
      hasMoreAuctions &&
      auctionPage < totalPagesAuctions
    ) {
      fetchAuction(auctionPage + 1, false);
    }
  };

  const handleLoadMoreBuyNow = () => {
    if (!loadingMoreBuyNow && hasMoreBuyNow && buyNowPage < totalPagesBuyNow) {
      fetchBuyNow(buyNowPage + 1, false);
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutProduct(null);
    setCheckoutFlashSaleId(null);
  };
  // console.log(show)
  const isLive = show?.showStatus?.toLowerCase() === 'live';

  // ✅ Build tabs array conditionally based on access and show status
  const tabs = useMemo(() => {
    const baseTabs = ['Auction', 'Buy now', 'Giveaway'];
    
    // Add Flash Sale tab if user has access
    if (hasFlashSaleAccess) {
      baseTabs.push('Flash Sale');
    }
    
    // Add Sold tab if show is live
    if (isLive) {
      baseTabs.push('Sold');
    }
    
    return baseTabs;
  }, [hasFlashSaleAccess, isLive]);

  // ✅ NEW: Fetch flash sale history when Flash Sale tab is opened
  useEffect(() => {
    if (activeTab === "Flash Sale" && hasFlashSaleAccess && id) {
      console.log('📊 [StoreScreen Flash Sale] Flash Sale tab opened, fetching history...');
      fetchFlashSaleHistory();
    }
  }, [activeTab, hasFlashSaleAccess, id, fetchFlashSaleHistory]);

  // ✅ Access mode: Activate on mount, deactivate on unmount
  useEffect(() => {
    if (user) {
      enterAccessMode();
      console.log('✅ [StoreScreen] Access mode activated');
    }

    return () => {
      exitAccessMode();
      console.log('🔴 [StoreScreen] Access mode deactivated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={'Store'} />

      <ScrollView
      contentContainerStyle={[styles.tabContainer, !tabs.includes('Flash Sale') && {flex: 1, justifyContent: 'center'}]}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}>
        {tabs.map(tab => (
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
                data={allAuctionIds}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <Hammer size={40} color={'#EAB308'} />
                    </View>
                    <Text style={styles.emptyTitle}>No Auctions Yet</Text>
                    <Text style={styles.emptyText}>
                      Auctions will appear here when the seller adds them to the show
                    </Text>
                  </View>}
                renderItem={renderAuctionItem}
                ListHeaderComponent={totalProductsCounts.auction>0&&<View style={styles.countContainer}>
                  <Text style={styles.countHeader}>
                    Total Auction Count
                  </Text>
                  <Text style={styles.countValue}>
                    {totalProductsCounts.auction}
                  </Text>
                  </View>}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMoreAuctions}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="handled"
                onEndReachedThreshold={0.8}
                contentContainerStyle={{
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0,
                }}
                ListFooterComponent={
                  loadingMoreAuctions ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#EAB308" />
                      <Text style={styles.footerText}>Loading more...</Text>
                    </View>
                  ) : !hasMoreAuctions && allAuctionIds.length > 0 ? (
                    <View style={styles.footerEnd}>
                      <Text style={styles.footerEndText}>No more auctions</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}

        {activeTab === 'Buy now' && (
          <>
            {initialLoadingBuyNow ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EAB308" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : (
              <FlatList
                data={buyNowItems}
                renderItem={renderBuyNowItem}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMoreBuyNow}
                // keyboardDismissMode='none'
                // keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={totalProductsCounts.buyNow>0&&<View style={styles.countContainer}>
                  <Text style={styles.countHeader}>
                    Total Buy Now Count
                  </Text>
                  <Text style={styles.countValue}>
                    {totalProductsCounts.buyNow}
                  </Text>
                  </View>}
                onEndReachedThreshold={0.8}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <ShoppingBag size={40} color={'#EAB308'} />
                    </View>
                    <Text style={styles.emptyTitle}>No Products Available</Text>
                    <Text style={styles.emptyText}>
                      Products will be listed here when added to this show
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  loadingMoreBuyNow ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#EAB308" />
                      <Text style={styles.footerText}>Loading more...</Text>
                    </View>
                  ) : !hasMoreBuyNow && Object.keys(buyNowData).length > 0 ? (
                    <View style={styles.footerEnd}>
                      <Text style={styles.footerEndText}>No more products</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}

        {activeTab === 'Giveaway' && (
          <>
            {initialLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EAB308" />
                <Text style={styles.loadingText}>Loading giveaways...</Text>
              </View>
            ) : (
              <FlatList
                data={allGiveawayIds}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <GiftIcon size={40} color={'#EAB308'} />
                    </View>
                    <Text style={styles.emptyTitle}>No Giveaways Yet</Text>
                    <Text style={styles.emptyText}>
                      Exciting giveaways will appear here during the live show
                    </Text>
                  </View>
                }
                  ListHeaderComponent={totalProductsCounts.giveaway>0&&<View style={styles.countContainer}>
                  <Text style={styles.countHeader}>
                    Total Giveaway Count
                  </Text>
                  <Text style={styles.countValue}>
                    {totalProductsCounts.giveaway}
                  </Text>
                  </View>}
                renderItem={renderGiveawayItem}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.8}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.footerLoader}>
                      <ActivityIndicator size="small" color="#EAB308" />
                      <Text style={styles.footerText}>Loading more...</Text>
                    </View>
                  ) : !hasMore && allGiveawayIds.length > 0 ? (
                    <View style={styles.footerEnd}>
                      <Text style={styles.footerEndText}>
                        No more giveaways
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </>
        )}
        {activeTab === 'Flash Sale' && hasFlashSaleAccess && (
          <LiveStreamFlashSaleSeller
            showId={id}
            sellerId={show?.host?._id}
            socket={null}
            signedUrls={{}}
            activeFlashSales={activeFlashSales}
            history={flashSaleHistory}
            loading={flashSaleLoading}
            apiError={flashSaleApiError}
            currentTime={currentTime}
            onStartFlashSale={handleStartFlashSale}
            onEndFlashSale={handleEndFlashSale}
            onRefreshHistory={fetchFlashSaleHistory}
            clearApiError={() => setFlashSaleApiError(null)}
            formatTime={formatTime}
            calculateProgress={(start, end, now) => {
              const startMs = new Date(start).getTime();
              const endMs = new Date(end).getTime();
              if (now >= endMs) return 100;
              if (now <= startMs) return 0;
              const total = endMs - startMs;
              const elapsed = now - startMs;
              return Math.min(100, (elapsed / total) * 100);
            }}
            calculateTimeLeft={calculateTimeLeft}
            calculateDiscount={calculateDiscount}
            showStartModal={showStartFlashSaleModal}
            onOpenFlashSaleModal={() => setShowStartFlashSaleModal(true)}
            onCloseFlashSaleModal={() => {
              setShowStartFlashSaleModal(false);
              setSelectedProductForFlashSale(null);
              
              // ✅ Auto-navigate back to Buy Now tab if user came from there
              if (isAutoNavigate) {
                setActiveTab('Buy now');
                setIsAutoNavigate(false);
              }
            }}
            preSelectedProduct={selectedProductForFlashSale}
          />
        )}
        {activeTab === 'Sold' && <SoldProductsTab showId={id} />}
      </View>

      {checkoutOpen && checkoutType === 'flash_sale' && (
        <LiveFlashSaleCheckoutSlider
          isOpen={checkoutOpen}
          onClose={handleCloseCheckout}
          product={checkoutProduct}
          flashSaleId={checkoutFlashSaleId}
      
          showId={id}
        />
      )}

      {/* Bundle Flash Sale Checkout */}
      {bundleCheckoutOpen && bundleCheckoutId && (
        <BundleCheckoutSlider
          isOpen={bundleCheckoutOpen}
          onClose={() => {
            setBundleCheckoutOpen(false);
            setBundleCheckoutId(null);
            setBundleFlashSaleData(null);
          }}
          bundleId={bundleCheckoutId}
          currentTime={currentTime}
          flashSaleData={bundleFlashSaleData}
          showId={id}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  countContainer:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    paddingVertical:10,
  },
  countHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  countValue: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '600',
  },  
  
  tabScrollView: {
    height: 50,
    maxHeight: 50,
    marginTop: 10,
    marginHorizontal: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 50,
    // flex:1,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D924',
    backgroundColor: '#D9D9D924',
  },
  tab: {
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#EAB308',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  activeTabText: {
    color: '#EAB308',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#EAB308',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#EAB308',
    fontSize: 12,
    marginTop: 8,
  },
  footerEnd: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerEndText: {
    color: '#777',
    fontSize: 12,
  },
});

export default StoreScreen;
