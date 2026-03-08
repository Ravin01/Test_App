import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../Utils/Colors';
import { AWS_CDN_URL } from '../Utils/aws';
import Sound from 'react-native-sound';

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appicon } from '../assets/assets';
const {width} = Dimensions.get('window');

const InAppNotification = () => {
  const navigation = useNavigation();
  const [notification, setNotification] = useState(null);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
     const subscription1= DeviceEventEmitter.addListener('NotificationClicked', (notificationData) => {
      const type = notificationData.type;
      let routeName = '';
    console.log("NOTIFICATION DATA WHEN CLICKED",notificationData)
    })
    const subscription = DeviceEventEmitter.addListener(
      'inAppNotification',
      (data: any) => {
        // console.log('📱 In-app notification received:', data);
        showNotification(data);
        // playPause()
        // handleNotify(data);
      },
    );
    
    // loadAudio()
    return () => subscription.remove();
  }, []);
  // messaging().onMessage(async remoteMessage => {
  //   console.log('Message handled in the background!', remoteMessage);
  //   handleNotify(remoteMessage.data)
  // });
  const handleNotify=async(data)=>{
    console.log("handling notification")
    const roomId =await AsyncStorage.getItem('active_chat_room_id');
    if(data.chatData.chatRoomId==roomId){
      console.log("plyaing sound")
      // playPause()
    }
  }
  const playPause = () => {
    
    // if (!sound) {
    //   console.log('Audio not loaded yet');
    //   // Alert.alert('Error', 'Audio not loaded yet');
    //   return;
    // }
 const audioFile = new Sound('soundtrack.wav', Sound.MAIN_BUNDLE, (error) => {
      // setIsLoading(false);
      
      if (error) {
        console.log('Failed to load the sound', error);
        // Alert.alert('Error', 'Failed to load audio file');
        return;
      }
      
      // Audio loaded successfully
      // console.log('Audio loaded successfully');
      // console.log('Duration:', audioFile.getDuration(), 'seconds');
      setSound(audioFile);
    });
    // if (isPlaying) {
    //   // Pause the audio
    //   sound.pause(() => {
    //     setIsPlaying(false);
    //   });
    // } else {
      console.log('Audio playback failed tryinh');
      // Play the audio
      audioFile.play((success) => {
        if (success) {
          console.log('Audio played successfully');
        } else {
          // Alert.alert('Error', 'Failed to play audio');
        }
        setIsPlaying(false);
      });
    //   setIsPlaying(true);
    // }
  };
  // useEffect(() => {
  //   // Enable playback in silence mode (iOS)
  //   Sound.setCategory('Playback');
  //   // detectWithRingerMode
  //   // Load the audio file
  //   // loadAudio();
    
  //   // Cleanup when component unmounts
  //   return () => {
  //     if (sound) {
  //       sound.release();
  //     }
  //   };
  // }, []);


  const loadAudio = () => {
    // setIsLoading(true);
    
    // Load audio file from app bundle
    // Place your audio file in:
    // - Android: android/app/src/main/res/raw/
    // - iOS: Add to Xcode project bundle
    const audioFile = new Sound('soundtrack.wav', Sound.MAIN_BUNDLE, (error) => {
      // setIsLoading(false);
      
      if (error) {
        console.log('Failed to load the sound', error);
        // Alert.alert('Error', 'Failed to load audio file');
        return;
      }
      
      // Audio loaded successfully
      console.log('Audio loaded successfully');
      console.log('Duration:', audioFile.getDuration(), 'seconds');
      setSound(audioFile);
    });
  };
  const showNotification = (data: any) => {
    setNotification(data);

    // Slide down animation
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      // Auto-hide after 5 seconds
      Animated.delay(5000),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  const handleTap = () => {
    if (!notification) return;

    console.log('👆 User tapped in-app notification - navigating');
    
    // Navigate based on notification type
    if (notification.type === 'chat_message') {
      console.log('Navigating to ChatScreen');
      navigation.navigate('ChatScreen', {
        roomId: notification.chatData.chatRoomId,
        userId: notification.chatData.userId,
      });
    } else {
      console.log('Navigating to NotificationScreen');
      navigation.navigate('NotificationScreen', {
        notificationData: notification, // Pass notification data if needed
      });
    }

    // Hide notification
    hideNotification();
  };

  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <TouchableOpacity
        style={styles.notificationBody}
        onPress={handleTap}
        activeOpacity={0.8}>
        <View style={styles.content}>
          <View className='flex-row gap-1 items-center mb-2'>
            <Image 
              source={
                notification?.senderProfileURL?.key
                  ? {uri: `${AWS_CDN_URL}${notification.senderProfileURL.key}`}
                  : {uri:appicon}
              }
              style={{height: 30, width: 30, borderRadius: 50, backgroundColor: '#333'}}
            />
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={hideNotification}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50, // Account for status bar
    paddingHorizontal: 15,
  },
  notificationBody: {
    backgroundColor:'#121212',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});

export default InAppNotification;