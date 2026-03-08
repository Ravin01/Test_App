import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {Minus, Plus, Edit3, Home, Briefcase, MapPin, Check, Wallet, ChevronRight} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import axiosCourier from '../../Utils/axiosCourier';
import axiosInstance from '../../Utils/Api';
import {AWS_CDN_URL} from '../../Utils/aws';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWalletBalance } from '../../Services/walletService';

// A self-contained, functional countdown timer component.
const FlashSaleCountdown = ({endTime}) => {
  const calculateTimeLeft = useCallback(() => {
    if (!endTime) return {};
    
    const difference = +new Date(endTime) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  }, [endTime]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

  useEffect(() => {
    // Immediately calculate on mount or when endTime changes
    setTimeLeft(calculateTimeLeft());
    
    // Set up interval to update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Cleanup interval on unmount or when endTime changes
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const timerComponents = [];
  Object.keys(timeLeft).forEach(interval => {
    if (
      timeLeft[interval] === 0 &&
      (interval === 'days' || interval === 'hours')
    ) {
      return;
    }
    timerComponents.push(
      <Text key={interval} style={styles.timerText}>
        {String(timeLeft[interval]).padStart(2, '0')}
        {interval.charAt(0)}
      </Text>,
    );
  });

  const renderTimer = () => {
    if (!timerComponents.length) return <Text>Sale Ended!</Text>;
    return timerComponents.reduce((prev, curr, idx) => {
      if (idx === 0) return [curr];
      return [...prev, <Text key={`sep-${idx}`}>:</Text>, curr];
    }, []);
  };

  return <View style={styles.timerContainer}>{renderTimer()}</View>;
};

const AddressIcon = ({type}) => {
  const iconColor = 'rgba(250,250,250,.62)';
  const iconSize = 20;

  switch (type?.toLowerCase()) {
    case 'home':
      return <Home size={iconSize} color={iconColor} />;
    case 'work':
      return <Briefcase size={iconSize} color={iconColor} />;
    default:
      return <MapPin size={iconSize} color={iconColor} />;
  }
};

// Color map for common color names
const colorMap = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  purple: '#A855F7',
  pink: '#EC4899',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#6B7280',
  grey: '#6B7280',
  brown: '#92400E',
  navy: '#1E3A5A',
  beige: '#D4B896',
  cream: '#FFFDD0',
  gold: '#FFD700',
  silver: '#C0C0C0',
  maroon: '#800000',
  teal: '#008080',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  lavender: '#E6E6FA',
  coral: '#FF7F50',
  salmon: '#FA8072',
  olive: '#808000',
  burgundy: '#800020',
  charcoal: '#36454F',
  turquoise: '#40E0D0',
  mint: '#98FF98',
  peach: '#FFCBA4',
  rust: '#B7410E',
  indigo: '#4B0082',
  violet: '#8B00FF',
  rose: '#FF007F',
  chocolate: '#D2691E',
  khaki: '#F0E68C',
  tan: '#D2B48C',
  amber: '#FFBF00',
  emerald: '#50C878',
  ruby: '#E0115F',
  sapphire: '#0F52BA',
  multicolor: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
  rainbow: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
};

// Helper function to get color value
const getColorValue = (colorName) => {
  if (!colorName) return null;
  const normalizedName = colorName.toLowerCase().trim();
  return colorMap[normalizedName] || null;
};

// Helper function to check if an attribute is a color type
const isColorAttribute = (key) => {
  const colorKeys = ['color', 'colour', 'colors', 'colours'];
  return colorKeys.includes(key.toLowerCase());
};

// Variant Selector Component - Updated to match web version
const VariantSelector = ({
  variantAttributes,
  selectedAttributes,
  onAttributeChange,
  isAttributeCombinationAvailable,
  variantLoading,
  variantMetadata,
  CDN_BASE_URL,
}: {
  variantAttributes: Record<string, string[]>;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (key: string, value: string) => void;
  isAttributeCombinationAvailable: (key: string, value: string) => boolean;
  variantLoading: boolean;
  variantMetadata: any[];
  CDN_BASE_URL: string;
}) => {
  if (!variantAttributes || Object.keys(variantAttributes).length === 0) {
    return null;
  }

  // Render color swatch for color attributes - with thumbnail image support
  const renderColorSwatch = (attributeKey: string, value: string) => {
    const isSelected = selectedAttributes[attributeKey] === value;
    const isAvailable = isAttributeCombinationAvailable(attributeKey, value);
    const colorValue = getColorValue(value);
    
    // Check if we have thumbnail image for this color variant
    const colorMetadata = variantMetadata?.find(
      v => v.variantAttributes?.[attributeKey] === value
    );
    const thumbnailUrl = colorMetadata?.thumbnailImage 
      ? `${CDN_BASE_URL}${colorMetadata.thumbnailImage}` 
      : colorMetadata?.images?.[0]?.key 
        ? `${CDN_BASE_URL}${colorMetadata.images[0].key}`
        : null;
    
    return (
      <TouchableOpacity
        key={value}
        onPress={() => !variantLoading && isAvailable && onAttributeChange(attributeKey, value)}
        disabled={variantLoading || !isAvailable}
        style={[
          variantStyles.colorSwatch,
          isSelected && variantStyles.colorSwatchSelected,
          !isAvailable && variantStyles.colorSwatchUnavailable,
          variantLoading && variantStyles.variantLoadingState,
        ]}
        activeOpacity={0.7}
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={variantStyles.colorSwatchImage}
            resizeMode="cover"
          />
        ) : colorValue ? (
          <View
            style={[
              variantStyles.colorSwatchInner,
              { backgroundColor: colorValue },
              colorValue === '#FFFFFF' && variantStyles.whiteSwatchBorder,
            ]}
          />
        ) : (
          <View style={variantStyles.colorSwatchFallback}>
            <Text style={[
              variantStyles.colorSwatchFallbackText,
              { color: value.toLowerCase() === 'black' || value.toLowerCase() === 'blue' ? '#fff' : '#000' }
            ]} numberOfLines={1}>
              {value.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        {isSelected && (
          <View style={variantStyles.colorSwatchCheckmark}>
            <Check size={12} color={colorValue === '#FFFFFF' || colorValue === '#FFFDD0' ? '#000' : '#FFF'} />
          </View>
        )}
        {!isAvailable && (
          <View style={variantStyles.colorSwatchStrikethrough} />
        )}
      </TouchableOpacity>
    );
  };

  // Render scrollable options row for variant attributes
  const renderOptionsRow = (attributeKey: string, values: string[], isColor: boolean) => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={variantStyles.variantOptionsScrollContent}
        style={variantStyles.variantOptionsScroll}
      >
        {isColor
          ? (values as string[]).map((value) => renderColorSwatch(attributeKey, value))
          : (values as string[]).map((value) => renderOptionButton(attributeKey, value))
        }
      </ScrollView>
    );
  };

  // Render regular option button for non-color attributes (like size, storage, etc.)
  const renderOptionButton = (attributeKey: string, value: string) => {
    const isSelected = selectedAttributes[attributeKey] === value;
    const isAvailable = isAttributeCombinationAvailable(attributeKey, value);
    
    return (
      <TouchableOpacity
        key={value}
        onPress={() => !variantLoading && isAvailable && onAttributeChange(attributeKey, value)}
        disabled={variantLoading || !isAvailable}
        style={[
          variantStyles.variantOption,
          isSelected && variantStyles.variantOptionSelected,
          !isAvailable && variantStyles.variantOptionUnavailable,
          variantLoading && variantStyles.variantLoadingState,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            variantStyles.variantOptionText,
            isSelected && variantStyles.variantOptionTextSelected,
            !isAvailable && variantStyles.variantOptionTextUnavailable,
          ]}
        >
          {value}
        </Text>
        {!isAvailable && (
          <View style={variantStyles.variantOptionStrikethrough} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={variantStyles.variantSelectorContainer}>
      {Object.entries(variantAttributes).map(([attributeKey, values]) => {
        const selectedValue = selectedAttributes[attributeKey];
        const attributeLabel = attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1);
        
        return (
          <View key={attributeKey} style={variantStyles.variantAttributeGroup}>
            <View style={variantStyles.variantAttributeLabelRow}>
              <Text style={variantStyles.variantAttributeLabel}>
                Select {attributeLabel}:
              </Text>
              {selectedValue && (
                <Text style={variantStyles.selectedAttributeValue}>
                  {selectedValue}
                </Text>
              )}
              {/* Removed individual spinner - unified loading overlay handles this now */}
            </View>
            {renderOptionsRow(attributeKey, values as string[], isColorAttribute(attributeKey))}
          </View>
        );
      })}
    </View>
  );
};

// Variant-specific styles
const variantStyles = StyleSheet.create({
  variantSelectorContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55,65,81,1)',
  },
  variantAttributeGroup: {
    marginBottom: 12,
  },
  variantAttributeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  variantAttributeLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  selectedAttributeValue: {
    color: '#f7ce45',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  variantOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantOptionsScroll: {
    flexGrow: 0,
  },
  variantOptionsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  // Color swatch styles
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(75,85,99,1)',
    position: 'relative',
  },
  colorSwatchSelected: {
    borderColor: '#f7ce45',
    shadowColor: '#f7ce45',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorSwatchUnavailable: {
    opacity: 0.4,
    borderColor: 'rgba(55,65,81,1)',
  },
  colorSwatchImage: {
    width: '100%',
    height: '100%',
  },
  colorSwatchInner: {
    width: '100%',
    height: '100%',
  },
  whiteSwatchBorder: {
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.5)',
  },
  colorSwatchFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(107,114,128,1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchFallbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorSwatchCheckmark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(247,206,69,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchStrikethrough: {
    position: 'absolute',
    top: '50%',
    left: -5,
    right: -5,
    height: 2,
    backgroundColor: 'rgba(239,68,68,0.8)',
    transform: [{ rotate: '-45deg' }],
  },
  // Regular variant option styles
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(75,85,99,1)',
    backgroundColor: 'rgba(31,41,55,1)',
    position: 'relative',
    minWidth: 50,
    alignItems: 'center',
  },
  variantOptionSelected: {
    backgroundColor: '#f7ce45',
    borderColor: '#f7ce45',
  },
  variantOptionUnavailable: {
    opacity: 0.4,
    borderColor: 'rgba(55,65,81,1)',
    backgroundColor: 'rgba(31,41,55,1)',
  },
  variantOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  variantOptionTextSelected: {
    color: '#000',
  },
  variantOptionTextUnavailable: {
    color: 'rgba(107,114,128,1)',
    textDecorationLine: 'line-through',
  },
  variantOptionStrikethrough: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(239,68,68,0.6)',
  },
  variantLoadingState: {
    opacity: 0.5,
  },
});

const Step1_OrderAndAddress = ({
  orderData,
  addresses,
  loading,
  onQuantityChange,
  onSelectAddress,
  onDeliveryChargeUpdate,
  onAddNewAddress,
  onEditAddress,
  onNext,
  isProcessing,
  stockData: _stockData,
  stockLoading,
  stockStatus,
  // Variant props
  hasVariants = false,
  variantAttributes = {},
  selectedAttributes = {},
  onAttributeChange = () => {},
  isAttributeCombinationAvailable = () => true,
  variantLoading = false,
  variantMetadata = [],
  CDN_BASE_URL = '',
  isVariantChanging = false, // Unified loading state for variant changes
  // Payment method props
  selectedPaymentMethod,
  onPaymentMethodChange,
  // Modal control
  onClose,
}) => {
  const navigation = useNavigation();
  const [isAddressListOpen, setAddressListOpen] = useState(false);
  const [sellerPincode, setSellerPincode] = useState(null
  );
  const [recommendedOption, setRecommendedOption] = useState(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(true); // Start as true to show loader initially
  
  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const item = orderData.products[0];
  const {product, quantity} = item || {};
  const {deliveryCharge, deliveryAddress} = orderData;
  const isMountedRef = useRef(true);
  
  // Ref for callback to prevent infinite loops
  const onDeliveryChargeUpdateRef = useRef(onDeliveryChargeUpdate);
  onDeliveryChargeUpdateRef.current = onDeliveryChargeUpdate;

  // Handle navigation to wallet page
  const handleAddMoney = useCallback(() => {
    // Close the modal first if onClose is provided
    if (onClose) {
      onClose();
    }
    // Then navigate to wallet page
    navigation.navigate('WalletPage');
  }, [navigation, onClose]);

  // Fetch wallet balance
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

  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!product?._id) return;
      try {
        const response = await axiosInstance.get(
          `/courier/seller-pincode/${product._id}`,
        );
        if (response.data.status) {
          setSellerPincode(response.data.pincode);
        }
      } catch (error) {
        console.log('Failed to fetch seller pincode:', error.response.data);
      }
    };
    fetchSellerPincode();
  }, [product]);

  // Track previous values to prevent unnecessary API calls
  const prevCalculationRef = useRef({
    sellerPincode: null,
    buyerPincode: null,
    quantity: 0,
    productId: null,
    shippingMethod: null,
    rawShippingMethod: 'undefined',
    rawLogisticsType: 'undefined',
  });
  
 console.log('🚚 [OrderAndAddress] Calculating delivery charges...', deliveryAddress, deliveryAddress?.pincode);

  useEffect(() => {
    const calculateDeliveryCharges = async () => {
      if (!deliveryAddress?.pincode || !product || !isMountedRef.current) {
        // If required data is not available, set calculatingDelivery to false
        if (isMountedRef.current) {
          setCalculatingDelivery(false);
        }
        return;
      }
      
      // ✅ BACKWARD COMPATIBILITY (SAME AS WEB VERSION): Check new field first, fallback to old field
      let productShippingMethod = product.shippingMethod;
      
      // If new field doesn't exist, map old logisticsType to new values
      if (!productShippingMethod && product.logisticsType) {
        productShippingMethod = product.logisticsType === 'selfShipment' 
          ? 'self_shipment' 
          : 'flykup_logistics';
      }
      
      // Default to flykup_logistics if neither field exists (same as web)
      productShippingMethod = productShippingMethod || 'flykup_logistics';
      
      const requiresSelfShipment = productShippingMethod === 'self_shipment';

      // console.log('🚚 =========================================');
      // console.log('🚚 DELIVERY CHARGE CALCULATION DEBUG');
      // console.log('🚚 =========================================');
      // console.log('🚚 Product ID:', product._id);
      // console.log('🚚 Product Title:', product.title);
      // console.log('🚚 product.shippingMethod (new field):', product.shippingMethod);
      // console.log('🚚 product.logisticsType (old field):', product.logisticsType);
      // console.log('🚚 Final productShippingMethod:', productShippingMethod);
      // console.log('🚚 requiresSelfShipment:', requiresSelfShipment);
      // console.log('🚚 DECISION:', requiresSelfShipment ? '📦 SELF SHIPMENT (use product.deliveryCharge)' : '🚀 FLYKUP LOGISTICS (call courier API)');
      // console.log('🚚 product.deliveryCharge:', product.deliveryCharge);
      // console.log('🚚 product.estimatedDeliveryDate:', product.estimatedDeliveryDate);
      // console.log('🚚 =========================================');

      // Check if we've already calculated for these exact values
      // Include raw field values to detect when they become available
      const currentValues = {
        sellerPincode,
        buyerPincode: deliveryAddress.pincode,
        quantity,
        productId: product._id,
        shippingMethod: productShippingMethod,
        // Track raw values to detect when they load
        rawShippingMethod: product?.shippingMethod || 'undefined',
        rawLogisticsType: product?.logisticsType || 'undefined',
      };

      const hasChanged = 
        prevCalculationRef.current.sellerPincode !== currentValues.sellerPincode ||
        prevCalculationRef.current.buyerPincode !== currentValues.buyerPincode ||
        prevCalculationRef.current.quantity !== currentValues.quantity ||
        prevCalculationRef.current.productId !== currentValues.productId ||
        prevCalculationRef.current.shippingMethod !== currentValues.shippingMethod ||
        prevCalculationRef.current.rawShippingMethod !== currentValues.rawShippingMethod ||
        prevCalculationRef.current.rawLogisticsType !== currentValues.rawLogisticsType;

      if (!hasChanged) {
        console.log('🚫 Skipping delivery calculation - no changes');
        return; // Skip if nothing changed
      }

      console.log('✅ Delivery calculation triggered - values changed:', {
        prev: prevCalculationRef.current,
        current: currentValues,
      });

      // Update the ref with current values
      prevCalculationRef.current = currentValues;

      setCalculatingDelivery(true);
      setRecommendedOption(null);
      onDeliveryChargeUpdateRef.current?.(null);

      // ✅ If self-shipment, use product's delivery info (no API call) - SAME AS WEB
      if (requiresSelfShipment) {
        console.log('📦 Using self-shipment method');
        const fallbackOption = {
          charge: product.deliveryCharge || 40,
          estimated_days: product.estimatedDeliveryDate || 7,
          isSelfShipment: true,
          message: "",
        };
        setRecommendedOption(fallbackOption);
        onDeliveryChargeUpdateRef.current?.(fallbackOption.charge, 'self_shipment');
        setCalculatingDelivery(false);
        return; // ✅ EARLY EXIT - No courier API call
      }

      // ✅ If Flykup logistics, validate seller pincode before API call
      console.log('🔍 Attempting Flykup logistics calculation');
      if (!sellerPincode) {
        console.log('❌ Cannot calculate delivery: Seller pincode not available');
        setCalculatingDelivery(false);
        return;
      }

      try {
        const weightInGrams = product.weight?.value || 100;
        const totalWeightInKg = (weightInGrams / 1000) * quantity;

        const currentPrice = product.flashSale?.isActive ? product.flashSale.flashPrice : product.productPrice;
        const itemTotalValue = currentPrice * quantity;

        console.log('📡 Calling delivery calculation API:', {
          seller_pincode: sellerPincode,
          customer_pincode: deliveryAddress.pincode,
          product_weight: totalWeightInKg,
          order_value: itemTotalValue
        });

        // Build delivery calculation payload
        const deliveryPayload: any = {
          seller_pincode: sellerPincode,
          customer_pincode: deliveryAddress.pincode,
          product_weight: totalWeightInKg,
          weight_unit: 'kg',
          order_value: itemTotalValue,
          payment_mode: 'prepaid',
          order_date: new Date().toISOString().split('T')[0],
        };

        // ✅ Add dimensions if product has them (for accurate shipping calculation)
        if (product.dimensions?.length && 
            product.dimensions?.width && 
            product.dimensions?.height) {
          deliveryPayload.length = product.dimensions.length;
          deliveryPayload.width = product.dimensions.width;
          deliveryPayload.height = product.dimensions.height;
          console.log('📦 Sending dimensions for delivery calculation:', {
            length: product.dimensions.length,
            width: product.dimensions.width,
            height: product.dimensions.height,
          });
        } else {
          console.log('⚠️ Product has no dimensions, calculating delivery by weight only');
        }

        const response = await axiosCourier.post('/business/calculate-delivery', deliveryPayload);

        console.log('✅ Delivery calculation response:', response.data);

        // Case 1: Courier service is available
        if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
          const recommended = response.data.data.recommended_courier;
          const option = {
            charge: recommended.delivery_charges,
            estimated_days: recommended.estimated_days,
            isSelfShipment: false,
          };
          setRecommendedOption(option);
          onDeliveryChargeUpdateRef.current?.(option.charge, 'flykup_logistics');
          console.log('✅ Flykup logistics charges set:', option.charge);
        }
        // Case 2: Courier unavailable -> Fallback to self-shipment
        else if (isMountedRef.current && product.deliveryCharge != null && product.estimatedDeliveryDate != null) {
          console.log("⚠️ Courier not available, falling back to self-shipment.");
          const fallbackOption = {
            charge: product.deliveryCharge,
            estimated_days: product.estimatedDeliveryDate,
            isSelfShipment: true,
            message:"",
            // message: 'This item will be shipped directly by the seller.',
          };
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current?.(product.deliveryCharge, 'self_shipment');
        } else if (isMountedRef.current) {
          // Fallback with default values if product delivery info not available
          console.log("⚠️ Courier not available, using default fallback.");
          const fallbackCharge = product.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            estimated_days: product.estimatedDeliveryDate || 7,
            isSelfShipment: true,
            message:"",
            // message: 'This item will be shipped directly by the seller.',
          };
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current?.(fallbackCharge, 'self_shipment');
        }
      } catch (error) {
        console.error('❌ Failed to calculate delivery charges:', error);
        console.error('Error details:', error.response?.data || error.message);

        // On API error, try fallback to self shipment
        if (isMountedRef.current && product.deliveryCharge != null && product.estimatedDeliveryDate != null) {
          console.log('⚠️ API error - falling back to self-shipment');
          const fallbackOption = {
            charge: product.deliveryCharge,
            estimated_days: product.estimatedDeliveryDate,
            isSelfShipment: true,
            message: 'Delivery calculation unavailable. Using seller shipping.',
          };
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current?.(product.deliveryCharge, 'self_shipment');
        } else if (isMountedRef.current) {
          // Fallback with default values
          const fallbackCharge = product.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            estimated_days: product.estimatedDeliveryDate || 7,
            isSelfShipment: true,
            message: 'Delivery calculation unavailable. Using seller shipping.',
          };
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current?.(fallbackCharge, 'self_shipment');
        }
      } finally {
        if (isMountedRef.current) {
          setCalculatingDelivery(false);
        }
      }
    };

    if (isMountedRef.current && deliveryAddress?.pincode && product) {
      calculateDeliveryCharges();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sellerPincode,
    deliveryAddress?.pincode,
    quantity,
    product?._id,
    product?.shippingMethod,
    product?.logisticsType,
    product?.weight?.value,
    product?.deliveryCharge,
    product?.estimatedDeliveryDate,
    product?.flashSale?.isActive,
    product?.flashSale?.flashPrice,
    product?.productPrice,
  ]);

  if (!item || !product) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f7ce45" />
      </View>
    );
  }

  const {gstAmount, gstRate} = item;

  const isFlashSaleActive = product.flashSale?.isActive;
  let productImageUrl = '/placeholder.svg?height=80&width=80&text=Product';
  if (product.signedImages?.[0]) {
    productImageUrl = product.signedImages[0];
  } else if (product.images?.[0]?.key) {
    productImageUrl = `${AWS_CDN_URL}${product.images[0].key}`;
  }

  const currentPrice = isFlashSaleActive
    ? product.flashSale.flashPrice
    : product.productPrice;
  const itemTotal = currentPrice * quantity;

  const totalAmount = itemTotal + (deliveryCharge || 0);

  const showSavings =
    isFlashSaleActive || (product.MRP && product.productPrice < product.MRP);
  let totalSavedAmount = 0;
  if (isFlashSaleActive) {
    totalSavedAmount =
      (product.MRP - product.flashSale.flashPrice) * quantity;
  } else if (product.MRP && product.productPrice < product.MRP) {
    totalSavedAmount = (product.MRP - product.productPrice) * quantity;
  }

  const handleSelectAndClose = address => {
    onSelectAddress(address);
    setAddressListOpen(false);

  };
  // console.log(product) 

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={{ flex:1
        // maxHeight:'60%'
                ,borderWidth:2,borderColor:'green'}}> */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}>
        {/* Order Review Section */}
        <Text style={styles.sectionTitle}>Review Your Order</Text>
      <View style={styles.card}>
        {/* Full Width Product Image */}
        <View style={styles.productImageContainer}>
          <Image
            source={{uri: productImageUrl}}
            style={styles.productImageFull}
            resizeMode="cover"
          />
          {/* Flash Sale Badge */}
          {isFlashSaleActive && (
            <View style={styles.flashSaleBadgeOverlay}>
              <Text style={styles.flashSaleBadgeText}>⚡ Flash Sale</Text>
            </View>
          )}
        </View>
        
        {/* Product Details Below Image */}
        <View style={styles.productDetailsVertical}>
          <Text style={styles.productTitleLarge}>{product.title}</Text>
          
          {/* Price Row */}
          <View style={styles.priceRowVertical}>
            {isFlashSaleActive ? (
              <>
                <Text style={styles.flashPriceLarge}>
                  ₹{product.flashSale.flashPrice}
                </Text>
                <Text style={styles.strikePriceLarge}>
                  ₹{product.MRP}
                </Text>
                {product.MRP && product.flashSale.flashPrice < product.MRP && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {Math.round(((product.MRP - product.flashSale.flashPrice) / product.MRP) * 100)}% OFF
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.flashPriceLarge}>₹{product.productPrice}</Text>
                {product.MRP && product.productPrice < product.MRP && (
                  <>
                    <Text style={styles.strikePriceLarge}>₹{product.MRP}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        {Math.round(((product.MRP - product.productPrice) / product.MRP) * 100)}% OFF
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
          
          {/* Flash Sale Timer */}
          {isFlashSaleActive && product.flashSale.endsAt && (
            <View style={styles.flashSaleBannerVertical}>
              <View style={styles.flashSaleContentVertical}>
                <Text style={styles.flashSaleTextVertical}>⏱️ Sale Ends in:</Text>
                <FlashSaleCountdown endTime={product.flashSale.endsAt} />
              </View>
            </View>
          )}
          
          {/* Variant Selector */}
          {hasVariants && Object.keys(variantAttributes).length > 0 && (
            <View style={styles.variantSectionVertical}>
              {isVariantChanging && (
                <View style={styles.variantLoadingOverlay}>
                  <ActivityIndicator size="small" color="#f7ce45" />
                  <Text style={styles.variantLoadingText}>Updating variant...</Text>
                </View>
              )}
              <VariantSelector
                variantAttributes={variantAttributes}
                selectedAttributes={selectedAttributes}
                onAttributeChange={onAttributeChange}
                isAttributeCombinationAvailable={isAttributeCombinationAvailable}
                variantLoading={variantLoading}
                variantMetadata={variantMetadata}
                CDN_BASE_URL={CDN_BASE_URL}
              />
            </View>
          )}
          
          {/* Quantity and Stock Row */}
          <View style={styles.quantityStockRow}>
            <View style={styles.quantityContainerVertical}>
              <Text style={styles.quantityLabel}>Qty:</Text>
              <TouchableOpacity
                onPress={() => onQuantityChange(quantity - 1)}
                style={styles.quantityButtonVertical}
                disabled={quantity <= 1 || isProcessing}>
                <Minus size={14} color="rgba(0,0,0,1)" />
              </TouchableOpacity>
              <Text style={styles.quantityTextVertical}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => onQuantityChange(quantity + 1)}
                style={[
                  styles.quantityButtonVertical,
                  isProcessing && styles.quantityButtonDisabled,
                ]}
                disabled={isProcessing}>
                <Plus size={14} color="rgba(0,0,0,1)" />
              </TouchableOpacity>
            </View>
            
            {/* Stock Status */}
            {!isVariantChanging && (
              stockLoading ? (
                <View style={styles.stockBadgeVertical}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                  <Text style={[styles.stockText, {color: '#9ca3af'}]}>
                    Checking...
                  </Text>
                </View>
              ) : (
                stockStatus && (
                  <View
                    style={[
                      styles.stockBadgeVertical,
                      {backgroundColor: `${stockStatus.color}15`},
                    ]}>
                    <Text
                      style={[styles.stockText, {color: stockStatus.color}]}>
                      {stockStatus.message}
                    </Text>
                  </View>
                )
              )
            )}
          </View>
          
          {/* Item Total */}
          {!stockLoading && (
            <View style={styles.itemTotalRow}>
              <Text style={styles.itemTotalLabel}>Item Total:</Text>
              <Text style={styles.itemTotalValue}>₹{itemTotal}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Address Section */}
        <Text style={styles.sectionTitle}>Delivery Address</Text>
      <View style={styles.addressSection}>
        {!isAddressListOpen && deliveryAddress && (
          <View style={styles.card}>
            <View style={styles.addressHeader}>
              <View style={styles.addressContent}>
                <View style={styles.addressIconRow}>
                  <View style={styles.addressIconContainer}>
                    <AddressIcon type={deliveryAddress.addressType} />
                  </View>
                  <Text style={styles.addressType}>
                    {deliveryAddress.addressType}
                  </Text>
                </View>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressName}>{deliveryAddress.name}</Text>
                  <Text style={styles.addressText}>
                    {deliveryAddress.line1}
                  </Text>
                  <Text style={styles.addressText}>
                    {deliveryAddress.city}, {deliveryAddress.state} -{' '}
                    {deliveryAddress.pincode}
                  </Text>
                  <Text style={styles.addressText}>
                    Mobile:{' '}
                    <Text style={styles.addressName}>
                      {deliveryAddress.mobile}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAddressListOpen(true)}>
                <Text style={styles.changeButton}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(isAddressListOpen || !deliveryAddress) && (
          <View style={styles.addressList}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f7ce45" />
              </View>
            )}
            {!loading &&
              addresses?.map(address => (
                <TouchableOpacity
                  key={address._id}
                  style={[
                    styles.addressCard,
                    deliveryAddress?._id === address._id &&
                      styles.addressCardSelected,
                  ]}
                  onPress={() => handleSelectAndClose(address)}
                  activeOpacity={0.7}>
                  <View style={styles.addressCardContent}>
                    <View style={styles.addressCardLeft}>
                      <View style={styles.addressIconRow}>
                        <View style={styles.addressCardIcon}>
                          <AddressIcon type={address.addressType} />
                        </View>
                        <Text style={styles.addressType}>
                          {address.addressType}
                        </Text>
                      </View>
                      <View style={styles.addressDetails}>
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressText}>{address.line1}</Text>
                        <Text style={styles.addressText}>
                          {address.city}, {address.state} - {address.pincode}
                        </Text>
                        <Text style={styles.addressText}>
                          Mobile:{' '}
                          <Text style={styles.white}>{address.mobile}</Text>
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => onEditAddress(address)}
                      style={styles.editButton}>
                      <Edit3 size={16} color="rgba(156,163,175,1)" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              onPress={onAddNewAddress}
              style={styles.addAddressButton}
              activeOpacity={0.7}>
              <Plus size={18} color="rgba(156,163,175,1)" />
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Order Summary and Proceed Button */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
      <View style={styles.summarySection}>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.white}>Item Total</Text>
            <Text style={styles.white}>₹{itemTotal.toFixed(2)}</Text>
          </View>
          {gstRate > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.grayText}>GST ({gstRate}%) included</Text>
              <Text style={styles.grayText}>(₹{gstAmount.toFixed(2)})</Text>
            </View>
          )}

          {calculatingDelivery && !isVariantChanging && (
            <View style={styles.summaryRow}>
              <Text style={[styles.grayText]}>Delivery Charge {(!deliveryAddress || !deliveryAddress?.pincode) && '(Address Required)'}</Text>
              <Text style={[styles.grayText]}>{(!deliveryAddress || !deliveryAddress?.pincode) ? '—':'Calculating...'}</Text>
            </View>
          )}

          {!calculatingDelivery &&
            recommendedOption &&
            !recommendedOption.isSelfShipment && (
              <View style={styles.summaryRow}>
                <Text style={styles.white}>
                  Delivery (Est. {recommendedOption.estimated_days} days)
                </Text>
                <Text style={styles.white}>
                  ₹{recommendedOption.charge.toFixed(2)}
                </Text>
              </View>
            )}

          {!calculatingDelivery && recommendedOption?.isSelfShipment && (
            <View>
              <View style={styles.summaryRow}>
                <Text style={styles.white}>Delivery Charge</Text>
                <Text style={styles.white}>
                  ₹{recommendedOption.charge.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.selfShipmentMessage}>
                {recommendedOption.message}
              </Text>
            </View>
          )}

          {!calculatingDelivery && !recommendedOption && deliveryAddress && (
            <View style={styles.summaryRow}>
              <Text style={styles.errorText}>Delivery</Text>
              <Text style={styles.errorText}>Not available</Text>
            </View>
          )}

          {showSavings && totalSavedAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsText}>Total Savings</Text>
              <Text style={styles.savingsText}>
                - ₹{totalSavedAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalText}>To Pay</Text>
            <Text style={styles.totalText}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          
          {/* Wallet Balance Display - Only show after delivery calculation */}
          {!loadingWallet && walletBalance !== null && (
            <View style={styles.walletBalanceCard}>
              <View style={styles.walletBalanceHeader}>
                <View style={styles.walletIconContainer}>
                  <Wallet size={16} color="#f7ce45" />
                </View>
                <Text style={styles.walletBalanceLabel}>Wallet Balance</Text>
              </View>
              <View style={styles.walletAmountRow}>
                <Text style={styles.walletBalanceAmount}>
                  ₹{(walletBalance || 0).toFixed(2)}
                </Text>
                {!calculatingDelivery && (walletBalance || 0) < totalAmount && (
                  <TouchableOpacity 
                    onPress={handleAddMoney}
                    style={styles.addMoneyInlineButton}
                    activeOpacity={0.7}>
                    <Text style={styles.addMoneyText}>Add Money</Text>
                    <ChevronRight size={14} color="green" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Show calculating state while delivery is being calculated - ONLY if address exists */}
              {calculatingDelivery && !isVariantChanging && deliveryAddress ? (
                <View style={styles.walletCalculatingState}>
                  <ActivityIndicator size="small" color="#f7ce45" />
                  <Text style={styles.walletCalculatingText}>
                    Calculating total amount...
                  </Text>
                </View>
              ) : (
                // Show balance comparison only after delivery calculation OR if no address yet
                <>
                  {(walletBalance || 0) >= totalAmount ? (
                    <View style={styles.walletSufficientBadge}>
                      <Check size={12} color="#22c55e" />
                      <Text style={styles.walletSufficientText}>You can pay with wallet</Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.walletInsufficientText}>
                        Need ₹{(totalAmount - (walletBalance || 0)).toFixed(2)} more to pay with wallet
                      </Text>
                  {/* <TouchableOpacity 
                    onPress={handleAddMoney}
                    style={styles.addMoneyButton}
                    activeOpacity={0.7}>
                    <Text style={styles.addMoneyText}>Add Money</Text>
                    <ChevronRight size={16} color="#f7ce45" />
                  </TouchableOpacity> */}
                    </View>
                  )}
                </>
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
                  <Wallet size={20} color="#f7ce45" />
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
      
      {/* <View style={styles.fixedButtonContainer}> */}
        <TouchableOpacity
          onPress={onNext}
          disabled={
            !deliveryAddress ||
            isProcessing ||
            calculatingDelivery ||
            !recommendedOption ||
            stockStatus?.status === 'sold_out' ||
            stockStatus?.status === 'checking' ||
            stockLoading
          }
          style={[
            styles.proceedButton,
            (!deliveryAddress ||
              isProcessing ||
              calculatingDelivery ||
              !recommendedOption ||
              stockStatus?.status === 'sold_out' ||
              stockStatus?.status === 'checking' ||
              stockLoading) &&
              styles.proceedButtonDisabled,
          ]}
          activeOpacity={0.8}>
          <Text style={styles.proceedButtonText}>
            {!deliveryAddress
              ? 'Add Address to Proceed'
              : stockStatus?.status === 'sold_out' 
              ? 'Sold Out' 
              : stockStatus?.status === 'checking' || stockLoading
              ? 'Checking Stock...'
              : isProcessing 
              ? 'Processing...' 
              : 'Proceed to Payment'}
          </Text>
        </TouchableOpacity>
      {/* </View> */}
      </ScrollView>
{/* </View> */}
      {/* Fixed Proceed Button */}
     
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    // backgroundColor:'red',
    // height:'60%',
    // overflow:'hidden'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    // marginBottom: 6,
    color: 'white',
  },
  productRow: {
    flexDirection: 'row',
    gap: 16,
  },
  productImage: {
    width: 100,
    height: 130,
    borderRadius: 12,
  },
  productDetails: {
    flex: 1,
    gap: 8,
  },
  productTitle: {
    fontWeight: '600',
    color: 'white',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  strikePrice: {
    color: 'rgba(156,163,175,1)',
    textDecorationLine: 'line-through',
    fontSize: 14,
  },
  mrpStrike: {
    fontSize: 14,
    color: 'rgba(107,114,128,1)',
    textDecorationLine: 'line-through',
  },
  flashSaleBanner: {
    padding: 8,
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.2)',
  },
  flashSaleContent: {
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flashSaleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7ce45',
    
    textAlign:'left',
  },
  timerContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  timerText: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    
    color: '#f7ce45',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,250,250,0.9)',
    borderRadius: 20,
    alignSelf: 'flex-start',
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f7ce45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityText: {
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
    color: 'rgba(0,0,0,1)',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressSection: {
    // marginTop: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressContent: {
    flex: 1,
  },
  addressIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  addressIconContainer: {
    padding: 8,
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 8,
  },
  addressType: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: 'white',
  },
  addressDetails: {
    marginLeft: 44,
    gap: 4,
  },
  addressName: {
    fontWeight: '600',
    color: 'white',
    fontSize: 14,
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(156,163,175,1)',
  },
  changeButton: {
    color: '#f7ce45',
    fontWeight: '600',
    fontSize: 14,
  },
  addressList: {
    gap: 4,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  addressCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(55,65,81,1)',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  addressCardSelected: {
    borderColor: '#f7ce45',
    backgroundColor: 'rgba(247,206,69,0.1)',
  },
  addressCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressCardLeft: {
    flex: 1,
  },
  addressCardIcon: {
    padding: 8,
    backgroundColor: 'rgba(31,41,55,1)',
    borderRadius: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
  },
  white: {
    color: 'white',
  },
  addAddressButton: {
    width: '100%',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 10,
    borderColor: 'rgba(55,65,81,1)',
    borderRadius: 16,
  },
  addAddressText: {
    color: 'rgba(156,163,175,1)',
    fontSize: 14,
  },
  summarySection: {
    gap: 8,
    marginBottom: 16,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // flex:2,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(55,65,81,1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  grayText: {
    fontSize: 14,
    color: 'rgba(156,163,175,1)',
  },
  errorText: {
    fontSize: 14,
    color: 'rgba(239,68,68,1)',
  },
  savingsText: {
    color: 'rgba(34,197,94,1)',
    fontWeight: '500',
  },
  selfShipmentMessage: {
    textAlign: 'right',
    color: 'rgba(34,197,94,1)',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(55,65,81,1)',
    marginVertical: 8,
  },
  totalText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  // Unified variant loading overlay styles
  variantLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,206,69,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  variantLoadingText: {
    color: '#f7ce45',
    fontSize: 13,
    fontWeight: '600',
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
  },
  walletAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addMoneyInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
   // backgroundColor: 'rgba(247,206,69,0.15)',
    // borderRadius: 6,
    // borderWidth: 1,
    // borderColor: '#f7ce45',
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
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(247,206,69,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f7ce45',
  },
  addMoneyText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'green',// '#f7ce45',
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
  // New vertical layout styles for full-width product image
  productImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  productImageFull: {
    width: '100%',
    height: '100%',
  },
  flashSaleBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(247,206,69,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  flashSaleBadgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  productDetailsVertical: {
    gap: 12,
  },
  productTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    lineHeight: 24,
  },
  priceRowVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  flashPriceLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  strikePriceLarge: {
    color: 'rgba(156,163,175,1)',
    textDecorationLine: 'line-through',
    fontSize: 16,
  },
  discountBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  discountText: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: 12,
  },
  flashSaleBannerVertical: {
    padding: 10,
    backgroundColor: 'rgba(247,206,69,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.3)',
  },
  flashSaleContentVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flashSaleTextVertical: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f7ce45',
  },
  variantSectionVertical: {
    marginTop: 4,
  },
  quantityStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quantityContainerVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250,250,250,0.95)',
    borderRadius: 24,
    padding: 6,
    gap: 4,
  },
  quantityLabel: {
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '600',
    fontSize: 13,
    marginRight: 4,
    marginLeft: 8,
  },
  quantityButtonVertical: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7ce45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityTextVertical: {
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
    color: 'rgba(0,0,0,1)',
    fontSize: 16,
  },
  stockBadgeVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  itemTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55,65,81,0.5)',
  },
  itemTotalLabel: {
    color: 'rgba(156,163,175,1)',
    fontSize: 14,
    fontWeight: '500',
  },
  itemTotalValue: {
    color: '#f7ce45',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Wallet calculating state styles
  walletCalculatingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  walletCalculatingText: {
    fontSize: 12,
    color: '#f7ce45',
    fontStyle: 'italic',
  },
});

