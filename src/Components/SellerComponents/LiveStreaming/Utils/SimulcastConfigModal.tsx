import React, { useState, useEffect , useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Switch,
  Modal,
  ToastAndroid, Image
} from 'react-native';
import axios from '../../../../Utils/Api';
import {
  GET_SIMULCAST_CONFIG,
  UPDATE_YOUTUBE_CONFIG,
  UPDATE_INSTAGRAM_CONFIG,
  START_YOUTUBE_SIMULCAST,
  START_INSTAGRAM_SIMULCAST,
  STOP_YOUTUBE_SIMULCAST,
  STOP_INSTAGRAM_SIMULCAST,
  GET_SIMULCAST_STATUS,
  STOP_ALL_SIMULCASTS,
  YOUTUBE_AUTH_URL
} from '../../../../../Config';

import { AppState } from 'react-native';
import { instagram, youTube } from '../../../../assets/assets';

const SimulcastConfigModal = ({ streamId, streamData, onSimulcastUpdate }) => {
  const [config, setConfig] = useState({
    enabled: false,
    status: 'inactive',
    platforms: {
      youtube: {
        enabled: false,
        hasStreamKey: false,
        title: '',
        description: '',
        privacy: 'public',
        status: 'inactive'
      },
      instagram: {
        enabled: false,
        hasStreamKey: false,
        hasRtmpUrl: false,
        title: '',
        status: 'inactive'
      }
    }
  });

  const [loading, setLoading] = useState({
    config: false,
    youtube: false,
    instagram: false,
    simulcast: false
  });

  const [showYouTubeConfig, setShowYouTubeConfig] = useState(false);
  const [showInstagramConfig, setShowInstagramConfig] = useState(false);
  const [showInstagramHelp, setShowInstagramHelp] = useState(false);
  const [errors, setErrors] = useState({});
  const [youtubeErrorDetails, setYoutubeErrorDetails] = useState(null);

  const appState = useRef(AppState.currentState);

useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // User just returned from browser
      setLoading(prev => ({ ...prev, youtube: false }));

      // Optionally retry or refresh config
      loadSimulcastConfig();
    }
    appState.current = nextAppState;
  });

  return () => {
    subscription.remove();
  };
}, []);

  // YouTube form data
  const [youtubeForm, setYoutubeForm] = useState({
    title: 'Live Stream',
    description: 'Live streaming from Flykup',
    privacy: 'public'
  });

  // Instagram form data
  const [instagramForm, setInstagramForm] = useState({
    streamKey: '',
    rtmpUrl: '',
    title: 'Live Stream',
    showStreamKey: false
  });

  // Load simulcast configuration on mount
  useEffect(() => {
    if (streamId) {
      loadSimulcastConfig();
    }
  }, [streamId]);

  const loadSimulcastConfig = async () => {
    console.log('loadSimulcast called.....................');
    setLoading(prev => ({ ...prev, config: true }));
    const url = GET_SIMULCAST_CONFIG(streamId)
    console.log('url',url);
    try {
      const response = await axios.get(GET_SIMULCAST_CONFIG(streamId));

      console.log('simulcast config',response.data.data);
      if (response.data.status) {
        setConfig(response.data.data);
      //  console.log('config res', response.data.data);

        // Update form data from loaded config
        setYoutubeForm(prev => ({
          ...prev,
          title: response.data.data.platforms.youtube.title || prev.title,
          description: response.data.data.platforms.youtube.description || prev.description,
          privacy: response.data.data.platforms.youtube.privacy || prev.privacy
        }));

        setInstagramForm(prev => ({
          ...prev,
          title: response.data.data.platforms.instagram.title || prev.title,
          rtmpUrl: response.data.data.platforms.instagram.rtmpUrl || prev.rtmpUrl,
          streamKey: response.data.data.platforms.instagram.streamKey || prev.streamKey
        }));
      }
    } catch (error) {
      console.error('Error loading simulcast config:', error);
      setErrors(prev => ({ ...prev, config: 'Failed to load configuration' }));
    } finally {
      setLoading(prev => ({ ...prev, config: false }));
    }
  };


  const handleYouTubeAuthError = (errorInfo) => {
    console.error('YouTube Auth Error:', errorInfo);

    // Store detailed error info for inline display
    setYoutubeErrorDetails(errorInfo);
    setErrors(prev => ({ ...prev, youtube: errorInfo.error || errorInfo.message || 'YouTube connection failed' }));
  };

  const handleYouTubeConnect = async () => {
    try {
      const response = await axios.get(YOUTUBE_AUTH_URL, {
        params: { 
          streamId 
        }
      });

      if (response.data.success) {
        setLoading(prev => ({ ...prev, youtube: true }));
        
        // Open YouTube OAuth URL in browser
        const authUrl = response.data.data.authUrl;
        const canOpen = await Linking.canOpenURL(authUrl);

        console.log('authUrl',authUrl);

    //   const urlObj = new URL(authUrl);
    //   const params = Object.fromEntries(urlObj.searchParams.entries());

    //   console.log('urlobj',urlObj);
    //   console.log('params', params);
        
        if (canOpen) {
       //   await Linking.openURL(authUrl);
          
          // Show alert to user about returning to app
          Alert.alert(
            'YouTube Authentication',
            'Complete the authentication in your browser, then return to the app.',
            [
              {
                text: 'Cancel',
                onPress: () => setLoading(prev => ({ ...prev, youtube: false })),
                style: 'cancel'
              },
              {
                text: 'Proceed',  //'I\'ve Completed Auth',
                // onPress: () => {
                //   // In a real app, you'd handle the OAuth callback differently
                //   // For now, we'll just reload the config
                //   loadSimulcastConfig();
                //   setLoading(prev => ({ ...prev, youtube: false }));
                // }

                onPress: async () => {
                try {
                  await Linking.openURL(authUrl);
                  // Optionally handle after returning from browser
                  // loadSimulcastConfig();
                } catch (err) {
                  console.error('Error opening authUrl:', err);
                  Alert.alert('Error', 'Failed to open YouTube authentication URL');
                } finally {
                 // setLoading(prev => ({ ...prev, youtube: false }));
                }
              }
              }
            ]
          );

        } else {
          Alert.alert('Error', 'Cannot open YouTube authentication URL');
          setLoading(prev => ({ ...prev, youtube: false }));
        }
      }
    } catch (error) {
      console.error('Error initiating YouTube OAuth:', error);
      Alert.alert('Error', 'Failed to connect to YouTube');
      setLoading(prev => ({ ...prev, youtube: false }));
    }
  };

  const handleInstagramConfig = async () => {
    // Validation
    if (!instagramForm.streamKey.trim()) {
      Alert.alert('Error', 'Stream key is required');
      return;
    }

    if (!instagramForm.rtmpUrl.trim()) {
      Alert.alert('Error', 'RTMP URL is required');
      return;
    }

    // Basic URL validation
    if (!instagramForm.rtmpUrl.startsWith('rtmp://') && !instagramForm.rtmpUrl.startsWith('rtmps://')) {
      Alert.alert('Error', 'RTMP URL must start with rtmp:// or rtmps://');
      return;
    }

    setLoading(prev => ({ ...prev, instagram: true }));
    setErrors(prev => ({ ...prev, instagram: null }));

    try {
      const configData = {
        streamKey: instagramForm.streamKey.trim(),
        rtmpUrl: instagramForm.rtmpUrl.trim(),
        title: instagramForm.title.trim() || 'Live Stream'
      };

      console.log('insta payload', configData);

      const response = await axios.post(UPDATE_INSTAGRAM_CONFIG(streamId), configData);

      console.log('insta config update res',response);

      if (response.data.status) {
        // Update config state
        setConfig(prev => ({
          ...prev,
          platforms: {
            ...prev.platforms,
            instagram: {
              ...prev.platforms.instagram,
              ...response.data.data.instagram,
              enabled: true,
              hasStreamKey: true,
              hasRtmpUrl: true
            }
          }
        }));

        setErrors(prev => ({ ...prev, instagram: null }));
        setShowInstagramConfig(false);
        Alert.alert('Success', 'Instagram configuration saved successfully');
      } else {
        throw new Error(response.data.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error updating Instagram config:', error);
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to save Instagram configuration';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, instagram: false }));
    }
  };

  const handleStartPlatform = async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));
    
    try {
      const endpoint = platform === 'youtube' ? START_YOUTUBE_SIMULCAST : START_INSTAGRAM_SIMULCAST;
      const response = await axios.post(endpoint(streamId));
      
      if (response.data.status) {
        await loadSimulcastConfig();
          ToastAndroid.show(
              `${platform.charAt(0).toUpperCase() + platform.slice(1)} simulcast started`,
              ToastAndroid.SHORT
          );
      } else {
        throw new Error(response.data.msg || `Failed to start ${platform} simulcast`);
      }
    } catch (error) {
      console.error(`Error starting ${platform}:`, error);
      Alert.alert('Error', error.response?.data?.msg || error.message);
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleStopPlatform = async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));
    
    try {
      const endpoint = platform === 'youtube' ? STOP_YOUTUBE_SIMULCAST : STOP_INSTAGRAM_SIMULCAST;
      await axios.post(endpoint(streamId));
      await loadSimulcastConfig();
      ToastAndroid.show(
    `${platform.charAt(0).toUpperCase() + platform.slice(1)} simulcast stopped`,
    ToastAndroid.SHORT
  );
    } catch (error) {
      console.error(`Error stopping ${platform}:`, error);
      Alert.alert('Error', error.response?.data?.msg || error.message);
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

const handleYouTubeAuthSuccess = async (authData) => {
    setLoading(prev => ({ ...prev, youtube: true }));
    try {
      const updateData = {
        streamKey: authData.streamKey,
        title: youtubeForm.title,
        description: youtubeForm.description,
        privacy: youtubeForm.privacy,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken
      };
      const response = await axios.post(UPDATE_YOUTUBE_CONFIG(streamId), updateData);
      if (response.data.status) {
        setConfig(prev => ({
          ...prev,
          platforms: {
            ...prev.platforms,
            youtube: {
              ...prev.platforms.youtube,
              ...response.data.data.youtube
            }
          }
        }));
        setErrors(prev => ({ ...prev, youtube: null }));
        console.log('YouTube configuration updated successfully');
      }
    } catch (error) {
      console.error('Error updating YouTube config:', error);
      setErrors(prev => ({ ...prev, youtube: 'Failed to save YouTube configuration' }));
    } finally {
      setLoading(prev => ({ ...prev, youtube: false }));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'streaming': return styles.statusStreaming;
      case 'starting': return styles.statusStarting;
      case 'stopping': return styles.statusStopping;
      case 'error': return styles.statusError;
      default: return styles.statusInactive;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'streaming': return 'Live';
      case 'starting': return 'Starting...';
      case 'stopping': return 'Stopping...';
      case 'error': return 'Error';
      default: return 'Inactive';
    }
  };

  if (loading.config) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading configuration...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* <Text style={styles.title}>Simulcast Configuration</Text> */}
        <Text style={styles.subtitle}>Stream to multiple platforms simultaneously</Text>
      </View>

      {/* YouTube Configuration */}
      <View style={styles.platformCard}>
        <View style={styles.platformHeader}>
          <View style={styles.platformInfo}>
            {/* <View style={[styles.platformIcon, styles.youtubeIcon]}>
              <Text style={styles.iconText}>YT</Text>
            </View> */}
            <Image style= {styles.icon} source={{uri:youTube}} />
            <View style={styles.platformDetails}>
              <Text style={styles.platformName}>YouTube</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status: </Text>
                <Text style={[styles.statusText, getStatusColor(config.platforms.youtube.status)]}>
                  {getStatusText(config.platforms.youtube.status)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.platformActions}>
            {config.platforms.youtube.hasStreamKey ? (
              <View style={styles.actionButtons}>
                <Text style={styles.connectedText}>✓ Connected</Text>
                <TouchableOpacity
                  onPress={() => setShowYouTubeConfig(!showYouTubeConfig)}
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsButtonText}>Settings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleYouTubeConnect}
                disabled={loading.youtube}
                style={[styles.connectButton, styles.youtubeButton, loading.youtube && styles.disabledButton]}
              >
                {loading.youtube ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>Connect</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* YouTube Settings Modal */}
        <Modal
          visible={showYouTubeConfig}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>YouTube Settings</Text>
              <TouchableOpacity
                onPress={() => setShowYouTubeConfig(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Stream Title</Text>
                <TextInput
                  value={youtubeForm.title}
                  onChangeText={(text) => setYoutubeForm(prev => ({ ...prev, title: text }))}
                  style={styles.textInput}
                  placeholder="Enter stream title"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  value={youtubeForm.description}
                  onChangeText={(text) => setYoutubeForm(prev => ({ ...prev, description: text }))}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter stream description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Privacy</Text>
                <View style={styles.privacyButtons}>
                  {['public', 'unlisted', 'private'].map((privacy) => (
                    <TouchableOpacity
                      key={privacy}
                      onPress={() => setYoutubeForm(prev => ({ ...prev, privacy }))}
                      style={[
                        styles.privacyButton,
                        youtubeForm.privacy === privacy && styles.privacyButtonActive
                      ]}
                    >
                      <Text style={[
                        styles.privacyButtonText,
                        youtubeForm.privacy === privacy && styles.privacyButtonTextActive
                      ]}>
                        {privacy.charAt(0).toUpperCase() + privacy.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* YouTube Controls */}
        {config.platforms.youtube.enabled && (
          <View style={styles.platformControls}>
            <TouchableOpacity
              onPress={() => {
                if (config.platforms.youtube.status === 'streaming') {
                  handleStopPlatform('youtube');
                } else {
                  handleStartPlatform('youtube');
                }
              }}
              disabled={loading.youtube || (config.platforms.youtube.status !== 'streaming' && streamData?.streamStatus !== 'live')}
              style={[
                styles.controlButton,
                config.platforms.youtube.status === 'streaming' ? styles.stopButton : styles.startButton,
                (loading.youtube || (config.platforms.youtube.status !== 'streaming' && streamData?.streamStatus !== 'live')) && styles.disabledButton
              ]}
            >
              {loading.youtube ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {config.platforms.youtube.status === 'streaming' ? 'Stop YouTube' : 'Start YouTube'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Instagram Configuration */}
      <View style={styles.platformCard}>
        <View style={styles.platformHeader}>
          <View style={styles.platformInfo}>
            {/* <View style={[styles.platformIcon, styles.instagramIcon]}>
              <Text style={styles.iconText}>IG</Text>
            </View> */}
            <Image source={{uri:instagram}} style={styles.icon} />
            <View style={styles.platformDetails}>
              <Text style={styles.platformName}>Instagram</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Status: </Text>
                <Text style={[styles.statusText, getStatusColor(config.platforms.instagram.status)]}>
                  {getStatusText(config.platforms.instagram.status)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.platformActions}>
            {config.platforms.instagram.enabled ? (
              <View style={styles.actionButtons}>
                <Text style={styles.connectedText}>✓ Configured</Text>
                <TouchableOpacity
                  onPress={() => setShowInstagramConfig(true)}
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowInstagramConfig(true)}
                style={[styles.connectButton, styles.instagramButton]}
              >
                <Text style={styles.buttonText}>Configure</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Instagram Configuration Modal */}
        <Modal
          visible={showInstagramConfig}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Instagram Live Setup</Text>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity
                  onPress={() => setShowInstagramHelp(true)}
                  style={styles.helpButton}
                >
                  <Text style={styles.helpButtonText}>Help</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowInstagramConfig(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>RTMP Server URL</Text>
                <TextInput
                  value={instagramForm.rtmpUrl}
                  onChangeText={(text) => setInstagramForm(prev => ({ ...prev, rtmpUrl: text }))}
                  style={styles.textInput}
                  placeholder="rtmps://live-api-s.facebook.com:443/rtmp/"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.helpText}>The RTMP server URL from Instagram Live settings</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stream Key</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    value={instagramForm.streamKey}
                    onChangeText={(text) => setInstagramForm(prev => ({ ...prev, streamKey: text }))}
                    style={[styles.textInput, styles.passwordInput]}
                    placeholder="Your Instagram stream key"
                    secureTextEntry={!instagramForm.showStreamKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setInstagramForm(prev => ({ ...prev, showStreamKey: !prev.showStreamKey }))}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeButtonText}>
                      {instagramForm.showStreamKey ? '👁️‍🗨️' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helpText}>Keep this secret! Stream key from Instagram Live settings</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stream Title</Text>
                <TextInput
                  value={instagramForm.title}
                  onChangeText={(text) => setInstagramForm(prev => ({ ...prev, title: text }))}
                  style={styles.textInput}
                  placeholder="My Live Stream"
                />
                <Text style={styles.helpText}>Title for your live stream (optional)</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={handleInstagramConfig}
                  disabled={loading.instagram || !instagramForm.rtmpUrl || !instagramForm.streamKey}
                  style={[
                    styles.saveButton,
                    (loading.instagram || !instagramForm.rtmpUrl || !instagramForm.streamKey) && styles.disabledButton
                  ]}
                >
                  {loading.instagram ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Save Configuration</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Instagram Help Modal */}
        <Modal
          visible={showInstagramHelp}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to get Instagram Live{`\n`}RTMP details</Text>
              <TouchableOpacity
                onPress={() => setShowInstagramHelp(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.helpContent}>
                <Text style={styles.stepTitle}>Follow these steps:</Text>
                <View style={styles.stepList}>
                  <Text style={styles.step}>1. Open Instagram on your phone</Text>
                  <Text style={styles.step}>2. Go to your profile and tap the "+" icon</Text>
                  <Text style={styles.step}>3. Select "Live"</Text>
                  <Text style={styles.step}>4. Look for "Go Live with External Software" or RTMP settings</Text>
                  <Text style={styles.step}>5. Copy the Server URL and Stream Key</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Instagram Controls */}
        {config.platforms.instagram.enabled && (
          <View style={styles.platformControls}>
            <TouchableOpacity
              onPress={() => {
                if (config.platforms.instagram.status === 'streaming') {
                  handleStopPlatform('instagram');
                } else {
                  handleStartPlatform('instagram');
                }
              }}
              disabled={loading.instagram || (config.platforms.instagram.status !== 'streaming' && streamData?.streamStatus !== 'live')}
              style={[
                styles.controlButton,
                config.platforms.instagram.status === 'streaming' ? styles.stopButton : styles.startButton,
                (loading.instagram || (config.platforms.instagram.status !== 'streaming' && streamData?.streamStatus !== 'live')) && styles.disabledButton
              ]}
            >
              {loading.instagram ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {config.platforms.instagram.status === 'streaming' ? 'Stop Instagram' : 'Start Instagram'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stream Status Warning */}
      {streamData?.streamStatus !== 'live' && (config.platforms.youtube.enabled || config.platforms.instagram.enabled) && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>Stream must be live to start simulcast</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background
    borderRadius: 30,
    marginBottom: 10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
    borderRadius: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#9CA3AF',
  },
  header: {
    backgroundColor: '#111',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign:'center'
  },
  platformCard: {
    backgroundColor: '#222',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  youtubeIcon: {
    backgroundColor: '#DC2626',
  },
  instagramIcon: {
    backgroundColor: '#DB2777',
  },
  iconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  platformDetails: {
    flex: 1,
  },
  platformName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusStreaming: { color: '#10B981' },
  statusStarting: { color: '#F59E0B' },
  statusStopping: { color: '#F97316' },
  statusError: { color: '#EF4444' },
  statusInactive: { color: '#6B7280' },
  platformActions: {
    alignItems: 'flex-end',
  },
  actionButtons: {
    alignItems: 'flex-end',
  },
  connectedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingsButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  settingsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  youtubeButton: {
    backgroundColor: '#DC2626',
  },
  instagramButton: {
    backgroundColor: '#DB2777',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  platformControls: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  controlButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  helpButton: {
    marginRight: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  helpButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor:'#ffd700'
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFF',
    backgroundColor: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
    height: 48,   
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },

  
  helpText: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
  },
  modalActions: {
    marginTop: 20,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  helpContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFF',
  },
  stepList: {
    marginLeft: 8,
  },
  step: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 6,
  },
  warningContainer: {
    backgroundColor: '#92400E33',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
  },
  warningText: {
    color: '#FBBF24',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  privacyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  privacyButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  privacyButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  privacyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  privacyButtonTextActive: {
    color: 'white',
  },
    icon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
})

export default SimulcastConfigModal



// import React, { useState, useEffect } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   ActivityIndicator,
//   StyleSheet
// } from 'react-native';
// import axios from 'axios';
// import {
//   GET_SIMULCAST_CONFIG,
//   UPDATE_YOUTUBE_CONFIG,
//   UPDATE_INSTAGRAM_CONFIG,
//   START_YOUTUBE_SIMULCAST,
//   START_INSTAGRAM_SIMULCAST,
//   STOP_YOUTUBE_SIMULCAST,
//   STOP_INSTAGRAM_SIMULCAST,
//   STOP_ALL_SIMULCASTS,
//   YOUTUBE_AUTH_URL
// } from "../../../../../Config";

// const SimulcastConfigModal = ({ visible, onClose, streamId, streamData, onSimulcastUpdate }) => {
//   const [config, setConfig] = useState({
//     platforms: {
//       youtube: { enabled: false, hasStreamKey: false, status: 'inactive' },
//       instagram: { enabled: false, hasStreamKey: false, hasRtmpUrl: false, status: 'inactive' }
//     }
//   });

//   const [loading, setLoading] = useState({ config: false, youtube: false, instagram: false, simulcast: false });
//   const [errors, setErrors] = useState({});
//   const [showYouTubeConfig, setShowYouTubeConfig] = useState(false);
//   const [showInstagramConfig, setShowInstagramConfig] = useState(false);

//   const [youtubeForm, setYoutubeForm] = useState({
//     title: 'Live Stream',
//     description: 'Live streaming from Flykup',
//     privacy: 'public'
//   });

//   const [instagramForm, setInstagramForm] = useState({
//     streamKey: '',
//     rtmpUrl: '',
//     title: 'Live Stream'
//   });

//   useEffect(() => {
//     if (visible && streamId) loadSimulcastConfig();
//   }, [visible, streamId]);

//   const loadSimulcastConfig = async () => {
//     setLoading(prev => ({ ...prev, config: true }));
//     try {
//       const response = await axios.get(GET_SIMULCAST_CONFIG(streamId));
//       if (response.data.status) setConfig(response.data.data);
//     } catch (err) {
//       setErrors(prev => ({ ...prev, config: 'Failed to load config' }));
//     } finally {
//       setLoading(prev => ({ ...prev, config: false }));
//     }
//   };

//   const handleInstagramConfig = async () => {
//     if (!instagramForm.streamKey || !instagramForm.rtmpUrl) {
//       setErrors(prev => ({ ...prev, instagram: 'RTMP URL and Stream Key required' }));
//       return;
//     }
//     setLoading(prev => ({ ...prev, instagram: true }));
//     try {
//       const response = await axios.post(UPDATE_INSTAGRAM_CONFIG(streamId), instagramForm);
//       if (response.data.status) {
//         setConfig(prev => ({ ...prev, platforms: { ...prev.platforms, instagram: { ...response.data.data.instagram, enabled: true } } }));
//         setShowInstagramConfig(false);
//       }
//     } catch (err) {
//       setErrors(prev => ({ ...prev, instagram: 'Failed to save Instagram config' }));
//     } finally {
//       setLoading(prev => ({ ...prev, instagram: false }));
//     }
//   };

//   const getStatusText = (status) => {
//     switch (status) {
//       case 'streaming': return 'Live';
//       case 'starting': return 'Starting...';
//       case 'stopping': return 'Stopping...';
//       case 'error': return 'Error';
//       default: return 'Inactive';
//     }
//   };

//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <View style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.title}>Simulcast Configuration</Text>
//           <TouchableOpacity onPress={onClose}>
//             <Text style={styles.closeBtn}>✖</Text>
//           </TouchableOpacity>
//         </View>

//         {loading.config ? (
//           <ActivityIndicator size="large" color="#000" />
//         ) : (
//           <ScrollView contentContainerStyle={{ padding: 16 }}>
//             {/* YouTube Section */}
//             <View style={styles.card}>
//               <Text style={styles.platform}>YouTube</Text>
//               <Text style={{color: '#ccc'}}>Status: {getStatusText(config.platforms.youtube.status)}</Text>
//               {config.platforms.youtube.hasStreamKey ? (
//                 <TouchableOpacity onPress={() => setShowYouTubeConfig(!showYouTubeConfig)}>
//                   <Text style={styles.link}>Settings</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity style={styles.buttonRed}>
//                   {loading.youtube ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Connect YouTube</Text>}
//                 </TouchableOpacity>
//               )}
//               {showYouTubeConfig && (
//                 <View style={{ marginTop: 10 }}>
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Stream Title"
//                     value={youtubeForm.title}
//                     onChangeText={text => setYoutubeForm(prev => ({ ...prev, title: text }))}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Privacy (public/unlisted/private)"
//                     value={youtubeForm.privacy}
//                     onChangeText={text => setYoutubeForm(prev => ({ ...prev, privacy: text }))}
//                   />
//                 </View>
//               )}
//             </View>

//             {/* Instagram Section */}
//             <View style={styles.card}>
//               <Text style={styles.platform}>Instagram</Text>
//               <Text style={{color: '#ccc'}}>Status: {getStatusText(config.platforms.instagram.status)}</Text>
//               {config.platforms.instagram.enabled ? (
//                 <TouchableOpacity onPress={() => setShowInstagramConfig(!showInstagramConfig)}>
//                   <Text style={styles.link}>Edit</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity onPress={() => setShowInstagramConfig(true)} style={styles.buttonPink}>
//                   <Text style={styles.btnText}>Configure</Text>
//                 </TouchableOpacity>
//               )}

//               {showInstagramConfig && (
//                 <View style={{ marginTop: 10 }}>
//                   <TextInput
//                     style={styles.input}
//                     placeholder="RTMP URL"
//                     value={instagramForm.rtmpUrl}
//                     onChangeText={text => setInstagramForm(prev => ({ ...prev, rtmpUrl: text }))}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Stream Key"
//                     value={instagramForm.streamKey}
//                     secureTextEntry
//                     onChangeText={text => setInstagramForm(prev => ({ ...prev, streamKey: text }))}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Title"
//                     value={instagramForm.title}
//                     onChangeText={text => setInstagramForm(prev => ({ ...prev, title: text }))}
//                   />
//                   <TouchableOpacity onPress={handleInstagramConfig} style={styles.buttonPink}>
//                     {loading.instagram ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>
//           </ScrollView>
//         )}
//       </View>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#121212' },
//   header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
//   title: { fontSize: 18, fontWeight: 'bold', color:'#fff' },
//   closeBtn: { fontSize: 20, color: 'red' },
//   card: { padding: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 16 },
//   platform: { fontSize: 16, fontWeight: '600', marginBottom: 4 , color: '#fff'},
//   buttonRed: { backgroundColor: '#e11d48', padding: 10, borderRadius: 6, marginTop: 8, alignItems: 'center' },
//   buttonPink: { backgroundColor: '#db2777', padding: 10, borderRadius: 6, marginTop: 8, alignItems: 'center' },
//   btnText: { color: '#fff', fontWeight: '600' },
//   link: { color: '#2563eb', marginTop: 8 },
//   input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 8 , color: '#ccc'}
// });

// export default SimulcastConfigModal;


