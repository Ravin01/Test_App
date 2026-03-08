import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { getWalletBalance } from '../../../Services/walletService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface PaymentMethodSelectorProps {
  orderTotal: number;
  onPaymentMethodSelect: (method: string) => void;
  selectedMethod?: string;
  onClose?: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  orderTotal,
  onPaymentMethodSelect,
  selectedMethod = 'RAZORPAY',
  onClose,
}) => {
  const navigation = useNavigation();
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    setLoading(true);
    setBalanceError(null);
    try {
      const data = await getWalletBalance();
      const balance = data.availableBalance || data.balance || 0;
      setWalletBalance(balance);
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
      setBalanceError('Failed to load wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const canUseWallet = walletBalance >= orderTotal;
  const shortfall = orderTotal - walletBalance;

  // Handle navigation to wallet page to add money
  const handleAddMoney = useCallback(() => {
    // Close modal if onClose is provided
    if (onClose) {
      onClose();
    }
    // Then navigate to wallet page
    navigation.navigate('WalletPage' as never);
  }, [navigation, onClose]);

  const handleMethodChange = (method: string) => {
    if (method === 'WALLET' && !canUseWallet) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Insufficient wallet balance. You need ₹${shortfall.toFixed(2)} more.`,
          ToastAndroid.LONG
        );
      }
      return;
    }
    onPaymentMethodSelect(method);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select Payment Method</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Payment Method</Text>

      <View style={styles.optionsContainer}>
        {/* Wallet Payment Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleMethodChange('WALLET')}
          disabled={!canUseWallet}
          style={[
            styles.paymentOption,
            selectedMethod === 'WALLET' && styles.paymentOptionSelected,
            !canUseWallet && styles.paymentOptionDisabled,
          ]}>
          <View style={styles.optionContent}>
            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === 'WALLET' && styles.radioOuterSelected,
                  !canUseWallet && styles.radioOuterDisabled,
                ]}>
                {selectedMethod === 'WALLET' && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionHeader}>
                <Icon name="wallet" size={20} color="#EAB308" />
                <Text style={styles.optionTitle}>Pay with Wallet</Text>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Available Balance:</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    canUseWallet ? styles.balanceSufficient : styles.balanceInsufficient,
                  ]}>
                  ₹{walletBalance.toFixed(2)}
                </Text>
              </View>

              {
              !canUseWallet 
              && (
                <View style={styles.insufficientAlert}>
                  <Icon
                    name="alert-circle"
                    size={16}
                    color="#F87171"
                    style={styles.alertIcon}
                  />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Insufficient balance</Text>
                    <Text style={styles.alertSubtitle}>
                      Need ₹{shortfall.toFixed(2)} more
                    </Text>
                    <TouchableOpacity
                      onPress={handleAddMoney}
                      style={styles.addMoneyButton}
                      activeOpacity={0.7}>
                      <Text style={styles.addMoneyText}>Add Money</Text>
                      <ChevronRight size={14} color="#22c55e" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {canUseWallet && selectedMethod === 'WALLET' && (
                <View style={styles.successAlert}>
                  <Text style={styles.successText}>
                    ✓ Instant payment • No gateway charges
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Razorpay Payment Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleMethodChange('RAZORPAY')}
          style={[
            styles.paymentOption,
            selectedMethod === 'RAZORPAY' && styles.paymentOptionSelected,
          ]}>
          <View style={styles.optionContent}>
            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === 'RAZORPAY' && styles.radioOuterSelected,
                ]}>
                {selectedMethod === 'RAZORPAY' && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionHeader}>
                <Icon name="credit-card" size={20} color="#EAB308" />
                <Text style={styles.optionTitle}>
                  UPI / Cards / Net Banking
                </Text>
              </View>

              <Text style={styles.razorpaySubtitle}>Pay using</Text>

              <View style={styles.paymentMethodsContainer}>
                <View style={styles.paymentMethodBadge}>
                  <Text style={styles.paymentMethodText}>🏦 UPI</Text>
                </View>
                <View style={styles.paymentMethodBadge}>
                  <Text style={styles.paymentMethodText}>💳 Cards</Text>
                </View>
                <View style={styles.paymentMethodBadge}>
                  <Text style={styles.paymentMethodText}>🌐 Banking</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Icon
          name="shield-check"
          size={16}
          color="#4ADE80"
          style={styles.securityIcon}
        />
        <Text style={styles.securityText}>
          Your payment is secured with industry-standard encryption
        </Text>
      </View>

      {balanceError && (
        <Text style={styles.errorText}>{balanceError}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // backgroundColor: 'rgba(31, 41, 55, 0.5)',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  paymentOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: 'rgba(31, 41, 55, 0.3)',
  },
  paymentOptionSelected: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  paymentOptionDisabled: {
    backgroundColor: 'rgba(31, 41, 55, 0.2)',
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioContainer: {
    paddingTop: 2,
    marginRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4B5563',
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#EAB308',
  },
  radioOuterDisabled: {
    borderColor: '#4B5563',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EAB308',
  },
  optionDetails: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceSufficient: {
    color: '#4ADE80',
  },
  balanceInsufficient: {
    color: '#F87171',
  },
  insufficientAlert: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F87171',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 2,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  addMoneyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  successAlert: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
  },
  successText: {
    fontSize: 12,
    color: '#4ADE80',
  },
  razorpaySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  paymentMethodBadge: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  securityNote: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(31, 41, 55, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  securityIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorText: {
    marginTop: 12,
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
  },
});

export default PaymentMethodSelector;