export default Step1_OrderAndAddress;
// import React, {useState, useEffect, useRef, useCallback} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Image,
//   ScrollView,
//   StyleSheet,
//   ActivityIndicator,
// } from 'react-native';
// import {Minus, Plus, Edit3, Home, Briefcase, MapPin, Check, Wallet, ChevronRight} from 'lucide-react-native';
// import {useNavigation} from '@react-navigation/native';
// import axiosCourier from '../../Utils/axiosCourier';
// import axiosInstance from '../../Utils/Api';
// import {AWS_CDN_URL} from '../../Utils/aws';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { getWalletBalance } from '../../Services/walletService';

// // A self-contained, functional countdown timer component.
// const FlashSaleCountdown = ({endTime}) => {
//   const calculateTimeLeft = () => {
//     const difference = +new Date(endTime) - +new Date();
//     let timeLeft = {};

//     if (difference > 0) {
//       timeLeft = {
//         days: Math.floor(difference / (1000 * 60 * 60 * 24)),
//         hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
//         minutes: Math.floor((difference / 1000 / 60) % 60),
//         seconds: Math.floor((difference / 1000) % 60),
//       };
//     }
//     return timeLeft;
//   };

//   const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setTimeLeft(calculateTimeLeft());
//     }, 1000);

//     return () => clearTimeout(timer);
//   });

