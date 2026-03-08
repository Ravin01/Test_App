import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { responsive, useResponsiveStyles } from '../Utils/ResponsiveUtils';
import { accessibilityUtils, useAccessibility } from '../Utils/AccessibilityUtils';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryVariant: string;
  onPrimary: string;
  
  // Secondary colors
  secondary: string;
  secondaryVariant: string;
  onSecondary: string;
  
  // Background colors
  background: string;
  surface: string;
  onBackground: string;
  onSurface: string;
  
  // Error colors
  error: string;
  onError: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Status colors
  success: string;
  warning: string;
  info: string;
  
  // Card colors
  card: string;
  cardBorder: string;
  
  // Input colors
  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  placeholder: string;
  
  // Navigation colors
  bottomTabBackground: string;
  bottomTabActive: string;
  bottomTabInactive: string;
  headerBackground: string;
  headerText: string;
  
  // Overlay colors
  overlay: string;
  scrim: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeTypography {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
  xxlarge: number;
  huge: number;
}

export interface ThemeSizes {
  buttonHeight: number;
  buttonHeightSmall: number;
  buttonHeightLarge: number;
  inputHeight: number;
  iconSizeSmall: number;
  iconSizeMedium: number;
  iconSizeLarge: number;
  avatarSizeSmall: number;
  avatarSizeMedium: number;
  avatarSizeLarge: number;
  borderRadius: number;
  borderRadiusLarge: number;
  cardElevation: number;
}

export interface ResponsiveTheme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  sizes: ThemeSizes;
  isDark: boolean;
  deviceSize: string;
  isTablet: boolean;
  gridColumns: number;
}

const lightColors: ThemeColors = {
  primary: '#F7CE45',
  primaryVariant: '#F4B942',
  onPrimary: '#000000',
  secondary: '#03DAC6',
  secondaryVariant: '#018786',
  onSecondary: '#000000',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  onBackground: '#000000',
  onSurface: '#000000',
  error: '#B00020',
  onError: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#CCCCCC',
  border: '#E0E0E0',
  divider: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  card: '#FFFFFF',
  cardBorder: '#E0E0E0',
  inputBackground: '#FFFFFF',
  inputBorder: '#E0E0E0',
  inputBorderFocused: '#F7CE45',
  placeholder: '#999999',
  bottomTabBackground: '#FFFFFF',
  bottomTabActive: '#F7CE45',
  bottomTabInactive: '#fff',
  headerBackground: '#F7CE45',
  headerText: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.32)',
};

const darkColors: ThemeColors = {
  primary: '#F7CE45',
  primaryVariant: '#F4B942',
  onPrimary: '#000000',
  secondary: '#03DAC6',
  secondaryVariant: '#018786',
  onSecondary: '#000000',
  background: '#121212',
  surface: '#1E1E1E',
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  error: '#CF6679',
  onError: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  textDisabled: '#555555',
  border: '#333333',
  divider: '#333333',
  success: '#66BB6A',
  warning: '#FFA726',
  info: '#42A5F5',
  card: '#1E1E1E',
  cardBorder: '#333333',
  inputBackground: '#1E1E1E',
  inputBorder: '#333333',
  inputBorderFocused: '#F7CE45',
  placeholder: '#777777',
  bottomTabBackground: '#1E1E1E',
  bottomTabActive: '#F7CE45',
  bottomTabInactive: '#777777',
  headerBackground: '#1E1E1E',
  headerText: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.7)',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

const ThemeContext = createContext<{
  theme: ResponsiveTheme;
  toggleTheme: () => void;
  setThemeMode: (mode:  'dark' ) => void;
} | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // const systemColorScheme = useColorScheme();
  const systemColorScheme = 'dark';
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('dark');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const responsiveStyles = useResponsiveStyles();
  const accessibilityConfig = useAccessibility();

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    if (themeMode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_mode');
      if (savedTheme) {
        const mode = savedTheme as 'light' | 'dark' | 'auto';
        setThemeMode(mode);
        if (mode !== 'auto') {
          setIsDark(mode === 'dark');
        }
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (mode: 'light' | 'dark' | 'auto') => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    setIsDark(newMode === 'dark');
    saveThemePreference(newMode);
  };

  const setThemeModeHandler = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
    if (mode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(mode === 'dark');
    }
    saveThemePreference(mode);
  };

  // Apply accessibility adjustments to colors
  const getAccessibleColors = (baseColors: ThemeColors): ThemeColors => {
    if (accessibilityConfig.isHighContrastTextEnabled || accessibilityConfig.isInvertColorsEnabled) {
      return {
        ...baseColors,
        textPrimary: isDark ? '#FFFFFF' : '#000000',
        textSecondary: isDark ? '#CCCCCC' : '#333333',
        border: isDark ? '#666666' : '#999999',
        divider: isDark ? '#666666' : '#999999',
      };
    }
    return baseColors;
  };

  const theme: ResponsiveTheme = {
    colors: getAccessibleColors(isDark ? darkColors : lightColors),
    spacing: {
      xs: responsiveStyles.marginTiny,
      sm: responsiveStyles.marginSmall,
      md: responsiveStyles.marginMedium,
      lg: responsiveStyles.marginLarge,
      xl: responsiveStyles.marginXLarge,
      xxl: responsiveStyles.marginXLarge * 1.5,
    },
    typography: {
      tiny: responsiveStyles.textTiny,
      small: responsiveStyles.textSmall,
      medium: responsiveStyles.textMedium,
      large: responsiveStyles.textLarge,
      xlarge: responsiveStyles.textXLarge,
      xxlarge: responsiveStyles.textXXLarge,
      huge: responsiveStyles.textHuge,
    },
    sizes: {
      buttonHeight: responsiveStyles.buttonHeight,
      buttonHeightSmall: responsiveStyles.buttonHeightSmall,
      buttonHeightLarge: responsiveStyles.buttonHeightLarge,
      inputHeight: responsiveStyles.inputHeight,
      iconSizeSmall: responsiveStyles.iconSizeSmall,
      iconSizeMedium: responsiveStyles.iconSizeMedium,
      iconSizeLarge: responsiveStyles.iconSizeLarge,
      avatarSizeSmall: responsiveStyles.avatarSizeSmall,
      avatarSizeMedium: responsiveStyles.avatarSizeMedium,
      avatarSizeLarge: responsiveStyles.avatarSizeLarge,
      borderRadius: responsiveStyles.borderRadius,
      borderRadiusLarge: responsiveStyles.borderRadiusLarge,
      cardElevation: 4,
    },
    isDark,
    deviceSize: responsive.getDeviceSize(),
    isTablet: responsive.isTablet(),
    gridColumns: responsiveStyles.gridColumns,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode: setThemeModeHandler }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook for creating responsive styles with theme
export const useThemedStyles = () => {
  const { theme } = useTheme();
  const accessibilityConfig = useAccessibility();

  const createStyles = <T extends Record<string, any>>(
    styleFunction: (theme: ResponsiveTheme, accessibility: typeof accessibilityConfig) => T
  ): T => {
    return styleFunction(theme, accessibilityConfig);
  };

  return { createStyles, theme, accessibilityConfig };
};