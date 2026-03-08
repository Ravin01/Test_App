import React from 'react';
import {ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const CancelConfirmScreen = ({navigation}) => {
  return (
    <ScrollView contentContainerStyle={{flexGrow: 1}}>
    <View style={styles.container}> 

      <View style={styles.iconWrapper}>
        <View style={styles.outerCircle}>
          <View style={styles.middleCircle}>
            <View style={styles.innerCircle}>
              <Text style={styles.checkMark}>✔</Text>
            </View>
          </View>
        </View> 
      </View>

      <Text style={styles.title}>Cancellation Request Received</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What happens next?</Text>
        <Text style={styles.cardText}><Text style={{color:'#FFD700'}}>•</Text> Seller has 24 hours to approve your request</Text>
        <Text style={styles.cardText}><Text style={{color:'#FFD700'}}>•</Text> If approved, refund will be issued to your original payment method</Text>
        <Text style={styles.cardText}><Text style={{color:'#FFD700'}}>•</Text> You’ll receive email updates at every stage</Text>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={()=>   navigation.navigate("bottomtabbar" as never, {
              screen: 'HomeTabs',
              params: { screen: 'myactivity' }
            } as never)}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconWrapper: {
    marginBottom: 30,
  },
  outerCircle: {
    backgroundColor: '#6B572A',
    borderRadius: 100,
    padding: 10,
  },
  middleCircle: {
    backgroundColor: '#B18700',
    borderRadius: 80,
    padding: 20,
  },
  innerCircle: {
    backgroundColor: '#FFD700',
    borderRadius: 60,
    padding: 20,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 24,
    color: '#111',
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 120,
  },
  cardTitle: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
    alignSelf: 'center',
  },
  cardText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: '#FFD700',
    borderRadius: 30,
    width: '100%',
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CancelConfirmScreen;
