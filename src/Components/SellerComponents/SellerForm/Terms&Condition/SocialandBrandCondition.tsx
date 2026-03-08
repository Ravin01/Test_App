import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../../Utils/Colors';

const SocialandBrandCondition = ({ isOpen, onClose, onAccept }) => {
  const [expandedSections, setExpandedSections] = useState({
    scope: false,
    RBIGuidelines: false,
    sellerObligaitons: false,
    fradPrevention: false,
    DataSecurity: false,
    forcemajeure: false,
    agreement: false,
    govermentLaw: false,
    pricing: false,
    acceptebyseller: false,
  });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  const sections = {
    scope: {
      title: "1. Scope of Agreement",
      content: `This Agreement governs the Seller's use of the Flykup platform for listing, promoting, selling, and fulfilling orders via Live Selling, Auctions, Shoppable Videos, and Standard E-commerce Listings.

Flykup acts as a marketplace facilitator and does not take ownership of the products listed by the Seller.

The Seller agrees to comply with all applicable laws, regulations, and platform policies.`,
    },
    RBIGuidelines: {
      title: "2. Compliance with RBI Guidelines",
      content: `The Seller agrees to comply with all applicable Reserve Bank of India (RBI) regulations governing payment aggregation and e-commerce transactions, including:

Nodal Account Compliance: All payments shall be processed via a nodal account in compliance with RBI's Master Directions on Prepaid Payment Instruments (PPIs) and Payment Aggregators (PAs).
Settlement Timeline: Payouts will be processed 48 hours post-delivery confirmation as per RBI guidelines.
Refunds & Chargebacks: Refunds and chargebacks will be handled in accordance with RBI's grievance redressal mechanisms.
The Seller acknowledges that Flykup will hold funds in the nodal account until the settlement period is completed, as per RBI guidelines.`,
    },
    sellerObligaitons: {
      title: "3. Seller Obligations",
      content: `The Seller shall:

Ensure all listed products comply with the Consumer Protection Act, 2019, GST regulations, and other applicable laws.
Maintain quality standards and fulfill orders within the agreed timeframe.
Accurately describe products, pricing, and availability.
Resolve disputes and customer complaints in a timely manner.
Remain responsible for chargebacks arising from non-delivery, fraud, or product-related issues.
The Seller shall not engage in fraudulent activities, including but not limited to:

Misrepresentation of products.
Manipulation of sales or reviews.
Unauthorized use of customer data.`,
    },
    fradPrevention: {
      title: "4. Fraud Prevention & Chargebacks",
      content: `4.1 Flykup reserves the right to monitor transactions and take necessary action, including withholding payments, suspending accounts, or terminating agreements in cases of suspected fraud.

4.2 The Seller agrees to cooperate with Flykup in fraud investigations and provide necessary documentation upon request.

4.3 The Seller shall bear all liabilities arising from chargebacks due to non-delivery of products, product defects or misrepresentation, and customer disputes or dissatisfaction.`,
    },
    DataSecurity: {
      title: "5. Data Security & Privacy",
      content: `The Seller agrees to handle customer data in compliance with the Information Technology Act, 2000 and related data protection rules, including the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.

The Seller shall:

Implement reasonable security practices to protect customer information.
Not share customer data with third parties without explicit consent.
Report any data breaches or security incidents to Flykup immediately.`,
    },
    forcemajeure: {
      title: "6. Force Majeure",
      content: `Neither party shall be liable for delays or failures in performance caused by unforeseen events beyond their control, including but not limited to:
Natural disasters.
Pandemics or epidemics.
Government actions or regulatory changes.
Acts of terrorism or war.
In the event of a force majeure, the affected party shall notify the other party promptly and take reasonable steps to mitigate the impact.`,
    },
    agreement: {
      title: "7. Agreement Amendments & Termination",
      content: `7.1 Flykup may update this Agreement with 30 days' prior notice.

7.2 If the Seller disagrees with any changes, they may terminate the Agreement with written notice within 15 days of receiving the update.

7.3 Flykup reserves the right to suspend or terminate this Agreement immediately in cases of breach of terms, fraudulent activities, non-compliance with laws, or failure to resolve customer disputes or chargebacks.

7.4 Upon termination, the Seller must clear all outstanding dues and obligations.`,
    },
    govermentLaw: {
      title: "8. Governing Law & Dispute Resolution",
      content: `8.1 This Agreement shall be governed by the laws of India.

8.2 Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts in Coimbatore, Tamil Nadu.

8.3 The parties agree to attempt amicable resolution of disputes through negotiation before resorting to legal proceedings.`,
    },
    pricing: {
      title: "Annexure - Pricing & Charges",
      content: `Transaction Fee: 2.75% on all successful transactions.

Payout Cycle: 48 hours post-delivery confirmation.

Nodal Account: As per RBI guidelines.`,
    },
    acceptebyseller: {
      title: 'Acceptance by Seller',
      content: `By accepting this Agreement and completing registration, the Seller agrees to abide by all terms and conditions outlined herein.

Authorized Representative:

Pavan Kumar, Director, KAPS Nextgen Pvt Ltd

Date of Effect:

Seller's Signature: ______________________

Seller's Name: ______________________

Date: ______________________`
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
              <Text style={styles.headerText}>Sellers Agreement</Text>
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