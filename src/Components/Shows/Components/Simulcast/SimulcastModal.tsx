import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  Cast,
  Youtube,
  Instagram,
  Facebook,
  X,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  Share2,
  Copy,
} from 'lucide-react-native';
import bgaAxiosInstance from '../../../../Utils/bgaAxiosInstance';
import axios from 'axios';
import {
  BGA_GET_SIMULCAST_CONFIG,
  BGA_TOGGLE_SIMULCAST_PLATFORM,
  BGA_CREATE_SIMULCAST_CONFIG,
  YOUTUBE_AUTH_URL,
} from '../../../../../Config';
import {Toast} from '../../../../Utils/dateUtils';
import {Share as RNShare, Clipboard} from 'react-native';

interface SimulcastModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  userId: string;
  sellerId: string;
}

const SimulcastModal: React.FC<SimulcastModalProps> = ({
  visible,
  onClose,
  streamId,
  userId,
  sellerId,
}) => {
  // Connected platforms state
  const [connectedAccounts, setConnectedAccounts] = useState({
    youtube: false,
    instagram: false,
    facebook: false,
  });

  const [simulcastConfig, setSimulcastConfig] = useState<any>(null);
  const [loadingSimulcast, setLoadingSimulcast] = useState(false);

  // Instagram/Facebook form states
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [instagramForm, setInstagramForm] = useState({
    rtmpUrl: '',
    streamKey: '',
    title: 'Live Stream',
    showStreamKey: false,
  });
  const [facebookForm, setFacebookForm] = useState({
    rtmpUrl: '',
    streamKey: '',
    title: 'Live Stream',
    showStreamKey: false,
  });

  // Fetch simulcast configuration
  useEffect(() => {
    if (visible && userId && streamId) {
      fetchSimulcastConfig();
    }
  }, [visible, userId, streamId]);

  const fetchSimulcastConfig = async () => {
    if (!userId || !streamId) return;
    
    setLoadingSimulcast(true);
    try {
      console.log('📡 Fetching simulcast config from BGA...');
      const response = await bgaAxiosInstance.get(BGA_GET_SIMULCAST_CONFIG(userId, streamId));

      if (response.data.success) {
        const config = response.data.data;
        setSimulcastConfig(config);

        // Log stream details for each platform
        console.log('✅ Simulcast configuration loaded from BGA:');
        if (config?.platforms?.youtube) {
          console.log('  📺 YouTube:', {
            enabled: config.platforms.youtube.enabled,
            title: config.platforms.youtube.title,
            hasStreamKey: !!config.platforms.youtube.streamKey
          });
        }
        if (config?.platforms?.instagram) {
          console.log('  📸 Instagram:', {
            instagram: config.platforms.instagram,
            enabled: config.platforms.instagram.enabled,
            title: config.platforms.instagram.title,
            hasStreamKey: !!config.platforms.instagram.streamKey,
            hasRtmpUrl: !!config.platforms.instagram.rtmpUrl
          });
        }
        if (config?.platforms?.facebook) {
          console.log('  📘 Facebook:', {
            enabled: config.platforms.facebook.enabled,
            title: config.platforms.facebook.title,
            hasStreamKey: !!config.platforms.facebook.streamKey,
            hasRtmpUrl: !!config.platforms.facebook.rtmpUrl
          });
        }

        // Update connected accounts state based on fetched config
        setConnectedAccounts({
          youtube: config?.platforms?.youtube?.enabled || false,
          instagram: config?.platforms?.instagram?.enabled || false,
          facebook: config?.platforms?.facebook?.enabled || false,
        });
      }
    } catch (error: any) {
      console.log('ℹ️ No simulcast config found or error:', error.message);
      // If no config exists yet, that's okay - user hasn't set it up
      if (error.response?.status !== 404) {
        console.error('Error fetching simulcast config:', error);
      }
    } finally {
      setLoadingSimulcast(false);
    }
  };

  // YouTube OAuth Flow - Control Backend
  const handleYouTubeAuth = async () => {
    if (!userId || !streamId) return;

    setLoadingSimulcast(true);
    try {
      console.log('🎬 Initiating YouTube OAuth for user:', userId, 'streamId:', streamId);
      
      // Step 1: Get YouTube OAuth URL from control backend
      const authUrlResponse = await axios.get(YOUTUBE_AUTH_URL, {
        params: {
          streamId: streamId,
          userId: userId
        }
      });
      
      console.log('📡 Auth URL response:', authUrlResponse.data);

      if (authUrlResponse.data.success && authUrlResponse.data.data.authUrl) {
        const authUrl = authUrlResponse.data.data.authUrl;

        // Step 2: Open OAuth in browser
        const supported = await Linking.canOpenURL(authUrl);
        if (supported) {
          await Linking.openURL(authUrl);

          // Step 3: Listen for OAuth callback via deep link
          const handleUrl = async (event: {url: string}) => {
            console.log('📨 [Simulcast] Received deep link:', event.url);
            console.log('🔍 [Simulcast] URL includes youtube-auth-success:', event.url.includes('youtube-auth-success'));
            console.log('🔍 [Simulcast] URL includes youtube-auth-error:', event.url.includes('youtube-auth-error'));
            console.log('🔍 [Simulcast] URL includes error=oauth_cancelled:', event.url.includes('error=oauth_cancelled'));
            
           // console.log('event',event);

            if (event.url.includes('youtube-auth-success')) {
              console.log('✅ YouTube OAuth success!');
              
              // The control backend already saved the tokens
              // Just update the UI state
              setConnectedAccounts(prev => ({
                ...prev,
                youtube: true
              }));
              Toast('YouTube connected successfully!');
              
              // Refresh config to get the latest data
              try {
                await fetchSimulcastConfig();
              } catch (configError) {
                console.error('Failed to refresh config:', configError);
              }
              
              // Remove event listener
              Linking.removeAllListeners('url');
            } else if (event.url.includes('youtube-auth-error')) {
              console.error('❌ YouTube OAuth error');
              
              const errorMsg = 'Failed to connect YouTube';
              Toast(errorMsg);
              
              // Remove event listener
              Linking.removeAllListeners('url');
            } else if (event.url.includes('error=oauth_cancelled')) {
              console.log('ℹ️ YouTube OAuth cancelled by user');
              
              Toast('YouTube connection cancelled');
              
              // Remove event listener
              Linking.removeAllListeners('url');
            }
          };

          Linking.addEventListener('url', handleUrl);
          
          // Cleanup listener after 5 minutes (timeout)
          setTimeout(() => {
            Linking.removeAllListeners('url');
          }, 5 * 60 * 1000);
        } else {
          Toast('Cannot open YouTube authentication');
        }
      } else {
        Toast('Failed to get YouTube authorization URL');
      }
    } catch (error: any) {
      console.error('❌ Error connecting YouTube:', error);
      Toast(error.response?.data?.message || 'Failed to connect YouTube');
    } finally {
      setLoadingSimulcast(false);
    }
  };

  // Disconnect YouTube
  const handleYouTubeDisconnect = async () => {
    if (!userId || !streamId) return;

    Alert.alert(
      'Disconnect YouTube',
      'Are you sure you want to disconnect YouTube?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setLoadingSimulcast(true);
            try {
              const response = await bgaAxiosInstance.patch(
                BGA_TOGGLE_SIMULCAST_PLATFORM(userId, streamId, 'youtube'), 
                { enabled: false }
              );
              
              if (response.data.success) {
                setConnectedAccounts(prev => ({...prev, youtube: false}));
                Toast('YouTube disconnected successfully!');
              }
            } catch (error: any) {
              console.error('Error disconnecting YouTube:', error);
              Toast(error.response?.data?.message || 'Failed to disconnect YouTube');
            } finally {
              setLoadingSimulcast(false);
            }
          },
        },
      ],
    );
  };

  // Save Instagram configuration
  const handleSaveInstagramConfig = async () => {
    if (!userId || !streamId || !sellerId) return;

    // Validation
    if (!instagramForm.rtmpUrl.trim()) {
      Toast('RTMP URL is required');
      return;
    }
    if (!instagramForm.streamKey.trim()) {
      Toast('Stream key is required');
      return;
    }
    if (
      !instagramForm.rtmpUrl.startsWith('rtmp://') &&
      !instagramForm.rtmpUrl.startsWith('rtmps://')
    ) {
      Toast('RTMP URL must start with rtmp:// or rtmps://');
      return;
    }

    setLoadingSimulcast(true);
    try {
      // Use POST endpoint to create or update configuration
      const response = await bgaAxiosInstance.post('/api/simulcast/config', {
        userId: userId,
        sellerId: sellerId,
        showId: streamId,
        platforms: {
          instagram: {
            rtmpUrl: instagramForm.rtmpUrl.trim(),
            streamKey: instagramForm.streamKey.trim(),
            title: instagramForm.title.trim() || 'Live Stream',
            enabled: true,
          },
        },
      });

      if (response.data.success) {
        setConnectedAccounts(prev => ({...prev, instagram: true}));
        Toast('Instagram connected successfully!');
        setShowInstagramModal(false);
        
        // Refresh config
        await fetchSimulcastConfig();
      }
    } catch (error: any) {
      console.error('Error saving Instagram config:', error);
      Toast(error.response?.data?.message || 'Failed to save Instagram configuration');
    } finally {
      setLoadingSimulcast(false);
    }
  };

  // Save Facebook configuration
  const handleSaveFacebookConfig = async () => {
    if (!userId || !streamId || !sellerId) return;

    // Validation
    if (!facebookForm.rtmpUrl.trim()) {
      Toast('RTMP URL is required');
      return;
    }
    if (!facebookForm.streamKey.trim()) {
      Toast('Stream key is required');
      return;
    }
    if (
      !facebookForm.rtmpUrl.startsWith('rtmp://') &&
      !facebookForm.rtmpUrl.startsWith('rtmps://')
    ) {
      Toast('RTMP URL must start with rtmp:// or rtmps://');
      return;
    }

    setLoadingSimulcast(true);
    try {
      // Use POST endpoint to create or update configuration
      const response = await bgaAxiosInstance.post(BGA_CREATE_SIMULCAST_CONFIG, {
        userId: userId,
        sellerId: sellerId,
        showId: streamId,
        platforms: {
          facebook: {
            rtmpUrl: facebookForm.rtmpUrl.trim(),
            streamKey: facebookForm.streamKey.trim(),
            title: facebookForm.title.trim() || 'Live Stream',
            enabled: true,
          },
        },
      });

      if (response.data.success) {
        setConnectedAccounts(prev => ({...prev, facebook: true}));
        Toast('Facebook connected successfully!');
        setShowFacebookModal(false);
        
        // Refresh config
        await fetchSimulcastConfig();
      }
    } catch (error: any) {
      console.error('Error saving Facebook config:', error);
      Toast(error.response?.data?.message || 'Failed to save Facebook configuration');
    } finally {
      setLoadingSimulcast(false);
    }
  };

  // Generic disconnect handler
  const handleDisconnectPlatform = async (platform: string) => {
    if (!userId || !streamId) return;

    Alert.alert(
      `Disconnect ${platform}`,
      `Are you sure you want to disconnect ${platform}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setLoadingSimulcast(true);
            try {
              const response = await bgaAxiosInstance.patch(
                BGA_TOGGLE_SIMULCAST_PLATFORM(userId, streamId, platform.toLowerCase()), 
                { enabled: false }
              );
              
              if (response.data.success) {
                setConnectedAccounts(prev => ({
                  ...prev,
                  [platform.toLowerCase()]: false,
                }));
                Toast(`${platform} disconnected successfully!`);
              }
            } catch (error: any) {
              console.error(`Error disconnecting ${platform}:`, error);
              Toast(error.response?.data?.message || `Failed to disconnect ${platform}`);
            } finally {
              setLoadingSimulcast(false);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      {/* Main Simulcast Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Cast size={20} color="#a855f7" />
                <Text style={styles.headerText}>Simulcast Setup</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <Text style={styles.subtitle}>
                Stream to multiple platforms simultaneously
              </Text>

              {/* Platform Cards */}
              <View style={styles.platformGrid}>
                {/* YouTube Card */}
                <TouchableOpacity
                  onPress={() =>
                    connectedAccounts.youtube
                      ? handleYouTubeDisconnect()
                      : handleYouTubeAuth()
                  }
                 // onPress={()=>{Toast('Feature coming soon!')}}
                  disabled={loadingSimulcast}
                  style={[
                    styles.platformCard,
                    connectedAccounts.youtube
                      ? styles.platformCardConnected
                      : styles.platformCardYoutube,
                  ]}>
                  <View style={styles.platformIconContainer}>
                    <Youtube size={32} color="#fff" />
                    {connectedAccounts.youtube && (
                      <View style={styles.connectedBadge}>
                        <CheckCircle size={16} color="#22c55e" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.platformName}>YouTube</Text>
                  <Text style={styles.platformStatus}>
                    {connectedAccounts.youtube ? 'Connected' : 'Tap to connect'}
                  </Text>
                </TouchableOpacity>

                {/* Instagram Card */}
                <TouchableOpacity
                  onPress={() => {
                    if (connectedAccounts.instagram) {
                      // Pre-fill form with existing data
                      if (simulcastConfig?.platforms?.instagram) {
                        setInstagramForm({
                          rtmpUrl:
                            simulcastConfig.platforms.instagram.rtmpUrl || '',
                          streamKey:
                            simulcastConfig.platforms.instagram.streamKey || '',
                          title:
                            simulcastConfig.platforms.instagram.title ||
                            'Live Stream',
                          showStreamKey: false,
                        });
                      }
                    }
                    setShowInstagramModal(true);
                  }}
                  disabled={loadingSimulcast}
                  style={[
                    styles.platformCard,
                    connectedAccounts.instagram
                      ? styles.platformCardConnected
                      : styles.platformCardInstagram,
                  ]}>
                  <View style={styles.platformIconContainer}>
                    <Instagram size={32} color="#fff" />
                    {connectedAccounts.instagram && (
                      <View style={styles.connectedBadge}>
                        <CheckCircle size={16} color="#22c55e" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.platformName}>Instagram</Text>
                  <Text style={styles.platformStatus}>
                    {connectedAccounts.instagram
                      ? 'Connected'
                      : 'Tap to connect'}
                  </Text>
                </TouchableOpacity>

                {/* Facebook Card */}
                <TouchableOpacity
                  onPress={() => {
                    if (connectedAccounts.facebook) {
                      // Pre-fill form with existing data
                      if (simulcastConfig?.platforms?.facebook) {
                        setFacebookForm({
                          rtmpUrl:
                            simulcastConfig.platforms.facebook.rtmpUrl || '',
                          streamKey:
                            simulcastConfig.platforms.facebook.streamKey || '',
                          title:
                            simulcastConfig.platforms.facebook.title ||
                            'Live Stream',
                          showStreamKey: false,
                        });
                      }
                    }
                    setShowFacebookModal(true);
                  }}
                  disabled={loadingSimulcast}
                  style={[
                    styles.platformCard,
                    connectedAccounts.facebook
                      ? styles.platformCardConnected
                      : styles.platformCardFacebook,
                  ]}>
                  <View style={styles.platformIconContainer}>
                    <Facebook size={32} color="#fff" />
                    {connectedAccounts.facebook && (
                      <View style={styles.connectedBadge}>
                        <CheckCircle size={16} color="#22c55e" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.platformName}>Facebook</Text>
                  <Text style={styles.platformStatus}>
                    {connectedAccounts.facebook
                      ? 'Connected'
                      : 'Tap to connect'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Info size={16} color="#60a5fa" />
                <Text style={styles.infoText}>
                  Connect platforms before starting your live stream
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Instagram Configuration Modal */}
      <Modal
        visible={showInstagramModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstagramModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Instagram size={20} color="#e1306c" />
                <Text style={styles.headerText}>Connect Instagram</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowInstagramModal(false)}
                style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* Instructions */}
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>
                  How to get Instagram RTMP details:
                </Text>
                <Text style={styles.instructionsText}>
                  1. Open Instagram app on your phone
                </Text>
                <Text style={styles.instructionsText}>
                  2. Tap "+" → Select "Live"
                </Text>
                <Text style={styles.instructionsText}>
                  3. Look for "Stream with external software"
                </Text>
                <Text style={styles.instructionsText}>
                  4. Copy Server URL and Stream Key
                </Text>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>RTMP Server URL</Text>
                <TextInput
                  style={styles.input}
                  value={instagramForm.rtmpUrl}
                  onChangeText={text =>
                    setInstagramForm(prev => ({...prev, rtmpUrl: text}))
                  }
                  placeholder="rtmps://live-api-s.facebook.com:443/rtmp/"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stream Key</Text>
                <View style={styles.passwordInput}>
                  <TextInput
                    style={[styles.input, {flex: 1, marginBottom: 0}]}
                    value={instagramForm.streamKey}
                    onChangeText={text =>
                      setInstagramForm(prev => ({...prev, streamKey: text}))
                    }
                    placeholder="Your Instagram stream key"
                    placeholderTextColor="#666"
                    secureTextEntry={!instagramForm.showStreamKey}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setInstagramForm(prev => ({
                        ...prev,
                        showStreamKey: !prev.showStreamKey,
                      }))
                    }
                    style={styles.eyeButton}>
                    {instagramForm.showStreamKey ? (
                      <Eye size={20} color="#666" />
                    ) : (
                      <EyeOff size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Stream Title <Text style={styles.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={instagramForm.title}
                  onChangeText={text =>
                    setInstagramForm(prev => ({...prev, title: text}))
                  }
                  placeholder="Live Stream"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  onPress={() => setShowInstagramModal(false)}
                  style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveInstagramConfig}
                  disabled={loadingSimulcast}
                  style={styles.saveButton}>
                  {loadingSimulcast ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {connectedAccounts.instagram && (
                <TouchableOpacity
                  onPress={() => {
                    setShowInstagramModal(false);
                    handleDisconnectPlatform('Instagram');
                  }}
                  style={styles.disconnectButton}>
                  <Text style={styles.disconnectButtonText}>
                    Disconnect Instagram
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Facebook Configuration Modal */}
      <Modal
        visible={showFacebookModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFacebookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Facebook size={20} color="#1877f2" />
                <Text style={styles.headerText}>Connect Facebook</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFacebookModal(false)}
                style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* Instructions */}
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>
                  How to get Facebook RTMP details:
                </Text>
                <Text style={styles.instructionsText}>
                  1. Go to facebook.com/live/producer
                </Text>
                <Text style={styles.instructionsText}>
                  2. Click "Create Live Video"
                </Text>
                <Text style={styles.instructionsText}>
                  3. Select "Streaming Software"
                </Text>
                <Text style={styles.instructionsText}>
                  4. Copy Server URL and Stream Key
                </Text>
              </View>

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>RTMP Server URL</Text>
                <TextInput
                  style={styles.input}
                  value={facebookForm.rtmpUrl}
                  onChangeText={text =>
                    setFacebookForm(prev => ({...prev, rtmpUrl: text}))
                  }
                  placeholder="rtmps://live-api-s.facebook.com:443/rtmp/"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Stream Key</Text>
                <View style={styles.passwordInput}>
                  <TextInput
                    style={[styles.input, {flex: 1, marginBottom: 0}]}
                    value={facebookForm.streamKey}
                    onChangeText={text =>
                      setFacebookForm(prev => ({...prev, streamKey: text}))
                    }
                    placeholder="Your Facebook stream key"
                    placeholderTextColor="#666"
                    secureTextEntry={!facebookForm.showStreamKey}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setFacebookForm(prev => ({
                        ...prev,
                        showStreamKey: !prev.showStreamKey,
                      }))
                    }
                    style={styles.eyeButton}>
                    {facebookForm.showStreamKey ? (
                      <Eye size={20} color="#666" />
                    ) : (
                      <EyeOff size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Stream Title <Text style={styles.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={facebookForm.title}
                  onChangeText={text =>
                    setFacebookForm(prev => ({...prev, title: text}))
                  }
                  placeholder="Live Stream"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  onPress={() => setShowFacebookModal(false)}
                  style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveFacebookConfig}
                  disabled={loadingSimulcast}
                  style={styles.saveButton}>
                  {loadingSimulcast ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              {connectedAccounts.facebook && (
                <TouchableOpacity
                  onPress={() => {
                    setShowFacebookModal(false);
                    handleDisconnectPlatform('Facebook');
                  }}
                  style={styles.disconnectButton}>
                  <Text style={styles.disconnectButtonText}>
                    Disconnect Facebook
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1c1917',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8a29e',
    marginBottom: 20,
    textAlign: 'center',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  platformCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  platformCardYoutube: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderColor: 'rgba(220, 38, 38, 0.4)',
  },
  platformCardInstagram: {
    backgroundColor: 'rgba(225, 48, 108, 0.2)',
    borderColor: 'rgba(225, 48, 108, 0.4)',
  },
  platformCardFacebook: {
    backgroundColor: 'rgba(24, 119, 242, 0.2)',
    borderColor: 'rgba(24, 119, 242, 0.4)',
  },
  platformCardConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  platformIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  connectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  platformName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  platformStatus: {
    fontSize: 10,
    color: '#a8a29e',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#93c5fd',
  },
  instructionsBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#93c5fd',
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d6d3d1',
    marginBottom: 8,
  },
  optional: {
    color: '#78716c',
  },
  input: {
    backgroundColor: '#292524',
    borderWidth: 1,
    borderColor: '#44403c',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#292524',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#a855f7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimulcastModal;