//   const timerComponents = [];
//   Object.keys(timeLeft).forEach(interval => {
//     if (
//       timeLeft[interval] === 0 &&
//       (interval === 'days' || interval === 'hours')
//     ) {
//       return;
//     }
//     timerComponents.push(
//       <Text key={interval} style={styles.timerText}>
//         {String(timeLeft[interval]).padStart(2, '0')}
//         {interval.charAt(0)}
//       </Text>,
//     );
//   });

//   const renderTimer = () => {
//     if (!timerComponents.length) return <Text>Sale Ended!</Text>;
//     return timerComponents.reduce((prev, curr, idx) => {
//       if (idx === 0) return [curr];
//       return [...prev, <Text key={`sep-${idx}`}>:</Text>, curr];
//     }, []);
//   };

//   return <View style={styles.timerContainer}>{renderTimer()}</View>;
// };

// const AddressIcon = ({type}) => {
//   const iconColor = 'rgba(250,250,250,.62)';
//   const iconSize = 20;

//   switch (type?.toLowerCase()) {
//     case 'home':
//       return <Home size={iconSize} color={iconColor} />;
//     case 'work':
//       return <Briefcase size={iconSize} color={iconColor} />;
//     default:
//       return <MapPin size={iconSize} color={iconColor} />;
//   }
// };

