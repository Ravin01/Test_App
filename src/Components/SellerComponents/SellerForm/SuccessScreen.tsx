import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { successScreen } from '../../../assets/assets';

const { width, height } = Dimensions.get('window');

const SuccessScreen = ({navigation}) => {
  
  // Handle system back button press
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('bottomtabbar');
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

const handleBackToHome = () => {
    // Navigate back to home screen
    navigation.navigate('bottomtabbar')
    console.log('Navigate to home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Success Icon with Glow Effect */}
        <Image
        source={{uri:successScreen}}
        style={{height:'85%',width:'90%'}}
        resizeMode='contain'
        />
        {/* <View style={styles.successIconContainer}>
          <LinearGradient
            colors={['#00ff00', '#32ff32']}
            style={styles.glowEffect}
          />
          <LinearGradient
            colors={['#00cc00', '#00ff00']}
            style={styles.successIcon}
          >
            <Check color="#ffffff" size={32} strokeWidth={3} />
          </LinearGradient>
        </View> */}

        {/* Success Text */}
        {/* <Text style={styles.successTitle}>Submitted Successfully</Text>
        <Text style={styles.successDescription}>
          Your seller application has been{'\n'}
          successfully submitted. We'll review{'\n'}
          your details and get back to you soon!
        </Text> */}

        {/* Status Cards */}
        {/* <View style={styles.statusContainer}>
          <View style={styles.statusCard}>
           
            <Text style={styles.statusLabel}>Status</Text>
             <View style={styles.statusIconContainer}>
              <FileText color="#fff" size={24} strokeWidth={1.5} />
            </View>
            <Text style={styles.statusValue}>Under review</Text>
          </View>

          <View style={styles.statusCard}>
           
            <Text style={styles.statusLabel}>Est.Time</Text>
             <View style={styles.statusIconContainer}>
              <Clock color="#fff" size={24} strokeWidth={1.5} />
            </View>
            <Text style={styles.statusValue}>24 - 48 HRS</Text>
          </View>
        </View> */}
      </View>

      {/* Back to Home Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBackToHome}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.backButtonGradient}
        >
          <Text style={styles.backButtonText}>Back to home</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    // paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  glowEffect: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff00',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 60,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 280,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight:'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 40,
    borderRadius: 26,
    // padding:20,
    paddingHorizontal:20,
    // overflow: 'hidden',
  },
  backButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal:20,
    borderRadius:30,
    // paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default SuccessScreen;