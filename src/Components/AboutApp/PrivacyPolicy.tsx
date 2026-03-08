import {AlertCircle, ArrowLeftCircle} from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
const {width, height} = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

interface BulletPointProps {
  text: string;
}

const BulletPoint: React.FC<BulletPointProps> = ({text}) => (
  <View style={styles.bulletPoint}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const PrivacyPolicyScreen = ({navigation}) => {
  
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

const handleEmailPress = () => {
    Linking.openURL('mailto:privacy@flykup.com');
  };

  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}>
          <ArrowLeftCircle color="#fff" size={24} />
        </TouchableOpacity>
        <LinearGradient
         
               colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerTitleContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Privacy & Policy</Text>
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Policy Metadata */}
        <View style={[styles.section, {marginBottom: 10}]}>
          <Text style={styles.sectionText}>
            <Text style={styles.strongText}>Effective Date:</Text> February 14, 2025
          </Text>
          <Text style={styles.sectionText}>
            <Text style={styles.strongText}>Last Updated:</Text> February 14, 2025
          </Text>
          <Text style={styles.sectionText}>
            <Text style={styles.strongText}>Location:</Text> Chennai, Tamil Nadu
          </Text>
        </View>

        {/* 1. Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTRODUCTION</Text>
          <Text style={styles.sectionText}>
            This Privacy Policy describes how Kaps NextGen Pvt Ltd, operating
            under the tradename Flykup (“Flykup,” “we,” “our,” or “us”),
            collects, processes, stores, shares, and safeguards your personal
            data in compliance with the Digital Personal Data Protection Act,
            2023 (DPDPA 2023), Information Technology Act, 2000, and applicable
            RBI and financial regulations. By accessing or using Flykup,
            including to register, browse, bid, or complete transactions, you
            consent to this policy.
          </Text>
        </View>

        {/* 2. Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. INFORMATION WE COLLECT</Text>

          <BulletPoint
            text="Account & Contact Data Full Name Mobile Number, Email Address
            Hashed Password Shipping & Billing Address GSTIN (for verified
            sellers)"
          />
          <BulletPoint
            text="Mandatory KYC & Verification Data (Required for Auctions
            & Payouts) Aadhaar (Masked Format), PAN, Passport, Voter ID Bank
            Account Number and IFSC Live Selfie or Biometric Verification
            (Liveness Detection) Date of Birth, Gender, Approximate Geolocation"
          />
          <BulletPoint
            text="Transactional & Behavioral Data Bidding and Purchase History
            Wallet Activity, Payment Logs Reviews, Messages, and Follower Data
            Device IDs, IP Addresses, Session Fingerprints"
          />
           <BulletPoint
            text="Automated
            Collection Cookies, Tracking Pixels, Session Scripts Clickstream and
            Page View Data Error Logs and Crash Reports"
          />
          {/* <BulletPoint text="Device Information: IP address, browser type, device identifiers" /> */}
        </View>

        {/* 3. How We Use Your Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. LEGAL BASIS AND PURPOSE OF PROCESSING
          </Text>
          <Text style={styles.sectionText}>
            Flykup processes personal data under the following lawful bases per
            DPDPA 2023: Consent: For marketing communications and analytics
            Contractual Necessity: To provide services, facilitate orders, and
            process transactions Legal Obligation: For KYC/AML compliance,
            taxation, and regulatory reporting Legitimate Interest: Security
            monitoring, fraud prevention, and platform improvement Purpose of
            Use: Account creation and user onboarding KYC verification for
            participation in auctions and commerce Transaction processing,
            refunds, and payouts Identity and fraud risk assessment Marketing
            and personalized offers (with opt-out) Grievance handling and legal
            defense
          </Text>

          {/* <BulletPoint text="Provide and maintain our service" />
          <BulletPoint text="Process transactions and deliver products" />
          <BulletPoint text="Personalize your shopping experience" />
          <BulletPoint text="Improve our platform and develop new features" />
          <BulletPoint text="Communicate with you about orders and promotions" /> */}

          <View style={styles.warningBox}>
            <AlertCircle color="#fff" size={16} />
            <Text style={styles.warningText}>
              We never sell personal information to third parties
            </Text>
          </View>
        </View>

        {/* 4. Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. DATA SECURITY MEASURES</Text>
          <Text style={styles.sectionText}>
            Flykup follows ISO 27001-aligned data security protocols, including:
            AES-256 encryption for data at rest TLS 1.3 encryption for all data
            in transit Multi-Factor Authentication (MFA) for administrative
            systems Role-Based Access Control (RBAC) for employees and partners
            Annual Vulnerability Assessments (VAPT) 72-hour breach notification
            to users and the Data Protection Board of India
            {'\n'}
            All staff undergo periodic DPDPA 2023 training and sign
            confidentiality clauses
          </Text>

          {/* <BulletPoint text="Encryption for all transactions" />
          <BulletPoint text="Regular security audits" />
          <BulletPoint text="Limited employee access to personal data" />
          <BulletPoint text="Secure server infrastructure" /> */}
        </View>

        {/* 5. Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            4. DATA LOCALIZATION AND RETENTION
          </Text>
          <Text style={styles.sectionText}>
            All personal data is stored in India, on servers located within AWS
            and/or GCP’s Indian regions
            {'\n'}
            Encrypted backups are geo-fenced and retained exclusively within
            India
            {'\n'}
            Data Retention Periods:
            {'\n'}
            Data Type Retention Duration
            {'\n'}
          </Text>

          <BulletPoint text="KYC Documents 7 years post-account closure (per RBI/PMLA)" />
          <BulletPoint text="Financial Transactions	8 years (as per Income Tax Act)" />
          <BulletPoint text="Request deletion of your personal data" />
          <BulletPoint text="Inactive User Accounts	2 years (then anonymized/deleted)" />

          {/* <Text style={styles.contactText}>
            To exercise these rights, please contact us at{' '}
            <Text style={styles.emailLink} onPress={handleEmailPress}>
              privacy@flykup.com
            </Text>
          </Text> */}
        </View>

        {/* 6. Changes to This Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            5. DATA SHARING AND DISCLOSURE
          </Text>
          <Text style={styles.sectionText}>
            Flykup shares data only where necessary and with entities bound by
            Data Processing Agreements (DPAs):{'\n'}
            Shared With:{'\n'}
          </Text>

          <BulletPoint text="Government Authorities: Upon lawful request (RBI, Income Tax Department, Enforcement Directorate, etc.)" />

          <BulletPoint text="KYC Partners: (e.g., Cashfree) for identity verification" />

          <BulletPoint text="Payment Gateways: (e.g., PayU, Razorpay) – PCI-DSS compliant" />

          <BulletPoint text="Logistics Partners: (e.g., Ecom Express) – Access limited to delivery addresses and contact data" />

          <BulletPoint text="Auction Bodies or Legal Stakeholders: Where legally required" />
          <Text style={styles.sectionText}>
            We do not sell or rent personal data to any third parties.
          </Text>
        </View>

        {/* 7. Contact Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            6. USER RIGHTS UNDER DPDPA 2023
          </Text>
          <Text style={styles.sectionText}>
            As a Flykup user, you are entitled to exercise the following rights:
          </Text>
          <BulletPoint text="1. Right to Access: Obtain a copy of your personal data in a machine-readable format" />

          <BulletPoint text="2. Right to Correction: Correct inaccurate or outdated KYC/account details" />

          <BulletPoint text="3. Right to Erasure: Request deletion of non-mandatory data" />

          <BulletPoint text="4. Right to Consent Management: Withdraw consent for non-essential processing (e.g., marketing)" />

          <BulletPoint text="5. Right to Grievance Redressal: File complaints directly with our DPO or escalate to the Data Protection Board of India" />

          <Text style={styles.sectionText}>
            Submit your request to the DPO listed below, along with valid
            identity proof. We aim to respond within 30 days.
          </Text>

          {/* <Text style={styles.contactDetail}>FLYKUP Customer Officer</Text>
          <Text style={styles.contactDetail} onPress={handleEmailPress}>
            privacy@flykup.com
          </Text>
          <Text style={styles.contactDetail}>
            123 Business Avenue, Tech City, TC 10001
          </Text> */}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. SPECIAL PROVISIONS</Text>
          <Text style={styles.sectionText}>
            Minors: Flykup is not accessible to individuals under 18 years of
            age. All users undergo age and identity verification during KYC.
            {'\n\n'}
            Sensitive Data: Biometric data is processed only for liveness
            detection and never stored in raw form
            {'\n\n'}
            Cookies: Essential cookies are mandatory for service functionality.
            Non-essential cookies require opt-in via your browser settings
            {'\n\n'}
            Cross-border Transfers: Flykup does not transfer personal data
            outside India, unless mandated by an Indian authority
            {'\n  '}
          </Text>

          {/* <BulletPoint text="Encryption for all transactions" />
          <BulletPoint text="Regular security audits" />
          <BulletPoint text="Limited employee access to personal data" />
          <BulletPoint text="Secure server infrastructure" /> */}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. POLICY UPDATES</Text>
          <Text style={styles.sectionText}>
            This Privacy Policy may be modified to reflect legal, technical, or
            business changes. Users will be notified 15 days in advance through
            in-app messages or email for material updates Re-consent will be
            required for changes involving sensitive data usage or consent
            parameters
          </Text>

          {/* <BulletPoint text="Encryption for all transactions" />
          <BulletPoint text="Regular security audits" />
          <BulletPoint text="Limited employee access to personal data" />
          <BulletPoint text="Secure server infrastructure" /> */}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            9. CONTACT & GRIEVANCE REDRESSAL
          </Text>
          <Text style={styles.sectionText}>
            Data Protection Officer (DPO){'\n'}
            Kaps NextGen Pvt Ltd{'\n'}
            Email: privacy@flykup.in{'\n'}
            Phone: +91 98404 79979{'\n'}
            Registered Address: No.7, Kambar Street, SRP Mills, Janatha Nagar,
            SaravanamPatti, Coimbatore 641035, Tamil Nadu, India{'\n\n'}
            Escalation:{'\n\n'}
            If unsatisfied with the DPO response, escalate to:{'\n'}
            Data Protection Board of India{'\n'}
            Ministry of Electronics and Information Technology{'\n'}
            Website: {'\n'}
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(
                  'https://www.meity.gov.in/data-protection-board',
                )
              }>
              <Text style={[styles.sectionText, {color: '#0b57d0'}]}>
                https://www.meity.gov.in/data-protection-board
              </Text>
            </TouchableOpacity>
          </Text>

          {/* <BulletPoint text="Encryption for all transactions" />
          <BulletPoint text="Regular security audits" />
          <BulletPoint text="Limited employee access to personal data" />
          <BulletPoint text="Secure server infrastructure" /> */}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. GOVERNANCE & COMPLIANCE</Text>
          <Text style={styles.sectionText}>
            Flykup’s data protection practices are governed by an internal Data
            Protection Committee{'\n\n'}
            Quarterly Data Protection Impact Assessments (DPIA) are conducted
            {'\n\n'}
            Regular audits are performed by ISO 27001-certified third-party
            firms{'\n'}
          </Text>

          {/* <BulletPoint text="Encryption for all transactions" />
          <BulletPoint text="Regular security audits" />
          <BulletPoint text="Limited employee access to personal data" />
          <BulletPoint text="Secure server infrastructure" /> */}
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ios: 10, android: height * 0.01}),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
    backgroundColor: '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  backIcon: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    textTransform:'capitalize',
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'justify',
    lineHeight: 20,
    marginBottom: 15,
  },
  strongText: {
    color: '#fff',
    fontWeight: '600',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'justify',
    lineHeight: 20,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#484141',
    padding: 12,
    borderRadius: 19,
    marginTop: 15,
    alignItems: 'center',
    gap: 10,
  },
  warningText: {
    color: '#CCCCCC',
    fontSize: 11,
    flex: 1,
    fontWeight: '500',
  },
  contactText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 15,
  },
  emailLink: {
    color: '#FFD700',
    textDecorationLine: 'underline',
  },
  contactDetail: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 5,
  },
  bottomSpacing: {
    height: 30,
  },
});

export default PrivacyPolicyScreen;