// // Color map for common color names
// const colorMap = {
//   red: '#EF4444',
//   blue: '#3B82F6',
//   green: '#22C55E',
//   yellow: '#EAB308',
//   orange: '#F97316',
//   purple: '#A855F7',
//   pink: '#EC4899',
//   black: '#000000',
//   white: '#FFFFFF',
//   gray: '#6B7280',
//   grey: '#6B7280',
//   brown: '#92400E',
//   navy: '#1E3A5A',
//   beige: '#D4B896',
//   cream: '#FFFDD0',
//   gold: '#FFD700',
//   silver: '#C0C0C0',
//   maroon: '#800000',
//   teal: '#008080',
//   cyan: '#00FFFF',
//   magenta: '#FF00FF',
//   lavender: '#E6E6FA',
//   coral: '#FF7F50',
//   salmon: '#FA8072',
//   olive: '#808000',
//   burgundy: '#800020',
//   charcoal: '#36454F',
//   turquoise: '#40E0D0',
//   mint: '#98FF98',
//   peach: '#FFCBA4',
//   rust: '#B7410E',
//   indigo: '#4B0082',
//   violet: '#8B00FF',
//   rose: '#FF007F',
//   chocolate: '#D2691E',
//   khaki: '#F0E68C',
//   tan: '#D2B48C',
//   amber: '#FFBF00',
//   emerald: '#50C878',
//   ruby: '#E0115F',
//   sapphire: '#0F52BA',
//   multicolor: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
//   rainbow: 'linear-gradient(135deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
// };

