import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  TextStyle,
  ViewStyle,
  TextInputProps,
  TouchableOpacityProps,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { responsive, useResponsiveStyles } from '../../Utils/ResponsiveUtils';
import { colors } from '../../Utils/Colors';

// Responsive Text Component
interface ResponsiveTextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  variant?: 'title' | 'headline' | 'body' | 'caption' | 'button';
  color?: string;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  style,
  variant = 'body',
  color,
  numberOfLines,
  adjustsFontSizeToFit = true,
}) => {
  const responsiveStyles = useResponsiveStyles();

  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'title':
        return {
          fontSize: responsiveStyles.textHuge,
          fontWeight: 'bold',
          lineHeight: responsiveStyles.textHuge * 1.2,
        };
      case 'headline':
        return {
          fontSize: responsiveStyles.textXXLarge,
          fontWeight: '600',
          lineHeight: responsiveStyles.textXXLarge * 1.3,
        };
      case 'body':
        return {
          fontSize: responsiveStyles.textMedium,
          fontWeight: '400',
          lineHeight: responsiveStyles.textMedium * 1.5,
        };
      case 'caption':
        return {
          fontSize: responsiveStyles.textSmall,
          fontWeight: '400',
          lineHeight: responsiveStyles.textSmall * 1.4,
        };
      case 'button':
        return {
          fontSize: responsiveStyles.textMedium,
          fontWeight: '600',
          letterSpacing: 0.5,
        };
      default:
        return {};
    }
  };

  return (
    <Text
      style={[
        getVariantStyle(),
        color && { color },
        style,
      ]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3} // Accessibility: limit font scaling
    >
      {children}
    </Text>
  );
};

// Responsive Button Component
interface ResponsiveButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = true,
  ...props
}) => {
  const responsiveStyles = useResponsiveStyles();

  const getButtonHeight = () => {
    switch (size) {
      case 'small':
        return responsiveStyles.buttonHeightSmall;
      case 'large':
        return responsiveStyles.buttonHeightLarge;
      default:
        return responsiveStyles.buttonHeight;
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: getButtonHeight(),
      borderRadius: responsiveStyles.borderRadius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: responsiveStyles.paddingLarge,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#CCCCCC' : colors.primaryColor,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#F0F0F0' : colors.secondaryColor,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: disabled ? '#CCCCCC' : colors.primaryColor,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingHorizontal: responsiveStyles.paddingMedium,
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'text') {
      return disabled ? '#CCCCCC' : colors.primaryColor;
    }
    return '#FFFFFF';
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        fullWidth && { width: '100%' },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: responsiveStyles.marginSmall }}>{icon}</View>}
          <ResponsiveText
            variant="button"
            color={getTextColor()}
            style={textStyle}
          >
            {title}
          </ResponsiveText>
        </>
      )}
    </TouchableOpacity>
  );
};

// Responsive Input Component
interface ResponsiveInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  style,
  ...props
}) => {
  const responsiveStyles = useResponsiveStyles();

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && (
        <ResponsiveText
          variant="caption"
          style={{
            marginBottom: responsiveStyles.marginTiny,
            color: colors.textSecondary,
          }}
        >
          {label}
        </ResponsiveText>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            height: responsiveStyles.inputHeight,
            borderRadius: responsiveStyles.borderRadius,
            paddingHorizontal: responsiveStyles.paddingMedium,
          },
          error && styles.inputError,
        ]}
      >
        {icon && (
          <View style={{ marginRight: responsiveStyles.marginSmall }}>
            {icon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              fontSize: responsiveStyles.textMedium,
            },
            style,
          ]}
          placeholderTextColor="#999999"
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          {...props}
        />
      </View>
      {error && (
        <ResponsiveText
          variant="caption"
          style={{
            marginTop: responsiveStyles.marginTiny,
            color: '#FF0000',
          }}
        >
          {error}
        </ResponsiveText>
      )}
    </View>
  );
};

// Responsive Card Component
interface ResponsiveCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: boolean;
  onPress?: () => void;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  style,
  padding = true,
  onPress,
}) => {
  const responsiveStyles = useResponsiveStyles();

  const cardContent = (
    <View
      style={[
        styles.card,
        responsiveStyles.cardElevation,
        {
          borderRadius: responsiveStyles.borderRadius,
          padding: padding ? responsiveStyles.paddingMedium : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

// Responsive Grid Component
interface ResponsiveGridProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: ViewStyle;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  data,
  renderItem,
  columns,
  spacing,
  style,
}) => {
  const responsiveStyles = useResponsiveStyles();
  const gridColumns = columns || responsiveStyles.gridColumns;
  const gridSpacing = spacing !== undefined ? spacing : responsiveStyles.marginSmall;

  return (
    <View style={[styles.gridContainer, style]}>
      {data.map((item, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: `${100 / gridColumns}%`,
              padding: gridSpacing / 2,
            },
          ]}
        >
          {renderItem(item, index)}
        </View>
      ))}
    </View>
  );
};

// Responsive Spacer Component
interface ResponsiveSpacerProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  horizontal?: boolean;
}

export const ResponsiveSpacer: React.FC<ResponsiveSpacerProps> = ({
  size = 'medium',
  horizontal = false,
}) => {
  const responsiveStyles = useResponsiveStyles();

  const getSpacing = () => {
    switch (size) {
      case 'tiny':
        return responsiveStyles.marginTiny;
      case 'small':
        return responsiveStyles.marginSmall;
      case 'large':
        return responsiveStyles.marginLarge;
      case 'xlarge':
        return responsiveStyles.marginXLarge;
      default:
        return responsiveStyles.marginMedium;
    }
  };

  return (
    <View
      style={{
        [horizontal ? 'width' : 'height']: getSpacing(),
      }}
    />
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  input: {
    flex: 1,
    color: '#000000',
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
      android: {
        paddingVertical: 8,
      },
    }),
  },
  card: {
    backgroundColor: '#FFFFFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    // Width and padding set dynamically
  },
});