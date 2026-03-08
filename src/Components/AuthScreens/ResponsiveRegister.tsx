/* eslint-disable quotes */
import React, {useState} from 'react';
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
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';

// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';
import { flykupLogo } from '../../assets/assets';

export default function ResponsiveRegister() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone ,setPhone] =useState('');
  const [phoneError ,setPhoneError] =useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const Navigation = useNavigation();

  const validateName = (name: string) => {
    if (!name) {
        setNameError('Name is required field');
      }  else {
        setNameError('');
        return true;
      }
  }
  const validatePhoneNumber = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
  
    if (!digitsOnly) {
      setPhoneError('Please enter a phone number');
    } else if (digitsOnly.length !== 10) {
      setPhoneError('Phone number must be 10 digits');
    } else {
      setPhoneError('');
      return true;
    }
  };
  
  // Email validation function
  const validateEmail = email => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      setEmailError('Please enter a  email address');
    } else if (!regex.test(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
      return true;
    }
  }

  // Password validation function
  const validatePassword = password => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{6,}$/; // At least 1 lowercase, 1 uppercase, and 1 special character
    if (!password) {
      setPasswordError('Password is required field');
    } else if (!regex.test(password)) {
      setPasswordError('Password must contain at least one uppercase, one lowercase, and one special character');
    } else {
      setPasswordError('');
      return true;
    }
  };
 
  const validateForm = async () => {
  const isNameValid = validateName(name);
  const isPhoneValid = validatePhoneNumber(phone);
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);

  return (isNameValid && isPhoneValid && isEmailValid && isPasswordValid);
  }

    // Handle Submit Process
    const handleSubmit = async () => {
      const isFormValid = await validateForm();
      
      if (!isFormValid) {
        ToastAndroid.show("Please fill in all the fields correctly.", ToastAndroid.SHORT);
        return;
      }
      setLoading(true);
      try {
        const response = await api.post('/auth/signup', {
          name: name,
          emailId: email,
          password: password,
          mobileNumber: phone
        });
        Navigation.navigate('VerifyOtp', { email });
        
              ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
      } catch (error) {
        const message = error.response?.data?.message || 'Something went wrong. Please try again.';
        ToastAndroid.show(message, ToastAndroid.SHORT);
        console.log("Error creating user", error);
      } finally {
        setLoading(false);
      }
    };

  return (
    <SafeAreaView style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: theme.spacing.lg}}>

  <View style={{
    width: '100%', 
    height: theme.sizes.buttonHeight + theme.spacing.md, 
    backgroundColor: theme.colors.primary, 
    marginBottom: theme.spacing.xl,
    alignItems: 'center', 
    justifyContent: 'center'
  }}>
    <ResponsiveText variant="headline" style={{color: theme.colors.onPrimary, fontWeight: '500'}}>
      Sign Up
    </ResponsiveText>
  </View>

   <Image
        source={{uri:flykupLogo}} 
        style={{
          width: theme.isTablet ? 320 : 277,
          height: theme.isTablet ? 140 : 119,
          backgroundColor: theme.colors.background,
          alignSelf: 'center',
        }}
        resizeMode='cover'
      />
    
     
    <View style={{marginHorizontal: theme.spacing.lg}}>
      <ResponsiveText variant="title" style={[responsiveStyles.title, {color: theme.colors.textPrimary}]}>
        SIGN UP
      </ResponsiveText>

        <ResponsiveInput
          placeholder="Full Name"
          value={name}
          onChangeText={text => {
            setName(text);
            validateName(text);
          }}
          error={nameError}
          {...getAccessibilityProps('Full name input', 'Enter your full name')}
        />

        <ResponsiveInput
          placeholder="Mobile Number"
          value={phone}
          onChangeText={text => {
            setPhone(text);
            validatePhoneNumber(text);
          }}
          error={phoneError}
          keyboardType="phone-pad"
          {...getAccessibilityProps('Phone number input', 'Enter your mobile number')}
        />

      <ResponsiveInput
        placeholder="Enter email"
        value={email}
        onChangeText={text => {
          setEmail(text);
          validateEmail(text);
        }}
        error={emailError}
        keyboardType="email-address"
        {...getAccessibilityProps('Email input', 'Enter your email address')}
      />

      <View style={{ position: 'relative' }}>
        <ResponsiveInput
          placeholder="Enter strong password"
          value={password}
          onChangeText={text => {
            setPassword(text);
            validatePassword(text);
          }}
          error={passwordError}
          secureTextEntry={!isPasswordVisible}
          {...getAccessibilityProps('Password input', 'Enter a strong password')}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={{
            position: 'absolute',
            right: theme.spacing.md,
            top: (theme.sizes.inputHeight - theme.sizes.iconSizeMedium) / 2,
            minWidth: 44,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          {...getAccessibilityProps('Toggle password visibility', 'Tap to show or hide password', 'button')}
        >
          <AntDesign 
            name={isPasswordVisible ? 'eye' : 'eyeo'} 
            size={theme.sizes.iconSizeMedium} 
            color={theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      <ResponsiveButton
        title="NEXT"
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.xl }}
        {...getAccessibilityProps('Next button', 'Proceed with registration')}
      />

      <TouchableOpacity 
        style={{alignSelf: 'center', marginTop: theme.spacing.md}} 
        onPress={() => Navigation.navigate('Login')}
        {...getAccessibilityProps('Sign in link', 'Go to login screen', 'button')}
      >
        <ResponsiveText variant="body" style={{color: theme.colors.textSecondary}}>
          Already have an Account?{' '}
          <ResponsiveText variant="body" style={{color: theme.colors.primary, fontWeight: '500'}}>
            Sign In
          </ResponsiveText>
        </ResponsiveText>
      </TouchableOpacity>
      </View>
    
    </ScrollView>
    
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}