// // Helper function to get color value
// const getColorValue = (colorName) => {
//   if (!colorName) return null;
//   const normalizedName = colorName.toLowerCase().trim();
//   return colorMap[normalizedName] || null;
// };

// // Helper function to check if an attribute is a color type
// const isColorAttribute = (key) => {
//   const colorKeys = ['color', 'colour', 'colors', 'colours'];
//   return colorKeys.includes(key.toLowerCase());
// };

// // Variant Selector Component - Updated to match web version
// const VariantSelector = ({
//   variantAttributes,
//   selectedAttributes,
//   onAttributeChange,
//   isAttributeCombinationAvailable,
//   variantLoading,
//   variantMetadata,
//   CDN_BASE_URL,
// }: {
//   variantAttributes: Record<string, string[]>;
//   selectedAttributes: Record<string, string>;
//   onAttributeChange: (key: string, value: string) => void;
//   isAttributeCombinationAvailable: (key: string, value: string) => boolean;
//   variantLoading: boolean;
//   variantMetadata: any[];
//   CDN_BASE_URL: string;
// }) => {
//   if (!variantAttributes || Object.keys(variantAttributes).length === 0) {
//     return null;
//   }

//   // Render color swatch for color attributes - with thumbnail image support
//   const renderColorSwatch = (attributeKey: string, value: string) => {
//     const isSelected = selectedAttributes[attributeKey] === value;
//     const isAvailable = isAttributeCombinationAvailable(attributeKey, value);
//     const colorValue = getColorValue(value);
    
//     // Check if we have thumbnail image for this color variant
//     const colorMetadata = variantMetadata?.find(
//       v => v.variantAttributes?.[attributeKey] === value
//     );
//     const thumbnailUrl = colorMetadata?.thumbnailImage 
//       ? `${CDN_BASE_URL}${colorMetadata.thumbnailImage}` 
//       : colorMetadata?.images?.[0]?.key 
//         ? `${CDN_BASE_URL}${colorMetadata.images[0].key}`
//         : null;
    
//     return (
//       <TouchableOpacity
//         key={value}
//         onPress={() => !variantLoading && isAvailable && onAttributeChange(attributeKey, value)}
//         disabled={variantLoading || !isAvailable}
//         style={[
//           variantStyles.colorSwatch,
//           isSelected && variantStyles.colorSwatchSelected,
//           !isAvailable && variantStyles.colorSwatchUnavailable,
//           variantLoading && variantStyles.variantLoadingState,
//         ]}
//         activeOpacity={0.7}
//       >
//         {thumbnailUrl ? (
//           <Image
//             source={{ uri: thumbnailUrl }}
//             style={variantStyles.colorSwatchImage}
//             resizeMode="cover"
//           />
//         ) : colorValue ? (
//           <View
//             style={[
//               variantStyles.colorSwatchInner,
//               { backgroundColor: colorValue },
//               colorValue === '#FFFFFF' && variantStyles.whiteSwatchBorder,
//             ]}
//           />
//         ) : (
//           <View style={variantStyles.colorSwatchFallback}>
//             <Text style={[
//               variantStyles.colorSwatchFallbackText,
//               { color: value.toLowerCase() === 'black' || value.toLowerCase() === 'blue' ? '#fff' : '#000' }
//             ]} numberOfLines={1}>
//               {value.substring(0, 2).toUpperCase()}
//             </Text>
//           </View>
//         )}
//         {isSelected && (
//           <View style={variantStyles.colorSwatchCheckmark}>
//             <Check size={12} color={colorValue === '#FFFFFF' || colorValue === '#FFFDD0' ? '#000' : '#FFF'} />
//           </View>
//         )}
//         {!isAvailable && (
//           <View style={variantStyles.colorSwatchStrikethrough} />
//         )}
//       </TouchableOpacity>
//     );
//   };

//   // Render scrollable options row for variant attributes
//   const renderOptionsRow = (attributeKey: string, values: string[], isColor: boolean) => {
//     return (
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         contentContainerStyle={variantStyles.variantOptionsScrollContent}
//         style={variantStyles.variantOptionsScroll}
//       >
//         {isColor
//           ? (values as string[]).map((value) => renderColorSwatch(attributeKey, value))
//           : (values as string[]).map((value) => renderOptionButton(attributeKey, value))
//         }
//       </ScrollView>
//     );
//   };

//   // Render regular option button for non-color attributes (like size, storage, etc.)
//   const renderOptionButton = (attributeKey: string, value: string) => {
//     const isSelected = selectedAttributes[attributeKey] === value;
//     const isAvailable = isAttributeCombinationAvailable(attributeKey, value);
    
//     return (
//       <TouchableOpacity
//         key={value}
//         onPress={() => !variantLoading && isAvailable && onAttributeChange(attributeKey, value)}
//         disabled={variantLoading || !isAvailable}
//         style={[
//           variantStyles.variantOption,
//           isSelected && variantStyles.variantOptionSelected,
//           !isAvailable && variantStyles.variantOptionUnavailable,
//           variantLoading && variantStyles.variantLoadingState,
//         ]}
//         activeOpacity={0.7}
//       >
//         <Text
//           style={[
//             variantStyles.variantOptionText,
//             isSelected && variantStyles.variantOptionTextSelected,
//             !isAvailable && variantStyles.variantOptionTextUnavailable,
//           ]}
//         >
//           {value}
//         </Text>
//         {!isAvailable && (
//           <View style={variantStyles.variantOptionStrikethrough} />
//         )}
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={variantStyles.variantSelectorContainer}>
//       {Object.entries(variantAttributes).map(([attributeKey, values]) => {
//         const selectedValue = selectedAttributes[attributeKey];
//         const attributeLabel = attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1);
        
//         return (
//           <View key={attributeKey} style={variantStyles.variantAttributeGroup}>
//             <View style={variantStyles.variantAttributeLabelRow}>
//               <Text style={variantStyles.variantAttributeLabel}>
//                 Select {attributeLabel}:
//               </Text>
//               {selectedValue && (
//                 <Text style={variantStyles.selectedAttributeValue}>
//                   {selectedValue}
//                 </Text>
//               )}
//               {/* Removed individual spinner - unified loading overlay handles this now */}
//             </View>
//             {renderOptionsRow(attributeKey, values as string[], isColorAttribute(attributeKey))}
//           </View>
//         );
//       })}
//     </View>
//   );
// };

// // Variant-specific styles
// const variantStyles = StyleSheet.create({
//   variantSelectorContainer: {
//     marginTop: 8,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(55,65,81,1)',
//   },
//   variantAttributeGroup: {
//     marginBottom: 12,
//   },
//   variantAttributeLabelRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//     flexWrap: 'wrap',
//   },
//   variantAttributeLabel: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 13,
//   },
//   selectedAttributeValue: {
//     color: '#f7ce45',
//     fontWeight: 'bold',
//     fontSize: 13,
//     marginLeft: 4,
//   },
//   variantOptionsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   variantOptionsScroll: {
//     flexGrow: 0,
//   },
//   variantOptionsScrollContent: {
//     flexDirection: 'row',
//     gap: 8,
//     paddingRight: 8,
//   },
//   // Color swatch styles
//   colorSwatch: {
//     width: 56,
//     height: 56,
//     borderRadius: 8,
//     overflow: 'hidden',
//     borderWidth: 2,
//     borderColor: 'rgba(75,85,99,1)',
//     position: 'relative',
//   },
//   colorSwatchSelected: {
//     borderColor: '#f7ce45',
//     shadowColor: '#f7ce45',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   colorSwatchUnavailable: {
//     opacity: 0.4,
//     borderColor: 'rgba(55,65,81,1)',
//   },
//   colorSwatchImage: {
//     width: '100%',
//     height: '100%',
//   },
//   colorSwatchInner: {
//     width: '100%',
//     height: '100%',
//   },
//   whiteSwatchBorder: {
//     borderWidth: 1,
//     borderColor: 'rgba(156,163,175,0.5)',
//   },
//   colorSwatchFallback: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: 'rgba(107,114,128,1)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   colorSwatchFallbackText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   colorSwatchCheckmark: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(247,206,69,0.2)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   colorSwatchStrikethrough: {
//     position: 'absolute',
//     top: '50%',
//     left: -5,
//     right: -5,
//     height: 2,
//     backgroundColor: 'rgba(239,68,68,0.8)',
//     transform: [{ rotate: '-45deg' }],
//   },
//   // Regular variant option styles
//   variantOption: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: 'rgba(75,85,99,1)',
//     backgroundColor: 'rgba(31,41,55,1)',
//     position: 'relative',
//     minWidth: 50,
//     alignItems: 'center',
//   },
//   variantOptionSelected: {
//     backgroundColor: '#f7ce45',
//     borderColor: '#f7ce45',
//   },
//   variantOptionUnavailable: {
//     opacity: 0.4,
//     borderColor: 'rgba(55,65,81,1)',
//     backgroundColor: 'rgba(31,41,55,1)',
//   },
//   variantOptionText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   variantOptionTextSelected: {
//     color: '#000',
//   },
//   variantOptionTextUnavailable: {
//     color: 'rgba(107,114,128,1)',
//     textDecorationLine: 'line-through',
//   },
//   variantOptionStrikethrough: {
//     position: 'absolute',
//     top: '50%',
//     left: 0,
//     right: 0,
//     height: 1,
//     backgroundColor: 'rgba(239,68,68,0.6)',
//   },
//   variantLoadingState: {
//     opacity: 0.5,
//   },
// });

// const Step1_OrderAndAddress = ({
//   orderData,
//   addresses,
//   loading,
//   onQuantityChange,
//   onSelectAddress,
//   onDeliveryChargeUpdate,
//   onAddNewAddress,
//   onEditAddress,
//   onNext,
//   isProcessing,
//   stockData: _stockData,
//   stockLoading,
//   stockStatus,
//   // Variant props
//   hasVariants = false,
//   variantAttributes = {},
//   selectedAttributes = {},
//   onAttributeChange = () => {},
//   isAttributeCombinationAvailable = () => true,
//   variantLoading = false,
//   variantMetadata = [],
//   CDN_BASE_URL = '',
//   isVariantChanging = false, // Unified loading state for variant changes
//   // Payment method props
//   selectedPaymentMethod,
//   onPaymentMethodChange,
//   // Modal control
//   onClose,
// }) => {
//   const navigation = useNavigation();
//   const [isAddressListOpen, setAddressListOpen] = useState(false);
//   const [sellerPincode, setSellerPincode] = useState(null);
//   const [recommendedOption, setRecommendedOption] = useState(null);
//   const [calculatingDelivery, setCalculatingDelivery] = useState(true); // Start as true to show loader initially
  
//   // Wallet balance state
//   const [walletBalance, setWalletBalance] = useState(null);
//   const [loadingWallet, setLoadingWallet] = useState(true);

//   const item = orderData.products[0];
//   const {product, quantity} = item || {};
//   const {deliveryCharge, deliveryAddress} = orderData;
//   const isMountedRef = useRef(true);

//   // Handle navigation to wallet page
//   const handleAddMoney = useCallback(() => {
//     // Close the modal first if onClose is provided
//     if (onClose) {
//       onClose();
//     }
//     // Then navigate to wallet page
//     navigation.navigate('WalletPage');
//   }, [navigation, onClose]);

