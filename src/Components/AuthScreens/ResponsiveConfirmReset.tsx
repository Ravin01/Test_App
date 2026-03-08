import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveConfirmReset({ route }) {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { email } = route.params || {};

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
    codeInput: {
      marginVertical: theme.spacing.xl,
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

  const handleConfirmReset = async () => {
    if (!code) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/confirm-reset', {
        email,
        code,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Code verified successfully');
        navigation.navigate('ResponsiveConfirmPassword', { 
          email, 
          resetToken: response.data.resetToken 
        });
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert('Success', 'Reset code sent again');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code');
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
          Confirm Reset
        </ResponsiveText>
        
        <ResponsiveText 
          variant="body" 
          style={{ 
            color: theme.colors.textSecondary, 
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl 
          }}
        >
          Enter the reset code sent to {email}
        </ResponsiveText>

        <View style={styles.codeInput}>
          <ResponsiveInput
            placeholder="Enter reset code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            {...getAccessibilityProps('Reset code input', 'Enter the 6-digit reset code')}
          />
        </View>

        <View style={styles.buttonContainer}>
          <ResponsiveButton
            variant="primary"
            onPress={handleConfirmReset}
            disabled={loading}
            {...getAccessibilityProps('Confirm reset button', 'Verify the reset code')}
          >
            {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : 'Confirm Reset'}
          </ResponsiveButton>
        </View>

        <View style={styles.resendContainer}>
          <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary }}>
            Didn't receive the code?
          </ResponsiveText>
          <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
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