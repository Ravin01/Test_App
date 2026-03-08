import React from 'react';
import { Text, TextProps } from 'react-native';
import { useResponsive } from '../../Utils/ResponsiveSystem';

interface ResponsiveTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'button';
  color?: 'primary' | 'secondary' | 'tertiary' | 'brand' | 'success' | 'warning' | 'error';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: React.ReactNode;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  variant = 'body',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  className = '',
  children,
  style,
  ...props
}) => {
  const { fontSize, deviceType } = useResponsive();
  
  // Base font sizes for each variant
  const getBaseFontSize = () => {
    switch (variant) {
      case 'h1': return 32;
      case 'h2': return 28;
      case 'h3': return 24;
      case 'h4': return 20;
      case 'h5': return 18;
      case 'h6': return 16;
      case 'body': return 14;
      case 'caption': return 12;
      case 'button': return 16;
      default: return 14;
    }
  };
  
  // Get responsive classes based on your existing Tailwind theme
  const getResponsiveClasses = () => {
    let classes = '';
    
    // Color classes using your existing color system
    switch (color) {
      case 'primary':
        classes += 'text-text-primary ';
        break;
      case 'secondary':
        classes += 'text-text-secondary ';
        break;
      case 'tertiary':
        classes += 'text-text-tertiary ';
        break;
      case 'brand':
        classes += 'text-brand-yellow ';
        break;
      case 'success':
        classes += 'text-ui-success ';
        break;
      case 'warning':
        classes += 'text-ui-warning ';
        break;
      case 'error':
        classes += 'text-ui-live-red ';
        break;
    }
    
    // Weight classes
    switch (weight) {
      case 'medium':
        classes += 'font-medium ';
        break;
      case 'semibold':
        classes += 'font-semibold ';
        break;
      case 'bold':
        classes += 'font-bold ';
        break;
      default:
        classes += 'font-normal ';
    }
    
    // Alignment
    switch (align) {
      case 'center':
        classes += 'text-center ';
        break;
      case 'right':
        classes += 'text-right ';
        break;
      default:
        classes += 'text-left ';
    }
    
    // Responsive font size classes
    const baseFontSize = getBaseFontSize();
    if (deviceType === 'phone') {
      if (baseFontSize >= 24) classes += 'text-2xl ';
      else if (baseFontSize >= 20) classes += 'text-xl ';
      else if (baseFontSize >= 16) classes += 'text-lg ';
      else if (baseFontSize >= 14) classes += 'text-base ';
      else classes += 'text-sm ';
    } else if (deviceType === 'tablet') {
      if (baseFontSize >= 24) classes += 'text-3xl ';
      else if (baseFontSize >= 20) classes += 'text-2xl ';
      else if (baseFontSize >= 16) classes += 'text-xl ';
      else if (baseFontSize >= 14) classes += 'text-lg ';
      else classes += 'text-base ';
    } else {
      if (baseFontSize >= 24) classes += 'text-4xl ';
      else if (baseFontSize >= 20) classes += 'text-3xl ';
      else if (baseFontSize >= 16) classes += 'text-2xl ';
      else if (baseFontSize >= 14) classes += 'text-xl ';
      else classes += 'text-lg ';
    }
    
    return classes + className;
  };
  
  const responsiveFontSize = fontSize(getBaseFontSize());
  
  return (
    <Text
      className={getResponsiveClasses()}
      style={[
        { fontSize: responsiveFontSize },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};