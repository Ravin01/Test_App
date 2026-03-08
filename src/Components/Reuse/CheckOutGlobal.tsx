import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';

import { AuthContext } from '../../Context/AuthContext';
import { Toast } from '../../Utils/dateUtils';
import axiosInstance from '../../Utils/Api';
import OrderConfirmation from './OrderConfirmation';
import Step1_OrderAndAddress from './OrderandAddress';
import { useNavigation } from '@react-navigation/native';
import RazorpayPayment from './RazorpayPayment';
import WalletPayment from '../Wallet/WalletComponents/WalletPayment';
import { AWS_CDN_URL } from '../../../Config';

const CDN_BASE_URL = AWS_CDN_URL
import { ArrowLeft, X } from 'lucide-react-native';
import AddressForm from '../Shows/Components/FlashSale/AddressForm';

const { width, height } = Dimensions.get('window');

const CheckoutSlider = ({ 
  isOpen, 
  onClose, 
  product, 
  type = 'static', 
  flashSaleId = null ,
  videoId=null,
  inintalQuantity=1,
}) => {
  const { user } = useContext(AuthContext);
  // console.log(product,"forom c")
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
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY'); // Pre-selected in Step 1
    const [paymentMethod, setPaymentMethod] = useState(null);
// console.log(product)
  // Animation values - changed to slide from bottom
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
    // ✨ VARIANT STATE - Dynamic variant handling (declare before stock hook)
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [hasVariants, setHasVariants] = useState(false);
    
    // ✨ VARIANT STATE - Dynamic variant handling (remaining states)
    const [parentProduct, setParentProduct] = useState(null);
    const [variantMetadata, setVariantMetadata] = useState([]);
    const [variantCache, setVariantCache] = useState({});
    const [variantAttributes, setVariantAttributes] = useState({});
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [variantLoading, setVariantLoading] = useState(false);
    const [displayProduct, setDisplayProduct] = useState(product);
    // Unified loading state for variant changes to prevent multiple spinners
    const [isVariantChanging, setIsVariantChanging] = useState(false);
    
    // Store original product's shipping fields to preserve them when switching variants
    const originalShippingFieldsRef = useRef({
      shippingMethod: product?.shippingMethod,
      logisticsType: product?.logisticsType,
      deliveryCharge: product?.deliveryCharge,
      estimatedDeliveryDate: product?.estimatedDeliveryDate,
    });

    // Memoized current product image URL - always uses the current variant/product
    const currentProductImageUrl = React.useMemo(() => {
      // Priority: selectedVariant > orderData product > displayProduct > original product
      const currentProduct = selectedVariant || orderData.products?.[0]?.product || displayProduct || product;
      
      if (!currentProduct) return null;
      
      // Check for signedImages first (variants have these)
      if (currentProduct.signedImages?.[0]) {
        return currentProduct.signedImages[0];
      }
      
      // Fall back to images array with CDN URL
      if (currentProduct.images?.[0]?.key) {
        return `${CDN_BASE_URL}${currentProduct.images[0].key}`;
      }
      
      return null;
    }, [selectedVariant, orderData.products, displayProduct, product]);
    // ✅ Use the stock hook with variant ID when available
    const productIdForStock = hasVariants && selectedVariant ? selectedVariant._id : product?._id;

    // Refetch stock function
    const refetchStock = useCallback(() => {
      if (productIdForStock) {
        fetchStockById(productIdForStock);
      }
    }, [productIdForStock]);
  // Component mounted/unmounted tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track product ID separately to prevent unnecessary resets
  const productIdRef = useRef(null);
    // ✨ ADD: Load variant metadata when product has variants
    useEffect(() => {
        const loadProductVariants = async () => {
            if (!product?._id || !isOpen) return;
// console.log("PRODUCT CHNAGED",product)
            // Check if this is a child variant (has parentProductId) or parent product (has childVariantIds)
            const isChildVariant = product.parentProductId && product.parentProductId !== product._id;
            const hasChildVariantIds = product.childVariantIds && 
                                     Array.isArray(product.childVariantIds) && 
                                     product.childVariantIds.length > 0;
          // console.log("IS CHILD",isChildVariant,product)
            
            // Reset stock data when loading variants to prevent showing stale data
            // This ensures "Checking stock..." is shown until actual stock data arrives
            if (isChildVariant || hasChildVariantIds) {
                setStockData(null);
                setIsVariantChanging(true);
            }
            
            if (isChildVariant) {
                // ========== USER CLICKED ON A SPECIFIC COLOR VARIANT ==========
                // console.log('🎨 Loading specific color variant:', product._id);
                setHasVariants(true);
                
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
                            
                            // Initialize order data with variant
                            updateOrderDataWithVariant(fullVariant);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load variant details:', error);
                    Toast('Failed to load product details');
                } finally {
                    // Clear variant changing state after initial load completes
                    setIsVariantChanging(false);
                }
            } else if (hasChildVariantIds) {
                // ========== USER CLICKED ON PARENT PRODUCT ==========
                setHasVariants(true);
                
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
                                
                                // Initialize order data with variant
                                updateOrderDataWithVariant(fullVariant);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to load variant metadata:', error);
                    Toast('Failed to load product variants');
                } finally {
                    // Clear variant changing state after initial load completes
                    setIsVariantChanging(false);
                }
            } else {
                // Single product without variants
                setHasVariants(false);
                setDisplayProduct(product);
                
                // Initialize order data with single product
                const gstRate = product.gstRate || 0;
                const unitPrice = product.flashSale?.isActive ? product.flashSale.flashPrice : product.productPrice;
                const basePrice = unitPrice / (1 + gstRate / 100);
                const gstAmount = unitPrice - basePrice;

                setOrderData((prev) => {
                    const existingProductId = prev.products?.[0]?.product?._id;
                    const newProductId = product._id;
                    
                    // If same product, keep existing quantity
                    if (existingProductId === newProductId && prev.products?.length > 0) {
                        return prev;
                    }
                    
                    // New product or no existing products, initialize with quantity 1
                    return {
                        ...prev,
                        products: [{
                            product,
                            quantity: 1,
                            basePrice,
                            gstAmount,
                            gstRate,
                        }],
                    };
                });
            }
        };

        loadProductVariants();
    }, [product?._id, isOpen]);
