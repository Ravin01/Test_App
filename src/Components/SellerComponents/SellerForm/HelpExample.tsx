/* eslint-disable react-native/no-inline-styles */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Linking,
  Dimensions,
  StatusBar,
} from 'react-native';
import { FAB } from 'react-native-paper';
import RBSheet from 'react-native-raw-bottom-sheet';
import Ionicons from "react-native-vector-icons/Ionicons";
import Entypo from "react-native-vector-icons/Entypo";
import { email, phoneNumber, whatsappNumber } from '../../../Utils/Constants';

const { width, height } = Dimensions.get('window');

const faqData = {
  0: [ // Tab 0: Personal Details
    {
      q: "Is my personal information secure?",
      a: "Yes. All your data is protected with industry-standard encryption. We only use your information for verification and account-related communication."
    },
    {
      q: "Which name and address should I use?",
      a: "Please use your full legal name and address as they appear on your official documents (like your PAN and Aadhaar card) for successful verification."
    },
    {
      q: "How can I update my details later?",
      a: "You can easily manage your profile, Pickup address, and bank details from your Seller Dashboard after your application is approved."
    },
    {
      q: "What should I do if the page is not working?",
      a: "Please try refreshing the page. If the problem continues, check your internet connection or contact our support team using the links below."
    },
  ],
  1: [ // Tab 1: Verification
    {
      q: "What if my Aadhaar verification fails?",
      a: "If online verification fails after 3 tries, the form will allow you to upload your Aadhaar card images for our team to review manually."
    },
    {
      q: "Why is a GST number needed for Brand Sellers?",
      a: "A GSTIN is a legal requirement for most businesses selling goods in India. It's necessary for tax compliance and to operate as a Brand Seller on our platform."
    },
    {
      q: "How can I register without a GST number?",
      a: "You can register as a Social Seller! That application path is designed for individuals and smaller businesses that may not have a GST number."
    },
    {
      q: "Do I need my company's PAN card?",
      a: "Yes. If you register as a business (e.g., Private Limited, LLP), you must use the company's PAN. Individuals and Sole Proprietors should use their personal PAN."
    },
  ],
  2: [ // Tab 2: Business Profile
    {
      q: "What kind of products can I sell?",
      a: "You can sell physical products across many categories like fashion, electronics, and home goods."
    },
    {
      q: "What is a 'Product Catalog'?",
      a: "It's a showcase of your products. You can provide a link to your website or Instagram shop, Drive Link, or upload images/PDFs of your products directly upto 10 images/PDFs."
    },
  ],
  3: [ // Tab 3: Logistics & Payments
    {
      q: "Which shipping method is better?",
      a: "For new sellers, we recommend 'Flykup Logistics' as we handle all shipping complexities. 'Self-shipping' is great if you already have a reliable courier partner."
    },
    {
      q: "What does accepting the Terms & Conditions mean for me?",
      a: "By accepting, you're entering into a formal partnership with us. The terms outline the clear guidelines for our work together, including payment cycles, shipping standards, and return policies, ensuring a transparent and fair experience for both sellers and customers."
    },
    {
      q: "How long does seller approval take?",
      a: "Our approval times vary based on the completeness of your application:\n\n- **Instant Approval:** Applications with complete, clear, and successfully verified information are often approved almost instantly.\n\n- **Standard Review:** Most applications require a quick manual review by our team. This typically takes 1 to 2 business days.\n\n- **Re-application Needed:** If an application has significant missing information or details that cannot be verified, it may be rejected. You will be notified via email and are welcome to re-apply with the corrected information.\n\nWe strive to process all applications as quickly as possible and will notify you of the outcome."
    }
  ]
};

const tabTitles = {
  0: "Personal Details",
  1: "Verification",
  2: "Business Profile",
  3: "Logistics & Payments"
};

