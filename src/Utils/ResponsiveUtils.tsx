import {
  Dimensions,
  Platform,
  PixelRatio,
  StatusBar,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device size categories
export enum DeviceSize {
  SMALL = 'small', // 4.7" - 5.5"
  MEDIUM = 'medium', // 5.5" - 6.5"
  LARGE = 'large', // 6.5" - 7.5"
  XLARGE = 'xlarge', // 7.5"+ and tablets
  FOLDABLE = 'foldable', // Foldable devices
}

// Orientation types
export enum Orientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
}

class ResponsiveUtils {
  private baseWidth = 375; // iPhone X width as base
  private baseHeight = 812; // iPhone X height as base
  private pixelRatio = PixelRatio.get();
  private fontScale = PixelRatio.getFontScale();

  // Get device size category
  getDeviceSize(): DeviceSize {
    const screenInches = Math.sqrt(
      Math.pow(SCREEN_WIDTH / this.pixelRatio, 2) +
      Math.pow(SCREEN_HEIGHT / this.pixelRatio, 2)
    );

    // Check if foldable
    if (DeviceInfo.hasNotch() && SCREEN_WIDTH > 700) {
      return DeviceSize.FOLDABLE;
    }

    // Categorize by screen size
    if (screenInches < 5.5) return DeviceSize.SMALL;
    if (screenInches < 6.5) return DeviceSize.MEDIUM;
    if (screenInches < 7.5) return DeviceSize.LARGE;
    return DeviceSize.XLARGE;
  }

  // Get current orientation
  getOrientation(): Orientation {
    return SCREEN_WIDTH < SCREEN_HEIGHT
      ? Orientation.PORTRAIT
      : Orientation.LANDSCAPE;
  }

  // Responsive width calculation
  wp(percentage: number): number {
    return (percentage * SCREEN_WIDTH) / 100;
  }

  // Responsive height calculation
  hp(percentage: number): number {
    return (percentage * SCREEN_HEIGHT) / 100;
  }

  // Responsive font size with accessibility support
  fontSize(size: number): number {
    const scale = SCREEN_WIDTH / this.baseWidth;
    const newSize = size * scale;
    
    // Respect system font scale for accessibility
    const maxScale = this.fontScale > 1.3 ? 1.3 : this.fontScale;
    
    if (Platform.OS === 'ios') {
      return Math.round(PixelRatio.roundToNearestPixel(newSize * maxScale));
    } else {
      return Math.round(PixelRatio.roundToNearestPixel(newSize * maxScale));
    }
  }

  // Scale based on device width
  scale(size: number): number {
    return (SCREEN_WIDTH / this.baseWidth) * size;
  }

  // Vertical scale based on device height
  verticalScale(size: number): number {
    return (SCREEN_HEIGHT / this.baseHeight) * size;
  }

  // Moderate scale with factor
  moderateScale(size: number, factor: number = 0.5): number {
    return size + (this.scale(size) - size) * factor;
  }

  // Get safe area insets
  getSafeAreaInsets() {
    const hasNotch = DeviceInfo.hasNotch();
    const statusBarHeight = StatusBar.currentHeight || 0;
    
    return {
      top: Platform.OS === 'ios' ? (hasNotch ? 44 : 20) : statusBarHeight,
      bottom: Platform.OS === 'ios' && hasNotch ? 34 : 0,
      left: 0,
      right: 0,
    };
  }

  // Check if tablet
  isTablet(): boolean {
    return DeviceInfo.isTablet();
  }

  // Check if foldable device
  isFoldable(): boolean {
    const model = DeviceInfo.getModel().toLowerCase();
    return (
      model.includes('fold') ||
      model.includes('flip') ||
      model.includes('duo') ||
      this.getDeviceSize() === DeviceSize.FOLDABLE
    );
  }

