import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../../Utils/Colors';

const SocialandBrandCondition = ({ isOpen, onClose, onAccept }) => {
    const [expandedSections, setExpandedSections] = useState({
        introduction: true,
        eligibility: false,
        product: false,
        liveSelling: false,
        fulfillment: false,
        payments: false,
        prohibited: false,
        liability: false,
        amendments: false,
        agreement: false
      });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };
  const sections = {
    introduction: {
      title: "1. Scope of Agreement",
      content: `Welcome to Flykup, a live shopping and auction platform connecting sellers with buyers in a real-time interactive environment. By registering as a seller on Flykup, you agree to comply with these Seller Terms & Conditions, Flykup's Privacy Policy, and all applicable laws.

By clicking "I Agree," you confirm that you have read, understood, and accepted these terms.`,
    },
    eligibility: {
      title: "2. Compliance with RBI Guidelines",
      content: `To sell on Flykup, you must:

Be at least 18 years old and legally eligible to conduct business in India.
Provide accurate and verifiable KYC details (PAN, Aadhaar, GST, Bank Account, etc.).
Agree to our Live Selling & Product Quality Guidelines.
Not have any history of fraud, counterfeit sales, or policy violations on any e-commerce platform.
Flykup reserves the right to reject or suspend any seller account that fails to meet these criteria.`,
    },
    product: {
      title: "3. Seller Obligations",
      content: `All sellers must:

Ensure that all product listings are genuine, legally owned, and meet quality standards.
Provide accurate product descriptions, pricing, and images/videos.
Clearly disclose warranty, return, and refund policies.
Avoid prohibited products, including counterfeit goods, illegal items, or restricted categories (e.g., alcohol, tobacco, weapons, etc.).
Flykup reserves the right to remove any listing that is misleading, violates regulations, or affects buyer trust.`,
    },
    liveSelling: {
      title: "4. Fraud Prevention & Chargebacks",
      content: `As a live commerce platform, Flykup expects sellers to:

Conduct professional and engaging live sales with clear communication.
Avoid misleading claims, false advertising, or offensive behavior.
Follow Flykup's broadcasting standards, including content restrictions and engagement policies.
Ensure high-quality video, audio, and presentation.
Sellers violating live-streaming policies will be suspended or permanently banned.
`,
    },
    fulfillment: {
      title: "5. Data Security & Privacy",
      content: `Orders must be processed and shipped within the agreed timeframe (Same day or 1-3 days).
Sellers must use Flykup's logistics partner or ensure reliable self-shipping.
Tracking details must be updated within 24 hours of dispatch.
Returns and refunds must be handled as per the declared policy.
Delayed shipments, non-fulfillment, or frequent cancellations may lead to penalties or account suspension.`,
    },
    payments: {
      title: "6. Force Majeure",
      content: `Sellers receive payments after order fulfillment and return window completion.
Flykup deducts a pre-agreed commission per sale before settlement.
Payments are processed weekly/monthly based on transaction volume.
GST and other applicable taxes are the seller's responsibility.
Chargebacks, fraud, or disputes may result in payment holds or account review`,
    },
    prohibited: {
      title: "7. Agreement Amendments & Termination",
      content: `The following activities will result in immediate termination of the seller account:

Selling counterfeit, illegal, or misrepresented products.
Fake bidding, price manipulation, or fraudulent activity.
Misleading buyers, false claims, or unethical sales practices.
Using unauthorized payment methods or engaging in off-platform transactions.
Violating intellectual property laws or infringing copyrights.
Flykup has the right to suspend, ban, or take legal action against sellers violating these policies.`,
    },
    liability: {
      title: "8. Governing Law & Dispute Resolution",
      content: `Sellers are fully responsible for their products, warranties, and buyer disputes.
Flykup is not liable for any damages, legal claims, or losses arising from seller misconduct.
Sellers agree to indemnify and hold Flykup harmless against any claims related to product defects, customer complaints, or policy violations.`,
    },
    amendments: {
      title: "Annexure - Pricing & Charges",
      content: `Flykup reserves the right to update these terms at any time.
Sellers will be notified of major changes via email or platform notifications.
Flykup can terminate any seller account without notice if policies are violated.`,
    },
    agreement:{
        title:'Acceptance by Seller',
        content:`By clicking "I Agree", you confirm that:

You have read, understood, and accepted Flykup's Seller Terms & Conditions.
All information provided during registration is accurate and verifiable.
You will comply with all applicable laws, regulations, and platform policies.
If you do not agree to these terms, you should not proceed with seller registration.`
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.headerText}>Terms & Conditions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content - Scrollable Area */}
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {Object.keys(sections).map((section, index) => (
              <View key={index} style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>{sections[section].title}</Text>
                  <Ionicons 
                    name={expandedSections[section] ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                {expandedSections[section] && (
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionText}>{sections[section].content}</Text>
                  </View>
                )}
              </View>
            ))}
            
            {/* Additional spacing at bottom */}
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.declineButton}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>I Agree to Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor:colors.primaryColor,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor:'#333',
    // backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  section: {
    marginBottom: 12,
    borderRadius: 8,
    // backgroundColor: '#f8f9fa',
    backgroundColor: colors.primaryButtonColor,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor:colors.SecondaryColor,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    paddingRight: 10,
  },
  sectionContent: {
    padding: 16,
    backgroundColor: '#333',
  },
  sectionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    textAlign: 'justify',
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: colors.SecondaryColor,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#333',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  declineButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 16,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SocialandBrandCondition;