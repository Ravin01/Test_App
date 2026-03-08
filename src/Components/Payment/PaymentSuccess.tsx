import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useRoute } from '@react-navigation/native';
import Header from '../Reuse/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import SellerHeader from '../SellerComponents/SellerForm/Header';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const PaymentSuccess = ({navigation, route}) => {
  const data = route.params;
  const amount = data?.amount + data?.orderPayload?.deliveryCharge;
  // console.log(data);
  const orderPayload = data?.orderPayload;
  const [isOrderPlaced, setisOrderPlaced] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} className='bg-primary-color'>
      <SellerHeader message={'Payment Success'} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="checkmark-circle" size={48} color="#F7CE45" />
              </View>
              <Text style={styles.headerTitle}>Payment Successful!</Text>
              <Text style={styles.headerSubtitle}>
                Thank you for your purchase. Your order has been confirmed.
              </Text>
            </View>

            <View style={styles.detailsContainer}>
              {/* Order Summary */}
              <View style={styles.orderSummary}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.transactionInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Product</Text>
                    <Text style={styles.value}>{orderPayload?.title}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Order ID</Text>
                    <Text style={styles.value}>
                      {data?.orderID || 'N/F'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.totalAmountRow}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.amount}>₹{amount}</Text>
                  </View>
                </View>
              </View>

              {/* Next Steps */}
              <View style={styles.nextSteps}>
                <Text style={styles.sectionTitle}>What's Next?</Text>
                <View style={styles.stepsContainer}>
                  <View style={styles.step}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>1</Text>
                    </View>
                    <Text style={styles.stepText}>
                      You will receive an email confirmation with your order details shortly.
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Track your order status in your account dashboard.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={styles.viewOrderButton} 
                  onPress={() => setisOrderPlaced(!isOrderPlaced)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.primaryButtonText,{color:'#000'}]}>View Order Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.continueShoppingButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {isOrderPlaced && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              fallSpeed={2500}
              explosionSpeed={500}
              fadeOut={true}
              colors={['#F7CE45', '#FF6B9D', '#C44C7A', '#9A4D8C', '#6B2C5F']}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: '#0A0A0B', // Very dark background
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#0A0A0B',
    paddingHorizontal: 20,
  },
  scrollViewContainer: {
    paddingBottom: 20,
    marginTop: 10,
  },
  card: {
    maxWidth: 400,
    backgroundColor: '#1A1A1D', // Dark card background
    borderRadius: 24,
    padding: 24,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#2A2A2E', // Subtle border
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    backgroundColor: '#F7CE4520', // Semi-transparent pink background
    padding: 20,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#F7CE4540',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F7CE45',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#B0B0B3', // Light gray for subtitle
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsContainer: {
    marginTop: 12,
  },
  orderSummary: {
    backgroundColor: '#252529', // Darker section background
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3A3E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFFFFF', // White for section titles
  },
  transactionInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  label: {
    color: '#9A9A9D', // Medium gray for labels
    fontSize: 14,
  },
  value: {
    fontWeight: '600',
    color: '#E0E0E3', // Light gray for values
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#3A3A3E',
    marginVertical: 16,
  },
  totalAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  amount: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#F7CE45', // Main color for amount
  },
  nextSteps: {
    marginTop: 24,
  },
  stepsContainer: {
    marginTop: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    backgroundColor: '#F7CE45',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepNumber: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#B0B0B3',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    marginTop: 28,
    gap: 12,
  },
  viewOrderButton: {
    backgroundColor: '#F7CE45',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueShoppingButton: {
    backgroundColor: 'transparent',
    borderColor: '#F7CE45',
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F7CE45',
  },
});

export default PaymentSuccess;