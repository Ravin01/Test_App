import { ArrowLeftCircle, Navigation } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { email, phoneNumber } from '../../Utils/Constants';

const { height,width } = Dimensions.get('window');
interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

interface AccordionItemProps {
  item: FAQItem;
  isExpanded: boolean;
  onPress: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ item, isExpanded, onPress }) => {
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animation]);

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onPress}>
        <Text style={styles.accordionQuestion}>{item.question}</Text>
        <Animated.Text 
          style={[
            styles.accordionIcon, 
            { transform: [{ rotate: rotateInterpolate }] }
          ]}
        >
          <FontAwesome5 name="chevron-down" size={13} color="#FFD700" />
        </Animated.Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <Animated.View style={[styles.accordionContent, { opacity: animation }]}>
          <Text style={styles.accordionAnswer}>{item.answer}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const FAQScreen = ({navigation}) => {

  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const faqData: FAQItem[] = [
    {
      id: 1,
      question: "How do I track my order?",
      answer: "You can track your order by going to 'My Orders' section in your profile. Click on the specific order to see real-time tracking information. You'll also receive SMS and email updates with tracking details."
    },
    {
      id: 2,
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), debit cards, PayPal, Apple Pay, Google Pay, and bank transfers. All payments are secured with 256-bit SSL encryption."
    },
    {
      id: 3,
      question: "Can I cancel or change my order?",
      answer: "Yes, you can cancel or modify your order within 30 minutes of placing it. After that, if the order hasn't been shipped, you can still request cancellation through customer support. Once shipped, you'll need to follow our return process."
    },
    {
      id: 4,
      question: "How do I return a product?",
      answer: "To return a product, go to 'My Orders', select the item you want to return, and click 'Return Item'. Follow the guided process to print a return label. Most items can be returned within 30 days of delivery."
    },
    {
      id: 5,
      question: "When will I get my refund?",
      answer: "Refunds are processed within 3-5 business days after we receive your returned item. The refund will be credited to your original payment method. Bank transfers may take 7-10 business days to reflect in your account."
    },
    {
      id: 6,
      question: "How do I contact customer support?",
      answer: `You can contact our customer support team through multiple channels: Live chat (available 24/7), email at ${email}, or phone at ${phoneNumber}. We typically respond to emails within 2 hours during business hours.`
    }
  ];

  const toggleAccordion = (itemId: number) => {
    const newExpandedItems = new Set(expandedItems);
    if (expandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const handleChatPress = () => {
    // Handle chat button press
    console.log('Chat button pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftCircle color={'#fff'} size={24}/>
        </TouchableOpacity>
        <LinearGradient
           
               colors={['#B38728', '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
          style={styles.headerTitleContainer}
        >
            <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>FAQ</Text>
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpIconContainer}>
            <Text style={styles.helpIcon}>?</Text>
          </View>
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>How can we help you?</Text>
            <Text style={styles.helpDescription}>
              Browse common questions or reach out to support.
            </Text>
          </View>
        </View>

        {/* FAQ Items */}
        <View style={styles.faqContainer}>
          {faqData.map((item) => (
            <AccordionItem
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onPress={() => toggleAccordion(item.id)}
            />
          ))}
        </View>

        {/* Need More Help Section */}
        <View style={styles.moreHelpSection}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.moreHelpBorder}
          >
            <View style={styles.moreHelpContent}>
              <View style={styles.moreHelpHeader}>
                <FontAwesome5 name="headset" size={23} color="#FFD700" />
                
                <View style={styles.moreHelpText}>
                  <Text style={styles.moreHelpTitle}>Need more help?</Text>
                  <Text style={styles.moreHelpDescription}>
                    Contact our support team for assistance.
                  </Text>
                </View>
{/*             
              <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
                <View
                  style={styles.chatButtonGradient}
                >
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#000" style={styles.chatIcon} />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </View>
              </TouchableOpacity> */}
                </View>
            </View>
          </LinearGradient>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.02 }),
    alignItems: 'center',
    gap: width * 0.10,
    // paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding:15,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    // marginHorizontal: 20,
    marginTop: 30,
    padding: 20,
    borderRadius: 15,
  },
  helpIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  helpIcon: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    color: '#FFD700',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  helpDescription: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 20,
  },
  faqContainer: {
    // paddingHorizontal: 20,
    marginTop: 30,
  },
  accordionContainer: {
    backgroundColor: '#000',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  accordionQuestion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    paddingRight: 10,
  },
  accordionIcon: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  accordionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  accordionAnswer: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
  },
  moreHelpSection: {
    marginBottom:100,
    marginTop: 30,
    // marginHorizontal:20,
  },
  moreHelpBorder: {
    borderRadius: 20,
    padding: 2,
  },
  moreHelpContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-evenly',
    padding: 10,

  },
  moreHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'space-around',
    // marginBottom: 20,
    gap:10
  },
  supportIconContainer: {
  
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 5,
  },
  supportIcon: {
    fontSize: 24,
  },
  moreHelpText: {
    flex: 1,
    // width: '65%',
    // backgroundColor:'#fff'
  },
  moreHelpTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    // marginBottom: 5,
  },
  moreHelpDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  chatButton: {
    alignSelf: 'flex-end',
    borderRadius: 5,
    overflow: 'hidden',
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:'#FACC15',
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  chatIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  chatButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});

export default FAQScreen;