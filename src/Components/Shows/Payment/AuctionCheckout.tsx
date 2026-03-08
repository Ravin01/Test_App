
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  AppState,
  NativeModules,
} from 'react-native';
import { X, ArrowLeft, Trophy, AlertCircle } from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import axiosCourier from '../../../Utils/axiosCourier';
import { AuthContext } from '../../../Context/AuthContext';
import { AWS_CDN_URL } from '../../../../Config';
import { useNavigation } from '@react-navigation/native';
import { Toast } from '../../../Utils/dateUtils';
import RazorpayPayment from '../../Reuse/RazorpayPayment';
import { SafeAreaView } from 'react-native-safe-area-context';
import WalletPayment from '../../Wallet/WalletComponents/WalletPayment';
import PaymentMethodSelector from '../../Wallet/WalletComponents/PaymentMethodSelector';
import AddressForm from '../../Shows/Components/FlashSale/AddressForm';



const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Get native PIP module
const { PictureInPictureModule } = NativeModules;

// Custom IndianRupee icon component
const IndianRupee = ({ size = 20, color = '#fff' }) => (
  <Text style={{ fontSize: size * 0.8, color, fontWeight: '600' }}>₹</Text>
);

const AuctionCheckoutSlider = ({ 
  isOpen, 
  showId,
  onClose, 
  _auctionData,
  onCheckoutComplete,
  onPaymentStateChange, // ✅ NEW: Callback to notify parent about payment state
}) => {
  const [auctionData,setAuctionData]=useState(_auctionData)
  const {user}=useContext(AuthContext)
  const navigation=useNavigation()
  
  // ✅ Track payment in progress state to prevent PIP mode during Razorpay
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const paymentStartedRef = useRef(false);
  
  // Sync local state when prop changes
  useEffect(() => {
    if (_auctionData) {
      setAuctionData(_auctionData);
    }
  }, [_auctionData]);
  
  const [step, setStep] = useState(1);
  const [orderData, setOrderData] = useState({
    auctionId: null,
    product: null,
    winningBid: 0,
    deliveryAddress: null,
    deliveryCharge: 0,
    estimatedDays: null,
    basePrice: 0,
    gstAmount: 0,
    gstRate: 0,
  });
  
  const [shipmentMethod, setShipmentMethod] = useState('flykup_logistics');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentData, setPaymentData] = useState({
    orderId: null,
    keyId: null,
    amount: null,
    currency: null,
    gateway: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressMode, setAddressMode] = useState('select');
  const [_editingAddress, setEditingAddress] = useState(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [sellerPincode, setSellerPincode] = useState(null);
  
  // 💰 WALLET PAYMENT STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY');
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const hasTrackedStart = useRef(false);
  const isMountedRef = useRef(true);
  const orderDataRef = useRef(orderData);
  const lastCalculatedPincodeRef = useRef(null);
  
  // ✅ CRITICAL FIX: Disable auto-PIP when entering payment step and re-enable after
  useEffect(() => {
    if (step === 2) {
      // Payment step - disable auto-PIP to prevent entering PIP during Razorpay
      console.log('💳 [AuctionCheckout] Entering payment step - disabling auto-PIP');
      setIsPaymentInProgress(true);
      paymentStartedRef.current = true;
      
      // Disable auto-PIP via native module
      if (PictureInPictureModule?.setAutoEnterPIP) {
        PictureInPictureModule.setAutoEnterPIP(false);
        console.log('💳 [AuctionCheckout] Auto-PIP disabled via native module');
      }
      
      // Notify parent component about payment state change
      if (onPaymentStateChange) {
        onPaymentStateChange(true);
      }
    } else if (paymentStartedRef.current && step !== 2) {
      // Exited payment step - re-enable auto-PIP
      console.log('💳 [AuctionCheckout] Exited payment step - re-enabling auto-PIP');
      setIsPaymentInProgress(false);
      paymentStartedRef.current = false;
      
      // Re-enable auto-PIP via native module
      if (PictureInPictureModule?.setAutoEnterPIP) {
        PictureInPictureModule.setAutoEnterPIP(true);
        console.log('💳 [AuctionCheckout] Auto-PIP re-enabled via native module');
      }
      
      // Notify parent component about payment state change
      if (onPaymentStateChange) {
        onPaymentStateChange(false);
      }
    }
  }, [step, onPaymentStateChange]);
  
  // ✅ Handle AppState changes during payment - detect return from Razorpay
  useEffect(() => {
    if (!isPaymentInProgress) return;
    
    const handleAppStateChange = (nextAppState) => {
      console.log('💳 [AuctionCheckout] AppState changed:', appStateRef.current, '->', nextAppState);
      
      // App returned to active from background during payment
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        nextAppState === 'active' &&
        paymentStartedRef.current
      ) {
        console.log('💳 [AuctionCheckout] App returned from background during payment - reconnecting streams');
        
        // Notify parent to trigger AppSync reconnection
        if (onPaymentStateChange) {
          // Brief delay to ensure Razorpay SDK has fully closed
          setTimeout(() => {
            onPaymentStateChange(false, true); // second param indicates need to reconnect
          }, 500);
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isPaymentInProgress, onPaymentStateChange]);
  
  // ✅ Cleanup: Ensure auto-PIP is re-enabled when component unmounts or checkout closes
  useEffect(() => {
    return () => {
      if (paymentStartedRef.current && PictureInPictureModule?.setAutoEnterPIP) {
        console.log('💳 [AuctionCheckout] Cleanup - re-enabling auto-PIP');
        PictureInPictureModule.setAutoEnterPIP(true);
      }
    };
  }, []);
  
  // Keep ref in sync with state
  useEffect(() => {
    orderDataRef.current = orderData;
  }, [orderData]);

  // Validate if user is winner
  const isValidWinner = user && auctionData?.winner && (() => {
    const winnerId = typeof auctionData.winner === 'object' 
      ? (auctionData.winner._id || auctionData.winner.id)
      : auctionData.winner;
    const userId = user._id || user.id;
    return userId === winnerId;
  })();

  // Component mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Slide animation
  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 40,
        stiffness: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, slideAnim]);

  // Fetch seller pincode early when auction data is available
  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!auctionData?.product?._id || !isOpen) return;
      try {
        const response = await axiosInstance.get(`courier/seller-pincode/${auctionData.product._id}`);
        if (response.data.status) {
          setSellerPincode(response.data.pincode);
        }
      } catch (error) {
        console.log('Failed to fetch seller pincode:', error);
      }
    };
    fetchSellerPincode();
  }, [auctionData?.product?._id, isOpen]);

  // Calculate delivery charges function
  const calculateDeliveryCharges = useCallback(async () => {
    const currentOrderData = orderDataRef.current;
    
    // Only calculate if component is mounted and all required data is available
    if (!isMountedRef.current || !isOpen || !sellerPincode || !currentOrderData.deliveryAddress?.pincode || !currentOrderData.product?.weight || !(currentOrderData.winningBid > 0)) {
      return;
    }
    
    setCalculatingDelivery(true);

    // ✅ BACKWARD COMPATIBILITY: Check new field first, fallback to old field
    let productShippingMethod = currentOrderData.product?.shippingMethod;
    
    // If new field doesn't exist, map old logisticsType to new values
    if (!productShippingMethod && currentOrderData.product?.logisticsType) {
      productShippingMethod = currentOrderData.product.logisticsType === 'selfShipment' 
        ? 'self_shipment' 
        : 'flykup_logistics';
    }
    
    // Default to flykup_logistics if neither field exists
    productShippingMethod = productShippingMethod || 'flykup_logistics';
    
    const requiresSelfShipment = productShippingMethod === 'self_shipment';

    console.log('🚚 Auction shipment determination:', {
      hasNewField: !!currentOrderData.product?.shippingMethod,
      hasOldField: !!currentOrderData.product?.logisticsType,
      oldValue: currentOrderData.product?.logisticsType,
      productShippingMethod,
      requiresSelfShipment,
      decision: requiresSelfShipment ? 'SELF SHIPMENT' : 'FLYKUP LOGISTICS'
    });

    // If self-shipment, use product's delivery info (no API call)
    if (requiresSelfShipment) {
      console.log('📦 Using self-shipment method for auction');
      const fallbackCharge = currentOrderData.product?.deliveryCharge || 40;
      setOrderData(prev => ({ ...prev, deliveryCharge: fallbackCharge, estimatedDays: null }));
      setShipmentMethod('self_shipment');
      setCalculatingDelivery(false);
      return; // ✅ EARLY EXIT - No courier API call
    }

    // ✅ Only reach here if Flykup logistics
    try {
      const weightValue = currentOrderData.product.weight.value || 100;
      const totalWeightInKg = weightValue / 1000;

      const payload: any = {
        seller_pincode: sellerPincode,
        customer_pincode: currentOrderData.deliveryAddress.pincode,
        product_weight: totalWeightInKg,
        weight_unit: 'kg',
        order_value: currentOrderData.winningBid,
        payment_mode: 'prepaid',
      };
      
      // ✅ Add dimensions if product has them (for accurate shipping calculation)
      if (currentOrderData.product?.dimensions?.length && 
          currentOrderData.product?.dimensions?.width && 
          currentOrderData.product?.dimensions?.height) {
        payload.length = currentOrderData.product.dimensions.length;
        payload.width = currentOrderData.product.dimensions.width;
        payload.height = currentOrderData.product.dimensions.height;
        console.log('📦 Sending dimensions for auction delivery calculation:', {
          length: currentOrderData.product.dimensions.length,
          width: currentOrderData.product.dimensions.width,
          height: currentOrderData.product.dimensions.height,
        });
      } else {
        console.log('⚠️ Auction product has no dimensions, calculating delivery by weight only');
      }
      
      const response = await axiosCourier.post('business/calculate-delivery', payload);
      // console.log("📦 Delivery API Response:", response.data)
      
      if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
        const recommended = response.data.data.recommended_courier;
        console.log("✅ Setting delivery charge:", recommended.delivery_charges);
        // Use functional update to preserve address
        setOrderData(prev => {
          console.log("📝 Updating with address preserved:", {
            hasAddress: !!prev.deliveryAddress,
            addressId: prev.deliveryAddress?._id,
            newCharge: recommended.delivery_charges
          });
          return {
            ...prev,
            deliveryCharge: recommended.delivery_charges,
            estimatedDays: recommended.estimated_days 
          };
        });
        setShipmentMethod('flykup_logistics');
      } else if (isMountedRef.current) {
        const fallbackCharge = currentOrderData.product?.deliveryCharge || 40;
        console.log("⚠️ Using fallback charge:", fallbackCharge);
        setOrderData(prev => ({ ...prev, deliveryCharge: fallbackCharge, estimatedDays: null }));
        setShipmentMethod('self_shipment');
      }
    } catch (error) {
      console.log("ERROR CALCULATING",error.response?.data)
      // Silently handle delivery charge calculation errors - use fallback
      if (isMountedRef.current) {
        const fallbackCharge = currentOrderData.product?.deliveryCharge || 40;
        console.log("❌ Error - using fallback charge:", fallbackCharge);
        setOrderData(prev => ({ ...prev, deliveryCharge: fallbackCharge, estimatedDays: null }));
        setShipmentMethod('self_shipment');
      }
    } finally {
      if (isMountedRef.current) {
        setCalculatingDelivery(false);
      }
    }
  }, [isOpen, sellerPincode]);

  // Trigger calculation when address changes - only when modal is open AND all required data is ready
  useEffect(() => {
    const currentPincode = orderData.deliveryAddress?.pincode;
    const hasProduct = orderData.product?._id && orderData.product?.weight;
    const hasWinningBid = orderData.winningBid > 0;
    
    // Calculate if:
    // 1. Modal is open AND
    // 2. We have a pincode AND seller pincode AND
    // 3. We have product with weight AND winning bid AND
    // 4. Either this is a new pincode OR we haven't calculated for this pincode yet
    if (isOpen && currentPincode && sellerPincode && hasProduct && hasWinningBid && currentPincode !== lastCalculatedPincodeRef.current) {
      console.log('📦 [AuctionCheckout] Triggering delivery calculation - all conditions met:', {
        pincode: currentPincode,
        sellerPincode,
        productId: orderData.product?._id,
        hasWeight: !!orderData.product?.weight,
        winningBid: orderData.winningBid
      });
      lastCalculatedPincodeRef.current = currentPincode;
      calculateDeliveryCharges();
    } else if (isOpen && currentPincode && sellerPincode) {
      console.log('⏳ [AuctionCheckout] Waiting for all data before delivery calculation:', {
        hasProduct,
        hasWinningBid,
        productId: orderData.product?._id,
        winningBid: orderData.winningBid
      });
    }
  }, [isOpen, orderData.deliveryAddress?.pincode, sellerPincode, orderData.product?._id, orderData.product?.weight, orderData.winningBid, calculateDeliveryCharges]);

  // Fetch product details if product is undefined or not an object
  // Uses the same approach as ProductDetail.tsx for comprehensive data fetching
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!auctionData || !isOpen || !isValidWinner) return;
      
      // Check if product is undefined or not a proper object
      const needsProductFetch = !auctionData.product || 
                               typeof auctionData.product !== 'object' || 
                               !auctionData.product._id;
      
      if (needsProductFetch && (auctionData._productId || auctionData.product)) {
        try {
          setLoading(true);
          const productId = auctionData._productId || auctionData.product;
          console.log('🔍 Fetching product details for auction:', productId);
          
          // Use the optimized endpoint with variant metadata (same as ProductDetail.tsx)
          const response = await axiosInstance.get(`/product-details/${productId}/with-variant-metadata`);
          
          if (response.status === 200 && response.data.status && isMountedRef.current) {
            const { parent, variantMetadata: metadata, hasVariants: hasVars, requestedVariantId } = response.data.data;
            
            let fetchedProduct = parent;
            
            // If product has variants, get the first available variant or specific one
            if (hasVars && metadata && metadata.length > 0) {
              console.log('📦 Product has variants, loading variant details');
              
              // Find first available variant or use first one
              const variantToLoad = metadata.find(v => v.stockCount > 0) || metadata[0];
              
              if (variantToLoad) {
                // Fetch full variant details
                try {
                  const variantResponse = await axiosInstance.get(
                    `/product-details/${parent._id}/variant/${variantToLoad._id}`
                  );
                  
                  if (variantResponse.status === 200 && variantResponse.data.status) {
                    fetchedProduct = variantResponse.data.data;
                    
                    // Process images for variant
                    if (Array.isArray(fetchedProduct.images)) {
                      fetchedProduct.signedImages = fetchedProduct.images.map(
                        image => `${AWS_CDN_URL}${image.key}`
                      );
                    }
                    
                    console.log('✅ Variant product loaded:', fetchedProduct.title);
                  }
                } catch (variantError) {
                  console.log('⚠️ Could not load variant, using parent product:', variantError);
                }
              }
            } else {
              // Single product without variants - process images
              if (Array.isArray(fetchedProduct.images)) {
                fetchedProduct.signedImages = fetchedProduct.images.map(
                  image => `${AWS_CDN_URL}${image.key}`
                );
              }
            }
            
            console.log('✅ Product details fetched successfully:', fetchedProduct.title);
            
            // Update auctionData state with the fetched product
            setAuctionData(prev => ({
              ...prev,
              product: fetchedProduct
            }));
            
            // Also update orderData directly with the fetched product
            setOrderData(prev => ({
              ...prev,
              product: fetchedProduct
            }));
          }
        } catch (error) {
          console.error('❌ Failed to fetch product details:', error);
          
          // Fallback: Try simple endpoint if optimized one fails
          try {
            const productId = auctionData._productId || auctionData.product;
            console.log('🔄 Trying fallback product fetch:', productId);
            
            const fallbackResponse = await axiosInstance.get(`/product-details/${productId}`);
            
            if (fallbackResponse.data.data && isMountedRef.current) {
              let fetchedProduct = fallbackResponse.data.data;
              
              // Process images
              if (Array.isArray(fetchedProduct.images)) {
                fetchedProduct.signedImages = fetchedProduct.images.map(
                  image => `${AWS_CDN_URL}${image.key}`
                );
              }
              
              console.log('✅ Fallback product fetch successful:', fetchedProduct.title);
              
              setAuctionData(prev => ({
                ...prev,
                product: fetchedProduct
              }));
              
              setOrderData(prev => ({
                ...prev,
                product: fetchedProduct
              }));
            }
          } catch (fallbackError) {
            console.error('❌ Fallback fetch also failed:', fallbackError);
            Toast('Failed to load product details');
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
    };
    
    fetchProductDetails();
  }, [auctionData, isOpen, isValidWinner]);

  // Initialize order data - only once when modal opens or when product becomes available
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // Only initialize if we have valid product data
    if (auctionData && isOpen && isValidWinner && auctionData.product?._id && !hasInitialized.current) {
      const gstRate = Number(auctionData.product?.gstRate) || 18;
      const winningBid = Number(auctionData.winningBid) || 0;

      if (winningBid > 0 && !isNaN(winningBid)) {
        const basePrice = winningBid / (1 + gstRate / 100);
        const gstAmount = winningBid - basePrice;
        const roundedBasePrice = Math.round(basePrice * 100) / 100;
        const roundedGstAmount = Math.round(gstAmount * 100) / 100;

        console.log("🎯 Initializing order data with product:", auctionData.product.title);
        setOrderData({
          auctionId: auctionData.auctionId,
          product: auctionData.product,
          winningBid: winningBid,
          basePrice: roundedBasePrice,
          gstAmount: roundedGstAmount,
          gstRate: gstRate,
          deliveryAddress: null,
          deliveryCharge: 0,
          estimatedDays: null,
        });
        hasInitialized.current = true;
      } else {
        Toast('Invalid auction data. Please refresh and try again.');
        onClose();
      }
    }
  }, [auctionData, auctionData?.product?._id, isOpen, isValidWinner, onClose]);

  // Reset state when slider closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setAddressMode('select');
        setOrderData({
          auctionId: null,
          product: null,
          winningBid: 0,
          deliveryAddress: null,
          deliveryCharge: 0,
          estimatedDays: null,
          basePrice: 0,
          gstAmount: 0,
          gstRate: 0,
        });
        setOrderId(null);
        setPaymentData({ orderId: null, keyId: null, amount: null, currency: null, gateway: null });
        setIsProcessing(false);
        setCheckoutCompleted(false);
        hasTrackedStart.current = false;
        lastCalculatedPincodeRef.current = null;
        hasInitialized.current = false; // Reset initialization flag
      }, 300);
    } else {
      setStep(1);
      setAddressMode('select');
      lastCalculatedPincodeRef.current = null;
    }
  }, [isOpen]);

  // Fetch addresses and seller pincode in parallel
  useEffect(() => {
    if (isOpen && user && isValidWinner) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Fetch both addresses and seller pincode in parallel
          const [addressesResponse, sellerPincodeResponse] = await Promise.allSettled([
            axiosInstance.get('user/addresses'),
            auctionData?.product?._id 
              ? axiosInstance.get(`courier/seller-pincode/${auctionData.product._id}`)
              : Promise.resolve(null)
          ]);

          // Handle addresses
          if (addressesResponse.status === 'fulfilled') {
            const userAddresses = addressesResponse.value.data.data || [];
            setAddresses(userAddresses);
            
            // Auto-select default address or first address
            if (userAddresses.length > 0) {
              const defaultAddress = userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
              console.log("🏠 Auto-selecting address:", defaultAddress._id);
              setOrderData((prev) => ({ ...prev, deliveryAddress: defaultAddress }));
            }
          } else {
            console.error('Failed to fetch addresses:', addressesResponse.reason);
            Toast('Failed to load addresses');
          }

          // Handle seller pincode
          if (sellerPincodeResponse.status === 'fulfilled' && sellerPincodeResponse.value) {
            const pincodeData = sellerPincodeResponse.value.data;
            if (pincodeData.status) {
              console.log("📍 Seller pincode fetched:", pincodeData.pincode);
              setSellerPincode(pincodeData.pincode);
            }
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
          Toast('Failed to load required information');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, user, isValidWinner, auctionData?.product?._id]);

  // Track auction checkout events
  const trackAuctionCheckoutEvent = async (step, status = 'in_progress', abandonedAtStep = null) => {
    if (!auctionData?.auctionId) return;
    try {
      await axiosInstance.post('checkout/track', {
        auctionId: auctionData.auctionId,
        productId: auctionData.product?._id,
        step,
        status,
        abandonedAtStep,
        winningBid: auctionData.winningBid
      });
    } catch (error) {
      console.error('Failed to track auction checkout event:', error);
    }
  };
  
  // Properly extract seller ID whether it's a string or populated object
  const productSellerId = (() => {
    const seller = auctionData?.product?.seller || auctionData?.product?.sellerId;
    if (!seller) return null;
    // If seller is an object, extract the _id; otherwise use as-is
    return typeof seller === 'object' ? (seller._id || seller.id) : seller;
  })();
  const userSellerId = user?.sellerInfo?._id || user?.sellerInfo?.id;
  const isOwnProduct = productSellerId && userSellerId && productSellerId === userSellerId;
  // console.log(isOwnProduct)

  // Handle proceed to payment
  const handleProceedToPayment = async () => {
    if (isOwnProduct) {
      Toast('You cannot purchase your own product.');
      return;
    }
    if (!orderData.deliveryAddress) {
     Toast('Error Please select a delivery address.');
      return;
    }
    if (calculatingDelivery) {
      Toast('Please wait Delivery charges are still calculating.');
      return;
    }

    setIsProcessing(true);
    
    // ✅ CRITICAL FIX: Disable auto-PIP BEFORE making API call to prevent race condition
    // This ensures PIP is disabled before Razorpay opens and triggers onUserLeaveHint
    console.log('💳 [AuctionCheckout] Pre-emptively disabling auto-PIP before payment');
    setIsPaymentInProgress(true);
    paymentStartedRef.current = true;
    
    if (PictureInPictureModule?.setAutoEnterPIP) {
      PictureInPictureModule.setAutoEnterPIP(false);
      console.log('💳 [AuctionCheckout] Auto-PIP disabled before API call');
    }
    
    // Notify parent component about payment state change
    if (onPaymentStateChange) {
      onPaymentStateChange(true);
    }
    
    try {
      const winningBid = Number(orderData.winningBid);
      
      // ✅ Build packageDimensions if product has valid dimensions
      let packageDimensions = null;
      if (orderData.product?.dimensions?.length && 
          orderData.product?.dimensions?.width && 
          orderData.product?.dimensions?.height) {
        packageDimensions = {
          length: orderData.product.dimensions.length,
          width: orderData.product.dimensions.width,
          height: orderData.product.dimensions.height,
        };
        console.log('📦 Sending package dimensions for auction order:', packageDimensions);
      } else {
        console.log('⚠️ Auction product has no dimensions, sending without packageDimensions');
      }

      const orderPayload = {
        sourceType: 'auction',
        sourceRefId: orderData.auctionId,
        finalBidAmount: winningBid,
        products: [{
          productId: orderData.product._id,
          quantity: 1,
        }],
        showId: showId,
        paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
        addressId: orderData.deliveryAddress._id,
        shipmentMethod: shipmentMethod,
        deliveryCharge: orderData.deliveryCharge,
        orderValue: winningBid,
        packageDimensions: packageDimensions, // ✅ Add package dimensions for accurate shipping
      };

      const response = await axiosInstance.post('order/place-order', orderPayload);
      
      // ✅ Handle Razorpay payment
      if (selectedPaymentMethod === 'RAZORPAY' && response.data?.data?.paymentOrderId) {
        setPaymentData({
          orderId: response.data.data.paymentOrderId,
          keyId: response.data.data.paymentKeyId,
          amount: response.data.data.amount,
          currency: response.data.data.currency || 'INR',
          gateway: response.data.data.paymentGateway
        });
        setOrderId(response.data.data.paymentOrderId);
        setStep(2);
        Toast('Success Proceeding to payment...');
      } 
      // ✅ Handle wallet payment
      else if (selectedPaymentMethod === 'WALLET' && response.data?.data?.order?._id) {
        setOrderId(response.data.data.order._id);
        setStep(2);
        Toast('Processing wallet payment...');
      } 
      else {
        throw new Error('Payment order ID not received from server.');
      }
    } catch (error) {
      console.log('Failed to create auction order:', error.response.data);
      const errorMessage = error.response?.data?.message || error.message || 'Could not proceed.';
      Toast(errorMessage)
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setCheckoutCompleted(true);
    trackAuctionCheckoutEvent('payment_completed', 'completed');
    setStep(3);
   Toast('Success Auction payment successful! You\'ve won the item!');
    if (onCheckoutComplete) {
      onCheckoutComplete();
    }
  };

  const handleClose = () => {
    if (hasTrackedStart.current && !checkoutCompleted) {
      let abandonedStep = 'checkout_opened';
      if (step === 2) abandonedStep = 'payment_initiated';
      trackAuctionCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
    }
    onClose();
  };

  // Address management functions with useCallback
  const handleAddressSelect = useCallback((address) => {
    setOrderData((prev) => ({ ...prev, deliveryAddress: address }));
  }, []);

  const handleAddAddress = () => {
    setAddressMode('add');
    setEditingAddress(null);
  };

  const handleEditAddress = (address) => {
    setAddressMode('edit');
    setEditingAddress(address);
  };

  const handleCancelAddressForm = () => {
    setAddressMode('select');
  };

  const handleSaveAddress = async (addressData) => {
    try {
      let response;
      if (addressMode === 'add') {
        response = await axiosInstance.post('user/addresses', addressData);
        setAddresses((prev) => [...(prev || []), response.data.data]);
      } else {
        response = await axiosInstance.put(`user/addresses/${_editingAddress._id}`, addressData);
        setAddresses((prev) => 
          prev.map((addr) => (addr._id === _editingAddress._id ? response.data.data : addr))
        );
      }
      
      setOrderData((prev) => ({ ...prev, deliveryAddress: response.data.data }));
      setAddressMode('select');
      Toast('Address saved!');
    } catch (error) {
      console.error('Failed to save address:', error);
      Toast(error.response?.data?.message || 'Failed to save address');
    }
  };

  // Render unauthorized access
  // if (isOpen && !isValidWinner) {
  //   return (
  //     <Modal visible={isOpen} transparent animationType="fade">
  //       <View style={styles.modalOverlay}>
  //         <Animated.View 
  //           style={[
  //             styles.container,
  //             { transform: [{ translateY: slideAnim }] }
  //           ]}
  //         >
  //           <View style={styles.unauthorizedContainer}>
  //             <AlertCircle size={64} color="#ef4444" />
  //             <Text style={styles.unauthorizedTitle}>Access Denied</Text>
  //             <Text style={styles.unauthorizedText}>
  //               You are not authorized to complete this auction purchase.
  //             </Text>
  //             <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
  //               <Text style={styles.closeButtonText}>Close</Text>
  //             </TouchableOpacity>
  //           </View>
  //         </Animated.View>
  //       </View>
  //     </Modal>
  //   );
  // }
  

  // Step 1: Order Review
  const renderStep1 = () => {
    if (addressMode !== 'select') {
      return (
        <View style={styles.addressFormWrapper}>
          <AddressForm
            address={_editingAddress}
            onSave={handleSaveAddress}
            onCancel={handleCancelAddressForm}
            customColor="#1e1e1e"
          />
        </View>
      );
    }

    const totalAmount = orderData.winningBid + orderData.deliveryCharge;
    const productImageUrl = orderData.product?.signedImages?.[0] || 
                            (orderData.product?.images?.[0]?.key 
                              ? `${AWS_CDN_URL}${orderData.product.images[0].key}`
                              : 'https://via.placeholder.com/80');
// console.log(auctionData)
    return (
      <View style={styles.stepContainer}>
        <ScrollView 
          style={styles.scrollContent} 
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Details - Display first */}
          <View style={styles.card}>
            {loading && !orderData.product ? (
              <View style={styles.productLoadingContainer}>
                <View style={styles.productRow}>
                  <View style={[styles.productImage, styles.loadingPlaceholder]}>
                    <ActivityIndicator size="small" color="#eab308" />
                  </View>
                  <View style={styles.productInfo}>
                    <View style={[styles.loadingTextLine, { width: '80%', marginBottom: 8 }]} />
                    <View style={[styles.loadingTextLine, { width: '60%', marginBottom: 12 }]} />
                    <View style={[styles.loadingTextLine, { width: '50%', marginBottom: 8 }]} />
                    <View style={[styles.loadingTextLine, { width: '40%' }]} />
                  </View>
                </View>
                <Text style={styles.loadingText}>Loading product details...</Text>
              </View>
            ) : (
              <View style={styles.productRow}>
                <Image source={{ uri: productImageUrl }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                {orderData.product?.title }                 </Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {orderData.product?.description || ''}
                  </Text>
                  <View style={styles.winningBidBadge}>
                    <Trophy size={16} color="#eab308" />
                    <Text style={styles.winningBidText}>Winning Bid</Text>
                  </View>
                  <View style={styles.priceRowInline}>
                    <IndianRupee size={20} color="#fff" />
                    <Text style={styles.priceText}>
                      {orderData.winningBid?.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Winner Celebration */}
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationHeader}>
              <Trophy size={24} color="#eab308" />
              <Text style={styles.celebrationTitle}>Congratulations!</Text>
            </View>
            <Text style={styles.celebrationText}>
              You won this auction! Complete your purchase below.
            </Text>
          </View>

          {/* Own Product Warning */}
          {isOwnProduct && (
            <View style={styles.ownProductWarning}>
              <View style={styles.ownProductWarningHeader}>
                <AlertCircle size={24} color="#ef4444" />
                <Text style={styles.ownProductWarningTitle}>Cannot Purchase</Text>
              </View>
              <Text style={styles.ownProductWarningText}>
                You cannot buy your own product. This item belongs to your seller account.
              </Text>
            </View>
          )}

          {/* Address Selection */}
          <View style={styles.card}>
            <View style={styles.addressHeader}>
              <Text style={styles.cardTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={handleAddAddress}>
                <Text style={styles.addNewButton}>Add New</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#eab308" style={styles.loader} />
            ) : addresses.length === 0 ? (
              <View style={styles.emptyAddresses}>
                <Text style={styles.emptyAddressesText}>No addresses found</Text>
                <TouchableOpacity 
                  style={styles.addAddressButton}
                  onPress={handleAddAddress}
                >
                  <Text style={styles.addAddressButtonText}>Add Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView 
                style={styles.addressScrollContainer}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.addressList}>
                  {addresses.map((address) => (
                    <View
                      key={address._id}
                      style={[
                        styles.addressCard,
                        orderData.deliveryAddress?._id === address._id && styles.selectedAddress
                      ]}
                    >
                      <TouchableOpacity 
                        style={styles.addressContent}
                        onPress={() => handleAddressSelect(address)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressDetails}>
                          {address.line1}, {address.line2 && `${address.line2}, `}
                          {address.city}, {address.state} - {address.pincode}
                        </Text>
                        <Text style={styles.addressDetails}>{address.mobile}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={() => handleEditAddress(address)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addNewButton}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        
          {/* Payment Method Selection */}
          <View style={styles.card}>
            <PaymentMethodSelector
              orderTotal={totalAmount}
              onPaymentMethodSelect={setSelectedPaymentMethod}
              selectedMethod={selectedPaymentMethod}
              onClose={onClose}
            />
          </View>

          {/* Price Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Price Breakdown</Text>
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Base Price</Text>
                <View style={styles.priceValueRow}>
                  <IndianRupee size={12} color="#9ca3af" />
                  <Text style={styles.priceValue}>
                    {(orderData.basePrice || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  GST ({orderData.gstRate || 0}%)
                </Text>
                <View style={styles.priceValueRow}>
                  <IndianRupee size={12} color="#9ca3af" />
                  <Text style={styles.priceValue}>
                    {(orderData.gstAmount || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.highlightText]}>
                  Winning Bid Total
                </Text>
                <View style={styles.priceValueRow}>
                  <IndianRupee size={12} color="#eab308" />
                  <Text style={[styles.priceValue, styles.highlightText]}>
                    {(orderData.winningBid || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {calculatingDelivery ? (
                <View style={styles.calculatingRow}>
                  <ActivityIndicator size="small" color="#eab308" />
                  <Text style={styles.calculatingText}>
                    Calculating delivery charges...
                  </Text>
                </View>
              ) : (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    Delivery Charge
                    {shipmentMethod === 'flykup_logistics' && orderData.estimatedDays && (
                      <Text style={styles.estimatedDays}>
                        {' '}(Est. {orderData.estimatedDays} days)
                      </Text>
                    )}
                  </Text>
                  <View style={styles.priceValueRow}>
                    <IndianRupee size={12} color="#9ca3af" />
                    <Text style={styles.priceValue}>
                      {(orderData.deliveryCharge || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* {shipmentMethod === 'self_shipment' && !calculatingDelivery &&orderData.deliveryCharge>0&& (
                <Text style={styles.sellerShipmentText}>
                  This item will be shipped directly by the seller.
                </Text>
              )} */}

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <View style={styles.priceValueRow}>
                  <IndianRupee size={16} color="#eab308" />
                  <Text style={styles.totalValue}>
                    {totalAmount.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              (!orderData.deliveryAddress || isProcessing || calculatingDelivery || isOwnProduct) && 
              styles.disabledButton
            ]}
            onPress={handleProceedToPayment}
            disabled={!orderData.deliveryAddress || isProcessing || calculatingDelivery || isOwnProduct}
          >
            {isProcessing ? (
              <ActivityIndicator color="#000" />
            ) : calculatingDelivery ? (
              <Text style={styles.proceedButtonText}>Calculating delivery...</Text>
            ) : isOwnProduct ? (
              <Text style={styles.proceedButtonText}>Cannot Purchase Your Own Product</Text>
            ) : (
              <View style={styles.proceedButtonContent}>
                <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
                <IndianRupee size={16} color="#000" />
                <Text style={styles.proceedButtonText}>
                  {totalAmount.toLocaleString('en-IN', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomBar}>
          
        </View>
      </View>
    );
  };

  // Step 2: Payment
  const renderStep2 = () => {
    const productImageUrl = orderData.product?.signedImages?.[0] || 
                            (orderData.product?.images?.[0]?.key 
                              ? `${AWS_CDN_URL}${orderData.product.images[0].key}`
                              : 'https://via.placeholder.com/80');

    // ✅ Render wallet payment if wallet method was selected
    if (selectedPaymentMethod === 'WALLET') {
      const totalAmount = orderData.winningBid + orderData.deliveryCharge;
      return (
        <WalletPayment
          amount={Math.round(totalAmount * 100)} // Convert to paise
          orderId={orderId}
          orderDetails={{
            productId: orderData.product._id,
            quantity: 1,
            addressId: orderData.deliveryAddress._id,
            deliveryCharge: orderData.deliveryCharge,
          }}
          productTitle={orderData.product?.title}
          productImage={productImageUrl}
          userName={user?.name}
          onSuccess={handlePaymentSuccess}
          onFailure={(error) => {
            console.log('Wallet payment failed:', error);
            Toast(error.message || 'Wallet payment failed');
            setStep(1);
          }}
        />
      );
    }

    // ✅ Render Razorpay payment for RAZORPAY method
    return (
      <RazorpayPayment
        razorpayOrderId={paymentData.orderId}
        razorpayKeyId={paymentData.keyId}
        amount={paymentData.amount}
        currency={paymentData.currency}
        paymentGateway={paymentData.gateway}
        userEmail={user?.emailId} 
        productTitle={orderData.product?.title}
        productImage={productImageUrl}
        userPhone={user?.address?.[0]?.mobile || user?.address?.[0]?.alternateMobile}
        userName={user?.name}
        onSuccess={handlePaymentSuccess}
        onFailure={(error) => {
          console.log('Auction payment failed:', error);
          setStep(1);
        }}
      />
    );
  };
  // Step 3: Confirmation
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.centeredContent}>
        <View style={styles.successIcon}>
          <Trophy size={40} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Auction Purchase Complete!</Text>
        <Text style={styles.successText}>
          Congratulations! You've successfully purchased your winning auction item.
        </Text>
        <View style={styles.orderIdCard}>
          <Text style={styles.orderIdLabel}>Order ID</Text>
          <Text style={styles.orderIdValue}>{orderId || 'ORDER123456'}</Text>
        </View>
        <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStepTitle = () => {
    switch (step) {
      case 1: return addressMode === 'select' ? 'Auction Purchase' : 'Manage Address';
      case 2: return 'Complete Payment';
      case 3: return 'Purchase Confirmed';
      default: return 'Auction Checkout';
    }
  };

  const handleBackClick = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 1 && addressMode !== 'select') {
      handleCancelAddressForm();
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="none">
      <View style={styles.modalOverlay}>
        <SafeAreaView style={{flex:1}} edges={[]} >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
          />
        
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
         
            {/* Header */}
            <View style={styles.header}>
              {(step === 2 || (step === 1 && addressMode !== 'select')) && (
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={handleBackClick}
                >
                  <ArrowLeft size={20} color="#000" />
                </TouchableOpacity>
              )}
              <View style={[styles.headerTitle, (step === 1 && addressMode === 'select') && styles.headerTitleCentered]}>
                <Trophy size={20} color="#000" />
                <Text style={styles.headerText}>{getStepTitle()}</Text>
              </View>
              <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

          {/* Progress Indicator */}
          {step !== 3 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]}>
                  <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
                </View>
                <Text style={styles.progressLabel}>Review</Text>
              </View>

              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />

              <View style={styles.progressStep}>
                <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]}>
                  <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
                </View>
                <Text style={styles.progressLabel}>Payment</Text>
              </View>

              <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />

              <View style={styles.progressStep}>
                <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]}>
                  <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
                </View>
                <Text style={styles.progressLabel}>Confirm</Text>
              </View>
            </View>
          )}

          {/* Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </Animated.View>
  </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT*0.8,    //0.7,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  safeAreaTop: {
    backgroundColor: '#eab308',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eab308',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#eab308',
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressNumberActive: {
    color: '#000',
  },
  progressLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#374151',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#eab308',
  },
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100, // Reserve space for the bottom bar
  },
  celebrationCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  celebrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#eab308',
  },
  celebrationText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  winningBidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  winningBidText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#eab308',
  },
  priceRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  priceBreakdown: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#9ca3af',
    flex: 1,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceValue: {
    fontSize: 14,
    color: '#9ca3af',
  },
  highlightText: {
    color: '#eab308',
    fontWeight: '500',
  },
  calculatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calculatingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  estimatedDays: {
    fontSize: 10,
    color: '#6b7280',
  },
  sellerShipmentText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#eab308',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addNewButton: {
    fontSize: 14,
    color: '#eab308',
    fontWeight: '500',
  },
  loader: {
    paddingVertical: 20,
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyAddressesText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  addAddressButton: {
    backgroundColor: '#eab308',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addAddressButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  addressScrollContainer: {
    maxHeight: 300,
  },
  addressList: {
    gap: 12,
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedAddress: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  addressContent: {
    flex: 1,
    padding: 12,
    paddingRight: 8,
  },
  editButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#1e1e1e',
  },
  proceedButton: {
    backgroundColor: '#eab308',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  proceedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  orderIdCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eab308',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  doneButton: {
    backgroundColor: '#eab308',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  unauthorizedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fullHeight: {
    flex: 1,
  },
  addressFormWrapper: {
    flex: 1,
    // maxHeight: 200,
    // paddingBottom:10,
  },
  ownProductWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ownProductWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  ownProductWarningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },
  ownProductWarningText: {
    fontSize: 14,
    color: '#fca5a5',
  },
  productLoadingContainer: {
    alignItems: 'center',
  },
  loadingPlaceholder: {
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTextLine: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AuctionCheckoutSlider;
