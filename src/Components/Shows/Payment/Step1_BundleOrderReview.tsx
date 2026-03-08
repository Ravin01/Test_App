import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '../../../Utils/Api';
import { AWS_CDN_URL } from '../../../../Config';
import { getWalletBalance } from '../../../Services/walletService';
import axiosCourier from '../../../Utils/axiosCourier';

interface Address {
  _id: string;
  addressType: string;
  name: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  isDefault?: boolean;
}

interface Product {
  _id: string;
  productId?: string;
  title: string;
  productPrice: number;
  MRP: number;
  stock?: number;
  currentStock?: number;
  available?: boolean;
  images?: Array<{ url?: string; key?: string }>;
  quantity?: number;
  weight?: { value?: number };
  seller?: {
    shippingInfo?: {
      preferredShipping?: string;
    };
  };
  // Variant-related fields
  childVariantIds?: string[];
  isParentProduct?: boolean;
  parentProductId?: string;
  isVariant?: boolean;
  variantAttributes?: Record<string, string>;
}

interface BundleData {
  _id: string;
  title: string;
  description?: string;
  sellingPrice: number;
  bundleMRP: number;
  bundleImage?: { url?: string; key?: string };
  products?: Product[];
  allInStock?: boolean;
  deliveryCharge?: number;
  estimatedDeliveryDate?: string;
  bundleQuantity?: number;
  discount?: { amount?: number; percentage?: number };
}

// Variant-related interfaces
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

interface Step1Props {
  bundleData: BundleData | null;
  addresses: Address[];
  selectedAddress: Address | null;
  loading: boolean;
  onSelectAddress: (address: Address) => void;
  onAddNewAddress: () => void;
  onEditAddress: (address: Address) => void;
  onNext: () => void;
  isProcessing: boolean;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  flashSaleData?: {
    flashSaleId?: string;
    flashPrice?: number;
    bundlePrice?: number;
    originalPrice?: number;
    flashSaleEndTime?: string;
    endTime?: string;
  } | null;
  currentTime?: number;
  // Variant-related props
  productVariants?: ProductVariantsState;
  variantLoading?: Record<string, boolean>;
  onProductVariantChange?: (productId: string, attributeKey: string, value: string) => void;
  CDN_BASE_URL?: string;
  isOwner?: boolean;
  // Payment method props
  selectedPaymentMethod   //?: string;  //'WALLET' | 'RAZORPAY';
  onPaymentMethodChange   //?: (method: 'WALLET' | 'RAZORPAY') => void;
  onClose?: () => void;  // For modal support
}

const AddressIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconName =
    type?.toLowerCase() === 'home'
      ? 'home'
      : type?.toLowerCase() === 'work'
      ? 'briefcase'
      : 'map-marker';

  return <Icon name={iconName} size={20} color="rgba(250,250,250,.62)" />;
};

