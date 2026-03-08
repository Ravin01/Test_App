/* eslint-disable quotes */
import React, { useState, useContext } from 'react';
import {
  View,
  Image,
  ToastAndroid,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';

import { AuthContext } from '../../Context/AuthContext';
import api from '../../Utils/Api';
import onGoogleButtonPress from './GoogleSigin';

// Responsive Components
import { ResponsiveAuthWrapper } from '../ResponsiveComponents/ResponsiveAuthWrapper';
// import { 
//   ResponsiveText, 
//   ResponsiveButton, 
//   ResponsiveInput, 
//   ResponsiveSpacer 
// } from '../ResponsiveComponents/ResponsiveComponents';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
  
  import { colors } from '../../Utils/Colors';
import { ResponsiveText, ResponsiveButton, ResponsiveInput,ResponsiveSpacer  } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveLogin({navigation}) {
  const { setuser, getFcmTokenAndRequestPermission, reinitialize }: any = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const Navigation = useNavigation();

  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();

  const styles = createStyles((theme, accessibility) => ({
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
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    logoContainer: {
      alignItems: 'flex-start',
      marginBottom: theme.spacing.lg,
    },
    logo: {
      width: theme.isTablet ? 80 : 58,
      height: theme.isTablet ? 35 : 25,
      marginTop: theme.spacing.sm,
    },
    heroImageContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    heroImage: {
      width: '100%',
      height: theme.isTablet ? 300 : 217,
      maxWidth: theme.isTablet ? 400 : 300,
    },
    formContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      fontWeight: accessibility.isBoldTextEnabled ? 'bold' : '700',
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: theme.spacing.md,
      top: (theme.sizes.inputHeight - theme.sizes.iconSizeMedium) / 2,
      zIndex: 1,
      minWidth: 44, // Accessibility minimum touch target
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    forgotPasswordContainer: {
      alignItems: 'flex-end',
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    forgotPasswordText: {
      color: theme.colors.primary,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.divider,
      opacity: 0.5,
    },
    dividerText: {
      marginHorizontal: theme.spacing.md,
      color: theme.colors.textSecondary,
    },
    socialButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    socialButton: {
      borderRadius: theme.sizes.borderRadius * 1.5,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      minWidth: 56,
      minHeight: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
    socialIcon: {
      width: theme.sizes.iconSizeMedium,
      height: theme.sizes.iconSizeMedium,
    },
    signUpContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    signUpText: {
      color: theme.colors.textSecondary,
    },
    signUpLink: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  }));

  const onFacebookButtonPress = async () => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) throw new Error('User cancelled the login process');

      const data = await AccessToken.getCurrentAccessToken();
      if (!data?.accessToken) throw new Error('Failed to get access token');

      const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
      const userCredential = await auth().signInWithCredential(facebookCredential);
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

      if (apiAccessToken) await AsyncStorage.setItem('accessToken', apiAccessToken);
      if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
      if (response.data?.data?.userName) await AsyncStorage.setItem('userName', response.data.data.userName);
      if (response.data?.data?._id) await AsyncStorage.setItem('userId', response.data.data._id);
      if (response.data?.data?.sellerInfo?._id) {
        await AsyncStorage.setItem('sellerId', response.data.data.sellerInfo._id);
      }

      ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
      await reinitialize(); // Trigger context re-initialization (await to ensure data is loaded)
      Navigation.navigate('bottomtabbar');
      await getFcmTokenAndRequestPermission();
    } catch (error) {
      ToastAndroid.show(`Facebook Login Error: ${error?.message || 'Unknown error'}`, ToastAndroid.LONG);
    }
  };

 async function handleGoogleButton() {
  try {
    setLoading(true);
    await onGoogleButtonPress({ setuser, navigation, getFcmTokenAndRequestPermission, reinitialize });
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

  const validateEmail = (email: string) => {
    const regex = /\S+@\S+\.\S+/;
    if (!email) setEmailError('Please enter an email address');
    else if (!regex.test(email)) setEmailError('Please enter a valid email address');
    else setEmailError('');
  };

  const validatePassword = (password: string) => {
    if (!password) setPasswordError('Password is required');
    else if (password.length < 6) setPasswordError('Password must be at least 6 characters');
    else setPasswordError('');
  };

  const handleLogin = async () => {
    validateEmail(email);
    validatePassword(password);
    if ((passwordError && emailError) || !email || !password) return;

    setLoading(true);
    try {
      const response = await api.post(`/auth/login`, { emailId: email, password });

      const data = response.data;

      if (data.action === 'verifyOtp') {
        Navigation.navigate('VerifyOtp', { email });
        return;
      }

      if (data.action === 'login') {
        if (data.accessToken) await AsyncStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);

        setuser(response.data.data);
        await AsyncStorage.setItem('userName', response.data.data.userName);
        await AsyncStorage.setItem('userId', response.data.data._id);
        if (response.data.data.sellerInfo) {
          await AsyncStorage.setItem('sellerId', response.data.data.sellerInfo._id);
        }

        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
        await reinitialize(); // Trigger context re-initialization (await to ensure data is loaded)
        Navigation.navigate('bottomtabbar');
        await getFcmTokenAndRequestPermission();
      }
    } catch (error) {
      ToastAndroid.show('Invalid password or Email ID', ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveAuthWrapper backgroundColor={theme.colors.background}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={'small'} color={colors.primaryButtonColor} />
        </View>
      )}
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/Logo-Auth.png')} 
            style={styles.logo}
            resizeMode="contain"
            {...getAccessibilityProps('Flykup Logo', 'Company logo')}
          />
        </View>

        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <Image 
            source={require('../../assets/images/amico.png')} 
            style={styles.heroImage}
            resizeMode="contain"
            {...getAccessibilityProps('Login illustration', 'Decorative login screen illustration')}
          />
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Title */}
          <ResponsiveText variant="title" style={styles.title}>
            LOGIN
          </ResponsiveText>

          {/* Email Input */}
          <ResponsiveInput
            label="Email Address"
            placeholder="Enter your Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              validateEmail(text);
            }}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            {...getAccessibilityProps('Email input field', 'Enter your email address to login')}
          />

          <ResponsiveSpacer size="small" />

          {/* Password Input */}
          <View style={styles.passwordContainer}>
            <ResponsiveInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                validatePassword(text);
              }}
              error={passwordError}
              secureTextEntry={!isPasswordVisible}
              autoComplete="password"
              textContentType="password"
              {...getAccessibilityProps('Password input field', 'Enter your password to login')}
            />
            <TouchableOpacity 
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.passwordToggle}
              {...getAccessibilityProps(
                isPasswordVisible ? 'Hide password' : 'Show password',
                `Tap to ${isPasswordVisible ? 'hide' : 'show'} password`,
                'button'
              )}
            >
              <Feather 
                name={isPasswordVisible ? 'eye' : 'eye-off'} 
                size={theme.sizes.iconSizeMedium} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity 
            onPress={() => Navigation.navigate('resetpassword' as never)}
            style={styles.forgotPasswordContainer}
            {...getAccessibilityProps('Forgot password link', 'Navigate to password reset screen', 'button')}
          >
            <ResponsiveText variant="caption" style={styles.forgotPasswordText}>
              Forgot password?
            </ResponsiveText>
          </TouchableOpacity>

          {/* Login Button */}
          <ResponsiveButton
            title="LOGIN"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            variant="primary"
            size="large"
            {...getAccessibilityProps('Login button', 'Tap to log in with your credentials')}
          />

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <ResponsiveText variant="caption" style={styles.dividerText}>
              Or login with
            </ResponsiveText>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity 
              onPress={handleGoogleButton}
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              {...getAccessibilityProps('Google login button', 'Login with Google account', 'button')}
            >
              <Image 
                source={require('../../assets/images/google.png')} 
                style={styles.socialIcon}
                {...getAccessibilityProps('Google logo', '', 'image')}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onFacebookButtonPress}
              style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
              {...getAccessibilityProps('Facebook login button', 'Login with Facebook account', 'button')}
            >
              <Image 
                source={require('../../assets/images/facebook.png')} 
                style={styles.socialIcon}
                {...getAccessibilityProps('Facebook logo', '', 'image')}
              />
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity 
            style={styles.signUpContainer}
            onPress={() => Navigation.navigate('registeruser')}
            {...getAccessibilityProps('Sign up link', 'Navigate to registration screen', 'button')}
          >
            <ResponsiveText variant="body" style={styles.signUpText}>
              Don't have an account?{' '}
              <ResponsiveText variant="body" style={styles.signUpLink}>
                Sign Up
              </ResponsiveText>
            </ResponsiveText>
          </TouchableOpacity>
        </View>
      </View>
    </ResponsiveAuthWrapper>
  );
}
