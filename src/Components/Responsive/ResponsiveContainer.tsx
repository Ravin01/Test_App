import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../Utils/ResponsiveSystem';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  keyboardAware?: boolean;
  useSafeArea?: boolean;
  centerContent?: boolean;
  maxWidth?: boolean;
  twoPane?: boolean;
  leftPane?: React.ReactNode;
  rightPane?: React.ReactNode;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  scrollable = false,
  keyboardAware = false,
  useSafeArea = true,
  centerContent = false,
  maxWidth = true,
  twoPane = false,
  leftPane,
  rightPane,
}) => {
  const { layoutConfig, deviceType, spacing } = useResponsive();
  const insets = useSafeAreaInsets();
  
  // Build responsive classes based on your existing Tailwind theme
  const getResponsiveClasses = () => {
    let classes = 'flex-1 ';
    
    // Background using your existing colors
    classes += 'bg-primary-color ';
    
    // Responsive padding
    if (deviceType === 'phone') {
      classes += 'px-4 py-3 ';
    } else if (deviceType === 'tablet') {
      classes += 'px-6 py-4 ';
    } else {
      classes += 'px-8 py-6 ';
    }
    
    // Max width for larger screens
    if (maxWidth && deviceType !== 'phone') {
      classes += 'max-w-screen-lg mx-auto ';
    }
    
    // Center content if requested
    if (centerContent) {
      classes += 'justify-center items-center ';
    }
    
    return classes + className;
  };
  
  // Safe area styles
  const safeAreaStyles = useSafeArea ? {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } : {};
  
  // Two-pane layout for tablets in landscape
  const shouldUseTwoPane = twoPane && layoutConfig.shouldUseTwoPane && leftPane && rightPane;
  
  const renderContent = () => {
    if (shouldUseTwoPane) {
      return (
        <View className="flex-1 flex-row">
          <View className="flex-1 pr-4">
            {leftPane}
          </View>
          <View className="flex-1 pl-4">
            {rightPane}
          </View>
        </View>
      );
    }
    
    return children;
  };
  
  const content = (
    <View className={getResponsiveClasses()} style={safeAreaStyles}>
      {renderContent()}
    </View>
  );
  
  if (keyboardAware && Platform.OS === 'android') {
    return (
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        {scrollable ? (
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : content}
      </KeyboardAvoidingView>
    );
  }
  
  if (scrollable) {
    return (
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );
  }
  
  return content;
};