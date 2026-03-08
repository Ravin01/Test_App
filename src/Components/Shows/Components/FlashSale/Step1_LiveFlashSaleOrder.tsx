// NEW FILE: /components/reusable/orderManagement/buyNow/Step1_LiveFlashSaleOrder.js

import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import Icon from 'react-native-vector-icons/Feather';
import {Wallet, Check} from 'lucide-react-native';
import axiosCourier from "../../../../Utils/axiosCourier";
import axiosInstance from "../../../../Utils/Api";
import {AuthContext} from '../../../../Context/AuthContext';
import { AWS_CDN_URL } from "../../../../../Config";
import { getWalletBalance } from '../../../../Services/walletService';

// ✅ Timer formatting utility
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const AddressIcon = ({ type, size = 20, color = "rgba(250,250,250,.62)" }) => {
  switch (type?.toLowerCase()) {
    case "home":
      return <Icon name="home" width={size} height={size} color={color} />;
    case "work":
      return <Icon name="briefcase" width={size} height={size} color={color} />;
    default:
      return <Icon name="map-pin"  width={size} height={size} color={color} />;
  }
};

const FadeInView = ({ children, duration = 300, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

const ScalePress = ({ children, onPress, disabled = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const SummarySkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={{
        opacity: pulseAnim,
        padding: 16,
        backgroundColor: '#000',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#374151',
        marginVertical: 8,
      }}
    >
      <View style={{ height: 24, backgroundColor: '#374151', borderRadius: 4, width: '50%', marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ height: 16, backgroundColor: '#374151', borderRadius: 4, width: '25%' }} />
        <View style={{ height: 16, backgroundColor: '#374151', borderRadius: 4, width: '33%' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ height: 16, backgroundColor: '#374151', borderRadius: 4, width: '33%' }} />
        <ActivityIndicator size="small" color="#f7ce45" />
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: '#374151', marginVertical: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ height: 24, backgroundColor: '#374151', borderRadius: 4, width: '25%' }} />
        <View style={{ height: 24, backgroundColor: '#374151', borderRadius: 4, width: '33%' }} />
      </View>
    </Animated.View>
  );
};

