// LiveFlashSaleCheckoutSlider.tsx - Flash Sale Checkout with AppSync Real-time Updates

import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  ToastAndroid,
} from "react-native";
import Icon from 'react-native-vector-icons/Feather';
import axiosInstance from "../../../../Utils/Api";
import {AuthContext} from '../../../../Context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Step1_LiveFlashSaleOrder from "./Step1_LiveFlashSaleOrder"; 
import OrderConfirmation from "../../../Reuse/OrderConfirmation";
import { AWS_CDN_URL } from "../../../../../Config";
import RazorpayPayment from '../../../Reuse/RazorpayPayment';
import WalletPayment from '../../../Wallet/WalletComponents/WalletPayment';
import AddressForm from "./AddressForm";
import { Toast } from "../../../../Utils/dateUtils";
import { ArrowLeft } from "lucide-react-native";

// ✅ IMPORT AppSync Flash Sale Configuration
import {
  configureAppSync,
  connectToChannel,
  closeChannel,
  subscribeToChannel,
} from '../../../../Utils/appSyncConfig';
import {
  FLASH_SALE_CHANNELS,
  FLASH_SALE_EVENT_TYPES,
} from '../../../../Utils/appSyncFlashSaleConfig';

const { height } = Dimensions.get('window');

const SlideView = ({ children, direction = 0, style }) => {
  const slideAnim = useRef(new Animated.Value(direction > 0 ? 50 : -50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  return (
    <Animated.View 
      style={[
        { 
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim 
        }, 
        style
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ✅ REMOVED socketFlash prop - now using AppSync Events
const LiveFlashSaleCheckoutSlider = ({ 
  isOpen, 
  onClose, 
  product, 
  flashSaleId, 
  showId
}) => {
  // console.log("showId From LiveFlashSaleCheckoutSlider:", showId);
  const {user}: any = useContext(AuthContext);
  const [[step, direction], setStep] = useState([1, 0]);
 // const { positive, negative } = useAlert();

 const navigation=useNavigation()

  // ✨ VARIANT STATE - Dynamic variant handling
  const [parentProduct, setParentProduct] = useState(null);
  const [variantMetadata, setVariantMetadata] = useState([]);
  const [variantCache, setVariantCache] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variantAttributes, setVariantAttributes] = useState({});
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [hasVariants, setHasVariants] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);
  const [displayProduct, setDisplayProduct] = useState(product);

  // --- COMPONENT MOUNT TRACKING ---
  const isMountedRef = useRef(true);

  // Track component mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- STATE MANAGEMENT ---
  const [orderData, setOrderData] = useState({
    products: [],
    deliveryAddress: null,
    deliveryCharge: null,
  });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentData, setPaymentData] = useState({
    orderId: null,
    keyId: null,
    amount: null,
    currency: null,
    gateway: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [shipmentMethod, setShipmentMethod] = useState('flykup_logistics');
  const [addressMode, setAddressMode] = useState("select");
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const hasTrackedStart = useRef(false);

  // 💰 WALLET PAYMENT STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY');
  const [paymentMethod, setPaymentMethod] = useState(null);

  // --- ✅ NEW REAL-TIME STATE ---
  const [currentFlashStock, setCurrentFlashStock] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerIntervalRef = useRef(null);

  // Slide animation values
  const slideAnim = useRef(new Animated.Value(height)).current;

  // ============ VARIANT HELPER FUNCTIONS ============
  
  /**
   * Load full variant details on-demand
   */
  const loadVariantDetails = async (variantId, parentId) => {
    if (variantCache[variantId]) {
      return variantCache[variantId];
    }

    setVariantLoading(true);
    try {
      const response = await axiosInstance.get(
        `/product-details/${parentId}/variant/${variantId}`
      );
      
      if (response.status === 200 && response.data.status) {
        const variantData = response.data.data;
        
        // Process images
        if (Array.isArray(variantData.images)) {
          variantData.signedImages = variantData.images.map(
            (image) => `${AWS_CDN_URL}${image.key}`
          );
        }
        
        // Cache the variant
        setVariantCache(prev => ({
          ...prev,
          [variantId]: variantData
        }));
        
        return variantData;
      }
    } catch (error) {
      console.error("Error loading variant details:", error);
      Toast("Failed to load variant details");
    } finally {
      setVariantLoading(false);
    }
    
    return null;
  };

  /**
   * Find variant metadata by attributes
   */
  const findVariantMetadata = (attributes) => {
    return variantMetadata.find(v => {
      if (!v.variantAttributes) return false;
      return Object.keys(attributes).every(key => 
        v.variantAttributes[key] === attributes[key]
      );
    });
  };

  /**
   * Extract all variant attribute types from metadata
   */
  const extractVariantAttributeTypes = (metadata) => {
    const attributeTypes = {};
    
    metadata.forEach(variant => {
      if (variant.variantAttributes) {
        Object.keys(variant.variantAttributes).forEach(key => {
          if (!attributeTypes[key]) {
            attributeTypes[key] = [];
          }
          const value = variant.variantAttributes[key];
          if (value && !attributeTypes[key].includes(value)) {
            attributeTypes[key].push(value);
          }
        });
      }
    });
    
    return attributeTypes;
  };

  /**
   * Handle attribute change
   */
  const handleAttributeChange = async (attributeKey, value) => {
    const newSelectedAttributes = {
      ...selectedAttributes,
      [attributeKey]: value
    };
    setSelectedAttributes(newSelectedAttributes);
    
    // Find matching variant
    const matchingMetadata = findVariantMetadata(newSelectedAttributes);
    
    if (matchingMetadata) {
      const variantData = await loadVariantDetails(matchingMetadata._id, parentProduct._id);
      if (variantData) {
        // ✅ Calculate flash price for this variant based on discount percentage
        const parentPrice = parentProduct.productPrice;
        const parentFlashPrice = product.flashSale.flashPrice;
        const discountPercentage = ((parentPrice - parentFlashPrice) / parentPrice) * 100;
        const variantFlashPrice = Math.round(variantData.productPrice * (1 - discountPercentage / 100));
        
        // ✅ Attach flash sale information to variant
        const enrichedVariantData = {
          ...variantData,
          flashSale: {
            isActive: true,
            flashPrice: variantFlashPrice,
            originalPrice: variantData.MRP,
            flashSaleId: product.flashSale.flashSaleId,
            endsAt: product.flashSale.endsAt,
            flashStock: matchingMetadata.stockCount
          }
        };
        
        setSelectedVariant(enrichedVariantData);
        setDisplayProduct(enrichedVariantData);
        
        // Update orderData with selected variant
        const gstRate = enrichedVariantData.gstRate || 0;
        const unitPrice = variantFlashPrice;
        const basePrice = unitPrice / (1 + gstRate / 100);
        const gstAmount = unitPrice - basePrice;

        setOrderData((prev) => ({
          ...prev,
          products: [{
            product: enrichedVariantData,
            quantity: 1,
            basePrice,
            gstAmount,
            gstRate,
          }],
        }));
      }
    }
  };

  /**
   * Check if attribute combination is available
   */
  const isAttributeCombinationAvailable = (attributeKey, value) => {
    const testAttributes = {
      ...selectedAttributes,
      [attributeKey]: value
    };
    const metadata = findVariantMetadata(testAttributes);
    return metadata && metadata.stockCount > 0;
  };

  // --- LIFECYCLE EFFECTS ---

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, slideAnim]);

  // ✅ NEW: Effect to load variants and initialize state when slider opens
  useEffect(() => {
    const loadVariants = async () => {
      if (!isOpen || !product) return;
      
      // ✅ CRITICAL FIX: Clear orderData first to prevent showing old/wrong product
      setOrderData({
        products: [],
        deliveryAddress: null,
        deliveryCharge: null,
      });
      
      // 1. Set initial stock
      const initialStock = product.flashSale?.flashStock || 0;
      setCurrentFlashStock(initialStock);

      // 2. Set initial time
      const ends = new Date(product.flashSale?.endsAt).getTime();
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((ends - now) / 1000));
      
      setTimeLeft(secondsLeft);
      setIsTimeUp(secondsLeft === 0);
      
      // 3. Reset other states
      setStep([1, 0]);
      setAddressMode("select");
      setCheckoutCompleted(false);
      hasTrackedStart.current = false;
      
      // 4. Check if product has variants OR if it IS a variant (has parentProductId)
      const isChildVariant = product.parentProductId && product.parentProductId !== product._id;
      const productHasVariants = product.childVariantIds && product.childVariantIds.length > 0;
      setHasVariants(productHasVariants || isChildVariant);
      
      if (isChildVariant) {
        // This IS a child variant - load parent's variant data
        setDisplayProduct(product);
        
        try {
          // Load parent product with variant metadata
          const response = await axiosInstance.get(
            `/product-details/${product.parentProductId}/with-variant-metadata`
          );
          
          if (response.status === 200 && response.data.status) {
            const { parent, variantMetadata: metadata } = response.data.data;
            
            setParentProduct(parent);
            setVariantMetadata(metadata);
            
            // Extract attribute types
            const attributes = extractVariantAttributeTypes(metadata);
            setVariantAttributes(attributes);
            
            // Find this variant in metadata
            const thisVariantMetadata = metadata.find(v => v._id === product._id);
            
            if (thisVariantMetadata && thisVariantMetadata.variantAttributes) {
              setSelectedAttributes(thisVariantMetadata.variantAttributes);
              
              // Use the flash price directly from the product (backend already calculated it)
              const enrichedProduct = {
                ...product,
                flashSale: {
                  ...product.flashSale,
                  isActive: true,
                  flashPrice: product.flashSale.flashPrice,
                  originalPrice: product.MRP,
                }
              };
              
              setSelectedVariant(enrichedProduct);
              setDisplayProduct(enrichedProduct);
              
              // Set in orderData
              const gstRate = enrichedProduct.gstRate || 0;
              const unitPrice = product.flashSale.flashPrice;
              const basePrice = unitPrice / (1 + gstRate / 100);
              const gstAmount = unitPrice - basePrice;

              setOrderData((prev) => ({
                ...prev,
                products: [{
                  product: enrichedProduct,
                  quantity: 1,
                  basePrice,
                  gstAmount,
                  gstRate,
                }],
              }));
            }
          }
        } catch (error) {
          console.error("Error loading parent's variant metadata:", error);
          Toast("Failed to load product variants");
        }
      } else if (productHasVariants) {
        setParentProduct(product);
        
        try {
          // Load variant metadata
          const response = await axiosInstance.get(`/product-details/${product._id}/with-variant-metadata`);
          
          if (response.status === 200 && response.data.status) {
            const { parent, variantMetadata: metadata } = response.data.data;
            setParentProduct(parent);
            setVariantMetadata(metadata);
            
            // Extract attribute types
            const attributes = extractVariantAttributeTypes(metadata);
            setVariantAttributes(attributes);
            
            // ✅ FIX: Don't auto-select variant - show parent flash sale price first
            // User must manually select a variant
            setSelectedVariant(null);
            setSelectedAttributes({});
            setDisplayProduct(product); // Show parent product
            
            // Initialize orderData with parent product showing parent flash sale price
            const gstRate = product.gstRate || 0;
            const unitPrice = product.flashSale.flashPrice; // Parent flash sale price
            const basePrice = unitPrice / (1 + gstRate / 100);
            const gstAmount = unitPrice - basePrice;

            setOrderData((prev) => ({
              ...prev,
              products: [{
                product: product, // Parent product with parent flash price
                quantity: 1,
                basePrice,
                gstAmount,
                gstRate,
              }],
            }));
          } else {
            console.error("Failed to load variant metadata");
            Toast("Failed to load product variants");
          }
        } catch (error) {
          console.error("Error loading variants:", error);
          Toast("Failed to load product variants");
        }
      } else {
        // No variants - standalone product
        setParentProduct(null);
        setVariantMetadata([]);
        setSelectedVariant(null);
        setDisplayProduct(product);
        
        // Set product in orderData immediately
        const gstRate = product.gstRate || 0;
        const unitPrice = product.flashSale.flashPrice;
        const basePrice = unitPrice / (1 + gstRate / 100);
        const gstAmount = unitPrice - basePrice;

        setOrderData((prev) => ({
          ...prev,
          products: [{
            product,
            quantity: 1,
            basePrice,
            gstAmount,
            gstRate,
          }],
        }));
      }
    };
    
    if (isOpen && product) {
      loadVariants();
    } else if (!isOpen) {
      // Clear interval when slider closes
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      // Reset variant state
      setHasVariants(false);
      setParentProduct(null);
      setVariantMetadata([]);
      setSelectedVariant(null);
      setSelectedAttributes({});
      setVariantCache({});
    }
  }, [isOpen, product]);
  
  // ✅ NEW: Effect for the countdown timer
  useEffect(() => {
    if (isOpen && !isTimeUp) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimeUp(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (isTimeUp || !isOpen) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isOpen, isTimeUp]);


  useEffect(() => {
  if (!isOpen || step !== 1 || !product?.flashSale?.endsAt) return;

  const ends = new Date(product.flashSale.endsAt).getTime();
  const now = Date.now();
  const secondsLeft = Math.max(0, Math.ceil((ends - now) / 1000));

  console.log("⏱ Recalculating timer on Step 1 mount:", secondsLeft);

  setTimeLeft(secondsLeft);
  setIsTimeUp(secondsLeft === 0);
}, [step, isOpen, product?.flashSale?.endsAt]);

  // ✅ MIGRATED: AppSync Flash Sale Events Subscription
  useEffect(() => {
    if (!flashSaleId || !isOpen || !product?._id || !showId) return;

    let channelRef = null;
    let subscriptionRef = null;

    const setupAppSyncSubscription = async () => {
      try {
        console.log('🔌 [Flash Sale Checkout] Setting up AppSync subscription for flash sale:', flashSaleId);

        // Configure AppSync
        await configureAppSync();

        // Get the live stream channel path
        const channelPath = FLASH_SALE_CHANNELS.getLiveStreamChannel(showId);

        // Connect to the channel
        channelRef = await connectToChannel(channelPath);

        // Subscribe to flash sale events
        subscriptionRef = subscribeToChannel(
          channelRef,
          (eventData) => {
            console.log('📨 [Flash Sale Checkout] Received event:', eventData.eventType);

            switch (eventData.eventType) {
              case FLASH_SALE_EVENT_TYPES.LIVE_STOCK_UPDATE:
              case 'live_stock_update':
              case 'stock_update': {
                // Handle stock updates
                if (eventData.flashSaleId === flashSaleId && 
                    eventData.productId === product._id) {
                  console.log('📦 [Flash Sale Checkout] Stock update:', eventData.currentStock || eventData.availableStock);
                  const newStock = eventData.currentStock || eventData.availableStock || 0;
                  setCurrentFlashStock(newStock);
                  
                  if (newStock <= 0) {
                    Toast('This item is now sold out!');
                  }
                }
                break;
              }

              case FLASH_SALE_EVENT_TYPES.LIVE_FLASH_SALE_ENDED:
              case FLASH_SALE_EVENT_TYPES.FLASH_SALE_ENDED:
              case 'live_flash_sale_ended':
              case 'flash_sale_ended': {
                // Handle flash sale ended
                if (eventData.flashSaleId === flashSaleId) {
                  console.log('🛑 [Flash Sale Checkout] Flash sale ended');
                  setIsTimeUp(true);
                  Toast('Flash sale has ended!');
                }
                break;
              }

              default:
                console.log('⚠️ [Flash Sale Checkout] Unknown event type:', eventData.eventType);
            }
          },
          (error) => {
            console.error('❌ [Flash Sale Checkout] AppSync subscription error:', error);
          }
        );

        console.log('✅ [Flash Sale Checkout] AppSync subscription established');
      } catch (error) {
        console.error('❌ [Flash Sale Checkout] Failed to setup AppSync:', error);
      }
    };

    setupAppSyncSubscription();

    // Cleanup function
    return () => {
      console.log('🧹 [Flash Sale Checkout] Cleaning up AppSync subscription');
      if (subscriptionRef) {
        subscriptionRef.unsubscribe();
      }
      if (channelRef) {
        closeChannel(channelRef);
      }
    };
  }, [flashSaleId, isOpen, product?._id, showId]);

  // Effect to fetch addresses
  useEffect(() => {
    if (isOpen && user) {
      const fetchAddresses = async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        try {
          const response = await axiosInstance.get("user/addresses");
          if (!isMountedRef.current) return;
          
          const userAddresses = response.data.data || [];
          setAddresses(userAddresses);
          if (userAddresses.length > 0) {
            const defaultAddress = userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
            setOrderData((prev) => ({ ...prev, deliveryAddress: defaultAddress }));
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          console.error("Failed to fetch addresses:", error);
          // Alert.alert("Error", "Failed to load addresses");
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };
      fetchAddresses();
    }
  }, [isOpen, user]);

  // Tracking logic
  const trackCheckoutEvent = async (step, status = 'in_progress', abandonedAtStep = null) => {
    if (!product?._id) return;
    try {
      await axiosInstance.post('checkout/track', {
        productId: product._id,
        step,
        status,
        abandonedAtStep
      });
    } catch (error) {
      console.error('Failed to track checkout event:', error);
    }
  };
  
  useEffect(() => {
    if (isOpen && product?._id && !hasTrackedStart.current) {
      trackCheckoutEvent('checkout_opened');
      hasTrackedStart.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product]);
  
  useEffect(() => {
    return () => {
      if (hasTrackedStart.current && !checkoutCompleted) {
        let abandonedStep = 'checkout_opened';
        if (step === 2) abandonedStep = 'payment_initiated';
        trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutCompleted, step]);

  // --- CORE LOGIC ---

  // Proceed to payment logic
  const handleProceedToPayment = async () => {
    if (!isMountedRef.current) return;
    
    if (!orderData.deliveryAddress) {
     Toast( "Please select a delivery address.");
      return;
    }

    // ✅ Validate payment method selected
    if (!selectedPaymentMethod) {
      Toast('Please select a payment method.');
      return;
    }

    // ✅ Validate that a variant is selected if product has variants
    if (hasVariants && !selectedVariant) {
      Toast("Please select a variant");
      return;
    }

    await trackCheckoutEvent('address_selected');
    await trackCheckoutEvent('payment_initiated');

    if (!isMountedRef.current) return;
    setIsProcessing(true);
    
    try {
      const firstProduct = orderData.products[0].product;
      const isFlashSaleActive = firstProduct.flashSale?.isActive; 
      
      // ✅ Build packageDimensions if product has valid dimensions
      let packageDimensions = null;
      if (firstProduct?.dimensions?.length && 
          firstProduct?.dimensions?.width && 
          firstProduct?.dimensions?.height) {
        packageDimensions = {
          length: firstProduct.dimensions.length,
          width: firstProduct.dimensions.width,
          height: firstProduct.dimensions.height,
        };
        console.log('📦 Sending package dimensions for flash sale order:', packageDimensions);
      } else {
        console.log('⚠️ Flash sale product has no dimensions, sending without packageDimensions');
      }

      const orderPayload = {
        sourceType: isFlashSaleActive ? 'flash_sale' : 'static',
        products: orderData.products.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
        addressId: orderData.deliveryAddress._id,
        deliveryCharge: orderData.deliveryCharge,
        shipmentMethod: shipmentMethod,
        showId: showId,
        sourceRefId: isFlashSaleActive ? firstProduct.flashSale.flashSaleId : firstProduct._id,
        packageDimensions: packageDimensions, // ✅ Add package dimensions for accurate shipping
      };

      console.log('💰 Creating order with payment method:', selectedPaymentMethod);
      const response = await axiosInstance.post("order/place-order", orderPayload);
      
      if (!isMountedRef.current) return;
      
      // Handle different payment methods
      if (selectedPaymentMethod === 'WALLET') {
        // Wallet payment - show WalletPayment component
        console.log('💰 Wallet payment - order created, showing payment UI');
        const createdOrderId = response.data.data.order?._id || response.data.data.order?.orderId || response.data.data.orderId;
        
        if (!createdOrderId) {
          throw new Error('Order ID not received from server.');
        }
        
        console.log('💰 Order ID:', createdOrderId);
        setOrderId(createdOrderId);
        setPaymentMethod('WALLET'); // Set payment method
        setStep([2, 1]); // Go to step 2 to show WalletPayment
        ToastAndroid.show('Processing wallet payment...', ToastAndroid.SHORT);
      } else if (selectedPaymentMethod === 'RAZORPAY') {
        // Razorpay payment requires additional payment step
        if (response.data?.data?.paymentOrderId) {
          setPaymentData({
            orderId: response.data.data.paymentOrderId,
            keyId: response.data.data.paymentKeyId,
            amount: response.data.data.amount,
            currency: response.data.data.currency || 'INR',
            gateway: response.data.data.paymentGateway
          });
          setOrderId(response.data.data.order._id);
          setPaymentMethod('RAZORPAY'); // Set payment method
          setStep([2, 1]);
          ToastAndroid.show("Proceeding to payment...", ToastAndroid.SHORT);
        } else {
          throw new Error("Payment order ID not received from server.");
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error("Failed to create order:", error);
      const errorMessage =
        error.response?.data?.error ||error.response?.data?.message || 'Could not proceed to payment.';
      
      if (errorMessage.includes("You cannot order your own product")) {
        ToastAndroid.show("You cannot purchase your own product.", ToastAndroid.SHORT);
        const closeTimer = setTimeout(() => {
          if (isMountedRef.current && onClose) {
            try {
              onClose();
            } catch (err) {
              console.error('Error closing modal:', err);
            }
          }
        }, 3000);
        return () => clearTimeout(closeTimer);
      } else if (errorMessage.includes('Insufficient wallet balance')) {
        Toast(errorMessage);
        // Stay on current step - user can change payment method
      } else {
        console.warn(errorMessage);
       // ToastAndroid.show(errorMessage, ToastAndroid.SHORT);
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };
  
  // Close handler
  const handleClose = () => {
    if (!isMountedRef.current) return;
    
    if (hasTrackedStart.current && !checkoutCompleted) {
      let abandonedStep = 'checkout_opened';
      if (step === 2) abandonedStep = 'payment_initiated';
      trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
    }
    
    if (onClose) {
      try {
        onClose();
      } catch (error) {
        console.error('Error in onClose callback:', error);
      }
    }
  };
  
  // Delivery charge handler
  const handleDeliveryChargeUpdate = (charge, method = 'flykup_logistics') => {
    setOrderData((prev) => ({
      ...prev,
      deliveryCharge: charge,
    }));
    setShipmentMethod(method);
  };
  
  // Payment success handler
  const handlePaymentSuccess = () => {
    if (!isMountedRef.current) return;
    
    // console.log("success payment ")
    setCheckoutCompleted(true);
    trackCheckoutEvent('payment_completed', 'completed');
    setStep([3, 1]);
    ToastAndroid.show("Payment successful!", ToastAndroid.SHORT);
  };

  // --- HELPER FUNCTIONS ---

  // ✅ MODIFIED: Quantity change handler now respects real-time stock
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;

    // Check against real-time stock
    if (newQuantity > currentFlashStock) {
     Toast(`Only ${currentFlashStock} left in stock!`);
      return;
    }

    setOrderData((prev) => {
      const item = prev.products[0];
      const unitPrice = item.product.flashSale.flashPrice;
      const unitBasePrice = unitPrice / (1 + item.gstRate / 100);
      
      return {
        ...prev,
        products: [{
          ...item,
          quantity: newQuantity,
          basePrice: unitBasePrice * newQuantity,
          gstAmount: (unitPrice - unitBasePrice) * newQuantity,
        }],
      };
    });
  };
// console.log("these only wokrs ")
  // Address handlers
  const handleAddressSelect = (address) => setOrderData((prev) => ({ ...prev, deliveryAddress: address }));
  const handleAddAddress = () => {setAddressMode("add");
   // navigation.navigate("AddressForm");
  }
  const handleEditAddress = (address) => {
    setAddressMode("edit");
    // console.log('address', address);
    setEditingAddress(address);
  //  navigation.navigate('AddressForm', {item: address});
    //navigation.navigate("EditAddressScreen");
  };
  const handleCancelAddressForm = () => setAddressMode("select");
  const handleSaveAddress = async (addressData) => {
    if (!isMountedRef.current) return;
    
    try {
      let response;
      if (addressMode === "add") {
        response = await axiosInstance.post("user/addresses", addressData);
        if (isMountedRef.current) {
          setAddresses((prev) => [...(prev || []), response.data.data]);
        }
      } else {
        response = await axiosInstance.put(`user/addresses/${editingAddress._id}`, addressData);
        if (isMountedRef.current) {
          setAddresses((prev) => prev.map((addr) => (addr._id === editingAddress._id ? response.data.data : addr)));
        }
      }
      
      if (isMountedRef.current) {
        setOrderData((prev) => ({ ...prev, deliveryAddress: response.data.data }));
        setAddressMode("select");
        ToastAndroid.show("Address saved!", ToastAndroid.SHORT);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Failed to save address:", error);
      ToastAndroid.show(error.response?.data?.message || "Failed to save address", ToastAndroid.SHORT);
    }
  };

  // --- UI RENDERING ---

  const renderStep = () => {
    switch (step) {
      case 1:
        return addressMode === "select" ? (
          <Step1_LiveFlashSaleOrder
            orderData={orderData}
            addresses={addresses}
            loading={loading}
            onQuantityChange={handleQuantityChange}
            onSelectAddress={handleAddressSelect}
            onDeliveryChargeUpdate={handleDeliveryChargeUpdate} 
            onAddNewAddress={handleAddAddress}
            onEditAddress={handleEditAddress}
            onNext={handleProceedToPayment}
            isProcessing={isProcessing}
            // ✅ PASS NEW REAL-TIME PROPS
            currentFlashStock={currentFlashStock}
            timeLeft={timeLeft}
            isTimeUp={isTimeUp}
            // ✅ PASS VARIANT PROPS
            hasVariants={hasVariants}
            variantAttributes={variantAttributes}
            selectedAttributes={selectedAttributes}
            onAttributeChange={handleAttributeChange}
            isAttributeCombinationAvailable={isAttributeCombinationAvailable}
            variantLoading={variantLoading}
            variantMetadata={variantMetadata}
            parentProduct={parentProduct}
            selectedVariant={selectedVariant}
            displayProduct={displayProduct}
            // 💰 PAYMENT METHOD PROPS
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
          />
        ) : (
          <AddressForm
            address={editingAddress}
            onSave={handleSaveAddress}
            onCancel={handleCancelAddressForm}
            customColor={"rgba(0,0,0,1)"}
          />
       // null
        );
      case 2:
        const productForImage = orderData.products?.[0]?.product;
        let productImageUrl = null;   //"https://via.placeholder.com/80x80/374151/ffffff?text=Product";
        if (productForImage?.signedImages?.[0]) {
          productImageUrl = productForImage.signedImages[0];
        } else if (productForImage?.images?.[0]?.key) {
          productImageUrl = `${AWS_CDN_URL}${productForImage.images[0].key}`;
        }

        // 💰 Show wallet or Razorpay payment based on payment method
        if (paymentMethod === 'WALLET' || selectedPaymentMethod === 'WALLET') {
          return (
            <WalletPayment
              amount={Math.round((orderData.products.reduce((sum, item) => 
                sum + (item.basePrice + item.gstAmount), 0
              ) + (orderData.deliveryCharge || 0)) * 100)}
              orderId={orderId}
              orderDetails={{
                productId: orderData.products[0].product._id,
                quantity: orderData.products[0].quantity,
                addressId: orderData.deliveryAddress._id,
                deliveryCharge: orderData.deliveryCharge,
              }}
              productTitle={orderData.products[0].product.title}
              productImage={productImageUrl}
              userName={user?.name}
              onSuccess={handlePaymentSuccess}
              onFailure={(error) => {
                console.log('Wallet payment failed:', error);
                ToastAndroid.show("Wallet payment failed", ToastAndroid.SHORT);
                setStep([1, -1]); // Go back to Step 1
              }}
            />
          );
        }

        // 💳 Show Razorpay payment component
        return (
          <RazorpayPayment
            razorpayOrderId={paymentData.orderId}
            razorpayKeyId={paymentData.keyId}
            amount={paymentData.amount}
            currency={paymentData.currency}
            paymentGateway={paymentData.gateway}
            userEmail={user?.email}
            productTitle={orderData.products[0].product.title}
            productImage={productImageUrl}
            userPhone={user?.mobile}
            userName={user?.name}
            onSuccess={handlePaymentSuccess}
            onFailure={(error) => {
              console.log('Payment failed:', error);
              ToastAndroid.show("Payment failed", ToastAndroid.SHORT);
              setStep([1, -1]);
            }}
          />
        );
      case 3:
        return <OrderConfirmation orderId={orderId} onDone={onClose} onTrackOrder={() => {
          try {
            navigation.navigate("bottomtabbar" as never, {
              screen: 'HomeTabs',
              params: { screen: 'myactivity' }
            } as never);
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }}/>;
      default:
        return null;
    }
  };

  // Header/Back button logic
  const getStepTitle = () => {
    switch (step) {
      case 1: return addressMode === "select" ? "Review Order" : "Manage Address";
      case 2: return "Complete Payment";
      case 3: return "Order Confirmed";
      default: return "Checkout";
    }
  };

  const handleBackClick = () => {
    if (step === 2) {
      setStep([1, -1]);
    } else if (step === 1 && addressMode !== "select") {
      handleCancelAddressForm();
    }
  };

  const ProgressStep = ({ number, label, isActive, isCompleted }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View 
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: isActive || isCompleted ? '#f7ce45' : '#374151',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <Text 
          style={{ 
            fontSize: 12, 
            fontWeight: 'bold', 
            color: isActive || isCompleted ? '#000' : '#9CA3AF' 
          }}
        >
          {number}
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: isActive || isCompleted ? '#f7ce45' : '#9CA3AF' }}>
        {label}
      </Text>
    </View>
  );

  const ProgressConnector = ({ isActive }) => (
    <View 
      style={{
        flex: 1,
        height: 2,
        backgroundColor: isActive ? '#f7ce45' : '#374151',
        marginHorizontal: 8,
        marginTop: 12,
      }}
    />
  );

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <Animated.View 
          style={{
            transform: [{ translateY: slideAnim }],
            width: '100%',
            height: '90%',  // '80%',  //  '100%',
            backgroundColor: '#1e1e1e',
            position: 'absolute',
            bottom: 0,
          }}
        >
          {/* Header */}
          <View style={{ 
            backgroundColor: '#f7ce45', 
            borderBottomWidth: 1, 
            borderBottomColor: 'rgba(55, 65, 81, 0.5)',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderTopEndRadius: 20,
            borderTopStartRadius: 20,
          }}>
            {(step === 2 || (step === 1 && addressMode !== "select")) && (
              <TouchableOpacity 
                onPress={handleBackClick} 
                style={{ 
                  position: 'absolute', 
                  left: 16, 
                  padding: 4, 
                  borderRadius: 20,
                  backgroundColor: 'rgba(55, 65, 81, 0.5)'
                }}
              >
                <ArrowLeft/>
                {/* <Icon name="arrow-left" width={20} height={20} color="#000" /> */}
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000' }}>
              {getStepTitle()}
            </Text>
            <TouchableOpacity 
              onPress={handleClose}
              style={{ 
                position: 'absolute', 
                right: 16, 
                alignItems:'center',  
                justifyContent:'center',
                padding: 4, 
                borderRadius: 20,
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
              }}
            >
              <Icon name="x" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Title for Address Add/Edit */}
          {step === 1 && addressMode !== 'select' && (
            <View style={{ 
              paddingHorizontal: 20, 
              paddingVertical: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: 'rgba(255, 255, 255, 0.1)' 
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600', 
                color: '#fff', 
                textAlign: 'center' 
              }}>
                {addressMode === 'add' ? 'Add New Address' : 'Edit Address'}
              </Text>
            </View>
          )}

          {/* Progress Indicator */}
          {step !== 3 && addressMode === 'select' && (
            <View style={{ paddingHorizontal: 40, paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressStep number="1" label="Order" isActive={step === 1} isCompleted={step > 1} />
                <ProgressConnector isActive={step >= 2} />
                <ProgressStep number="2" label="Payment" isActive={step === 2} isCompleted={step > 2} />
                <ProgressConnector isActive={step >= 3} />
                <ProgressStep number="3" label="Confirm" isActive={step === 3} isCompleted={step > 3} />
              </View>
            </View>
          )}

          {/* Content Area */}
          <View style={{ flex: 1 }}>
            <SlideView direction={direction} style={{ flex: 1 }}>
              {renderStep()}
            </SlideView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default LiveFlashSaleCheckoutSlider;
