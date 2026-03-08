import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  BackHandler,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../Utils/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { becomeSeller } from '../assets/assets';

const ForceUpdate = ({route}: any) => {
  const {force = true, updateUrl, message} = route?.params || {};
// console.log("ForceUpdate rendered with params:", route);
  const handleUpdate = () => {
    // if (updateUrl) {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.flykup.app').catch(err =>
        console.error('Failed to open update URL:', err),
      );
    // }
  };

  // Disable back button for force updates
  React.useEffect(() => {
    if (force) {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          return true; // Prevent back navigation
        },
      );

      return () => backHandler.remove();
    }
  }, [force]);
  const navigation=useNavigation()
  const handleMaybeLater = async() => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      navigation?.replace('bottomtabbar');
    } else {
      navigation?.replace('WelcomeScreen');
    }
    // Logic to dismiss the update prompt, e.g., navigate back or close modal
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={{uri:becomeSeller}}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {force ? '⚠️ Update Required' : '✨ Update Available'}
        </Text>

        <Text style={styles.subtitle}>
          {force
            ? 'A new version of FLYKUP is required to continue'
            : 'A new version of FLYKUP is available'}
        </Text>

        {message ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>What\'s New:</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : null}
{/* <TouchableOpacity onPress={() => {
  console.log("Update URL:", updateUrl);
} */}
        <LinearGradient
          colors={[colors.primaryButtonColor, colors.primaryButtonColor]}
          start={{x: 0, y: 0.5}}
          end={{x: 1, y: 0.5}}
          style={styles.updateButton}>
          <TouchableOpacity
            style={styles.updateButtonInner}
            onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>
              {force ? 'Update Now' : 'Update'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {!force && (
          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleMaybeLater}>
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>
          Stay up to date for the best FLYKUP experience
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryButtonColor,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  updateButton: {
    borderRadius: 16,
    width: '100%',
    height:60,
    marginBottom: 16,
  },
  updateButtonInner: {
    flex:1,
    paddingVertical: 16,
    // borderWidth:2,
    // borderColor:'#000',
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  laterButtonText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default ForceUpdate;