  // Get responsive styles based on device size
  getResponsiveStyles() {
    const deviceSize = this.getDeviceSize();
    const isLandscape = this.getOrientation() === Orientation.LANDSCAPE;

    return {
      // Padding values
      paddingTiny: this.moderateScale(4),
      paddingSmall: this.moderateScale(8),
      paddingMedium: this.moderateScale(16),
      paddingLarge: this.moderateScale(24),
      paddingXLarge: this.moderateScale(32),

      // Margin values
      marginTiny: this.moderateScale(4),
      marginSmall: this.moderateScale(8),
      marginMedium: this.moderateScale(16),
      marginLarge: this.moderateScale(24),
      marginXLarge: this.moderateScale(32),

      // Text sizes
      textTiny: this.fontSize(10),
      textSmall: this.fontSize(12),
      textMedium: this.fontSize(14),
      textLarge: this.fontSize(16),
      textXLarge: this.fontSize(20),
      textXXLarge: this.fontSize(24),
      textHuge: this.fontSize(28),

      // Component sizes
      buttonHeight: this.verticalScale(48),
      buttonHeightSmall: this.verticalScale(36),
      buttonHeightLarge: this.verticalScale(56),
      
      iconSizeSmall: this.moderateScale(24),
      iconSizeMedium: this.moderateScale(32),
      iconSizeLarge: this.moderateScale(48),
      
      avatarSizeSmall: this.moderateScale(32),
      avatarSizeMedium: this.moderateScale(48),
      avatarSizeLarge: this.moderateScale(64),
      
      borderRadius: this.moderateScale(8),
      borderRadiusSmall: this.moderateScale(4),
      borderRadiusLarge: this.moderateScale(12),
      
      // Grid columns based on device
      gridColumns: deviceSize === DeviceSize.SMALL ? 2 : 
                   deviceSize === DeviceSize.MEDIUM ? 3 :
                   isLandscape ? 5 : 4,
                   
      // Product grid columns
      productGridColumns: deviceSize === DeviceSize.SMALL ? 2 :
                          deviceSize === DeviceSize.MEDIUM ? 3 :
                          this.isTablet() ? 5 : 4,

      // Bottom tab height
      bottomTabHeight: this.verticalScale(56),
      
      // Header height
      headerHeight: this.verticalScale(56),

      // Input field height
      inputHeight: this.verticalScale(48),

      // List item height
      listItemHeight: this.verticalScale(72),

      // Card elevation
      cardElevation: Platform.OS === 'ios' ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      } : {
        elevation: 4,
      },
    };
  }

  // Get responsive image dimensions
  getImageDimensions(aspectRatio: number = 1) {
    const deviceSize = this.getDeviceSize();
    const padding = this.moderateScale(16);
    const availableWidth = SCREEN_WIDTH - (padding * 2);

    let imageWidth: number;
    
    switch (deviceSize) {
      case DeviceSize.SMALL:
        imageWidth = availableWidth;
        break;
      case DeviceSize.MEDIUM:
        imageWidth = availableWidth * 0.9;
        break;
      case DeviceSize.LARGE:
      case DeviceSize.XLARGE:
        imageWidth = Math.min(availableWidth * 0.8, 600);
        break;
      default:
        imageWidth = availableWidth;
    }

    return {
      width: imageWidth,
      height: imageWidth / aspectRatio,
    };
  }

  // Get number of columns for grid layouts
  getGridColumns(type: 'default' | 'products' | 'categories' = 'default'): number {
    const deviceSize = this.getDeviceSize();
    const isLandscape = this.getOrientation() === Orientation.LANDSCAPE;
    const isTablet = this.isTablet();

    switch (type) {
      case 'products':
        if (isTablet) return isLandscape ? 6 : 4;
        if (deviceSize === DeviceSize.SMALL) return 2;
        if (deviceSize === DeviceSize.MEDIUM) return isLandscape ? 4 : 3;
        return isLandscape ? 5 : 4;
        
      case 'categories':
        if (isTablet) return isLandscape ? 5 : 3;
        if (deviceSize === DeviceSize.SMALL) return 3;
        return isLandscape ? 5 : 4;
        
      default:
        if (isTablet) return isLandscape ? 4 : 3;
        if (deviceSize === DeviceSize.SMALL) return 1;
        if (deviceSize === DeviceSize.MEDIUM) return isLandscape ? 3 : 2;
        return isLandscape ? 4 : 3;
    }
  }
}

export const responsive = new ResponsiveUtils();

// Export common responsive values for easy access
export const {
  paddingTiny,
  paddingSmall,
  paddingMedium,
  paddingLarge,
  paddingXLarge,
  marginTiny,
  marginSmall,
  marginMedium,
  marginLarge,
  marginXLarge,
  textTiny,
  textSmall,
  textMedium,
  textLarge,
  textXLarge,
  textXXLarge,
  textHuge,
  buttonHeight,
  buttonHeightSmall,
  buttonHeightLarge,
  iconSizeSmall,
  iconSizeMedium,
  iconSizeLarge,
  borderRadius,
  borderRadiusSmall,
  borderRadiusLarge,
  cardElevation,
} = responsive.getResponsiveStyles();

// Responsive hooks
import { useEffect, useState } from 'react';

export const useDeviceSize = () => {
  const [deviceSize, setDeviceSize] = useState(responsive.getDeviceSize());
  
  useEffect(() => {
    const updateDeviceSize = () => {
      setDeviceSize(responsive.getDeviceSize());
    };

    const subscription = Dimensions.addEventListener('change', updateDeviceSize);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return deviceSize;
};

export const useOrientation = () => {
  const [orientation, setOrientation] = useState(responsive.getOrientation());
  
  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(responsive.getOrientation());
    };

    const subscription = Dimensions.addEventListener('change', updateOrientation);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return orientation;
};

export const useResponsiveStyles = () => {
  const [styles, setStyles] = useState(responsive.getResponsiveStyles());
  
  useEffect(() => {
    const updateStyles = () => {
      setStyles(responsive.getResponsiveStyles());
    };

    const subscription = Dimensions.addEventListener('change', updateStyles);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return styles;
};