import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, MapPin, Navigation } from 'lucide-react-native';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const DeliveryAddressScreen = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container} >
      {/* <StatusBar barStyle="light-content" backgroundColor="#E6B800" /> */}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={()=>navigation.goBack()}>
          <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add delivery address</Text>
      </View>

      {/* Main Content */}
      <LinearGradient
        colors={['#4A4A2A', '#2D2D1A', '#1A1A0F']}

        style={styles.mainContent}
      >
        {/* Map Pin Circle */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPinCircle}>
            <View style={styles.mapPinInner}>
              <MapPin color="#FFF" size={28} />
              {/* <Image source={require('../../assets/images/locate.png')} style={{height:60,width:60}}/> */}
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.mainTitle}>Add your delivery address</Text>
          <Text style={styles.subtitle}>
            Enter your pickup location to manage{'\n'}deliveries smoothly.
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.manualButton} onPress={()=>navigation.navigate('AddressForm',{item:{header:true}})}>
            <Text style={styles.manualButtonText}>Add address manually</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.locationButton}onPress={()=>navigation.navigate('MapDeliveryScreen')}>
            {/* <Navigation color="#000" size={20} /> */}
            <Text style={styles.locationButtonText}>📍 Use My Current Location</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6B800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6B800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // justifyContent:'space-evenly',
    elevation: 0,
  },
  backButton: {
    marginRight: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  mainContent: {
    flex: 1,
    // alignItems:'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    // paddingBottom: 40,
  },
  mapContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mapPinCircle: {
    width: 140,
    height: 140,
    borderRadius: 100,
    // backgroundColor: 'rgba(184, 134, 11, 0.8)',
    backgroundColor:'#FDD12214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinInner: {
    width: 180,
    height: 180,
    borderRadius: 140,
    backgroundColor: '#FDD12214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#B8B8B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    gap: 16,
padding:20,
  },
  manualButton: {
    backgroundColor: '#E6B800',
    paddingVertical:10,
    // paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  locationButton: {
    backgroundColor: '#E6B800',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // gap: 8,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default DeliveryAddressScreen;