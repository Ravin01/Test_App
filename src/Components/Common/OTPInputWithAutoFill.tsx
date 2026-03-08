import React, { useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface OTPInputWithAutoFillProps {
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  filledInputStyle?: TextStyle;
  disabledInputStyle?: TextStyle;
}

/**
 * OTP Input Component
 * 
 * Features:
 * - Manual input support with automatic focus management
 * - Customizable styling
 * 
 * @example
 * ```tsx
 * <OTPInputWithAutoFill
 *   value={otp}
 *   onChange={setOtp}
 *   onComplete={(otp) => handleVerify(otp)}
 *   length={6}
 * />
 * ```
 */
const OTPInputWithAutoFill: React.FC<OTPInputWithAutoFillProps> = ({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
  containerStyle,
  inputStyle,
  filledInputStyle,
  disabledInputStyle,
}) => {
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus, disabled]);

  const handleChange = (text: string, index: number) => {
    if (disabled) return;
    
    // Only allow digits
    if (!/^\d*$/.test(text)) return;

    const newOTP = value.split('');
    newOTP[index] = text.slice(-1);
    const newOTPString = newOTP.join('').slice(0, length);
    
    onChange(newOTPString);

    // Move to next input if text is entered
    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Trigger onComplete callback when OTP is complete
    if (newOTPString.length === length && onComplete) {
      onComplete(newOTPString);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (disabled) return;
    
    // Move to previous input on backspace if current input is empty
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select text on focus for easier editing
    if (inputsRef.current[index]) {
      setTimeout(() => {
        inputsRef.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
      }, 10);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {[...Array(length)].map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          style={[
            styles.input,
            inputStyle,
            value[index] && [styles.filledInput, filledInputStyle],
            disabled && [styles.disabledInput, disabledInputStyle],
          ]}
          keyboardType="number-pad"
          maxLength={1}
          value={value[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          editable={!disabled}
          selectTextOnFocus
          // iOS Auto-fill support
          textContentType={index === 0 && Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
          autoComplete={index === 0 && Platform.OS === 'android' ? 'sms-otp' : 'off'}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  input: {
    width: 48,
    height: 56,
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  filledInput: {
    borderColor: '#F7CE45',
    color: '#F7CE45',
  },
  disabledInput: {
    opacity: 0.5,
  },
});

export default OTPInputWithAutoFill;
