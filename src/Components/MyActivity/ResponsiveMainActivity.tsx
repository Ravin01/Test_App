import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../../Utils/Colors';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import RatingModal from './RatingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WishListTab from './Saved/WishListTab';
import ShoppableVideoTab from './Saved/ShoppableVideoTab';
import Participated from './Auction/Participated';
import Prebid from './Auction/Prebid';
import WonProducts from './Auction/WonProducts';
import AuctionModal from './Auction/AuctionModal';
import axiosInstance from '../../Utils/Api';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AWS_CDN_URL} from '../../Utils/aws';
import {
import ReviewSection from '../SellerProfile/ReviewSection';
import ViewReview from './Utils/ViewReviews';
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

export default function ResponsiveMainActivity() {
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();

  return (
    <View style={[responsiveStyles.container, { backgroundColor: theme.colors.background }]}>
      <ResponsiveText variant="title" style={{ color: theme.colors.textPrimary }}>
        MainActivity
      </ResponsiveText>
      <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.md }}>
        This screen has been recreated with responsive design.
        Please implement the original functionality using responsive components.
      </ResponsiveText>
    </View>
  );
}