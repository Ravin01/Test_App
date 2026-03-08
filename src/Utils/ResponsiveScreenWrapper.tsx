import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ResponsiveAuthWrapper } from '../Components/ResponsiveComponents/ResponsiveAuthWrapper';
import { useTheme } from '../Theme/ResponsiveTheme';

// High-order component to make any screen responsive
export const makeResponsive = <T extends object>(
  WrappedComponent: React.ComponentType<T>,
  options?: {
    isAuthScreen?: boolean;
    backgroundColor?: string;
    paddingHorizontal?: boolean;
    paddingVertical?: boolean;
  }
) => {
  const ResponsiveWrappedComponent = (props: T) => {
    const { theme } = useTheme();
    
    const defaultOptions = {
      isAuthScreen: false,
      backgroundColor: theme.colors.background,
      paddingHorizontal: true,
      paddingVertical: true,
      ...options,
    };

    if (defaultOptions.isAuthScreen) {
      return (
        <ResponsiveAuthWrapper backgroundColor={defaultOptions.backgroundColor}>
          <WrappedComponent {...props} />
        </ResponsiveAuthWrapper>
      );
    }

    return (
      <View 
        style={[
          styles.container,
          { backgroundColor: defaultOptions.backgroundColor },
          defaultOptions.paddingHorizontal && { paddingHorizontal: theme.spacing.md },
          defaultOptions.paddingVertical && { paddingTop: theme.spacing.sm },
        ]}
      >
        <WrappedComponent {...props} />
      </View>
    );
  };

  ResponsiveWrappedComponent.displayName = `Responsive(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ResponsiveWrappedComponent;
};

// Create responsive style hook that can be used in existing components
export const useResponsiveScreen = () => {
  const { theme } = useTheme();

  const getResponsiveStyles = () => ({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.md,
    } as ViewStyle,
    
    // Text styles with responsive sizing
    title: {
      fontSize: theme.typography.huge,
      fontWeight: '700' as const,
      color: theme.colors.textPrimary,
      textAlign: 'center' as const,
      marginBottom: theme.spacing.lg,
    } as ViewStyle,
    
    subtitle: {
      fontSize: theme.typography.xlarge,
      fontWeight: '600' as const,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    
    body: {
      fontSize: theme.typography.medium,
      color: theme.colors.textPrimary,
      lineHeight: theme.typography.medium * 1.5,
    } as ViewStyle,
    
    caption: {
      fontSize: theme.typography.small,
      color: theme.colors.textSecondary,
    } as ViewStyle,

    // Button styles
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.sizes.borderRadius,
      height: theme.sizes.buttonHeight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginVertical: theme.spacing.sm,
    } as ViewStyle,

    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: theme.sizes.borderRadius,
      height: theme.sizes.buttonHeight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginVertical: theme.spacing.sm,
    } as ViewStyle,

    buttonText: {
      fontSize: theme.typography.medium,
      fontWeight: '600' as const,
      color: theme.colors.onPrimary,
    } as ViewStyle,

    secondaryButtonText: {
      fontSize: theme.typography.medium,
      fontWeight: '600' as const,
      color: theme.colors.primary,
    } as ViewStyle,

    // Input styles
    inputContainer: {
      marginBottom: theme.spacing.md,
    } as ViewStyle,

    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.sizes.borderRadius,
      height: theme.sizes.inputHeight,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.medium,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
    } as ViewStyle,

    inputLabel: {
      fontSize: theme.typography.small,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      fontWeight: '500' as const,
    } as ViewStyle,

    inputError: {
      borderColor: theme.colors.error,
    } as ViewStyle,

    errorText: {
      fontSize: theme.typography.tiny,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    } as ViewStyle,

    // Card styles
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.sizes.borderRadius,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.isDark ? {} : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    } as ViewStyle,

    // Layout styles
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    } as ViewStyle,

    spaceBetween: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    } as ViewStyle,

    center: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    } as ViewStyle,

    // Spacing
    marginTop: (size: keyof typeof theme.spacing = 'md') => ({
      marginTop: theme.spacing[size],
    }),

    marginBottom: (size: keyof typeof theme.spacing = 'md') => ({
      marginBottom: theme.spacing[size],
    }),

    padding: (size: keyof typeof theme.spacing = 'md') => ({
      padding: theme.spacing[size],
    }),

    // Grid styles
    gridContainer: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
    } as ViewStyle,

    gridItem: (columns: number = theme.gridColumns) => ({
      width: `${(100 / columns) - 2}%`,
      marginBottom: theme.spacing.sm,
    }),

    // Navigation styles
    tabBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      height: theme.sizes.buttonHeight + theme.spacing.md,
    } as ViewStyle,

    tabButton: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingVertical: theme.spacing.sm,
    } as ViewStyle,

    // Responsive dimensions
    dimensions: {
      screenWidth: theme.isTablet ? Math.min(600, 400) : '100%',
      containerMaxWidth: theme.isTablet ? 600 : '100%',
      imageSize: theme.isTablet ? 200 : 150,
      iconSize: {
        small: theme.sizes.iconSizeSmall,
        medium: theme.sizes.iconSizeMedium,
        large: theme.sizes.iconSizeLarge,
      },
    },
  });

  return { styles: getResponsiveStyles(), theme };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});