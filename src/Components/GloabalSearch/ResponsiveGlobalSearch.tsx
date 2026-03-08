import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
import VideoResults from './VideoResult';
import ProductResults from './ProductsResult';
import UserResults from './UserResult';
import ShowResults from './ShowResult';
import {LoadingGrid, SkeletonLoader} from './SkeletonLoaders';
import {Tv, Video, ShoppingBag, Users} from 'lucide-react-native';
import axiosInstance from '../../Utils/Api';
import {ActivityIndicator} from 'react-native-paper';
import SearchComponent from './SearchComponent';
import {SEARCH_ENDPOINTS} from '../../../Config';
import Icon from 'react-native-vector-icons/Feather';
import Header from '../Reuse/Header';
import { colors } from '../../Utils/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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

export default function ResponsiveGlobalSearch() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  return (
    <View style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
      <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
        GlobalSearch
      </ResponsiveText>
      <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
        This screen has been recreated with responsive design.
        Please implement the original functionality using responsive components.
      </ResponsiveText>
    </View>
  );
}