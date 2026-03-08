//NATIVE MODULE VERSION

import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Image, ActivityIndicator, StyleSheet, NativeModules, Platform} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {Toast} from '../../Utils/dateUtils';
import { useAuthContext } from '../../Context/AuthContext';

// Native module for payment state management (prevents app reload on Android)
const { PaymentStateModule } = NativeModules;

const RazorpayPayment = ({
  razorpayOrderId,
  razorpayKeyId,
  amount,
  currency = 'INR',
  paymentGateway = 'RAZORPAY',
  userEmail,
  userPhone,
  productTitle,
  productImage,
  userName,
  onSuccess,
  onFailure,
  flashSaleData = null,
  bundleData = null,
  quantity = 1,
}) => {
  const {user}=useAuthContext()
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const paymentProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (
      paymentInitialized ||
      !razorpayOrderId ||
      !razorpayKeyId ||
      paymentProcessedRef.current
    ) {
      return;
    }

    const initializeRazorpay = async () => {
      try {
        setPaymentInitialized(true);
        paymentProcessedRef.current = true;

        // Set payment in progress flag on Android to prevent app reload
        if (Platform.OS === 'android' && PaymentStateModule) {
          try {
            PaymentStateModule.setPaymentInProgress(true);
            console.log('💳 Payment state set to in progress');
          } catch (e) {
            console.log('Could not set payment state:', e);
          }
        }

        const options = {
          description: `Payment for ${productTitle || 'your order'}`,
          image: productImage || 'https://yourwebsite.com/logo.png',
          currency: currency,
          key: razorpayKeyId,
          amount: amount, // Amount in paise
          order_id: razorpayOrderId,
          name: productTitle||'Flykup',
          prefill: {
            email: userEmail || user.emailId,
            contact: userPhone || user.mobile,
            name: userName || 'Customer',
          },
          theme: {
            color: '#f7ce45',
          },
        };

        console.log('Opening Razorpay checkout...');

        RazorpayCheckout.open(options)
          .then(response => {
            // Payment Success
            console.log('Payment successful:', response);

            // Clear payment state on Android
            if (Platform.OS === 'android' && PaymentStateModule) {
              try {
                PaymentStateModule.clearPaymentState();
                console.log('💳 Payment state cleared after success');
              } catch (e) {
                console.log('Could not clear payment state:', e);
              }
            }

            // Call success callback
            if (onSuccess) {
              onSuccess({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                gateway: paymentGateway,
              });
            }
          })
          .catch(error => {
            // Payment Failed or Cancelled
            console.log('Payment error:', error);

            // Clear payment state on Android
            if (Platform.OS === 'android' && PaymentStateModule) {
              try {
                PaymentStateModule.clearPaymentState();
                console.log('💳 Payment state cleared after failure');
              } catch (e) {
                console.log('Could not clear payment state:', e);
              }
            }

            const errorMessage =
              error.description || error.error?.description || 'Payment failed';

            // Call failure callback
            if (onFailure) {
              onFailure({
                message: errorMessage,
                code: error.code,
                details: error,
              });
            }
          });
      } catch (error) {
        console.error('Error initializing Razorpay:', error);

        // Clear payment state on Android in case of initialization error
        if (Platform.OS === 'android' && PaymentStateModule) {
          try {
            PaymentStateModule.clearPaymentState();
          } catch (e) {
            console.log('Could not clear payment state:', e);
          }
        }

        if (onFailure) {
          onFailure({message: 'Payment initialization failed'});
        }

        setPaymentInitialized(false);
        paymentProcessedRef.current = false;
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      initializeRazorpay();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Clean up payment state when component unmounts
      if (Platform.OS === 'android' && PaymentStateModule) {
        try {
          PaymentStateModule.clearPaymentState();
        } catch (e) {
          console.log('Could not clear payment state on unmount:', e);
        }
      }
    };
  }, [
    razorpayOrderId,
    razorpayKeyId,
    amount,
    currency,
    userEmail,
    userPhone,
    userName,
    productImage,
    productTitle,
    onSuccess,
    onFailure,
    paymentGateway,
    paymentInitialized,
  ]);

  // Calculate pricing details
  const isFlashSale = !!flashSaleData;
  const amountInRupees = amount ? amount / 100 : 0;
  
  // Get effective prices from bundleData if available
  const effectivePrice = isFlashSale
    ? flashSaleData?.flashPrice || flashSaleData?.bundlePrice || bundleData?.sellingPrice || 0
    : bundleData?.sellingPrice || 0;
  const effectiveMRP = isFlashSale
    ? flashSaleData?.originalPrice || bundleData?.bundleMRP
    : bundleData?.bundleMRP;

  const savingsAmount = effectiveMRP && effectivePrice < effectiveMRP
    ? (effectiveMRP - effectivePrice) * quantity
    : 0;

  return (
    <View style={styles.container}>
      {/* Product Image Display */}
      {productImage && (
        <View style={styles.imageContainer}>
          <Image
            source={{uri: productImage}}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Product Title */}
      {productTitle && <Text style={styles.productTitle}>{productTitle}</Text>}

      {/* Flash Sale Badge */}
      {isFlashSale && (
        <View style={styles.flashSaleBadge}>
          <Text style={styles.flashSaleBadgeText}>🔥 Flash Sale Active</Text>
        </View>
      )}

      {/* Payment Details Card */}
    

      {/* Loading Spinner */}
      <ActivityIndicator size="large" color="#f7ce45" style={styles.spinner} />

      <Text style={styles.mainText}>Redirecting to secure payment...</Text>

      <Text style={styles.subText}>Please do not close this window.</Text>

      {/* Loading states */}
      {!razorpayOrderId && (
        <Text style={styles.warningText}>Preparing payment...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    marginBottom: 24,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  flashSaleBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  flashSaleBadgeText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentCard: {
    width: '100%',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  paymentCardFlashSale: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  paymentCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#d1d5db',
  },
  paymentValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  flashPrice: {
    color: '#ef4444',
  },
  flashSavingsLabel: {
    color: '#f87171',
    fontWeight: '500',
  },
  savingsValue: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  flashSavingsValue: {
    color: '#f87171',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f7ce45',
  },
  flashTotalValue: {
    color: '#ef4444',
  },
  spinner: {
    marginBottom: 16,
  },
  mainText: {
    color: '#d1d5db',
    textAlign: 'center',
    fontSize: 16,
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 14,
    marginTop: 8,
  },
});

export default RazorpayPayment;
