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
import { flykupLogo, panna } from '../../assets/assets';


export default function VerifySuccess() {

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
        source={{uri:panna}}
        style={styles.image}
        resizeMode="contain"
      />
     
      <Text style={styles.title}>Verified!!!</Text>
      <Text style={styles.subtitle}>
      Congratulations! Your Email address  has
been verified. Please log in to continue.
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
    width: '100%',
   // width: 414,
    height: 345,
    backgroundColor:'#121212',
    // marginBottom: 20,
   // marginLeft: -20,
  },
    logo: {
  width:58,
  height: 25,
  marginTop:10,
  marginLeft:25,
  alignSelf: 'flex-start'
  },
  image: {
    width:  320,    //341,
    height: 230   ,    //254,
    marginBottom: 30,
    marginTop: 70,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 20,
    letterSpacing: -0.5,
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#989898'   ,//'#6e6e6e',
    marginBottom: 30,
    marginTop:8,
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
