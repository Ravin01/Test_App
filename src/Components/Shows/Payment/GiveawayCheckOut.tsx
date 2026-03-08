import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Step1_OrderAndAddress from './Giveaway_OrderAndAddress'
import RazorpayPayment from '../../Reuse/RazorpayPayment';
import WalletPayment from '../../Wallet/WalletComponents/WalletPayment';
import OrderConfirmation from '../../Reuse/OrderConfirmation';
import axiosInstance from '../../../Utils/Api';
import { AuthContext } from '../../../Context/AuthContext';
import { Toast } from '../../../Utils/dateUtils';
import { useNavigation } from '@react-navigation/native';
import { AWS_CDN_URL } from '../../../../Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddressForm from '../../Shows/Components/FlashSale/AddressForm';


const { width, height } = Dimensions.get('window');

const GiveawayCheckoutSlider = ({
  isOpen,
  onClose,
  giveawayProduct,
  giveawayId,
  streamId,
  winnerInfo,
  onCheckoutComplete,
}) => {
  const { user } = useContext(AuthContext);
  const [[step, direction], setStep] = useState([1, 0]);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    gateway: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [addressMode, setAddressMode] = useState('select');
  const [_editingAddress, setEditingAddress] = useState(null);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const hasTrackedStart = useRef(false);
  const [shipmentMethod, setShipmentMethod] = useState('flykup_logistics');

  // 💰 WALLET PAYMENT STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY');
  const [paymentMethod, setPaymentMethod] = useState(null);

  // --- ANIMATION EFFECTS ---
  useEffect(() => {
    if (isOpen) {
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
    } else {
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
        // Reset state after animation completes
        setTimeout(() => {
          setStep([1, 0]);
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
        }, 100);
      });
    }
  }, [isOpen, slideAnim, fadeAnim]);

  // --- LIFECYCLE EFFECTS ---
  useEffect(() => {
    if (giveawayProduct && isOpen) {
      const gstRate = giveawayProduct.gstRate || 0;
      const basePrice = 0;
      const gstAmount = 0;

      setOrderData((prev) => ({
        ...prev,
        products: [
          {
            product: giveawayProduct,
            quantity: 1,
            basePrice: basePrice,
            gstAmount: gstAmount,
            gstRate: gstRate,
          },
        ],
      }));
    }
  }, [giveawayProduct, isOpen]);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get('user/addresses');
      const userAddresses = response.data.data || [];
      setAddresses(userAddresses);
      if (userAddresses.length > 0) {
        const defaultAddress =
          userAddresses.find((addr) => addr.isDefault) || userAddresses[0];
        setOrderData((prev) => ({ ...prev, deliveryAddress: defaultAddress }));
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      Toast('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
    }
  }, [isOpen, user, fetchAddresses]);


  const trackCheckoutEvent = useCallback(async (
    step,
    status = 'in_progress',
    abandonedAtStep = null
  ) => {
    if (!giveawayProduct?._id) return;
    try {
      await axiosInstance.post('checkout/track', {
        productId: giveawayProduct._id,
        step,
        status,
        abandonedAtStep,
        sourceType: 'giveaway',
        giveawayId: giveawayId,
      });
    } catch (error) {
      console.error('Failed to track giveaway checkout event:', error);
    }
  }, [giveawayProduct, giveawayId]);

  useEffect(() => {
    if (isOpen && giveawayProduct?._id && !hasTrackedStart.current) {
      trackCheckoutEvent('giveaway_checkout_opened');
      hasTrackedStart.current = true;
    }
  }, [isOpen, giveawayProduct, trackCheckoutEvent]);

  useEffect(() => {
    return () => {
      if (hasTrackedStart.current && !checkoutCompleted) {
        let abandonedStep = 'giveaway_checkout_opened';
        if (step === 2) abandonedStep = 'giveaway_payment_initiated';
        trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
      }
    };
  }, [checkoutCompleted, step, trackCheckoutEvent]);

  // --- CORE LOGIC ---
  const handleProceedToPayment = async () => {
    // 🛑 Check if user owns product
    const productSellerId = (() => {
      const seller = giveawayProduct?.sellerId || giveawayProduct?.seller;
      if (!seller) return null;
      return typeof seller === 'object' ? (seller._id || seller.id) : seller;
    })();
    const userSellerId = user?.sellerInfo?._id || user?.sellerInfo?.id;
    const isOwnProduct = productSellerId && userSellerId && productSellerId === userSellerId;

    if (isOwnProduct) {
      Toast('You cannot claim your own product.');
      return;
    }

    // ✅ Show loading immediately
    setIsProcessing(true);

    if (!orderData.deliveryAddress) {
      setIsProcessing(false);
      Toast('Please select a delivery address.');
      return;
    }

    // ✅ Validate payment method selected
    if (!selectedPaymentMethod) {
      setIsProcessing(false);
      Toast('Please select a payment method.');
      return;
    }

    Toast('Preparing your giveaway order...');

    // Track events in background (don't await)
    trackCheckoutEvent('giveaway_address_selected');
    trackCheckoutEvent('giveaway_payment_initiated');

    try {
      // ✅ Get product for dimensions
      const giveawayProductForDimensions = orderData.products[0]?.product;

      // ✅ Build packageDimensions if product has valid dimensions
      let packageDimensions = null;
      if (giveawayProductForDimensions?.dimensions?.length &&
        giveawayProductForDimensions?.dimensions?.width &&
        giveawayProductForDimensions?.dimensions?.height) {
        packageDimensions = {
          length: giveawayProductForDimensions.dimensions.length,
          width: giveawayProductForDimensions.dimensions.width,
          height: giveawayProductForDimensions.dimensions.height,
        };
        console.log('📦 Sending package dimensions for giveaway order:', packageDimensions);
      } else {
        console.log('⚠️ Giveaway product has no dimensions, sending without packageDimensions');
      }

      const orderPayload = {
        sourceType: 'giveaway',
        showId: streamId,
        sourceRefId: giveawayId,
        products: orderData.products.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: 0,
        })),
        paymentMethod: selectedPaymentMethod, // ✅ Use selected payment method
        addressId: orderData.deliveryAddress._id,
        deliveryCharge: orderData.deliveryCharge,
        shipmentMethod: shipmentMethod,
        giveawayWinner: true,
        giveawayId: giveawayId,
        streamId: streamId,
        packageDimensions: packageDimensions, // ✅ Add package dimensions for accurate shipping
      };

      console.log('💰 Creating giveaway order with payment method:', selectedPaymentMethod);
      const response = await axiosInstance.post('order/place-order', orderPayload);

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
          setStep([2, 1]);
          Toast('Proceeding to payment for delivery charges...');
        } else {
          throw new Error('Payment order ID not received from server.');
        }
      }
    } catch (error) {
      console.log('Failed to create giveaway order:', error);
      const errorMessage =
        error.response?.data?.message || 'Could not proceed to payment.';

      if (errorMessage.includes('Insufficient wallet balance')) {
        Toast(errorMessage);
        // Stay on current step - user can change payment method
      } else {
        Toast(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (hasTrackedStart.current && !checkoutCompleted) {
      let abandonedStep = 'giveaway_checkout_opened';
      if (step === 2) abandonedStep = 'giveaway_payment_initiated';
      trackCheckoutEvent(abandonedStep, 'abandoned', abandonedStep);
    }
    onClose();
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
    setCheckoutCompleted(true);
    trackCheckoutEvent('giveaway_payment_completed', 'completed');
    setStep([3, 1]);
    Toast('Giveaway order confirmed! Payment successful!');
    if (onCheckoutComplete) {
      onCheckoutComplete();
    }
  };

  // --- HELPER FUNCTIONS ---
  const navigation = useNavigation();

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

  // --- UI RENDERING ---
  const renderStep = () => {
    switch (step) {
      case 1:
        return addressMode === 'select' ? (
          <GiveawayStep1_OrderAndAddress
            orderData={orderData}
            addresses={addresses}
            loading={loading}
            onSelectAddress={handleAddressSelect}
            onDeliveryChargeUpdate={handleDeliveryChargeUpdate}
            onAddNewAddress={handleAddAddress}
            onEditAddress={handleEditAddress}
            onNext={handleProceedToPayment}
            isProcessing={isProcessing}
            handleClose={handleClose}
            winnerInfo={winnerInfo}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
          />
        ) : (
          <View style={styles.addressFormWrapper}>
            <AddressForm
              address={_editingAddress}
              onSave={handleSaveAddress}
              onCancel={handleCancelAddressForm}
              customColor="#1e1e1e"
            />
          </View>
        );
      case 2:
        const productForImage = orderData.products?.[0]?.product;
        let productImageUrl = null;

        if (productForImage?.signedImages?.[0]) {
          productImageUrl = productForImage.signedImages[0];
        } else if (productForImage?.images?.[0]?.key) {
          productImageUrl = `${AWS_CDN_URL}${productForImage.images[0].key}`;
        }

        // 💰 Show wallet or Razorpay payment based on payment method
        if (paymentMethod === 'WALLET' || selectedPaymentMethod === 'WALLET') {
          return (
            <WalletPayment
              amount={Math.round((orderData.deliveryCharge || 0) * 100)}
              orderId={orderId}
              orderDetails={{
                productId: orderData.products[0].product._id,
                quantity: 1,
                addressId: orderData.deliveryAddress._id,
                deliveryCharge: orderData.deliveryCharge,
              }}
              productTitle={orderData.products[0].product.title}
              productImage={productImageUrl}
              userName={user?.name}
              onSuccess={handlePaymentSuccess}
              onFailure={(error) => {
                console.log('Wallet payment failed:', error);
                Toast('Wallet payment failed');
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
            userEmail={user?.emailId}
            productTitle={orderData.products[0].product.title}
            productImage={productImageUrl}
            userPhone={
              user?.address?.[0]?.mobile || user?.address?.[0]?.alternateMobile
            }
            userName={user?.name}
            onSuccess={handlePaymentSuccess}
            onFailure={(error) => {
              console.log('Payment failed:', error);
              // Toast(error.message || 'Payment failed');
              setStep([1, -1]);
            }}
          />
        );
      case 3:
        return (
          <OrderConfirmation orderId={orderId} onDone={onClose} onTrackOrder={() => navigation.navigate("bottomtabbar", {
            screen: 'HomeTabs',
            params: { screen: 'myactivity' }
          })} />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return addressMode === 'select' ? 'Claim Your Prize' : 'Manage Address';
      case 2:
        return 'Pay Delivery Charges';
      case 3:
        return 'Prize Confirmed';
      default:
        return 'Giveaway Checkout';
    }
  };

  const handleBackClick = () => {
    if (step === 2) {
      setStep([1, -1]);
    } else if (step === 1 && addressMode !== 'select') {
      handleCancelAddressForm();
    }
  };

  if (!giveawayProduct) {
    return null;
  }

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.container}>
        {/* Backdrop */}
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

        {/* Slider Panel */}
        <Animated.View
          style={[
            styles.sliderPanel,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
              {(step === 2 || (step === 1 && addressMode !== 'select')) && (
                <TouchableOpacity
                  onPress={handleBackClick}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              <View style={styles.headerCenter}>
                <Text style={styles.headerEmoji}>🎁</Text>
                <Text style={styles.headerTitle}>{getStepTitle()}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Progress Indicator */}
            {step !== 3 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressSteps}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        step >= 1 && styles.stepCircleActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumber,
                          step >= 1 && styles.stepNumberActive,
                        ]}
                      >
                        1
                      </Text>
                    </View>
                    <Text style={styles.stepLabel}>Claim</Text>
                  </View>

                  <View
                    style={[
                      styles.progressLine,
                      step >= 2 && styles.progressLineActive,
                    ]}
                  />

                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        step >= 2 && styles.stepCircleActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumber,
                          step >= 2 && styles.stepNumberActive,
                        ]}
                      >
                        2
                      </Text>
                    </View>
                    <Text style={styles.stepLabel}>Pay Delivery</Text>
                  </View>

                  <View
                    style={[
                      styles.progressLine,
                      step >= 3 && styles.progressLineActive,
                    ]}
                  />

                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        step >= 3 && styles.stepCircleActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumber,
                          step >= 3 && styles.stepNumberActive,
                        ]}
                      >
                        3
                      </Text>
                    </View>
                    <Text style={styles.stepLabel}>Confirm</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Content Area */}
            {step === 1 && addressMode !== 'select' ? (
              // AddressForm has its own KeyboardAvoidingView and ScrollView
              <View style={styles.contentArea}>
                {renderStep()}
              </View>
            ) : (
              <ScrollView
                style={styles.contentArea}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderStep()}
              </ScrollView>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Customized Step 1 component for giveaway
const GiveawayStep1_OrderAndAddress = ({
  orderData,
  addresses,
  loading,
  onSelectAddress,
  onDeliveryChargeUpdate,
  onAddNewAddress,
  onEditAddress,
  onNext,
  handleClose,
  isProcessing,
  winnerInfo,
  selectedPaymentMethod,
  onPaymentMethodChange,
}) => {
  return (
    <Step1_OrderAndAddress
      orderData={orderData}
      addresses={addresses}
      loading={loading}
      onSelectAddress={onSelectAddress}
      onDeliveryChargeUpdate={onDeliveryChargeUpdate}
      onAddNewAddress={onAddNewAddress}
      onEditAddress={onEditAddress}
      onNext={onNext}
      isProcessing={isProcessing}
      winnerInfo={winnerInfo}
      selectedPaymentMethod={selectedPaymentMethod}
      onPaymentMethodChange={onPaymentMethodChange}
      handleClose={handleClose}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sliderPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.8,    //0.7,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#22c55e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    borderTopEndRadius: 20,
    borderTopStartRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  progressContainer: {
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#22c55e',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
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
    backgroundColor: '#22c55e',
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  addressFormWrapper: {
    flex: 1,
    minHeight: 500,
    paddingBottom: 50,
  },
});

export default GiveawayCheckoutSlider;
