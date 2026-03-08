import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ToastAndroid, Platform } from 'react-native';

/**
 * 🔥 SIMPLE PHONE TEST
 * This will show immediately if hot reload is working
 */

const SimplePhoneTest: React.FC = () => {
  useEffect(() => {
    console.log('🔥 SIMPLE PHONE TEST LOADED!');
    
    // Show toast on Android, alert on iOS
    const showMessage = () => {
      const message = '🚀 FLYKUP Performance System Active!';
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
      } else {
        Alert.alert('🚀 Success!', message);
      }
    };
    
    // Show message after 1 second
    setTimeout(showMessage, 1000);
    
    // Log to console for debugging
    console.log('📱 Device:', Platform.OS);
    console.log('🚀 Performance system ready!');
    
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔥 LIVE</Text>
      <Text style={styles.subtitle}>Performance Active</Text>
      <Text style={styles.time}>{new Date().toLocaleTimeString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: '#ff6600',
    padding: 8,
    borderRadius: 6,
    zIndex: 99999,
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  time: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default SimplePhoneTest;