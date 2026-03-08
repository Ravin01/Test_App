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
  0: [ // Product Details
    {
      q: "What information is required in the Product Details section?",
      a: "The Product Details section requires basic information like product title, description, category, subcategory, stock quantity, and product images. You'll also need to provide size information if applicable for your product category."
    },
    {
      q: "How many product images can I upload?",
      a: "You can upload up to 4 product images in JPG, JPEG, or PNG format. The first image will be used as the cover image for your product listing."
    },
    {
      q: "What should I include in my product description?",
      a: "Your product description should be detailed and informative, highlighting key features, benefits, and specifications. Keep it under 500 characters and focus on information that helps customers make purchasing decisions."
    },
    {
      q: "What are the requirements for product images?",
      a: "Product images should be clear, well-lit, and show the product from multiple angles. The background should be plain and uncluttered. Images should accurately represent the product's color and features."
    },
    {
      q: "How do I select the right category and subcategory?",
      a: "Choose the category that best describes your product type, then select the most specific subcategory available. This helps customers find your product more easily and ensures it appears in relevant search results."
    },
    {
      q: "What is the character limit for product title and description?",
      a: "Product title has a limit of 150 characters, and description has a limit of 500 characters. Make sure to include important keywords and features within these limits."
    }
  ],
  1: [ // Courier & Pricing Details
    {
      q: "What is SKU and why is it important?",
      a: "SKU (Stock Keeping Unit) is a unique code that identifies your product. It's essential for inventory management, order processing, and tracking. Our system generates a SKU automatically, but you can customize it if needed."
    },
    {
      q: "When is HSN number required?",
      a: "HSN (Harmonized System of Nomenclature) number is required when you have a GSTIN. It's used to classify products for GST purposes and determine the applicable tax rate."
    },
    {
      q: "How should I calculate product weight and dimensions?",
      a: "Product weight should include all packaging materials (box, wrap, etc.) as this affects shipping costs. Dimensions should be in centimeters (L x W x H) and accurately represent the packaged product size."
    },
    {
      q: "What should I select for hazardous materials?",
      a: "Select 'No hazardous materials' for standard products. Choose appropriate options if your product contains fragrances, lithium batteries, or other regulated materials that require special handling during shipping."
    },
    {
      q: "How do I set the right price for my product?",
      a: "Set your MRP (Maximum Retail Price) and selling price competitively while ensuring profitability. Remember that the price you set includes GST. Consider market rates, competitor pricing, and your profit margins when determining prices."
    },
    {
      q: "Should I enable auction for my product?",
      a: "Enable auction if you want customers to bid on your product. This works well for unique items, collectibles, or products with variable value. Set a starting bid price and optionally a reserved price (minimum acceptable bid)."
    },
    {
      q: "What is the difference between MRP and selling price?",
      a: "MRP is the maximum retail price printed on the product, while selling price is the actual price at which you're selling the product on the platform. The selling price should always be less than or equal to the MRP."
    }
  ],
  2: [ // Other Details
    {
      q: "What compliance information might be required?",
      a: "Depending on your product category, you may need FSSAI license for food products, BIS certification for certain electronics, or other industry-specific certifications. These requirements appear based on your selected category."
    },
    {
      q: "How does the warranty section work?",
      a: "If your product comes with a warranty, enable the 'Has Warranty' option and specify the warranty duration (e.g., '1 year', '6 months'). This information helps customers understand the coverage they'll receive."
    },
    {
      q: "What should I include in the return policy?",
      a: "Your return policy should clearly state the conditions under which customers can return products, the return window period, and any restocking fees. You can add up to 6 specific policy terms."
    },
    {
      q: "What is e-waste compliance?",
      a: "E-waste compliance indicates that your product follows electronic waste regulations. This is typically required for electronic products and shows your commitment to environmental responsibility."
    },
    {
      q: "Should I enable dropshipping for my product?",
      a: "Enable dropshipping if you want other sellers to list and fulfill orders for your product. If enabled, you'll need to set a commission rate that these sellers will pay for each sale."
    },
    {
      q: "What happens when I submit my product listing?",
      a: "After submission, your product goes through a review process. Once approved, it becomes live on the platform. You'll receive a confirmation, and the product will appear in your seller dashboard."
    },
    {
      q: "How long does it take for a product to be approved?",
      a: "Product approval typically takes 24-48 hours. However, this may vary during peak times or if additional information is required. You'll receive an email notification once your product is approved."
    }
  ]
};

const tabTitles = {
  0: 'Product Details',
  1: 'Courier & Pricing',
  2:'Other Details'
};

const FAQHelpBottomSheetProduct = ({ currentTabIndex = 0, rbSheetRef }) => {
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
const FABHelpButtonProduct = ({ onPress, style }) => {
  return (
    // <TouchableOpacity className='absolute bottom-0 right-0'>
    <FAB
        icon={()=><Entypo name='help' size={20} />}
        onPress={() => onPress()}
        style={[{
            //  position: 'absolute',
    // width: 50,
    // height: 50,
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
        // </TouchableOpacity>
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

export { FAQHelpBottomSheetProduct, FABHelpButtonProduct };