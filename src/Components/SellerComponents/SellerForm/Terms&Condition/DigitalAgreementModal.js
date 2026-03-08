import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../../Utils/Colors';

const SocialandBrandCondition = ({ isOpen, onClose, onAccept }) => {
  const [expandedSections, setExpandedSections] = useState({
    purpose: true,
    dataCollection: false,
    storageSecurity: false,
    retention: false,
    userRights: false,
    legalCompliance: false,
    fraudPrevention: false,
    updates: false,
    contact: false,
  });

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };
  const sections = {
    purpose: {
      title: "1. Purpose & Scope",
      content: `TThis Policy outlines the procedures for collecting, storing, and managing digital consent and audit trails of transactions conducted on the Flykup platform.

It applies to all Sellers, Social Sellers, and Users interacting with the platform for transactions, agreements, and digital approvals.

The Policy ensures compliance with RBI guidelines, the Information Technology Act, 2000, and other applicable laws governing e-commerce and digital transactions.`,
    },
    dataCollection: {
      title: "2. Data Collection for Digital Consent",
      content: `The Platform captures and stores the following details as part of the digital consent process:
IP Address: The originating network address of the user at the time of agreement acceptance.
Timestamp: The precise date and time when consent was recorded.
User Identification: The registered user ID, email, or mobile number associated with the consent.
Device Information: Browser type, operating system, and device details (where applicable).
Action Logged: The specific action taken (e.g., agreement acceptance, order confirmation, etc.).
Geolocation Data: Approximate location of the user at the time of consent (if applicable).
This data collection ensures compliance with RBI guidelines, prevents fraud and unauthorized transactions, and reinforces the legal enforceability of digital agreements under the relevant laws.`,
    },
    storageSecurity: {
      title: "3. Storage & Security Measures",
      content: `Encryption of stored consent logs using industry-standard protocols (e.g., AES-256).
Access controls limiting data access to authorized personnel only.
Multi-factor authentication (MFA) for accessing sensitive data.
Regular audits to ensure compliance and data integrity.
Data localization as per RBI guidelines, with all data stored on servers located in India.
All collected data is securely stored in compliance with the IT Rules, RBI’s Master Directions on PPIs and PAs, and applicable security standards. Third-party service providers, if any, are required to adhere to these standards.`,
    },
    retention: {
      title: "4. Retention Policy",
      content: `Digital consent and audit trail records will be retained for 5 years from the date of the transaction or agreement, in accordance with RBI guidelines and IT Act regulations.

After the retention period, records will be securely archived or deleted unless required for legal or regulatory purposes. In cases of ongoing disputes or investigations, data will be retained until resolution.`,
    },
    userRights: {
      title: "5. User Rights & Access to Consent Records",
      content: `Sellers and users can request access to their consent records by submitting a formal request to support@flykup.in.

Upon verification, consent logs will be provided within 10 business days.

Users have the right to request correction of inaccurate or incomplete data, withdraw consent for future transactions (subject to platform policies), and lodge grievances related to data handling or consent records.`,
    },
    legalCompliance: {
      title: "6. Legal & Compliance Requirements",
      content: `Compliance with RBI Guidelines on payment aggregators, digital transactions, and data localization.
Adherence to the Information Technology Act, 2000 and related IT security rules.
Observance of the Indian Contract Act, 1872 concerning digital contracts.
Compliance with the Consumer Protection Act, 2019 for grievance redressal and transparency.
Digital consent logs may be used as evidence in legal disputes in accordance with the Indian Evidence Act, 1872. The Platform will cooperate with regulatory authorities and law enforcement agencies as required.`,
    },
    fraudPrevention: {
      title: "7. Fraud Prevention & Dispute Resolution",
      content: `The Platform employs advanced fraud detection mechanisms to identify and prevent unauthorized transactions.

In case of disputes, users can raise grievances through the platform’s Grievance Redressal Mechanism. Disputes will be resolved in compliance with RBI’s grievance redressal framework and the Consumer Protection Act, 2019, with chargebacks and refunds processed as per platform policies.`,
    },
    updates: {
      title: "8. Updates & Amendments",
      content: `This Policy may be updated periodically to reflect changes in regulatory requirements or platform operations.

Users will be notified of any significant changes via email or platform notifications at least 30 days in advance. Continued use of the platform after amendments constitutes acceptance of the revised Policy.`,
    },
    contact: {
      title: "9. Contact Information",
      content: `KAPS Nextgen Pvt Ltd

Email: support@flykup.in

Registered Address: No.7, Kambar Street, SRP Mills, Janatha Nagar, Saravanampatti, Coimbatore South, Coimbatore - 641035, Tamil Nadu, India

Effective Date: 20/03/2025

Authorized Representative: Pavan Kumar, Director, KAPS Nextgen Pvt Ltd`,
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
              <Text style={styles.headerText}>Digital Consent & Audits</Text>
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