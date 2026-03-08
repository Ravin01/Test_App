/* eslint-disable quotes */
import React, {useState, useContext, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import Feather from 'react-native-vector-icons/Feather';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import {AuthContext} from '../../Context/AuthContext';
import api from '../../Utils/Api';
import {SafeAreaView} from 'react-native-safe-area-context';
import onGoogleButtonPress from './GoogleSigin';
import {colors} from '../../Utils/Colors';
import { Facebook, flykupLogo, Google, welcomeIndexImg } from '../../assets/assets';

export default function Login({navigation}) {
  const {setuser, getFcmTokenAndRequestPermission, reinitialize, getPendingAction, clearPendingAction}: any =
    useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const Navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const backPressedOnce = useRef(false);

  // Back handler for double tap to exit
  useEffect(() => {
    const backAction = () => {

      // If we can go back, let navigation handle it
      if (navigation.canGoBack()) {
        return false; // 👈 default behavior
      }

      if (backPressedOnce.current) {
        // Second press - exit app
        BackHandler.exitApp();
        asd
        return false; //true;
      }

      // First press - show warning
      backPressedOnce.current = true;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

      // Reset after 2 seconds
      setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000);

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  const onFacebookButtonPress = async () => {
    try {
      const result = await LoginManager.logInWithPermissions([
        'public_profile',
        'email',
      ]);
      if (result.isCancelled)
        throw new Error('User cancelled the login process');

      const data = await AccessToken.getCurrentAccessToken();
      if (!data?.accessToken) throw new Error('Failed to get access token');

      const facebookCredential = auth.FacebookAuthProvider.credential(
        data.accessToken,
      );
      const userCredential = await auth().signInWithCredential(
        facebookCredential,
      );
      const userDetails = userCredential.user;

      const response = await api.post('/auth/facebook', {
        name: userDetails.displayName,
        emailId: userDetails.email,
        accessToken: data.accessToken,
      });

      const token = response.headers['set-cookie'] || [];
      if (token.length === 0) return;

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

      if (apiAccessToken)
        await AsyncStorage.setItem('accessToken', apiAccessToken);
      if (refreshToken)
        await AsyncStorage.setItem('refreshToken', refreshToken);
      if (response.data?.data?.userName)
        await AsyncStorage.setItem('userName', response.data.data.userName);
      if (response.data?.data?._id)
        await AsyncStorage.setItem('userId', response.data.data._id);
      if (response.data?.data?.sellerInfo?._id) {
        await AsyncStorage.setItem(
          'sellerId',
          response.data.data.sellerInfo._id,
        );
      }

        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
        await reinitialize(); // Trigger context re-initialization (await to ensure data is loaded)
        
        const userData = response.data.data;
        // ✅ Check for pending action after successful login
        const pendingAction = await getPendingAction();
        
        // Check if profile setup is needed
        if (userData?.onboardingStatus !== 'completed') {
          // Navigate to profile setup with pending action info
          Navigation.navigate('ProfileSetupScreen', {
            pendingAction: pendingAction
          });
        } else if (pendingAction && pendingAction.screen === 'LiveScreen') {
          console.log('🔄 Navigating back to LiveScreen with params:', pendingAction.params);
          await clearPendingAction();
          Navigation.navigate('LiveScreen', pendingAction.params);
        } else {
          Navigation.navigate('bottomtabbar');
        }
        
        await getFcmTokenAndRequestPermission();
    } catch (error) {
      ToastAndroid.show(
        `Facebook Login Error: ${error?.message || 'Unknown error'}`,
        ToastAndroid.LONG,
      );
    }
  };

  async function handleGoogleButton() {
    try {
      setLoading(true);
      // setSelectedButton(1);
      await onGoogleButtonPress({
        setuser,
        navigation,
        getFcmTokenAndRequestPermission,
        reinitialize,
        getPendingAction,
        clearPendingAction,
      });
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      ToastAndroid.show(
        `Error: ${error?.message || 'Unknown error'}`,
        ToastAndroid.LONG,
      );
    } finally {
      setLoading(false);
      // setSelectedButton(null);
    }
  }
  // console.log(';this')
  const validateEmail = email => {
    const regex = /\S+@\S+\.\S+/;
    if (!email) setEmailError('Please enter a  email address');
    else if (!regex.test(email))
      setEmailError('Please enter a valid email address');
    else setEmailError('');
  };

  const validatePassword = password => {
    if (!password) setPasswordError('Password is required');
    else if (password.length < 6)
      setPasswordError('Password must be at least 6 characters');
    else setPasswordError('');
  };

  const handleLogin = async () => {
    validateEmail(email);
    validatePassword(password);
    if ((passwordError && emailError) || !email || !password) return;

    setLoading(true);
    try {
      const response = await api.post(`/auth/login`, {
        emailId: email.toLowerCase(),
        password,
      });

      const data = response.data;

      if (data.action === 'verifyOtp') {
        Navigation.navigate('VerifyOtp', {email});
        return;
      }

      if (data.action === 'login') {
        if (data.accessToken)
          await AsyncStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken)
          await AsyncStorage.setItem('refreshToken', data.refreshToken);

        setuser(response.data.data);
        await AsyncStorage.setItem('userName', response.data.data.userName);
        await AsyncStorage.setItem('userId', response.data.data._id);
        if (response.data.data.sellerInfo) {
          await AsyncStorage.setItem(
            'sellerId',
            response.data.data.sellerInfo._id,
          );
        }

        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
        await reinitialize(); // Trigger context re-initialization (await to ensure data is loaded)
        
        const userData = response.data.data;
        // ✅ Check for pending action after successful login
        const pendingAction = await getPendingAction();
        
        // Check if profile setup is needed
        if (userData?.onboardingStatus !== 'completed') {
          // Navigate to profile setup with pending action info
          Navigation.navigate('ProfileSetupScreen', {
            pendingAction: pendingAction
          });
        } else if (pendingAction && pendingAction.screen === 'LiveScreen') {
          console.log('🔄 Navigating back to LiveScreen with params:', pendingAction.params);
          await clearPendingAction();
          Navigation.navigate('LiveScreen', pendingAction.params);
        } else {
          Navigation.navigate('bottomtabbar');
        }
        
        await getFcmTokenAndRequestPermission();
      }
    } catch (error) {
      ToastAndroid.show(error.response.data.message||'Invalid password or Email Id ', ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };
  const style = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };
  console.log("this")
  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      {loading && (
        <View style={style}>
          <ActivityIndicator size={'small'} color={colors.primaryButtonColor} />
        </View>
      )}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{flexGrow: 1, paddingBottom: 0
           // 160
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}>
          {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
            <View>
          <Image
            source={{uri:flykupLogo}}
            className="w-[58px] h-[25px] mt-2.5 mb-5 ml-6"
          />
          <Image
            source={{uri:welcomeIndexImg}}
            className="w-full h-[217px] self-center"
            resizeMode="contain"
          />

          <View className="mx-5 mt-8">
            <Text className="text-white text-[28px] font-bold text-center mb-5">
              LOGIN
            </Text>

            <TextInput
              className={`w-full bg-transparent text-white p-4 mb-2 border rounded-lg ${
                emailError ? 'border-red-500' : 'border-[#ddd]'
              }`}
              placeholder="Enter your Email Address"
              placeholderTextColor="#ccc"
              value={email}
              onChangeText={text => {
                setEmail(text.toLowerCase());
                // validateEmail(text.toLowerCase());
              }}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
            {emailError && (
              <Text className="text-red-500 text-xs mb-2">{emailError}</Text>
            )}

            <View
              className={`w-full p-1 border rounded-lg ${
                passwordError ? 'border-red-500' : 'border-[#ddd]'
              }`}>
              <TextInput
                ref={passwordInputRef}
                className="ml-1 text-white bg-transparent"
                placeholder="Enter your password"
                placeholderTextColor="#ccc"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  // validatePassword(text);
                }}
                secureTextEntry={!isPasswordVisible}
                returnKeyType="done"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({animated: true});
                  }, 100);
                }}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute right-4 top-2.5">
                <Feather
                  name={isPasswordVisible ? 'eye' : 'eye-off'}
                  size={23}
                  color={'#ddd'}
                />
              </TouchableOpacity>
            </View>
            {passwordError && (
              <Text className="text-red-500 text-xs mb-2">{passwordError}</Text>
            )}

            <TouchableOpacity
              onPress={() => Navigation.navigate('resetpassword' as never)}
              className="self-end mt-2 mb-3">
              <Text className="text-[#F3BB00] text-sm">Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              className="w-full rounded-lg py-3 bg-[#F7CE45] items-center mt-5 mb-2">
              {/* {loading ? <ActivityIndicator color="white" /> : <Text className="font-semibold tracking-widest text-base">LOGIN</Text>} */}
              
              <Text className="font-semibold tracking-widest text-base">
                LOGIN
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center items-center mt-5 mb-3">
              <View className="w-[20%] h-px bg-gray-300/75" />
              <Text className="text-sm text-gray-400 mx-2">Or login with</Text>
              <View className="w-[20%] h-px bg-gray-300/75" />
            </View>

            <View className="flex-row justify-center space-x-3 mt-3 mb-5 gap-6">
              <LinearGradient
                colors={['#4A4A4A', '#2D2D2D', '#1A1A1A']}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
                className="rounded-xl border border-[#333] shadow-sm items-center justify-center overflow-hidden">
                <TouchableOpacity
                  onPress={handleGoogleButton}
                  className="flex-row items-center p-3 ">
                  <Image
                    source={{uri:Google}}
                    className="w-5 h-5"
                  />
                </TouchableOpacity>
              </LinearGradient>

              {/* <LinearGradient
                colors={['#4A4A4A', '#2D2D2D', '#1A1A1A']}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
                className="rounded-xl border border-[#333] shadow-sm items-center justify-center overflow-hidden">
                <TouchableOpacity
                  onPress={onFacebookButtonPress}
                  className="flex-row items-center px-2 pt-2">
                  <Image
                    source={{uri:Facebook}}
                    className="w-[25px] h-[25px]"
                  />
                </TouchableOpacity>
              </LinearGradient> */}
            </View>

            <TouchableOpacity
              className="self-center mt-2"
              onPress={() => Navigation.navigate('registeruser')}>
              <Text className="text-sm text-gray-300 font-medium">
                Don't Have a Account?
                <Text className="text-[#F3BB00] border-b border-black font-medium">
                  {' '}
                  Sign Up
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
          </View>
          {/* </TouchableWithoutFeedback> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
