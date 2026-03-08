/* eslint-disable react/no-unstable-nested-components */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import {CommonActions, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';
import {AuthContext} from '../Context/AuthContext';
import {useAccess} from '../Context/AccessContext';
import {AWS_CDN_URL} from '../Utils/aws';
import RejectionBottomSheet from '../Components/SellerComponents/SellerForm/RejectionBottomSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../Utils/Colors';
import axiosInstance from '../Utils/Api';
import PendingBottomSheet from '../Components/SellerComponents/SellerForm/PendingBottomSheet';
import {intialAvatar, phoneNumber, whatsappNumber} from '../Utils/Constants';
import { bagActive, playInActive, shopVideo } from '../assets/assets';
import { clearProfileDraft } from '../Services/profileSetupStorage';

// Icon map defined outside component to prevent recreation
const iconMap = {
  MaterialIcons,
  AntDesign,
  Ionicons,
  FontAwesome,
  Feather,
  
};

// Memoized DrawerItem component to prevent unnecessary re-renders
const DrawerItem = memo(
  ({
    icon,
    iconFamily,
    title,
    onPress,
    showBadge = false,
    notifies = 0,
  }: {
    icon: string;
    iconFamily: any;
    title: string;
    onPress: () => void;
    showBadge?: boolean;
    notifies?: number;
  }) => {
    const isIconComponent =
      typeof iconFamily === 'string' && iconMap[iconFamily];

    return (
      <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
        <View style={styles.itemLeft}>
          {isIconComponent ? (
            React.createElement(iconMap[iconFamily], {
              name: icon,
              size: 20,
              color: '#ffffff',
            })
          ) : (
            <Image
              source={iconFamily}
              style={styles.iconImage}
            />
          )}
          <Text allowFontScaling={false} style={styles.itemText}>{title}</Text>
        </View>

        {showBadge && notifies > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {Number(notifies) > 99 ? '99+' : notifies}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

DrawerItem.displayName = 'DrawerItem';

const CustomDrawerContent = (props) => {
  const navigation = useNavigation();
  const {user, notifyCount, logout}: any = useContext(AuthContext);
  const {isAccessMode, hasAccess, loading: accessLoading, hasPageAccess, sellerInfo, exitAccessMode, enterAccessMode} = useAccess();
  const [rejecModal, setRejectModa] = useState(false);
  const [pendingModal, setPendingModal] = useState(false);
  const [_isFeaturesEnabled, setIsFeaturesEnabled] = useState(false);
  const [_access, setAccess] = useState({});
  
  // Use ref to track if whitelist check has been done
  const whitelistChecked = useRef(false);
  const lastEmailChecked = useRef('');
  const [isDrawerReady, setIsDrawerReady] = useState(false);

  const email = user?.emailId || '';
// console.log(sellerInfo)
  // Determine which user info to display based on access mode
  const displayUser = useMemo(() => {
    if (isAccessMode && sellerInfo) {
      return {
        name: sellerInfo?.userName|| sellerInfo?.userInfo?.userName || 'Seller',
        emailId: sellerInfo.email || sellerInfo.emailId,
        profileURL: sellerInfo.profileURL,
        isAccessMode: true,
      };
    }
    return {
      ...user,
      isAccessMode: false,
    };
  }, [isAccessMode, sellerInfo, user]);

  // Reset refs when component mounts to fix navigation glitch
  useEffect(() => {
    // Set drawer ready immediately - no delay needed
    setIsDrawerReady(true);
    
    // Cleanup function to reset refs when drawer closes/unmounts
    return () => {
      whitelistChecked.current = false;
      lastEmailChecked.current = '';
      setIsDrawerReady(false);
    };
  }, []);

  // Memoized seller button configuration
  const sellerButtonConfig = useMemo(() => {
    let buttonColor = '#F7CE45';
    let buttonText = 'Seller Form';
    let textColor = '#000';

    const status = user?.sellerInfo?.approvalStatus;

    if (status === 'auto_rejected' || status === 'rejected') {
      return {
        buttonColor: '#FF260D',
        buttonText: 'Rejected',
        textColor: '#fff',
      };
    }

    if (status === 'pending' || status === 'manual_review') {
      return {
        buttonColor: 'orange',
        buttonText: 'Pending',
        textColor: '#fff',
      };
    }

    return {buttonColor, buttonText, textColor};
  }, [user?.sellerInfo?.approvalStatus]);

  // Memoized whitelist check with AsyncStorage caching
  const checkWhitelist = useCallback(async (emailToCheck: string) => {
    // Prevent duplicate calls for the same email
    if (whitelistChecked.current && lastEmailChecked.current === emailToCheck) {
      return;
    }

    try {
      // Check AsyncStorage cache first (24 hour expiry)
      const cacheKey = `whitelist_${emailToCheck}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const {data, timestamp} = JSON.parse(cached);
        const cacheAge = Date.now() - timestamp;
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < CACHE_DURATION) {
          setIsFeaturesEnabled(data.isWhitelisted);
          setAccess(data.permissions || {});
          whitelistChecked.current = true;
          lastEmailChecked.current = emailToCheck;
          return;
        }
      }

      // If no cache or expired, fetch from API
      const response = await axiosInstance.get(
        `/admin-emails/check-whitelist/${emailToCheck}`,
      );

      if (response.data) {
        setIsFeaturesEnabled(response.data.isWhitelisted);
        setAccess(response?.data?.permissions || {});
        whitelistChecked.current = true;
        lastEmailChecked.current = emailToCheck;
        
        // Cache the result
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          }),
        );
      }
    } catch (error) {
      console.error('Error checking whitelist:', error.message);
    }
  }, []);

  // Check whitelist when drawer is ready and email is available
  useEffect(() => {
    if (isDrawerReady && email && !whitelistChecked.current) {
      checkWhitelist(email);
    }
  }, [isDrawerReady, email, checkWhitelist]);

  // Memoized logout handler
  const Handlelogout = useCallback(async () => {
    try {
      // Exit access mode if active
      // if (isAccessMode) {
      //   await exitAccessMode();
      // }

      // 1. FIRST: Navigate to login screen to prevent 401 errors
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: 'WelcomeScreen'}],
        }),
      );

      // 2. THEN: Clean up user session in background
      // Use setTimeout to ensure navigation completes first
      setTimeout(async () => {
        try {
          // Clear profile setup draft
          await clearProfileDraft(user?._id);
          
          const deviceId = await AsyncStorage.getItem('deviceId');
          if (deviceId) {
            await axiosInstance.post(
              'auth/logout',
              {deviceId},
              {skipAuthRefresh: true},
            );
          }

          await AsyncStorage.multiRemove(['userName', 'userId', 'deviceId','accessToken','refreshToken']);

          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser) {
            await GoogleSignin.revokeAccess();
            await GoogleSignin.signOut();
          }

          const fbAccessToken = await AccessToken.getCurrentAccessToken();
          if (fbAccessToken) {
            await LoginManager.logOut();
          }

          if (auth().currentUser) {
            await auth().signOut();
          }

          await logout();
        } catch (error) {
          console.log('Background logout cleanup error:', error);
        }
      }, 100);
    } catch (error) {
      console.log('Logout Error:', error);
    }
  }, [isAccessMode, exitAccessMode, logout, navigation]);

  // Memoized navigation handler
  const handleNavigate = useCallback(() => {
    const status = user?.sellerInfo?.approvalStatus;

    if (status === 'auto_rejected' || status === 'rejected') {
      setRejectModa(true);
      return;
    }

    if (status === 'pending' || status === 'manual_review') {
      setPendingModal(true);
      ToastAndroid.show(
        "You're application not approved yet!",
        ToastAndroid.LONG,
      );
      return;
    }

    navigation.navigate('sellerPortal');
  }, [user?.sellerInfo?.approvalStatus, navigation]);

  // Memoized profile image URI - uses displayUser to show seller profile in access mode
  const profileImageUri = useMemo(() => {
  const userKey = displayUser?.profileURL?.key;
  const sellerKey = sellerInfo?.userInfo?.profileURL?.key;

  if (userKey) return `${AWS_CDN_URL}${userKey}`;
  if (sellerKey) return `${AWS_CDN_URL}${sellerKey}`;
  
  return `${intialAvatar}${displayUser?.name}`;
}, [
  displayUser?.profileURL?.key,
  sellerInfo?.userInfo?.profileURL?.key,
  displayUser?.name
]);


  // Memoized profile initial - uses displayUser to show seller initial in access mode
  const profileInitial = useMemo(() => {
    return displayUser?.name ? displayUser.name.charAt(0).toUpperCase() : '?';
  }, [displayUser?.name]);

  // Memoized navigation handlers
  const navigationHandlers = useMemo(
    () => ({
      aboutUser: () => {
        props.navigation.closeDrawer();
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'profile' }
        });
      },
      comment: () => {
        props.navigation.closeDrawer();
        navigation.navigate('Comment');
      },
      notification: () => {
        props.navigation.closeDrawer();
        navigation.navigate('NotificationScreen');
      },
      orders: () => {
        props.navigation.closeDrawer();
        navigation.navigate('bottomtabbar', {
          screen: 'HomeTabs',
          params: { screen: 'myactivity' }
        });
      },
      profileAnalytics: () => {
        props.navigation.closeDrawer();
        navigation.navigate('ProfileAnalytics');
      },
      liveStream: () => {
        props.navigation.closeDrawer();
        navigation.navigate('LiveStream');
      },
      viewShopable: () => {
        props.navigation.closeDrawer();
        navigation.navigate('ViewShopable');
      },
      sellerNotify: () => {
        props.navigation.closeDrawer();
        navigation.navigate('Sellernotify');
      },
      bundleSale: () => {
        props.navigation.closeDrawer();
        navigation.navigate('BundleListing');
      },
      flashSaleManager: () => {
        props.navigation.closeDrawer();
        navigation.navigate('FlashsaleManager');
      },
      sellerOrders: () => {
        props.navigation.closeDrawer();
        navigation.navigate('SellerOrders');
      },
      productsTab: () => {
        props.navigation.closeDrawer();
        navigation.navigate('Products', {selectedTab: 'Product'});
      },
      stockTab: () => {
        props.navigation.closeDrawer();
        navigation.navigate('Products', {selectedTab: 'Stock'});
      },
      sellerTickets: () => {
        props.navigation.closeDrawer();
        navigation.navigate('SellerticketDisplay');
      },
      userAccessManagement: () => {
        props.navigation.closeDrawer();
        navigation.navigate('UserAccessManagement');
      },
      accessControl: async () => {
        try {
          // Close drawer first
          props.navigation.closeDrawer();
          // Enter access mode before navigating
          await enterAccessMode();
          // Navigate to HomeTabs navigator, then to AccessControlPage screen within it
          props.navigation.navigate('HomeTabs', { screen: 'AccessControlPage' });
        } catch (error) {
          console.error('Error entering access mode:', error);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Failed to enter access mode', ToastAndroid.SHORT);
          }
        }
      },
      address: () => {
        props.navigation.closeDrawer();
        navigation.navigate('EditAddressScreen');
      },
      aboutApp: () => {
        props.navigation.closeDrawer();
        navigation.navigate('aboutApp');
      },
      privacyPolicy: () => {
        props.navigation.closeDrawer();
        navigation.navigate('privacyPolicy');
      },
      tickets: () => {
        props.navigation.closeDrawer();
        navigation.navigate('TicketsDisplay');
      },
      settings: () => {
        props.navigation.closeDrawer();
        navigation.navigate('Settings');
      },
      wallet: () => {
        props.navigation.closeDrawer();
        navigation.navigate('WalletPage');
      },
      sponsor: () => {
        props.navigation.closeDrawer();
        navigation.navigate('SponsorInvitations');
      }, cohost: () => {
        props.navigation.closeDrawer();
        navigation.navigate('cohostInvitations');
      },
    }),
    [navigation, props.navigation, enterAccessMode],
  );

  const isSeller = user?.role === 'seller';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RejectionBottomSheet
        isOpen={rejecModal}
        onClose={() => setRejectModa(false)}
        message={user?.sellerInfo?.rejectedReason}
        onContinue={() => navigation.navigate('sellerPortal')}
        phoneNumber={phoneNumber}
        whatsappNumber={whatsappNumber}
        email={email}
      />
      <PendingBottomSheet
        message="You're application under Review"
        onWait={() => setPendingModal(false)}
        phoneNumber={phoneNumber}
        whatsappNumber={whatsappNumber}
        email={email}
        onClose={() => setPendingModal(false)}
        isOpen={pendingModal}
      />

      <ScrollView
        style={styles.menuContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* User Profile Section */}
        {isAccessMode ? (
          // In Access Mode - Show seller info without link, with access indicator
          <View style={[styles.userSection, styles.accessModeSection]}>
            {profileImageUri ? (
              <Image source={{uri: profileImageUri}} style={[styles.userAvatar, styles.accessModeAvatar]} />
            ) : (
              <View style={[styles.profileImage, styles.accessModeAvatar]}>
                <Text allowFontScaling ={false} style={styles.profileInitials}>{profileInitial}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text allowFontScaling={false} style={[styles.userName, styles.accessModeText]}>{displayUser?.name}</Text>
              <Text allowFontScaling={false} style={styles.userEmail}>{displayUser?.emailId}</Text>
              <Text allowFontScaling={false} style={styles.accessModeIndicator}>Access Granted By</Text>
            </View>
          </View>
        ) : (
          // Normal Mode - Show user profile with link
          <TouchableOpacity
            style={styles.userSection}
            onPress={navigationHandlers.aboutUser}>
            {profileImageUri ? (
              <Image source={{uri: profileImageUri}} style={styles.userAvatar} />
            ) : (
              <View style={styles.profileImage}>
                <Text style={styles.profileInitials}>{profileInitial}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayUser?.name}</Text>
              <Text style={styles.userEmail}>{displayUser?.emailId}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Seller CTA */}
        {!isSeller && !isAccessMode && (
          <View style={styles.sellerSection}>
            <Text style={styles.sellerText}>Want to become a seller</Text>
            <TouchableOpacity
              style={[
                styles.sellerButton,
                {backgroundColor: sellerButtonConfig.buttonColor},
              ]}
              onPress={handleNavigate}>
              <Text
                style={[
                  styles.sellerButtonText,
                  {color: sellerButtonConfig.textColor},
                ]}>
                {sellerButtonConfig.buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isAccessMode && <Text style={styles.sectionTitle}>Overview</Text>}

        {(!isAccessMode || hasPageAccess('MESSAGE')) && (<DrawerItem
          icon="mail"
          iconFamily="Feather"
          title="Messages"
          onPress={navigationHandlers.comment}
        />)}

        {!isAccessMode && (<DrawerItem
          icon="notifications-none"
          iconFamily="MaterialIcons"
          title="Notification"
          onPress={navigationHandlers.notification}
          showBadge={notifyCount > 0}
          notifies={notifyCount}
        />)}

        {!isAccessMode && (<DrawerItem
          icon="list"
          iconFamily="Feather"
          title="Orders"
          onPress={navigationHandlers.orders}
        />)}

        {(isSeller || isAccessMode) && (
          <>
            <Text style={styles.sectionTitle}>Seller</Text>

            {/* Profile Analytics - DASHBOARD */}
            {/* {(!isAccessMode || hasPageAccess('DASHBOARD')) && (
              <DrawerItem
                icon="person-outline"
                iconFamily="MaterialIcons"
                title="Profile Analyse"
                onPress={navigationHandlers.profileAnalytics}
              />
            )} */}

            {/* Live Streaming - SHOWS */}
            {(!isAccessMode || hasPageAccess('SHOWS')) && (
              <DrawerItem
                icon="smart-display"
                iconFamily={{uri:playInActive}}
                title="Live Streaming"
                onPress={navigationHandlers.liveStream}
              />
            )}

            {/* Sponsor Invitations - SPONSORS */}
            {(!isAccessMode || hasPageAccess('SPONSORS')) && (
              <DrawerItem
                icon="wallet-giftcard"
                iconFamily="MaterialIcons"
                title="Sponsor Invitations"
                onPress={navigationHandlers.sponsor}
              />
            )}

            <DrawerItem
                icon="supervisor-account"
                iconFamily="MaterialIcons"
                title="Cohost Invitations"
                onPress={navigationHandlers.cohost}
              />

{/* Send Notification - NOTIFICATIONS */}
            {(!isAccessMode || hasPageAccess('NOTIFICATIONS')) && (
              <DrawerItem
                icon="send"
                iconFamily="MaterialIcons"
                title="Send Notification"
                onPress={navigationHandlers.sellerNotify}
              />
            )}
            {/* Shoppable Videos - SHOPPABLE_VIDEO */}
            {(!isAccessMode || hasPageAccess('SHOPPABLE_VIDEO')) && (
              <DrawerItem
                icon="videogame-asset"
                iconFamily={{uri:shopVideo}}
                title="Shoppable Videos"
                onPress={navigationHandlers.viewShopable}
              />
            )}

            

           
            {/* Products - PRODUCT */}
            {(!isAccessMode || hasPageAccess('PRODUCT')) && (
              <DrawerItem
                icon="cart-plus"
                iconFamily={{uri:bagActive}}
                title="Products"
                onPress={navigationHandlers.productsTab}
              />
            )}

            {/* Bundle Sales - BUNDLE */}
            {(!isAccessMode || hasPageAccess('BUNDLE')) && (
              <DrawerItem
                icon="package"
                iconFamily={'Feather'}
                title="Bundle Sales"
                onPress={navigationHandlers.bundleSale}
              />
            )}
 {/* Your Orders - ORDERS */}
            {(!isAccessMode || hasPageAccess('ORDERS')) && (
              <DrawerItem
                icon="list"
                iconFamily="Feather"
                title="Manage Orders"
                onPress={navigationHandlers.sellerOrders}
              />
            )}
           

 {/* Manage Flash Sale - FLASHSALE */}
            {(!isAccessMode || hasPageAccess('FLASHSALE')) && (
              <DrawerItem
                icon="flash-on"
                iconFamily="MaterialIcons"
                title="Manage Flash Sale"
                onPress={navigationHandlers.flashSaleManager}
              />
            )}

            {/* Manage Stocks - PRODUCT */}
            {(!isAccessMode || hasPageAccess('PRODUCT')) && (
              <DrawerItem
                icon="restore"
                iconFamily="MaterialIcons"
                title="Manage Stocks"
                onPress={navigationHandlers.stockTab}
              />
            )}

            {/* Manage Tickets - SUPPORT */}
            {(!isAccessMode || hasPageAccess('SUPPORT')) && (
              <DrawerItem
                icon="help-circle"
                iconFamily="Feather"
                title="Manage Tickets"
                onPress={navigationHandlers.sellerTickets}
              />
            )}

            {/* User Access - USER_ACCESS - Hidden in access mode  */}
            {!isAccessMode && (
              <DrawerItem
                icon="people"
                iconFamily="MaterialIcons"
                title="User Access"
                onPress={navigationHandlers.userAccessManagement}
              />
            )}
          </>
        )}

        {/* Access Control - Available for all users who have been granted access */}
        {!isAccessMode && hasAccess && !accessLoading && (<DrawerItem
          icon="shield"
          iconFamily="Feather"
          title="Access Control"
          onPress={navigationHandlers.accessControl}
        />)}

        {!isAccessMode && (<Text style={styles.sectionTitle}>Account</Text>)}

        {!isAccessMode && (<DrawerItem
          icon="account-balance-wallet"
          iconFamily="MaterialIcons"
          title="My Wallet"
          onPress={navigationHandlers.wallet}
        />)}

        {!isAccessMode && (<DrawerItem
          icon="location-on"
          iconFamily="MaterialIcons"
          title="Address"
          onPress={navigationHandlers.address}
        />)}

        {/* {!isAccessMode && (<DrawerItem
          icon="info"
          iconFamily="Feather"
          title="About us"
          onPress={navigationHandlers.aboutApp}
        />)} */}

        {/* {!isAccessMode && (<DrawerItem
          icon="file-text"
          iconFamily="Feather"
          title="Privacy policy"
          onPress={navigationHandlers.privacyPolicy}
        />)} */}

         {!isAccessMode && ( <DrawerItem
          icon="help-circle"
          iconFamily="Feather"
          title="Help Center"
          onPress={navigationHandlers.tickets}
        />)}

         {!isAccessMode && (<DrawerItem
          icon="settings"
          iconFamily="Feather"
          title="Settings"
          onPress={navigationHandlers.settings}
        />)}

        {/* Logout */}
        {!isAccessMode ? (<View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutItem} onPress={Handlelogout}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
            <Text allowFontScaling={false} style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>) : (<View style={{height: 50}} />)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3333',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#777',
  },
  profileInitials: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderColor,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#888888',
  },
  accessModeSection: {
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  accessModeAvatar: {
    borderWidth: 2,
    borderColor: '#F7CE45',
  },
  accessModeText: {
    color: '#F7CE45',
  },
  accessModeIndicator: {
    fontSize: 10,
    color: 'rgba(247, 206, 69, 0.8)',
    marginTop: 2,
  },
  sellerSection: {
    marginBottom: 7,
    marginTop: 7,
    borderTopWidth: 1,
    paddingTop: 5,
    borderTopColor: '#333333',
    alignItems: 'center',
  },
  sellerText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
    paddingTop: 8,
  },
  sellerButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sellerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginTop: 20,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#ffffff',
  },
  itemText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 15,
    fontWeight: '400',
  },
  badgeContainer: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  logoutContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginTop: 20,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  logoutText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 15,
    fontWeight: '400',
  },
});

export default memo(CustomDrawerContent);
