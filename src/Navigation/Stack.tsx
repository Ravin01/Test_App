import React, {useEffect, useRef, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {
  CardStyleInterpolators,
  createStackNavigator,
} from '@react-navigation/stack';
import {enableScreens} from 'react-native-screens';

// Enable native screen optimization for better performance
enableScreens(true);

import Dashboard from '../Components/Dashboard';
import ResponsiveLogin from '../Components/AuthScreens/Login';
import BottomTabBar from './BottomTabBar';
import ForceUpdateWrapper from '../Components/ForceUpdateWrapper';
import AddressDetailsScreen from '../Components/SellerComponents/SellerForm/SellerRegisterTab3';
import Products from '../Components/SellerComponents/ProductsScreen/Products';
import ProductDetailScreen from '../Components/SellerComponents/ProductsScreen/ProductDetailScreen';
import ViewSellerHistory from '../Components/SellerComponents/ViewSellerHistory';
import LiveStreamForm from '../Components/SellerComponents/LiveStreaming/Livestreamingform';
import LiveStreaming from '../Components/SellerComponents/LiveStreaming/LiveStreaming';
import EditLsform from '../Components/SellerComponents/LiveStreaming/EditLsform';
import Streaming from '../Components/SellerComponents/LiveStreaming/Streaming';
import AddingProducts from '../Components/SellerComponents/ProductsScreen/AddingProducts';
import Shows from '../Components/Shows/Shows';
import LiveStreamScreen from '../Components/Shows/LiveScreen';
import CashfreePaymentGateway from '../Components/Payment/Cashfree';
import PaymentFailed from '../Components/Payment/PaymentFailed';
import PaymentSuccess from '../Components/Payment/PaymentSuccess';

import SellerPortal from '../Components/SellerComponents/SellerForm/SellerFormIndex';
import SellerRegister from '../Components/SellerComponents/SellerForm/SellerRegisterTab1';
import AadhaarVerificationScreen from '../Components/SellerComponents/SellerForm/SellerRegisterTab2';
import FourthTabContent from '../Components/SellerComponents/SellerForm/SellerRegisterTab4';
import ShopableForm from '../Components/SellerComponents/ShopableVideos/ShopableForm';
import ViewShopable from '../Components/SellerComponents/ShopableVideos/ViewShopable';
import ShoppableVideoDetail from '../Components/SellerComponents/ShopableVideos/ShoppablevideoDetails';
import ViewSellerProdile from '../Components/SellerProfile/ViewSellerProfile';
import ResponsiveOnboardingScreen from '../Components/AuthScreens/ResponsiveOnboardingScreen';
import ViewShopableShipper from '../Components/ShipperComponents/ViewShoppableVideos';
import CreateShipperVideo from '../Components/ShipperComponents/CreateVideo';
import ViewShipperShows from '../Components/ShipperComponents/ViewShows';
import CreateShowsForm from '../Components/ShipperComponents/CreateShowsForm';
import EditShows from '../Components/ShipperComponents/EditShows';
import ShipperOrders from '../Components/ShipperComponents/ShipperOrders';
import DropshipperForm from '../Components/ShipperComponents/DropshipperForm';

import ForgotPassword from '../Components/AuthScreens/ForgotPassword';
import OTPScreen from '../Components/AuthScreens/OTPScreen';
import ConfirmPassword from '../Components/AuthScreens/ConfirmPassword';
import ConfirmReset from '../Components/AuthScreens/ConfirmReset';
import ResetSuccess from '../Components/AuthScreens/ResetSuccess';

import Verify from '../Components/AuthScreens/Verify';
import VerifyOtp from '../Components/AuthScreens/VerifyOtp';
import VerifySuccess from '../Components/AuthScreens/VerifySuccess';
import ResponsiveRegister from '../Components/AuthScreens/Register';
import ResponsiveWelcomeScreen from '../Components/AuthScreens/ResponsiveWelcomeScreen';

import Comment from '../Components/ChatScreens/Comment';
import ChatScreen from '../Components/ChatScreens/ChatScreen';
import NotificationScreen from '../Components/NotificationScreen';
import GlobalSearch from '../Components/GloabalSearch/GlobalSearch';
import ShowsDetails from '../Components/SellerProfile/ShowsDetails';
import ProductDetails from '../Components/SellerProfile/ProductDetail';

// import RegisterUI from '../Components/AuthScreens/RegisterUI';
// import OTPScreenUI from '../Components/AuthScreens/OTPScreenUI';
// import VerifySuccessUI from '../Components/AuthScreens/VerifySuccessUI';

import AddressForm from '../Components/DeliveryAddress/AddressForm';
import {shareUrl} from '../../Config';
import FAQScreen from '../Components/AboutApp/FAQ';
import TermsAndConditionsScreen from '../Components/AboutApp/Terms&condition';
import PrivacyPolicyScreen from '../Components/AboutApp/PrivacyPolicy';
import FlyKupAboutScreen from '../Components/AboutApp/About';
import AppNavigator from './AppNavigator';
import SettingsScreen from '../Components/AboutApp/Settings';
import StoreScreen from '../Components/Shows/StoreScreen';

import {useNavigationContainerRef} from '@react-navigation/native';
import {View, StyleSheet} from 'react-native';
import type {RootStackParamList} from '../types/navigation';
import NotificationHandler from '../Utils/NotificationHandler';
import RootNavigation from './RootNavigation';
import {useAuthContext} from '../Context/AuthContext';
import RNBootSplash from 'react-native-bootsplash';
import SellerStoreScreen from '../Components/SellerComponents/LiveStreaming/Utils/SellerStoreScreen';
import StreamPreviewScreen from '../Components/SellerComponents/LiveStreaming/StreamPreviewScreen';
import UpcomingLiveShows from '../Components/Shows/UpcomingLive';
import PreBiddingScreens from '../Components/Shows/PreBiddingScreen';
import AboutUserPage from '../Components/Profile/AboutUser';
import SuccessScreen from '../Components/SellerComponents/SellerForm/SuccessScreen';
import EditShopableForm from '../Components/SellerComponents/ShopableVideos/EditShopableForm';
import CohostInvitationsScreen from '../Components/SellerComponents/LiveStreaming/CoHost/CohostInvitationsScreen';
import AnalyticsScreen from '../Components/AnalyticalScreens/Analyse';
import DeliveryAddressScreen from '../Components/AuthScreens/DeliveryScreen';
// import MapDeliveryAddressScreen from '../Components/AuthScreens/MapAddressget';
import ProductsAnalyticsPage from '../Components/SellerComponents/ProductsScreen/ProductAnalytics';
import SubscriptionScreen from '../Components/SellerProfile/SubscriptionScreen';
import {DeviceEventEmitter} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import SavedScreen from '../Components/Profile/SavedScreen';
import ViewSavedAddress from '../Components/DeliveryAddress/ViewSavedAddress';
import SellerOrders from '../Components/SellerComponents/ORM/SellerOrders';
import RegistrationsScreen from '../Components/SellerComponents/LiveStreaming/RegistrationsScreen';
import InterestedUsersScreen from '../Components/SellerComponents/LiveStreaming/InterestedUsersScreen';
import ShoppableAnalyticsPage from '../Components/SellerComponents/ShopableVideos/ShoppableAnalyticalPage';
import UpcomingShowDetail from '../Components/Shows/UpcomingShowDetail';
import WhistList from '../Components/Whistlist';
import SellerSettings from '../Components/SellerSettings';
import GuestLectureScreen from '../Components/Reels/ReelsComponent';
import SendNotifyScreen from '../Components/SellerComponents/Notifications/SendNotification';
import FlashSaleForm from '../Components/SellerComponents/FlashSale/Flashsaleform';
import FlashSaleManagement from '../Components/SellerComponents/FlashSale/FlashSaleManager';
import EditFlashSaleScreen from '../Components/SellerComponents/FlashSale/FlashScreenEdit';
import SetupFlashSale from '../Components/SellerComponents/FlashSale/SetupFlashSale';
import FlashSaleDetails from '../Components/SellerComponents/FlashSale/DetailesFlashSale';
import TicketsDisplay from '../Components/SupportSystem/TicketsDisplay';
import ProfileAnalytics from '../Components/AnalyticalScreens/ProfileAnalytical';
import IssueReportOrder from '../Components/MyActivity/Utils/RiseTicket';
import {initializeNotificationService} from '../hooks/NotificationService';
import SellerticketDisplay from '../Components/SupportSystem/SellerticketDisplay';
import StockUpdateHistoryScreen from '../Components/SellerComponents/ProductsScreen/StockUpdateHistory';
import Store from '../Components/SellerProfile/Store';
import SponsorInvitations from '../Components/SellerComponents/LiveStreaming/SponsorInvitations';
import LiveStreamAnalyticsPage from '../Components/AnalyticalScreens/LiveStreamAnalyticsPage';
import ReturnReasonScreen from '../Components/MyActivity/ReturnReasonScreen';
import ReturnConfirmScreen from '../Components/MyActivity/ReturnConfirmScreen';
import ExchangeReasonScreen from '../Components/MyActivity/ExchangeReasonScreen';
import ExchangeConfirmScreen from '../Components/MyActivity/ExchangeConfirmScreen';
import ReturnOrderScreen from '../Components/MyActivity/ReturnOrderScreen';
import CancelOrderScreen from '../Components/MyActivity/CancelOrderScreen';
import CancelConfirmScreen from '../Components/MyActivity/CancelConfirmScreen';
import BundleListing from '../Components/SellerComponents/BundleSale/BundleListing';
import CreateBundleSale from '../Components/SellerComponents/BundleSale/BundleCreate';
import EditBundleSale from '../Components/SellerComponents/BundleSale/BundleEdit';

import ProfileSetupScreen from '../Components/AuthScreens/ProfileSetupScreen';
import UserAccessManagement from '../Components/SellerComponents/UserAccessManagement';
import AnalyticsDashboard from '../Components/AnalyticalScreens/AnalyticsDashboard';
import ShowsScheduleForm from '../Components/SellerComponents/LiveStreaming/Form/ShowsScheduleForm';
import EditTaggedProducts from '../Components/SellerComponents/LiveStreaming/ProductsListing/ProductsforLSEdit';
import WalletPage from '../Components/Wallet/WalletPage';
import WebViewScreen from '../Components/AboutApp/WebViewScreen';

import ShoppableVideoPreview from '../Components/SellerComponents/ShopableVideos/ShoppableVideoPreview';
import TrendingProductsPage from '../Components/TrendingProducts/TrendingProductsPage';
// WalletPage
// import WalletPage from '../Components/Wallet/WalletPage';
// Define your linking configuration
const linking = {
  prefixes: ['flykup://', shareUrl], // Match both app scheme and web domain
  config: {
    screens: {
      ViewSellerProdile: {
        path: 'profile/:id',
      },
      product: {
        path: 'user/product/:id',
      },
      reel: {path: 'user/reel/:id'},
      LiveScreen: {
        path: 'user/show/:id',
        parse: {
          id: (id: string) => id,
        },
      },
    },
  },
};

const Stack = createStackNavigator<RootStackParamList>();

const NavigationHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // console.log('🚀 Legacy NavigationHandler initialized (TAP-ONLY compatibility)');

    // Keep the legacy DeviceEventEmitter ONLY for user taps, not auto-navigation
    const subscription = DeviceEventEmitter.addListener(
      'notificationNavigation',
      data => {
        // console.log('📡 Legacy notification TAP event received:', data);

        // Only navigate if this is from a user tap (has source indicating tap)
        if (
          data?.screen === 'Comment' &&
          data?.chatRoomId &&
          data?.source !== 'auto'
        ) {
          // console.log('👆 Legacy navigation from user tap');
          // console.log("these navigation works first")
          navigation.navigate('ChatScreen', {
            roomId: data.chatRoomId  });
        } else {
          // console.log('🚫 Legacy navigation ignored (not from user tap)');
        }
      },
    );

    return () => {
      subscription?.remove();
    };
  }, [navigation]);

  return null;
};

