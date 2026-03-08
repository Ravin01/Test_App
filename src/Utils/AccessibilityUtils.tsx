import { AccessibilityInfo, Platform } from 'react-native';

export interface AccessibilityConfig {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isHighContrastTextEnabled: boolean;
  preferredContentSizeCategory: string;
}

class AccessibilityUtils {
  private config: AccessibilityConfig = {
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    isHighContrastTextEnabled: false,
    preferredContentSizeCategory: 'medium',
  };

  private listeners: Array<(config: AccessibilityConfig) => void> = [];

  async initialize() {
    try {
      // Check various accessibility settings
      this.config.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.config.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      
      if (Platform.OS === 'ios') {
        this.config.isReduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled();
        this.config.isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
        this.config.isGrayscaleEnabled = await AccessibilityInfo.isGrayscaleEnabled();
        this.config.isInvertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled();
        // this.config.preferredContentSizeCategory = await AccessibilityInfo.preferredContentSizeCategory();
      }

      // Add listeners for accessibility changes
      AccessibilityInfo.addEventListener('screenReaderChanged', this.handleScreenReaderChange);
      AccessibilityInfo.addEventListener('reduceMotionChanged', this.handleReduceMotionChange);
      
      if (Platform.OS === 'ios') {
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', this.handleReduceTransparencyChange);
        AccessibilityInfo.addEventListener('boldTextChanged', this.handleBoldTextChange);
        AccessibilityInfo.addEventListener('grayscaleChanged', this.handleGrayscaleChange);
        AccessibilityInfo.addEventListener('invertColorsChanged', this.handleInvertColorsChange);
        // AccessibilityInfo.addEventListener('contentSizeCategoryChanged', this.handleContentSizeCategoryChange);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing accessibility settings:', error);
    }
  }

  private handleScreenReaderChange = (isEnabled: boolean) => {
    this.config.isScreenReaderEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleReduceMotionChange = (isEnabled: boolean) => {
    this.config.isReduceMotionEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleReduceTransparencyChange = (isEnabled: boolean) => {
    this.config.isReduceTransparencyEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleBoldTextChange = (isEnabled: boolean) => {
    this.config.isBoldTextEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleGrayscaleChange = (isEnabled: boolean) => {
    this.config.isGrayscaleEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleInvertColorsChange = (isEnabled: boolean) => {
    this.config.isInvertColorsEnabled = isEnabled;
    this.notifyListeners();
  };

  private handleContentSizeCategoryChange = (category: string) => {
    this.config.preferredContentSizeCategory = category;
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.config));
  }

  // Public methods
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  isScreenReaderEnabled(): boolean {
    return this.config.isScreenReaderEnabled;
  }

  isReduceMotionEnabled(): boolean {
    return this.config.isReduceMotionEnabled;
  }

  isReduceTransparencyEnabled(): boolean {
    return this.config.isReduceTransparencyEnabled;
  }

  isBoldTextEnabled(): boolean {
    return this.config.isBoldTextEnabled;
  }

  shouldUseHighContrast(): boolean {
    return this.config.isHighContrastTextEnabled || this.config.isInvertColorsEnabled;
  }

  getFontWeightForAccessibility(normalWeight: string = 'normal'): string {
    return this.config.isBoldTextEnabled ? 'bold' : normalWeight;
  }

  getAnimationDuration(normalDuration: number): number {
    return this.config.isReduceMotionEnabled ? 0 : normalDuration;
  }

  getOpacityForAccessibility(normalOpacity: number): number {
    if (this.config.isReduceTransparencyEnabled) {
      return Math.max(normalOpacity, 0.8); // Increase opacity for better visibility
    }
    return normalOpacity;
  }

  // Generate accessibility label with context
  generateAccessibilityLabel(text: string, context?: string, action?: string): string {
    let label = text;
    
    if (context) {
      label = `${context}, ${label}`;
    }
    
    if (action) {
      label = `${label}, ${action}`;
    }
    
    return label;
  }

  // Generate accessibility hint
  generateAccessibilityHint(action: string, result?: string): string {
    let hint = action;
    
    if (result) {
      hint = `${hint} to ${result}`;
    }
    
    return hint;
  }

  // Check if element should have accessibility traits
  getAccessibilityTraits(elementType: 'button' | 'link' | 'header' | 'image' | 'text') {
    const traits: any = {};
    
    switch (elementType) {
      case 'button':
        traits.accessibilityRole = 'button';
        traits.accessible = true;
        break;
      case 'link':
        traits.accessibilityRole = 'link';
        traits.accessible = true;
        break;
      case 'header':
        traits.accessibilityRole = 'header';
        traits.accessible = true;
        break;
      case 'image':
        traits.accessibilityRole = 'image';
        traits.accessible = true;
        break;
      case 'text':
        traits.accessibilityRole = 'text';
        traits.accessible = true;
        break;
    }
    
    return traits;
  }

  // Subscribe to accessibility changes
  subscribe(listener: (config: AccessibilityConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Cleanup
  dispose() {
    AccessibilityInfo.removeEventListener('screenReaderChanged', this.handleScreenReaderChange);
    AccessibilityInfo.removeEventListener('reduceMotionChanged', this.handleReduceMotionChange);
    
    if (Platform.OS === 'ios') {
      AccessibilityInfo.removeEventListener('reduceTransparencyChanged', this.handleReduceTransparencyChange);
      AccessibilityInfo.removeEventListener('boldTextChanged', this.handleBoldTextChange);
      AccessibilityInfo.removeEventListener('grayscaleChanged', this.handleGrayscaleChange);
      AccessibilityInfo.removeEventListener('invertColorsChanged', this.handleInvertColorsChange);
      // AccessibilityInfo.removeEventListener('contentSizeCategoryChanged', this.handleContentSizeCategoryChange);
    }
    
    this.listeners.length = 0;
  }
}

export const accessibilityUtils = new AccessibilityUtils();

// React Hook for accessibility
import { useState, useEffect } from 'react';

export const useAccessibility = () => {
  const [config, setConfig] = useState<AccessibilityConfig>(accessibilityUtils.getConfig());

  useEffect(() => {
    const unsubscribe = accessibilityUtils.subscribe(setConfig);
    return unsubscribe;
  }, []);

  return config;
};

// Accessibility-aware styles
export const getAccessibleStyles = (config: AccessibilityConfig) => ({
  // Text styles
  text: {
    fontWeight: config.isBoldTextEnabled ? 'bold' : 'normal',
  },
  
  // High contrast colors
  highContrastText: config.isHighContrastTextEnabled ? '#000000' : undefined,
  highContrastBackground: config.isHighContrastTextEnabled ? '#FFFFFF' : undefined,
  
  // Reduced transparency
  overlay: {
    opacity: config.isReduceTransparencyEnabled ? 0.9 : 0.5,
  },
  
  // Animation durations
  animationDuration: config.isReduceMotionEnabled ? 0 : 300,
  
  // Touch targets (minimum 44x44 points)
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
  },
});

// Common accessibility props for components
export const getAccessibilityProps = (
  label: string,
  hint?: string,
  role?: string,
  state?: { selected?: boolean; expanded?: boolean; checked?: boolean }
) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: role as any,
  accessibilityState: state,
});

// Focus management utilities
export const announcementForScreenReader = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

export const setAccessibilityFocus = (reactTag: number) => {
  AccessibilityInfo.setAccessibilityFocus(reactTag);
};