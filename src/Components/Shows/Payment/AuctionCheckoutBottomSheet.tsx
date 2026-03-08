import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  AppState,
  NativeModules,
  BackHandler,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Trophy, AlertCircle } from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import axiosCourier from '../../../Utils/axiosCourier';
import { AuthContext } from '../../../Context/AuthContext';
import { AWS_CDN_URL } from '../../../../Config';
import { useNavigation } from '@react-navigation/native';
import { Toast } from '../../../Utils/dateUtils';
import RazorpayPayment from '../../Reuse/RazorpayPayment';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const { PictureInPictureModule } = NativeModules;

const IndianRupee = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Text style={{ fontSize: size * 0.8, color, fontWeight: '600' }}>₹</Text>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  _auctionData: any;
  onCheckoutComplete?: () => void;
  onPaymentStateChange?: (isPaymentInProgress: boolean, needsReconnect?: boolean) => void;
}

const AuctionCheckoutBottomSheet = ({ isOpen, onClose, _auctionData, onCheckoutComplete, onPaymentStateChange }: Props) => {
  const [auctionData, setAuctionData] = useState(_auctionData);
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const rbSheetRef = useRef<any>(null);
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const paymentStartedRef = useRef(false);
  
  useEffect(() => { if (_auctionData) setAuctionData(_auctionData); }, [_auctionData]);
  
  const [step, setStep] = useState(1);
  const [orderData, setOrderData] = useState<any>({
    auctionId: null, product: null, winningBid: 0, deliveryAddress: null,
    deliveryCharge: 0, estimatedDays: null, basePrice: 0, gstAmount: 0, gstRate: 0,
  });
  const [shipmentMethod, setShipmentMethod] = useState('flykup_logistics');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>({ orderId: null, keyId: null, amount: null, currency: null, gateway: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [sellerPincode, setSellerPincode] = useState<string | null>(null);
  
  const hasTrackedStart = useRef(false);
  const isMountedRef = useRef(true);
  const orderDataRef = useRef(orderData);
  const lastCalculatedPincodeRef = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (step === 2) {
      setIsPaymentInProgress(true);
      paymentStartedRef.current = true;
      PictureInPictureModule?.setAutoEnterPIP?.(false);
      onPaymentStateChange?.(true);
    } else if (paymentStartedRef.current && step !== 2) {
      setIsPaymentInProgress(false);
      paymentStartedRef.current = false;
      PictureInPictureModule?.setAutoEnterPIP?.(true);
      onPaymentStateChange?.(false);
    }
  }, [step, onPaymentStateChange]);

  useEffect(() => {
    if (!isPaymentInProgress) return;
    const handleAppStateChange = (nextAppState: any) => {
      if ((appStateRef.current === 'background' || appStateRef.current === 'inactive') && nextAppState === 'active' && paymentStartedRef.current) {
        setTimeout(() => onPaymentStateChange?.(false, true), 500);
      }
      appStateRef.current = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isPaymentInProgress, onPaymentStateChange]);

  useEffect(() => { return () => { paymentStartedRef.current && PictureInPictureModule?.setAutoEnterPIP?.(true); }; }, []);
  useEffect(() => { orderDataRef.current = orderData; }, [orderData]);

  const isValidWinner = user && auctionData?.winner && (() => {
    const winnerId = typeof auctionData.winner === 'object' ? (auctionData.winner._id || auctionData.winner.id) : auctionData.winner;
    return ((user as any)._id || (user as any).id) === winnerId;
  })();

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
  useEffect(() => { isOpen && isValidWinner ? rbSheetRef.current?.open() : rbSheetRef.current?.close(); }, [isOpen, isValidWinner]);

  useEffect(() => {
    const fetchSellerPincode = async () => {
      if (!auctionData?.product?._id || !isOpen) return;
      try {
        const response = await axiosInstance.get(`courier/seller-pincode/${auctionData.product._id}`);
        if (response.data.status) setSellerPincode(response.data.pincode);
      } catch (error) { console.log('Failed to fetch seller pincode:', error); }
    };
    fetchSellerPincode();
  }, [auctionData?.product?._id, isOpen]);

  const calculateDeliveryCharges = useCallback(async () => {
    const currentOrderData = orderDataRef.current;
    if (!isMountedRef.current || !isOpen || !sellerPincode || !currentOrderData.deliveryAddress?.pincode || !currentOrderData.product?.weight || !(currentOrderData.winningBid > 0)) return;
    setCalculatingDelivery(true);
    const seller = currentOrderData.product?.seller || currentOrderData.product?.sellerId;
    const preferredShipping = seller?.shippingInfo?.preferredShipping?.toLowerCase();
    const isFlykupShipping = preferredShipping === 'flykup' || preferredShipping === 'flykupLogistics';
    if (!isFlykupShipping) {
      setOrderData((prev: any) => ({ ...prev, deliveryCharge: currentOrderData.product?.deliveryCharge, estimatedDays: null }));
      setShipmentMethod('self_shipment');
      setCalculatingDelivery(false);
      return;
    }
    try {
      const payload = { seller_pincode: sellerPincode, customer_pincode: currentOrderData.deliveryAddress.pincode, product_weight: (currentOrderData.product.weight.value || 100) / 1000, weight_unit: 'kg', order_value: currentOrderData.winningBid, payment_mode: 'prepaid' };
      const response = await axiosCourier.post('business/calculate-delivery', payload);
      if (isMountedRef.current && response.data.success && response.data.data?.recommended_courier) {
        const rec = response.data.data.recommended_courier;
        setOrderData((prev: any) => ({ ...prev, deliveryCharge: rec.delivery_charges, estimatedDays: rec.estimated_days }));
        setShipmentMethod('flykup_logistics');
      } else if (isMountedRef.current) {
        setOrderData((prev: any) => ({ ...prev, deliveryCharge: currentOrderData.product?.deliveryCharge || 40, estimatedDays: null }));
        setShipmentMethod('self_shipment');
      }
    } catch { if (isMountedRef.current) { setOrderData((prev: any) => ({ ...prev, deliveryCharge: currentOrderData.product?.deliveryCharge || 40, estimatedDays: null })); setShipmentMethod('self_shipment'); } }
    finally { if (isMountedRef.current) setCalculatingDelivery(false); }
  }, [isOpen, sellerPincode]);

  useEffect(() => {
    const currentPincode = orderData.deliveryAddress?.pincode;
    if (isOpen && currentPincode && sellerPincode && currentPincode !== lastCalculatedPincodeRef.current) {
      lastCalculatedPincodeRef.current = currentPincode;
      calculateDeliveryCharges();
    }
  }, [isOpen, orderData.deliveryAddress?.pincode, sellerPincode, calculateDeliveryCharges]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!auctionData || !isOpen || !isValidWinner) return;
      const needsProductFetch = !auctionData.product || typeof auctionData.product !== 'object' || !auctionData.product._id;
      if (needsProductFetch && auctionData._productId) {
        try {
          setLoading(true);
          const response = await axiosInstance.get(`/product-details/${auctionData._productId || auctionData.product}`);
          if (response.data.data && isMountedRef.current) {
            setAuctionData((prev: any) => ({ ...prev, product: response.data.data }));
            setOrderData((prev: any) => ({ ...prev, product: response.data.data }));
          }
        } catch { Toast('Failed to load product details'); }
        finally { if (isMountedRef.current) setLoading(false); }
      }
    };
    fetchProductDetails();
  }, [auctionData, isOpen, isValidWinner]);

  useEffect(() => {
    if (auctionData && isOpen && isValidWinner && auctionData.product?._id && !hasInitialized.current) {
      const gstRate = Number(auctionData.product?.gstRate) || 18;
      const winningBid = Number(auctionData.winningBid) || 0;
      if (winningBid > 0 && !isNaN(winningBid)) {
        const basePrice = winningBid / (1 + gstRate / 100);
        setOrderData({ auctionId: auctionData.auctionId, product: auctionData.product, winningBid, basePrice: Math.round(basePrice * 100) / 100, gstAmount: Math.round((winningBid - basePrice) * 100) / 100, gstRate, deliveryAddress: null, deliveryCharge: 0, estimatedDays: null });
        hasInitialized.current = true;
      } else { Toast('Invalid auction data.'); handleClose(); }
    }
  }, [auctionData, auctionData?.product?._id, isOpen, isValidWinner]);

  const handleSheetClose = () => {
    if (isMountedRef.current) {
      setTimeout(() => {
        setStep(1);
        setOrderData({ auctionId: null, product: null, winningBid: 0, deliveryAddress: null, deliveryCharge: 0, estimatedDays: null, basePrice: 0, gstAmount: 0, gstRate: 0 });
        setOrderId(null);
        setPaymentData({ orderId: null, keyId: null, amount: null, currency: null, gateway: null });
        setIsProcessing(false);
        setCheckoutCompleted(false);
        hasTrackedStart.current = false;
        lastCalculatedPincodeRef.current = null;
        hasInitialized.current = false;
        onClose?.();
      }, 300);
    }
  };

  useEffect(() => {
    if (isOpen && user && isValidWinner) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [addressesResponse] = await Promise.allSettled([axiosInstance.get('user/addresses')]);
          if (addressesResponse.status === 'fulfilled') {
            const userAddresses = (addressesResponse.value as any).data.data || [];
            setAddresses(userAddresses);
            if (userAddresses.length > 0) {
              const defaultAddress = userAddresses.find((addr: any) => addr.isDefault) || userAddresses[0];
              setOrderData((prev: any) => ({ ...prev, deliveryAddress: defaultAddress }));
            }
          } else Toast('Failed to load addresses');
        } catch { Toast('Failed to load required information'); }
        finally { setLoading(false); }
      };
      fetchData();
    }
  }, [isOpen, user, isValidWinner, auctionData?.product?._id]);

  const trackAuctionCheckoutEvent = async (stepName: string, status = 'in_progress', abandonedAtStep: string | null = null) => {
    if (!auctionData?.auctionId) return;
    try { await axiosInstance.post('checkout/track', { auctionId: auctionData.auctionId, productId: auctionData.product?._id, step: stepName, status, abandonedAtStep, winningBid: auctionData.winningBid }); } catch {}
  };

  const isOwnProduct = auctionData?.product?.sellerId === (user as any)?.sellerInfo?._id;

  const handleProceedToPayment = async () => {
    if (isOwnProduct) { Toast('You cannot purchase your own product.'); return; }
    if (!orderData.deliveryAddress) { Toast('Please select a delivery address.'); return; }
    if (calculatingDelivery) { Toast('Please wait, delivery charges are still calculating.'); return; }
    setIsProcessing(true);
    try {
      const orderPayload = { sourceType: 'auction', sourceRefId: orderData.auctionId, finalBidAmount: orderData.winningBid, products: [{ productId: orderData.product._id, quantity: 1 }], paymentMethod: 'RAZORPAY', addressId: orderData.deliveryAddress._id, shipmentMethod, deliveryCharge: orderData.deliveryCharge, orderValue: orderData.winningBid };
      const response = await axiosInstance.post('order/place-order', orderPayload);
      if (response.data?.data?.paymentOrderId) {
        setPaymentData({ orderId: response.data.data.paymentOrderId, keyId: response.data.data.paymentKeyId, amount: response.data.data.amount, currency: response.data.data.currency || 'INR', gateway: response.data.data.paymentGateway });
        setOrderId(response.data.data.paymentOrderId);
        setStep(2);
        Toast('Proceeding to payment...');
      } else throw new Error('Payment order ID not received.');
    } catch (error: any) { Toast(error.response?.data?.message || error.message || 'Could not proceed.'); }
    finally { setIsProcessing(false); }
  };

  const handlePaymentSuccess = () => { setCheckoutCompleted(true); trackAuctionCheckoutEvent('payment_completed', 'completed'); setStep(3); Toast('Auction payment successful!'); onCheckoutComplete?.(); };
  const handleClose = () => { if (hasTrackedStart.current && !checkoutCompleted) { trackAuctionCheckoutEvent(step === 2 ? 'payment_initiated' : 'checkout_opened', 'abandoned', step === 2 ? 'payment_initiated' : 'checkout_opened'); } rbSheetRef.current?.close(); };
  const handleAddressSelect = useCallback((address: any) => { setOrderData((prev: any) => ({ ...prev, deliveryAddress: address })); }, []);
  const handleAddAddress = () => { handleClose(); (navigation as any).navigate('AddressForm'); };
  const handleEditAddress = (address: any) => { handleClose(); (navigation as any).navigate('AddressForm', { item: address }); };
  const handleBackClick = () => { step === 2 ? setStep(1) : handleClose(); };

  useEffect(() => {
    const handleBack = () => { if (isOpen) { handleBackClick(); return true; } return false; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => backHandler.remove();
  }, [isOpen, step]);

  const renderStep1 = () => {
    const totalAmount = orderData.winningBid + orderData.deliveryCharge;
    const productImageUrl = orderData.product?.signedImages?.[0] || (orderData.product?.images?.[0]?.key ? `${AWS_CDN_URL}${orderData.product.images[0].key}` : 'https://via.placeholder.com/80');
    return (
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={styles.celebrationCard}>
          <View style={styles.celebrationHeader}><Trophy size={24} color="#eab308" /><Text style={styles.celebrationTitle}>Congratulations!</Text></View>
          <Text style={styles.celebrationText}>You won this auction! Complete your purchase below.</Text>
        </View>
        {isOwnProduct && (<View style={styles.ownProductWarning}><View style={styles.ownProductWarningHeader}><AlertCircle size={24} color="#ef4444" /><Text style={styles.ownProductWarningTitle}>Cannot Purchase</Text></View><Text style={styles.ownProductWarningText}>You cannot buy your own product.</Text></View>)}
        <View style={styles.card}>
          {loading && !orderData.product ? (<View style={styles.productLoadingContainer}><ActivityIndicator size="small" color="#eab308" /><Text style={styles.loadingText}>Loading...</Text></View>) : (
            <View style={styles.productRow}>
              <Image source={{ uri: productImageUrl }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>{orderData.product?.title || 'Auction Item'}</Text>
                <Text style={styles.productDescription} numberOfLines={2}>{orderData.product?.description || ''}</Text>
                <View style={styles.winningBidBadge}><Trophy size={16} color="#eab308" /><Text style={styles.winningBidText}>Winning Bid</Text></View>
                <View style={styles.priceRowInline}><IndianRupee size={20} color="#fff" /><Text style={styles.priceText}>{orderData.winningBid?.toLocaleString()}</Text></View>
              </View>
            </View>
          )}
        </View>
        <View style={styles.card}>
          <View style={styles.addressHeader}><Text style={styles.cardTitle}>Delivery Address</Text><TouchableOpacity onPress={handleAddAddress}><Text style={styles.addNewButton}>Add New</Text></TouchableOpacity></View>
          {loading ? (<ActivityIndicator size="large" color="#eab308" style={styles.loader} />) : addresses.length === 0 ? (
            <View style={styles.emptyAddresses}><Text style={styles.emptyAddressesText}>No addresses found</Text><TouchableOpacity style={styles.addAddressButton} onPress={handleAddAddress}><Text style={styles.addAddressButtonText}>Add Address</Text></TouchableOpacity></View>
          ) : (
            <ScrollView style={styles.addressScrollContainer} nestedScrollEnabled showsVerticalScrollIndicator>
              <View style={styles.addressList}>{addresses.map((address) => (
                <View key={address._id} style={[styles.addressCard, orderData.deliveryAddress?._id === address._id && styles.selectedAddress]}>
                  <TouchableOpacity style={styles.addressContent} onPress={() => handleAddressSelect(address)} activeOpacity={0.7}>
                    <Text style={styles.addressName}>{address.name}</Text>
                    <Text style={styles.addressDetails}>{address.line1}, {address.line2 && `${address.line2}, `}{address.city}, {address.state} - {address.pincode}</Text>
                    <Text style={styles.addressDetails}>{address.mobile}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEditAddress(address)} activeOpacity={0.7}><Text style={styles.addNewButton}>Edit</Text></TouchableOpacity>
                </View>
              ))}</View>
            </ScrollView>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Base Price</Text><View style={styles.priceValueRow}><IndianRupee size={12} color="#9ca3af" /><Text style={styles.priceValue}>{(orderData.basePrice || 0).toFixed(2)}</Text></View></View>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>GST ({orderData.gstRate || 0}%)</Text><View style={styles.priceValueRow}><IndianRupee size={12} color="#9ca3af" /><Text style={styles.priceValue}>{(orderData.gstAmount || 0).toFixed(2)}</Text></View></View>
            <View style={styles.priceRow}><Text style={[styles.priceLabel, styles.highlightText]}>Winning Bid Total</Text><View style={styles.priceValueRow}><IndianRupee size={12} color="#eab308" /><Text style={[styles.priceValue, styles.highlightText]}>{(orderData.winningBid || 0).toFixed(2)}</Text></View></View>
            {calculatingDelivery ? (<View style={styles.calculatingRow}><ActivityIndicator size="small" color="#eab308" /><Text style={styles.calculatingText}>Calculating delivery...</Text></View>) : (
              <View style={styles.priceRow}><Text style={styles.priceLabel}>Delivery{shipmentMethod === 'flykup_logistics' && orderData.estimatedDays && <Text style={styles.estimatedDays}> (Est. {orderData.estimatedDays} days)</Text>}</Text><View style={styles.priceValueRow}><IndianRupee size={12} color="#9ca3af" /><Text style={styles.priceValue}>{(orderData.deliveryCharge || 0).toFixed(2)}</Text></View></View>
            )}
            {shipmentMethod === 'self_shipment' && !calculatingDelivery && orderData.deliveryCharge > 0 && <Text style={styles.sellerShipmentText}>Shipped by seller.</Text>}
            <View style={[styles.priceRow, styles.totalRow]}><Text style={styles.totalLabel}>Total Amount</Text><View style={styles.priceValueRow}><IndianRupee size={16} color="#eab308" /><Text style={styles.totalValue}>{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></View></View>
          </View>
        </View>
        <TouchableOpacity style={[styles.proceedButton, (!orderData.deliveryAddress || isProcessing || calculatingDelivery || isOwnProduct) && styles.disabledButton]} onPress={handleProceedToPayment} disabled={!orderData.deliveryAddress || isProcessing || calculatingDelivery || isOwnProduct}>
          {isProcessing ? <ActivityIndicator color="#000" /> : <View style={styles.proceedButtonContent}><Text style={styles.proceedButtonText}>Proceed to Payment</Text><IndianRupee size={16} color="#000" /><Text style={styles.proceedButtonText}>{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text></View>}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderStep2 = () => {
    const productImageUrl = orderData.product?.signedImages?.[0] || (orderData.product?.images?.[0]?.key ? `${AWS_CDN_URL}${orderData.product.images[0].key}` : 'https://via.placeholder.com/80');
    return (<RazorpayPayment razorpayOrderId={paymentData.orderId} razorpayKeyId={paymentData.keyId} amount={paymentData.amount} currency={paymentData.currency} paymentGateway={paymentData.gateway} userEmail={(user as any)?.emailId} productTitle={orderData.product?.title} productImage={productImageUrl} userPhone={(user as any)?.address?.[0]?.mobile || (user as any)?.address?.[0]?.alternateMobile} userName={(user as any)?.name} onSuccess={handlePaymentSuccess} onFailure={() => setStep(1)} />);
  };

  const renderStep3 = () => (
    <View style={styles.centeredContent}>
      <View style={styles.successIcon}><Trophy size={40} color="#fff" /></View>
      <Text style={styles.successTitle}>Auction Purchase Complete!</Text>
      <Text style={styles.successText}>Congratulations! You've successfully purchased your winning auction item.</Text>
      <View style={styles.orderIdCard}><Text style={styles.orderIdLabel}>Order ID</Text><Text style={styles.orderIdValue}>{orderId || 'ORDER123456'}</Text></View>
      <TouchableOpacity style={styles.doneButton} onPress={handleClose}><Text style={styles.doneButtonText}>Done</Text></TouchableOpacity>
    </View>
  );

  return (
    <RBSheet ref={rbSheetRef} height={SCREEN_HEIGHT * 0.85} openDuration={250} closeDuration={200} draggable dragOnContent={false} closeOnPressMask closeOnPressBack onClose={handleSheetClose}
      customStyles={{ wrapper: { backgroundColor: 'rgba(0, 0, 0, 0.6)' }, draggableIcon: { backgroundColor: '#666', width: 40, height: 4 }, container: { backgroundColor: '#1e1e1e', borderTopLeftRadius: 24, borderTopRightRadius: 24 } }}>
      <View style={styles.sheetContent}>
        {step !== 3 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}><View style={[styles.progressCircle, step >= 1 && styles.progressCircleActive]}><Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text></View><Text style={styles.progressLabel}>Review</Text></View>
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={styles.progressStep}><View style={[styles.progressCircle, step >= 2 && styles.progressCircleActive]}><Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text></View><Text style={styles.progressLabel}>Payment</Text></View>
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={styles.progressStep}><View style={[styles.progressCircle, step >= 3 && styles.progressCircleActive]}><Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text></View><Text style={styles.progressLabel}>Confirm</Text></View>
          </View>
        )}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  sheetContent: { flex: 1, backgroundColor: '#1e1e1e' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 16 },
  progressStep: { alignItems: 'center' },
  progressCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  progressCircleActive: { backgroundColor: '#eab308' },
  progressNumber: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  progressNumberActive: { color: '#000' },
  progressLabel: { fontSize: 10, color: '#9ca3af' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#374151', marginHorizontal: 8 },
  progressLineActive: { backgroundColor: '#eab308' },
  scrollContent: { flex: 1 },
  scrollContentContainer: { padding: 16, paddingBottom: 40 },
  celebrationCard: { backgroundColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.3)', borderRadius: 12, padding: 16, marginBottom: 16 },
  celebrationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  celebrationTitle: { fontSize: 18, fontWeight: '700', color: '#eab308' },
  celebrationText: { fontSize: 14, color: '#d1d5db' },
  ownProductWarning: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16, marginBottom: 16 },
  ownProductWarningHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  ownProductWarningTitle: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
  ownProductWarningText: { fontSize: 14, color: '#fca5a5' },
  card: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#374151', padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  productLoadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 12, color: '#9ca3af', marginTop: 8 },
  productRow: { flexDirection: 'row', gap: 16 },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#374151' },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  productDescription: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  winningBidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  winningBidText: { fontSize: 12, fontWeight: '500', color: '#eab308' },
  priceRowInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addNewButton: { fontSize: 14, color: '#eab308', fontWeight: '500' },
  loader: { paddingVertical: 20 },
  emptyAddresses: { alignItems: 'center', paddingVertical: 20 },
  emptyAddressesText: { fontSize: 14, color: '#9ca3af', marginBottom: 12 },
  addAddressButton: { backgroundColor: '#eab308', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addAddressButtonText: { fontSize: 14, fontWeight: '600', color: '#000' },
  addressScrollContainer: { maxHeight: 200 },
  addressList: { gap: 12 },
  addressCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 2, borderColor: '#4b5563', borderRadius: 8, overflow: 'hidden' },
  selectedAddress: { borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)' },
  addressContent: { flex: 1, padding: 12, paddingRight: 8 },
  addressName: { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 4 },
  addressDetails: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  editButton: { padding: 12, justifyContent: 'center', alignItems: 'center', minWidth: 60 },
  priceBreakdown: { gap: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#9ca3af', flex: 1 },
  priceValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceValue: { fontSize: 14, color: '#9ca3af' },
  highlightText: { color: '#eab308', fontWeight: '500' },
  calculatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calculatingText: { fontSize: 12, color: '#6b7280' },
  estimatedDays: { fontSize: 10, color: '#6b7280' },
  sellerShipmentText: { fontSize: 10, color: '#10b981', fontWeight: '600', textAlign: 'right' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#4b5563', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#eab308' },
  proceedButton: { backgroundColor: '#eab308', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  disabledButton: { opacity: 0.5 },
  proceedButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proceedButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  successText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  orderIdCard: { backgroundColor: '#374151', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 24 },
  orderIdLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  orderIdValue: { fontSize: 16, fontWeight: '600', color: '#eab308', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  doneButton: { backgroundColor: '#eab308', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
});

export default AuctionCheckoutBottomSheet;
