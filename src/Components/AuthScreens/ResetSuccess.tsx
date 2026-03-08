/* eslint-disable quotes */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ToastAndroid,
  BackHandler,
} from 'react-native';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { flykupLogo, resetPassword } from '../../assets/assets';



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

export default function ResetSuccess() {

  const [loading, setloading] = useState(false);
  const Navigation = useNavigation();

  // Prevent hardware back press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Return true to prevent default back behavior
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  return (
  <>
    <SafeAreaView style={styles.container}>
      <Image
        source={{uri:flykupLogo}} 
        style={styles.logo}
        resizeMode='cover'
      />
    
      <Image
        source={{uri:resetPassword}}
        style={styles.image}
        resizeMode="contain"
      />
     
      <Text style={styles.title}>Password updated!</Text>
      <Text style={styles.subtitle}>
      Congratulations! Your password has
      been changed. Click continue to login
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={()=>{Navigation.navigate('Login')}}>
        {loading?<ActivityIndicator color='white'/>:<Text style={styles.buttonText}>LOGIN</Text>}
      </TouchableOpacity>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    // padding: 20,
   // justifyContent: 'center'
  },
  headerImage: {
    width: 438,
    height: 345,
    backgroundColor:'#fff',
    // marginBottom: 20,
    //marginLeft: -20,
  },
  logo: {
  width:58,
  height: 25,
  marginTop:19,
  marginLeft:15,
  alignSelf: 'flex-start'
  },
  image: {
    width:  320,    //341,
    height: 230   ,    //254,
    marginBottom: 30,
    marginTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#fafafa',
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#989898'   ,//'#6e6e6e',
    marginBottom: 40,
    marginTop:20,
    fontWeight: 500,
  //  lineHeight: 20,
  //  letterSpacing: -0.5,
  textAlign:'center',
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
    width: '50%',
    borderRadius: 5,
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
