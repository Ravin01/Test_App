import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState, useMemo} from 'react';
import {
import AntDesign from 'react-native-vector-icons/AntDesign';
import api from '../../../Utils/Api';
import {useFocusEffect} from '@react-navigation/native';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import Feather from 'react-native-vector-icons/Feather';
import Fontisto from 'react-native-vector-icons/Fontisto';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import * as Animatable from 'react-native-animatable';
import {TextInput} from 'react-native-paper';
import moment from 'moment';
import {FAB} from 'react-native-paper';
import Header from '../../Reuse/Header';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import {
import LinearGradient from 'react-native-linear-gradient';
import UpdateStockModal from './UpdateStockModal';
import {SafeAreaView} from 'react-native-safe-area-context';
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

export default function ResponsiveProducts() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  return (
    <View style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
      <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
        Products
      </ResponsiveText>
      <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
        This screen has been recreated with responsive design.
        Please implement the original functionality using responsive components.
      </ResponsiveText>
    </View>
  );
}