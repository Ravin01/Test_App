import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const COLORS = {
  primary: '#F7CE45',
  surface: '#1A1A1D',
  surfaceLight: '#2A2A2F',
  textPrimary: '#F8F9FA',
  border: '#343A40',
  blue: '#4A90E2',
  pink: '#E91E63',
  purple: '#9C27B0',
  gray: '#6C757D',
};

interface GenderOption {
  value: string;
  label: string;
  icon: string;
  colors: string[];
}

interface GenderSelectionProps {
  selectedGender: string;
  onGenderChange: (gender: string) => void;
  disabled?: boolean;
}

const GenderSelection: React.FC<GenderSelectionProps> = ({ 
  selectedGender, 
  onGenderChange, 
  disabled = false 
}) => {
  const genderOptions: GenderOption[] = [
    { 
      value: 'male', 
      label: 'Male', 
      icon: 'person',
      colors: ['#4A90E2', '#2E5CB8']
    },
    { 
      value: 'female', 
      label: 'Female', 
      icon: 'person-outline',
      colors: ['#E91E63', '#C2185B']
    },
    { 
      value: 'other', 
      label: 'Other', 
      icon: 'people',
      colors: ['#9C27B0', '#7B1FA2']
    },
    { 
      value: 'prefer-not-to-say', 
      label: 'Prefer not to say', 
      icon: 'help-outline',
      colors: ['#6C757D', '#495057']
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {genderOptions.map((option) => {
          const isSelected = selectedGender === option.value;
          
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => !disabled && onGenderChange(option.value)}
              disabled={disabled}
              activeOpacity={0.7}
              style={[styles.optionButton, disabled && styles.disabledButton]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={option.colors}
                  style={styles.selectedGradient}
                >
                  <View style={styles.iconContainer}>
                    <Icon name={option.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.selectedLabel}>{option.label}</Text>
                  {/* <View style={styles.checkmarkContainer}>
                    <Icon name="check-circle" size={19} color="#51CF66" />
                  </View> */}
                </LinearGradient>
              ) : (
                <View style={styles.unselectedContainer}>
                  <View style={[styles.iconContainer, styles.unselectedIconContainer]}>
                    <Icon name={option.icon} size={24} color={COLORS.textPrimary} />
                  </View>
                  <Text style={styles.unselectedLabel}>{option.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionButton: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  selectedGradient: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unselectedContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unselectedIconContainer: {
    backgroundColor: COLORS.surfaceLight,
  },
  selectedLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  unselectedLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  checkmarkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GenderSelection;