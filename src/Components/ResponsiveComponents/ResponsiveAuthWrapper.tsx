import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responsive, useOrientation, useResponsiveStyles } from '../../Utils/ResponsiveUtils';

interface ResponsiveAuthWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  showLogo?: boolean;
  scrollable?: boolean;
}

export const ResponsiveAuthWrapper: React.FC<ResponsiveAuthWrapperProps> = ({
  children,
  backgroundColor = '#FFFFFF',
  showLogo = true,
  scrollable = true,
}) => {
  const orientation = useOrientation();
  const responsiveStyles = useResponsiveStyles();
  const isLandscape = orientation === 'landscape';
  const isTablet = responsive.isTablet();

  const containerStyle = [
    styles.container,
    { backgroundColor },
    isLandscape && styles.landscapeContainer,
    isTablet && styles.tabletContainer,
  ];

  const contentContainerStyle = [
    styles.contentContainer,
    {
      paddingHorizontal: responsiveStyles.paddingLarge,
      paddingVertical: responsiveStyles.paddingMedium,
    },
    isLandscape && styles.landscapeContent,
    isTablet && styles.tabletContent,
  ];

  const content = (
    <View style={contentContainerStyle}>
      {children}
    </View>
  );

  if (!scrollable) {
    return (
      <SafeAreaView style={containerStyle}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  landscapeContainer: {
    // Adjust for landscape orientation
  },
  landscapeContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletContainer: {
    // Tablet-specific styles
  },
  tabletContent: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
});