const Step1_LiveFlashSaleOrder = ({
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
  // ✅ REAL-TIME PROPS
  currentFlashStock,
  timeLeft,
  isTimeUp,
  // ✅ VARIANT PROPS
  hasVariants,
  variantAttributes,
  selectedAttributes,
  onAttributeChange,
  isAttributeCombinationAvailable,
  variantLoading,
  variantMetadata,
  parentProduct,
  selectedVariant,
  displayProduct,
  // ✅ PAYMENT METHOD PROPS
  selectedPaymentMethod,
  onPaymentMethodChange,
}) => {
  const [isAddressListOpen, setAddressListOpen] = useState(false);
  const [sellerPincode, setSellerPincode] = useState(null);
  const [recommendedOption, setRecommendedOption] = useState(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [hasAttemptedCalculation, setHasAttemptedCalculation] = useState(false);
  
  // ✅ WALLET STATE
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  
  const {user}: any = useContext(AuthContext);
  const item = orderData.products[0];
  const { product, quantity } = item || {};
  
  // ✅ FIX: Ensure product has weight - add default if missing
  if (product && !product.weight) {
    console.log('⚠️ [DELIVERY] Product missing weight, adding default');
    product.weight = { value: 230, unit: 'grams' }; // Default 230 grams
  }
  
  console.log('🔍 [DELIVERY] Flash order product:', {
    id: product?._id,
    title: product?.title,
    hasWeight: !!product?.weight,
    weight: product?.weight,
    flashSale: product?.flashSale ? {
      flashPrice: product.flashSale.flashPrice,
      endsAt: product.flashSale.endsAt
    } : null
  });
  
  const { deliveryCharge, deliveryAddress } = orderData;
  const isMountedRef = useRef(true);
  const isOwner = user?.role === "seller" && user?.sellerInfo?._id === product?.sellerId?._id;
  
  // Store the callback in a ref to avoid it triggering the effect
  const onDeliveryChargeUpdateRef = useRef(onDeliveryChargeUpdate);
  
  useEffect(() => {
    onDeliveryChargeUpdateRef.current = onDeliveryChargeUpdate;
  }, [onDeliveryChargeUpdate]);

  // ✅ FETCH WALLET BALANCE
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

  // Fade animation for address list
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAddressListOpen || !deliveryAddress) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();
    }
  }, [isAddressListOpen, deliveryAddress, fadeAnim]);

  // Effect to fetch seller pincode
  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!product?._id) return;
      try {
        const response = await axiosInstance.get(`courier/seller-pincode/${product._id}`);
        if (response.data.status) {
          setSellerPincode(response.data.pincode);
        }
      } catch (error) {
        console.error('Failed to fetch seller pincode:', error);
      }
    };
    fetchSellerPincode();
  }, [product]);

  // Effect to calculate delivery
    useEffect(() => {
    isMountedRef.current = true;
    const calculateDeliveryCharges = async () => {
      
      console.log('🔍 [DELIVERY] Effect triggered with data:', {
        sellerPincode,
        deliveryAddress: deliveryAddress ? {
          pincode: deliveryAddress.pincode,
          city: deliveryAddress.city,
          state: deliveryAddress.state
        } : null,
        product: product ? {
          id: product._id,
          title: product.title,
          weight: product.weight,
          deliveryCharge: product.deliveryCharge
        } : null,
        isMounted: isMountedRef.current
      });
      
      if (!sellerPincode || !deliveryAddress?.pincode || !product?.weight || !isMountedRef.current) {
        console.log('❌ [DELIVERY] Missing required data - cannot calculate delivery');
        console.log('   - Seller Pincode:', sellerPincode ? '✓' : '✗');
        console.log('   - Delivery Pincode:', deliveryAddress?.pincode ? '✓' : '✗');
        console.log('   - Product Weight:', product?.weight ? '✓' : '✗');
        console.log('   - Is Mounted:', isMountedRef.current ? '✓' : '✗');
        return;
      }
      
      console.log('✅ [DELIVERY] All required data present, starting calculation...');
      setCalculatingDelivery(true);
      setHasAttemptedCalculation(true); // ✅ Mark that we've attempted
      setRecommendedOption(null);
      onDeliveryChargeUpdateRef.current(null);

      // ✅ BACKWARD COMPATIBILITY: Check new field first, fallback to old field
      let productShippingMethod = product.shippingMethod;
      
      // If new field doesn't exist, map old logisticsType to new values
      if (!productShippingMethod && product.logisticsType) {
        productShippingMethod = product.logisticsType === 'selfShipment' 
          ? 'self_shipment' 
          : 'flykup_logistics';
      }
      
      // Default to flykup_logistics if neither field exists
      productShippingMethod = productShippingMethod || 'flykup_logistics';
      
      const requiresSelfShipment = productShippingMethod === 'self_shipment';

      console.log('🚚 Shipment determination:', {
        hasNewField: !!product.shippingMethod,
        hasOldField: !!product.logisticsType,
        oldValue: product.logisticsType,
        productShippingMethod,
        requiresSelfShipment,
        decision: requiresSelfShipment ? 'SELF SHIPMENT' : 'FLYKUP LOGISTICS'
      });

      // If self-shipment, use product's delivery info (no API call)
      if (requiresSelfShipment) {
        console.log('📦 Using self-shipment method');
        const fallbackOption = {
          charge: product.deliveryCharge || 40,
          estimated_days: product.estimatedDeliveryDate || 7,
          isSelfShipment: true,
          // message: 'This item will be shipped directly by the seller.',
          message:"",
        };
        setRecommendedOption(fallbackOption);
        onDeliveryChargeUpdateRef.current(fallbackOption.charge, 'self_shipment');
        setCalculatingDelivery(false);
        return; // ✅ EARLY EXIT - No courier API call
      }

      // If Flykup logistics, proceed with API call
      console.log('✅ [DELIVERY] Flykup shipping detected, proceeding with API call');

      try {
        const weightValue = product.weight.value || 0;
        const weightUnit = product.weight.unit || 'grams';
        let totalWeight = weightValue * quantity;
        if (weightUnit === 'grams') {
          totalWeight = totalWeight / 1000;
        }

        const currentPrice = product.flashSale.flashPrice;
        const itemTotalValue = currentPrice * quantity;

        const requestPayload: any = {
          seller_pincode: sellerPincode,
          customer_pincode: deliveryAddress.pincode,
          product_weight: totalWeight,
          weight_unit: 'kg',
          order_value: itemTotalValue,
          payment_mode: 'prepaid',
          order_date: new Date().toISOString().split('T')[0]
        };

        // ✅ Add dimensions if product has them (for accurate shipping calculation)
        if (product?.dimensions?.length && 
            product?.dimensions?.width && 
            product?.dimensions?.height) {
          requestPayload.length = product.dimensions.length;
          requestPayload.width = product.dimensions.width;
          requestPayload.height = product.dimensions.height;
          console.log('📦 [DELIVERY] Sending dimensions for flash sale delivery calculation:', {
            length: product.dimensions.length,
            width: product.dimensions.width,
            height: product.dimensions.height,
          });
        } else {
          console.log('⚠️ [DELIVERY] Flash sale product has no dimensions, calculating delivery by weight only');
        }

        console.log('📦 [DELIVERY] API Request Payload:', JSON.stringify(requestPayload, null, 2));

        const response = await axiosCourier.post('/business/calculate-delivery', requestPayload);
        
        console.log('📬 [DELIVERY] API Response Status:', response.status);
        console.log('📬 [DELIVERY] API Response Data:', JSON.stringify(response.data, null, 2));
        
        if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
          const recommended = response.data.data.recommended_courier;
          console.log('✅ [DELIVERY] Recommended courier found:', JSON.stringify(recommended, null, 2));
          
          const option = {
            charge: recommended.delivery_charges,
            estimated_days: recommended.estimated_days,
            isSelfShipment: false,
          };
          console.log('✅ [DELIVERY] Setting recommended option:', option);
          setRecommendedOption(option);
          onDeliveryChargeUpdateRef.current(option.charge, 'flykup_logistics');
          console.log('✅ [DELIVERY] Parent callback called with charge:', option.charge);
        } else if (isMountedRef.current) {
          console.log("⚠️ [DELIVERY] No recommended courier in response");
          console.log("⚠️ [DELIVERY] Response success:", response.data.success);
          console.log("⚠️ [DELIVERY] Has recommended_courier:", !!response.data.data?.recommended_courier);
          console.log("⚠️ [DELIVERY] Full response.data.data:", JSON.stringify(response.data.data, null, 2));
          
          const fallbackCharge = product.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            isSelfShipment: true,
            // message: "This item will be shipped directly by the seller.",
            message:"",
          };
          console.log('✅ [DELIVERY] Using fallback self-shipment:', fallbackOption);
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current(fallbackCharge, 'self_shipment');
          console.log('✅ [DELIVERY] Parent callback called with fallback charge:', fallbackCharge);
        }
      } catch (error) {
        console.log('❌ [DELIVERY] API Error occurred');
        console.log('❌ [DELIVERY] Error message:', error.message);
        console.log('❌ [DELIVERY] Error response status:', error.response?.status);
        console.log('❌ [DELIVERY] Error response data:', JSON.stringify(error.response?.data, null, 2));
        console.log('❌ [DELIVERY] Full error:', error);
      
        // ✅ ENABLE FALLBACK ON ERROR
        if (isMountedRef.current) {
          const fallbackCharge = product.deliveryCharge || 40;
          const fallbackOption = {
            charge: fallbackCharge,
            isSelfShipment: true,
            // message: "This item will be shipped directly by the seller.",
            message:"",
          };
          console.log('✅ [DELIVERY] Setting fallback after error:', fallbackOption);
          setRecommendedOption(fallbackOption);
          onDeliveryChargeUpdateRef.current(fallbackCharge, 'self_shipment');
          console.log('✅ [DELIVERY] Parent callback called with error fallback charge:', fallbackCharge);
        }
      } finally {
        console.log('🏁 [DELIVERY] Calculation complete');
        setCalculatingDelivery(false);
      }
    };

    if (isMountedRef.current && sellerPincode && deliveryAddress?.pincode && product?.weight) {
      console.log('🚀 [DELIVERY] Triggering delivery calculation');
      calculateDeliveryCharges();
    } else {
      console.log('⏸️ [DELIVERY] Waiting for conditions:', {
        isMounted: isMountedRef.current,
        hasSellerPincode: !!sellerPincode,
        hasDeliveryPincode: !!deliveryAddress?.pincode,
        hasProductWeight: !!product?.weight
      });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [sellerPincode, deliveryAddress?.pincode, quantity, product?._id, product, deliveryAddress]);

  // useEffect(() => {
  //   isMountedRef.current = true; // Set to true at the start of each effect run
    
  //   const calculateDeliveryCharges = async () => {
  //     console.log('🔍 Checking delivery calculation conditions:', {
  //       sellerPincode,
  //       deliveryPincode: deliveryAddress?.pincode,
  //       hasWeight: !!product?.weight,
  //       weight: product?.weight,
  //       isMounted: isMountedRef.current
  //     });

  //     if (!sellerPincode || !deliveryAddress?.pincode) {
  //       console.log('❌ Missing required data for delivery calculation');
  //       return;
  //     }

  //     // Ensure product has weight, use default if missing
  //     if (!product?.weight) {
  //       console.log('⚠️ Product weight missing, using default');
  //       product.weight = { value: 230, unit: 'grams' };
  //     }
      
  //     console.log('✅ Starting delivery calculation...');
  //     setCalculatingDelivery(true);
  //     setRecommendedOption(null);
  //     onDeliveryChargeUpdate(null);

  //     try {
  //       const weightValue = product.weight.value || 230;
  //       const weightUnit = product.weight.unit || 'grams';
  //       let totalWeight = weightValue * quantity;
  //       if (weightUnit === 'grams') {
  //         totalWeight = totalWeight / 1000;
  //       }

  //       const currentPrice = product.flashSale.flashPrice;
  //       const itemTotalValue = currentPrice * quantity;

  //       console.log('📦 Delivery calculation params:', {
  //         seller_pincode: sellerPincode,
  //         customer_pincode: deliveryAddress.pincode,
  //         product_weight: totalWeight,
  //         order_value: itemTotalValue
  //       });

  //       const response = await axiosCourier.post('/business/calculate-delivery', {
  //         seller_pincode: sellerPincode,
  //         customer_pincode: deliveryAddress.pincode,
  //         product_weight: totalWeight,
  //         weight_unit: 'kg',
  //         order_value: itemTotalValue,
  //         payment_mode: 'prepaid',
  //         order_date: new Date().toISOString().split('T')[0]
  //       });
        
  //       console.log('📬 Delivery API response:', response.data);
        
  //       if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
  //         const recommended = response.data.data.recommended_courier;
  //         const option = {
  //           charge: recommended.delivery_charges,
  //           estimated_days: recommended.estimated_days,
  //           isSelfShipment: false,
  //         };
  //         console.log('✅ Setting recommended option:', option);
  //         setRecommendedOption(option);
  //         onDeliveryChargeUpdate(option.charge, 'flykup_logistics');
  //       } else if (isMountedRef.current) {
  //         console.log("⚠️ Courier not available, falling back to self-shipment.");
  //         const fallbackCharge = product.deliveryCharge || 40;
  //         const fallbackOption = {
  //           charge: fallbackCharge,
  //           isSelfShipment: true,
  //           message: "This item will be shipped directly by the seller.",
  //         };
  //         console.log('✅ Setting fallback option:', fallbackOption);
  //         setRecommendedOption(fallbackOption);
  //         onDeliveryChargeUpdate(fallbackCharge, 'self_shipment');
  //       }
  //     } catch (error) {
  //       console.error('❌ Failed to calculate delivery charges:', error);
  //       console.error('Error details:', error.response?.data || error.message);
        
  //       // Set fallback on error
  //       if (isMountedRef.current) {
  //         const fallbackCharge = product.deliveryCharge || 40;
  //         const fallbackOption = {
  //           charge: fallbackCharge,
  //           isSelfShipment: true,
  //           message: "This item will be shipped directly by the seller.",
  //         };
  //         console.log('✅ Setting fallback option after error:', fallbackOption);
  //         setRecommendedOption(fallbackOption);
  //         onDeliveryChargeUpdate(fallbackCharge, 'self_shipment');
  //       }
  //     } finally {
  //       setCalculatingDelivery(false);
  //     }
  //   };

  //   if (isMountedRef.current && sellerPincode && deliveryAddress?.pincode) {
  //     calculateDeliveryCharges();
  //   } else {
  //     console.log('⏸️ Waiting for delivery calculation conditions:', {
  //       isMounted: isMountedRef.current,
  //       hasSellerPincode: !!sellerPincode,
  //       sellerPincode,
  //       hasDeliveryAddress: !!deliveryAddress,
  //       deliveryAddressPincode: deliveryAddress?.pincode,
  //       fullDeliveryAddress: deliveryAddress
  //     });
  //   }

  //   return () => {
  //     // Cleanup: set to false when effect is about to re-run or component unmounts
  //     isMountedRef.current = false;
  //   };
  // }, [sellerPincode, deliveryAddress?.pincode, quantity, product?._id]);

  if (!item || !product) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f7ce45" />
      </View>
    );
  }

  const { gstAmount, gstRate } = item;
  const isFlashSaleActive = product.flashSale?.isActive;

  let productImageUrl = "https://via.placeholder.com/80x80/374151/ffffff?text=Product";
  if (product.signedImages?.[0]) {
    productImageUrl = product.signedImages[0];
  } else if (product.images?.[0]?.key) {
    //const CDN_BASE_URL = process.env.VITE_AWS_CDN_URL;
    productImageUrl = `${AWS_CDN_URL}${product.images[0].key}`;
  }

  const currentPrice = product.flashSale.flashPrice;
  const itemTotal = currentPrice * quantity;
  const totalAmount = itemTotal + (deliveryCharge || 0);
  
  let totalSavedAmount = (product.MRP - product.flashSale.flashPrice) * quantity;
  
  // ✅ Use real-time stock prop
  const maxQuantity = currentFlashStock || 0;
  const isSoldOut = maxQuantity <= 0;

  console.log('is soldout', isSoldOut, 'maxQuantity', maxQuantity);

  const handleSelectAndClose = (address) => {
    onSelectAddress(address);
    setAddressListOpen(false);
  };

  const renderAddressItem = (address) => (
    <ScalePress onPress={() => handleSelectAndClose(address)}>
      <View
        style={{
          padding: 16,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: deliveryAddress?._id === address._id ? "#f7ce45" : "#374151",
          backgroundColor: deliveryAddress?._id === address._id ? "rgba(247, 206, 69, 0.1)" : "#000",
          marginVertical: 4,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
            <View style={{ padding: 8, backgroundColor: '#374151', borderRadius: 8, marginRight: 12 }}>
              <AddressIcon type={address.addressType} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', textTransform: 'capitalize', color: '#fff', marginBottom: 4 }}>
                {address.addressType}
              </Text>
              <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: '600', color: '#fff', fontSize: 14 }}>{address.name}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{address.line1}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                  Mobile: <Text style={{ fontWeight: '600', color: '#fff' }}>{address.mobile}</Text>
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onEditAddress(address)}
            style={{ padding: 8, borderRadius: 20 }}
          >
            <Icon name="edit-3" width={16} height={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </ScalePress>
  );


  return (
    <FadeInView style={{ flex: 1, padding: 16 }}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={{ flex: 1 }}
      >
        {/* Order Review Section */}
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>Review Your Order</Text>
        <View style={{ backgroundColor: '#000', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#374151', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Image
              source={{ uri: productImageUrl }}
              style={{ width: 80, height: 80, borderRadius: 12 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontWeight: '600', color: '#fff', fontSize: 16 }}>{product.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f7ce45' }}>₹{product.flashSale.flashPrice}</Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textDecorationLine: 'line-through' }}>₹{product.MRP}</Text>
              </View>

              {/* ✅ Real-time Timer UI */}
              {isFlashSaleActive && (
                <View style={{ padding: 8, backgroundColor: 'rgba(247, 206, 69, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(247, 206, 69, 0.2)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isTimeUp ? (
                      <Text style={{ fontWeight: 'bold', color: '#EF4444', textAlign: 'center', flex: 1 }}>Time's Up!</Text>
                    ) : (
                      <>
                        <Text style={{ fontWeight: '600', color: '#f7ce45', fontSize: 14 }}>Sale ends in:</Text>
                        <Text style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f7ce45', fontSize: 18 }}>
                          {formatTime(timeLeft)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* {console.log({
  hasVariants,
  variantAttributes,
  hasVariantAttributes:
    variantAttributes && Object.keys(variantAttributes).length > 0,
  finalResult:
    hasVariants && variantAttributes && Object.keys(variantAttributes).length > 0,
})
} */}

              {/* ✨ VARIANT SELECTION UI */}
              {hasVariants && variantAttributes && Object.keys(variantAttributes).length > 0 && (
                <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: '#374151', marginTop: 8 }}>
                  {Object.entries(variantAttributes).map(([attributeKey, availableValues]) => {
                    const selectedValue = selectedAttributes[attributeKey];
                    const attributeLabel = attributeKey.charAt(0).toUpperCase() + attributeKey.slice(1);
                    
                    // Special rendering for color attribute with images
                    if (attributeKey === 'color') {
                      return (
                        <View key={attributeKey} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Select {attributeLabel}:</Text>
                            {selectedValue && (
                              <Text style={{ color: '#f7ce45', fontWeight: 'bold', fontSize: 14 }}>{selectedValue}</Text>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {availableValues?.map((value) => {
                              const colorMetadata = variantMetadata?.find(v =>
                                v.variantAttributes?.color === value
                              );
                              const isSelected = selectedValue === value;
                              const thumbnailUrl = colorMetadata?.thumbnailImage 
                                ? `${AWS_CDN_URL}${colorMetadata.thumbnailImage}` 
                                : null;
                              
                              // Helper function to get color code from name
                              const getColorCode = (colorName) => {
                                const colors = {
                                  'red': '#ef4444',
                                  'blue': '#3b82f6',
                                  'green': '#10b981',
                                  'yellow': '#eab308',
                                  'black': '#000000',
                                  'white': '#ffffff',
                                  'gray': '#6b7280',
                                  'grey': '#6b7280',
                                  'pink': '#ec4899',
                                  'purple': '#a855f7',
                                  'orange': '#f97316',
                                  'brown': '#92400e',
                                };
                                return colors[colorName.toLowerCase()] || '#6b7280';
                              };
                              
                              return (
                                <TouchableOpacity
                                  key={value}
                                  onPress={() => onAttributeChange && onAttributeChange(attributeKey, value)}
                                  disabled={variantLoading}
                                  style={{
                                    position: 'relative',
                                    width: 56,
                                    height: 56,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    borderWidth: 2,
                                    borderColor: isSelected ? '#f7ce45' : '#374151',
                                    opacity: variantLoading ? 0.5 : 1,
                                  }}
                                >
                                  {thumbnailUrl ? (
                                    <Image
                                      source={{ uri: thumbnailUrl }}
                                      style={{ width: '100%', height: '100%' }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: getColorCode(value),
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 12,
                                          fontWeight: '600',
                                          color: ['black', 'blue', 'purple', 'brown'].includes(value.toLowerCase()) 
                                            ? '#fff' 
                                            : '#000',
                                        }}
                                      >
                                        {value.slice(0, 2).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                  {isSelected && (
                                    <View
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(247, 206, 69, 0.2)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: 10,
                                          backgroundColor: '#f7ce45',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>✓</Text>
                                      </View>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    }
                    
                    // Default rendering for other attributes (size, etc.)
                    return (
                      <View key={attributeKey} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Select {attributeLabel}:</Text>
                          {selectedValue && (
                            <Text style={{ color: '#f7ce45', fontWeight: 'bold', fontSize: 14 }}>{selectedValue}</Text>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {availableValues?.map((value) => {
                            const isAvailable = isAttributeCombinationAvailable 
                              ? isAttributeCombinationAvailable(attributeKey, value) 
                              : true;
                            const isSelected = selectedValue === value;
                            
                            return (
                              <TouchableOpacity
                                key={value}
                                onPress={() => isAvailable && onAttributeChange && onAttributeChange(attributeKey, value)}
                                disabled={!isAvailable || variantLoading}
                                style={{
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 8,
                                  borderWidth: 2,
                                  borderColor: isSelected ? '#f7ce45' : isAvailable ? '#374151' : '#1F2937',
                                  backgroundColor: isSelected ? '#f7ce45' : isAvailable ? '#000' : '#000',
                                  opacity: !isAvailable ? 0.4 : 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontWeight: '600',
                                    fontSize: 14,
                                    color: isSelected ? '#000' : isAvailable ? '#fff' : '#6B7280',
                                    textDecorationLine: !isAvailable ? 'line-through' : 'none',
                                  }}
                                >
                                  {value}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                  
                  {variantLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <ActivityIndicator size="small" color="#f7ce45" />
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Loading variant...</Text>
                    </View>
                  )}
                  
                  {/* ✅ Warning when no variant selected */}
                  {hasVariants && !selectedVariant && !variantLoading && (
                    <View style={{ 
                      backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                      borderWidth: 1, 
                      borderColor: 'rgba(234, 179, 8, 0.3)', 
                      borderRadius: 8, 
                      padding: 12, 
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 8
                    }}>
                      <Text style={{ fontSize: 18 }}>⚠️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FBBF24', fontWeight: '600', fontSize: 14 }}>
                          Please select a variant
                        </Text>
                        <Text style={{ color: 'rgba(251, 191, 36, 0.7)', fontSize: 12, marginTop: 2 }}>
                          Choose options above to continue
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {isSoldOut ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                    <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>Sold Out</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                  //'rgba(255, 255, 255, 0.1)', 
                  borderRadius: 20, padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => onQuantityChange(quantity - 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#f7ce45',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: (quantity <= 1 || isProcessing || isTimeUp || isOwner) ? 0.4 : 1,
                      }}
                      disabled={quantity <= 1 || isProcessing || isTimeUp || isOwner}
                    >
                      <Icon name="minus"  width={12} height={12} color="#000" />
                    </TouchableOpacity>
                    <Text style={{ fontWeight: 'bold', width: 40, textAlign: 'center', color: '#000' }}>{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => onQuantityChange(quantity + 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#f7ce45',
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: (isProcessing || isTimeUp || quantity >= maxQuantity || isOwner) ? 0.4 : 1,
                      }}
                      disabled={isProcessing || isTimeUp || quantity >= maxQuantity || isOwner}
                    >
                      <Icon name="plus" width={12} height={12} color="#000" />
                    </TouchableOpacity>
                  </View>
                )}
                {!isSoldOut && (
                  <View>
                    <Text style={{ color: '#9CA3AF', fontSize: 16 }}>Total: </Text>
                    <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }}>₹{itemTotal.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>Delivery Address</Text>
          
          {!isAddressListOpen && deliveryAddress && (
            <FadeInView style={{}}>
              <View style={{ padding: 16, backgroundColor: '#000', borderRadius: 16, borderWidth: 1, borderColor: '#374151' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ padding: 8, backgroundColor: 'rgba(247, 206, 69, 0.1)', borderRadius: 8 }}>
                        <AddressIcon type={deliveryAddress.addressType} />
                      </View>
                      <Text style={{ fontWeight: 'bold', textTransform: 'capitalize', color: '#fff' }}>
                        {deliveryAddress.addressType}
                      </Text>
                    </View>
                    <View style={{ gap: 4, marginLeft: 44 }}>
                      <Text style={{ fontWeight: '600', color: '#fff', fontSize: 14 }}>{deliveryAddress.name}</Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 14 }}>{deliveryAddress.line1}</Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                        {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
                      </Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                        Mobile: <Text style={{ fontWeight: '600', color: '#fff' }}>{deliveryAddress.mobile}</Text>
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAddressListOpen(true)}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ color: '#f7ce45', fontWeight: '600', fontSize: 14 }}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>
          )}

          {(isAddressListOpen || !deliveryAddress) && (
            <Animated.View
              style={{
                opacity: fadeAnim,
              }}
            >
              <View style={{ gap: 8 }}>
                {loading && (
                  <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color="#f7ce45" />
                  </View>
                )}
                {!loading && addresses?.map((address) => (
                  <View key={address._id}>
                    {renderAddressItem(address)}
                  </View>
                ))}
                
                <ScalePress onPress={onAddNewAddress}>
                  <View
                    style={{
                      width: '100%',
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: '#374151',
                      borderRadius: 16,
                    }}
                  >
                    <Icon name="plus" width={18} height={18} color="#9CA3AF" />
                    <Text style={{ color: '#9CA3AF' }}>Add New Address</Text>
                  </View>
                </ScalePress>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Order Summary */}
        <View style={{ gap: 8, marginTop: 6, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>Order Summary</Text>
          {isOwner ? (
            <View style={{ padding: 16, backgroundColor: 'rgba(146, 64, 14, 0.5)', borderRadius: 16, borderWidth: 1, borderColor: '#B45309', alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', color: '#FBBF24', textAlign: 'center' }}>
                You cannot buy your own product.
              </Text>
              <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                This is one of your listings.
              </Text>
            </View>
          ) : (
            <>
              {calculatingDelivery && deliveryAddress ? (
                <SummarySkeleton />
              ) : (
                <>
                <View style={{ gap: 8, padding: 16, backgroundColor: '#000', borderRadius: 16, borderWidth: 1, borderColor: '#374151' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff' }}>Item Total</Text>
                    <Text style={{ color: '#fff' }}>₹{itemTotal.toFixed(2)}</Text>
                  </View>
                  {gstRate > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9CA3AF', fontSize: 14 }}>GST ({gstRate}%) included</Text>
                      <Text style={{ color: '#9CA3AF', fontSize: 14 }}>(₹{gstAmount.toFixed(2)})</Text>
                    </View>
                  )}
                  
                  {/* Delivery charge logic */}
                  {!calculatingDelivery && recommendedOption && !recommendedOption.isSelfShipment && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff' }}>Delivery (Est. {recommendedOption.estimated_days} days)</Text>
                      <Text style={{ color: '#fff' }}>₹{recommendedOption.charge.toFixed(2)}</Text>
                    </View>
                  )}
                  {!calculatingDelivery && recommendedOption?.isSelfShipment && (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#fff' }}>Delivery Charge</Text>
                        <Text style={{ color: '#fff' }}>₹{recommendedOption.charge.toFixed(2)}</Text>
                      </View>
                      <Text style={{ color: '#10B981', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                        {recommendedOption.message}
                      </Text>
                    </View>
                  )}
                  {!calculatingDelivery && !recommendedOption && deliveryAddress && hasAttemptedCalculation && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#EF4444', fontSize: 14 }}>Delivery</Text>
                      <Text style={{ color: '#EF4444', fontSize: 14 }}>Not available</Text>
                    </View>
                  )}
                  
                  {totalSavedAmount > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#10B981', fontWeight: '500' }}>Total Savings</Text>
                      <Text style={{ color: '#10B981', fontWeight: '500' }}>- ₹{totalSavedAmount.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#374151', marginVertical: 8 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>To Pay</Text>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>₹{totalAmount.toFixed(2)}</Text>
                  </View>
                  
                  {/* ✅ WALLET BALANCE DISPLAY */}
                  {!loadingWallet && walletBalance !== null && (
                    <View style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: 'rgba(247,206,69,0.1)',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(247,206,69,0.3)',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{
                          padding: 6,
                          backgroundColor: 'rgba(247,206,69,0.2)',
                          borderRadius: 8,
                        }}>
                          <Wallet size={16} color="#f7ce45" />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                          Wallet Balance
                        </Text>
                      </View>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#f7ce45', marginBottom: 8 }}>
                        ₹{(walletBalance || 0).toFixed(2)}
                      </Text>
                      {(walletBalance || 0) >= totalAmount ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="#22c55e" />
                          <Text style={{ fontSize: 12, color: '#22c55e' }}>
                            You can pay with wallet
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12, color: '#eab308' }}>
                          Need ₹{(totalAmount - (walletBalance || 0)).toFixed(2)} more to pay with wallet
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {/* ✅ PAYMENT METHOD SELECTION */}
                  <View style={{
                    marginTop: 16,
                    padding: 16,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(55,65,81,1)',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                        Select Payment Method
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(156,163,175,1)' }}>
                        (Required)
                      </Text>
                    </View>
                    
                    {/* Wallet Option */}
                    <TouchableOpacity
                      onPress={() => onPaymentMethodChange && onPaymentMethodChange('WALLET')}
                      disabled={(walletBalance || 0) < totalAmount}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedPaymentMethod === 'WALLET' ? '#f7ce45' : 'rgba(75,85,99,1)',
                        backgroundColor: selectedPaymentMethod === 'WALLET' ? 'rgba(247,206,69,0.1)' : 'transparent',
                        marginBottom: 12,
                        opacity: (walletBalance || 0) < totalAmount ? 0.5 : 1,
                      }}
                      activeOpacity={0.7}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#f7ce45',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {selectedPaymentMethod === 'WALLET' && (
                          <View style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#f7ce45',
                          }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Wallet size={20} color="#f7ce45" />
                          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                            Wallet Payment
                          </Text>
                        </View>
                        <Text style={{
                          fontSize: 12,
                          color: (walletBalance || 0) >= totalAmount ? '#22c55e' : '#ef4444'
                        }}>
                          {(walletBalance || 0) >= totalAmount 
                            ? '✓ Sufficient balance' 
                            : `Insufficient (Need ₹${(totalAmount - (walletBalance || 0)).toFixed(2)} more)`}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#f7ce45' }}>
                        ₹{(walletBalance || 0).toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Razorpay Option */}
                    <TouchableOpacity
                      onPress={() => onPaymentMethodChange && onPaymentMethodChange('RAZORPAY')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedPaymentMethod === 'RAZORPAY' ? '#f7ce45' : 'rgba(75,85,99,1)',
                        backgroundColor: selectedPaymentMethod === 'RAZORPAY' ? 'rgba(247,206,69,0.1)' : 'transparent',
                      }}
                      activeOpacity={0.7}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: '#f7ce45',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {selectedPaymentMethod === 'RAZORPAY' && (
                          <View style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#f7ce45',
                          }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: '#f7ce45',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Text style={{ color: '#000', fontSize: 14, fontWeight: 'bold' }}>₹</Text>
                          </View>
                          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                            Pay using
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: 'rgba(156,163,175,1)' }}>
                          UPI • Cards • Net Banking
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
                </>
              )}

              <ScalePress
                onPress={onNext}
                disabled={
                  !deliveryAddress ||
                  isProcessing ||
                  calculatingDelivery ||
                  !recommendedOption ||
                  isSoldOut ||
                  isTimeUp ||
                  isOwner ||
                  (hasVariants && !selectedVariant) ||
                  !selectedPaymentMethod
                }
              >
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#f7ce45',
                    paddingVertical: 12,
                    borderRadius: 12,
                    opacity: (
                      !deliveryAddress ||
                      isProcessing ||
                      calculatingDelivery ||
                      !recommendedOption ||
                      isSoldOut ||
                      isTimeUp ||
                      isOwner ||
                      (hasVariants && !selectedVariant) ||
                      !selectedPaymentMethod
                    ) ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                    {isOwner ? "Cannot Purchase Own Product" :
                     isProcessing ? "Processing..." 
                      : isTimeUp ? "Time's Up!" 
                      : isSoldOut ? "Sold Out" 
                      : !deliveryAddress ? "Add Address to Proceed"
                      : (hasVariants && !selectedVariant) ? "Select a Variant to Continue"
                      : !selectedPaymentMethod ? "Select Payment Method"
                      : "Proceed to Payment"}
                  </Text>
                </View>
              </ScalePress>
            </>
          )}
        </View>
      </ScrollView>
    </FadeInView>
  );
};

export default Step1_LiveFlashSaleOrder;
