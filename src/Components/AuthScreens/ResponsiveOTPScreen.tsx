import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton } from '../ResponsiveComponents/ResponsiveComponents';
import api from '../../Utils/Api';

export default function ResponsiveOTPScreen({ route }) {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();
  
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  
  const { phoneNumber, email } = route.params || {};

  const styles = createStyles((theme, accessibility) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.lg,
    },
    header: {
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    content: {
      flex: 1,
      paddingTop: theme.spacing.xl,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    otpInput: {
      width: 45,
      height: 55,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      textAlign: 'center',
      fontSize: theme.typography.sizes.lg,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    },
    otpInputActive: {
      borderColor: theme.colors.primary,
    },
    buttonContainer: {
      paddingVertical: theme.spacing.xl,
    },
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    resendButton: {
      marginLeft: theme.spacing.sm,
    },
  }));

  const handleOtpChange = (text, index) => {
    const newOtpCode = [...otpCode];
    newOtpCode[index] = text;
    setOtpCode(newOtpCode);

    // Auto focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index) => {
    if (index > 0 && !otpCode[index]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpCode.join('');
    
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter complete OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        phoneNumber: phoneNumber || email,
        otp,
      });

      if (response.data.success) {
        Alert.alert('Success', 'OTP verified successfully');
        navigation.navigate('ResponsiveVerifySuccess');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await api.post('/auth/resend-otp', { phoneNumber: phoneNumber || email });
      Alert.alert('Success', 'OTP sent again');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          {...getAccessibilityProps('Go back', 'Navigate to previous screen')}
        >
          <AntDesign name="arrowleft" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
          Enter OTP
        </ResponsiveText>
        
        <ResponsiveText 
          variant="body" 
          style={{ 
            color: theme.colors.textSecondary, 
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl 
          }}
        >
          We've sent a 6-digit OTP to {phoneNumber || email}
        </ResponsiveText>

        <View style={styles.otpContainer}>
          {otpCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit ? styles.otpInputActive : null
              ]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace') {
                  handleBackspace(index);
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              {...getAccessibilityProps(`OTP digit ${index + 1}`, `Enter digit ${index + 1} of OTP`)}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <ResponsiveButton
            variant="primary"
            onPress={handleVerifyOTP}
            disabled={loading}
            {...getAccessibilityProps('Verify OTP button', 'Verify the entered OTP')}
          >
            {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : 'Verify OTP'}
          </ResponsiveButton>
        </View>

        <View style={styles.resendContainer}>
          <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary }}>
            Didn't receive OTP?
          </ResponsiveText>
          <TouchableOpacity style={styles.resendButton} onPress={handleResendOTP}>
            <ResponsiveText 
              variant="body" 
              style={{ 
                color: theme.colors.primary,
                textDecorationLine: 'underline' 
              }}
            >
              Resend
            </ResponsiveText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}