import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image , FlatList, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../../Utils/Api';
import { formatDateForDisplay, formatTimeForDisplay } from '../../../Utils/dateUtils';
import SellerHeader from '../SellerForm/Header';
import { AWS_CDN_URL } from '../../../../Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

export default function ResponsiveRegistrationsScreen() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  return (
    <View style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
      <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
        RegistrationsScreen
      </ResponsiveText>
      <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
        This screen has been recreated with responsive design.
        Please implement the original functionality using responsive components.
      </ResponsiveText>
    </View>
  );
}