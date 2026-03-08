import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  ToastAndroid,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  withRepeat,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RazorpayCheckout from 'react-native-razorpay';
import {
  initiateTopup,
  verifyTopup,
  getWalletBalance,
} from '../../../Services/walletService';

interface AddMoneyProps {
  onSuccess?: () => void;
}

const AddMoney: React.FC<AddMoneyProps> = ({ onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingProgress, setPollingProgress] = useState(0);
  const [pollingMessage, setPollingMessage] = useState('');
  const initialBalanceRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  // Polling configuration
  const POLL_INTERVAL = 2000; // 2 seconds
  const POLL_MAX_ATTEMPTS = 30; // 60 seconds total

  // Animation
  const spinValue = useSharedValue(0);

  useEffect(() => {
    spinValue.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const handleAddMoney = async () => {
    try {
      // Validate amount
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount < 10) {
        setError('Minimum amount is ₹10');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Minimum amount is ₹10', ToastAndroid.SHORT);
        }
        return;
      }
      if (numAmount > 10000) {
        setError('Maximum amount is ₹10,000');
        if (Platform.OS === 'android') {
          ToastAndroid.show('Maximum amount is ₹10,000', ToastAndroid.SHORT);
        }
        return;
      }

      setLoading(true);
      setError(null);

      // Step 1: Initiate topup
      const response = await initiateTopup(numAmount);

      if (response.success) {
        // Step 2: Open Razorpay
        openRazorpayCheckout(response.data);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Failed to initiate payment';
      setError(errorMsg);
      console.log('Error msg', errorMsg);
      if (Platform.OS === 'android') {
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);
      }
      setLoading(false);
    }
  };

  const openRazorpayCheckout = (orderData: any) => {
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Flykup',
      description: 'Add Money to Wallet',
      order_id: orderData.razorpayOrderId,
      theme: { color: '#F7CE45' },
    };

    RazorpayCheckout.open(options)
      .then(async (data: any) => {
        // Payment successful
        await verifyPayment({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
      })
      .catch((error: any) => {
        setLoading(false);
        if (Platform.OS === 'android') {
          console.log('Razorpay error:', error);
          ToastAndroid.show(
            'Payment cancelled',
            ToastAndroid.SHORT
          );
        }
      });
  };

  const verifyPayment = async (razorpayResponse: any) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Verifying payment...', ToastAndroid.SHORT);
    }

    try {
      // Get current balance before verification
      const currentBalanceData = await getWalletBalance();
      initialBalanceRef.current = currentBalanceData.balance || 0;

      // Verify payment (backend will mark as pending, webhook will credit)
      const response = await verifyTopup(razorpayResponse);

      if (response.success) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Payment verified! Updating balance...', ToastAndroid.SHORT);
        }

        // Start polling for balance update
        await pollForBalanceUpdate(parseFloat(amount));
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (err: any) {
      const errorMsg =
        err.message ||
        err.response?.data?.message ||
        'Payment verification failed';
      setError(errorMsg);
      if (Platform.OS === 'android') {
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);
      }
      setLoading(false);
      setPollingProgress(0);
      setPollingMessage('');
    }
  };

  // Poll for balance update after webhook
  const pollForBalanceUpdate = async (expectedAmount: number) => {
    const targetBalance = (initialBalanceRef.current || 0) + expectedAmount;
    let attempts = 0;

    setPollingMessage('Updating balance...');

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      const progress = Math.round((attempts / POLL_MAX_ATTEMPTS) * 100);
      setPollingProgress(progress);
      setPollingMessage(`Updating balance... ${progress}%`);

      try {
        // Fetch current balance
        const balanceData = await getWalletBalance();
        const currentBalance = balanceData.balance || 0;

        // Check if balance updated
        if (currentBalance >= targetBalance) {
          // Success! Balance updated
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setLoading(false);
          setPollingProgress(0);
          setPollingMessage('');

          if (Platform.OS === 'android') {
            ToastAndroid.show(
              `✅ ₹${expectedAmount} added successfully! New balance: ₹${currentBalance.toFixed(2)}`,
              ToastAndroid.LONG
            );
          }

          setAmount('');
          if (onSuccess) onSuccess();
        } else if (attempts >= POLL_MAX_ATTEMPTS) {
          // Timeout
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setLoading(false);
          setPollingProgress(0);
          setPollingMessage('');

          if (Platform.OS === 'android') {
            ToastAndroid.show(
              'Payment successful! Balance will update shortly.',
              ToastAndroid.LONG
            );
          }

          setAmount('');
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        console.error('Error polling balance:', err);
        // Continue polling even on error
      }
    }, POLL_INTERVAL);
  };

  const paymentMethods = [
    { icon: 'credit-card', label: 'Cards' },
    { icon: 'cellphone', label: 'UPI' },
    { icon: 'bank', label: 'Banking' },
    { icon: 'wallet', label: 'Wallets' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.card}
      >
        <Text style={styles.title}>Add Money to Wallet</Text>

        {/* Error Message */}
        {error && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.errorContainer}
          >
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        {/* Polling Progress */}
        {pollingMessage && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.pollingContainer}
          >
            <View style={styles.pollingHeader}>
              <Text style={styles.pollingMessage}>{pollingMessage}</Text>
              <Text style={styles.pollingPercentage}>{pollingProgress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: `${pollingProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.pollingSubtext}>
              Please wait while we confirm your payment...
            </Text>
          </Animated.View>
        )}

        {/* Quick Amount Buttons */}
        <View style={styles.section}>
          <Text style={styles.label}>Quick Select</Text>
          <View style={styles.quickAmountsGrid}>
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setAmount(amt.toString())}
                activeOpacity={0.7}
                style={[
                  styles.quickAmountButton,
                  amount === amt.toString() && styles.quickAmountButtonActive,
                ]}
              >
                {amount === amt.toString() && (
                  <LinearGradient
                    colors={['#FFD700', '#FFA500', '#FFD700']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.quickAmountGradient}
                  />
                )}
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === amt.toString() &&
                      styles.quickAmountTextActive,
                  ]}
                >
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Enter Custom Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <Text style={styles.hint}>Minimum: ₹10 | Maximum: ₹10,000</Text>
        </View>

        {/* Add Money Button */}
        <TouchableOpacity
          onPress={handleAddMoney}
          disabled={loading || !amount}
          activeOpacity={0.8}
          style={[
            styles.addMoneyButton,
            (loading || !amount) && styles.addMoneyButtonDisabled,
          ]}
        >
          {loading || !amount ? (
            <View
              style={[
                styles.addMoneyButtonContent,
                (loading || !amount) && { backgroundColor: '#333' },
              ]}
            >
              {loading && (
                <Animated.View style={[styles.spinner, spinStyle]}>
                  <Icon name="loading" size={20} color="#999" />
                </Animated.View>
              )}
              <Text
                style={[
                  styles.addMoneyButtonText,
                  (loading || !amount) && styles.addMoneyButtonTextDisabled,
                ]}
              >
                {loading
                  ? pollingMessage
                    ? 'Updating...'
                    : 'Processing...'
                  : 'Add Money'}
              </Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addMoneyButtonContent}
            >
              <Text style={styles.addMoneyButtonText}>Add Money</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Payment Methods Info */}
        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.paymentMethodsTitle}>
            Accepted Payment Methods
          </Text>
          <View style={styles.paymentMethodsGrid}>
            {paymentMethods.map((method, index) => (
              <View key={index} style={styles.paymentMethod}>
                <Icon name={method.icon} size={20} color="#FFD700" />
                <Text style={styles.paymentMethodLabel}>{method.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#ef444410',
    borderWidth: 1,
    borderColor: '#ef444420',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
  },
  pollingContainer: {
    backgroundColor: '#3b82f610',
    borderWidth: 1,
    borderColor: '#3b82f620',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  pollingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollingMessage: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '600',
  },
  pollingPercentage: {
    color: '#60a5fa',
    fontSize: 11,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  pollingSubtext: {
    color: '#999',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',  // '#999',
    marginBottom: 8,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  quickAmountButton: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  quickAmountButtonActive: {
    borderColor: '#FFD700',
  },
  quickAmountGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 1,
  },
  quickAmountTextActive: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  hint: {
    fontSize: 11,
    color: '#ccc',  //'#666',
    marginTop: 6,
  },
  addMoneyButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  addMoneyButtonDisabled: {
    opacity: 0.5,
  },
  addMoneyButtonContent: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addMoneyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  addMoneyButtonTextDisabled: {
    color: '#666',
  },
  spinner: {
    marginRight: 8,
  },
  paymentMethodsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#444' //'#333',
  },
  paymentMethodsTitle: {
    fontSize: 11,
    color: '#ccc',  // '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  paymentMethod: {
    width: '23%',
    marginHorizontal: '1%',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:'#444',// '#333',
  },
  paymentMethodLabel: {
    fontSize: 11,
    color: '#ccc',  // '#666',
    marginTop: 6,
  },
});

export default AddMoney;
