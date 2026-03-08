import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Keyboard, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import api from '../../Utils/Api';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveConfirmPassword() {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    passwordInputs: {
      marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
      paddingVertical: theme.spacing.xl,
    },
  }));

  const handleConfirmPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Implement password confirmation logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', 'Password confirmation failed');
    } finally {
      setLoading(false);
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
          Confirm Password
        </ResponsiveText>
        
        <ResponsiveText 
          variant="body" 
          style={{ 
            color: theme.colors.textSecondary, 
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xl 
          }}
        >
          Please enter your new password and confirm it
        </ResponsiveText>

        <View style={styles.passwordInputs}>
          <View style={styles.inputContainer}>
            <ResponsiveInput
              placeholder="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcon 
                    name={showPassword ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              }
              autoCapitalize="none"
              {...getAccessibilityProps('New password input', 'Enter your new password')}
            />
          </View>

          <View style={styles.inputContainer}>
            <ResponsiveInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialIcon 
                    name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                    size={24} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              }
              autoCapitalize="none"
              {...getAccessibilityProps('Confirm password input', 'Confirm your new password')}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <ResponsiveButton
            variant="primary"
            onPress={handleConfirmPassword}
            disabled={loading}
            {...getAccessibilityProps('Confirm password button', 'Confirm your new password')}
          >
            {loading ? <ActivityIndicator color={theme.colors.onPrimary} /> : 'Confirm Password'}
          </ResponsiveButton>
        </View>
      </View>
    </SafeAreaView>
  );
}