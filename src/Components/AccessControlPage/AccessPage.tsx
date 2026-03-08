import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
  BackHandler,
  AppState,
  Modal,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAccess } from '../../Context/AccessContext';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeInDown,
  Layout,
  SlideInRight,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AWS_CDN_URL } from '../../../Config';
import Header from '../Reuse/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { all } from 'axios';
const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;

const AccessPage = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { allPermissions, loading, isAccessMode, enterAccessMode, exitAccessMode } = useAccess();
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    // If not in access mode yet and we have permissions, auto-select first seller
    if (!isAccessMode && allPermissions && allPermissions.length > 0) {
      setSelectedSeller(allPermissions[0]);
    }
  }, [allPermissions, isAccessMode]);

  // Handle system back press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Only show exit modal if the AccessControlPage is currently focused/visible
      if (isFocused) {
        console.log('AccessControlPage is focused, showing exit confirmation modal');
        setShowExitModal(true);
        return true; // Prevent default back behavior
      } else {
        console.log('AccessControlPage is not focused, allowing default back behavior');
        return false; // Allow default back behavior when not focused
      }
    });

    return () => backHandler.remove();
  }, [isFocused, navigation]);

  // Handle app state changes - exit access mode when app goes to background
  // useEffect(() => {
  //   const subscription = AppState.addEventListener('change', (nextAppState) => {
  //     if (nextAppState === 'background'  || nextAppState === 'inactive'
  //     ) {
  //       // Exit access mode when app goes to background for security
  //       (async () => {
  //         await exitAccessMode();
  //       })();
  //     }
  //   });

  //   return () => {
  //     subscription?.remove();
  //   };
  // }, [exitAccessMode]);

  // Page type to route mapping
  const pageRoutes = {
    DASHBOARD: 'SellerDashboard',
    //STORE_SETUP: 'SellerSettings',
    SETTINGS: 'SellerSettings',      
    PRODUCT: 'Products',              //'ProductListing',
    BUNDLE: 'BundleListing',
    SHOPPABLE_VIDEO:  'ViewShopable',   //'ViewVideo',
    CO_HOST: 'cohostInvitations',      //'CoHost',
    SHOWS:  'LiveStream',             //'AllShows',
    SPONSORS: 'Sponsors',
    ORDERS:  'SellerOrders',           //orders     //'Orders',
    WALLET: 'SellerWallet',
    SUBSCRIPTION: 'Plans',
    FLASHSALE:  'FlashsaleManager',   //'ManageFlashSale',
    PAYMENTS: 'TransactionHistory',
    FULFILLMENT: 'SellerOrders',  // Fixed: was 'Orders' which doesn't exist
    MARKETING: 'Analytics',
    AUDIENCE:  'AnalyticsDashboard',  //'Audience',
    USER_ACCESS: 'UserAccess',
    SUPPORT: 'Support',
    MESSAGE: 'Comment',
   // NOTIFICATIONS: 'Notifications',
  };

  // Page type to icon mapping
  const getPageIcon = (pageType: string) => {
    const iconMap = {
      DASHBOARD: { name: 'bar-chart-2', library: 'Feather' },
      STORE_SETUP: { name: 'settings', library: 'Feather' },
      PRODUCT: { name: 'shopping-cart', library: 'Feather' },
      BUNDLE: { name: 'package', library: 'Feather' },
      SHOPPABLE_VIDEO: { name: 'video', library: 'Feather' },
      CO_HOST: { name: 'users', library: 'Feather' },
      SHOWS: { name: 'calendar', library: 'Feather' },
      SPONSORS: { name: 'trending-up', library: 'Feather' },
      ORDERS: { name: 'package', library: 'Feather' },
      WALLET: { name: 'credit-card', library: 'MaterialCommunityIcons' },
      SUBSCRIPTION: { name: 'credit-card', library: 'Feather' },
      FLASHSALE: { name: 'zap', library: 'Feather' },
      PAYMENTS: { name: 'dollar-sign', library: 'Feather' },
      FULFILLMENT: { name: 'package', library: 'Feather' },
      MARKETING: { name: 'trending-up', library: 'Feather' },
      AUDIENCE: { name: 'users', library: 'Feather' },
      USER_ACCESS: { name: 'lock', library: 'Feather' },
      SUPPORT: { name: 'headphones', library: 'Feather' },
      MESSAGE: { name: 'message-circle', library: 'Feather' },
     // NOTIFICATIONS: { name: 'bell', library: 'Feather' },
    };

    const iconData = iconMap[pageType] || { name: 'lock', library: 'Feather' };
    const IconComponent = iconData.library === 'MaterialCommunityIcons' ? MaterialIcon : Icon;
    
    return <IconComponent name={iconData.name} size={20} color="#FFC107" />;
  };

  // Format page type for display
  const formatPageType = (pageType: string) => {
    return pageType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handlePageClick = async (page: any) => {
    const route = pageRoutes[page.pageType];
    if (route) {
      // Show modal for Products page to choose between Product/Stock
      if (route === 'Products') {
        setShowProductModal(true);
      } else {
        // Enter access mode for the selected seller before navigation
        await enterAccessMode();
        console.log('Navigating to:', route);
        navigation.navigate(route);
      }
    }
  };

  const handleProductNavigation = async (selectedTab: 'Product' | 'Stock') => {
    setShowProductModal(false);
    await enterAccessMode();
    navigation.navigate('Products', { selectedTab });
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
  };

  const handleGoBack = async() => {
    //navigation.navigate('bottomtabbar');
    // await exitAccessMode();
    // navigation.goBack();
    setShowExitModal(true);
  };

  const handleContinueAccess = () => {
    setShowExitModal(false);
  };

  const handleExitAccess = async () => {
    setShowExitModal(false);
    await exitAccessMode();
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
        <Animated.View entering={FadeIn.duration(500)} style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={styles.loadingText}>Loading access permissions...</Text>
        </Animated.View>
      </View>
    );
  }

  if (!allPermissions || allPermissions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
        <Animated.View entering={FadeInUp.duration(500)} style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Icon name="shield" size={64} color="#FFC107" />
          </View>
          <Text style={styles.emptyTitle}>No Access Granted</Text>
          <Text style={styles.emptyDescription}>
            You haven't been granted access to any seller pages yet. Contact the seller to request access.
          </Text>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.homeButton}
            activeOpacity={0.8}
          >
            <Icon name="home" size={20} color="#1A1A1A" />
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />

      {/* Exit Access Mode Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={handleContinueAccess}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.modalContent}
          >
            <View style={styles.exitModalHeader}>
              <View style={styles.exitWarningIconContainer}>
                <Icon name="alert-triangle" size={40} color="#FFC107" />
              </View>
              <Text style={styles.exitModalTitle}>Exit Access Mode?</Text>
              <Text style={styles.exitModalSubtitle}>
                Are you sure you want to exit?
              </Text>
            </View>

            <View style={styles.exitModalButtons}>
              <TouchableOpacity
                onPress={handleContinueAccess}
                style={styles.exitModalButtonPrimary}
                activeOpacity={0.8}
              >
                <Text style={styles.exitModalButtonPrimaryText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExitAccess}
                style={styles.exitModalButtonDanger}
                activeOpacity={0.8}
              >
                <Text style={styles.exitModalButtonDangerText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Product/Stock Selection Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Section</Text>
              <Text style={styles.modalSubtitle}>
                Choose which section you want to access.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.modalButtonSecondary}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonSecondaryText}>Not now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleProductNavigation('Product')}
                style={styles.modalButtonPrimary}
                activeOpacity={0.8}
              >
                <Icon name="package" size={18} color="#1A1A1A" />
                <Text style={styles.modalButtonPrimaryText}>Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleProductNavigation('Stock')}
                style={styles.modalButtonPrimary}
                activeOpacity={0.8}
              >
                <Icon name="layers" size={18} color="#1A1A1A" />
                <Text style={styles.modalButtonPrimaryText}>Stock</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Header navigation={navigation}/>
      
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Icon name="lock" size={28} color="#1A1A1A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Access Control</Text>
              <Text style={styles.headerSubtitle}>Manage your granted permissions</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <Icon name="log-out" size={18} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {allPermissions.map((permission, index) => (
          <Animated.View
            key={permission._id}
            entering={FadeInUp.delay(index * 100).duration(500)}
            style={styles.permissionSection}
          >
            {/* Seller Info Card */}
            <View style={styles.sellerCard}>
              <View style={styles.sellerInfo}>
                {/* Seller Avatar */}
                <View style={styles.avatarContainer}>
                  {permission.sellerId?.userInfo?.profileURL?.key ? (
                    <Image
                      source={{
                        uri: `${AWS_CDN_URL}${permission.sellerId.userInfo.profileURL.key}`,
                      }}
                      style={styles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Icon name="user" size={40} color="#1A1A1A" />
                    </View>
                  )}
                  <View style={styles.statusBadge}>
                    <Icon name="check-circle" size={14} color="#FFFFFF" />
                  </View>
                </View>

                {/* Seller Details */}
                <View style={styles.sellerDetails}>
                  <Text style={styles.sellerName} numberOfLines={2}>
                    {permission.sellerId?.businessName ||
                      permission.sellerId?.userInfo?.userName ||
                      permission.sellerId?.userName ||
                      'Seller'}
                  </Text>
                  <Text style={styles.sellerUsername} numberOfLines={1}>
                    @{permission.sellerId?.userInfo?.userName ||
                      permission.sellerId?.userName ||
                      'seller'}
                  </Text>
                  <View style={styles.badgesContainer}>
                    <View style={styles.grantedBadge}>
                      <Icon name="unlock" size={12} color="#4CAF50" />
                      <Text style={styles.grantedBadgeText}>Access Granted</Text>
                    </View>
                    <View style={styles.pageCountBadge}>
                      <Text style={styles.pageCountText}>
                        {permission.accessPages?.length || 0}{' '}
                        {permission.accessPages?.length === 1 ? 'page' : 'pages'} accessible
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Pages Grid */}
        
            {permission.accessPages && permission.accessPages.length > 0 ? (
              <View style={styles.pagesGrid}>
                {permission.accessPages.map((page, pageIndex) => {
                  const hasAnyPermission =
                    page.canView || page.canCreate || page.canEdit || page.canDelete;

                   // console.log('page', page);

                  return (
                    <Animated.View
                      key={page.pageType}
                      entering={FadeIn.delay(pageIndex * 50).duration(400)}
                      layout={Layout.springify()}
                    >
                      <TouchableOpacity
                        onPress={() => hasAnyPermission && handlePageClick(page)}
                        disabled={!hasAnyPermission}
                        style={[
                          styles.pageCard,
                          !hasAnyPermission && styles.pageCardDisabled,
                        ]}
                        activeOpacity={0.7}
                      >
                        {/* Page Header */}
                        <View style={styles.pageHeader}>
                          <View
                            style={[
                              styles.pageIconContainer,
                              !hasAnyPermission && styles.pageIconDisabled,
                            ]}
                          >
                            {getPageIcon(page.pageType)}
                          </View>
                          {hasAnyPermission && (
                            <Icon name="arrow-right" size={20} color="#FFC107" />
                          )}
                        </View>

                        {/* Page Title */}
                        <Text style={styles.pageTitle} numberOfLines={2}>
                          {formatPageType(page.pageType)}
                        </Text>

                        {/* Permissions */}
                        <View style={styles.permissionsContainer}>
                          {page.canView && (
                            <View style={[styles.permissionBadge, styles.viewBadge]}>
                              <Icon name="eye" size={10} color="#2196F3" />
                              <Text style={styles.permissionBadgeText}>View</Text>
                            </View>
                          )}
                          {page.canCreate && (
                            <View style={[styles.permissionBadge, styles.createBadge]}>
                              <Icon name="plus" size={10} color="#4CAF50" />
                              <Text style={styles.permissionBadgeText}>Create</Text>
                            </View>
                          )}
                          {page.canEdit && (
                            <View style={[styles.permissionBadge, styles.editBadge]}>
                              <Icon name="edit-2" size={10} color="#FFC107" />
                              <Text style={styles.permissionBadgeText}>Edit</Text>
                            </View>
                          )}
                          {/* {page.canDelete && (
                            <View style={[styles.permissionBadge, styles.deleteBadge]}>
                              <Icon name="trash-2" size={10} color="#F44336" />
                              <Text style={styles.permissionBadgeText}>Delete</Text>
                            </View>
                          )} */}
                        </View>

                        {/* No permissions indicator */}
                        {!hasAnyPermission && (
                          <View style={styles.noPermissionContainer}>
                            <Icon name="lock" size={12} color="#666666" />
                            <Text style={styles.noPermissionText}>No permissions granted</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <Animated.View entering={FadeIn} style={styles.noAccessCard}>
                <Icon name="alert-circle" size={48} color="#FFC107" />
                <Text style={styles.noAccessText}>No pages accessible for this seller</Text>
              </Animated.View>
            )}
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    maxWidth: 400,
    width: '100%',
  },
  emptyIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 24,
    borderRadius: 999,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  homeButton: {
    backgroundColor: '#FFC107',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  homeButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
    paddingTop: 8,  //8
    paddingBottom: 12,  //16
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    backgroundColor: '#FFC107',
    padding: 12,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  headerButton: {
    backgroundColor: '#3A3A3A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,  //32
  },
  permissionSection: {
    marginBottom: 32,
  },
  sellerCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFC107',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD54F',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sellerUsername: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  grantedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  grantedBadgeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  pageCountBadge: {
    backgroundColor: 'rgba(58, 58, 58, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  pageCountText: {
    color: '#CCCCCC',
    fontSize: 11,
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pageCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3A3A3A',
    width: (width - 48) / 2,
    minHeight: 200,    //160,
  },
  pageCardDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(58, 58, 58, 0.5)',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pageIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 12,
    borderRadius: 12,
  },
  pageIconDisabled: {
    backgroundColor: 'rgba(58, 58, 58, 0.3)',
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    minHeight: 36,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
  },
  viewBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  createBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  editBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  deleteBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  permissionBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noPermissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  noPermissionText: {
    fontSize: 11,
    color: '#666666',
  },
  noAccessCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  noAccessText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  modalHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#FFC107',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  modalButtonPrimaryText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 20,
    borderRadius: 999,
    marginBottom: 20,
  },
  modalButtonDanger: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  modalButtonDangerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Exit Modal Compact Styles
  exitModalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  exitWarningIconContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 16,
    borderRadius: 999,
    marginBottom: 16,
  },
  exitModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  exitModalSubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exitModalButtonPrimary: {
    flex: 1,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  exitModalButtonPrimaryText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  exitModalButtonDanger: {
    flex: 1,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  exitModalButtonDangerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AccessPage;
