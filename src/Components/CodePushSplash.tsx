import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { appicon } from '../assets/assets';
import { colors } from '../Utils/Colors';

const { width } = Dimensions.get('window');

interface CodePushSplashProps {
  downloadProgress: number;
  isDownloading: boolean;
  status: string;
  isRestarting?: boolean; // New prop for restart state
  isChecking?: boolean; // New prop for checking state
}

const CodePushSplash: React.FC<CodePushSplashProps> = ({
  downloadProgress,
  isDownloading,
  status,
  isRestarting = false,
  isChecking = false,
}) => {
  const progressWidth = (downloadProgress / 100) * (width - 80);
  
  // Animated opacity for pulsing effect during restart/checking
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isRestarting || isChecking) {
      // Create pulsing animation for updating/checking states
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    }
  }, [isRestarting, isChecking, pulseAnim]);

  // Determine what to show based on state
  const showProgressBar = isDownloading && downloadProgress > 0;
  const showSpinner = isChecking || isRestarting || (isDownloading && downloadProgress === 0);

  return (
    <View style={styles.overlay}>
      <StatusBar 
        backgroundColor="#000000" 
        barStyle="light-content" 
        translucent={false}
      />
      
      {/* Main Container */}
      <View style={styles.container}>
        
        {/* Center Logo - Fixed in the middle of screen */}
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: appicon }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Bottom Section - Progress bar and status */}
        <View style={styles.bottomSection}>
          {/* Status Text with pulse animation during restart */}
          {/* {status ? (
            <Animated.Text 
              style={[
                styles.statusText,
                (isRestarting || isChecking) && { opacity: pulseAnim }
              ]}
            >
              {status}
            </Animated.Text>
          ) : null} */}
          
          {/* Loading Indicator when checking or restarting */}
          {/* {showSpinner && (
            <ActivityIndicator 
              size="small" 
              color={colors.primaryButtonColor || '#FFD700'} 
              style={styles.spinner} 
            />
          )} */}
          
          {/* Progress Bar Container - Only show when actually downloading with progress */}
          {showProgressBar && (
            <View style={styles.progressContainer}>
              {/* Background Track */}
              <View style={styles.progressTrack}>
                {/* Progress Fill */}
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: progressWidth > 0 ? progressWidth : 0 },
                  ]}
                />
              </View>
              
              {/* Percentage Text */}
              {/* <Text style={styles.percentageText}>
                {Math.round(downloadProgress)}%
              </Text> */}
            </View>
          )}
          
          {/* Footer Text */}
          {(isDownloading || isRestarting) && (
            <Text style={styles.footerText}>
              {isRestarting ? 'Applying update...' : 'Updating your experience...'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: Platform.OS === 'android' ? 9999 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Logo centered in the middle of the screen
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  // Bottom section for progress bar and status
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 15,
    opacity: 0.8,
    textAlign: 'center',
  },
  spinner: {
    marginBottom: 10,
  },
  progressContainer: {
    width: width - 80,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryButtonColor || '#FFD700',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 10,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
    letterSpacing: 0.5,
    marginTop: 15,
  },
});

export default CodePushSplash;
