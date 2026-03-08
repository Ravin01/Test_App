/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
import React, {useState, useEffect, useContext, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  BackHandler, Linking
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import LinearGradient from 'react-native-linear-gradient';
import {Wind} from 'lucide-react-native';
import FastImage from 'react-native-fast-image';
import {BlurView} from '@react-native-community/blur';
import {AuthContext} from '../../Context/AuthContext';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import onGoogleButtonPress from './GoogleSigin';
// Responsive Design Imports
import {useTheme, useThemedStyles} from '../../Theme/ResponsiveTheme';
import {useResponsiveScreen} from '../../Utils/ResponsiveScreenWrapper';
import {getAccessibilityProps} from '../../Utils/AccessibilityUtils';
import {colors} from '../../Utils/Colors';
import { emailButton, facebokButton, Facebook, flykupLogo, Google, googleButton, welcomeIndexImg } from '../../assets/assets';

export default function WelcomeScreen({navigation}) {
  const {setuser, getFcmTokenAndRequestPermission}: any =
    useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const [selectedButton, setSelectedButton] = useState(null);
  const getStatusBarHeight = () => {
    return Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;
  };
  // const [backCount, setBackCount] = useState(0); 
  let backCount = 0;
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (backCount === 0) {
          // backPressCount.current = 1;
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          // setBackCount(1);
          backCount++;
          // Reset after 2 seconds
          // timeoutRef.current = setTimeout(() => {
          //   backPressCount.current = 0;
          // }, 2000);

          return true; // prevent default behavior
        }

        // Second press - exit app
        // clearTimeout(timeoutRef.current);
        console.log("tryingtoexit",he)
        backCount = 0;
        // setBackCount(0);
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => {
        subscription.remove();
        // clearTimeout(timeoutRef.current);
      };
    }, []),
  );
  const onFacebookButtonPress = async () => {
    try {
      // Step 1: Login with Facebook
      const result = await LoginManager.logInWithPermissions([
        'public_profile',
        'email',
      ]);

      if (result.isCancelled) {
        throw new Error('User cancelled the login process');
      }

      // Step 2: Get Access Token
      const data = await AccessToken.getCurrentAccessToken();

      if (!data || !data.accessToken) {
        throw new Error('Something went wrong obtaining access token');
      }

      const accessToken = data.accessToken;
      const facebookCredential =
        auth.FacebookAuthProvider.credential(accessToken);
      // console.log('facebookCredential====', facebookCredential);

      // Step 3: Sign-in with Firebase
      const userCredential = await auth().signInWithCredential(
        facebookCredential,
      );
      const userDetails = userCredential.user;

      // console.log('Firebase user:', userDetails);

      // Step 4: Call your API to complete login
      const response = await api.post('/auth/facebook', {
        name: userDetails.displayName,
        emailId: userDetails.email,
        accessToken: accessToken,
      });

      // console.log('response',response.data);

      // Step 5: Handle cookies from response headers
      const token = response.headers['set-cookie'] || [];
      if (token.length === 0) {
        console.log('No cookies in the response headers.');
        return;
      }

      const cookieString = token[0];
      const cookies = cookieString.split(';');
      let apiAccessToken = '';
      let refreshToken = '';

      cookies.forEach(cookie => {
        if (cookie.includes('accessToken')) {
          apiAccessToken = cookie.split('=')[1].trim();
        }
        if (cookie.includes('refreshToken')) {
          refreshToken = cookie.split('=')[1].trim();
        }
      });

      // Step 6: Store tokens and user info
      if (apiAccessToken) {
        await AsyncStorage.setItem('accessToken', apiAccessToken);
      }
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
      if (response.data?.data?.userName) {
        await AsyncStorage.setItem('userName', response.data.data.userName);
      }
      if (response.data?.data?._id) {
        await AsyncStorage.setItem('userId', response.data.data._id);
      }
      if (response.data?.data?.sellerInfo?._id) {
        await AsyncStorage.setItem(
          'sellerId',
          response.data.data.sellerInfo._id,
        );
      }
      // await getFcmTokenAndRequestPermission();
      // Step 7: Navigate to main screen
      navigation.navigate('bottomtabbar');
      await getFcmTokenAndRequestPermission();
      ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
      // ToastAndroid.show('Successfully Logged in with Facebook', ToastAndroid.SHORT);
    } catch (error) {
      console.warn('Facebook Login Error:', JSON.stringify(error, null, 2));
      ToastAndroid.show(
        `Facebook Login Error: ${error?.message || 'Unknown error'}`,
        ToastAndroid.LONG,
      );
    } finally {
      setSelectedButton(null);
    }
  };

  async function handleGoogleButton() {
    try {
      setLoading(true);
      setSelectedButton(1);
      await onGoogleButtonPress({
        setuser,
        navigation,
        getFcmTokenAndRequestPermission,
      });
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      ToastAndroid.show(
        `Error: ${error?.message || 'Unknown error'}`,
        ToastAndroid.LONG,
      );
    } finally {
      setLoading(false);
      setSelectedButton(null);
    }
  }
  return (
    // <KeyboardAvoidingView
    //   style={styles.flex}
    //   behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    //   keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    // >
    <>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={'small'} color={colors.primaryButtonColor} />
        </View>
      )}
      <SafeAreaView style={styles.container}>
        <Image
          source={{uri:flykupLogo}}
          style={styles.logo}
          resizeMode="cover"
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
        
          <Image
            source={{uri:welcomeIndexImg}}
            style={styles.headerImage}
            resizeMode="contain"
          />

          <View
            style={{marginHorizontal: 8, marginTop: 10, alignItems: 'center'}}>
            <Text style={styles.title}>WELCOME TO FLYKUP !</Text>
            <Text style={styles.subtitle}>
              Log in to explore exclusive live drops and stream-to-shop events
            </Text>

         
            {/* GOOGLE Button */}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    selectedButton === 1 ? '#F7CE45' : 'transparent',
                  padding: 0,
                },
              ]}
              onPress={() => {
                {
                  setSelectedButton(1);

                  handleGoogleButton();
                }
              }}>
              {selectedButton === 1 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                  }}>
                  <Image
                    source={{uri:Google}}
                    style={{width: 20, height: 20}}
                  />
                  <Text style={[styles.buttonText, styles.buttonActiveText]}>
                    CONTINUE WITH GOOGLE
                  </Text>
                </View>
              ) : (
                <Image
                  source={{uri:googleButton}}
                  style={{width: 300, height: 50}}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            {/* FACEBOOK Button */}
            {/* <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    selectedButton == 2 ? '#F7CE45' : 'transparent',
                  padding: 0,
                },
              ]}
              onPress={() => {
                if (selectedButton !== 2) {
                  setSelectedButton(2);
                } else {
                  onFacebookButtonPress();
                }
              }}>
              {selectedButton == 2 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                  }}>
                  <FastImage
                    source={{uri:Facebook}}
                    style={{height: 25, width: 25, marginRight: 10}}
                  />
                  <Text style={[styles.buttonText, styles.buttonActiveText]}>
                    CONTINUE WITH FACEBOOK
                  </Text>
                </View>
              ) : (
                <Image
                  source={{uri:facebokButton}}
                  style={{width: 300, height: 50, marginTop: 10}}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity> */}

            {/* EMAIL Button */}

            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
              <LinearGradient
                colors={['rgba(217, 217, 217, 0.75)', 'rgba(217, 217, 217, 0)']}
                start={{x: 1.0561, y: 0}}
                end={{x: 0, y: 0}} // 105.61% on X axis ≈ x: 1.0561
                style={{
                  width: '20%',
                  height: 1,
                  marginTop: 20,
                }}></LinearGradient>
              <Text style={styles.socialMediaText}> Or Continue with </Text>
              <LinearGradient
                colors={['rgba(217, 217, 217, 0.75)', 'rgba(217, 217, 217, 0)']}
                start={{x: 0, y: 0}}
                end={{x: 1.0561, y: 0}} // 105.61% on X axis ≈ x: 1.0561
                style={{
                  width: '20%',
                  height: 1,
                  marginTop: 20,
                }}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    selectedButton === 3 ? '#F7CE45' : 'transparent',
                  padding: 0,
                },
              ]}
              onPress={() => {
                if (selectedButton !== 3) {
                  setSelectedButton(3);
                }
                navigation.navigate('registeruser');
              }}>
              {selectedButton === 3 ? (
                <View style={{padding: 12}}>
                  <Text style={[styles.buttonText, styles.buttonActiveText]}>
                    SIGN UP WITH EMAIL
                  </Text>
                </View>
              ) : (
                <Image
                  source={{uri:emailButton}}
                  style={{width: 300, height: 50}}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
            {/* <LinearGradient
          colors={['#FFFFFF', 'rgba(255, 255, 255, 0)']}
          style={styles.gradientBorder}
          start={{x: -0.1375, y: -0.1236}}
          end={{x: 1.0828, y: 1.1258}}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  selectedButton === 3 ? '#F7CE45' : 'rgba(128, 128, 128, 0.8)',
              },
            ]}
            onPress={() => {
              setSelectedButton(3);
              navigation.navigate('registeruser');
            }}>
            <Text style={[styles.buttonText, selectedButton === 3 && styles.buttonActiveText]}>SIGN UP WITH EMAIL</Text>
          </TouchableOpacity>
        </LinearGradient> */}

            <View
              style={[
                styles.row,
                {
                  marginBottom: 30,
                  marginTop: 20,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                },
              ]}>
              <Text style={styles.termsText}>
                By Signing up, you agree to Flykup's
              </Text>
              <View style={styles.row}>
                <TouchableOpacity
                  //onPress={() => navigation.navigate('termsScreen')}
                  // onPress={() => Linking.openURL('https://flykup.live/terms-of-service')}
                  onPress={() => navigation.navigate('WebViewScreen', {
                    url: 'https://flykup.in/master-terms-of-service/',
                    title: 'Terms and Conditions'
                  })}
                  >
                  <Text style={[styles.termsText, {color: '#F7CE45'}]}>
                    Terms
                  </Text>
                </TouchableOpacity>

                <Text style={styles.termsText}>and</Text>

                <TouchableOpacity
                  //onPress={() => navigation.navigate('privacyPolicy')}
                  //onPress={() => Linking.openURL('https://flykup.live/privacy-policy')}
                  onPress={() => navigation.navigate('WebViewScreen', {
                    url:'https://flykup.in/privacy-policy-2/',
                    title: 'Privacy Policy'
                  })}
                  >
                  <Text style={[styles.termsText, {color: '#F7CE45'}]}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/*<View style={[styles.row, {marginBottom: 40, marginTop: 40}]}>
<Text style={styles.termsText}>
            By Signing up, you agree to Flykup's {`\n`} 
      <TouchableOpacity onPress={()=>navigation.navigate('termsScreen')}>
            <Text style={{color: '#F7CE45'}}>Terms and</Text></TouchableOpacity>
            
      <TouchableOpacity onPress={()=>navigation.navigate('privacyPolicy')}>
            <Text style={{color: '#F7CE45'}}> Privacy Policy</Text>           
          </TouchableOpacity>
          </Text>
</View> */}

            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('Login');
                }}>
                <Text style={styles.termsText}>
                  Already have an account ?{' '}
                  <Text style={{color: '#F7CE45'}}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* </LinearGradient> */}
        </ScrollView>
      </SafeAreaView>
    </>
    // </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    // padding: 0,
    // flexGrow: 1,
  },
  //   container: {
  //     flex: 1,
  //     backgroundColor: '#fff',
  //     alignItems: 'center',
  //     padding: 20,
  //   },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logo: {
    width: 58,
    height: 25,
    // marginTop: 19,
    marginBottom: 20,
    marginLeft: 25,

    marginTop: 10, //newly added
    alignSelf: 'flex-start',
  },
  headerImage: {
    width: '100%',
    height: 217,
    backgroundColor: '#121212',
    // marginBottom: 20,

    alignSelf: 'center',
  },
  title: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'center',
    fontFamily: 'Poppins-Regular',
  },
  subtitle: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 25,
    fontFamily: 'Poppins-Regular',
    marginTop: 16,
    alignSelf: 'center',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#ccc',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C4C4C4',
    borderRadius: 10,
  },
  gradientBorder: {
    width: '80%',
    //  padding: 1.5, // Thin border like 0.3px visually
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 10,

    //  backgroundColor: 'rgba(128, 128, 128, 0.8)',
  },
  button: {
    borderRadius: 10,
    padding: 12,
    //backgroundColor: '#FFFFFF66',
    backgroundColor: 'rgba(128, 128, 128, 0.8)',
    alignItems: 'center',

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    width: 300,

    marginTop: 10,

    // Shadow for Android
    // elevation: 2,
  },
  buttonActiveText: {
    color: '#000',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    // letterSpacing:2,
    fontSize: 12,
  },
  termsText: {
    fontSize: 14,
    color: '#eee',
    textAlign: 'center',
    fontWeight: '400',
  },
  linkText: {
    color: '#F3BB00',
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginTop: 0,
    gap: 5,
    // marginBottom: 25,
    maxWidth: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    marginHorizontal: 20,
  },
  socialMediaText: {
    fontSize: 14,
    color: '#C4C4C4',
    marginVertical: 10,
    alignSelf: 'center',
  },
  buttonPressed: {
    backgroundColor: '#F7CE45', // Yellow when pressed
  },
});
