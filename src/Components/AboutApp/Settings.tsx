import React, { useCallback, useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image, PermissionsAndroid, Platform, Alert, Linking,
  BackHandler
} from 'react-native';
import { Settings, ChevronRight, Plus } from 'lucide-react-native';
import { AuthContext } from '../../Context/AuthContext';
import { AWS_CDN_URL } from '../../Utils/aws';
import ToggleSwitch from 'toggle-switch-react-native';
import ProfileEditScreen from '../Profile/ProfileImageEdit';
import { checkPermission1, isPermissionGranted} from '../../Utils/Permission';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationDisableModal from './NotificationDisableModal';
import NotificationEnableModal from './NotificationEnableModal';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { video } from '../../assets/assets';
import axiosInstance from '../../Utils/Api';

const SettingsScreen = ({ navigation }) => {
  const { user, setuser }: any = useContext(AuthContext);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isEditting, setIsEditing] = useState(false);

  // Handle back button press - navigate back instead of letting Dashboard's exit handler fire
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If editing profile, close the edit mode first
        if (isEditting) {
          setIsEditing(false);
          return true;
        }
        // Otherwise, navigate back normally
        navigation.goBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove();
    }, [isEditting, navigation]),
  );
  const [isNotificationDisabled, setIsNotificationDisabled] = useState({
    produdcts: false,
    videos: false,
    livestreams: false,
  });
  const [showNotificationDisableModal, setShowNotificationDisableModal] = useState(false);
  const [deniedPermission, setDeniedPermission] = useState<string | null>(null);
  const [showVideoFeedControls, setShowVideoFeedControls] = useState(false);

  // Refs to prevent race conditions
  const updateInProgressRef = useRef(false);
  const pendingUpdateRef = useRef<string | null>(null);

  const refreshNotificationPermission = useCallback(async () => {
    const granted = await isPermissionGranted('notification');
    setPushNotifications(granted);
  }, []);

  // Optimized mute notification function - NO debounce needed
  const muteNotification = async (mutedTypes: string[]) => {
    try {
      const payload = { mutedTypes };
      const res = await axiosInstance.post(`/mute-notifications/mute-settings`, payload);
      return res.data;
    } catch (err) {
      console.log(err, "while updating mute settings");
      throw err;
    }
  };

  // Optimized trigger notification function
  const triggerNotification = async (type: string) => {
    // Prevent multiple simultaneous updates
    if (updateInProgressRef.current) {
      pendingUpdateRef.current = type;
      return;
    }

    const typeMapping = {
      "produdcts": "new_product",
      "videos": "new_video", 
      "livestreams": "live_stream_start"
    };

    const apiType = typeMapping[type];
    if (!apiType) {
      console.error('Invalid notification type:', type);
      return;
    }

    updateInProgressRef.current = true;

    // Get current state
    const currentState = { ...isNotificationDisabled };
    const newValue = !currentState[type];

    // Immediately update UI (optimistic update)
    const newState = { ...currentState, [type]: newValue };
    setIsNotificationDisabled(newState);

    // Build muted types array from new state
    const newMutedTypes: string[] = [];
    if (newState.produdcts) newMutedTypes.push('new_product');
    if (newState.videos) newMutedTypes.push('new_video');
    if (newState.livestreams) newMutedTypes.push('live_stream_start');

    try {
      // Send API request
      await muteNotification(newMutedTypes);
    } catch (error) {
      // Revert on error
      setIsNotificationDisabled(currentState);
      console.error('Failed to update mute settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      updateInProgressRef.current = false;

      // Handle pending update if any
      if (pendingUpdateRef.current) {
        const pendingType = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
        setTimeout(() => triggerNotification(pendingType), 100);
      }
    }
  };

  useEffect(() => {
    refreshNotificationPermission();
  }, [refreshNotificationPermission]);

  // Function to handle toggling notifications
  const handleToggleNotifications = async () => {
    if (pushNotifications) {
      setShowNotificationDisableModal(true);
    } else {
      const result = await checkPermission1('notification');
      if (result?.granted) {
        setPushNotifications(true);
      } else {
        setDeniedPermission(result.denied);
      }
    }
  };

  const MenuItem = ({ title, onPress, showChevron = true, rightComponent = null }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuItemText}>{title}</Text>
      {rightComponent || (showChevron && <ChevronRight size={20} color="#ffffff" />)}
    </TouchableOpacity>
  );

  // Fetch mute settings on mount
  useEffect(() => {
    const fetchMuteSettings = async () => {
      try {
        const res = await axiosInstance.get(`/mute-notifications/mute-settings`);
        const muteSettings = res.data.data.mutedTypes;
        setIsNotificationDisabled({
          produdcts: muteSettings.includes("new_product"),
          videos: muteSettings.includes("new_video"),
          livestreams: muteSettings.includes("live_stream_start"),
        });
      } catch (err) {
        console.log(err, "while fetching mute settings");
      }
    };
    fetchMuteSettings();
  }, []);

  return (
    <>
      <SafeAreaView style={styles.container}>
        {isEditting ? (
          <View style={{ height: '100%' }}>
            <ProfileEditScreen
              setIsEditModalVisible={setIsEditing}
              user={user}
              setUser={setuser}
            />
          </View>
        ) : (
          <>
            {/* Header */}
            <SafeAreaView style={styles.header}>
              <Settings size={30} color="#000000" />
              <Text allowFontScaling={false} style={styles.headerTitle}>Settings</Text>
            </SafeAreaView>

            {/* Scrollable Content */}
            <View style={styles.contentWrapper}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* User Profile Section */}
                <View style={styles.profileSection}>
                  <View style={styles.profileContainer}>
                    {user?.profileURL?.key ? (
                      <Image
                        style={styles.avatar}
                        source={{ uri: `${AWS_CDN_URL}${user?.profileURL?.key}` }}
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.profileName}>{user.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.borderLine} />
                </View>

                {/* Account Settings Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Settings</Text>

                  <MenuItem
                    title="Edit profile"
                    onPress={() => setIsEditing(true)}
                  />

                  {user?.role === 'seller' && (
                    <MenuItem 
                      title="Add your Bank Account" 
                      onPress={() => navigation.navigate('SellerSettings')}
                      rightComponent={<Plus size={20} color="#ffffff" />}
                    />
                  )}

                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>Push notifications</Text>
                    <ToggleSwitch
                      isOn={pushNotifications}
                      onColor={'#F7CE45'}
                      onToggle={handleToggleNotifications}
                      trackOnStyle={{ false: '#767577', true: '#ffffff' }}
                      thumbColor={pushNotifications ? '#ffffff' : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                    />
                  </View>

                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>Products notifications</Text>
                    <ToggleSwitch
                      isOn={!isNotificationDisabled.produdcts}
                      onColor={'#F7CE45'}
                      onToggle={() => triggerNotification("produdcts")}
                      trackOnStyle={{ false: '#767577', true: '#ffffff' }}
                      thumbColor={!isNotificationDisabled.produdcts ? '#ffffff' : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                    />
                  </View>

                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>Video notifications</Text>
                    <ToggleSwitch
                      isOn={!isNotificationDisabled.videos}
                      onColor={'#F7CE45'}
                      onToggle={() => triggerNotification("videos")}
                      trackOnStyle={{ false: '#767577', true: '#ffffff' }}
                      thumbColor={!isNotificationDisabled.videos ? '#ffffff' : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                    />
                  </View>

                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemText}>LiveStream notifications</Text>
                    <ToggleSwitch
                      isOn={!isNotificationDisabled.livestreams}
                      onColor={'#F7CE45'}
                      onToggle={() => triggerNotification("livestreams")}
                      trackOnStyle={{ false: '#767577', true: '#ffffff' }}
                      thumbColor={!isNotificationDisabled.livestreams ? '#ffffff' : '#f4f3f4'}
                      ios_backgroundColor="#767577"
                    />
                  </View>
                </View>

                <View style={styles.borderLine} />

                {/* More Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>More</Text>

                  <MenuItem
                    title="About us"
                    onPress={() => navigation.navigate('aboutApp')}
                  />

                  <MenuItem
                    title="Privacy policy"
                    // Old navigation: onPress={() => navigation.navigate('privacyPolicy')}
                    // Old Linking code (commented out):
                    // onPress={() => Linking.openURL('https://flykup.live/privacy-policy')}
                    // onPress={() => Linking.openURL('https://flykup.in/privacy-policy-2')}
                    onPress={() => navigation.navigate('WebViewScreen', {
                      url: 'https://flykup.in/privacy-policy-2/',
                      title: 'Privacy Policy'
                    })}
                  />

                  <MenuItem
                    title="Terms and conditions"
                    // Old navigation: onPress={() => navigation.navigate('termsScreen')}
                    // Old Linking code (commented out):
                    //onPress={() => Linking.openURL('https://flykup.live/terms-of-service')}
                    onPress={() => navigation.navigate('WebViewScreen', {
                      url: 'https://flykup.in/master-terms-of-service/',
                      title: 'Terms and Conditions'
                    })}
                  />

                  {/* <MenuItem
                    title="FAQ"
                    onPress={() => navigation.navigate('FAQ')}
                  /> */}

                 
                </View>
              </ScrollView>
            </View>
          </>
        )}

        <NotificationDisableModal
          visible={showNotificationDisableModal}
          onClose={() => setShowNotificationDisableModal(false)}
        />

        <NotificationEnableModal
          visible={!!deniedPermission}
          onClose={() => setDeniedPermission(null)}
          permission={deniedPermission}
          checkPermission={refreshNotificationPermission}
        />
      </SafeAreaView>

      {/* {__DEV__ && showVideoFeedControls && (
        <View style={styles.fullScreenModal}>
          <EnterpriseVideoFeedControlPanel
            onClose={() => setShowVideoFeedControls(false)}
          />
        </View>
      )} */}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#F7CE45',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderBottomRightRadius: 15,
    borderBottomLeftRadius: 15,
    height:'40%',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12,
  },
  contentWrapper: {
    flex: 1,
    position:'absolute',
    top: 130,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    backgroundColor: '#121212',
    marginHorizontal: 20,
    elevation: 5,
    borderRadius: 10,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  borderLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#777',
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  profileSection: {
    marginTop: 16,
  },
  profileContainer: {
    borderRadius: 12,
    padding: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
    marginBottom: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '400',
  },
  fullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
  },
});

export default SettingsScreen;
