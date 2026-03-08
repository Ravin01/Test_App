import { useRoute } from "@react-navigation/native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Header from '../Reuse/Header';
import { SafeAreaView } from "react-native-safe-area-context";
import SellerHeader from "../SellerComponents/SellerForm/Header";
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const PaymentFailed = ({navigation}) => {
  const route = useRoute();
  const data = route.params;
  // console.log(data)

  return (
    <SafeAreaView style={styles.safeArea} className="bg-primary-color">
      <SellerHeader message={'Payment Failed'} navigation={navigation}/>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.card} className="mb-5">
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="close-circle" size={48} color="#e74c3c" />
              </View>
              <Text style={styles.headerTitle}>Payment Failed!</Text>
              <Text style={styles.headerSubtitle}>
                We weren't able to process your payment. Please try again.
              </Text>
            </View>

            <View style={styles.detailsContainer}>
              {/* Error Details */}
              <View style={styles.errorDetails} className="bg-secondary-color">
                <Text style={styles.sectionTitle}>Transaction Details</Text>
                <View style={styles.transactionInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Status</Text>
                    <Text style={styles.value}>Failed</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Amount</Text>
                    <Text style={styles.value}>₹{data?.amount+data?.orderPayload?.deliveryCharge}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Date</Text>
                    <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.errorMessage}>
                  <Text style={styles.errorText}>
                    {data?.errorMsg || "Transaction was declined. Please check your payment details and try again."}
                  </Text>
                </View>
              </View>

              {/* Troubleshooting Steps */}
              <View style={styles.troubleshooting} className="bg-secondary-color">
                <Text style={styles.sectionTitle}>Troubleshooting Steps</Text>
                <View style={styles.troubleshootingSteps}>
                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>1</Text>
                    <Text style={styles.stepText}>
                      Verify that your card has sufficient funds and isn't expired.
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>2</Text>
                    <Text style={styles.stepText}>
                      Check if your card allows online/international transactions.
                    </Text>
                  </View>
                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>3</Text>
                    <Text style={styles.stepText}>
                      Ensure all payment details were entered correctly.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.retryButton} onPress={()=>navigation.goBack()}>
                  <Ionicons name="refresh" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={[styles.buttonText, { color: 'white' }]}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="headset" size={20} color="#FFD700" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}> Support</Text>
                </TouchableOpacity>
              </View>

              {/* Help Text */}
              <Text style={styles.helpText}>Need help? Our support team is available 24/7</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: '#1a1a1a',
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#1a1a1a",
  },
  scrollViewContent: {
    paddingBottom: 20,
    // marginBottom:30,
    paddingHorizontal: 15,
  },
  card: {
    width: "100%",
    // backgroundColor: "#2a2a2a",
    borderRadius: 20,
    padding: 20,
    // shadowColor: "#000",
    marginTop: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // elevation: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerIcon: {
    backgroundColor: "#3d1a1a", // Dark red background for error icon
    padding: 16,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#e74c3c",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e74c3c", // Keep red for error emphasis
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#B0B0B0", // Light gray for subtitle
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  detailsContainer: {
    marginTop: 10,
  },
  errorDetails: {
    // backgroundColor: ",
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#FFFFFF", // White for section titles
  },
  transactionInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 4,
  },
  label: {
    color: "#B0B0B0", // Light gray for labels
    fontSize: 16,
  },
  value: {
    fontWeight: "600",
    color: "#FFFFFF", // White for values
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#444444", // Dark divider
    marginVertical: 16,
  },
  errorMessage: {
    backgroundColor: "#3d1a1a", // Dark red background
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  errorText: {
    color: "#ff6b6b", // Light red for error text
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  troubleshooting: {
    marginTop: 24,
    // backgroundColor: "#333333",
    padding: 20,
    borderRadius: 12,
  },
  troubleshootingSteps: {
    marginTop: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingRight: 8,
  },
  stepNumber: {
    backgroundColor: "#e74c3c",
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 50,
    width: 32,
    height: 32,
    textAlign: "center",
    marginRight: 16,
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  stepText: {
    color: "#E0E0E0", // Light gray for step text
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    gap: 12,
  },
  retryButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  contactButton: {
    borderColor: "#FFD700",
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(255, 215, 0, 0.1)", // Subtle gold background
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700", // Gold for contact button text
  },
  helpText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#888888", // Darker gray for help text
    lineHeight: 20,
  },
});

export default PaymentFailed;