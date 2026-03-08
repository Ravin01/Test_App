import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import {ActivityIndicator} from 'react-native-paper';
import downloadPDFToDownloads from './download';
import {
  Box,
  Film,
  Image as ImageIcon,
  Radio,
  Video,
  Building,
  User,
  Store,
  Hammer,
  ArrowRight,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');
const isSmallScreen = width < 380;

const SellerFormIndex = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleSellerTypeSelect = (type: string) => {
    setSelectedType(type);
  };

  const proceedToRegistration = async () => {
    if (selectedType) {
      await AsyncStorage.setItem('type', selectedType === 'brand' ? 'Brand' : 'Social');
      navigation.navigate('SellerRegister', {type: selectedType === 'brand' ? 'Brand' : 'Social'});
    }
  };

  const handleLoading = async () => {
    setLoading(true);
    await downloadPDFToDownloads();
    setLoading(false);
  };

  const goBack = () => {
    setSelectedType(null);
  };

  const handleReapply = () => {
    setShowRejectionModal(false);
  };

  const handleCloseRejectionModal = () => {
    setShowRejectionModal(false);
    navigation.goBack();
  };

  // Feature Item Component
  const FeatureItem = ({
    icon,
    text,
    isBrand = true,
  }: {
    icon: React.ReactNode;
    text: string;
    isBrand?: boolean;
  }) => (
    <View style={styles.featureItem}>
      <View
        style={[
          styles.featureIconContainer,
          {
            backgroundColor: isBrand
              ? 'rgba(247,206,69,0.15)'
              : 'rgba(255,255,255,0.15)',
            borderColor: isBrand
              ? 'rgba(247,206,69,0.3)'
              : 'rgba(255,255,255,0.3)',
          },
        ]}>
        {icon}
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  // Tag Component
  const Tag = ({text, isBrand = true}: {text: string; isBrand?: boolean}) => (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: isBrand
            ? 'rgba(247,206,69,0.15)'
            : 'rgba(255,255,255,0.15)',
          borderColor: isBrand
            ? 'rgba(247,206,69,0.3)'
            : 'rgba(255,255,255,0.3)',
        },
      ]}>
      <Text
        style={[
          styles.tagText,
          {color: isBrand ? '#f7ce45' : 'rgba(229,231,235,1)'},
        ]}>
        {text}
      </Text>
    </View>
  );

  // GST Exemption Screen
  if (selectedType) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {/* Background decorations */}
        <View style={styles.bgDecoration1} />
        <View style={styles.bgDecoration2} />

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#f7ce45" size="large" />
          </View>
        )}

        {/* Back Button - Fixed at top */}
        <View style={styles.topBackButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}>
            <ArrowLeft size={16} color="#f7ce45" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.gstScrollContent}
          showsVerticalScrollIndicator={false}>

          {/* GST Exemption Card */}
          <View style={styles.gstCard}>
            {/* Top accent line */}
            <LinearGradient
              colors={
                selectedType === 'brand'
                  ? ['#f7ce45', '#ffd54f', '#f7ce45']
                  : ['rgba(255,255,255,0.8)', '#e5e7eb', 'rgba(255,255,255,0.8)']
              }
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.cardAccentLine}
            />

            {/* Header */}
            <View style={styles.gstHeader}>
              <View
                style={[
                  styles.gstIconContainer,
                  {
                    backgroundColor:
                      selectedType === 'brand'
                        ? 'rgba(247,206,69,0.15)'
                        : 'rgba(255,255,255,0.15)',
                    borderColor:
                      selectedType === 'brand'
                        ? 'rgba(247,206,69,0.3)'
                        : 'rgba(255,255,255,0.3)',
                  },
                ]}>
                <AlertTriangle
                  size={24}
                  color={selectedType === 'brand' ? '#f7ce45' : '#fff'}
                />
              </View>
              <Text style={styles.gstTitle}>GST Exemption Available</Text>
            </View>

            {/* Content */}
            <View style={styles.gstContent}>
              <Text style={styles.gstMessage}>
                {selectedType === 'brand'
                  ? "No GST? Proceed as Brand Seller. Download and fill the form to complete verification."
                  : "No GST? Proceed as Social Seller. Download and fill the form to complete verification."}
              </Text>

              {/* Download Card */}
              <TouchableOpacity
                style={[
                  styles.downloadCard,
                  {
                    borderColor:
                      selectedType === 'brand'
                        ? 'rgba(247,206,69,0.3)'
                        : 'rgba(255,255,255,0.3)',
                  },
                ]}
                onPress={handleLoading}
                activeOpacity={0.7}>
                <Feather
                  name="download"
                  size={20}
                  color={selectedType === 'brand' ? '#f7ce45' : '#fff'}
                />
                <View style={styles.downloadTextContainer}>
                  <Text style={styles.downloadMainText}>GST Exemption Form</Text>
                  <Text style={styles.downloadSubText}>
                    Required for non-GST sellers
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.gstActions}>
              <TouchableOpacity
                style={styles.goBackBtn}
                onPress={goBack}
                activeOpacity={0.7}>
                <Text style={styles.goBackBtnText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.proceedBtn}
                onPress={proceedToRegistration}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={
                    selectedType === 'brand'
                      ? ['#f7ce45', '#ffd54f']
                      : ['#fff', '#e5e7eb']
                  }
                  style={styles.proceedBtnGradient}>
                  <Text style={styles.proceedBtnText}>
                    Proceed
                  </Text>
                  <ArrowRight size={16} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main Selection Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Background decorations */}
      <View style={styles.bgDecoration1} />
      <View style={styles.bgDecoration2} />
      <View style={styles.bgDecoration3} />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#f7ce45" size="large" />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowLeft size={16} color="#f7ce45" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Welcome to{' '}
            <Text style={styles.headerTitleHighlight}>Flykup</Text>
          </Text>
          <View style={styles.headerDivider} />
          <Text style={styles.headerSubtitle}>
            One Platform. Every Way to Sell.
          </Text>
        </View>

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Brand & Store Seller Card */}
          <TouchableOpacity
            style={[styles.sellerCard, styles.brandCard]}
            onPress={() => handleSellerTypeSelect('brand')}
            activeOpacity={0.9}>
            {/* Top accent line */}
            <LinearGradient
              colors={['#f7ce45', '#ffd54f', '#f7ce45']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.cardAccentLine}
            />

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, styles.brandIconBg]}>
                <Building size={20} color="#f7ce45" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Brand & Store Seller</Text>
                <Text style={styles.cardSubtitle}>
                  For Established Brands, Retailers & Store Owners
                </Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresLabel}>
                Sell through multiple channels:
              </Text>
              <FeatureItem
                icon={<Video size={14} color="#f7ce45" />}
                text="Live Shopping"
                isBrand={true}
              />
              <FeatureItem
                icon={<Hammer size={14} color="#f7ce45" />}
                text="Auctions"
                isBrand={true}
              />
              <FeatureItem
                icon={<Film size={14} color="#f7ce45" />}
                text="Shoppable Videos"
                isBrand={true}
              />
              <FeatureItem
                icon={<ImageIcon size={14} color="#f7ce45" />}
                text="Image Listings"
                isBrand={true}
              />
              <FeatureItem
                icon={<Store size={14} color="#f7ce45" />}
                text="Digital Storefront"
                isBrand={true}
              />
            </View>

            {/* Best For */}
            <View style={styles.bestForSection}>
              <Text style={[styles.sectionTitle, {color: '#f7ce45'}]}>
                Best For
              </Text>
              <View style={styles.tagsContainer}>
                <Tag text="D2C Brands" isBrand={true} />
                <Tag text="Retailers" isBrand={true} />
                <Tag text="Wholesalers" isBrand={true} />
                <Tag text="Store Owners" isBrand={true} />
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.requirementSection}>
              <Text style={[styles.sectionTitle, {color: '#f7ce45'}]}>
                Requirements
              </Text>
              <Text style={styles.requirementText}>
                GST Registration & Business Verification
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => handleSellerTypeSelect('brand')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#f7ce45', '#ffd54f']}
                style={styles.registerBtnGradient}>
                <Text style={styles.registerBtnText}>
                  Register as Brand Seller
                </Text>
                <ArrowRight size={16} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Social Seller Card */}
          <TouchableOpacity
            style={[styles.sellerCard, styles.socialCard]}
            onPress={() => handleSellerTypeSelect('social')}
            activeOpacity={0.9}>
            {/* Top accent line */}
            <LinearGradient
              colors={['rgba(255,255,255,0.8)', '#e5e7eb', 'rgba(255,255,255,0.8)']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.cardAccentLine}
            />

            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, styles.socialIconBg]}>
                <User size={20} color="#fff" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Social Seller</Text>
                <Text style={styles.cardSubtitle}>
                  For Creators, Influencers & Dropshippers
                </Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresLabel}>
                Turn your audience into customers:
              </Text>
              <FeatureItem
                icon={<Video size={14} color="#fff" />}
                text="Live Selling"
                isBrand={false}
              />
              <FeatureItem
                icon={<Film size={14} color="#fff" />}
                text="Shoppable Videos"
                isBrand={false}
              />
              <FeatureItem
                icon={<Radio size={14} color="#fff" />}
                text="Instagram & WhatsApp Selling"
                isBrand={false}
              />
              <FeatureItem
                icon={<Box size={14} color="#fff" />}
                text="Dropshipping"
                isBrand={false}
              />
            </View>

            {/* Best For */}
            <View style={styles.bestForSection}>
              <Text style={[styles.sectionTitle, {color: '#fff'}]}>
                Best For
              </Text>
              <View style={styles.tagsContainer}>
                <Tag text="Influencers" isBrand={false} />
                <Tag text="Content Creators" isBrand={false} />
                <Tag text="New Entrepreneurs" isBrand={false} />
                <Tag text="Resellers" isBrand={false} />
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.requirementSection}>
              <Text style={[styles.sectionTitle, {color: '#fff'}]}>
                Requirements
              </Text>
              <Text style={styles.requirementText}>
                Social Media Verification or Identity Proof
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => handleSellerTypeSelect('social')}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#fff', '#e5e7eb']}
                style={styles.registerBtnGradient}>
                <Text style={styles.registerBtnText}>
                  Register as Social Seller
                </Text>
                <ArrowRight size={16} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectionModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRejectionModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectionModal}>
            {/* Red accent line */}
            <LinearGradient
              colors={['#ef4444', '#f87171', '#ef4444']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.modalAccentLine}
            />

            {/* Icon */}
            <View style={styles.rejectionIconContainer}>
              <XCircle size={48} color="#ef4444" />
            </View>

            {/* Content */}
            <Text style={styles.rejectionTitle}>We Cannot Proceed Yet</Text>
            <View style={styles.rejectionMessageBox}>
              <Text style={styles.rejectionMessage}>
                Your seller application has been rejected. Please update your
                information and try again.
              </Text>
            </View>
            <Text style={styles.rejectionHint}>
              Don't worry! You can address these points and try again.
            </Text>

            {/* Actions */}
            <View style={styles.rejectionActions}>
              <TouchableOpacity
                style={styles.reapplyBtn}
                onPress={handleReapply}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  style={styles.reapplyBtnGradient}>
                  <RefreshCw size={18} color="#fff" />
                  <Text style={styles.reapplyBtnText}>Update & Reapply</Text>
                  <ChevronRight size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewLaterBtn}
                onPress={handleCloseRejectionModal}
                activeOpacity={0.7}>
                <Text style={styles.reviewLaterBtnText}>Review Later</Text>
              </TouchableOpacity>
            </View>

            {/* Encouragement */}
            <View style={styles.encouragementBox}>
              <Text style={styles.encouragementText}>
                Many successful applications were approved on their second
                attempt!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gstScrollContent: {
    padding: 16,
    paddingTop: 0,
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBackButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  // Background decorations
  bgDecoration1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(247,206,69,0.08)',
  },
  bgDecoration2: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(247,206,69,0.06)',
  },
  bgDecoration3: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.3)',
    marginBottom: 16,
    gap: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerTitleHighlight: {
    color: '#f7ce45',
  },
  headerDivider: {
    width: 100,
    height: 2,
    backgroundColor: '#f7ce45',
    marginVertical: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(156,163,175,1)',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  // Cards Container
  cardsContainer: {
    gap: 16,
  },
  // Seller Card
  sellerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  brandCard: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderColor: 'rgba(55,65,81,0.5)',
  },
  socialCard: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderColor: 'rgba(55,65,81,0.5)',
  },
  cardAccentLine: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  brandIconBg: {
    backgroundColor: 'rgba(247,206,69,0.15)',
    borderColor: 'rgba(247,206,69,0.3)',
  },
  socialIconBg: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
  },
  // Features
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  featuresLabel: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(229,231,235,1)',
    fontWeight: '500',
  },
  // Best For Section
  bestForSection: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Requirement Section
  requirementSection: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  requirementText: {
    fontSize: 12,
    color: 'rgba(229,231,235,1)',
  },
  // Register Button
  registerBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  registerBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  // GST Screen Styles
  gstCard: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  gstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  gstIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  gstTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  gstContent: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  gstMessage: {
    fontSize: 14,
    color: 'rgba(229,231,235,1)',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  downloadTextContainer: {
    flex: 1,
  },
  downloadMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  downloadSubText: {
    fontSize: 11,
    color: 'rgba(156,163,175,1)',
  },
  gstActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  goBackBtn: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75,85,99,0.5)',
  },
  goBackBtnText: {
    fontSize: 14,
    color: 'rgba(156,163,175,1)',
    fontWeight: '500',
  },
  proceedBtn: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  proceedBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  // Rejection Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectionModal: {
    backgroundColor: 'rgba(20,20,20,0.98)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
  },
  modalAccentLine: {
    height: 4,
    width: '100%',
  },
  rejectionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  rejectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  rejectionMessageBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  rejectionMessage: {
    fontSize: 14,
    color: 'rgba(229,231,235,1)',
    textAlign: 'center',
    lineHeight: 20,
  },
  rejectionHint: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  rejectionActions: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  reapplyBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  reapplyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  reapplyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  reviewLaterBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75,85,99,0.5)',
  },
  reviewLaterBtnText: {
    fontSize: 14,
    color: 'rgba(156,163,175,1)',
    fontWeight: '500',
  },
  encouragementBox: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  encouragementText: {
    fontSize: 12,
    color: 'rgba(156,163,175,1)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SellerFormIndex;