//   // Fetch wallet balance
//   useEffect(() => {
//     const fetchWallet = async () => {
//       try {
//         const data = await getWalletBalance();
//         setWalletBalance(data.availableBalance || data.balance || 0);
//       } catch (error) {
//         console.error('Failed to fetch wallet balance:', error);
//         setWalletBalance(0);
//       } finally {
//         setLoadingWallet(false);
//       }
//     };
//     fetchWallet();
//   }, []);

//   useEffect(() => {
//     const fetchSellerPincode = async () => {
//       if (!product?._id) return;
//       try {
//         const response = await axiosInstance.get(
//           `/courier/seller-pincode/${product._id}`,
//         );
//         if (response.data.status) {
//           setSellerPincode(response.data.pincode);
//         }
//       } catch (error) {
//         console.log('Failed to fetch seller pincode:', error.response.data);
//       }
//     };
//     fetchSellerPincode();
//   }, [product]);

//   // Track previous values to prevent unnecessary API calls
//   const prevCalculationRef = useRef({
//     sellerPincode: null,
//     buyerPincode: null,
//     quantity: 0,
//     productId: null
//   });

//   useEffect(() => {
//     const calculateDeliveryCharges = async () => {
//       if (
//         !sellerPincode ||
//         !deliveryAddress?.pincode ||
//         !product?.weight ||
//         !isMountedRef.current
//       ) {
//         // If required data is not available, set calculatingDelivery to false
//         if (isMountedRef.current) {
//           setCalculatingDelivery(false);
//         }
//         return;
//       }

//       // Check if we've already calculated for these exact values
//       const currentValues = {
//         sellerPincode,
//         buyerPincode: deliveryAddress.pincode,
//         quantity,
//         productId: product._id
//       };

//       const hasChanged = 
//         prevCalculationRef.current.sellerPincode !== currentValues.sellerPincode ||
//         prevCalculationRef.current.buyerPincode !== currentValues.buyerPincode ||
//         prevCalculationRef.current.quantity !== currentValues.quantity ||
//         prevCalculationRef.current.productId !== currentValues.productId;

//       if (!hasChanged) {
//         return; // Skip if nothing changed
//       }

//       prevCalculationRef.current = currentValues;

//       setCalculatingDelivery(true);
//       setRecommendedOption(null);
//       onDeliveryChargeUpdate(null);

//       // Check preferred shipping method
//       const seller=product?.seller||product?.sellerId
//       const preferredShipping = seller?.shippingInfo?.preferredShipping?.toLowerCase();
//       const isFlykupShipping = preferredShipping === 'flykup' || preferredShipping === 'flykuplogistics'|| preferredShipping === 'flykupLogistics';
// // console.log("PREFFERED SHIPPING", seller)
//       // If not flykup or flykupLogistics, use fallback delivery charge immediately
//       if (!isFlykupShipping) {
//         if (isMountedRef.current) {
//           console.log("FALLBACK APPLYIES ")
//           const fallbackCharge = product.deliveryCharge || 30;
//           const fallbackOption = {
//             charge: fallbackCharge,
//             isSelfShipment: true,
//             message: 'This item will be shipped directly by the seller.',
//           };
//           setRecommendedOption(fallbackOption);
//           onDeliveryChargeUpdate(fallbackCharge, 'self_shipment');
//           setCalculatingDelivery(false);
//         }
//         return;
//       }

//       // Proceed with flykup logistics calculation for flykup/flykupLogistics
//       try {
//         const weightValue = product.weight.value || 0;
//         const weightUnit = product.weight.unit || 'grams';
//         let totalWeight = weightValue * quantity;
//         if (weightUnit === 'grams') {
//           totalWeight = totalWeight / 1000;
//         }

//         const currentPrice = product.flashSale?.isActive
//           ? product.flashSale.flashPrice
//           : product.productPrice;
//         const itemTotalValue = currentPrice * quantity;
//         // console.log({
//         //           seller_pincode: sellerPincode,
//         //           customer_pincode: deliveryAddress.pincode,
//         //           product_weight: totalWeight,
//         //           weight_unit: 'kg',
//         //           order_value: itemTotalValue,
//         //           payment_mode: 'prepaid',
//         //           order_date: new Date().toISOString().split('T')[0],
//         //         })
//         const response = await axiosCourier.post(
//           '/business/calculate-delivery',
//           {
//             seller_pincode: sellerPincode,
//             customer_pincode: deliveryAddress.pincode,
//             product_weight: totalWeight,
//             weight_unit: 'kg',
//             order_value: itemTotalValue,
//             payment_mode: 'prepaid',
//             order_date: new Date().toISOString().split('T')[0],
//           },
//         );
// // console.log('Courier response:', response.data.data);
//         if (
//           isMountedRef.current &&
//           response.data.success &&
//           response.data.data?.recommended_courier
//         ) {
//           const recommended = response.data.data.recommended_courier;
//           const option = {
//             charge: recommended.delivery_charges,
//             estimated_days: recommended.estimated_days,
//             isSelfShipment: false,
//           };
//           setRecommendedOption(option);
//           onDeliveryChargeUpdate(option.charge, 'flykup_logistics');
//         } else if (isMountedRef.current) {
//           console.log('Courier not available, falling back to self-shipment.');
//           const fallbackCharge = product.deliveryCharge || 40;
//           const fallbackOption = {
//             charge: fallbackCharge,
//             isSelfShipment: true,
//             message: 'This item will be shipped directly by the seller.',
//           };
//           setRecommendedOption(fallbackOption);
//           onDeliveryChargeUpdate(fallbackCharge, 'self_shipment');
//         }
//       } catch (error) {
//         if (isMountedRef.current) {
//           console.error('Failed to calculate delivery charges:', error);
//           // Fallback to self-shipment on error
//           const fallbackCharge = product.deliveryCharge || 40;
//           const fallbackOption = {
//             charge: fallbackCharge,
//             isSelfShipment: true,
//             message: 'Delivery calculation unavailable. Using seller shipping.',
//           };
//           setRecommendedOption(fallbackOption);
//           onDeliveryChargeUpdate(fallbackCharge, 'self_shipment');
//         }
//       } finally {
//         if (isMountedRef.current) {
//           setCalculatingDelivery(false);
//         }
//       }
//     };

//     if (
//       isMountedRef.current &&
//       sellerPincode &&
//       deliveryAddress?.pincode &&
//       product?.weight
//     ) {
//       calculateDeliveryCharges();
//     }
//   }, [
//     sellerPincode,
//     deliveryAddress?.pincode,
//     quantity,
//     product?._id,
//     product?.weight,
//     product?.flashSale?.isActive,
//     product?.flashSale?.flashPrice,
//     product?.productPrice,
//     product?.deliveryCharge,
//     product?.seller?.shippingInfo?.preferredShipping,
//     onDeliveryChargeUpdate
//   ]);

//   if (!item || !product) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#f7ce45" />
//       </View>
//     );
//   }

//   const {gstAmount, gstRate} = item;

//   const isFlashSaleActive = product.flashSale?.isActive;
//   let productImageUrl = '/placeholder.svg?height=80&width=80&text=Product';
//   if (product.signedImages?.[0]) {
//     productImageUrl = product.signedImages[0];
//   } else if (product.images?.[0]?.key) {
//     productImageUrl = `${AWS_CDN_URL}${product.images[0].key}`;
//   }

//   const currentPrice = isFlashSaleActive
//     ? product.flashSale.flashPrice
//     : product.productPrice;
//   const itemTotal = currentPrice * quantity;

//   const totalAmount = itemTotal + (deliveryCharge || 0);

//   const showSavings =
//     isFlashSaleActive || (product.MRP && product.productPrice < product.MRP);
//   let totalSavedAmount = 0;
//   if (isFlashSaleActive) {
//     totalSavedAmount =
//       (product.MRP - product.flashSale.flashPrice) * quantity;
//   } else if (product.MRP && product.productPrice < product.MRP) {
//     totalSavedAmount = (product.MRP - product.productPrice) * quantity;
//   }

//   const handleSelectAndClose = address => {
//     onSelectAddress(address);
//     setAddressListOpen(false);

