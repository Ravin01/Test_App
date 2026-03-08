import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';

/**
 * 🧪 QUICK HOT RELOAD TEST
 * Add this temporarily to any screen to test hot reload
 */

const QuickTest: React.FC = () => {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    // Update timestamp to show hot reload is working
    setTimestamp(Date.now());
    
    // Test console logging
    console.log('🧪 QuickTest mounted at:', new Date().toLocaleTimeString());
    
    // Test performance imports
    try {
      console.log('🚀 Testing Performance System...');
      
      // Show alert to confirm on device
      setTimeout(() => {
        Alert.alert(
          '🚀 FLYKUP Performance System', 
          `Hot Reload Working!\n\nTimestamp: ${new Date().toLocaleTimeString()}\n\n✅ Performance system is integrated and ready!`,
          [{ text: 'Awesome! 🎉' }]
        );
      }, 1000);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      Alert.alert('❌ Error', `Test failed: ${error.message}`);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 HOT RELOAD TEST</Text>
      <Text style={styles.subtitle}>Performance System Ready!</Text>
      <Text style={styles.timestamp}>
        {new Date(timestamp).toLocaleTimeString()}
      </Text>
      <Text style={styles.status}>✅ Ultra Performance Activated</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0,255,0,0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff00',
    zIndex: 10000,
  },
  title: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  subtitle: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  timestamp: {
    color: '#ff6600',
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  status: {
    color: '#00ff00',
    fontSize: 8,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});

export default QuickTest;