import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, BackHandler, ToastAndroid } from 'react-native';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const OnboardingScreen1 = ({ setViewScrren, navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/oi1.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Discover Products</Text>
      <Text style={styles.description}>
        Explore unique items through pictures, text, and the means that best match your new lifestyle.
      </Text>
      <View  style={styles.row}>
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
        <View style={[styles.rowItem]}/>
        <View style={[styles.rowItem]}/>
          </View>
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setViewScrren('2')}
      >
      
        <Text style={styles.nextButtonText}>NEXT</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {
          navigation.navigate('WelcomeScreen')
        //navigation.navigate('Login')
      }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const OnboardingScreen2 = ({ setViewScrren, navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/oi2.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Join Live Auctions</Text>
      <Text style={styles.description}>
        Bid in real-time and win amazing deals. Experience the thrill of live auctions from anywhere.
      </Text>
      <View  style={styles.row}>
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
        <View style={[styles.rowItem]}/>
        
          </View>
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setViewScrren('3')}
      >
        <Text style={styles.nextButtonText}>NEXT</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const OnboardingScreen3 = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/oi3.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>Shop with Confidence</Text>
      <Text style={styles.description}>
        Enjoy secure payments and track your orders with ease. Shopping has never been this fun and interactive.
      </Text>
      <View  style={styles.row}>
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
        <View style={[styles.rowItem,{backgroundColor:'#F07A0C'}]} />
          </View>
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.nextButtonText}>NEXT</Text>

      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const OnboardingScreen = ({ navigation }) => {
  const [viewScreen, setViewScrren] = useState('1');
  // const lastBackPressed = useRef(0);
  // 
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

const exitApp = () => {
  //   const currentTime = Date.now();
  //   const timeDiff = currentTime - lastBackPressed.current;

  //   if (timeDiff < 2000) {
  //     // If the back button is pressed within 2 seconds, exit the app
  //     BackHandler.exitApp();
  //   } else {
  //     // Show the "Press again to exit" toast
  //     ToastAndroid.show('Press again to exit', ToastAndroid.SHORT);
  //     lastBackPressed.current = currentTime; // Update the last pressed time
  //   }
  // };

  // useEffect(() => {
  //   const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
  //     exitApp(); // Call the exitApp function on back press
  //     return true; // Prevent the default back behavior
  //   });

  //   return () => {
  //     backHandler.remove(); // Cleanup on component unmount
  //   };
  // }, []);
  switch (viewScreen) {
    case '1':
      return <OnboardingScreen1 setViewScrren={setViewScrren} navigation={navigation} />;
    case '2':
      return <OnboardingScreen2 setViewScrren={setViewScrren} navigation={navigation} />;
    case '3':
      return <OnboardingScreen3 navigation={navigation} />;
    default:
      return null;
  }
};

export default OnboardingScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  row:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:15,
    marginBottom:10,
  },
  rowItem:{
    backgroundColor:'#ccc',
    borderRadius:40,
    width:10,
    height:10,
  },
  image: {
    width: '160%',
    height: 300,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  nextButton: {
    backgroundColor: '#F7CE45',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 5,
    marginBottom: 15,
  },
  nextButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipText: {
    color: '#aaa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});