//   };
//   // console.log(product) 

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* <View style={{ flex:1
//         // maxHeight:'60%'
//                 ,borderWidth:2,borderColor:'green'}}> */}
//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.contentContainer}>
//         {/* Order Review Section */}
//         <Text style={styles.sectionTitle}>Review Your Order</Text>
//       <View style={styles.card}>
//         <View style={styles.productRow}>
//           <Image
//             source={{uri: productImageUrl}}
//             style={styles.productImage}
//             resizeMode="contain"
//           />
//           <View style={styles.productDetails}>
//             <Text style={styles.productTitle}>{product.title}</Text>
            
//             {/* Variant Selector - Display when product has variants */}
           
//             <View style={styles.priceRow}>
//               {isFlashSaleActive ? (
//                 <>
//                   <Text style={styles.flashPrice}>
//                     ₹{product.flashSale.flashPrice}
//                   </Text>
//                   <Text style={styles.strikePrice}>
//                     ₹{product.MRP}
//                   </Text>
//                 </>
//               ) : (
//                 <View style={styles.priceRow}>
//                   {product.MRP && product.productPrice < product.MRP && (
//                     <Text style={styles.mrpStrike}>₹{product.MRP}</Text>
//                   )}
//                   <Text style={styles.flashPrice}>₹{product.productPrice}</Text>
//                 </View>
//               )}
//             </View>
//             {isFlashSaleActive && product.flashSale.endsAt && (
//               <View style={styles.flashSaleBanner}>
//                 <View style={styles.flashSaleContent}>
//                   <Text style={styles.flashSaleText}>Flash Sale Ends in:</Text>
//                   <FlashSaleCountdown endTime={product.flashSale.endsAt} />
//                 </View>
//               </View>
//             )}
            
//             <View>
//               <View style={styles.quantityContainer}>
//                 <TouchableOpacity
//                   onPress={() => onQuantityChange(quantity - 1)}
//                   style={styles.quantityButton}
//                   disabled={quantity <= 1 || isProcessing}>
//                   <Minus size={12} color="rgba(0,0,0,1)" />
//                 </TouchableOpacity>
//                 <Text style={styles.quantityText}>{quantity}</Text>
//                 <TouchableOpacity
//                   onPress={() => onQuantityChange(quantity + 1)}
//                   style={[
//                     styles.quantityButton,
//                     isProcessing && styles.quantityButtonDisabled,
//                   ]}
//                   disabled={isProcessing}>
//                   <Plus size={12} color="rgba(0,0,0,1)" />
//                 </TouchableOpacity>
//               </View>
//               <View
//                 style={{flexDirection: 'row', gap: 2, alignItems: 'center'}}>
//                 {/* Stock Status Badge - Hide during variant change to prevent multiple loaders */}
//                 {!isVariantChanging && (
//                   stockLoading ? (
//                     <View style={styles.stockBadge}>
//                       <ActivityIndicator size="small" color="#9ca3af" />
//                       <Text style={[styles.stockText, {color: '#9ca3af'}]}>
//                         Checking stock...
//                       </Text>
//                     </View>
//                   ) : (
//                     stockStatus && (
//                       <View
//                         style={[
//                           styles.stockBadge,
//                           {backgroundColor: `${stockStatus.color}15`},
//                         ]}>
//                         <Text
//                           style={[styles.stockText, {color: stockStatus.color}]}>
//                           {stockStatus.message}
//                         </Text>
//                       </View>
//                     )
//                   )
//                 )}
//                {!stockLoading&&<View className="flex-row gap-2">
//                   <Text
//                     style={{
//                       color: '#ccc',
//                       fontSize: 12,
//                       fontStyle: 'italic',
//                       marginTop: 8,
//                     }}>
//                     Total:
//                   </Text>
//                   <Text
//                     style={{
//                       color: '#fff',
//                       fontSize: 12,
//                       fontStyle: 'italic',
//                       marginTop: 8,
//                     }}>
//                     ₹{itemTotal}
//                   </Text>
//                 </View>}
//               </View>
//             </View>
//              {hasVariants && Object.keys(variantAttributes).length > 0 && (
//               <View>
//                 {/* Unified loading overlay for variant changes */}
//                 {isVariantChanging && (
//                   <View style={styles.variantLoadingOverlay}>
//                     <ActivityIndicator size="small" color="#f7ce45" />
//                     <Text style={styles.variantLoadingText}>Updating variant...</Text>
//                   </View>
//                 )}
//                 <VariantSelector
//                   variantAttributes={variantAttributes}
//                   selectedAttributes={selectedAttributes}
//                   onAttributeChange={onAttributeChange}
//                   isAttributeCombinationAvailable={isAttributeCombinationAvailable}
//                   variantLoading={variantLoading}
//                   variantMetadata={variantMetadata}
//                   CDN_BASE_URL={CDN_BASE_URL}
//                 />
//               </View>
//             )}
            
//           </View>
//         </View>
//       </View>

//       {/* Address Section */}
//         <Text style={styles.sectionTitle}>Delivery Address</Text>
//       <View style={styles.addressSection}>
//         {!isAddressListOpen && deliveryAddress && (
//           <View style={styles.card}>
//             <View style={styles.addressHeader}>
//               <View style={styles.addressContent}>
//                 <View style={styles.addressIconRow}>
//                   <View style={styles.addressIconContainer}>
//                     <AddressIcon type={deliveryAddress.addressType} />
//                   </View>
//                   <Text style={styles.addressType}>
//                     {deliveryAddress.addressType}
//                   </Text>
//                 </View>
//                 <View style={styles.addressDetails}>
//                   <Text style={styles.addressName}>{deliveryAddress.name}</Text>
//                   <Text style={styles.addressText}>
//                     {deliveryAddress.line1}
//                   </Text>
//                   <Text style={styles.addressText}>
//                     {deliveryAddress.city}, {deliveryAddress.state} -{' '}
//                     {deliveryAddress.pincode}
//                   </Text>
//                   <Text style={styles.addressText}>
//                     Mobile:{' '}
//                     <Text style={styles.addressName}>
//                       {deliveryAddress.mobile}
//                     </Text>
//                   </Text>
//                 </View>
//               </View>
//               <TouchableOpacity onPress={() => setAddressListOpen(true)}>
//                 <Text style={styles.changeButton}>Change</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {(isAddressListOpen || !deliveryAddress) && (
//           <View style={styles.addressList}>
//             {loading && (
//               <View style={styles.loadingContainer}>
//                 <ActivityIndicator size="large" color="#f7ce45" />
//               </View>
//             )}
//             {!loading &&
//               addresses?.map(address => (
//                 <TouchableOpacity
//                   key={address._id}
//                   style={[
//                     styles.addressCard,
//                     deliveryAddress?._id === address._id &&
//                       styles.addressCardSelected,
//                   ]}
//                   onPress={() => handleSelectAndClose(address)}
//                   activeOpacity={0.7}>
//                   <View style={styles.addressCardContent}>
//                     <View style={styles.addressCardLeft}>
//                       <View style={styles.addressIconRow}>
//                         <View style={styles.addressCardIcon}>
//                           <AddressIcon type={address.addressType} />
//                         </View>
//                         <Text style={styles.addressType}>
//                           {address.addressType}
//                         </Text>
//                       </View>
//                       <View style={styles.addressDetails}>
//                         <Text style={styles.addressName}>{address.name}</Text>
//                         <Text style={styles.addressText}>{address.line1}</Text>
//                         <Text style={styles.addressText}>
//                           {address.city}, {address.state} - {address.pincode}
//                         </Text>
//                         <Text style={styles.addressText}>
//                           Mobile:{' '}
//                           <Text style={styles.white}>{address.mobile}</Text>
//                         </Text>
//                       </View>
//                     </View>
//                     <TouchableOpacity
//                       onPress={() => onEditAddress(address)}
//                       style={styles.editButton}>
//                       <Edit3 size={16} color="rgba(156,163,175,1)" />
//                     </TouchableOpacity>
//                   </View>
//                 </TouchableOpacity>
//               ))}
//             <TouchableOpacity
//               onPress={onAddNewAddress}
//               style={styles.addAddressButton}
//               activeOpacity={0.7}>
//               <Plus size={18} color="rgba(156,163,175,1)" />
//               <Text style={styles.addAddressText}>Add New Address</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>

//       {/* Order Summary and Proceed Button */}
//           <Text style={styles.sectionTitle}>Order Summary</Text>
//       <View style={styles.summarySection}>
//         <View style={styles.card}>
//           <View style={styles.summaryRow}>
//             <Text style={styles.white}>Item Total</Text>
//             <Text style={styles.white}>₹{itemTotal.toFixed(2)}</Text>
//           </View>
//           {gstRate > 0 && (
//             <View style={styles.summaryRow}>
//               <Text style={styles.grayText}>GST ({gstRate}%) included</Text>
//               <Text style={styles.grayText}>(₹{gstAmount.toFixed(2)})</Text>
//             </View>
//           )}

//           {calculatingDelivery && !isVariantChanging && (
//             <View style={styles.summaryRow}>
//               <Text style={styles.grayText}>Delivery Charge</Text>
//               <Text style={styles.grayText}>Calculating...</Text>
//             </View>
//           )}

//           {!calculatingDelivery &&
//             recommendedOption &&
//             !recommendedOption.isSelfShipment && (
//               <View style={styles.summaryRow}>
//                 <Text style={styles.white}>
//                   Delivery (Est. {recommendedOption.estimated_days} days)
//                 </Text>
//                 <Text style={styles.white}>
//                   ₹{recommendedOption.charge.toFixed(2)}
//                 </Text>
//               </View>
//             )}

//           {!calculatingDelivery && recommendedOption?.isSelfShipment && (
//             <View>
//               <View style={styles.summaryRow}>
//                 <Text style={styles.white}>Delivery Charge</Text>
//                 <Text style={styles.white}>
//                   ₹{recommendedOption.charge.toFixed(2)}
//                 </Text>
//               </View>
//               <Text style={styles.selfShipmentMessage}>
//                 {recommendedOption.message}
//               </Text>
//             </View>
//           )}

//           {!calculatingDelivery && !recommendedOption && deliveryAddress && (
//             <View style={styles.summaryRow}>
//               <Text style={styles.errorText}>Delivery</Text>
//               <Text style={styles.errorText}>Not available</Text>
//             </View>
//           )}

//           {showSavings && totalSavedAmount > 0 && (
//             <View style={styles.summaryRow}>
//               <Text style={styles.savingsText}>Total Savings</Text>
//               <Text style={styles.savingsText}>
//                 - ₹{totalSavedAmount.toFixed(2)}
//               </Text>
//             </View>
//           )}

//           <View style={styles.divider} />
//           <View style={styles.summaryRow}>
//             <Text style={styles.totalText}>To Pay</Text>
//             <Text style={styles.totalText}>₹{totalAmount.toFixed(2)}</Text>
//           </View>
          
//           {/* Wallet Balance Display */}
//           {!loadingWallet && walletBalance !== null && (
//             <View style={styles.walletBalanceCard}>
//               <View style={styles.walletBalanceHeader}>
//                 <View style={styles.walletIconContainer}>
//                   <Wallet size={16} color="#f7ce45" />
//                 </View>
//                 <Text style={styles.walletBalanceLabel}>Wallet Balance</Text>
//               </View>
//               <View style={styles.walletAmountRow}>
//                 <Text style={styles.walletBalanceAmount}>
//                   ₹{(walletBalance || 0).toFixed(2)}
//                 </Text>
//                 {(walletBalance || 0) < totalAmount && (
//                   <TouchableOpacity 
//                     onPress={handleAddMoney}
//                     style={styles.addMoneyInlineButton}
//                     activeOpacity={0.7}>
//                     <Text style={styles.addMoneyText}>Add Money</Text>
//                     <ChevronRight size={14} 
//                   color="green"
//                   // color="#f7ce45"
//                    />
//               </TouchableOpacity>
//                 )}
//               </View>
//               {(walletBalance || 0) >= totalAmount ? (
//                 <View style={styles.walletSufficientBadge}>
//                   <Check size={12} color="#22c55e" />
//                   <Text style={styles.walletSufficientText}>You can pay with wallet</Text>
//                 </View>
//               ) : (
//                 <View>
//                 <Text style={styles.walletInsufficientText}>
//                   Need ₹{(totalAmount - (walletBalance || 0)).toFixed(2)} more to pay with wallet
//                 </Text>
//                   {/* <TouchableOpacity 
//                     onPress={handleAddMoney}
//                     style={styles.addMoneyButton}
//                     activeOpacity={0.7}>
//                     <Text style={styles.addMoneyText}>Add Money</Text>
//                     <ChevronRight size={16} color="#f7ce45" />
//                   </TouchableOpacity> */}
//                 </View>
//               )}
//             </View>
//           )}
          
//           {/* Payment Method Selection */}
//           <View style={styles.paymentMethodCard}>
//             <View style={styles.paymentMethodHeader}>
//               <Text style={styles.paymentMethodTitle}>Select Payment Method</Text>
//               <Text style={styles.paymentMethodRequired}>(Required)</Text>
//             </View>
            
//             {/* Wallet Option */}
//             <TouchableOpacity
//               onPress={() => onPaymentMethodChange && onPaymentMethodChange('WALLET')}
//               disabled={(walletBalance || 0) < totalAmount}
//               style={[
//                 styles.paymentOption,
//                 selectedPaymentMethod === 'WALLET' && styles.paymentOptionSelected,
//                 (walletBalance || 0) < totalAmount && styles.paymentOptionDisabled,
//               ]}
//               activeOpacity={0.7}>
//               <View style={styles.radioButton}>
//                 {selectedPaymentMethod === 'WALLET' && <View style={styles.radioButtonInner} />}
//               </View>
//               <View style={styles.paymentOptionContent}>
//                 <View style={styles.paymentOptionHeader}>
//                   <Wallet size={20} color="#f7ce45" />
//                   <Text style={styles.paymentOptionTitle}>Wallet Payment</Text>
//                 </View>
//                 <Text style={[
//                   styles.paymentOptionSubtext,
//                   (walletBalance || 0) >= totalAmount ? styles.sufficientBalance : styles.insufficientBalance
//                 ]}>
//                   {(walletBalance || 0) >= totalAmount 
//                     ? '✓ Sufficient balance' 
//                     : `Insufficient (Need ₹${(totalAmount - (walletBalance || 0)).toFixed(2)} more)`}
//                 </Text>
//               </View>
//               <Text style={styles.paymentOptionAmount}>₹{(walletBalance || 0).toFixed(2)}</Text>
//             </TouchableOpacity>
            
//             {/* Razorpay Option */}
//             <TouchableOpacity
//               onPress={() => onPaymentMethodChange && onPaymentMethodChange('RAZORPAY')}
//               style={[
//                 styles.paymentOption,
//                 selectedPaymentMethod === 'RAZORPAY' && styles.paymentOptionSelected,
//               ]}
//               activeOpacity={0.7}>
//               <View style={styles.radioButton}>
//                 {selectedPaymentMethod === 'RAZORPAY' && <View style={styles.radioButtonInner} />}
//               </View>
//               <View style={styles.paymentOptionContent}>
//                 <View style={styles.paymentOptionHeader}>
//                   <View style={styles.razorpayIcon}>
//                     <Text style={styles.razorpayIconText}>₹</Text>
//                   </View>
//                   <Text style={styles.paymentOptionTitle}>Pay using</Text>
//                 </View>
//                 <Text style={styles.paymentOptionSubtext}>UPI • Cards • Net Banking</Text>
//               </View>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View> 
      
//       {/* <View style={styles.fixedButtonContainer}> */}
//         <TouchableOpacity
//           onPress={onNext}
//           disabled={
//             !deliveryAddress ||
//             isProcessing ||
//             calculatingDelivery ||
//             !recommendedOption ||
//             stockStatus?.status === 'sold_out' ||
//             stockStatus?.status === 'checking' ||
//             stockLoading
//           }
//           style={[
//             styles.proceedButton,
//             (!deliveryAddress ||
//               isProcessing ||
//               calculatingDelivery ||
//               !recommendedOption ||
//               stockStatus?.status === 'sold_out' ||
//               stockStatus?.status === 'checking' ||
//               stockLoading) &&
//               styles.proceedButtonDisabled,
//           ]}
//           activeOpacity={0.8}>
//           <Text style={styles.proceedButtonText}>
//             {stockStatus?.status === 'sold_out' 
//               ? 'Sold Out' 
//               : stockStatus?.status === 'checking' || stockLoading
//               ? 'Checking Stock...'
//               : isProcessing 
//               ? 'Processing...' 
//               : 'Proceed to Payment'}
//           </Text>
//         </TouchableOpacity>
//       {/* </View> */}
//       </ScrollView>
// {/* </View> */}
//       {/* Fixed Proceed Button */}
     
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//     // backgroundColor:'red',
//     // height:'60%',
//     // overflow:'hidden'
//   },
//   contentContainer: {
//     padding: 16,
//     paddingBottom: 100,
//     gap: 8,
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   card: {
//     backgroundColor: 'rgba(0,0,0,0.8)',
//     borderRadius: 16,
//     padding: 16,
//     borderWidth: 1,
//     borderColor: 'rgba(55,65,81,1)',
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     // marginBottom: 6,
//     color: 'white',
//   },
//   productRow: {
//     flexDirection: 'row',
//     gap: 16,
//   },
//   productImage: {
//     width: 100,
//     height: 130,
//     borderRadius: 12,
//   },
//   productDetails: {
//     flex: 1,
//     gap: 8,
//   },
//   productTitle: {
//     fontWeight: '600',
//     color: 'white',
//   },
//   priceRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   flashPrice: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#f7ce45',
//   },
//   strikePrice: {
//     color: 'rgba(156,163,175,1)',
//     textDecorationLine: 'line-through',
//     fontSize: 14,
//   },
//   mrpStrike: {
//     fontSize: 14,
//     color: 'rgba(107,114,128,1)',
//     textDecorationLine: 'line-through',
//   },
//   flashSaleBanner: {
//     padding: 8,
//     backgroundColor: 'rgba(247,206,69,0.1)',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(247,206,69,0.2)',
//   },
//   flashSaleContent: {
//     // flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   flashSaleText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#f7ce45',
    
//     textAlign:'left',
//   },
//   timerContainer: {
//     flexDirection: 'row',
//     gap: 4,
//   },
//   timerText: {
//     fontFamily: 'monospace',
//     fontWeight: 'bold',
    
//     color: '#f7ce45',
//   },
//   quantityContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(250,250,250,0.9)',
//     borderRadius: 20,
//     alignSelf: 'flex-start',
//     padding: 4,
//   },
//   quantityButton: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     backgroundColor: '#f7ce45',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   quantityButtonDisabled: {
//     opacity: 0.4,
//   },
//   quantityText: {
//     fontWeight: 'bold',
//     width: 40,
//     textAlign: 'center',
//     color: 'rgba(0,0,0,1)',
//   },
//   stockBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 8,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     alignSelf: 'flex-start',
//     gap: 6,
//   },
//   stockText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   addressSection: {
//     // marginTop: 8,
//   },
//   addressHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//   },
//   addressContent: {
//     flex: 1,
//   },
//   addressIconRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     marginBottom: 12,
//   },
//   addressIconContainer: {
//     padding: 8,
//     backgroundColor: 'rgba(247,206,69,0.1)',
//     borderRadius: 8,
//   },
//   addressType: {
//     fontWeight: 'bold',
//     textTransform: 'capitalize',
//     color: 'white',
//   },
//   addressDetails: {
//     marginLeft: 44,
//     gap: 4,
//   },
//   addressName: {
//     fontWeight: '600',
//     color: 'white',
//     fontSize: 14,
//   },
//   addressText: {
//     fontSize: 14,
//     color: 'rgba(156,163,175,1)',
//   },
//   changeButton: {
//     color: '#f7ce45',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   addressList: {
//     gap: 4,
//   },
//   loadingContainer: {
//     paddingVertical: 32,
//     alignItems: 'center',
//   },
//   addressCard: {
//     padding: 16,
//     borderRadius: 16,
//     borderWidth: 2,
//     borderColor: 'rgba(55,65,81,1)',
//     backgroundColor: 'rgba(0,0,0,0.8)',
//   },
//   addressCardSelected: {
//     borderColor: '#f7ce45',
//     backgroundColor: 'rgba(247,206,69,0.1)',
//   },
//   addressCardContent: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   addressCardLeft: {
//     flex: 1,
//   },
//   addressCardIcon: {
//     padding: 8,
//     backgroundColor: 'rgba(31,41,55,1)',
//     borderRadius: 8,
//   },
//   editButton: {
//     padding: 8,
//     borderRadius: 20,
//   },
//   white: {
//     color: 'white',
//   },
//   addAddressButton: {
//     width: '100%',
//     paddingVertical: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     borderWidth: 2,
//     borderStyle: 'dashed',
//     marginTop: 10,
//     borderColor: 'rgba(55,65,81,1)',
//     borderRadius: 16,
//   },
//   addAddressText: {
//     color: 'rgba(156,163,175,1)',
//     fontSize: 14,
//   },
//   summarySection: {
//     gap: 8,
//     marginBottom: 16,
//   },
//   fixedButtonContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     // flex:2,
//     padding: 16,
//     backgroundColor: '#1e1e1e',
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(55,65,81,1)',
//   },
//   summaryRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginVertical: 4,
//   },
//   grayText: {
//     fontSize: 14,
//     color: 'rgba(156,163,175,1)',
//   },
//   errorText: {
//     fontSize: 14,
//     color: 'rgba(239,68,68,1)',
//   },
//   savingsText: {
//     color: 'rgba(34,197,94,1)',
//     fontWeight: '500',
//   },
//   selfShipmentMessage: {
//     textAlign: 'right',
//     color: 'rgba(34,197,94,1)',
//     fontSize: 12,
//     marginTop: 4,
//   },
//   divider: {
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(55,65,81,1)',
//     marginVertical: 8,
//   },
//   totalText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   proceedButton: {
//     width: '100%',
//     backgroundColor: '#f7ce45',
//     paddingVertical: 12,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   proceedButtonDisabled: {
//     opacity: 0.5,
//   },
//   proceedButtonText: {
//     color: 'black',
//     fontWeight: 'bold',
//     fontSize: 18,
//   },
//   // Unified variant loading overlay styles
//   variantLoadingOverlay: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(247,206,69,0.15)',
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     marginBottom: 8,
//     gap: 8,
//   },
//   variantLoadingText: {
//     color: '#f7ce45',
//     fontSize: 13,
//     fontWeight: '600',
//   },
//   // Wallet balance card styles
//   walletBalanceCard: {
//     marginTop: 12,
//     padding: 12,
//     backgroundColor: 'rgba(247,206,69,0.1)',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(247,206,69,0.3)',
//   },
//   walletBalanceHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 8,
//   },
//   walletIconContainer: {
//     padding: 6,
//     backgroundColor: 'rgba(247,206,69,0.2)',
//     borderRadius: 8,
//   },
//   walletBalanceLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: 'white',
//   },
//   walletBalanceAmount: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#f7ce45',
//   },
//   walletAmountRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//   },
//   addMoneyInlineButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//    // backgroundColor: 'rgba(247,206,69,0.15)',
//     // borderRadius: 6,
//     // borderWidth: 1,
//     // borderColor: '#f7ce45',
//   },
//   walletSufficientBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   walletSufficientText: {
//     fontSize: 12,
//     color: '#22c55e',
//   },
//   walletInsufficientText: {
//     fontSize: 12,
//     color: '#eab308',
//   },
//   addMoneyButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 6,
//     marginTop: 8,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     backgroundColor: 'rgba(247,206,69,0.15)',
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#f7ce45',
//   },
//   addMoneyText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: 'green',// '#f7ce45',
//   },
//   // Payment method selection styles
//   paymentMethodCard: {
//     marginTop: 16,
//     padding: 16,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: 'rgba(55,65,81,1)',
//   },
//   paymentMethodHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 12,
//   },
//   paymentMethodTitle: {
//     color: 'white',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   paymentMethodRequired: {
//     fontSize: 12,
//     color: 'rgba(156,163,175,1)',
//   },
//   paymentOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 2,
//     borderColor: 'rgba(75,85,99,1)',
//     marginBottom: 12,
//   },
//   paymentOptionSelected: {
//     borderColor: '#f7ce45',
//     backgroundColor: 'rgba(247,206,69,0.1)',
//   },
//   paymentOptionDisabled: {
//     opacity: 0.5,
//   },
//   radioButton: {
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#f7ce45',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   radioButtonInner: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: '#f7ce45',
//   },
//   paymentOptionContent: {
//     flex: 1,
//   },
//   paymentOptionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 4,
//   },
//   paymentOptionTitle: {
//     color: 'white',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   paymentOptionSubtext: {
//     fontSize: 12,
//     color: 'rgba(156,163,175,1)',
//   },
//   sufficientBalance: {
//     color: '#22c55e',
//   },
//   insufficientBalance: {
//     color: '#ef4444',
//   },
//   paymentOptionAmount: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#f7ce45',
//   },
//   razorpayIcon: {
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     backgroundColor: '#f7ce45',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   razorpayIconText: {
//     color: '#000',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
// });

// export default Step1_OrderAndAddress;
