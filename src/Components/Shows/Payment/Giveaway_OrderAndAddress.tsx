import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import axiosCourier from '../../../Utils/axiosCourier';
import axiosInstance from '../../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AWS_CDN_URL } from '../../../../Config';
import PaymentMethodSelector from '../../Wallet/WalletComponents/PaymentMethodSelector';
const AddressIcon = ({ type }) => {
  const iconProps = { size: 20, color: 'rgba(250, 250, 250, 0.62)' };

  switch (type?.toLowerCase()) {
    case 'home':
      return <Ionicons name="home-outline" {...iconProps} />;
    case 'work':
      return <Ionicons name="briefcase-outline" {...iconProps} />;
    default:
      return <Ionicons name="location-outline" {...iconProps} />;
  }
};

const GiveawayOrderAndAddress = ({
  orderData,
  addresses,
  loading,

  onSelectAddress,
  onDeliveryChargeUpdate,
  onAddNewAddress,
  onEditAddress,
  onNext,
  isProcessing,
  winnerInfo,
  selectedPaymentMethod,
  onPaymentMethodChange,
  handleClose,
}) => {
  const [isAddressListOpen, setAddressListOpen] = useState(false);
  const [sellerPincode, setSellerPincode] = useState(null);
  const [recommendedOption, setRecommendedOption] = useState(null);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [fetchingSellerPincode, setFetchingSellerPincode] = useState(true);
  const [_isServiceable, setIsServiceable] = useState(true);

  const item = orderData.products[0];
  const { product } = item || {};
  const { deliveryCharge, deliveryAddress } = orderData;
  const isMountedRef = useRef(true);

  const quantity = 1;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!product?._id) {
        console.log('❌ No product ID available for seller pincode fetch');
        setFetchingSellerPincode(false);
        return;
      }

      setFetchingSellerPincode(true);
      // console.log('🔍 Fetching seller pincode for product:', product._id);

      try {
        const response = await axiosInstance.get(
          `courier/seller-pincode/${product._id}`
        );
        // console.log('📍 Seller pincode response:', response.data);

        if (response.data.status && response.data.pincode) {
          // console.log('✅ Setting seller pincode:', response.data.pincode);
          setSellerPincode(response.data.pincode);
        } else {
          console.log('⚠️ No pincode in response or status false');
          setSellerPincode(null);
        }
      } catch (error) {
        console.error('💥 Failed to fetch seller pincode:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setSellerPincode(null);
      } finally {
        setFetchingSellerPincode(false);
      }
    };

    if (product?._id) {
      fetchSellerPincode();
    } else {
      setFetchingSellerPincode(false);
    }
  }, [product?._id]);
  // console.log(product,"PRODUCT FROM GIVEAWAY")

  // Get seller info from product
  const sellerInfo = product?.seller || product?.sellerId;

  useEffect(() => {
    const calculateDeliveryCharges = async () => {
      if (!isMountedRef.current) return;

      setCalculatingDelivery(true);
      onDeliveryChargeUpdate(0);
      setRecommendedOption(null);
      setIsServiceable(true);

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

      console.log('🚚 Giveaway shipment determination:', {
        hasNewField: !!product.shippingMethod,
        hasOldField: !!product.logisticsType,
        oldValue: product.logisticsType,
        productShippingMethod,
        requiresSelfShipment,
        decision: requiresSelfShipment ? 'SELF SHIPMENT' : 'FLYKUP LOGISTICS'
      });

      // If self-shipment, use product's delivery info (no API call)
      if (requiresSelfShipment) {
        console.log('📦 Using self-shipment method for giveaway');
        const fallbackCharge = product.deliveryCharge || 40;
        const fallbackOption = {
          charge: fallbackCharge,
          estimated_days: product.estimatedDeliveryDate || 7,
          isSelfShipment: true,
          source: 'self_shipment'
        };
        setRecommendedOption(fallbackOption);
        onDeliveryChargeUpdate(fallbackOption.charge, 'self_shipment');
        setIsServiceable(true);
        setCalculatingDelivery(false);
        return; // ✅ EARLY EXIT - No courier API call
      }

      // ✅ Only reach here if Flykup logistics
      try {
        const weightValue = product.weight?.value || 0;
        const totalWeightInGrams = weightValue * quantity;

        const payload: any = {
          seller_pincode: sellerPincode,
          customer_pincode: deliveryAddress.pincode,
          product_weight: Math.round(totalWeightInGrams),
          weight_unit: 'grams', // Always send in grams
          order_value: 100, // Use a minimum value for insurance/API requirements
          payment_mode: 'prepaid',
        };

        // ✅ Add dimensions if product has them (for accurate shipping calculation)
        if (product?.dimensions?.length &&
          product?.dimensions?.width &&
          product?.dimensions?.height) {
          payload.length = product.dimensions.length;
          payload.width = product.dimensions.width;
          payload.height = product.dimensions.height;
          console.log('📦 Sending dimensions for giveaway delivery calculation:', {
            length: product.dimensions.length,
            width: product.dimensions.width,
            height: product.dimensions.height,
          });
        } else {
          console.log('⚠️ Giveaway product has no dimensions, calculating delivery by weight only');
        }

        console.log("📡 Sending delivery calculation request:", payload);
        const response = await axiosCourier.post('business/calculate-delivery', payload);
        console.log("📬 Delivery calculation response:", response.data);

        if (!isMountedRef.current) return;

        const recommended = response.data.data?.recommended_courier;
        const isApiServicable = response.data.data?.serviceable === true;

        if (response.data.success && isApiServicable && recommended) {
          // --- API SUCCESS CASE ---
          setIsServiceable(true);
          const option = {
            charge: recommended.delivery_charges,
            estimated_days: recommended.estimated_days,
            isSelfShipment: false,
            source: 'api'
          };
          setRecommendedOption(option);
          onDeliveryChargeUpdate(option.charge, 'flykup_logistics');
        } else {
          // --- API FAILURE OR UNSERVICEABLE FALLBACK CASE ---
          console.warn("API delivery check failed or is unserviceable. Using product's default self-shipment info.");
          setIsServiceable(false);

          if (product.deliveryCharge && product.estimatedDeliveryDate) {
            const fallbackOption = {
              charge: product.deliveryCharge,
              estimated_days: product.estimatedDeliveryDate,
              isSelfShipment: true,
              source: 'fallback'
            };
            setRecommendedOption(fallbackOption);
            onDeliveryChargeUpdate(fallbackOption.charge, 'self_shipment');
          } else {
            setRecommendedOption(null);
            onDeliveryChargeUpdate(0);
          }
        }
      } catch (error) {
        console.error('💥 Failed to calculate delivery charges:', error.response?.data || error.message);
        if (isMountedRef.current) {
          setIsServiceable(false);
          if (product.deliveryCharge && product.estimatedDeliveryDate) {
            const fallbackOption = {
              charge: product.deliveryCharge,
              estimated_days: product.estimatedDeliveryDate,
              isSelfShipment: true,
              source: 'fallback'
            };
            setRecommendedOption(fallbackOption);
            onDeliveryChargeUpdate(fallbackOption.charge, 'self_shipment');
          } else {
            setRecommendedOption(null);
            onDeliveryChargeUpdate(0);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setCalculatingDelivery(false);
        }
      }
    };

    // ✅ Wait for sellerInfo as well
    if (sellerPincode && sellerInfo && deliveryAddress?.pincode && product?.weight) {
      calculateDeliveryCharges();
    }
  }, [sellerPincode, sellerInfo, deliveryAddress?.pincode, product?.weight, product?.deliveryCharge, product?.estimatedDeliveryDate, product?.shippingMethod, product?.logisticsType, product?.dimensions?.length, product?.dimensions?.width, product?.dimensions?.height, onDeliveryChargeUpdate]);

  if (!item || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f7ce45" />
      </View>
    );
  }

  let productImageUrl = null;
  if (product.signedImages?.[0]) {
    productImageUrl = product.signedImages[0];
  } else if (product.images?.[0]?.key) {
    productImageUrl = `${AWS_CDN_URL}${product.images[0].key}`;
  }

  const totalAmount = deliveryCharge || 0;

  const handleSelectAndClose = (address) => {
    onSelectAddress(address);
    setAddressListOpen(false);
  };
  const isLoadingDelivery = calculatingDelivery || fetchingSellerPincode ||
    (!!sellerPincode && !!sellerInfo && !!deliveryAddress?.pincode && !!product?.weight && !recommendedOption && _isServiceable);

  return (
    <SafeAreaView>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Giveaway Winner Banner */}
        {winnerInfo && (
          <View style={styles.winnerBanner}>
            <View style={styles.winnerHeader}>
              <View style={styles.trophyIcon}>
                <Text style={styles.trophyEmoji}>🏆</Text>
              </View>
              <View>
                <Text style={styles.winnerTitle}>Congratulations!</Text>
                <Text style={styles.winnerSubtitle}>
                  You won this giveaway prize
                </Text>
              </View>
            </View>
            <View style={styles.winnerInfoBox}>
              <Text style={styles.winnerInfoText}>
                🎁 <Text style={styles.bold}>Good news:</Text> This product is FREE
                for you as the winner!
              </Text>
              <Text style={styles.winnerInfoSubtext}>
                You only need to pay for delivery charges to receive your prize.
              </Text>
            </View>
          </View>
        )}

        {/* Prize Details Section */}
        <Text style={styles.sectionTitle}>Your Prize Details</Text>
        <View style={styles.prizeSection}>
          <View style={styles.prizeContent}>
            <Image
              source={
                productImageUrl
                  ? { uri: productImageUrl }
                  : undefined}
              style={styles.productImage}
              resizeMode="cover"
            />
            <View style={styles.prizeDetails}>
              <Text style={styles.productTitle}>{product.title}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.freePrice}>FREE</Text>
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>WINNER PRIZE</Text>
                </View>
              </View>

              <View style={styles.quantityBox}>
                <Text style={styles.quantityText}>Quantity: 1</Text>
              </View>
              <Text style={styles.quantityNote}>
                Quantity is fixed at 1 for giveaway prizes
              </Text>
            </View>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>

          {!isAddressListOpen && deliveryAddress ? (
            <View style={styles.selectedAddressCard}>
              <View style={styles.addressContent}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressIconBox}>
                    <AddressIcon type={deliveryAddress.addressType} />
                  </View>
                  <Text style={styles.addressType}>
                    {deliveryAddress.addressType}
                  </Text>
                </View>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressName}>{deliveryAddress.name}</Text>
                  <Text style={styles.addressText}>{deliveryAddress.line1}</Text>
                  <Text style={styles.addressText}>
                    {deliveryAddress.city}, {deliveryAddress.state} -{' '}
                    {deliveryAddress.pincode}
                  </Text>
                  <Text style={styles.addressText}>
                    Mobile:{' '}
                    <Text style={styles.addressPhone}>{deliveryAddress.mobile}</Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAddressListOpen(true)}>
                <Text style={styles.changeButton}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {(isAddressListOpen || !deliveryAddress) && (
            <View style={styles.addressList}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#f7ce45" />
                </View>
              ) : (
                <>
                  {addresses?.map((address) => (
                    <View
                      key={address._id}
                      style={[
                        styles.addressCard,
                        deliveryAddress?._id === address._id &&
                        styles.addressCardSelected,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.addressCardContent}
                        onPress={() => handleSelectAndClose(address)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.addressIconBox}>
                          <AddressIcon type={address.addressType} />
                        </View>
                        <View style={styles.addressInfo}>
                          <Text style={styles.addressType}>
                            {address.addressType}
                          </Text>
                          <Text style={styles.addressName}>{address.name}</Text>
                          <Text style={styles.addressText}>{address.line1}</Text>
                          <Text style={styles.addressText}>
                            {address.city}, {address.state} - {address.pincode}
                          </Text>
                          <Text style={styles.addressText}>
                            Mobile: <Text style={styles.addressName}>{address.mobile}</Text>
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => onEditAddress(address)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.changeButton}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addAddressButton}
                    onPress={onAddNewAddress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color="#9ca3af" />
                    <Text style={styles.addAddressText}>Add New Address</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Payment Summary */}
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelGreen}>Prize Value</Text>
              <Text style={styles.summaryValueGreen}>FREE</Text>
            </View>
            <View style={styles.summaryInfoBox}>
              <Text style={styles.summaryInfoText}>
                🎁 This product is your giveaway prize - no charge!
              </Text>
            </View>

            {isLoadingDelivery && (
              <View style={styles.calculatingBox}>
                <View style={styles.skeletonRow}>
                  <View style={styles.skeletonLabel} />
                  <View style={styles.skeletonValue} />
                </View>
                <View style={styles.calculatingInfo}>
                  <ActivityIndicator size="small" color="#f7ce45" />
                  <Text style={styles.calculatingText}>
                    {fetchingSellerPincode ? 'Fetching delivery info...' : 'Calculating delivery charges...'}
                  </Text>
                </View>
              </View>
            )}

            {!isLoadingDelivery && recommendedOption && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Delivery (Est. {recommendedOption.estimated_days} days)
                </Text>
                <Text style={styles.summaryValue}>
                  ₹{recommendedOption.charge.toFixed(2)}
                </Text>
              </View>
            )}

            {!isLoadingDelivery && !recommendedOption && deliveryAddress && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelError}>Delivery</Text>
                <Text style={styles.summaryValueError}>Not available</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>To Pay</Text>
              <Text style={styles.summaryTotalValue}>
                ₹{totalAmount.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.summaryNote}>
              {totalAmount === 0
                ? 'No payment required'
                : 'Only delivery charges apply'}
            </Text>
          </View>

          {/* 💰 Payment Method Selector */}
          {
            totalAmount > 0
            && (
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onPaymentMethodSelect={onPaymentMethodChange}
                orderTotal={totalAmount}
                onClose={handleClose}
              />
            )}

          <TouchableOpacity
            style={[
              styles.claimButton,
              (!deliveryAddress ||
                isProcessing ||
                isLoadingDelivery ||
                !recommendedOption) &&
              styles.claimButtonDisabled,
            ]}
            onPress={onNext}
            // disabled={
            //   !deliveryAddress ||
            //   isProcessing ||
            //   calculatingDelivery ||
            //   fetchingSellerPincode ||
            //   !recommendedOption
            // }
            activeOpacity={0.8}
          >
            <Text style={styles.claimButtonText}>
              {isProcessing ? 'Processing...' : 'Claim Your Prize'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView></SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  winnerBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  trophyIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#22c55e',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trophyEmoji: {
    fontSize: 20,
  },
  winnerTitle: {
    color: '#4ade80',
    fontWeight: 'bold',
    fontSize: 18,
  },
  winnerSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
  },
  winnerInfoBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  winnerInfoText: {
    color: '#86efac',
    fontSize: 14,
  },
  bold: {
    fontWeight: 'bold',
  },
  winnerInfoSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  prizeSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  prizeContent: {
    flexDirection: 'row',
    gap: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  prizeDetails: {
    flex: 1,
    gap: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  winnerBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  winnerBadgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '600',
  },
  quantityBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  quantityText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '500',
  },
  quantityNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  addressSection: {
    marginBottom: 16,
  },
  selectedAddressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  addressIconBox: {
    padding: 8,
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderRadius: 8,
    height: 40
  },
  addressType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
  },
  addressDetails: {
    marginLeft: 44,
    gap: 4,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addressText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  addressPhone: {
    fontWeight: '600',
    color: '#fff',
  },
  changeButton: {
    color: '#f7ce45',
    fontWeight: '600',
    fontSize: 14,
  },
  addressList: {
    gap: 8,
  },
  addressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  addressCardSelected: {
    borderColor: '#f7ce45',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
  },
  addressCardContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  addressInfo: {
    flex: 1,
    gap: 4,
  },
  editButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#374151',
    borderRadius: 16,
  },
  addAddressText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  summarySection: {
    gap: 16,
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
  },
  summaryLabelGreen: {
    fontSize: 14,
    color: '#4ade80',
  },
  summaryValueGreen: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  summaryLabelError: {
    fontSize: 14,
    color: '#ef4444',
  },
  summaryValueError: {
    fontSize: 14,
    color: '#ef4444',
  },
  summaryInfoBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  summaryInfoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  calculatingBox: {
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonLabel: {
    width: 128,
    height: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 4,
  },
  skeletonValue: {
    width: 80,
    height: 16,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 4,
  },
  calculatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calculatingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  summaryNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  claimButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.5,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GiveawayOrderAndAddress;
