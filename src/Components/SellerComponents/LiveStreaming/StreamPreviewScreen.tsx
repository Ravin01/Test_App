import React, {useState, useRef, useEffect} from 'react';
import {
  Animated,
  Easing,
  ToastAndroid,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Picker,
  ScrollView,
  Dimensions,
  Platform,
  PermissionsAndroid,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ArrowLeftCircle, EarthIcon, Eye} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
const {width, height} = Dimensions.get('window');
import {Dropdown} from 'react-native-element-dropdown';
import NetInfo from '@react-native-community/netinfo';
import {permissions, mediaDevices, RTCView} from 'react-native-webrtc';
import axiosInstance from '../../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports

const videoQualityPresets = {
  low: {width: 640, height: 360},
  medium: {width: 1280, height: 720},
  high: {width: 1920, height: 1080},
};

const audioQualityPresets = {
  low: {sampleRate: 16000},
  medium: {sampleRate: 44100},
  high: {sampleRate: 48000},
};

const availableCameras = [
  {label: 'Front Camera', value: 'front'},
//  {label: 'Back Camera', value: 'back'},
];

const availableMicrophones = [
  {label: 'Built-in Mic', value: 'builtin'},
  {label: 'External Mic', value: 'external'},
];

const StreamPreviewScreen = ({navigation, route}) => {
  const {item} = route.params;

  const [selectedDevices, setSelectedDevices] = useState({
    camera: null,
    microphone: null,
  });
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' for front, 'environment' for back
  const [videoQuality, setVideoQuality] = useState('medium');
  const [audioQuality, setAudioQuality] = useState('medium');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [showData, setShowData] = useState({});

  const [testResults, setTestResults] = useState({
    camera: null,
    microphone: null,
    network: null,
  });
// console.log(item)
  const [testing, setTesting] = useState(false);

  const [stream, setStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(true);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  const startStream = async () => {
    try {
      const mediaStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: cameraFacing,
          ...videoQualityPresets[videoQuality],
        },
      });

      setStream(mediaStream);
      setIsPreviewActive(true);
      setIsMicMuted(false);
    } catch (err) {
      console.error('❌ Error accessing media devices:', err);
    }
  };

  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const stopStreams = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsPreviewActive(false);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(prev => !prev);
    }
  };

  const toggleCamera = async () => {
    // Animate icon
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      rotateAnim.setValue(0); // reset for next flip
    });

    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);

    if (isPreviewActive) {
      // Stop existing tracks
      stream?.getTracks().forEach(t => t.stop());

      // Restart with new camera
      const mediaStream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: newFacing,
          ...videoQualityPresets[videoQuality],
        },
      });

      setStream(mediaStream);
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const requestCameraPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Camera permission has been denied. App needs access to your camera for live streaming. Please enable it from settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
      }

      return false;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const requestMicPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Permission Required',
          'Microphone permission has been denied. App needs access to your microphone for live audio. Please enable it from settings.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
      }

      return false;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const runAllTests = async () => {
    setTesting(true);

    try {
      // const camPermission = await permissions.request({ name: 'camera' });
      // const micPermission = await permissions.request({ name: 'microphone' });

      // const isCameraOk = camPermission.state === 'granted';
      // const isMicOk = micPermission.state === 'granted';

      let cameraResult = true;
      let micResult = true;

      // Only request permissions on Android
      if (Platform.OS === 'android') {
        cameraResult = await requestCameraPermission();
        micResult = await requestMicPermission();
      }

      // Network Test
      const netState = await NetInfo.fetch();
      const isNetworkOk = netState.isConnected && netState.isInternetReachable;

      setTestResults({
        camera: cameraResult, //isCameraOk,
        microphone: micResult, //isMicOk,
        network: isNetworkOk,
      });
    } catch (error) {
      console.error('System test error:', error);
      setTestResults({
        camera: false,
        microphone: false,
        network: false,
      });
    }

    setTesting(false);
  };

  const getTestStatusIcon = status => {
    switch (status) {
      case true:
        return 'check-circle';
      case false:
        return 'cancel';
      case null:
      default:
        return 'hourglass-empty';
    }
  };

  const getTestStatusColor = status => {
    switch (status) {
      case true:
        return 'green';
      case false:
        return 'red';
      case null:
      default:
        return 'orange';
    }
  };

  const handleStartStream = () => {
    if (testResults.camera && testResults.microphone && testResults.network) {
      navigation.navigate('Streaming', {item:{...showData,role:item?.role}});
      return; // Prevent further execution
    }

    ToastAndroid.show('Complete system test to continue.', ToastAndroid.SHORT);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  useEffect(() => {
    const fetchShowData = async () => {
            
      try {
        setIsPreviewActive(false)
         const response = await axiosInstance.get(`/shows/get/${item?._id}`);
            setShowData(response.data.data)
           
      } catch (err) { console.log("error from preview",err.response.data.message)}finally{
        setIsPreviewActive(true)
      }
    };
    fetchShowData()
  }, [item?._id]);
// console.log(item)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Live Preview</Text>
          </View>
        </LinearGradient>
      </View>
      <ScrollView  showsVerticalScrollIndicator={false}>
        {/* Preview Box */}
        <View style={styles.previewBox}>
          {/* <Text style={styles.auctionPreview}>Auction preview</Text> */}
          <View style={styles.previewContent}>
            {stream ? (
              <RTCView
                streamURL={stream.toURL()}
                style={StyleSheet.absoluteFillObject}
                objectFit="cover"
                // mirror={true}
              />
            ) : (
              <>
                <Icon name="videocam-off" size={32} color="#888" />
              </>
            )}

            <View style={styles.iconRow}>
              <TouchableOpacity
                style={styles.roundRedButton}
                onPress={toggleMic}>
                <Icon
                  name={isMicMuted ? 'mic-off' : 'mic'}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roundGreenButton}
                onPress={isPreviewActive ? stopStreams : startStream}>
                <Icon
                  name={isPreviewActive ? 'videocam' : 'videocam-off'}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.roundBlackButton}
                onPress={toggleCamera}>
                <Animated.View
                  style={{transform: [{rotateY: rotateInterpolate}]}}>
                  <Icon name="flip-camera-ios" size={20} color="white" />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quality Settings */}
        <View style={styles.sectionTitleContainer}>
          <Icon name="settings" size={16} color={'#FFD700'} />
          <Text style={styles.sectionTitle}>Quality Settings</Text>
        </View>

        <View style={styles.dropdownSection}>
          <Text style={styles.dropdownLabel}>Video Quality</Text>
          {/* <View style={styles.dropdown}>
          <Text style={styles.dropdownText}>1080p HD</Text>
        </View> */}
          <Dropdown
            data={Object.keys(videoQualityPresets).map(q => ({
              label: `${q} (${videoQualityPresets[q].width}x${videoQualityPresets[q].height})`,
              value: q,
            }))}
            labelField="label"
            valueField="value"
            value={videoQuality}
            onChange={item => setVideoQuality(item.value)}
            style={styles.dropdown}
            placeholder="Select Video Quality"
            placeholderStyle={{color: '#888'}}
            selectedTextStyle={{color: '#fff'}}
            itemTextStyle={{color: '#fff'}}
            containerStyle={{backgroundColor: '#2e2e2e'}}
            renderItem={(item, selected) => (
              <View style={[styles.item, selected && styles.selectedItem]}>
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            )}
          />

          <Text style={styles.dropdownLabel}>Audio Quality</Text>
          <Dropdown
            data={Object.keys(audioQualityPresets).map(q => ({
              label: `${q} (${audioQualityPresets[q].sampleRate}Hz)`,
              value: q,
            }))}
            labelField="label"
            valueField="value"
            value={audioQuality}
            onChange={item => setAudioQuality(item.value)}
            style={styles.dropdown}
            placeholder="Select Audio Quality"
            placeholderStyle={{color: '#888'}}
            selectedTextStyle={{color: '#fff'}}
            itemTextStyle={{color: '#fff'}}
            containerStyle={{backgroundColor: '#2e2e2e'}}
            renderItem={(item, selected) => (
              <View style={[styles.item, selected && styles.selectedItem]}>
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            )}
          />
        </View>

        {/* Device Selection */}
        <View style={styles.sectionTitleContainer}>
          <Icon name="desktop-windows" size={16} color={'#FFD700'} />
          <Text style={styles.sectionTitle}>Device Selection</Text>
        </View>

        <View style={styles.dropdownSection}>
          <Text style={styles.dropdownLabel}>Camera</Text>
          {/* <View style={styles.dropdown}>
          <Text style={styles.dropdownText}>Front Camera</Text>
        </View> */}
          <Dropdown
            data={availableCameras}
            labelField="label"
            valueField="value"
            //value={selectedDevices.camera}
            value={selectedDevices.camera || availableCameras[0].value}
            onChange={item =>
              setSelectedDevices(prev => ({...prev, camera: item.value}))
            }
            style={styles.dropdown}
            placeholder="Select Camera"
            placeholderStyle={{color: '#888'}}
            selectedTextStyle={{color: '#fff'}}
            itemTextStyle={{color: '#fff'}}
            containerStyle={{backgroundColor: '#2e2e2e'}}
            renderItem={(item, selected) => (
              <View style={[styles.item, selected && styles.selectedItem]}>
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            )}
          />
          {/* <Text style={styles.dropdownLabel}>Microphone</Text>
          <Dropdown
            data={availableMicrophones}
            labelField="label"
            valueField="value"
            value={selectedDevices.microphone}
            onChange={item =>
              setSelectedDevices(prev => ({...prev, microphone: item.value}))
            }
            style={styles.dropdown}
            placeholder="Select Microphone"
            placeholderStyle={{color: '#888'}}
            selectedTextStyle={{color: '#fff'}}
            itemTextStyle={{color: '#fff'}}
            containerStyle={{backgroundColor: '#2e2e2e'}}
            renderItem={(item, selected) => (
              <View style={[styles.item, selected && styles.selectedItem]}>
                <Text style={styles.itemText}>{item.label}</Text>
              </View>
            )}
          /> */}
        </View>

        {/* System Test */}
        <View style={styles.sectionTitleContainer}>
          <Icon name="science" size={17} color={'#FFD700'} />
          <Text style={styles.sectionTitle}>System Test</Text>
        </View>
        <View style={styles.testRow}>
          <Icon name="videocam" size={22} color="gray" />
          <Text style={styles.testText}>Camera Test</Text>
          <Icon
            name={getTestStatusIcon(testResults.camera)}
            size={20}
            color={getTestStatusColor(testResults.camera)}
          />
        </View>
        <View style={styles.testRow}>
          <Icon name="mic" size={22} color="gray" />
          <Text style={styles.testText}>Microphone Test</Text>
          <Icon
            name={getTestStatusIcon(testResults.microphone)}
            size={20}
            color={getTestStatusColor(testResults.microphone)}
          />
        </View>
        <View style={styles.testRow}>
          <Icon name="wifi" size={22} color="gray" />
          <Text style={styles.testText}>Network Test</Text>
          <Icon
            name={getTestStatusIcon(testResults.network)}
            size={20}
            color={getTestStatusColor(testResults.network)}
          />
        </View>

        <TouchableOpacity
          style={styles.runTestBtn}
          onPress={runAllTests}
          disabled={testing}>
          <Icon name="play-arrow" size={20} />
          <Text style={styles.runTestText}>
            {testing ? 'Testing...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>

        {/* Start Auction Button */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStartStream}>
          <Icon
            name="gavel"
            size={16}
            color={'#fff'}
            style={{transform: [{scaleX: -1}]}}
          />
          <Text style={styles.startBtnText}> Start Streaming</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    padding: 16,
    flex: 1,
  },
  backButton: {
    marginBottom: 8,
  },
  previewBox: {
    backgroundColor: '#1b1b1b',
    borderRadius: 10,
    padding: 0,
    marginBottom: 20,
  },
  auctionPreview: {
    alignSelf: 'center',
    color: 'orange',
    fontWeight: 'bold',
    marginBottom: 8,
    borderColor: 'orange',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
  },
  previewContent: {
    height: 180, //160,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    // marginTop: 12,
    width: '100%',
    position: 'absolute',
    bottom: 12,
  },
  roundRedButton: {
    backgroundColor: 'red',
    borderRadius: 30,
    padding: 12,
  },
  roundGreenButton: {
    backgroundColor: 'green',
    borderRadius: 30,
    padding: 12,
  },
  roundBlackButton: {
    backgroundColor: '#444',
    borderRadius: 30,
    padding: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginVertical: 12,
  },
  dropdownSection: {
    marginBottom: 20,
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: 12,
  },
  dropdownLabel: {
    color: '#ccc',
    marginBottom: 4,
    marginTop: 8,
  },
  dropdown: {
    backgroundColor: '#121212',
    borderRadius: 6,
    padding: 10,
  },
  dropdownText: {
    color: '#fff',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  testText: {
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  runTestBtn: {
    backgroundColor: '#ffcc00',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  runTestText: {
    color: '#000',
    fontWeight: 'bold',
  },
  startBtn: {
    backgroundColor: '#00b050',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 60,
  },
  startBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },

  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.1,
    paddingBottom:10,
    // paddingVertical: height * 0.01,
    // paddingHorizontal: width * 0.02,
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    marginRight: 20,
  },

  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  selectedItem: {
    backgroundColor: '#444', // Change this to any highlight color you want
  },
  itemText: {
    color: '#fff',
  },
});

export default StreamPreviewScreen;
