import React from 'react';
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Using your existing Tailwind breakpoints
export const BREAKPOINTS = {
  xs: 375,   // Small mobile phones (iPhone SE)
  sm: 430,   // Large mobile phones (iPhone 14/15 Pro Max)
  md: 768,   // Tablets in portrait mode
  lg: 1024,  // Tablets in landscape and small laptops
  xl: 1280,  // Laptops and desktops
};

export type BreakpointKey = keyof typeof BREAKPOINTS;
export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export class ResponsiveSystem {
  // Get current device type based on your breakpoints
  static getDeviceType(): DeviceType {
    if (SCREEN_WIDTH >= BREAKPOINTS.lg) return 'desktop';
    if (SCREEN_WIDTH >= BREAKPOINTS.md) return 'tablet';
    return 'phone';
  }

  // Get current breakpoint
  static getCurrentBreakpoint(): BreakpointKey {
    if (SCREEN_WIDTH >= BREAKPOINTS.xl) return 'xl';
    if (SCREEN_WIDTH >= BREAKPOINTS.lg) return 'lg';
    if (SCREEN_WIDTH >= BREAKPOINTS.md) return 'md';
    if (SCREEN_WIDTH >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }

  // Check if current screen matches breakpoint
  static isBreakpoint(breakpoint: BreakpointKey): boolean {
    return SCREEN_WIDTH >= BREAKPOINTS[breakpoint];
  }

  // Get responsive font size based on your existing font system
  static getFontSize(baseSize: number): number {
    const deviceType = this.getDeviceType();
    const fontScale = PixelRatio.getFontScale();
    
    let scaleFactor = 1;
    switch (deviceType) {
      case 'tablet':
        scaleFactor = 1.2;
        break;
      case 'desktop':
        scaleFactor = 1.4;
        break;
      default:
        scaleFactor = 1;
    }
    
    return Math.round(baseSize * scaleFactor * fontScale);
  }

  // Get responsive spacing based on your existing spacing scale
  static getSpacing(baseSpacing: number): number {
    const deviceType = this.getDeviceType();
    
    switch (deviceType) {
      case 'tablet':
        return Math.round(baseSpacing * 1.3);
      case 'desktop':
        return Math.round(baseSpacing * 1.5);
      default:
        return baseSpacing;
    }
  }

  // Generate responsive styles object
  static createResponsiveStyles<T extends Record<string, any>>(styles: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
  }): T {
    const currentBreakpoint = this.getCurrentBreakpoint();
    
    // Apply styles in order from xs to current breakpoint
    let finalStyles = {} as T;
    
    const breakpointOrder: BreakpointKey[] = ['xs', 'sm', 'md', 'lg', 'xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    for (let i = 0; i <= currentIndex; i++) {
      const breakpoint = breakpointOrder[i];
      if (styles[breakpoint]) {
        finalStyles = { ...finalStyles, ...styles[breakpoint] };
      }
    }
    
    return finalStyles;
  }

  // Get layout configuration for current device
  static getLayoutConfig() {
    const deviceType = this.getDeviceType();
    const orientation = SCREEN_WIDTH > SCREEN_HEIGHT ? 'landscape' : 'portrait';
    
    return {
      deviceType,
      orientation,
      isTablet: deviceType === 'tablet',
      isPhone: deviceType === 'phone',
      isLandscape: orientation === 'landscape',
      shouldUseTwoPane: deviceType === 'tablet' && orientation === 'landscape',
      maxContentWidth: deviceType === 'phone' ? '100%' : '80%',
      gridColumns: deviceType === 'phone' ? 1 : deviceType === 'tablet' ? 2 : 3,
    };
  }

  // Generate responsive container styles
  static getContainerStyles() {
    const config = this.getLayoutConfig();
    const spacing = this.getSpacing(16);
    
    return {
      paddingHorizontal: spacing,
      paddingVertical: this.getSpacing(12),
      maxWidth: config.deviceType === 'phone' ? undefined : 1200,
      alignSelf: config.deviceType === 'phone' ? undefined : 'center',
    };
  }
}

// Hook for responsive values with automatic updates
export const useResponsive = () => {
  const [screenData, setScreenData] = React.useState(Dimensions.get('window'));
  
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    
    return () => subscription?.remove();
  }, []);
  
  const deviceType = React.useMemo(() => {
    return screenData.width >= BREAKPOINTS.lg ? 'desktop' :
           screenData.width >= BREAKPOINTS.md ? 'tablet' : 'phone';
  }, [screenData.width]);
  
  const breakpoint = React.useMemo(() => {
    if (screenData.width >= BREAKPOINTS.xl) return 'xl';
    if (screenData.width >= BREAKPOINTS.lg) return 'lg';
    if (screenData.width >= BREAKPOINTS.md) return 'md';
    if (screenData.width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, [screenData.width]);
  
  const layoutConfig = React.useMemo(() => {
    const orientation = screenData.width > screenData.height ? 'landscape' : 'portrait';
    return {
      deviceType,
      orientation,
      isTablet: deviceType === 'tablet',
      isPhone: deviceType === 'phone',
      isLandscape: orientation === 'landscape',
      shouldUseTwoPane: deviceType === 'tablet' && orientation === 'landscape',
      screenWidth: screenData.width,
      screenHeight: screenData.height,
    };
  }, [deviceType, screenData]);
  
  return {
    ...ResponsiveSystem,
    deviceType,
    breakpoint,
    layoutConfig,
    screenData,
    // Utility functions with current context
    fontSize: (baseSize: number) => ResponsiveSystem.getFontSize(baseSize),
    spacing: (baseSpacing: number) => ResponsiveSystem.getSpacing(baseSpacing),
    isBreakpoint: (bp: BreakpointKey) => screenData.width >= BREAKPOINTS[bp],
  };
};