const Step1_BundleOrderReview: React.FC<Step1Props> = ({
  bundleData,
  addresses,
  selectedAddress,
  loading,
  onSelectAddress,
  onAddNewAddress,
  onEditAddress,
  onNext,
  isProcessing,
  quantity,
  onQuantityChange,
  maxQuantity,
  flashSaleData = null,
  currentTime = Date.now(),
  productVariants = {},
  variantLoading = {},
  onProductVariantChange,
  CDN_BASE_URL: _CDN_BASE_URL = '',
  isOwner = false,
  selectedPaymentMethod,
  onPaymentMethodChange,
  onClose,
}) => {
  const [isAddressListOpen, setAddressListOpen] = useState(false);
  const [sellerPincode, setSellerPincode] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [_recommendedOption, setRecommendedOption] = useState<any>(null);
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime);
  const isMountedRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lastCalculatedPincodeRef = useRef<string | null>(null);
  const lastCalculatedQuantityRef = useRef<number | null>(null);
  const isCalculatingRef = useRef(false);
  
  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  
  const navigation = useNavigation();
  
  // Handle navigation to wallet page
  const handleAddMoney = useCallback(() => {
    // Close modal if provided
    if (onClose) {
      onClose();
    }
    navigation.navigate('WalletPage' as never);
  }, [navigation, onClose]);

  // Get bundle image
  let bundleImageUrl = '/placeholder.png';
  if (bundleData?.bundleImage?.url) {
    bundleImageUrl = bundleData.bundleImage.url;
  } else if (bundleData?.bundleImage?.key) {
    bundleImageUrl = `${AWS_CDN_URL}${bundleData.bundleImage.key}`;
  }

  // Use flash sale pricing if available
  const isFlashSale = !!flashSaleData;
  const effectivePrice = isFlashSale
    ? flashSaleData?.flashPrice ||
      flashSaleData?.bundlePrice ||
      bundleData?.sellingPrice ||
      0
    : bundleData?.sellingPrice || 0;
  const effectiveMRP = isFlashSale
    ? flashSaleData?.originalPrice || bundleData?.bundleMRP
    : bundleData?.bundleMRP;

  // Fetch seller pincode
  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!bundleData?._id) return;
      try {
     
                const firstProduct = bundleData.products?.[0];
                const firstProductId = firstProduct?._id || firstProduct?.productId?._id || firstProduct?.productId;
                console.log("product Id",firstProductId,firstProduct)
        if (!firstProductId) return;

        const response = await axiosInstance.get(
          `courier/seller-pincode/${firstProductId}`
        );
        if (response.data.status) {
          console.log("seller pincode===",response.data.pincode)
          setSellerPincode(response.data.pincode);
        }
      } catch (error) {
        console.error('Failed to fetch seller pincode:', error);
      }
    };
    fetchSellerPincode();
  }, [bundleData?._id]);

  // Calculate delivery charges based on shipping method
  useEffect(() => {
    const currentPincode = selectedAddress?.pincode;
    const bundleId = bundleData?._id;
    
    // Skip if already calculating or conditions not changed
    if (isCalculatingRef.current) {
      console.log('⏸️ Delivery calculation already in progress, skipping');
      return;
    }
    
    // Check if we should recalculate
    const shouldRecalculate = 
      currentPincode && 
      bundleId && 
      (currentPincode !== lastCalculatedPincodeRef.current || 
       quantity !== lastCalculatedQuantityRef.current);
    
    if (!shouldRecalculate) {
      console.log('⏸️ Delivery calculation conditions not changed:', {
        currentPincode,
        lastPincode: lastCalculatedPincodeRef.current,
        currentQuantity: quantity,
        lastQuantity: lastCalculatedQuantityRef.current
      });
      return;
    }

    console.log('🔄 Delivery calculation useEffect triggered', {
      sellerPincode,
      selectedPincode: currentPincode,
      hasBundle: !!bundleData,
      mounted: isMountedRef.current,
      quantity
    });

    const calculateDeliveryCharges = async () => {
      if (!currentPincode || !isMountedRef.current || !bundleData) {
        console.log('⏸️ Delivery calculation skipped:', {
          sellerPincode: !!sellerPincode,
          sellerPincodeValue: sellerPincode,
          selectedPincode: !!currentPincode,
          selectedPincodeValue: currentPincode,
          mounted: isMountedRef.current,
          hasBundle: !!bundleData
        });
        return;
      }

      // Mark calculation as started and update refs
      isCalculatingRef.current = true;
      lastCalculatedPincodeRef.current = currentPincode;
      lastCalculatedQuantityRef.current = quantity;
      
      setCalculatingDelivery(true);
      setRecommendedOption(null);
      setDeliveryCharge(null);

      // ✅ BACKWARD COMPATIBILITY: Check new field first, fallback to old field
      let bundleShippingMethod = (bundleData as any).shippingMethod;

      // If new field doesn't exist, map old logisticsType to new values
      if (!bundleShippingMethod && (bundleData as any).logisticsType) {
        bundleShippingMethod = (bundleData as any).logisticsType === 'selfShipment'
          ? 'self_shipment'
          : 'flykup_logistics';
      }

      // Default to flykup_logistics if neither field exists
      bundleShippingMethod = bundleShippingMethod || 'flykup_logistics';

      const requiresSelfShipment = bundleShippingMethod === 'self_shipment';

      console.log('🚚 Bundle shipment determination:', {
        hasNewField: !!(bundleData as any).shippingMethod,
        hasOldField: !!(bundleData as any).logisticsType,
        oldValue: (bundleData as any).logisticsType,
        bundleShippingMethod,
        requiresSelfShipment,
        decision: requiresSelfShipment ? 'SELF SHIPMENT' : 'FLYKUP LOGISTICS'
      });

      // If self-shipment, use bundle's delivery info (no API call)
      if (requiresSelfShipment) {
        console.log('📦 Bundle uses self-shipment, skipping API call');
        const fallbackOption = {
          charge: bundleData.deliveryCharge || 40,
          estimated_days: bundleData.estimatedDeliveryDate || 7,
          isSelfShipment: true,
          message: "This bundle will be shipped directly by the seller.",
        };
        setRecommendedOption(fallbackOption);
        setDeliveryCharge(fallbackOption.charge);
        setCalculatingDelivery(false);
        isCalculatingRef.current = false; // ✅ Reset ref on early exit
        return; // ✅ EARLY EXIT - No courier API call
      }

      // If Flykup logistics, need seller pincode for API call
      // ✅ CRITICAL: Don't update lastCalculatedPincodeRef - wait for sellerPincode to be fetched
      if (!sellerPincode) {
        console.log('⚠️ Flykup logistics selected but seller pincode not yet fetched - waiting...');
        setCalculatingDelivery(false);
        isCalculatingRef.current = false;
        // Reset lastCalculatedPincodeRef so we retry when sellerPincode arrives
        lastCalculatedPincodeRef.current = null;
        return;
      }

      console.log('🚀 Starting delivery calculation for bundle with Flykup logistics...');

      try {
        // Calculate total weight of all products in bundle
        let totalWeightInGrams = 0;
        let productWeightDetails: any[] = [];

        bundleData.products?.forEach((product, index) => {
          // Try multiple weight field locations
          const productWeight = product.weight?.value ||
            (product as any).weight ||
            (product as any).productWeight?.value ||
            (product as any).productWeight ||
            100; // Default 100g if no weight found

          const productQuantity = product.quantity || (product as any).bundleQuantity || 1;
          const itemWeight = productWeight * productQuantity;
          totalWeightInGrams += itemWeight;

          productWeightDetails.push({
            index,
            title: product.title || (product as any).name,
            weight: productWeight,
            quantity: productQuantity,
            total: itemWeight
          });
        });

        const totalWeightInKg = (totalWeightInGrams / 1000) * quantity;

        // Calculate bundle total value
        const bundleTotalValue = effectivePrice * quantity;

        console.log('📦 Bundle delivery calculation params:', {
          seller_pincode: sellerPincode,
          customer_pincode: selectedAddress.pincode,
          product_weight: totalWeightInKg,
          order_value: bundleTotalValue,
          quantity,
          productWeightDetails,
          totalWeightInGrams
        });

        const response = await axiosCourier.post('/business/calculate-delivery', {
          seller_pincode: sellerPincode,
          customer_pincode: selectedAddress.pincode,
          product_weight: totalWeightInKg,
          weight_unit: 'kg',
          order_value: bundleTotalValue,
          payment_mode: 'prepaid',
          order_date: new Date().toISOString().split('T')[0]
        });

        console.log('✅ Delivery API response:', response.data);

        // Case 1: Courier service is available
        if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
          const recommended = response.data.data.recommended_courier;
          const option = {
            charge: recommended.delivery_charges,
            estimated_days: recommended.estimated_days,
            isSelfShipment: false,
          };
          console.log('✅ Courier available:', option);
          setRecommendedOption(option);
          setDeliveryCharge(option.charge);
        }
        // Case 2: Courier unavailable -> Fallback to self-shipment
        else if (isMountedRef.current && bundleData.deliveryCharge != null && bundleData.estimatedDeliveryDate != null) {
          console.log("⚠️ Courier not available for bundle, falling back to self-shipment.");
          const fallbackOption = {
            charge: bundleData.deliveryCharge,
            estimated_days: bundleData.estimatedDeliveryDate,
            isSelfShipment: true,
            message: "",
          };
          setRecommendedOption(fallbackOption);
          setDeliveryCharge(bundleData.deliveryCharge);
        } else if (isMountedRef.current) {
          // Fallback with default values
          const fallbackCharge = bundleData.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            estimated_days: bundleData.estimatedDeliveryDate || 7,
            isSelfShipment: true,
            message: "This bundle will be shipped directly by the seller.",
          };
          setRecommendedOption(fallbackOption);
          setDeliveryCharge(fallbackCharge);
        }
      } catch (error) {
        console.error('❌ Failed to calculate delivery charges for bundle:', error);

        // On API error, try fallback to self shipment
        if (isMountedRef.current && bundleData.deliveryCharge != null && bundleData.estimatedDeliveryDate != null) {
          const fallbackOption = {
            charge: bundleData.deliveryCharge,
            estimated_days: bundleData.estimatedDeliveryDate,
            isSelfShipment: true,
            message: "This bundle will be shipped directly by the seller.",
          };
          setRecommendedOption(fallbackOption);
          setDeliveryCharge(bundleData.deliveryCharge);
        } else if (isMountedRef.current) {
          const fallbackCharge = bundleData.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            estimated_days: bundleData.estimatedDeliveryDate || 7,
            isSelfShipment: true,
            message: "This bundle will be shipped directly by the seller.",
          };
          setRecommendedOption(fallbackOption);
          setDeliveryCharge(fallbackCharge);
        }
      } finally {
        if (isMountedRef.current) {
          setCalculatingDelivery(false);
        }
        isCalculatingRef.current = false;
        console.log('✅ Delivery calculation complete');
      }
    };

    if (isMountedRef.current && currentPincode && bundleData) {
      console.log('🚀 Triggering delivery calculation with:', {
        sellerPincode,
        customerPincode: currentPincode,
        quantity,
        effectivePrice,
        bundleId: bundleData._id,
        logisticsType: (bundleData as any).logisticsType
      });
      calculateDeliveryCharges();
    } else {
      console.log('⏸️ Delivery calculation conditions not met:', {
        mounted: isMountedRef.current,
        hasSellerPincode: !!sellerPincode,
        sellerPincodeValue: sellerPincode,
        hasCustomerPincode: !!currentPincode,
        customerPincodeValue: currentPincode,
        hasBundleData: !!bundleData,
        bundleId: bundleData?._id
      });
    }
  // Only depend on specific values that should trigger recalculation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerPincode, selectedAddress?.pincode, quantity, bundleData?._id]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync currentTime prop with local state for re-renders
  useEffect(() => {
    setLocalCurrentTime(currentTime);
  }, [currentTime]);

  // Fetch wallet balance on mount
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const data = await getWalletBalance();
        setWalletBalance(data.availableBalance || data.balance || 0);
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error);
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    };
    fetchWallet();
  }, []);

  // Animate address list - should be visible when open OR when there's no selected address
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isAddressListOpen || !selectedAddress ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isAddressListOpen, selectedAddress, fadeAnim]);

  if (!bundleData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7ce45" />
      </View>
    );
  }

  // Calculate totals
  const finalDeliveryCharge =
    deliveryCharge !== null ? deliveryCharge : bundleData.deliveryCharge || 0;
  const totalAmount = (effectivePrice || 0) * quantity + finalDeliveryCharge;

  const savingsAmount =
    effectiveMRP && effectivePrice < effectiveMRP
      ? (effectiveMRP - effectivePrice) * quantity
      : (bundleData.discount?.amount || 0) * quantity;
  const savingsPercentage =
    effectiveMRP && effectivePrice < effectiveMRP
      ? Math.round(((effectiveMRP - effectivePrice) / effectiveMRP) * 100)
      : bundleData.discount?.percentage || 0;
