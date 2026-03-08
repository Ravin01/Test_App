/**
 * FontManager - Handles font weight mapping to prevent text disappearing
 * when bold text accessibility is enabled
 */

import { Platform } from 'react-native';
import { accessibilityUtils } from './AccessibilityUtils';

/**
 * Font weight mapping configuration
 * Maps font weights to actual font family names
 */
export const FONT_FAMILIES = {
  regular: Platform.select({
    ios: 'Poppins-Regular',
    android: 'Poppins-Regular',
    default: 'Poppins-Regular',
  }),
  medium: Platform.select({
    ios: 'Poppins-Regular', // Use regular as fallback since no medium variant exists
    android: 'Poppins-Regular',
    default: 'Poppins-Regular',
  }),
  bold: Platform.select({
    ios: 'Poppins-Bold',
    android: 'Poppins-Bold',
    default: 'Poppins-Bold',
  }),
  italic: Platform.select({
    ios: 'Poppins-Italic',
    android: 'Poppins-Italic',
    default: 'Poppins-Italic',
  }),
};

/**
 * Get the appropriate font family based on desired weight
 * This prevents text from disappearing when bold text is enabled
 */
export const getFontFamily = (weight?: string | number): string => {
  // If bold text is enabled in accessibility, always use bold font
  const isBoldTextEnabled = accessibilityUtils.isBoldTextEnabled();
  
  if (isBoldTextEnabled) {
    return FONT_FAMILIES.bold;
  }

  // Map weight to font family
  if (!weight || weight === 'normal' || weight === '400') {
    return FONT_FAMILIES.regular;
  }
  
  if (weight === '500' || weight === '600') {
    return FONT_FAMILIES.regular; // Use regular since we don't have medium weight
  }
  
  if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
    return FONT_FAMILIES.bold;
  }

  return FONT_FAMILIES.regular;
};

/**
 * Get safe font style object that won't cause text to disappear
 * Use this instead of directly setting fontWeight
 */
export const getSafeFontStyle = (weight?: string | number) => {
  return {
    fontFamily: getFontFamily(weight),
    // Don't set fontWeight - let the font family handle it
    // This prevents the "bold on bold" issue that causes text to disappear
  };
};

/**
 * Common text styles with proper font families
 */
export const FONT_STYLES = {
  regular: {
    fontFamily: FONT_FAMILIES.regular,
  },
  medium: {
    fontFamily: FONT_FAMILIES.regular, // Fallback to regular
  },
  bold: {
    fontFamily: FONT_FAMILIES.bold,
  },
  italic: {
    fontFamily: FONT_FAMILIES.italic,
  },
};

/**
 * Helper function to create text styles with proper font handling
 */
export const createTextStyle = (options: {
  size?: number;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  italic?: boolean;
}) => {
  const { size = 14, weight = 'regular', color = '#000000', italic = false } = options;
  
  let fontFamily = FONT_FAMILIES.regular;
  
  if (italic) {
    fontFamily = FONT_FAMILIES.italic;
  } else {
    const isBoldTextEnabled = accessibilityUtils.isBoldTextEnabled();
    
    if (isBoldTextEnabled) {
      fontFamily = FONT_FAMILIES.bold;
    } else {
      switch (weight) {
        case 'bold':
          fontFamily = FONT_FAMILIES.bold;
          break;
        case 'medium':
        case 'regular':
        default:
          fontFamily = FONT_FAMILIES.regular;
          break;
      }
    }
  }
  
  return {
    fontFamily,
    fontSize: size,
    color,
  };
};

/**
 * Legacy compatibility function
 * Converts old fontWeight-based styles to safe font family styles
 */
export const convertLegacyFontStyle = (style: any) => {
  if (!style) return {};
  
  const { fontWeight, ...rest } = style;
  
  if (fontWeight) {
    return {
      ...rest,
      ...getSafeFontStyle(fontWeight),
    };
  }
  
  return style;
};

export default {
  FONT_FAMILIES,
  getFontFamily,
  getSafeFontStyle,
  FONT_STYLES,
  createTextStyle,
  convertLegacyFontStyle,
};