// Branded loading screen component
const AppLoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingTextContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  loadingTextContainer: {
    marginTop: 24,
    height: 30,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default function StackNavigate() {
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string>();
  const {isInitialized, initialRoute, connectSocket} = useAuthContext();

  useEffect(() => {
    if (navigationRef) {
      initializeNotificationService(navigationRef);
    }
  }, [navigationRef]);

  // NEW: Check if app was launched by notification to determine initial route (non-blocking)
  const [notificationRoute, setNotificationRoute] = useState<any>(null);

  useEffect(() => {
    // Run notification check in background without blocking UI
    const checkNotification = async () => {
      await NotificationHandler.checkInitialNotification();

      if (NotificationHandler.wasLaunchedByNotification()) {
        const initialRoute = NotificationHandler.getInitialRoute();
        const params = NotificationHandler.getInitialRouteParams();
        
        if (initialRoute && params) {
          // Use the route name from NotificationHandler (ChatScreen or NotificationScreen)
          setNotificationRoute({ name: initialRoute, params });
          console.log('📱 App launched by notification - setting initial route to:', initialRoute);
        }
      }
    };

    checkNotification();
  }, []);

  useEffect(() => {
    if (navigationRef) {
      // Set the navigation ref in RootNavigation for global access
      RootNavigation.setNavigationRef(navigationRef as any);
      
      // Initialize notification handlers
      NotificationHandler.initialize(navigationRef);
    }
  }, [navigationRef]);

  // Connect socket after successful login
  useEffect(() => {
    if (isInitialized && initialRoute?.screen === 'bottomtabbar') {
      setTimeout(() => {
        // console.log('🔌 Connecting socket after initialization...');
        connectSocket();
      }, 500);
    }
  }, [isInitialized, initialRoute, connectSocket]);

  // Hide splash screen once AuthContext is initialized and ready
  useEffect(() => {
    if (isInitialized) {
      // Small delay to ensure navigation is fully mounted
      const timer = setTimeout(async () => {
        await RNBootSplash.hide({ fade: true });
        console.log('✅ Bootsplash hidden - AuthContext initialized & App ready');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // Only show loading if AuthContext hasn't initialized (should be instant now)
  if (!isInitialized) {
    return <AppLoadingScreen />;
  }

  // Determine final initial route
  // CRITICAL: Force update screen MUST take priority over notifications and deep links
  let finalInitialRoute = initialRoute || notificationRoute || { screen: 'WelcomeScreen' };
  
  // ✅ CRITICAL FIX: Force update MUST override everything
  if (initialRoute?.screen === 'update' || initialRoute?.name === 'update') {
    finalInitialRoute = initialRoute;
    console.log('🚨 Force update detected - overriding all other routes');
  }
  
  const initialRouteName = finalInitialRoute ? (finalInitialRoute.name || finalInitialRoute.screen) : undefined;
  const initialRouteParams = finalInitialRoute ? finalInitialRoute.params : undefined;
  
  console.log('🎯 Final initial route:', initialRouteName || 'Let deep link handle', 'with params:', JSON.stringify(initialRouteParams));

  return (
    <NavigationContainer
      linking={linking}
      ref={navigationRef}
      theme={{
        dark: true,
        colors: {
          primary: '#F7CE45',
          background: '#000000',
          card: '#000000',
          text: '#FFFFFF',
          border: '#333333',
          notification: '#F7CE45',
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
      onReady={() => {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute) {
          routeNameRef.current = currentRoute.name;
          // console.log('🚀 Navigation ready:', currentRoute.name);

          // Notify NotificationHandler that navigation is ready
          NotificationHandler.setNavigationReady();
        }
      }}
      onStateChange={async () => {
        const currentRoute = navigationRef.getCurrentRoute();
        if (currentRoute && routeNameRef.current !== currentRoute.name) {
          routeNameRef.current = currentRoute.name;
          // console.log('📱 Navigation state changed to:', currentRoute.name);
        }
      }}>
      {/* <UseNotificationHandler/> */}
      <NavigationHandler/>

      {/* In-app notification overlay for foreground messages */}
      {/* <InAppNotification /> */}

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          
          // ✅ Properly detach previous screens to prevent glitches
          detachPreviousScreen: true,
          
          // Enable smooth hardware-accelerated animations
          animationEnabled: true,
          gestureEnabled: false,
          // gestureDirection: 'horizontal',
          
          // Optimal transition timing - smooth without being too slow
          transitionSpec: {
            open: {
              animation: 'spring',
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
            close: {
              animation: 'spring',
              config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            },
          },
          
          // Consistent smooth slide animation for all platforms
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          
          // Performance optimizations
          freezeOnBlur: true,
          
          // ✅ Solid black background prevents white flashes
          cardStyle: {
            backgroundColor: '#000000',
            opacity: 1,
          },
          
          // Disable overlays that can cause glitches
          cardOverlayEnabled: false,
          cardShadowEnabled: false,
          
          // Standard card presentation
          presentation: 'card',
          
          // Ensure animations use native driver
          animationTypeForReplace: 'push',
        }}
        initialRouteName={initialRouteName || 'WelcomeScreen'}>
        {/* Conditionally set initial route params for notification screens */}
        {/* Critical screens - always mounted */}
        <Stack.Screen
          name="Comment"
          component={Comment}
          initialParams={
            initialRouteName === 'Comment' ? initialRouteParams : undefined
          }
        />
        <Stack.Screen name="TrendingProducts" component={TrendingProductsPage} />
        <Stack.Screen name = "WebViewScreen" component={WebViewScreen} />
        <Stack.Screen name = "WalletPage" component={WalletPage} />
        <Stack.Screen name="SellerSettings" component={SellerSettings} />
        <Stack.Screen name="LiveStream" component={LiveStreaming} />
        <Stack.Screen name="EditLs" component={EditLsform} />
        
        <Stack.Screen name="ProfileSetupScreen" component={ProfileSetupScreen} />
      <Stack.Screen name="BundleListing" component={BundleListing} />
      <Stack.Screen name="BundleCreate" component={CreateBundleSale} />
      <Stack.Screen name="BundleEdit" component={EditBundleSale} />

      <Stack.Screen name="UserAccessManagement" component={UserAccessManagement} />
      <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboard} />
      
      <Stack.Screen name="ReturnReasonScreen" component={ReturnReasonScreen} />
      <Stack.Screen name="ReturnConfirmScreen" component={ReturnConfirmScreen} />
      <Stack.Screen name="ExchangeReasonScreen" component={ExchangeReasonScreen} />
      <Stack.Screen name="ExchangeConfirmScreen" component={ExchangeConfirmScreen} />
      <Stack.Screen name="ReturnOrderScreen" component={ReturnOrderScreen} />
      <Stack.Screen name="CancelOrderScreen" component={CancelOrderScreen} />
      <Stack.Screen name="CancelConfirmScreen" component={CancelConfirmScreen} />
      <Stack.Screen name="reportOrder" component={IssueReportOrder} />
        <Stack.Screen
          name="ChatScreen"
          component={ChatScreen}
          initialParams={
            initialRouteName === 'ChatScreen' ? initialRouteParams : undefined
          }
        />
        <Stack.Screen
          name="NotificationScreen"
          component={NotificationScreen}
          initialParams={
            initialRouteName === 'NotificationScreen' ? initialRouteParams : undefined
          }
        />

        <Stack.Screen
          name="More"
          component={BottomTabBar}
          options={{
            headerShown: false,
          }}
        />

        {/* Heavy/Infrequent screens */}
        <Stack.Screen name="StoreScreen" component={StoreScreen} />
        <Stack.Screen name="aboutApp" component={FlyKupAboutScreen} />
        <Stack.Screen name="privacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="termsScreen" component={TermsAndConditionsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SellerOrders" component={SellerOrders} />
        <Stack.Screen name="EditAddressScreen" component={ViewSavedAddress} />
        <Stack.Screen name="AddressForm" component={AddressForm} />
        <Stack.Screen name="PaymentFailed" component={PaymentFailed} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
        <Stack.Screen name="analytics" component={AnalyticsScreen} />
        <Stack.Screen name="SellerRegister" component={SellerRegister} />
        <Stack.Screen
          name="aadharverify"
          component={AadhaarVerificationScreen}
        />
        <Stack.Screen name="AddressDetails" component={AddressDetailsScreen} />
        <Stack.Screen name="FourthTabContent" component={FourthTabContent} />
        <Stack.Screen name="sellerPortal" component={SellerPortal} />
        <Stack.Screen name="successScreen" component={SuccessScreen} />
        <Stack.Screen
          name="CashfreePaymentGateway"
          component={CashfreePaymentGateway}
        />
        <Stack.Screen name="ProductUploadForm" component={AddingProducts} />
        <Stack.Screen name="Products" component={Products} />
        <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
        <Stack.Screen name="stockHistory" component={StockUpdateHistoryScreen} />
        <Stack.Screen name="ProductAnalyse" component={ProductsAnalyticsPage} />
        <Stack.Screen name="ProfileAnalytics" component={ProfileAnalytics} />
        <Stack.Screen name="SponsorInvitations" component={SponsorInvitations} />
        <Stack.Screen name="TicketsDisplay" component={TicketsDisplay} />
        <Stack.Screen name="SellerticketDisplay" component={SellerticketDisplay} />
        <Stack.Screen name="Sellernotify" component={SendNotifyScreen} />
        <Stack.Screen name="FlashsaleManager" component={FlashSaleManagement} />
        <Stack.Screen name="Flashsalesetup" component={SetupFlashSale} />
        <Stack.Screen name="Flashsaleform" component={FlashSaleForm} />
        <Stack.Screen name="Flashsaledetails" component={FlashSaleDetails} />
        <Stack.Screen name="Flashsaleedit" component={EditFlashSaleScreen} />
        <Stack.Screen name="LiveStreamAnalytics" component={LiveStreamAnalyticsPage} />
        <Stack.Screen name="LiveStreamAnalyticsPage" component={LiveStreamAnalyticsPage} />
        {/* <Stack.Screen
          name="OnboardingScreen"
          component={ResponsiveOnboardingScreen}
        /> */}
        {/* Live streaming screens */}
        <Stack.Screen
          name="update"
          component={ForceUpdateWrapper}
          options={{headerShown: false}}
        />
        <Stack.Screen 
          name="EditTaggedProducts" 
          component={EditTaggedProducts}
        />
        <Stack.Screen
          name="StreamPreviewScreen"
          component={StreamPreviewScreen}
          options={{
            headerShown: false,
            unmountOnBlur: true,
          }}
        />
        <Stack.Screen 
          name="LiveStreamForm" 
          component={LiveStreamForm}
        />
        <Stack.Screen 
          name="Streaming" 
          component={Streaming}
          options={{
            unmountOnBlur: true,
          }}
        />
        <Stack.Screen
          name="cohostInvitations"
          component={CohostInvitationsScreen}
        />
        <Stack.Screen name="ViewSellerHistory" component={ViewSellerHistory} />
        <Stack.Screen
          name="RegistrationsScreen"
          component={RegistrationsScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="InterestedUsersScreen"
          component={InterestedUsersScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="UpcomingShowDetail"
          component={UpcomingShowDetail}
          options={{headerShown: false}}
        />
        {/* <Stack.Screen 
          name="userShows" 
          component={Shows}
        /> */}
        <Stack.Screen 
          name="UpcomingShows" 
          component={UpcomingLiveShows}
        />
        <Stack.Screen 
          name="preBidding" 
          component={PreBiddingScreens}
        />
        
        <Stack.Screen name="ShoppableVideoPreview" component={ShoppableVideoPreview} />
        <Stack.Screen 
          name="LiveScreen" 
          component={LiveStreamScreen}
          options={{
            unmountOnBlur: true,
            freezeOnBlur:true,
          }}
        />
        <Stack.Screen name="ShopableForm" component={ShopableForm} />
        <Stack.Screen name="ViewShopable" component={ViewShopable} />
        <Stack.Screen
          name="ShopableAnalyse"
          component={ShoppableAnalyticsPage}
        />
        <Stack.Screen name="EditShopableForm" component={EditShopableForm} />
        {/* <Stack.Screen name="CreateShowsForm" component={CreateShowsForm} /> */}
        {/* <Stack.Screen
          name="ViewShopableShipper"
          component={ViewShopableShipper}
        /> */}
        {/* <Stack.Screen name="EditShows" component={EditShows} /> */}
        {/* <Stack.Screen
          name="CreateShipperVideo"
          component={CreateShipperVideo}
        />
        <Stack.Screen name="ViewShipperShows" component={ViewShipperShows} /> */}
        <Stack.Screen name="GlobalSearch" component={GlobalSearch} />
        <Stack.Screen 
          name="reel" 
          component={GuestLectureScreen}
          options={{
            unmountOnBlur: true,
          }}
        />
        {/* <Stack.Screen name="ShipperOrders" component={ShipperOrders} />
        <Stack.Screen name="DropshipperForm" component={DropshipperForm} /> */}
        <Stack.Screen name="LiveShowDetail" component={ShowsDetails} />
        <Stack.Screen
          name="ShoppableVideoDetail"
          component={ShoppableVideoDetail}
        />
        <Stack.Screen name="ProductDetails" component={ProductDetails} />
        <Stack.Screen name="product" component={ProductDetails} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="ViewSellerProdile" component={ViewSellerProdile} />
        <Stack.Screen name="AboutUser" component={AboutUserPage} />
        <Stack.Screen name="SavedScreen" component={SavedScreen} />
        <Stack.Screen name="whistlist" component={WhistList} />
        <Stack.Screen name="Store" component={Store} />
        <Stack.Screen name="SellerStoreScreen" component={SellerStoreScreen} />
        <Stack.Screen name="subscription" component={SubscriptionScreen} />
        {/* Auth screens */}
        <Stack.Screen
          name="WelcomeScreen"
          component={ResponsiveWelcomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen name="resetpassword" component={ForgotPassword} />
        <Stack.Screen name="OTPScreen" component={OTPScreen} />
        <Stack.Screen name="ConfirmPassword" component={ConfirmPassword} />
        <Stack.Screen name="ConfirmReset" component={ConfirmReset} />
        <Stack.Screen name="ResetSuccess" component={ResetSuccess} />
        {/* <Stack.Screen name="Verify" component={Verify} /> */}
        <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
        <Stack.Screen name="VerifySuccess" component={VerifySuccess} />
        <Stack.Screen name="DeliveryScreen" component={DeliveryAddressScreen} />
        {/* <Stack.Screen name="Auction" omponent={AuctionsSellerControl} /> */}
        {/* <Stack.Screen name="MapDeliveryScreen" component={MapDeliveryAddressScreen} /> */}
        <Stack.Screen
          name="Login"
          component={ResponsiveLogin}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Dashboard"
          component={Dashboard}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="registeruser"
          component={ResponsiveRegister}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="bottomtabbar"
          component={AppNavigator}
          options={{headerShown: false}}
        />
        {/* <Stack.Screen name="notfoundscreen" component={NotFoundScreen} options={{headerShown: false}} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
