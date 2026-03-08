import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  ToastAndroid,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';

interface WalletPaymentProps {
  amount: number;
  orderId: string;
  orderDetails?: any;
  productTitle?: string;
  productImage?: string;
  userName?: string;
  onSuccess: (data: {
    paymentId: string;
    orderId: string;
    gateway: string;
    transactionDetails: {
      orderId: string;
      amount: number;
      paymentMethod: string;
    };
  }) => void;
  onFailure: (data: { message: string; error: any }) => void;
}

const WalletPayment: React.FC<WalletPaymentProps> = ({
  amount,
  orderId,
  orderDetails,
  productTitle,
  productImage,
  userName,
  onSuccess,
  onFailure,
}) => {
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const paymentSuccessRef = useRef(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const statusPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    startPulseAnimation();
    startSpinAnimation();
    startStatusPulseAnimation();

    return () => {
      pulseAnim.stopAnimation();
      spinAnim.stopAnimation();
      statusPulseAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (paymentInitialized || !orderId || !amount) {
      return;
    }

    const initializeWalletPayment = async () => {
      try {
        setPaymentInitialized(true);
        setProcessing(true);

        // ✅ WALLET PAYMENT IS ALREADY COMPLETE!
        // The order was placed and wallet was deducted in the previous step
        // This component just shows processing animation and then success

        // Show confirmation message
        // if (Platform.OS === 'android') {
        //   ToastAndroid.show('Confirming wallet payment...', ToastAndroid.SHORT);
        // }

        // Simulate a brief delay for UX (payment is already complete)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mark payment as successful
        paymentSuccessRef.current = true;

        // Show success message
        // if (Platform.OS === 'android') {
        //   ToastAndroid.show('Payment completed successfully! Redirecting in 2 seconds...', ToastAndroid.LONG);
        // }

        // Auto-redirect after 2 seconds
        autoCloseTimerRef.current = setTimeout(() => {
          onSuccess({
            paymentId: orderId, // Use orderId as payment identifier
            orderId: orderId,
            gateway: 'WALLET',
            transactionDetails: {
              orderId,
              amount: amount / 100,
              paymentMethod: 'wallet',
            },
          });
        }, 2000);
      } catch (error) {
        console.error('Error processing wallet payment:', error);
        
        if (Platform.OS === 'android') {
          const errorMessage = (error as any)?.message || 'Payment failed. Please try again.';
          ToastAndroid.show(errorMessage, ToastAndroid.LONG);
        }

        onFailure({
          message: (error as any)?.message || 'Wallet payment failed',
          error: error,
        });
        setProcessing(false);
        setPaymentInitialized(false);
      }
    };

    initializeWalletPayment();

    // Cleanup function
    return () => {
      // Clear auto-close timer on cleanup
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [orderId, amount, onSuccess, onFailure, paymentInitialized]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSpinAnimation = () => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const startStatusPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulseAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(statusPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Product Image Display */}
      {productImage && (
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: productImage }}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Product Title */}
      {productTitle && (
        <Text style={styles.productTitle}>{productTitle}</Text>
      )}

      {/* Wallet Icon Animation */}
      <View style={styles.walletIconContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={['#F7CE45', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletIconCircle}
          >
            <Svg width={40} height={40} viewBox="0 0 20 20" fill="#1a1a1a">
              <Path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
              />
            </Svg>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Processing Animation and Text */}
      <View style={styles.processingContainer}>
        <Animated.View
          style={[styles.spinner, { transform: [{ rotate: spin }] }]}
        />
        <Text style={styles.processingText}>
          Processing wallet payment...
        </Text>
        <Text style={styles.amountText}>
          Amount: ₹{(amount / 100).toFixed(2)}
        </Text>
        <Text style={styles.warningText}>
          Please do not close this window.
        </Text>
      </View>

      {/* Payment Info */}
      <View style={styles.paymentInfoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Method:</Text>
          <Text style={styles.infoValue}>Wallet</Text>
        </View>
        <View style={styles.infoRowLast}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.statusDot,
                { transform: [{ scale: statusPulseAnim }] },
              ]}
            />
            <Text style={styles.statusText}>Processing</Text>
          </View>
        </View>
      </View>

      {/* Security Badge */}
      <View style={styles.securityBadge}>
        <Svg width={16} height={16} viewBox="0 0 20 20" fill="#4ADE80">
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          />
        </Svg>
        <Text style={styles.securityText}>
          Secure payment via Flykup Wallet
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#121212',
  },
  productImageContainer: {
    marginBottom: 24,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  walletIconContainer: {
    marginBottom: 24,
  },
  walletIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#F7CE45',
    marginBottom: 16,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
    marginTop: 8,
  },
  paymentInfoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    width: '100%',
    maxWidth: 400,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F7CE45',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24',
  },
  securityBadge: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#777777',
    marginLeft: 8,
  },
});

export default WalletPayment;
