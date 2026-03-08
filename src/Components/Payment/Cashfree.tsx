import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, Image, ScrollView } from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRoute } from "@react-navigation/native";
import api from "../../Utils/Api";
import Header from '../Reuse/Header';
import {
  CFCallback,
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  CFDropCheckoutPayment,
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';
import { SafeAreaView } from "react-native-safe-area-context";
import SellerHeader from "../SellerComponents/SellerForm/Header";

const CashfreePaymentGateway = ({ navigation, route }: any) => {
  const orderPayload = route.params;
  const amount = orderPayload?.productPrice;
  const title = orderPayload?.title || orderPayload?.productName || "Payment";
  const numericAmount = parseInt(amount, 10);
  const [loading, setLoading] = useState(false);

const handlePayment = async () => {
    try {
      setLoading(true);

      const response = await api.post(`/order/place-order`, orderPayload);
      const paymentSessionId = response.data.data.paymentSessionId;
      const orderID = response.data.data.order?._id;
      
      const session = new CFSession(
        paymentSessionId,
        orderID,
        CFEnvironment.SANDBOX
      );
        const theme = new CFThemeBuilder()
           .setNavigationBarBackgroundColor('#E64A19')
      .setNavigationBarTextColor('#FFFFFF')
      .setButtonBackgroundColor('#FFC107')
      .setButtonTextColor('#FFFFFF')
      .setPrimaryTextColor('#212121')
      .setSecondaryTextColor('#757575')
      .build();  
      CFPaymentGatewayService.setCallback({
    
        onVerify(orderID: string): void {
          console.log('Order ID is: ' + orderID);
          // Use setTimeout to allow the payment gateway to fully close
          setTimeout(() => {
            navigation.navigate("PaymentSuccess", { orderID, orderPayload,amount });
          }, 100);
        },
        onError(error: CFErrorResponse, orderID: string): void {
          console.log(error?.response?.data);
          // Use setTimeout for error navigation as well
          setTimeout(() => {
            navigation.navigate("PaymentFailed", { 
              orderID, 
              orderPayload, 
              amount,
              errorMsg: error?.message 
            });
          }, 100);
          console.log('Error: ' + JSON.stringify(error) + '\nOrder ID: ' + orderID);
        },
      });


      const dropPayment = new CFDropCheckoutPayment(session, null, theme);
      CFPaymentGatewayService.doPayment(dropPayment);
    } catch (error) {
      console.log("Error initiating payment:", error.response?.data);
      // Handle initialization errors
      setTimeout(() => {
        navigation.navigate("PaymentFailed", { 
          orderID: null, 
          orderPayload, 
          errorMsg: "Failed to initialize payment" 
        });
      }, 100);
    } finally {
      setLoading(false);
    }
};
 
  return (
    <SafeAreaView style={styles.safeArea} className="bg-primary-color">
      <SellerHeader navigation={navigation} message={'Secure Payment'} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main Payment Card */}
        <View style={styles.paymentCard}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.headerIcon}>
              <Ionicons name="shield-checkmark-outline" size={28} color="#FFD700" />
            </View>
            <Text style={styles.headerTitle}>Secure Payment</Text>
            <Text style={styles.headerSubtitle}>Protected by industry-standard encryption</Text>
          </View>

          {/* Product Info Section */}
          <View style={styles.productSection}>
            <View style={styles.productHeader}>
              <Ionicons name="bag-outline" size={20} color="#FFD700" />
              <Text style={styles.productLabel}>Purchase Details</Text>
            </View>
            <Text style={styles.productTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>

          {/* Amount Section */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <View style={styles.amountDisplay}>
              <Text style={styles.currency}>₹</Text>
              <Text style={styles.amountValue}>{numericAmount.toLocaleString("en-IN")}</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>INR</Text>
              </View>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.featureText}>256-bit SSL Encryption</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <MaterialIcons name="credit-card" size={20} color="#2196F3" />
                </View>
                <Text style={styles.featureText}>Multiple Payment Options</Text>
              </View>
            </View>
            
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="time-outline" size={20} color="#FF9800" />
                </View>
                <Text style={styles.featureText}>Instant Processing</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.featureText}>100% Secure</Text>
              </View>
            </View>
          </View>

          {/* Payment Button */}
          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.payButtonText}>Processing...</Text>
                {/* <View style={styles.loadingDot} /> */}
              </View>
            ) : (
              <>
                <Ionicons name="card-outline" size={24} color="#000" />
                <Text style={styles.payButtonText}>Pay Securely Now</Text>
                <Ionicons name="arrow-forward" size={24} color="#000" />
              </>
            )}
          </TouchableOpacity>

          {/* Trust Indicators */}
          <View style={styles.trustSection}>
            <View style={styles.trustItem}>
              <Ionicons name="lock-closed" size={16} color="#4CAF50" />
              <Text style={styles.trustText}>SSL Secured</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="shield" size={16} color="#4CAF50" />
              <Text style={styles.trustText}>PCI Compliant</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.trustText}>Verified</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By proceeding, you agree to our{" "}
              <Text style={styles.linkText}>Terms & Conditions</Text>
              {" "}and{" "}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsCard}>
          <Text style={styles.methodsTitle}>Accepted Payment Methods</Text>
          <View style={styles.methodsGrid}>
            <View style={styles.methodItem}>
              <MaterialIcons name="credit-card" size={24} color="#FFD700" />
              <Text style={styles.methodText}>Cards</Text>
            </View>
            <View style={styles.methodItem}>
              <Ionicons name="phone-portrait" size={24} color="#FFD700" />
              <Text style={styles.methodText}>UPI</Text>
            </View>
            <View style={styles.methodItem}>
              <MaterialIcons name="account-balance" size={24} color="#FFD700" />
              <Text style={styles.methodText}>Net Banking</Text>
            </View>
            <View style={styles.methodItem}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#FFD700" />
              <Text style={styles.methodText}>Wallets</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: '#0a0a0a',
    // paddingBottom:40,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  productSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productLabel: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 8,
    fontWeight: '600',
  },
  productTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 24,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 4,
  },
  currencyBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  currencyText: {
    fontSize: 12,
    color: '#000',
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
  payButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
  payButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginLeft: 8,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#444',
    marginHorizontal: 12,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#FFD700',
    fontWeight: '500',
  },
  paymentMethodsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    maxHeight:200,
    marginBottom:50,
    // paddingBottom:170,
    borderColor: '#333',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  methodItem: {
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default CashfreePaymentGateway;