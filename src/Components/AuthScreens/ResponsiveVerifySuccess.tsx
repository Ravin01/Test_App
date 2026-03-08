import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveVerifySuccess() {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();

  const styles = createStyles((theme, accessibility) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.lg,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    successIcon: {
      marginBottom: theme.spacing.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.successLight,
      borderRadius: theme.borderRadius.full,
    },
    buttonContainer: {
      paddingVertical: theme.spacing.xl,
      width: '100%',
    },
  }));

  const handleContinue = () => {
    navigation.navigate('ResponsiveLogin');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <MaterialIcon name="check-circle" size={64} color={theme.colors.success} />
        </View>

        <ResponsiveText 
          variant="title" 
          style={{ 
            color: theme.colors.textPrimary,
            textAlign: 'center',
            marginBottom: theme.spacing.md 
          }}
        >
          Verification Successful!
        </ResponsiveText>
        
        <ResponsiveText 
          variant="body" 
          style={{ 
            color: theme.colors.textSecondary,
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
            lineHeight: 24
          }}
        >
          Your account has been successfully verified. You can now access all features of the app.
        </ResponsiveText>

        <View style={styles.buttonContainer}>
          <ResponsiveButton
            variant="primary"
            onPress={handleContinue}
            {...getAccessibilityProps('Continue button', 'Continue to login screen')}
          >
            Continue to Login
          </ResponsiveButton>
        </View>
      </View>
    </SafeAreaView>
  );
}