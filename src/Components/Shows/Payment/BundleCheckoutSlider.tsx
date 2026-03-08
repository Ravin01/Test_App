import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import RazorpayPayment from '../../Reuse/RazorpayPayment';
import WalletPayment from '../../Wallet/WalletComponents/WalletPayment';
import OrderConfirmation from '../../Reuse/OrderConfirmation';
import Step1_BundleOrderReview from './Step1_BundleOrderReview';
import { AuthContext } from '../../../Context/AuthContext';
import axiosInstance from '../../../Utils/Api';
import { formatTimeDayForDisplay, Toast } from '../../../Utils/dateUtils';
import { AWS_CDN_URL } from '../../../../Config';
import { isUserOwner } from '../../../Utils/ownershipCheck';
import AddressForm from '../../Shows/Components/FlashSale/AddressForm';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BundleCheckoutSliderProps {
  isOpen: boolean;
  onClose: () => void;
  bundleId: string;
  currentTime: any;
  flashSaleData?: {
    flashSaleId: string;

    flashPrice?: number;
    flashSaleEndTime?: string;
  } | null;
  showId?: string | null;
}

const BundleCheckoutSlider: React.FC<BundleCheckoutSliderProps> = ({
  isOpen,
  onClose,
  bundleId,
  currentTime,
  flashSaleData = null,
  showId = null,
}) => {
  // console.log(isOpen ? '🚀 Opening Bundle Checkout Slider' : '🔒 Closing Bundle Checkout Slider');
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // console.log(showId)
  // State management
  const [bundleData, setBundleData] = useState<any>(null);
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentData, setPaymentData] = useState({
    orderId: null,
    keyId: null,
    amount: null,
    currency: null,
    gateway: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressMode, setAddressMode] = useState<'select' | 'add' | 'edit'>('select');
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const hasTrackedStart = useRef(false);

  // TypeScript interfaces for variant state
  interface ProductVariantData {
    hasVariants: boolean;
    parentProduct?: any;
    variantMetadata?: any[];
    variantAttributes?: Record<string, string[]>;
    selectedAttributes?: Record<string, string>;
    selectedVariantId?: string | null;
    variantCache?: Record<string, any>;
    isParentProduct?: boolean;
  }

  interface ProductVariantsState {
    [productId: string]: ProductVariantData;
  }

  const [productVariants, setProductVariants] = useState<ProductVariantsState>({});
  const [variantLoading, setVariantLoading] = useState<Record<string, boolean>>({});
  const [initialVariantLoading, setInitialVariantLoading] = useState(false);

  // 💰 WALLET PAYMENT STATE
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('RAZORPAY');

  const [isOwner, setIsOwner] = useState(false);

  // Animation effects
  useEffect(() => {
    if (isOpen) {
      // Reset animation values before starting the animation
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset state after animation
        setTimeout(() => {
          setStep(1);
          setQuantity(1);
          setAddressMode('select');
          setSelectedAddress(null);
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
        }, 100);
      });
    }
  }, [isOpen]);

  // Fetch bundle details
  useEffect(() => {
    if (isOpen && bundleId) {
      fetchBundleDetails();
    }
  }, [isOpen, bundleId]);

  // Fetch addresses
  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
    }
  }, [isOpen, user]);

  // Check ownership when bundle data is loaded
  useEffect(() => {
    if (bundleData && user) {
      setIsOwner(isUserOwner(user, bundleData));
    }
  }, [bundleData, user]);


  // Sync currentTime prop with local state and manage internal timer
  useEffect(() => {
    if (isOpen) {
      setLocalCurrentTime(currentTime || Date.now());

      const interval = setInterval(() => {
        setLocalCurrentTime(Date.now());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, currentTime]);

  const fetchBundleDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`user/bundle-sale/${bundleId}`);
      if (response.data && response.data.status) {
        const bundle = response.data.data;
        // console.log('📦 Fetching bundle details for ID:', bundle);
        setBundleData(response.data.data);
        if (bundle.products && bundle.products.length > 0) {
          await loadBundleProductVariants(bundle.products);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch bundle details:', error);
      // onClose();
    } finally {
      setLoading(false);
    }
  }, [bundleId]);
  // ✨ Load variant metadata for products in bundle that have variants
  const loadBundleProductVariants = async (products: any[]) => {
    setInitialVariantLoading(true);
    const variantsData: ProductVariantsState = {};

    for (const product of products) {
      const productId = product._id || product.productId;
      if (!productId) continue;

      // Check if product has variants
      const isChildVariant = product.parentProductId && product.parentProductId !== productId;
      const isParentWithVariants = product.childVariantIds && product.childVariantIds.length > 0;
      const hasVariants = isChildVariant || isParentWithVariants;

      console.log(`🔍 Product variant check for "${product.title}":`, {
        productId,
        isChildVariant,
        isParentWithVariants,
        hasVariants,
        childVariantIds: product.childVariantIds,
        parentProductId: product.parentProductId
      });

      if (hasVariants) {
        console.log(`🎨 Product has variants, loading metadata:`, product.title);

        try {
          const parentId = isChildVariant ? product.parentProductId : productId;
          const response = await axiosInstance.get(
            `/product-details/${parentId}/with-variant-metadata`
          );

          if (response.status === 200 && response.data.status) {
            const { parent, variantMetadata } = response.data.data;

            // Extract variant attributes
            const attributes = extractVariantAttributeTypes(variantMetadata);

            // Determine selected variant based on product type
            let currentVariantId: string | null = null;
            let currentVariant: any = null;
            let selectedAttributes: Record<string, string> = {};

            if (isChildVariant) {
              // Bundle contains a specific child variant - use it
              currentVariantId = productId;
              currentVariant = variantMetadata.find((v: any) => v._id === currentVariantId) || variantMetadata[0];

              // Load full variant details to get stock
              const fullVariantResponse = await axiosInstance.get(
                `/product-details/${parentId}/variant/${currentVariantId}`
              );

              if (fullVariantResponse.status === 200 && fullVariantResponse.data.status) {
                const fullVariant = fullVariantResponse.data.data;
                const variantStock = fullVariant.stockId?.quantity ?? fullVariant.stock ?? fullVariant.currentStock ?? 0;

                currentVariant = {
                  ...fullVariant,
                  stock: variantStock,
                  currentStock: variantStock
                };

                selectedAttributes = currentVariant.variantAttributes || {};
              }
            } else if (isParentWithVariants) {
              // Bundle contains parent product - auto-select first available variant
              console.log(`📌 Parent product in bundle, auto-selecting first variant:`, productId);

              // Get the first variant from metadata
              const firstVariant = variantMetadata[0];
              if (firstVariant) {
                currentVariantId = firstVariant._id;

                // Load full variant details to get stock
                try {
                  const fullVariantResponse = await axiosInstance.get(
                    `/product-details/${parentId}/variant/${currentVariantId}`
                  );

                  if (fullVariantResponse.status === 200 && fullVariantResponse.data.status) {
                    const fullVariant = fullVariantResponse.data.data;
                    const variantStock = fullVariant.stockId?.quantity ?? fullVariant.stock ?? fullVariant.currentStock ?? 0;

                    currentVariant = {
                      ...fullVariant,
                      stock: variantStock,
                      currentStock: variantStock
                    };

                    selectedAttributes = firstVariant.variantAttributes || {};

                    console.log(`✅ Auto-selected first variant for parent product:`, {
                      variantId: currentVariantId,
                      attributes: selectedAttributes,
                      stock: variantStock
                    });
                  }
                } catch (variantError) {
                  console.error(`Failed to load first variant details:`, variantError);
                  // Fallback to metadata
                  currentVariant = firstVariant;
                  selectedAttributes = firstVariant.variantAttributes || {};
                }
              } else {
                currentVariantId = null;
                currentVariant = null;
                selectedAttributes = {};
              }
            }

            variantsData[productId] = {
              hasVariants: true,
              parentProduct: parent,
              variantMetadata,
              variantAttributes: attributes,
              selectedAttributes: selectedAttributes,
              selectedVariantId: currentVariantId,
              variantCache: currentVariant ? { [currentVariantId!]: currentVariant } : {},
              isParentProduct: isParentWithVariants
            };

            console.log(`✅ Loaded variants for ${product.title}:`, {
              selectedVariantId: currentVariantId,
              isParent: isParentWithVariants,
              stock: currentVariant?.stock
            });
          }
        } catch (error) {
          console.error(`Failed to load variants for product ${productId}:`, error);
        }
      } else {
        variantsData[productId] = { hasVariants: false };
      }
    }

    setProductVariants(variantsData);
    setInitialVariantLoading(false);
  };

  // ✨ Extract variant attribute types from metadata
  const extractVariantAttributeTypes = (metadata: any[]): Record<string, string[]> => {
    const attributeTypes: Record<string, string[]> = {};

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

  // ✨ Handle variant attribute change for a specific product
  const handleProductVariantChange = async (productId: string, attributeKey: string, value: string) => {
    const productVariantData = productVariants[productId];
    if (!productVariantData || !productVariantData.hasVariants) return;

    setVariantLoading(prev => ({ ...prev, [productId]: true }));

    try {
      const newSelectedAttributes = {
        ...productVariantData.selectedAttributes,
        [attributeKey]: value
      };

      // Find matching variant
      const matchingVariant = productVariantData.variantMetadata?.find((v: any) => {
        if (!v.variantAttributes) return false;
        return Object.keys(newSelectedAttributes).every(key =>
          v.variantAttributes[key] === newSelectedAttributes[key]
        );
      });

      if (matchingVariant) {
        // Load full variant details if not cached
        let fullVariant = productVariantData.variantCache?.[matchingVariant._id];

        if (!fullVariant) {
          const response = await axiosInstance.get(
            `/product-details/${productVariantData.parentProduct._id}/variant/${matchingVariant._id}`
          );

          if (response.status === 200 && response.data.status) {
            fullVariant = response.data.data;

            // Process images
            if (Array.isArray(fullVariant.images)) {
              fullVariant.signedImages = fullVariant.images.map(
                (image: any) => `${AWS_CDN_URL}${image.key}`
              );
            }
          }
        }

        if (fullVariant) {
          // ✅ Extract stock from variant response
          const variantStock = fullVariant.stockId?.quantity ??
            fullVariant.stock ??
            fullVariant.currentStock ??
            0;

          console.log(`✅ Extracted stock for variant ${fullVariant._id}:`, variantStock);

          // ✅ Update fullVariant with normalized stock fields
          const variantWithStock = {
            ...fullVariant,
            stock: variantStock,
            currentStock: variantStock,
            available: variantStock > 0
          };

          // Update product variants state with stock in cache
          setProductVariants(prev => ({
            ...prev,
            [productId]: {
              ...prev[productId],
              selectedAttributes: newSelectedAttributes,
              selectedVariantId: matchingVariant._id,
              variantCache: {
                ...prev[productId].variantCache,
                [matchingVariant._id]: variantWithStock
              }
            }
          }));

          // Update bundle data with new variant and stock
          setBundleData(prev => ({
            ...prev,
            products: prev.products.map((p: any) => {
              const pId = p._id || p.productId;
              if (pId === productId) {
                return {
                  ...p,
                  ...variantWithStock,
                  _id: productId, // ✅ KEEP ORIGINAL ID for variant lookup
                  variantId: matchingVariant._id, // Store actual variant ID separately
                  isParentProduct: false,
                  // Preserve bundle-specific fields
                  quantity: p.quantity,
                  bundleQuantity: p.bundleQuantity
                };
              }
              return p;
            })
          }));

          // Toast.show({
          //   type: 'success',
          //   text1: 'Success',
          //   text2: `Variant updated (Stock: ${variantStock})`,
          // });
        }
      }
    } catch (error) {
      console.log('Failed to change variant:', error);
      // Toast.show({
      //   type: 'error',
      //   text1: 'Error',
      //   text2: 'Failed to update variant',
      // });
    } finally {
      setVariantLoading(prev => ({ ...prev, [productId]: false }));
    }
  };


  // Check if flash sale has expired and clear flash sale data
  useEffect(() => {
    if (!flashSaleData?.flashSaleEndTime) return;

    const endTime = new Date(flashSaleData.flashSaleEndTime).getTime();
    const hasExpired = localCurrentTime >= endTime;

    if (hasExpired && step === 1) {
      // Flash sale has expired, need to refetch bundle without flash sale pricing
      console.log('⚠️ Flash sale expired, refetching regular pricing');
      fetchBundleDetails();
    }
  }, [localCurrentTime, flashSaleData?.flashSaleEndTime, step, fetchBundleDetails]);

  const fetchAddresses = async () => {
    setAddressLoading(true);
    try {
      const response = await axiosInstance.get('user/addresses');
      const userAddresses = response.data.data || [];
      setAddresses(userAddresses);
      if (userAddresses.length > 0) {
        const defaultAddress =
          userAddresses.find((addr: any) => addr.isDefault) || userAddresses[0];
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setAddressLoading(false);
    }
  };

  const trackCheckoutEvent = async (
    eventStep: string,
    status = 'in_progress',
    abandonedAtStep: string | null = null
  ) => {
    if (!bundleId) return;
    try {
      await axiosInstance.post('checkout/track', {
        bundleId: bundleId,
        step: eventStep,
        status,
        abandonedAtStep,
      });
    } catch (error) {
      console.error('Failed to track checkout event:', error);
    }
  };

  const getMaxQuantity = () => {
    if (!bundleData) return 0;

    const possibleQuantityFields = [
      bundleData.bundleQuantity,
      bundleData.quantity,
      bundleData.stock,
      bundleData.availableStock,
      bundleData.bundleStock,
    ];

    for (const field of possibleQuantityFields) {
      if (field !== undefined && field !== null && field > 0) {
        return field;
      }
    }

    if (bundleData.products && bundleData.products.length > 0) {
      const stockValues = bundleData.products.map(
        (p: any) => p.stock || p.currentStock || p.quantity || 0
      );
      const minStock = Math.min(...stockValues);
      if (minStock === 0) return 100;
      return Math.max(0, minStock);
    }

    return 100;
  };

  const handleQuantityChange = useCallback((newQuantity: number) => {
    const maxQuantity = getMaxQuantity();
    const validQuantity = Math.max(1, Math.min(maxQuantity, newQuantity));
    setQuantity(validQuantity);
  }, [bundleData]);

  // Memoize callbacks to prevent child re-renders
  const handleSelectAddress = useCallback((address: any) => {
    setSelectedAddress(address);
  }, []);

  const handlePaymentMethodChange = useCallback((method: string) => {
    setSelectedPaymentMethod(method);
  }, []);
  // console.log(showId)

  const handleProceedToPayment = async () => {
    if (!selectedAddress) {
      Toast("Please select a delivery address.");
      return;
    }

    // ✅ NEW: Validate payment method selected
    if (!selectedPaymentMethod) {
      Toast("Please select a payment method.");
      return;
    }

    if (!bundleData?.allInStock) {
      Toast("Some products in this bundle are out of stock.");
      return;
    }

    const maxQuantity = getMaxQuantity();
    if (quantity > maxQuantity) {
      Toast(`Only ${maxQuantity} bundles available.`);
      return;
    }

    if (quantity < 1) {
      Toast("Quantity must be at least 1.");
      return;
    }

    // ✅ COMPREHENSIVE VARIANT VALIDATION - Check ALL attributes are selected
    const incompleteVariantProducts: string[] = [];
    const missingAttributesDetails: string[] = [];

    Object.keys(productVariants).forEach(productId => {
      const variantData = productVariants[productId];

      if (!variantData?.hasVariants) return;

      // Check if product has variant attributes that need to be selected
      const requiredAttributes = Object.keys(variantData.variantAttributes || {});
      const selectedAttributes = variantData.selectedAttributes || {};

      if (requiredAttributes.length > 0) {
        const missingAttributes: string[] = [];

        // Check each required attribute
        requiredAttributes.forEach(attrKey => {
          if (!selectedAttributes[attrKey]) {
            missingAttributes.push(attrKey.charAt(0).toUpperCase() + attrKey.slice(1));
          }
        });

        // If any attributes are missing, add to incomplete list
        if (missingAttributes.length > 0) {
          const product = bundleData?.products?.find(
            (p: any) => (p._id || p.productId).toString() === productId
          );
          const productName = product?.title || productId;
          incompleteVariantProducts.push(productName);
          missingAttributesDetails.push(`${productName}: Select ${missingAttributes.join(', ')}`);
        }
      }
    });

    // ❌ STOP if any variant attributes are incomplete
    if (incompleteVariantProducts.length > 0) {
      Toast(`Please complete variant selection:\n${missingAttributesDetails.join('\n')}`);
      setIsProcessing(false);
      return;
    }

    // Show loader immediately before any async operations
    setIsProcessing(true);

    // Track events in background (don't block UI)
    trackCheckoutEvent('address_selected');
    trackCheckoutEvent('payment_initiated');

    try {
      const productVariantMapping: Record<string, string> = {};
      const missingVariantProducts: string[] = [];

      /**
       * ✅ SOURCE OF TRUTH = productVariants
       * Same logic as WEB
       */
      Object.keys(productVariants).forEach(productId => {
        const variantData = productVariants[productId];

        if (!variantData?.hasVariants) return;

        // For parent products or products with variants, check selectedVariantId
        if (variantData.isParentProduct || variantData.hasVariants) {
          if (variantData.selectedVariantId) {
            productVariantMapping[productId] =
              variantData.selectedVariantId.toString();
          } else {
            const product = bundleData?.products?.find(
              (p: any) =>
                (p._id || p.productId).toString() === productId
            );
            missingVariantProducts.push(product?.title || productId);
          }
        }
      });

      /**
       * ❌ STOP if any variant is missing (no matching variant found)
       */
      if (missingVariantProducts.length > 0) {
        Toast(
          `No matching variant found for: ${missingVariantProducts.join(', ')}. Please select valid combinations.`
        );
        setIsProcessing(false);
        return;
      }

      let apiEndpoint: string;
      let orderPayload: any;

      if (flashSaleData?.flashSaleId && showId) {
        apiEndpoint = 'user/bundle-flash-sale/purchase';
        orderPayload = {
          showId,
          flashSaleId: flashSaleData.flashSaleId,
          addressId: selectedAddress._id,
          paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
          quantity,
          // shipmentMethod,
          // deliveryCharge,
          ...(Object.keys(productVariantMapping).length > 0 && {
            productVariantMapping,
          }),
        };
      } else {
        apiEndpoint = 'user/bundle-sale/purchase';
        orderPayload = {
          bundleId,
          showId,
          addressId: selectedAddress._id,
          paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
          courierStrategy: 'recommended',
          quantity,
          // shipmentMethod,
          // deliveryCharge,
          ...(Object.keys(productVariantMapping).length > 0 && {
            productVariantMapping,
          }),
        };
      }

      const response = await axiosInstance.post(apiEndpoint, orderPayload);

      // ✅ Handle both Razorpay and Wallet responses
      if (selectedPaymentMethod === 'WALLET') {
        // Wallet payment - order already paid
        setOrderId(response.data.data.orderId || response.data.data.order._id);
        setPaymentMethod('WALLET');
        setStep(2);
        Toast("Processing wallet payment...");
      } else if (response.data?.data?.payment?.rzpOrderId) {
        // Razorpay payment - needs payment gateway
        const { orderId, payment } = response.data.data;

        setPaymentData({
          orderId: payment.rzpOrderId,
          keyId: payment.paymentKeyId,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          gateway: payment.paymentGateway,
        });

        setOrderId(orderId);
        setPaymentMethod('RAZORPAY');
        setStep(2);
      } else {
        throw new Error('Payment order ID not received');
      }
    } catch (error: any) {
      console.log('Bundle order failed:', error);
      Toast(
        error?.response?.data?.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };


  const handleClose = () => {
    if (hasTrackedStart.current && !checkoutCompleted) {
      let abandonedStep = 'checkout_opened';
      if (step === 2) abandonedStep = 'payment_initiated';
      trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
    }
    onClose();
  };

  const handlePaymentSuccess = () => {
    setCheckoutCompleted(true);
    trackCheckoutEvent('payment_completed', 'completed');
    setStep(3);
  };

  const handleAddAddress = () => {
    setAddressMode('add');
    setEditingAddress(null);
  };

  const handleEditAddress = (address: any) => {
    setAddressMode('edit');
    setEditingAddress(address);
  };

  const handleSaveAddress = async (addressData: any) => {
    try {
      let response;
      if (addressMode === 'add') {
        response = await axiosInstance.post('user/addresses', addressData);
        setAddresses((prev) => [...(prev || []), response.data.data]);
      } else {
        response = await axiosInstance.put(`user/addresses/${editingAddress._id}`, addressData);
        setAddresses((prev) =>
          prev.map((addr) => (addr._id === editingAddress._id ? response.data.data : addr))
        );
      }

      setSelectedAddress(response.data.data);
      setAddressMode('select');
      Toast('Address saved!');
    } catch (error: any) {
      console.error('Failed to save address:', error);
      Toast(error.response?.data?.message || 'Failed to save address');
    }
  };

  const handleBackClick = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 1 && addressMode !== 'select') {
      setAddressMode('select');
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return addressMode === 'select' ? 'Review Bundle Order' : 'Manage Address';
      case 2:
        return 'Complete Payment';
      case 3:
        return 'Order Confirmed';
      default:
        return 'Bundle Checkout';
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        if (addressMode !== 'select') {
          return (
            <View style={styles.addressFormWrapper}>
              <AddressForm
                address={editingAddress}
                onSave={handleSaveAddress}
                onCancel={() => setAddressMode('select')}
                customColor="#1e1e1e"
              />
            </View>
          );
        }
        // Memoize maxQuantity to prevent recalculation on every render
        const maxQty = getMaxQuantity();
        return (
          <Step1_BundleOrderReview
            bundleData={bundleData}
            addresses={addresses}
            selectedAddress={selectedAddress}
            loading={addressLoading}
            onSelectAddress={handleSelectAddress}
            onAddNewAddress={handleAddAddress}
            onEditAddress={handleEditAddress}
            onNext={handleProceedToPayment}
            isProcessing={isProcessing}
            quantity={quantity}
            onQuantityChange={handleQuantityChange}
            maxQuantity={maxQty}
            flashSaleData={flashSaleData}
            currentTime={localCurrentTime}
            productVariants={productVariants}
            variantLoading={variantLoading}
            onProductVariantChange={handleProductVariantChange}
            CDN_BASE_URL={AWS_CDN_URL}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            isOwner={isOwner}
            onClose={handleClose}
          />
        );
      case 2:
        let bundleImageUrl = '/placeholder.jpg';

        if (bundleData?.bundleImage?.url) {
          bundleImageUrl = bundleData.bundleImage.url;
        } else if (bundleData?.bundleImage?.key) {
          bundleImageUrl = `${AWS_CDN_URL}${bundleData.bundleImage.key}`;
        }

        // ✅ Show wallet or Razorpay based on selected method
        if (paymentMethod === 'WALLET' || selectedPaymentMethod === 'WALLET') {
          // Calculate total amount for bundle
          const bundleTotal = bundleData?.totalPrice ?
            bundleData.totalPrice * quantity :
            (bundleData?.products?.reduce((sum: number, p: any) => sum + (p.productPrice || p.price || 0), 0)) * quantity;

          return (
            <WalletPayment
              amount={Math.round(bundleTotal * 100)} // Convert to paise
              orderId={orderId || ''}
              orderDetails={{
                bundleId: bundleId,
                quantity: quantity,
                addressId: selectedAddress?._id,
              }}
              productTitle={bundleData?.title || 'Bundle Order'}
              productImage={bundleImageUrl}
              userName={user?.name}
              onSuccess={handlePaymentSuccess}
              onFailure={(error: any) => {
                console.error('Wallet payment failed:', error);
                Toast(error.message || "Wallet payment failed");
                setStep(1); // ✅ Go back to Step 1
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
            productTitle={bundleData?.title}
            productImage={bundleImageUrl}
            userPhone={user?.mobile}
            userName={user?.name}
            onSuccess={handlePaymentSuccess}
            onFailure={(error: any) => {
              console.log('Payment failed:', error);
              Toast(error.message || "Payment failed");
              setStep(1); // ✅ Go back to Step 1
            }}
            flashSaleData={flashSaleData}
            bundleData={bundleData}
            quantity={quantity}
          />
        );
      case 3:
        return (
          <OrderConfirmation
            orderId={orderId}
            onDone={handleClose}
            onTrackOrder={() => {
              // Navigate to order tracking
              (navigation.navigate as any)("bottomtabbar", {
                screen: 'HomeTabs',
                params: { screen: 'myactivity' }
              });
              handleClose();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          onTouchEnd={handleClose}
        />

        {/* Slider */}
        <Animated.View
          style={[
            styles.sliderContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#f7ce45', '#fbbf24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            {(step === 2 || (step === 1 && addressMode !== 'select')) && (
              <TouchableOpacity onPress={handleBackClick} style={styles.backButton}>
                <Icon name="arrow-left" size={24} color="#000000" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{getStepTitle()}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Progress Indicator */}
          {step !== 3 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressSteps}>
                {/* Step 1 */}
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressCircle,
                      step >= 1 && styles.progressCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        step >= 1 && styles.progressCircleTextActive,
                      ]}
                    >
                      1
                    </Text>
                  </View>
                  <Text style={styles.progressLabel}>Review</Text>
                </View>

                {/* Line 1 */}
                <View
                  style={[styles.progressLine, step >= 2 && styles.progressLineActive]}
                />

                {/* Step 2 */}
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressCircle,
                      step >= 2 && styles.progressCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        step >= 2 && styles.progressCircleTextActive,
                      ]}
                    >
                      2
                    </Text>
                  </View>
                  <Text style={styles.progressLabel}>Payment</Text>
                </View>

                {/* Line 2 */}
                <View
                  style={[styles.progressLine, step >= 3 && styles.progressLineActive]}
                />

                {/* Step 3 */}
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressCircle,
                      step >= 3 && styles.progressCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressCircleText,
                        step >= 3 && styles.progressCircleTextActive,
                      ]}
                    >
                      3
                    </Text>
                  </View>
                  <Text style={styles.progressLabel}>Confirm</Text>
                </View>
              </View>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Initial Variant Loading Banner */}
            {initialVariantLoading && (
              <View style={styles.variantLoadingBanner}>
                <ActivityIndicator size="small" color="#f7ce45" />
                <Text style={styles.variantLoadingBannerText}>Loading variants...</Text>
              </View>
            )}
            {renderStep()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sliderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.8,   //0.7,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 114, 128, 0.5)',
    borderTopEndRadius: 20,
    borderTopStartRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  progressContainer: {
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressCircleActive: {
    backgroundColor: '#f7ce45',
  },
  progressCircleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  progressCircleTextActive: {
    color: '#000000',
  },
  progressLabel: {
    fontSize: 10,
    color: '#d1d5db',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#4b5563',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#f7ce45',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  stepContent: {
    flex: 1,
    width: '100%',
  },
  bundleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  quantityContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: 40,
    textAlign: 'center',
  },
  addressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 4,
  },
  noAddressText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  proceedButtonWrapper: {
    marginTop: 24,
  },
  proceedButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButtonWrapper: {
    width: '100%',
    maxWidth: 200,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addressFormWrapper: {
    flex: 1,
    minHeight: 500,
    paddingBottom: 50,
  },
  variantLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  variantLoadingBannerText: {
    fontSize: 13,
    color: '#f7ce45',
    fontWeight: '500',
  },
});

export default BundleCheckoutSlider;
