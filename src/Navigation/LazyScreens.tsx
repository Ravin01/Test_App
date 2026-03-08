import React, {lazy, Suspense} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';

// Loading fallback component
const LoadingFallback = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#FFD700" />
  </View>
);

// Higher-order component for lazy loading with Suspense
export const withLazy = (importFunc: () => Promise<any>) => {
  const LazyComponent = lazy(importFunc);
  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// ============================================
// HEAVY SCREENS - Lazy load these (saves 8-10 seconds!)
// ============================================

// Live Streaming Screens (Very Heavy)
export const LazyLiveStreaming = withLazy(() => import('../Components/SellerComponents/LiveStreaming/LiveStreaming'));
export const LazyEditLsform = withLazy(() => import('../Components/SellerComponents/LiveStreaming/EditLsform'));
export const LazyStreaming = withLazy(() => import('../Components/SellerComponents/LiveStreaming/Streaming'));
export const LazyStreamPreviewScreen = withLazy(() => import('../Components/SellerComponents/LiveStreaming/StreamPreviewScreen'));
export const LazyLiveStreamForm = withLazy(() => import('../Components/SellerComponents/LiveStreaming/Livestreamingform'));
export const LazyCohostInvitations = withLazy(() => import('../Components/SellerComponents/LiveStreaming/CoHost/CohostInvitationsScreen'));
export const LazyRegistrationsScreen = withLazy(() => import('../Components/SellerComponents/LiveStreaming/RegistrationsScreen'));
export const LazyInterestedUsersScreen = withLazy(() => import('../Components/SellerComponents/LiveStreaming/InterestedUsersScreen'));
export const LazySponsorInvitations = withLazy(() => import('../Components/SellerComponents/LiveStreaming/SponsorInvitations'));
export const LazySellerStoreScreen = withLazy(() => import('../Components/SellerComponents/LiveStreaming/Utils/SellerStoreScreen'));
export const LazyEditTaggedProducts = withLazy(() => import('../Components/SellerComponents/LiveStreaming/ProductsListing/ProductsforLSEdit'));
export const LazyShowsScheduleForm = withLazy(() => import('../Components/SellerComponents/LiveStreaming/Form/ShowsScheduleForm'));

// Shows/Live Screens (Heavy)
export const LazyLiveStreamScreen = withLazy(() => import('../Components/Shows/LiveScreen'));
export const LazyShows = withLazy(() => import('../Components/Shows/Shows'));
export const LazyUpcomingLiveShows = withLazy(() => import('../Components/Shows/UpcomingLive'));
export const LazyPreBiddingScreens = withLazy(() => import('../Components/Shows/PreBiddingScreen'));
export const LazyStoreScreen = withLazy(() => import('../Components/Shows/StoreScreen'));
export const LazyUpcomingShowDetail = withLazy(() => import('../Components/Shows/UpcomingShowDetail'));

// Reels (Heavy)
export const LazyReels = withLazy(() => import('../Components/Reels/ReelsComponent'));

// Products Screens
export const LazyProducts = withLazy(() => import('../Components/SellerComponents/ProductsScreen/Products'));
export const LazyProductDetailScreen = withLazy(() => import('../Components/SellerComponents/ProductsScreen/ProductDetailScreen'));
export const LazyAddingProducts = withLazy(() => import('../Components/SellerComponents/ProductsScreen/AddingProducts'));
export const LazyProductsAnalytics = withLazy(() => import('../Components/SellerComponents/ProductsScreen/ProductAnalytics'));
export const LazyStockUpdateHistory = withLazy(() => import('../Components/SellerComponents/ProductsScreen/StockUpdateHistory'));

// Seller Profile & Details
export const LazyViewSellerProfile = withLazy(() => import('../Components/SellerProfile/ViewSellerProfile'));
export const LazyShowsDetails = withLazy(() => import('../Components/SellerProfile/ShowsDetails'));
export const LazyProductDetails = withLazy(() => import('../Components/SellerProfile/ProductDetail'));
export const LazySubscriptionScreen = withLazy(() => import('../Components/SellerProfile/SubscriptionScreen'));
export const LazyStore = withLazy(() => import('../Components/SellerProfile/Store'));

// Chat Screens
export const LazyComment = withLazy(() => import('../Components/ChatScreens/Comment'));
export const LazyChatScreen = withLazy(() => import('../Components/ChatScreens/ChatScreen'));

// Analytics Screens
export const LazyAnalyticsScreen = withLazy(() => import('../Components/AnalyticalScreens/Analyse'));
export const LazyProfileAnalytics = withLazy(() => import('../Components/AnalyticalScreens/ProfileAnalytics'));
export const LazyLiveStreamAnalytics = withLazy(() => import('../Components/AnalyticalScreens/LiveStreamAnalyticsPage'));
export const LazyAnalyticsDashboard = withLazy(() => import('../Components/AnalyticalScreens/AnalyticsDashboard'));

// Seller Portal & Registration
export const LazySellerPortal = withLazy(() => import('../Components/SellerComponents/SellerForm/SellerFormIndex'));
export const LazySellerRegister = withLazy(() => import('../Components/SellerComponents/SellerForm/SellerRegisterTab1'));
export const LazyAadhaarVerification = withLazy(() => import('../Components/SellerComponents/SellerForm/SellerRegisterTab2'));
export const LazyAddressDetails = withLazy(() => import('../Components/SellerComponents/SellerForm/SellerRegisterTab3'));
export const LazyFourthTabContent = withLazy(() => import('../Components/SellerComponents/SellerForm/SellerRegisterTab4'));
export const LazySuccessScreen = withLazy(() => import('../Components/SellerComponents/SellerForm/SuccessScreen'));

// Shopable Videos
export const LazyShopableForm = withLazy(() => import('../Components/SellerComponents/ShopableVideos/ShopableForm'));
export const LazyViewShopable = withLazy(() => import('../Components/SellerComponents/ShopableVideos/ViewShopable'));
export const LazyShoppableVideoDetail = withLazy(() => import('../Components/SellerComponents/ShopableVideos/ShoppablevideoDetails'));
export const LazyEditShopableForm = withLazy(() => import('../Components/SellerComponents/ShopableVideos/EditShopableForm'));
export const LazyShoppableAnalytics = withLazy(() => import('../Components/SellerComponents/ShopableVideos/ShoppableAnalyticalPage'));

// Flash Sales
export const LazyFlashSaleForm = withLazy(() => import('../Components/SellerComponents/FlashSale/Flashsaleform'));
export const LazyFlashSaleManagement = withLazy(() => import('../Components/SellerComponents/FlashSale/FlashSaleManager'));
export const LazyEditFlashSale = withLazy(() => import('../Components/SellerComponents/FlashSale/FlashScreenEdit'));
export const LazySetupFlashSale = withLazy(() => import('../Components/SellerComponents/FlashSale/SetupFlashSale'));
export const LazyFlashSaleDetails = withLazy(() => import('../Components/SellerComponents/FlashSale/DetailesFlashSale'));

// Bundle Sales
export const LazyBundleListing = withLazy(() => import('../Components/SellerComponents/BundleSale/BundleListing'));
export const LazyCreateBundleSale = withLazy(() => import('../Components/SellerComponents/BundleSale/BundleCreate'));
export const LazyEditBundleSale = withLazy(() => import('../Components/SellerComponents/BundleSale/BundleEdit'));

// Shipper Components
export const LazyViewShopableShipper = withLazy(() => import('../Components/ShipperComponents/ViewShoppableVideos'));
export const LazyCreateShipperVideo = withLazy(() => import('../Components/ShipperComponents/CreateVideo'));
export const LazyViewShipperShows = withLazy(() => import('../Components/ShipperComponents/ViewShows'));
export const LazyCreateShowsForm = withLazy(() => import('../Components/ShipperComponents/CreateShowsForm'));
export const LazyEditShows = withLazy(() => import('../Components/ShipperComponents/EditShows'));
export const LazyShipperOrders = withLazy(() => import('../Components/ShipperComponents/ShipperOrders'));
export const LazyDropshipperForm = withLazy(() => import('../Components/ShipperComponents/DropshipperForm'));

// Orders & Activity
export const LazySellerOrders = withLazy(() => import('../Components/SellerComponents/ORM/SellerOrders'));
export const LazyReturnReasonScreen = withLazy(() => import('../Components/MyActivity/ReturnReasonScreen'));
export const LazyReturnConfirmScreen = withLazy(() => import('../Components/MyActivity/ReturnConfirmScreen'));
export const LazyExchangeReasonScreen = withLazy(() => import('../Components/MyActivity/ExchangeReasonScreen'));
export const LazyExchangeConfirmScreen = withLazy(() => import('../Components/MyActivity/ExchangeConfirmScreen'));
export const LazyReturnOrderScreen = withLazy(() => import('../Components/MyActivity/ReturnOrderScreen'));
export const LazyCancelOrderScreen = withLazy(() => import('../Components/MyActivity/CancelOrderScreen'));
export const LazyCancelConfirmScreen = withLazy(() => import('../Components/MyActivity/CancelConfirmScreen'));
export const LazyIssueReportOrder = withLazy(() => import('../Components/MyActivity/Utils/RiseTicket'));

// Support System
export const LazyTicketsDisplay = withLazy(() => import('../Components/SupportSystem/TicketsDisplay'));
export const LazySellerticketDisplay = withLazy(() => import('../Components/SupportSystem/SellerticketDisplay'));

// Search & Notifications
export const LazyGlobalSearch = withLazy(() => import('../Components/GloabalSearch/GlobalSearch'));
export const LazyNotificationScreen = withLazy(() => import('../Components/NotificationScreen'));
export const LazySendNotifyScreen = withLazy(() => import('../Components/SellerComponents/Notifications/SendNotification'));

// Settings & Info Pages
export const LazySellerSettings = withLazy(() => import('../Components/SellerSettings'));
export const LazyUserAccessManagement = withLazy(() => import('../Components/SellerComponents/UserAccessManagement'));
export const LazyFAQScreen = withLazy(() => import('../Components/AboutApp/FAQ'));
export const LazyTermsAndConditions = withLazy(() => import('../Components/AboutApp/Terms&condition'));
export const LazyPrivacyPolicy = withLazy(() => import('../Components/AboutApp/PrivacyPolicy'));
export const LazyFlyKupAbout = withLazy(() => import('../Components/AboutApp/About'));
export const LazySettingsScreen = withLazy(() => import('../Components/AboutApp/Settings'));

// Profile & User
export const LazyAboutUserPage = withLazy(() => import('../Components/Profile/AboutUser'));
export const LazySavedScreen = withLazy(() => import('../Components/Profile/SavedScreen'));
export const LazyWhistList = withLazy(() => import('../Components/Whistlist'));

// Address Management
export const LazyAddressForm = withLazy(() => import('../Components/DeliveryAddress/AddressForm'));
export const LazyViewSavedAddress = withLazy(() => import('../Components/DeliveryAddress/ViewSavedAddress'));

// Payment Screens
export const LazyCashfreePayment = withLazy(() => import('../Components/Payment/Cashfree'));
export const LazyPaymentFailed = withLazy(() => import('../Components/Payment/PaymentFailed'));
export const LazyPaymentSuccess = withLazy(() => import('../Components/Payment/PaymentSuccess'));

// Auth Screens (Lazy load password reset flow - not critical for startup)
export const LazyForgotPassword = withLazy(() => import('../Components/AuthScreens/ForgotPassword'));
export const LazyOTPScreen = withLazy(() => import('../Components/AuthScreens/OTPScreen'));
export const LazyConfirmPassword = withLazy(() => import('../Components/AuthScreens/ConfirmPassword'));
export const LazyConfirmReset = withLazy(() => import('../Components/AuthScreens/ConfirmReset'));
export const LazyResetSuccess = withLazy(() => import('../Components/AuthScreens/ResetSuccess'));
export const LazyVerify = withLazy(() => import('../Components/AuthScreens/Verify'));
export const LazyVerifyOtp = withLazy(() => import('../Components/AuthScreens/VerifyOtp'));
export const LazyVerifySuccess = withLazy(() => import('../Components/AuthScreens/VerifySuccess'));
export const LazyProfileSetupScreen = withLazy(() => import('../Components/AuthScreens/ProfileSetupScreen'));
export const LazyDeliveryAddressScreen = withLazy(() => import('../Components/AuthScreens/DeliveryScreen'));

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default {
  withLazy,
  LoadingFallback,
};
