/* eslint-disable quotes */
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { groupImg } from '../../assets/assets';



/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

export default function ConfirmReset() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setloading] = useState(false);
  const Navigation = useNavigation();
 
  const handleConfirmReset = () => {
    Navigation.navigate('ResetSuccess');
  };

  return (
  <>
   <Image
        source={{uri:groupImg}} 
        style={styles.headerImage}
        resizeMode='cover'
      />
    <View style={styles.container}>
     
      <Text style={styles.title}>Password Reset</Text>
      <Text style={styles.subtitle}>
      Your password has been successfully reset. click confirm to set a new password
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleConfirmReset}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>Confirm</Text>}
      </TouchableOpacity>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
  },
  headerImage: {
    width: '100%',
    height: 345,
    backgroundColor:'#fff',
    // marginBottom: 20,
    //marginLeft: -20,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#1E1E1E',
    alignSelf:'flex-start',
  },
  subtitle: {
    fontSize: 16,
    color: '#989898'   ,//'#6e6e6e',
    marginBottom: 30,
    marginTop:8,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  label:{
    fontSize: 16,
    color: '#2A2A2A',
    marginBottom: 10,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    alignSelf:'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor:'transparent',color:'black',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  button: {
    width: '100%',
    // borderRadius: 25,
    padding: 15,
    backgroundColor: '#F7CE45',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    // color: '#fff',
    fontWeight:'600',
    letterSpacing:3,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
});
