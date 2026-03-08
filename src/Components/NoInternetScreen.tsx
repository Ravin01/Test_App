import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {colors} from '../Utils/Colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const NoInternetScreen = ({onRetry}: {onRetry?: () => void}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{scale: scaleAnim}],
          },
        ]}>
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="wifi-off" size={80} color="#F7CE45" />
        </View>

        {/* Title */}
        <Text style={styles.title}>No Internet Connection</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          You are offline. Please check your internet connection and try again.
        </Text>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.cloudContainer}>
            <MaterialIcons name="cloud-off" size={120} color="rgba(255,255,255,0.4)" />
          </View>
        </View>

        {/* Retry Button */}
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Additional Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>• Check your Wi-Fi or mobile data</Text>
          <Text style={styles.infoText}>• Make sure airplane mode is off</Text>
          <Text style={styles.infoText}>• Try restarting your router</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor || '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 100,
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudContainer: {
    opacity: 0.5,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7CE45',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 30,
    gap: 8,
    shadowColor: '#F7CE45',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
});

export default NoInternetScreen;
