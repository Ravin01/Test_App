/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { ArrowLeft, ArrowLeftCircle, Bluetooth } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../Utils/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width,height } = Dimensions.get('window');
const TermsAndConditionsScreen = ({navigation}) => {
   const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);

  const BulletPoint= ({text}) => (
    <View style={styles.bulletPoint}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
     
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={{marginLeft: width * 0.02}}>
          <ArrowLeftCircle size={24} color="#ffffff" />
            </TouchableOpacity>
            <LinearGradient
                    
               colors={['#B38728', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                    style={styles.headerTitleContainer}
                  >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Terms and condition</Text>
          </View>
          </LinearGradient>
          
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
              <View style={styles.section}>
                      <Text style={styles.sectionTitle}>INTRODUCTION</Text>
                      <Text style={styles.sectionText}>
                      Welcome to Flykup, a live video commerce platform empowering sellers to host interactive livestream shopping events. As part of our advanced broadcasting capabilities, Flykup provides a Simulcast Feature that allows sellers to stream their content to third-party platforms such as YouTube, Facebook, Instagram, and Twitter/X.{'\n'}
                      {'\t\t\t'}By authorizing Flykup to access your YouTube account, you agree to the following Terms in addition to YouTube’s own Terms of Service and related platform policies.
                      </Text>
                    </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Use of YouTube Data and API</Text>
              <Text style={styles.sectionText}>
               When you link your YouTube account to Flykup: We request access to the YouTube Live Streaming API and YouTube Data API v3 to: </Text>
              {/* {BulletPoint('Create and manage livestream broadcasts on your behalf.')} */}
              <BulletPoint text={'Create and manage livestream broadcasts on your behalf.'}/>
              <BulletPoint text={'Retrieve your channel information, stream title, and stream key.'}/>
              <BulletPoint text={'Upload custom thumbnails or update stream metadata.'}/>
              <Text style={styles.sectionText}>We only store the minimum necessary data, including: </Text>
              <BulletPoint text={'OAuth access and refresh tokens (encrypted)'}/>
              <BulletPoint text={'Your YouTube Channel ID'}/>
              <BulletPoint text={'Simulcast configuration (e.g., stream title, privacy level)'}/>
              <Text style={styles.sectionText}>These tokens are securely encrypted using AES-256 and used exclusively for enabling simulcast streaming.</Text>
            </View>

          
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Compliance with YouTube API Policies</Text>
              <Text style={styles.sectionText}>
              By using the Simulcast Feature: You agree to comply with YouTube’s API Services Terms of Service, API Services User Data Policy, and YouTube Developer Policies, including:
              </Text>
              <BulletPoint text={'Restrictions on data caching, redistribution, and unauthorized storage.'}/>
              <BulletPoint text={'Use of data only for the explicit purpose of simulcasting.'}/>
              {/* <BulletPoint text={''}/>
               */}
               <Text style={styles.sectionText}>You agree not to misuse the YouTube API or stream content that violates any YouTube policy.</Text>
            </View>

  <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Your Responsibilities</Text>
              <Text style={styles.sectionText}>
                By using the Simulcast Feature, you acknowledge and agree that:
              </Text>
              <BulletPoint text={'You are solely responsible for the content you stream to YouTube through Flykup.'}/>
              <BulletPoint text={'You must comply with all applicable copyright, community, and legal standards.'}/>
              <BulletPoint text={'You grant Flykup a limited license to interact with your YouTube account solely for enabling the simulcast.'}/>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Prohibited Conduct</Text>
              <Text style={styles.sectionText}>
               You may not use the Simulcast Feature for automated or bulk streaming (e.g., bots generating repeated streams) without explicit prior consent from YouTube and Flykup.
{'\n\n'}
Violation of this clause may result in immediate termination of simulcast access and reporting to platform authorities.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Data Retention & Deletion Policy</Text>
              <Text style={styles.sectionText}>
                If you disconnect your YouTube account or revoke OAuth permissions, all encrypted tokens and configuration data are scheduled for permanent deletion within 30 days.
{'\n\n'}
We retain no stream metadata beyond this period unless legally required to do so.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Indemnification</Text>
              <Text style={styles.sectionText}>
                You agree to indemnify, defend, and hold harmless Flykup, its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses (including reasonable legal fees) arising from:
              </Text>
              <BulletPoint text={'Your use or misuse of the Simulcast Feature '}/>
              <BulletPoint text={'Violation of these Terms'}/>
              <BulletPoint text={'Violation of YouTube’s API Terms, Developer Policies, or Community Guidelines'}/>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Disclaimer of Warranty & Limitation of Liability</Text>
              <Text style={styles.sectionText}>
                Flykup provides the Simulcast Feature “as is” without any warranties, express or implied. We do not guarantee uninterrupted or error-free performance. In no event shall Flykup be liable for any indirect, incidental, punitive, or consequential damages arising from your use of this feature.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Revoking Access</Text>
              <Text style={styles.sectionText}>
You may revoke Flykup’s access to your YouTube account at any time by visiting your Google Account Permissions. Once revoked, your tokens are deleted and simulcast capabilities will be disabled.
              </Text>
            </View>
              <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Updates to These Terms</Text>
              <Text style={styles.sectionText}>
Flykup may update these Terms periodically. Continued use of the Simulcast Feature after such changes constitutes acceptance of the updated terms. Material changes will be communicated via email or in-app notification to your registered Flykup account.
              </Text>
            </View>


            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Contact Us</Text>
              <Text style={styles.sectionText}>
                If you have any questions about this document or your rights, please contact:
              </Text>
              <Text style={[styles.sectionTitle,{marginBottom:0,marginTop:10}]}>Flykup Support</Text>
              <Text style={styles.contactText}>support@flykup.in</Text>
              <Text style={styles.sectionText}>
Kaps Nextgen Pvt. Ltd.{'\n'}
Tamil Nadu, India{'\n'}</Text>
            </View>

          </View>
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
      //  marginTop: Platform.select({ ios: 10, android: height * 0.02 }),
       alignItems: 'center',
       gap: width * 0.10,
      //  paddingVertical: height * 0.01,
       paddingHorizontal: width * 0.02,
  },
  headerTitleContainer: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
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
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  sectionText: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
    textAlign: 'justify',
  },
  contactText: {
    fontSize: 14,
    color: '#4a9eff',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default TermsAndConditionsScreen;