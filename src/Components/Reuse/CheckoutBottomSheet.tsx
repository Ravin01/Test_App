import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  BackHandler,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';

import { AuthContext } from '../../Context/AuthContext';
import { Toast } from '../../Utils/dateUtils';
import axiosInstance from '../../Utils/Api';
import OrderConfirmation from './OrderConfirmation';
import Step1_OrderAndAddress from './OrderandAddress';
import { useNavigation } from '@react-navigation/native';
import RazorpayPayment from './RazorpayPayment';
import WalletPayment from '../Wallet/WalletComponents/WalletPayment';
import { AWS_CDN_URL } from '../../../Config';
import AddressForm from '../Shows/Components/FlashSale/AddressForm';

const { height } = Dimensions.get('window');

const CheckoutBottomSheet = ({ 
  isOpen, 
  onClose, 
  product, 
  type = 'static', 
  flashSaleId = null,
  videoId = null
}) => {
  const { user } = useContext(AuthContext);
  const rbSheetRef = useRef<any>(null);

  // State Management
  const [step, setStep] = useState(1);
  const [_direction, setDirection] = useState(0);
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
    gateway: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [_editingAddress, setEditingAddress] = useState(null);
  const [shipmentMethod, setShipmentMethod] = useState('flykup_logistics');
  const [addressMode, setAddressMode] = useState('select');
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const hasTrackedStart = useRef(false);
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const isMountedRef = useRef(true);
  const navigationRef = useRef(null);

  // 💰 WALLET PAYMENT STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY');
  const [paymentMethod, setPaymentMethod] = useState(null);

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
  const [availableQuantity, setAvailableQuantity] = useState(0);
  
  // Store original product's shipping fields to preserve them when switching variants
  const originalShippingFieldsRef = useRef({
    shippingMethod: product?.shippingMethod,
    logisticsType: product?.logisticsType,
    deliveryCharge: product?.deliveryCharge,
    estimatedDeliveryDate: product?.estimatedDeliveryDate,
  });

  // Track product ID separately to prevent unnecessary resets
  const productIdRef = useRef(null);

  // Component mounted/unmounted tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============ VARIANT HELPER FUNCTIONS ============
  
  /**
   * Load full variant details on-demand
   */
  const loadVariantDetails = async (variantId, parentId) => {
    if (variantCache[variantId]) {
      console.log('✅ Variant loaded from cache:', variantId);
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
        
        // ✅ FIX: Preserve shipping fields from original product if variant doesn't have them
        if (!variantData.shippingMethod && originalShippingFieldsRef.current.shippingMethod) {
          variantData.shippingMethod = originalShippingFieldsRef.current.shippingMethod;
        }
        if (!variantData.logisticsType && originalShippingFieldsRef.current.logisticsType) {
          variantData.logisticsType = originalShippingFieldsRef.current.logisticsType;
        }
        if (!variantData.deliveryCharge && originalShippingFieldsRef.current.deliveryCharge) {
          variantData.deliveryCharge = originalShippingFieldsRef.current.deliveryCharge;
        }
        if (!variantData.estimatedDeliveryDate && originalShippingFieldsRef.current.estimatedDeliveryDate) {
          variantData.estimatedDeliveryDate = originalShippingFieldsRef.current.estimatedDeliveryDate;
        }
        
        // Cache the variant
        setVariantCache(prev => ({
          ...prev,
          [variantId]: variantData
        }));
        
        console.log('✅ Variant loaded from API:', variantId);
        return variantData;
      }
    } catch (error) {
      console.error('Error loading variant details:', error);
      Toast('Failed to load variant details');
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
        setSelectedVariant(variantData);
        setDisplayProduct(variantData);
        
        // Update stock for selected variant
        setStockLoading(true);
        try {
          const stockResponse = await axiosInstance.get(`/stock/by-product/${variantData._id}`);
          if (stockResponse.status === 200 && stockResponse.data.status) {
            const stockInfo = stockResponse.data.data;
            setAvailableQuantity(stockInfo.quantity || 0);
            setStockData(stockInfo);
          }
        } catch (error) {
          console.error('Failed to fetch variant stock:', error);
          setAvailableQuantity(0);
          setStockData({ quantity: 0 });
        } finally {
          setStockLoading(false);
        }
      }
    } else {
      // Find closest match
      const partialMatch = variantMetadata.find(v =>
        v.variantAttributes?.[attributeKey] === value
      );
      
      if (partialMatch) {
        const variantData = await loadVariantDetails(partialMatch._id, parentProduct._id);
        if (variantData) {
          setSelectedVariant(variantData);
          setSelectedAttributes(variantData.variantAttributes || {});
          setDisplayProduct(variantData);
          
          // Update stock
          setStockLoading(true);
          try {
            const stockResponse = await axiosInstance.get(`/stock/by-product/${variantData._id}`);
            if (stockResponse.status === 200 && stockResponse.data.status) {
              const stockInfo = stockResponse.data.data;
              setAvailableQuantity(stockInfo.quantity || 0);
              setStockData(stockInfo);
            }
          } catch (error) {
            console.error('Failed to fetch variant stock:', error);
            setAvailableQuantity(0);
            setStockData({ quantity: 0 });
          } finally {
            setStockLoading(false);
          }
        }
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

  // ✨ Load variant metadata when product has variants
  useEffect(() => {
    const loadProductVariants = async () => {
      if (!product?._id || !isOpen) return;

      // Check if this is a child variant (has parentProductId) or parent product (has childVariantIds)
      const isChildVariant = product.parentProductId && product.parentProductId !== product._id;
      const hasChildVariantIds = product.childVariantIds && 
                                 Array.isArray(product.childVariantIds) && 
                                 product.childVariantIds.length > 0;

      if (isChildVariant) {
        // ========== USER CLICKED ON A SPECIFIC COLOR VARIANT ==========
        console.log('🎨 Loading specific color variant:', product._id);
        setHasVariants(true);
        setStockLoading(true);
        
        try {
          // Load parent product's metadata
          const response = await axiosInstance.get(
            `/product-details/${product.parentProductId}/with-variant-metadata`
          );
          
          if (response.status === 200 && response.data.status) {
            const { parent, variantMetadata: metadata } = response.data.data;
            
            setParentProduct(parent);
            setVariantMetadata(metadata);
            
            // Extract all variant attributes
            const allAttributes = extractVariantAttributeTypes(metadata);
            setVariantAttributes(allAttributes);
            
            // Load the clicked variant's full details
            const fullVariant = await loadVariantDetails(product._id, product.parentProductId);
            
            if (fullVariant) {
              setSelectedVariant(fullVariant);
              setSelectedAttributes(fullVariant.variantAttributes || {});
              setDisplayProduct(fullVariant);
              
              console.log('✅ Specific variant loaded with attributes:', fullVariant.variantAttributes);
              
              // Fetch stock for this specific variant
              const stockResponse = await axiosInstance.get(`/stock/by-product/${fullVariant._id}`);
              if (stockResponse.status === 200 && stockResponse.data.status) {
                const stockInfo = stockResponse.data.data;
                setAvailableQuantity(stockInfo.quantity || 0);
                setStockData(stockInfo);
              }
            }
          }
        } catch (error) {
          console.error('Failed to load variant details:', error);
          Toast('Failed to load product details');
        } finally {
          setStockLoading(false);
        }
      } else if (hasChildVariantIds) {
        // ========== USER CLICKED ON PARENT PRODUCT ==========
        console.log('👨‍👩‍👧‍👦 Loading parent product with variants:', product._id);
        setHasVariants(true);
        setStockLoading(true);
        
        try {
          const response = await axiosInstance.get(
            `/product-details/${product._id}/with-variant-metadata`
          );
          
          if (response.status === 200 && response.data.status) {
            const { parent, variantMetadata: metadata } = response.data.data;
            
            setParentProduct(parent);
            setVariantMetadata(metadata);
            
            // Extract all variant attributes dynamically
            const allAttributes = extractVariantAttributeTypes(metadata);
            setVariantAttributes(allAttributes);
            
            // Load first available variant
            const firstVariant = metadata.find(v => v.stockCount > 0) || metadata[0];
            
            if (firstVariant) {
              const fullVariant = await loadVariantDetails(firstVariant._id, parent._id);
              
              if (fullVariant) {
                setSelectedVariant(fullVariant);
                setSelectedAttributes(fullVariant.variantAttributes || {});
                setDisplayProduct(fullVariant);
                
                // Fetch stock for selected variant
                const stockResponse = await axiosInstance.get(`/stock/by-product/${fullVariant._id}`);
                if (stockResponse.status === 200 && stockResponse.data.status) {
                  const stockInfo = stockResponse.data.data;
                  setAvailableQuantity(stockInfo.quantity || 0);
                  setStockData(stockInfo);
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to load variant metadata:', error);
          Toast('Failed to load product variants');
        } finally {
          setStockLoading(false);
        }
      } else {
        // Single product without variants
        setHasVariants(false);
        setDisplayProduct(product);
        
        // ✅ Store original product shipping fields for non-variant products too
        originalShippingFieldsRef.current = {
          shippingMethod: product?.shippingMethod,
          logisticsType: product?.logisticsType,
          deliveryCharge: product?.deliveryCharge,
          estimatedDeliveryDate: product?.estimatedDeliveryDate,
        };
        
        // Fetch stock for single product
        setStockLoading(true);
        try {
          const response = await axiosInstance.get(`/stock/by-product/${product._id}`);
          
          if (response.status === 200 && response.data.status) {
            const stockInfo = response.data.data;
            setAvailableQuantity(stockInfo.quantity || 0);
            setStockData(stockInfo);
          } else {
            setAvailableQuantity(0);
            setStockData({ quantity: 0 });
          }
        } catch (error) {
          console.error('Failed to fetch stock:', error);
          setAvailableQuantity(0);
          setStockData({ quantity: 0 });
        } finally {
          setStockLoading(false);
        }
      }
    };

    loadProductVariants();
  }, [product?._id, isOpen]);

  // Control RBSheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      rbSheetRef.current?.open();
      setStep(1);
      setAddressMode('select');
    } else {
      rbSheetRef.current?.close();
    }
  }, [isOpen]);

  // Reset state when sheet closes
  const handleSheetClose = () => {
    if (isMountedRef.current) {
      const resetTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setStep(1);
          setDirection(0);
          setAddressMode('select');
          setOrderData((prev) => ({ ...prev, deliveryAddress: null }));
          setOrderId(null);
          setPaymentData({
            orderId: null,
            keyId: null,
            amount: null,
            currency: null,
            gateway: null,
          });
          setIsProcessing(false);
          setCheckoutCompleted(false);
          hasTrackedStart.current = false;
          productIdRef.current = null;
          
          // Reset variant state
          setParentProduct(null);
          setVariantMetadata([]);
          setVariantCache({});
          setSelectedVariant(null);
          setVariantAttributes({});
          setSelectedAttributes({});
          setHasVariants(false);
          setDisplayProduct(null);
          setAvailableQuantity(0);
          
          // Call onClose after state has been reset
          if (onClose) {
            onClose();
          }
        }
      }, 300);
      return () => clearTimeout(resetTimer);
    }
  };

  // Initialize product data with variant support
  useEffect(() => {
    if (displayProduct && isOpen && isMountedRef.current) {
      if (!displayProduct._id || (!displayProduct.productPrice && !displayProduct.flashSale?.flashPrice)) {
        console.log('Invalid product data:', displayProduct);
        Toast('Product information is incomplete');
        const closeTimer = setTimeout(() => {
          if (isMountedRef.current && onClose) {
            try {
              onClose();
            } catch (error) {
              console.error('Error closing modal:', error);
            }
          }
        }, 2000);
        return () => clearTimeout(closeTimer);
      }

      const gstRate = displayProduct.gstRate || 0;
      const unitPrice = displayProduct.flashSale?.isActive
        ? displayProduct.flashSale.flashPrice
        : displayProduct.productPrice;
      
      if (!unitPrice || unitPrice <= 0) {
        Toast('Invalid product price');
        const closeTimer = setTimeout(() => {
          if (isMountedRef.current && onClose) {
            try {
              onClose();
            } catch (error) {
              console.error('Error closing modal:', error);
            }
          }
        }, 2000);
        return () => clearTimeout(closeTimer);
      }

      const basePrice = unitPrice / (1 + gstRate / 100);
      const gstAmount = unitPrice - basePrice;

      if (isMountedRef.current) {
        const isSameProduct = productIdRef.current === displayProduct._id;
        
        if (isSameProduct) {
          setOrderData((prev) => {
            const existingProduct = prev.products?.[0];
            if (!existingProduct) return prev;
            
            const currentQty = existingProduct.quantity;
            return {
              ...prev,
              products: [
                {
                  product: displayProduct,
                  quantity: currentQty,
                  basePrice: basePrice * currentQty,
                  gstAmount: gstAmount * currentQty,
                  gstRate,
                },
              ],
            };
          });
        } else {
          productIdRef.current = displayProduct._id;
          setOrderData((prev) => ({
            ...prev,
            products: [
              {
                product: displayProduct,
                quantity: 1,
                basePrice,
                gstAmount,
                gstRate,
              },
            ],
          }));
        }
      }
    }
  }, [displayProduct, isOpen, onClose]);

  // Fetch addresses
  useEffect(() => {
    if (isOpen && user && isMountedRef.current) {
      const fetchAddresses = async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        try {
          const response = await axiosInstance.get('user/addresses');
          if (!isMountedRef.current) return;
          
          const userAddresses = response.data.data || [];
          setAddresses(userAddresses);
          if (userAddresses.length > 0) {
            const defaultAddress =
              userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
            setOrderData((prev) => ({
              ...prev,
              deliveryAddress: defaultAddress,
            }));
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          console.error('Failed to fetch addresses:', error);
          Toast('Failed to load addresses');
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };
      fetchAddresses();
    }
  }, [isOpen, user]);

  // Track checkout start
  useEffect(() => {
    if (isOpen && displayProduct?._id && !hasTrackedStart.current) {
      trackCheckoutEvent('checkout_opened');
      hasTrackedStart.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, displayProduct]);

  // Track abandonment on unmount
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

  // Handle Android back button
  useEffect(() => {
    const handleBack = () => {
      if (isOpen) {
        handleBackClick();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => backHandler.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, addressMode]);

  // Track checkout events
  const trackCheckoutEvent = async (
    step,
    status = 'in_progress',
    abandonedAtStep = null
  ) => {
    if (!displayProduct?._id || !isMountedRef.current) return;
    try {
      await axiosInstance.post('/checkout/track', {
        productId: displayProduct._id,
        step,
        status,
        abandonedAtStep,
      });
    } catch (error) {
      console.log('Failed to track checkout event:', error.response?.data || error.message);
    }
  };

  // Handle proceed to payment
  const handleProceedToPayment = async () => {
    if (!isMountedRef.current) return;
    
    const stockStatus = getStockStatus();
    if (stockStatus.status === 'sold_out') {
      Toast('Sorry, this product is currently sold out.');
      return;
    }

    const requestedQty = orderData.products[0]?.quantity || 1;
    const availableQty = availableQuantity || 0;
    if (requestedQty > availableQty) {
      Toast(`Only ${availableQty} items available in stock.`);
      return;
    }

    if (!orderData.deliveryAddress) {
      Toast('Please select a delivery address.');
      return;
    }

    // ✅ NEW: Validate payment method selected
    if (!selectedPaymentMethod) {
      Toast('Please select a payment method.');
      return;
    }

    await trackCheckoutEvent('address_selected');
    await trackCheckoutEvent('payment_initiated');

    // Use selected variant ID if available, otherwise use parent product ID
    const productIdToOrder = hasVariants && selectedVariant 
      ? selectedVariant._id 
      : displayProduct._id;

    if (!isMountedRef.current) return;
    setIsProcessing(true);

    try {
      // ✅ Get dimensions from the product (variant or regular product)
      const productForDimensions = hasVariants && selectedVariant 
        ? selectedVariant 
        : displayProduct;
      
      // ✅ Build packageDimensions if product has valid dimensions
      let packageDimensions = null;
      if (productForDimensions?.dimensions?.length && 
          productForDimensions?.dimensions?.width && 
          productForDimensions?.dimensions?.height) {
        packageDimensions = {
          length: productForDimensions.dimensions.length,
          width: productForDimensions.dimensions.width,
          height: productForDimensions.dimensions.height,
        };
        console.log('📦 Sending package dimensions:', packageDimensions);
      } else {
        console.log('⚠️ Product has no dimensions, sending without packageDimensions');
      }

      const orderPayload = {
        sourceType: videoId ? 'shoppable_video' : type,
        products: [{
          productId: productIdToOrder,
          quantity: orderData.products[0]?.quantity || 1,
        }],
        paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
        addressId: orderData.deliveryAddress._id,
        deliveryCharge: orderData.deliveryCharge,
        shipmentMethod: shipmentMethod,
        sourceRefId:
          type === 'flash_sale'
            ? flashSaleId
            : videoId ? videoId : productIdToOrder,
        packageDimensions: packageDimensions, // ✅ Add package dimensions for accurate shipping
      };

      console.log('💰 Creating order with payment method:', selectedPaymentMethod);
      const response = await axiosInstance.post('order/place-order', orderPayload);

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
        setStep(2); // Go to step 2 to show WalletPayment
        setDirection(1);
        Toast('Processing wallet payment...');
      } else if (selectedPaymentMethod === 'RAZORPAY') {
        // Razorpay payment requires additional payment step
        if (response.data?.data?.paymentOrderId) {
          setPaymentData({
            orderId: response.data.data.paymentOrderId,
            keyId: response.data.data.paymentKeyId,
            amount: response.data.data.amount,
            currency: response.data.data.currency || 'INR',
            gateway: response.data.data.paymentGateway,
          });
          setOrderId(response.data.data.order._id);
          setPaymentMethod('RAZORPAY'); // Set payment method
          setStep(2);
          setDirection(1);
          Toast('Proceeding to payment...');
        } else {
          throw new Error('Payment order ID not received from server.');
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.log('Failed to create order:', error.response?.data || error.message);

  const errorMessage =
        error.response?.data?.error ||error.response?.data?.message || 'Could not proceed to payment.';

      if (errorMessage.includes('You cannot order your own product')) {
        Toast(
          'You cannot purchase your own product. Please browse other products.'
        );
        const closeTimer = setTimeout(() => {
          if (isMountedRef.current && onClose) {
            try {
              onClose();
            } catch (err) {
              console.error('Error closing modal:', err);
            }
          }
        }, 4000);
        return () => clearTimeout(closeTimer);
      } else if (errorMessage.includes('Insufficient stock')) {
        Toast(errorMessage);
        // Could add refetch stock here if needed
      } else if (errorMessage.includes('Insufficient wallet balance')) {
        Toast(errorMessage);
        // Stay on current step - user can change payment method
      } else {
        Toast(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Handle close with tracking
  const handleClose = () => {
    if (!isMountedRef.current) return;
    
    if (hasTrackedStart.current && !checkoutCompleted) {
      let abandonedStep = 'checkout_opened';
      if (step === 2) abandonedStep = 'payment_initiated';
      trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
    }

    rbSheetRef.current?.close();
  };

  const handleDeliveryChargeUpdate = useCallback(
    (charge, method = 'flykup_logistics') => {
      setOrderData((prev) => ({
        ...prev,
        deliveryCharge: charge,
      }));
      setShipmentMethod(method);
    },
    []
  );

  const handlePaymentSuccess = () => {
    if (!isMountedRef.current) return;
    
    setCheckoutCompleted(true);
    trackCheckoutEvent('payment_completed', 'completed');
    setStep(3);
    setDirection(1);
    Toast('Payment successful!');
  };

  const handlePaymentFailure = async (error) => {
    if (!isMountedRef.current) return;
    
    console.log('Payment failed:', error);
    
    // Cancel the order that was created
    if (orderId) {
      try {
        await axiosInstance.post(`/order/${orderId}/cancel`, {
          reason: 'payment_failed',
          errorDetails: error.message || 'Payment gateway error',
        });
        console.log('Order cancelled successfully');
        Toast('Payment failed. Order has been cancelled.');
      } catch (cancelError) {
        console.error('Failed to cancel order:', cancelError);
        Toast('Payment failed. Please contact support if order was placed.');
      }
    } else {
      Toast('Payment failed. Please try again.');
    }
    
    // Track payment failure
    await trackCheckoutEvent('payment_failed', 'failed', 'payment_initiated');
    
    // Reset to step 1
    setStep(1);
    setDirection(-1);
    setOrderId(null);
    setPaymentData({
      orderId: null,
      keyId: null,
      amount: null,
      currency: null,
      gateway: null,
    });
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1 || !isMountedRef.current) return;

    const availableQty = availableQuantity || 0;
    
    if (availableQty === 0) {
      Toast('Sorry, this product is currently sold out.');
      return;
    }

    let finalQuantity = newQuantity;
    if (newQuantity > availableQty) {
      finalQuantity = availableQty;
      Toast(`Only ${availableQty} items available in stock.`);
    }

    setOrderData((prev) => {
      const item = prev.products[0];
      if (!item) return prev;
      
      const unitPrice = item?.product?.flashSale?.isActive
        ? item.product.flashSale.flashPrice
        : item.product.productPrice;

      const unitBasePrice = unitPrice / (1 + item.gstRate / 100);

      return {
        ...prev,
        products: [
          {
            ...item,
            quantity: finalQuantity,
            basePrice: unitBasePrice * finalQuantity,
            gstAmount: (unitPrice - unitBasePrice) * finalQuantity,
          },
        ],
      };
    });
  };

  const navigation = useNavigation();
  
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);
  
  const handleAddressSelect = (address) =>
    setOrderData((prev) => ({ ...prev, deliveryAddress: address }));
  
  const handleAddAddress = () => {
    setAddressMode('add');
    setEditingAddress(null);
  };

  const handleEditAddress = (address) => {
    setAddressMode('edit');
    setEditingAddress(address);
  };

  const handleCancelAddressForm = () => setAddressMode('select');
  
  const handleSaveAddress = async (addressData) => {
    if (!isMountedRef.current) return;
    
    try {
      let response;
      if (addressMode === 'add') {
        response = await axiosInstance.post('user/addresses', addressData);
        if (isMountedRef.current) {
          setAddresses((prev) => [...(prev || []), response.data.data]);
        }
      } else {
        response = await axiosInstance.put(`user/addresses/${_editingAddress._id}`, addressData);
        if (isMountedRef.current) {
          setAddresses((prev) => 
            prev.map((addr) => (addr._id === _editingAddress._id ? response.data.data : addr))
          );
        }
      }
      
      if (isMountedRef.current) {
        setOrderData((prev) => ({ ...prev, deliveryAddress: response.data.data }));
        setAddressMode('select');
        Toast('Address saved!');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Failed to save address:', error);
      Toast(error.response?.data?.message || 'Failed to save address');
    }
  };

  const handleBackClick = () => {
    if (step === 2) {
      setStep(1);
      setDirection(-1);
    } else if (step === 1 && addressMode !== 'select') {
      handleCancelAddressForm();
    } else {
      handleClose();
    }
  };

  const getStockStatus = () => {
    if (!stockData || stockLoading) {
      return { status: 'checking', message: 'Checking stock...', color: '#9ca3af' };
    }

    const availableQty = availableQuantity || 0;

    if (availableQty === 0) {
      return { status: 'sold_out', message: 'Sold Out', color: '#ef4444' };
    } else if (availableQty <= 5) {
      return { status: 'low', message: `Only ${availableQty} left in stock!`, color: '#f59e0b' };
    } else {
      return { status: 'available', message: 'In Stock', color: '#10b981' };
    }
  };

  const renderStep = () => {
    if (!displayProduct || !displayProduct._id) {
      return (
        <View style={styles.content}>
          <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
            Product information not available
          </Text>
        </View>
      );
    }

    switch (step) {
      case 1:
        return addressMode === 'select' ? (
          <Step1_OrderAndAddress
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
            stockLoading={stockLoading}
            availableQuantity={availableQuantity}
            hasVariants={hasVariants}
            variantAttributes={variantAttributes}
            selectedAttributes={selectedAttributes}
            onAttributeChange={handleAttributeChange}
            isAttributeCombinationAvailable={isAttributeCombinationAvailable}
            variantLoading={variantLoading}
            variantMetadata={variantMetadata}
            CDN_BASE_URL={AWS_CDN_URL}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            onClose={onClose}
          />
        ) : (
          <View style={styles.addressFormWrapper}>
            <AddressForm
              address={_editingAddress}
              onSave={handleSaveAddress}
              onCancel={handleCancelAddressForm}
            />
          </View>
        );
      case 2:
        const productForImage = orderData.products?.[0]?.product;
        let productImageUrl = '/placeholder.jpg';

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
              onFailure={handlePaymentFailure}
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
            userEmail={user?.emailId}
            productTitle={displayProduct?.title || 'Product'}
            productImage={productImageUrl}
            userPhone={user?.mobile}
            userName={user?.name}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
          />
        );
      case 3:
        return (
          <OrderConfirmation 
            orderId={orderId} 
            onDone={handleClose} 
            onTrackOrder={() => {
              try {
                (navigation as any).navigate("bottomtabbar", {
                  screen: 'HomeTabs',
                  params: { screen: 'myactivity' }
                });
              } catch (error) {
                console.error('Navigation error:', error);
              }
            }} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <RBSheet
      ref={rbSheetRef}
      height={height * 0.7}
      openDuration={100}
      closeDuration={250}
      draggable={true}
      dragOnContent={false}
      closeOnPressMask={true}
      closeOnPressBack={true}
      onClose={handleSheetClose}
      customStyles={{
        wrapper: {
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        },
        draggableIcon: {
          backgroundColor: '#666',
          width: 40,
          height: 4,
        },
        container: {
          backgroundColor: '#1e1e1e',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
      }}
    >
      <View style={styles.sheetContent}>
        {/* Title for Address Add/Edit */}
        {step === 1 && addressMode !== 'select' && (
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>
              {addressMode === 'add' ? 'Add New Address' : 'Edit Address'}
            </Text>
          </View>
        )}

        {/* Progress Indicator */}
        {step !== 3 && addressMode === 'select' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step >= 1 && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    step >= 1 && styles.progressNumberActive,
                  ]}
                >
                  1
                </Text>
              </View>
              <Text style={styles.progressLabel}>Order</Text>
            </View>

            <View
              style={[
                styles.progressLine,
                step >= 2 && styles.progressLineActive,
              ]}
            />

            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step >= 2 && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    step >= 2 && styles.progressNumberActive,
                  ]}
                >
                  2
                </Text>
              </View>
              <Text style={styles.progressLabel}>Payment</Text>
            </View>

            <View
              style={[
                styles.progressLine,
                step >= 3 && styles.progressLineActive,
              ]}
            />

            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step >= 3 && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    step >= 3 && styles.progressNumberActive,
                  ]}
                >
                  3
                </Text>
              </View>
              <Text style={styles.progressLabel}>Confirm</Text>
            </View>
          </View>
        )}

        {/* Content Area */}
        {step === 1 && addressMode !== 'select' ? (
          // AddressForm has its own KeyboardAvoidingView and ScrollView, so render directly
          <View style={styles.content}>
            {renderStep()}
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        )}
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 12,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressCircleActive: {
    backgroundColor: '#f7ce45',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressNumberActive: {
    color: '#000',
  },
  progressLabel: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#4a4a4a',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#f7ce45',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  addressFormWrapper: {
    flex: 1,
    minHeight: 600,
    paddingBottom: 50,
  },
});

export default CheckoutBottomSheet;
