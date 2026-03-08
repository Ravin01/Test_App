import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveDeliveryScreen({ route }) {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const { orderData } = route.params || {};

  const styles = createStyles((theme, accessibility) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    deliveryIcon: {
      alignSelf: 'center',
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.full,
    },
    buttonContainer: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
  }));

  const handleConfirmDelivery = async () => {
    if (!deliveryAddress || !contactNumber) {
      Alert.alert('Error', 'Please fill in delivery address and contact number');
      return;
    }

    try {
      // Implement delivery confirmation logic
      Alert.alert('Success', 'Delivery details confirmed');
      navigation.navigate('OrderConfirmation', { 
        ...orderData,
        deliveryAddress,
        deliveryInstructions,
        contactNumber 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm delivery details');
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.deliveryIcon}>
          <MaterialIcon name="local-shipping" size={48} color={theme.colors.primary} />
        </View>

        <ResponsiveText 
          variant="title" 
          style={{ 
            color: theme.colors.textPrimary, 
            textAlign: 'center',
            marginBottom: theme.spacing.sm 
          }}
        >
          Delivery Details
        </ResponsiveText>
        
        <ResponsiveText 
          variant="body" 
          style={{ 
            color: theme.colors.textSecondary, 
            textAlign: 'center',
            marginBottom: theme.spacing.xl 
          }}
        >
          Please provide your delivery information
        </ResponsiveText>

        <View style={styles.section}>
          <ResponsiveText 
            variant="subtitle" 
            style={{ color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }}
          >
            Delivery Address *
          </ResponsiveText>
          <ResponsiveInput
            placeholder="Enter full delivery address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            {...getAccessibilityProps('Delivery address input', 'Enter your complete delivery address')}
          />
        </View>

        <View style={styles.section}>
          <ResponsiveText 
            variant="subtitle" 
            style={{ color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }}
          >
            Contact Number *
          </ResponsiveText>
          <ResponsiveInput
            placeholder="Enter contact number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            {...getAccessibilityProps('Contact number input', 'Enter your contact number')}
          />
        </View>

        <View style={styles.section}>
          <ResponsiveText 
            variant="subtitle" 
            style={{ color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }}
          >
            Special Instructions (Optional)
          </ResponsiveText>
          <ResponsiveInput
            placeholder="Any special delivery instructions..."
            value={deliveryInstructions}
            onChangeText={setDeliveryInstructions}
            multiline={true}
            numberOfLines={2}
            textAlignVertical="top"
            {...getAccessibilityProps('Delivery instructions input', 'Enter any special delivery instructions')}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <ResponsiveButton
          variant="primary"
          onPress={handleConfirmDelivery}
          {...getAccessibilityProps('Confirm delivery button', 'Confirm your delivery details')}
        >
          Confirm Delivery Details
        </ResponsiveButton>
      </View>
    </SafeAreaView>
  );
}