// console.log(currentTime)
  // Calculate flash sale time remaining
  const calculateTimeLeft = (endTime?: string) => {
    if (!endTime) return 0;
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.ceil((end - localCurrentTime) / 1000));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const flashSaleEndTime = flashSaleData?.endTime || flashSaleData?.flashSaleEndTime;
  const timeLeft = isFlashSale ? calculateTimeLeft(flashSaleEndTime) : 0;
  const hasExpired = isFlashSale && timeLeft <= 0;

  const handleSelectAndClose = (address: Address) => {
    onSelectAddress(address);
    setAddressListOpen(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Flash Sale Timer Banner */}
      {isFlashSale && !hasExpired && (
        <View style={styles.flashSaleBanner}>
          <LinearGradient
            colors={['#dc2626', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.flashSaleBannerGradient}
          >
            <View style={styles.flashSaleBannerContent}>
              <Text style={styles.flashSaleBannerText}>🔥 Flash Sale Active</Text>
              <View style={styles.flashSaleTimer}>
                <Text style={styles.flashSaleTimerText}>{formatTime(timeLeft)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Flash Sale Expired Warning */}
      {isFlashSale && hasExpired && (
        <View style={styles.expiredWarning}>
          <Text style={styles.expiredWarningText}>
            ⚠️ Flash sale has ended. Regular pricing applies.
          </Text>
        </View>
      )}

      {/* Owner Warning Banner */}
      {isOwner && (
        <View style={styles.ownerWarningBanner}>
          <View style={styles.ownerWarningContent}>
            <Icon name="alert-circle" size={20} color="#f59e0b" />
            <View style={styles.ownerWarningTextContainer}>
              <Text style={styles.ownerWarningTitle}>Your Own Bundle</Text>
              <Text style={styles.ownerWarningText}>
                You cannot purchase your own bundle. This bundle belongs to you.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bundle Overview */}
      <Text style={[styles.sectionTitle, { marginLeft: 10 }]}>
          {isFlashSale ? '🔥 Flash Sale Bundle' : 'Bundle Details'}
        </Text>
      <View style={[styles.section,{ backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151'}]}>
        
        <View style={styles.bundleOverview}>
          <Image
            source={{ uri: bundleImageUrl }}
            style={styles.bundleImage}
            resizeMode="cover"
          />
          <View style={styles.bundleInfo}>
            <Text style={styles.bundleTitle}>{bundleData.title}</Text>
            {bundleData.description && (
              <Text style={styles.bundleDescription} numberOfLines={2}>
                {bundleData.description}
              </Text>
            )}
            <View style={styles.productsCount}>
              <Icon name="package-variant" size={16} color="#f7ce45" />
              <Text style={styles.productsCountText}>
                {bundleData.products?.length || 0} Products Included
              </Text>
            </View>
            <View style={styles.priceContainer}>
              {effectiveMRP && effectivePrice < effectiveMRP && (
                <Text style={styles.originalPrice}>₹{effectiveMRP}</Text>
              )}
              <Text
                style={[
                  styles.currentPrice,
                  isFlashSale && styles.flashSalePrice,
                ]}
              >
                ₹{effectivePrice}
              </Text>
              {quantity > 1 && (
                <Text style={styles.perItemText}>per item</Text>
              )}
            </View>
           
          </View>
        </View>
         {savingsAmount > 0 && (
              <View style={styles.savingsContainer}>
                <View
                  style={[
                    styles.savingsBadge,
                    isFlashSale ? styles.flashSavingsBadge : styles.normalSavingsBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.savingsText,
                      isFlashSale ? styles.flashSavingsText : styles.normalSavingsText,
                    ]}
                  >
                    {isFlashSale ? '🔥 ' : ''}Save ₹{savingsAmount} ({savingsPercentage}% OFF)
                  </Text>
                </View>
                {quantity > 1 && (
                  <View style={styles.totalPriceContainer}>
                    <Text style={styles.totalPriceLabel}>Total: </Text>
                    <Text
                      style={[
                        styles.totalPriceValue,
                        isFlashSale && styles.flashSalePrice,
                      ]}
                    >
                      ₹{effectivePrice * quantity}
                    </Text>
                  </View>
                )}
              </View>
            )}
      </View>

      {/* Quantity Selector */}
      <View style={styles.section}>
        <View style={styles.quantityHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <Text style={styles.stockText}>
              {maxQuantity > 0 ? `${maxQuantity} bundles available` : 'Checking stock...'}
            </Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              style={[
                styles.quantityButton,
                quantity <= 1 && styles.quantityButtonDisabled,
              ]}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              onPress={() => onQuantityChange(quantity + 1)}
              disabled={maxQuantity <= 1 || quantity >= maxQuantity}
              style={[
                styles.quantityButton,
                styles.quantityButtonPlus,
                (maxQuantity <= 1 || quantity >= maxQuantity) &&
                  styles.quantityButtonDisabled,
              ]}
            >
              <Text style={[styles.quantityButtonText, styles.quantityButtonTextPlus]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {quantity >= maxQuantity && maxQuantity > 1 && (
          <View style={styles.maxQuantityWarning}>
            <Text style={styles.maxQuantityWarningText}>
              ⚠️ Maximum available quantity reached
            </Text>
          </View>
        )}
      </View>

      {/* Products List - Fixed Height with Nested Scroll */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Products in Bundle</Text>
        <ScrollView 
          style={styles.productsNestedScroll}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {bundleData.products?.map((product, index) => {
            const productId = product._id || product.productId;
            let productImageUrl = '/placeholder.png';
            if (product.images?.[0]?.url) {
              productImageUrl = product.images[0].url;
            } else if (product.images?.[0]?.key) {
              productImageUrl = `${AWS_CDN_URL}${product.images[0].key}`;
            }

            // Get variant data for this product
            const variantData = productVariants[productId];
            const hasVariants = variantData?.hasVariants || false;
            const isLoadingVariant = variantLoading[productId] || false;
            
            // ✅ IMPROVED: Enhanced stock handling for variants (like web version)
            let productStock = 0;
            let isInStock = false;
            let stockMessage = '';
            
            // Check if this is a parent product (has child variants)
            const isParentProduct = (product.childVariantIds && product.childVariantIds.length > 0) || 
                                  (product.isParentProduct === true) ||
                                  (variantData?.isParentProduct === true);
            
            // If product has variants loaded and a variant is selected, show that variant's stock
            if (hasVariants && variantData?.selectedVariantId) {
              const selectedVariant = variantData.variantCache?.[variantData.selectedVariantId];
              productStock = selectedVariant?.stock ?? selectedVariant?.currentStock ?? 0;
              isInStock = product.available !== false && productStock > 0;
            } 
            // If it's a parent product without selected variant
            else if (isParentProduct && hasVariants) {
              productStock = product.stock ?? product.currentStock ?? 0;
              isInStock = productStock > 0;
              stockMessage = 'Select variant';
            }
            // Regular product without variants
            else {
              productStock = product.stock ?? product.currentStock ?? 0;
              isInStock = product.available !== false && productStock > 0;
            }

            // Note: needsVariantSelection can be used for additional logic if needed
            // const needsVariantSelection = hasVariants && isParentProduct && !variantData?.selectedVariantId;

            return (
              <View key={productId} style={styles.productListItem}>
                {/* Product Header Row */}
                <View style={styles.productListHeader}>
                  <Text style={styles.productListIndex}>{index + 1}.</Text>
                  <Image
                    source={{ uri: productImageUrl }}
                    style={styles.productListImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productListInfo}>
                    <Text style={styles.productListTitle} numberOfLines={2}>{product.title}</Text>
                    <View style={styles.productListPriceRow}>
                      <Text style={styles.productListMRP}>₹{product.MRP}</Text>
                      <Text style={styles.productListPrice}>₹{product.productPrice}</Text>
                    </View>
                  </View>
                  <View style={styles.productListStockContainer}>
                    {isInStock ? (
                      <View style={styles.productListStockInfo}>
                        <Text style={styles.productListStockText}>
                          {productStock > 10 ? '✓ In Stock' : `✓ ${productStock} left`}
                        </Text>
                        {stockMessage ? (
                          <Text style={styles.productListStockMessage}>{stockMessage}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.productListOutOfStock}>✗ Out of Stock</Text>
                    )}
                  </View>
                </View>

                {/* Variant Loading Overlay */}
                {isLoadingVariant && (
                  <View style={styles.productListLoadingOverlay}>
                    <ActivityIndicator size="small" color="#f7ce45" />
                    <Text style={styles.productListLoadingText}>Updating variant...</Text>
                  </View>
                )}

                {/* ✨ VARIANT SELECTION UI - ALWAYS VISIBLE WHEN PRODUCT HAS VARIANTS */}
                {hasVariants && variantData && Object.keys(variantData.variantAttributes || {}).length > 0 && (
                  <View style={styles.variantSectionContainer}>
                    {/* Info header - always show */}
                    <View style={[
                      styles.variantInfoHeader,
                      !variantData.selectedVariantId 
                        ? styles.variantInfoHeaderWarning 
                        : styles.variantInfoHeaderSuccess
                    ]}>
                      <Text style={[
                        styles.variantInfoText,
                        !variantData.selectedVariantId 
                          ? styles.variantInfoTextWarning 
                          : styles.variantInfoTextSuccess
                      ]}>
                        {!variantData.selectedVariantId 
                          ? '⚠️ Please select variant options below'
                          : '✓ Variant selected. You can change it anytime below.'}
                      </Text>
                    </View>

                    {/* Variant Attributes */}
                    {Object.entries(variantData.variantAttributes || {}).map(([attributeKey, availableValues]) => {
                      const selectedValue = variantData.selectedAttributes?.[attributeKey];
                      const attributeLabel = attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1);
                      
                      // Special rendering for color attribute
                      if (attributeKey === 'color') {
                        return (
                          <View key={attributeKey} style={styles.variantAttributeRow}>
                            <View style={styles.variantAttributeLabelRow}>
                              <Text style={styles.variantAttributeLabel}>{attributeLabel}:</Text>
                              <Text style={styles.variantAttributeValue}>{selectedValue || 'None'}</Text>
                            </View>
                            <ScrollView 
                              horizontal 
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.variantColorOptionsScroll}
                            >
                              {(availableValues as string[]).map((value) => {
                                const colorMetadata = variantData.variantMetadata?.find((v: any) =>
                                  v.variantAttributes?.color === value
                                );
                                const isSelected = selectedValue === value;
                                const thumbnailUrl = colorMetadata?.thumbnailImage 
                                  ? `${AWS_CDN_URL}${colorMetadata.thumbnailImage}` 
                                  : null;
                                
                                // Get color code for fallback
                                const getColorCode = (colorName: string) => {
                                  const colors: Record<string, string> = {
                                    red: '#ef4444', blue: '#3b82f6', green: '#10b981',
                                    yellow: '#eab308', black: '#000000', white: '#ffffff',
                                    pink: '#ec4899', purple: '#8b5cf6', orange: '#f97316',
                                    gray: '#6b7280', grey: '#6b7280', brown: '#92400e',
                                  };
                                  return colors[colorName.toLowerCase()] || '#6b7280';
                                };

                                return (
                                  <TouchableOpacity
                                    key={value}
                                    onPress={() => onProductVariantChange?.(productId, attributeKey, value)}
                                    disabled={isLoadingVariant}
                                    style={[
                                      styles.colorOption,
                                      isSelected && styles.colorOptionSelected,
                                      isLoadingVariant && styles.variantOptionDisabled,
                                    ]}
                                  >
                                    {thumbnailUrl ? (
                                      <Image
                                        source={{ uri: thumbnailUrl }}
                                        style={styles.colorOptionImage}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <View 
                                        style={[
                                          styles.colorOptionSwatch,
                                          { backgroundColor: getColorCode(value) }
                                        ]}
                                      >
                                        <Text style={[
                                          styles.colorOptionSwatchText,
                                          { color: ['black', 'blue', 'purple', 'brown'].includes(value.toLowerCase()) ? '#fff' : '#000' }
                                        ]}>
                                          {value.slice(0, 1).toUpperCase()}
                                        </Text>
                                      </View>
                                    )}
                                    {isSelected && (
                                      <View style={styles.colorOptionCheckmark}>
                                        <Icon name="check" size={12} color="#000" />
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        );
                      }
                      
                      // Default rendering for other attributes (size, etc.)
                      return (
                        <View key={attributeKey} style={styles.variantAttributeRow}>
                          <View style={styles.variantAttributeLabelRow}>
                            <Text style={styles.variantAttributeLabel}>{attributeLabel}:</Text>
                            <Text style={styles.variantAttributeValue}>{selectedValue || 'None'}</Text>
                          </View>
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.variantOptionsRowScroll}
                          >
                            {(availableValues as string[]).map((value) => {
                              const isSelected = selectedValue === value;
                              return (
                                <TouchableOpacity
                                  key={value}
                                  onPress={() => onProductVariantChange?.(productId, attributeKey, value)}
                                  disabled={isLoadingVariant}
                                  style={[
                                    styles.variantOptionButton,
                                    isSelected && styles.variantOptionButtonSelected,
                                    isLoadingVariant && styles.variantOptionDisabled,
                                  ]}
                                >
                                  <Text style={[
                                    styles.variantOptionButtonText,
                                    isSelected && styles.variantOptionButtonTextSelected,
                                  ]}>
                                    {value}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Stock Warning */}
      {!bundleData.allInStock && (
        <View style={styles.stockWarning}>
          <Text style={styles.stockWarningText}>
            ⚠️ Some products in this bundle are currently out of stock. Please wait for
            restock or choose a different bundle.
          </Text>
        </View>
      )}

      {/* Address Section */}
      <View style={styles.productsSection}>
      <Text style={[styles.sectionTitle]}>Delivery Address</Text>
        {!isAddressListOpen && selectedAddress && (
          <View style={styles.selectedAddressCard}>
            <View style={styles.selectedAddressContent}>
              <View style={styles.addressHeader}>
                <View style={styles.addressIconContainer}>
                  <AddressIcon type={selectedAddress.addressType} />
                </View>
                <Text style={styles.addressType}>
                  {selectedAddress.addressType}
                </Text>
              </View>
              <View style={styles.addressDetails}>
                <Text style={styles.addressName}>{selectedAddress.name}</Text>
                <Text style={styles.addressLine}>{selectedAddress.line1}</Text>
                <Text style={styles.addressLine}>
                  {selectedAddress.city}, {selectedAddress.state} -{' '}
                  {selectedAddress.pincode}
                </Text>
                <Text style={styles.addressLine}>
                  Mobile: <Text style={styles.addressName}>{selectedAddress.mobile}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setAddressListOpen(true)}>
              <Text style={styles.changeAddressButton}>Change</Text>
            </TouchableOpacity>
          </View>
        )}

        {(isAddressListOpen || !selectedAddress) && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {loading ? (
              <ActivityIndicator size="large" color="#f7ce45" />
            ) : (
              <View style={styles.addressList}>
                {addresses.length === 0 && (
                  <View style={styles.noAddressContainer}>
                    <View style={styles.noAddressIconContainer}>
                      <Icon name="map-marker-off" size={48} color="#9ca3af" />
                    </View>
                    <Text style={styles.noAddressTitle}>No Delivery Address</Text>
                    <Text style={styles.noAddressText}>
                      Please add a delivery address to proceed with your order
                    </Text>
                  </View>
                )}
                {addresses.map((address) => (
                  <TouchableOpacity
                    key={address._id}
                    onPress={() => handleSelectAndClose(address)}
                    style={[
                      styles.addressCard,
                      selectedAddress?._id === address._id &&
                        styles.addressCardSelected,
                    ]}
                  >
                    <View style={styles.addressCardContent}>
                      <View style={styles.addressIconContainer}>
                        <AddressIcon type={address.addressType} />
                      </View>
                      <View style={styles.addressCardDetails}>
                        <Text style={styles.addressType}>{address.addressType}</Text>
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressLine}>{address.line1}</Text>
                        <Text style={styles.addressLine}>
                          {address.city}, {address.state} - {address.pincode}
                        </Text>
                        <Text style={styles.addressLine}>Mobile: {address.mobile}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onEditAddress(address);
                      }}
                      style={styles.editButton}
                    >
                      <Icon name="pencil" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={onAddNewAddress}
                  style={styles.addAddressButton}
                >
                  <Icon name="plus" size={18} color="#9ca3af" />
                  <Text style={styles.addAddressText}>Add New Address</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* Order Summary */}
     
      <View style={styles.productsSection}>
         <Text style={[styles.sectionTitle, { marginLeft: 10 }]}>
        {isFlashSale ? '🔥 Flash Sale Summary' : 'Order Summary'}
      </Text>
        <View
          style={[
            styles.orderSummary,
            isFlashSale && styles.orderSummaryFlashSale,
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {isFlashSale ? 'Flash Bundle Price' : 'Bundle Price'} (x{quantity})
            </Text>
            <Text
              style={[
                styles.summaryValue,
                isFlashSale && styles.summaryValueFlashSale,
              ]}
            >
              ₹{effectivePrice * quantity}
            </Text>
          </View>
          {calculatingDelivery ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Calculating Delivery...</Text>
              <ActivityIndicator size="small" color="#f7ce45" />
            </View>
          ) : finalDeliveryCharge > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charge</Text>
              <Text style={styles.summaryValue}>₹{finalDeliveryCharge}</Text>
            </View>
          ) : null}
          {savingsAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  isFlashSale ? styles.flashSavingsLabel : styles.normalSavingsLabel,
                ]}
              >
                {isFlashSale ? '🔥 Flash Sale Savings' : 'Total Savings'}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isFlashSale ? styles.flashSavingsValue : styles.normalSavingsValue,
                ]}
              >
                - ₹{savingsAmount}
              </Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total Amount</Text>
            <Text
              style={[
                styles.summaryTotalValue,
                isFlashSale && styles.summaryValueFlashSale,
              ]}
            >
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
          
          {/* Wallet Balance Display */}
          {!loadingWallet && walletBalance !== null && (
            <View style={styles.walletBalanceCard}>
              <View style={styles.walletBalanceHeader}>
                <View style={styles.walletIconContainer}>
                  <Icon name="wallet" size={16} color="#f7ce45" />
                </View>
                <Text style={styles.walletBalanceLabel}>Wallet Balance</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.walletBalanceAmount}>₹{(walletBalance || 0).toFixed(2)}</Text>
                {(walletBalance || 0) < totalAmount && (
                  <TouchableOpacity 
                    onPress={handleAddMoney}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 }}
                    activeOpacity={0.7}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#22c55e' }}>
                      Add Money
                    </Text>
                    <ChevronRight size={14} color="#22c55e" />
                  </TouchableOpacity>
                )}
              </View>
              {(walletBalance || 0) >= totalAmount ? (
                <View style={styles.walletSufficientBadge}>
                  <Icon name="check" size={12} color="#22c55e" />
                  <Text style={styles.walletSufficientText}>You can pay with wallet</Text>
                </View>
              ) : (
                <Text style={styles.walletInsufficientText}>
                  Need ₹{(totalAmount - (walletBalance || 0)).toFixed(2)} more to pay with wallet
                </Text>
              )}
            </View>
          )}
          
          {/* Payment Method Selection */}
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodHeader}>
              <Text style={styles.paymentMethodTitle}>Select Payment Method</Text>
              <Text style={styles.paymentMethodRequired}>(Required)</Text>
            </View>
            
            {/* Wallet Option */}
            <TouchableOpacity
              onPress={() => onPaymentMethodChange && onPaymentMethodChange('WALLET')}
              disabled={(walletBalance || 0) < totalAmount}
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'WALLET' && styles.paymentOptionSelected,
                (walletBalance || 0) < totalAmount && styles.paymentOptionDisabled,
              ]}
              activeOpacity={0.7}>
              <View style={styles.radioButton}>
                {selectedPaymentMethod === 'WALLET' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentOptionHeader}>
                  <Icon name="wallet" size={20} color="#f7ce45" />
                  <Text style={styles.paymentOptionTitle}>Wallet Payment</Text>
                </View>
                <Text style={[
                  styles.paymentOptionSubtext,
                  (walletBalance || 0) >= totalAmount ? styles.sufficientBalance : styles.insufficientBalance
                ]}>
                  {(walletBalance || 0) >= totalAmount 
                    ? '✓ Sufficient balance' 
                    : `Insufficient (Need ₹${(totalAmount - (walletBalance || 0)).toFixed(2)} more)`}
                </Text>
              </View>
              <Text style={styles.paymentOptionAmount}>₹{(walletBalance || 0).toFixed(2)}</Text>
            </TouchableOpacity>
            
            {/* Razorpay Option */}
            <TouchableOpacity
              onPress={() => onPaymentMethodChange && onPaymentMethodChange('RAZORPAY')}
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'RAZORPAY' && styles.paymentOptionSelected,
              ]}
              activeOpacity={0.7}>
              <View style={styles.radioButton}>
                {selectedPaymentMethod === 'RAZORPAY' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.paymentOptionContent}>
                <View style={styles.paymentOptionHeader}>
                  <View style={styles.razorpayIcon}>
                    <Text style={styles.razorpayIconText}>₹</Text>
                  </View>
                  <Text style={styles.paymentOptionTitle}>Pay using</Text>
                </View>
                <Text style={styles.paymentOptionSubtext}>UPI • Cards • Net Banking</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Proceed Button */}
      <View style={styles.proceedButtonContainer}>
        <TouchableOpacity
          onPress={onNext}
          disabled={
            isOwner ||
            !selectedAddress ||
            !selectedPaymentMethod ||
            isProcessing ||
            hasExpired ||
            !bundleData.allInStock ||
            calculatingDelivery ||
            (selectedPaymentMethod === 'WALLET' && (walletBalance || 0) < totalAmount)
          }
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f7ce45', '#fbbf24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.proceedButton,
              (!selectedAddress ||
                isProcessing ||
                hasExpired ||
                !bundleData.allInStock ||
                calculatingDelivery) &&
                styles.proceedButtonDisabled,
            ]}
          >
            <Text style={styles.proceedButtonText}>
              {isOwner? 'Cannot Purchase Own Bundle' :
              isProcessing
                ? 'Processing...'
                : calculatingDelivery
                ? 'Calculating...'
                : !bundleData.allInStock
                ? 'Out of Stock'
                : !selectedAddress
                ? 'Select Address to Proceed'
                : hasExpired
                ? 'Time\'s Up !'
                : 'Proceed to Payment'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  flashSaleBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  flashSaleBannerGradient: {
    padding: 12,
  },
  flashSaleBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashSaleBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  flashSaleTimer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flashSaleTimerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  expiredWarning: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
  },
  expiredWarningText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '500',
  },
  ownerWarningBanner: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 16,
  },
  ownerWarningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerWarningTextContainer: {
    flex: 1,
  },
  ownerWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  ownerWarningText: {
    fontSize: 14,
    color: '#fbbf24',
    lineHeight: 20,
  },
  section: {
    margin: 10,
    // marginBottom: 8,
    padding: 16,
    // backgroundColor: '#18181b',
    // borderRadius: 16,
    // borderWidth: 1,
    // borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  bundleOverview: {
    flexDirection: 'row',
    gap: 16,
  },
  bundleImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  bundleInfo: {
    flex: 1,
    gap: 8,
  },
  bundleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bundleDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  productsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productsCountText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  flashSalePrice: {
    color: '#ef4444',
  },
  perItemText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  flashSavingsBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  normalSavingsBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flashSavingsText: {
    color: '#f87171',
  },
  normalSavingsText: {
    color: '#22c55e',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.2)',
  },
  totalPriceLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  quantityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonPlus: {
    backgroundColor: '#f7ce45',
  },
  quantityButtonDisabled: {
    backgroundColor: '#18181b',
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  quantityButtonTextPlus: {
    color: '#000000',
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: 48,
    textAlign: 'center',
  },
  maxQuantityWarning: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
    borderRadius: 8,
  },
  maxQuantityWarningText: {
    color: '#eab308',
    fontSize: 12,
  },
  productsSection: {
    margin: 16,
    marginBottom: 8,
  },
  productsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
  },
  productCard: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  productCardGradient: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 16,
    overflow: 'hidden',
  },
  productNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(247, 206, 69, 0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  productDiscountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  productDiscountGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productDiscountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  productCardImageContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  productCardImage: {
    width: '100%',
    height: '100%',
  },
  stockBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inStockBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  productCardInfo: {
    padding: 12,
  },
  productCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    // marginBottom: 4,
    minHeight: 40,
  },
  productCardPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink:2,
    gap: 4,
  },
  productCardMRP: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  productCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 2,
  },
  productCardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  stockWarning: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
  },
  stockWarningText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedAddressCard: {
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedAddressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  addressIconContainer: {
    padding: 8,
    height:40,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  addressDetails: {
    marginLeft: 44,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  changeAddressButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7ce45',
  },
  addressList: {
    gap: 8,
  },
  addressCard: {
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addressCardSelected: {
    borderColor: '#f7ce45',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
  },
  addressCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  addressCardDetails: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#374151',
    borderRadius: 16,
  },
  addAddressText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  noAddressIconContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#374151',
    borderRadius: 50,
  },
  noAddressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  noAddressText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  orderSummary: {
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  orderSummaryFlashSale: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  summaryValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  summaryValueFlashSale: {
    color: '#f87171',
    fontWeight: '600',
  },
  flashSavingsLabel: {
    color: '#f87171',
    fontWeight: '500',
  },
  normalSavingsLabel: {
    color: '#22c55e',
    fontWeight: '500',
  },
  flashSavingsValue: {
    color: '#f87171',
    fontWeight: '600',
  },
  normalSavingsValue: {
    color: '#22c55e',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  proceedButtonContainer: {
    margin: 16,
  },
  proceedButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  // Variant-related styles
  productCardWithVariants: {
    width: 220,
  },
  variantRequiredBadge: {
    position: 'absolute',
    top: 40,
    left: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  variantRequiredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  variantLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantSelectionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  variantAttributeSection: {
    marginBottom: 8,
  },
  variantAttributeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
  },
  variantOptionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  variantOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#374151',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  variantOptionSelected: {
    backgroundColor: 'rgba(247, 206, 69, 0.2)',
    borderColor: '#f7ce45',
  },
  variantOptionDisabled: {
    opacity: 0.5,
  },
  variantOptionText: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '500',
  },
  variantOptionTextSelected: {
    color: '#f7ce45',
    fontWeight: '600',
  },
  selectedVariantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
  },
  selectedVariantText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '500',
  },
  variantWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
  },
  variantWarningText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  // New vertical list styles
  productsListContainer: {
    gap: 12,
  },
  productListItem: {
    padding: 12,
    backgroundColor: 'rgba(55, 65, 81, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom:7,
    borderColor: '#374151',
  },
  productListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productListIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    // width: 24,
  },
  productListImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  productListInfo: {
    flex: 1,
  },
  productListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 4,
  },
  productListPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productListMRP: {
    fontSize: 12,
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  productListPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f7ce45',
  },
  productListStockContainer: {
    alignItems: 'flex-end',
  },
  productListStockInfo: {
    alignItems: 'flex-end',
  },
  productListStockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  productListStockMessage: {
    fontSize: 10,
    color: '#f59e0b',
    marginTop: 2,
  },
  productListOutOfStock: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  productListLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  productListLoadingText: {
    fontSize: 12,
    color: '#f7ce45',
  },
  variantSectionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  variantInfoHeader: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  variantInfoHeaderWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  variantInfoHeaderSuccess: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  variantInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  variantInfoTextWarning: {
    color: '#f59e0b',
  },
  variantInfoTextSuccess: {
    color: '#3b82f6',
  },
  variantAttributeRow: {
    marginBottom: 12,
  },
  variantAttributeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  variantAttributeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  variantColorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  colorOptionSelected: {
    borderColor: '#f7ce45',
  },
  colorOptionImage: {
    width: '100%',
    height: '100%',
  },
  colorOptionSwatch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSwatchText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  colorOptionCheckmark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247, 206, 69, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#18181b',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  variantOptionButtonSelected: {
    backgroundColor: '#f7ce45',
    borderColor: '#f7ce45',
  },
  variantOptionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  variantOptionButtonTextSelected: {
    color: '#000000',
  },
  // Fixed height nested scroll and horizontal scroll styles
  productsNestedScroll: {
    maxHeight: 350,
    borderRadius: 12,
  },
  variantColorOptionsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  variantOptionsRowScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 16,
  },
  // Wallet balance card styles
  walletBalanceCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.3)',
  },
  walletBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  walletIconContainer: {
    padding: 6,
    backgroundColor: 'rgba(247,206,69,0.2)',
    borderRadius: 8,
  },
  walletBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  walletBalanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7ce45',
    marginBottom: 8,
  },
  walletSufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  walletSufficientText: {
    fontSize: 12,
    color: '#22c55e',
  },
  walletInsufficientText: {
    fontSize: 12,
    color: '#eab308',
  },
  // Payment method selection styles
  paymentMethodCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,1)',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  paymentMethodTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  paymentMethodRequired: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(75,85,99,1)',
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: '#f7ce45',
    backgroundColor: 'rgba(247,206,69,0.1)',
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f7ce45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f7ce45',
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paymentOptionTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  paymentOptionSubtext: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
  },
  sufficientBalance: {
    color: '#22c55e',
  },
  insufficientBalance: {
    color: '#ef4444',
  },
  paymentOptionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  razorpayIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f7ce45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  razorpayIconText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default Step1_BundleOrderReview;
