import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { StyledButton } from '../AnimatedButtons';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

const SubscriptionScreen = ({navigation}) => {
  const features = [
    'Lorem ipsum dolor sit amet',
    'Lorem ipsum dolor sit amet',
    'Pro support from our team',
    'Early access to new features',
  ];

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={()=>navigation.goBack()}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title}>Subscribe</Text>
      <Text style={styles.subtitle}>Lorem ipsum dolor sit amet</Text>

      {/* Illustration Container */}
      <View style={styles.illustrationContainer}>
        {/* <Image source={require('../../assets/images/subscribe.png')}style={{height:150,width:150}} /> */}
        {/* <View style={styles.starsContainer}>
          <View style={[styles.star, { top: 20, left: 30 }]} />
          <View style={[styles.star, { top: 60, right: 40 }]} />
          <View style={[styles.star, { bottom: 80, left: 20 }]} />
          <View style={[styles.star, { bottom: 40, right: 30 }]} />
        </View> */}
      </View>

      {/* Features Card */}
    <View>
      <LinearGradient
      colors={['rgba(247, 206, 69, 0.66)', 'rgba(247, 206, 69, 0.3102)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
        style={styles.featuresCard}
      >
        <View style={styles.featuresContent}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>

                <Feather name="check" size={16} color="#F7CE45" />
           
              <Text style={styles.featureText}>{feature} </Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₹</Text>
            <Text style={styles.price}>199</Text>
            <View style={styles.originalPriceContainer}>
              <Text style={styles.originalPrice}>₹299</Text>
            </View>
          </View>
          <Text style={styles.duration}>Per month</Text>
        </View>

        {/* Buy Button */}
        <TouchableOpacity style={styles.buyButton}>
        
            <Text style={styles.buyButtonText}>Buy now</Text>
         
        </TouchableOpacity>
        {/* <StyledButton title={'submit'} onSubmit={()=>console.log()}/> */}
      </LinearGradient>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 15,
  },
  header: {
    // paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    // marginBottom: 120,.
  },
  illustrationContainer: {
    height: 200,
    justifyContent: 'center',
    // top:150,
    // right:100,
    alignItems: 'center',
    // marginBottom: 30,
    // position: 'absolute',
  },
  starsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  bagContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  bagBody: {
    width: 80,
    height: 100,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bagHandle: {
    position: 'absolute',
    top: -15,
    width: 40,
    height: 20,
    borderWidth: 3,
    borderColor: '#666',
    borderRadius: 10,
    borderBottomWidth: 0,
  },
  bagLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 10,
  },
  bagTop: {
    position: 'absolute',
    top: -5,
    width: 60,
    height: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bagTopGradient: {
    flex: 1,
    borderRadius: 8,
  },
  featuresCard: {
    borderRadius: 25,
    padding: 30,
    marginBottom: 50,
  },
  featuresContent: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:10,
    marginBottom: 15,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  pricingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  currency: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  price: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 5,
  },
  originalPriceContainer: {
    marginLeft: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: '#ccc',
    textDecorationLine: 'line-through',
  },
  duration: {
    fontSize: 16,
    color: '#ccc',
  },
  buyButton: {
    borderRadius: 25,
    backgroundColor:'#FFC100',
    padding:7,
    alignItems:'center',
    overflow: 'hidden',
  },
  buyButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default SubscriptionScreen;