// console.log("THESE ONLY WORKING ")
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
                        (image) => `${CDN_BASE_URL}${image.key}`
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
                
                return variantData;
            }
        } catch (error) {
            Toast("Failed to load variant details");
        } finally {
            setVariantLoading(false);
        }
        
        return null;
    };

    /**
     * Update order data with variant information
     */
    const updateOrderDataWithVariant = (variantProduct) => {
        const gstRate = variantProduct.gstRate || 0;
        const unitPrice = variantProduct.flashSale?.isActive ? variantProduct.flashSale.flashPrice : variantProduct.productPrice;
        const basePrice = unitPrice / (1 + gstRate / 100);
        const gstAmount = unitPrice - basePrice;
// console.log(variantProduct,"variantProduct")
        setOrderData((prev) => {
            const currentQuantity = prev.products?.[0]?.quantity || 1;
            return {
                ...prev,
                products: [{
                    product: variantProduct,
                    quantity: currentQuantity,
                    basePrice: basePrice * currentQuantity,
                    gstAmount: gstAmount * currentQuantity,
                    gstRate,
                    
                }],
            };
        });
    };

    /**
     * Handle attribute change - with unified loading state
     */
    const handleAttributeChange = async (attributeKey, value) => {
        // Set unified loading state to prevent multiple spinners
        setIsVariantChanging(true);
        // Reset stock data to null immediately to show "Checking stock..." until new data arrives
        // This prevents showing stale stock status from previous variant
        setStockData(null);
        
        const newSelectedAttributes = {
            ...selectedAttributes,
            [attributeKey]: value
        };
        setSelectedAttributes(newSelectedAttributes);
        
        try {
            // Find matching variant
            const matchingMetadata = findVariantMetadata(newSelectedAttributes);
            
            if (matchingMetadata) {
                const variantData = await loadVariantDetails(matchingMetadata._id, parentProduct._id);
                if (variantData) {
                    setSelectedVariant(variantData);
                    setDisplayProduct(variantData);
                    
                    // Update order data with new variant and RESET quantity to 1
                    updateOrderDataWithVariantAndResetQuantity(variantData);
                    
                    // Fetch stock silently (stockLoading will be suppressed during variant change)
                    if (variantData._id) {
                        await fetchStockById(variantData._id);
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
                        
                        // Update order data with new variant and RESET quantity to 1
                        updateOrderDataWithVariantAndResetQuantity(variantData);
                        
                        // Fetch stock silently
                        if (variantData._id) {
                            await fetchStockById(variantData._id);
                        }
                    }
                }
            }
        } finally {
            // Clear unified loading state after all operations complete
            setIsVariantChanging(false);
        }
    };

    /**
     * Update order data with variant information and RESET quantity to 1
     * Used when user changes size/variant to reset the quantity
     */
    const updateOrderDataWithVariantAndResetQuantity = (variantProduct) => {
        const gstRate = variantProduct.gstRate || 0;
        const unitPrice = variantProduct.flashSale?.isActive ? variantProduct.flashSale.flashPrice : variantProduct.productPrice;
        const basePrice = unitPrice / (1 + gstRate / 100);
        const gstAmount = unitPrice - basePrice;

        // Reset quantity to 1 when variant changes
        setOrderData((prev) => ({
            ...prev,
            products: [{
                product: variantProduct,
                quantity: 1, // Always reset to 1 when variant changes
                basePrice: basePrice,
                gstAmount: gstAmount,
                gstRate,
            }],
        }));
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
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
          productIdRef.current = null; // Reset product ID tracker
        }
      }, 300);
      return () => clearTimeout(resetTimer);
    } else {
      setStep(1);
      setAddressMode('select');
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  // Initialize product data
  useEffect(() => {
    if (product && isOpen && isMountedRef.current) {
      // Validate essential product data
      if (!product._id || (!product.productPrice && !product.flashSale?.flashPrice)) {
        // console.log('Invalid product data:', product);
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

      const gstRate = product.gstRate || 0;
      const unitPrice = product.flashSale?.isActive
        ? product.flashSale.flashPrice
        : product.productPrice;
      
      // Additional validation
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
        // Check if this is the same product by ID
        const isSameProduct = productIdRef.current === product._id;
        
        if (isSameProduct) {
          // Same product - only update prices, keep quantity
          setOrderData((prev) => {
            const existingProduct = prev.products?.[0];
            if (!existingProduct) return prev;
            
            const currentQty = existingProduct.quantity;
            return {
              ...prev,
              products: [
                {
                  product,
                  quantity: currentQty,
                  basePrice: basePrice * currentQty,
                  gstAmount: gstAmount * currentQty,
                  gstRate,
                },
              ],
            };
          });
        } else {
          // New product - initialize with inintalQuantity prop
          const initialQty = inintalQuantity > 0 ? inintalQuantity : 1;
          productIdRef.current = product._id;
          setOrderData((prev) => ({
            ...prev,
            products: [
              {
                product,
                quantity: initialQty,
                basePrice: basePrice * initialQty,
                gstAmount: gstAmount * initialQty,
                gstRate,
              },
            ],
          }));
        }
      }
    }
  }, [product, isOpen, onClose, inintalQuantity]);

  // Fetch stock data
  const fetchStockById = async (productId) => {
    if (!productId || !isMountedRef.current) {
      if (isMountedRef.current) {
        setStockData({ quantity: 0 });
      }
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setStockLoading(true);
      }
      const response = await axiosInstance.get(`/stock/by-product/${productId}`);
      if (isMountedRef.current) {
        setStockData(response?.data?.data || { quantity: 0 });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // Handle errors gracefully without closing the app
      if (error.response?.status === 404) {
        Toast('Product not available at the moment');
        setStockData({ quantity: 0 });
      } else if (error.response?.status >= 500) {
        Toast('Server error. Please try again later.');
        setStockData({ quantity: 0 });
      } else {
        Toast('Unable to load product details');
        setStockData({ quantity: 0 });
      }
    } finally {
      if (isMountedRef.current) {
        setStockLoading(false);
      }
    }
  };

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
// console.log(product,"");
  // Fetch stock when modal opens or when selected variant changes
  // For products with variants, wait for variant to be selected before fetching stock
  useEffect(() => {
    if (!isOpen) return;
    
    // ✅ FIX: Check if product HAS variants (childVariantIds) even before hasVariants state is set
    // This prevents fetching stock for parent products that will load variants
    const productHasChildVariants = product?.childVariantIds && 
                                    Array.isArray(product.childVariantIds) && 
                                    product.childVariantIds.length > 0;
    const productIsChildVariant = product?.parentProductId && product.parentProductId !== product._id;
    const willLoadVariants = productHasChildVariants || productIsChildVariant;
    
    // For variant products, wait until hasVariants state is determined
    // and selectedVariant is set before fetching stock
    if (hasVariants || willLoadVariants) {
      // Only fetch stock when we have a selected variant
      if (selectedVariant?._id) {
        fetchStockById(selectedVariant._id);
      }
      // Don't fetch stock if hasVariants is true but no variant selected yet
      // Also don't fetch if product will load variants (willLoadVariants)
    } else if (product?._id) {
      // Non-variant product - fetch stock immediately
      fetchStockById(product._id);
    }
  }, [isOpen, hasVariants, selectedVariant?._id, product?._id, product?.childVariantIds, product?.parentProductId]);

  // Track checkout start
  useEffect(() => {
    if (isOpen && product?._id && !hasTrackedStart.current) {
      trackCheckoutEvent('checkout_opened');
      hasTrackedStart.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product]);

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
    if (!product?._id || !isMountedRef.current) return;
    try {
      await axiosInstance.post('/checkout/track', {
        productId: product._id,
        step,
        status,
        abandonedAtStep,
      });
    } catch (error) {
      // Don't throw or show error to user for tracking failures
    }
  };
// console.log(product)
  // Handle proceed to payment
  const handleProceedToPayment = async () => {
    if (!isMountedRef.current) return;
    
    // Check stock availability
    const stockStatus = getStockStatus();
    
    // ✅ FIX: Don't allow proceeding when stock is still being checked
    if (stockStatus.status === 'checking') {
      Toast('Please wait while we check stock availability.');
      return;
    }
    
    if (stockStatus.status === 'sold_out') {
      Toast('Sorry, this product is currently sold out.');
      return;
    }
    // console.log(orderData,"orderData")

    // Check if requested quantity exceeds available stock
    const requestedQty = orderData.products[0]?.quantity || 1;
    // ✅ FIX: Use both availableQuantity and quantity (API may return either)
    const availableQty = stockData?.availableQuantity ?? stockData?.quantity ?? 0;
    
    // ✅ FIX: Only validate stock if we have actual stock data
    if (stockData !== null && requestedQty > availableQty) {
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

    if (!isMountedRef.current) return;
    setIsProcessing(true);

    try {
      // ✅ FIX: Use selectedVariant._id when available, same as web version
      const firstProduct = orderData.products[0].product;
      const productIdToOrder = hasVariants && selectedVariant 
          ? selectedVariant._id 
          : firstProduct._id;
      
      console.log('📦 Order productId:', {
        hasVariants,
        selectedVariantId: selectedVariant?._id,
        firstProductId: firstProduct._id,
        productIdToOrder,
      });
      
      // ✅ Get dimensions from the product (variant or regular product)
      const productForDimensions = hasVariants && selectedVariant 
        ? selectedVariant 
        : firstProduct;
      
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
        sourceType: videoId?'shoppable_video':type,
        products: orderData.products.map((item) => ({
          productId: productIdToOrder, // ✅ Use selected variant ID for variant products
          quantity: item.quantity,
        })),
        paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
        addressId: orderData.deliveryAddress._id,
        deliveryCharge: orderData.deliveryCharge,
        shipmentMethod: shipmentMethod,
        sourceRefId:
          type === 'flash_sale'
            ? flashSaleId
            :videoId?videoId:productIdToOrder, // ✅ Also fix sourceRefId
        packageDimensions: packageDimensions, // ✅ Add package dimensions for accurate shipping
      };

      const response = await axiosInstance.post('order/place-order', orderPayload);

      if (!isMountedRef.current) return;
      
      // Handle different payment methods
      if (selectedPaymentMethod === 'WALLET') {
        // Wallet payment - show WalletPayment component
        const createdOrderId = response.data.data.order?._id || response.data.data.order?.orderId || response.data.data.orderId;
        
        if (!createdOrderId) {
          throw new Error('Order ID not received from server.');
        }
        
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
          setStep(2);
          setDirection(1);
          Toast('Proceeding to payment...');
        } else {
          throw new Error('Payment order ID not received from server.');
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
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
      }
       else if (errorMessage.includes('Insufficient stock for product')) {
        Toast(errorMessage);
        refetchStock();
      } 
      else if (errorMessage.includes('Insufficient wallet balance')) {
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

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isMountedRef.current && onClose) {
        try {
          onClose();
        } catch (error) {
          console.error('Error in onClose callback:', error);
        }
      }
    });
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
    
    // Cancel the order that was created
    if (orderId) {
      try {
        await axiosInstance.post(`/order/${orderId}/cancel`, {
          reason: 'payment_failed',
          errorDetails: error.message || 'Payment gateway error',
        });
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
    // console.log("quantity updaiting",newQuantity)
    // Check stock availability - use both availableQuantity and quantity (API may return either)
    const availableQty = stockData?.availableQuantity ?? stockData?.quantity ?? 0;
    
    // If product is sold out, don't allow any quantity change
    if (availableQty === 0) {
      Toast('Sorry, this product is currently sold out.');
      return;
    }

    // Limit quantity to available stock
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

  // Safe navigation hook usage
  const navigation = useNavigation();
  
  // Store navigation reference
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

  // Get stock status - shows loading when stock is being fetched or variant is changing
  const getStockStatus = () => {
    // console.log('📊 [getStockStatus] States:', {
    //   stockLoading,
    //   isVariantChanging,
    //   variantLoading,
    //   stockDataIsNull: stockData === null,
    //   stockDataQuantity: stockData?.quantity,
    //   stockDataAvailableQuantity: stockData?.availableQuantity,
    //   hasVariants,
    //   selectedVariantId: selectedVariant?._id,
    // });
    // Show loading state when:
    // 1. Stock is actively loading
    // 2. Variant is changing (stock will be re-fetched)
    // 3. Stock data hasn't been fetched yet (null)
    if (stockLoading || isVariantChanging || variantLoading || stockData === null) {
      return { status: 'checking', message: 'Checking stock...', color: '#9ca3af' };
    }

    // ✅ FIX: Check both availableQuantity and quantity (API may return either)
    const availableQty = stockData?.availableQuantity ?? stockData?.quantity ?? 0;

    if (availableQty === 0) {
      return { status: 'sold_out', message: 'Sold Out', color: '#ef4444' };
    } else if (availableQty <= 5) {
      return { status: 'low', message: `Only ${availableQty} left in stock!`, color: '#f59e0b' };
    } else {
      return { status: 'available', message: 'In Stock', color: '#10b981' };
    }
  };

  const renderStep = () => {
    // Safety check for product data
    if (!product || !product._id) {
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
            stockData={stockData}
            stockLoading={isVariantChanging ? false : stockLoading}
            stockStatus={getStockStatus()}
            // Variant props
            hasVariants={hasVariants}
            variantAttributes={variantAttributes}
            selectedAttributes={selectedAttributes}
            onAttributeChange={handleAttributeChange}
            isAttributeCombinationAvailable={isAttributeCombinationAvailable}
            variantLoading={variantLoading || isVariantChanging}
            variantMetadata={variantMetadata}
            CDN_BASE_URL={CDN_BASE_URL}
            isVariantChanging={isVariantChanging}
            // Payment method props
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            onClose={onClose}
            // Current product image URL - recalculated when variant changes
            currentProductImageUrl={currentProductImageUrl}
          />
        ) : (
          <View style={{marginBottom:50}}>
          <AddressForm
            address={_editingAddress}
            onSave={handleSaveAddress}
            onCancel={handleCancelAddressForm}
          /></View>
        );
      case 2:
        const productForImage = orderData.products?.[0]?.product;
        let productImageUrl = '/placeholder.jpg';

        if (productForImage?.signedImages?.[0]) {
          productImageUrl = productForImage.signedImages[0];
        } else if (productForImage?.images?.[0]?.key) {
          productImageUrl = `${AWS_CDN_URL}${productForImage.images[0].key}`;
        }

        // console.log('orderData.products?.[0]', orderData.products?.[0])
        // console.log('productImageUrl', productImageUrl);

        // Show wallet or Razorpay payment based on payment method
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

        // Show Razorpay payment
        return (
          <RazorpayPayment
            razorpayOrderId={paymentData.orderId}
            razorpayKeyId={paymentData.keyId}
            amount={paymentData.amount}
            currency={paymentData.currency}
            paymentGateway={paymentData.gateway}
            userEmail={user?.emailId}
            productTitle={product?.title || 'Product'}
            productImage={productImageUrl}
            userPhone={user?.mobile}
            userName={user?.name}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
          />
        );
      case 3:
        return <OrderConfirmation orderId={orderId} onDone={handleClose} onTrackOrder={() => {
          if (navigationRef.current) {
            navigationRef.current.navigate("bottomtabbar", {
              screen: 'HomeTabs',
              params: { screen: 'myactivity' }
            });
          }
        }} />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return addressMode === 'select' ? 'Review Order' : 'Manage Address';
      case 2:
        return 'Complete Payment';
      case 3:
        return 'Order Confirmed';
      default:
        return 'Checkout';
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.slider,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {(step === 2 || (step === 1 && addressMode !== 'select')) && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackClick}
              >
                <ArrowLeft/>
                {/* <ArrowBigLeft/> */}
                {/* <ChevronLeft /> */}
                {/* <Text style={styles.backIcon}>←</Text> */}
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <X />
              {/* // <Text style={styles.closeIcon}>×</Text> */}
            </TouchableOpacity>
          </View>

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

          {/* Stock Status Display */}
          {/* {step === 1 && (
            <View style={styles.stockStatusContainer}>
              {stockLoading ? (
                <View style={styles.stockStatusBadge}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                  <Text style={[styles.stockStatusText, { color: '#9ca3af' }]}>
                    Checking stock...
                  </Text>
                </View>
              ) : (
                <View style={[styles.stockStatusBadge, { backgroundColor: `${getStockStatus().color}20` }]}>
                  <Text style={[styles.stockStatusText, { color: getStockStatus().color }]}>
                    {getStockStatus().message}
                  </Text>
                </View>
              )}
            </View>
          )} */}

          {/* Content Area */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            {renderStep()}
          </ScrollView>

          {/* Fixed Button for Step 1
          {step === 1 && addressMode === 'select' && (
            <View style={styles.fixedButtonContainer}>
              <TouchableOpacity
                onPress={handleProceedToPayment}
                disabled={
                  !orderData.deliveryAddress ||
                  isProcessing ||
                  getStockStatus().status === 'sold_out'
                }
                style={[
                  styles.proceedButton,
                  (!orderData.deliveryAddress ||
                    isProcessing ||
                    getStockStatus().status === 'sold_out') &&
                    styles.proceedButtonDisabled,
                ]}
                activeOpacity={0.8}>
                <Text style={styles.proceedButtonText}>
                  {isProcessing ? 'Processing...' : 'Proceed to Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          )} */}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  slider: {
    width: '100%',
    maxWidth: width > 500 ? 500 : width,
    height: height * 0.7,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 0,
  },
  header: {
    height: 60,
    backgroundColor: '#f7ce45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    borderTopEndRadius: 20,
    borderTopStartRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 28,
    color: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 8,
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
  },
  stockStatusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  stockStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55,65,81,1)',
  },
  proceedButton: {
    width: '100%',
    backgroundColor: '#f7ce45',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default CheckoutSlider;