const FAQHelpBottomSheet = ({ currentTabIndex = 0, rbSheetRef }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleContact = (type) => {
    switch (type) {
      case 'call':
        Linking.openURL(`tel:${phoneNumber}`);
        break;
      case 'email':
        Linking.openURL(`mailto:${email}?subject=Help Request`);
        break;
      case 'whatsapp':
        Linking.openURL(`https://wa.me/${whatsappNumber}?text=Hi, I need help with my seller registration`);
        break;
    }
  };

  const currentFAQs = faqData[currentTabIndex] || [];

  return (
    <RBSheet
      ref={rbSheetRef}
      height={height * 0.85}
      openDuration={600}
    //   dragOnContent
    //   draggable
  closeOnPressBack
      closeDuration={250}
    //   closeOnDragDown={true}
      closeOnPressMask={true}
      customStyles={{
        wrapper: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
        draggableIcon: {
          backgroundColor: '#F7CE45',
          width: 60,
          height: 5,
        },
        container: {
          backgroundColor: '#1A1A1A',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
        }
      }}
    >
      {/* <StatusBar backgroundColor="rgba(0, 0, 0, 0.8)" barStyle="light-content" /> */}
      
      <View style={styles.sheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {/* <View style={styles.helpIconContainer}>
                <Ionicons name="help-circle" size={28} color="#F7CE45" />
              </View> */}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <Text style={styles.headerSubtitle}>{tabTitles[currentTabIndex]}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => rbSheetRef.current?.close()} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles" size={20} color="#F7CE45" />
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            </View>
            
            {currentFAQs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={[
                    styles.questionContainer,
                    expandedItems.has(index) && styles.questionContainerExpanded
                  ]}
                  onPress={() => toggleExpand(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.questionContent}>
                    {/* <View style={styles.questionIconContainer}>
                      {/* <Ionicons name="help-circle-outline" size={18} color="#F7CE45" /> 
                    </View> */}
                    <Text style={styles.questionText}>{faq.q}</Text>
                  </View>
                  <View style={[
                    styles.expandIconContainer,
                    expandedItems.has(index) && styles.expandIconRotated
                  ]}>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color="#F7CE45"
                    />
                  </View>
                </TouchableOpacity>
                
                {expandedItems.has(index) && (
                  <Animated.View style={styles.answerContainer}>
                    <View style={styles.answerContent}>
                      <View style={styles.answerIconContainer}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      </View>
                      <Text style={styles.answerText}>{faq.a}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            ))}
          </View>

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="headset" size={20} color="#F7CE45" />
              <Text style={styles.sectionTitle}>Still Need Help?</Text>
            </View>
            <Text style={styles.contactSubtitle}>
              Our support team is here to assist you 24/7
            </Text>
            
            <View style={styles.contactGrid}>
              <TouchableOpacity
                style={styles.contactOption}
                onPress={() => handleContact('call')}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Ionicons name="call" size={23} color="#1A1A1A" />
                </View>
                <Text style={styles.contactText}>Call Us</Text>
                <Text style={styles.contactSubText}>Mon-Sat  9AM-8PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactOption}
                onPress={() => handleContact('email')}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Ionicons name="mail" size={23} color="#1A1A1A" />
                </View>
                <Text style={styles.contactText}>Email</Text>
                <Text style={styles.contactSubText}>24/7 Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactOption}
                onPress={() => handleContact('whatsapp')}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Ionicons name="logo-whatsapp" size={23} color="#1A1A1A" />
                </View>
                <Text style={styles.contactText}>WhatsApp</Text>
                <Text style={styles.contactSubText}>Quick Response</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={20} color="#F7CE45" />
              <Text style={styles.sectionTitle}>Pro Tips</Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.tipText}>
                Double-check all information before submitting to avoid delays
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="document-text" size={20} color="#2196F3" />
              </View>
              <Text style={styles.tipText}>
                Keep your documents ready for faster verification
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="time" size={20} color="#FF9800" />
              </View>
              <Text style={styles.tipText}>
                Most applications are processed within 1-2 business days
              </Text>
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    </RBSheet>
  );
};

// FAB Help Button Component
const FABHelpButton = ({ onPress, style }) => {
  return (
    <TouchableOpacity className='absolute bottom-0 right-0'>
    <FAB
        icon={()=><Entypo name='help' size={20} />}
        onPress={() => onPress()}
        style={[{
            //  position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    bottom: 30,
    right: 20,},style]} // Position as needed
        />
        </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Bottom Sheet Styles
  sheetContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F7CE45',
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  scrollContent: {
    flex: 1,
  },
  
  // Section Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  
  // FAQ Styles
  faqSection: {
    padding: 20,
    paddingBottom: 10,
  },
  faqItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  questionContainerExpanded: {
    backgroundColor: '#333333',
  },
  questionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questionIconContainer: {
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  expandIconContainer: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#444444',
    backgroundColor: '#252525',
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    paddingTop: 16,
  },
  answerIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  
  // Contact Styles
  contactSection: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  contactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  contactOption: {
    flex: 1,
    backgroundColor: '#F7CE45',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical:10,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 4,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  contactIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  contactText: {
    // fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    // marginBottom: 4,
  },
  contactSubText: {
    fontSize: 11,
    color: '#1A1A1A',
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Tips Styles
  tipsSection: {
    padding: 20,
    paddingTop: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F7CE45',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 30,
  },
  
  // FAB Styles
  fabButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    bottom: 30,
    right: 20,
  },
  fabPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7CE45',
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  
  // Example Usage Styles
  exampleContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  demoContent: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 4,
  },
  demoTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoTabActive: {
    backgroundColor: '#F7CE45',
  },
  demoTabText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  demoTabTextActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  formPlaceholder: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  formPlaceholderText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export { FAQHelpBottomSheet, FABHelpButton };