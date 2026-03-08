import type { StackScreenProps } from '@react-navigation/stack';

export type RootStackParamList = {
  Splash: undefined;
  More: undefined;
  StoreScreen: undefined;
  SellerStoreScreen: undefined;
  aboutApp: undefined;
  privacyPolicy: undefined;
  FAQ: undefined;
  termsScreen: undefined;
  Settings: undefined;
  SellerOrders: undefined;
  ExchangeReasonScreen: undefined;
  ExchangeConfirmScreen: undefined;
  ReturnOrderScreen: undefined;
  CancelOrderScreen: undefined;
  CancelConfirmScreen: undefined;
  EditAddressScreen: undefined;
  AddressForm: undefined;
  OrderDetailScreen: undefined;
  ReturnReasonScreen: undefined;
  ReturnConfirmScreen: undefined;
  PaymentFailed: undefined;
  PaymentSuccess: undefined;
  analytics: undefined;
  SellerRegister: undefined;
  aadharverify: undefined;
  AddressDetails: undefined;
  FourthTabContent: undefined;
  sellerPortal: undefined;
  successScreen: undefined;
  CashfreePaymentGateway: undefined;
  ProductUploadForm: undefined;
  Products: undefined;
  ProductAnalyse: undefined;
  OnboardingScreen: undefined;
  Comment: {
    chatRoomId?: string;
    userId?: string;
    senderId?: string;
    senderName?: string;
    source?: string;
    notification_id?: string;
  };
  LiveStream: undefined;
  EditLs: undefined;
  StreamPreviewScreen: undefined;
  LiveStreamForm: undefined;
  Streaming: undefined;
  cohostInvitations: undefined;
  ViewSellerHistory: undefined;
  RegistrationsScreen: undefined;
  userShows: undefined;
  UpcomingShows: undefined;
  preBidding: undefined;
  LiveScreen: undefined;
  ShopableForm: undefined;
  ViewShopable: undefined;
  ShopableAnalyse: undefined;
  EditShopableForm: undefined;
  CreateShowsForm: undefined;
  ViewShopableShipper: undefined;
  EditShows: undefined;
  CreateShipperVideo: undefined;
  ViewShipperShows: undefined;
  GlobalSearch: undefined;
  reel: undefined;
  ShipperOrders: undefined;
  DropshipperForm: undefined;
  LiveShowDetail: undefined;
  ShoppableVideoDetail: undefined;
  ProductDetails: undefined;
  product: undefined;
  ChatScreen: undefined;
  NotificationScreen: undefined;
  Notification: undefined;
  ViewSellerProdile: undefined;
  AboutUser: undefined;
  SavedScreen: undefined;
  whistlist: undefined;
  Store: {
    sellerId?: string;
    tabName?: string;
  };
  Flashsalesetup: undefined;
  Flashsaleform: {
    product?: {
      _id: string;
      title: string;
      images: Array<{ key: string; _id: string }>;
      category: string;
      MRP: number;
      productPrice: number;
      stockId?: {
        _id: string;
        quantity: number;
        isInStock: boolean;
      };
    };
  };
  Flashsaledetails: {
    flashSale?: any;
  };
  Flashsaleedit: {
    saleData?: any;
  };
  subscription: undefined;
  WelcomeScreen: undefined;
  resetpassword: undefined;
  OTPScreen: undefined;
  ConfirmPassword: undefined;
  ConfirmReset: undefined;
  ResetSuccess: undefined;
  Verify: undefined;
  VerifyOtp: undefined;
  VerifySuccess: undefined;
  ProfileSetupScreen: undefined;
  DeliveryScreen: undefined;
  MapDeliveryScreen: undefined;
  Login: undefined;
  Dashboard: undefined;
  registeruser: undefined;
  bottomtabbar: undefined;
  update: {
    force?: boolean;
    updateUrl?: string;
    message?: string;
  };
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, Screen>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
