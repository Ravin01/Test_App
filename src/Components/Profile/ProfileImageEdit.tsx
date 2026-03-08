/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView, 
  Platform,
  ActivityIndicator,
  ToastAndroid,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView, Alert, BackHandler
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ImagePicker from 'react-native-image-crop-picker';
import LinearGradient from 'react-native-linear-gradient';
import RBSheet from 'react-native-raw-bottom-sheet';
import axiosInstance from '../../Utils/Api';
import { AWS_IMAGE_UPLOAD, uploadImageToS3, AWS_CDN_URL, deleteObjectFromS3 } from '../../Utils/aws';
import { useAzureUpload } from '../../Utils/Azure';
import { checkPermission } from '../../Utils/Permission';
import { GENERATE_IMAGE_SAS_URL } from '../../../Config';
import { colors } from '../../Utils/Colors';
import { ArrowLeftCircle } from 'lucide-react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import GlobalConfirmModal from '../Reuse/AlertModal';
import useConfirmModal from '../../hooks/useAlertModal';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
import GenderSelection from './GenderSelection';
const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#0A0A0B',
  surface: '#1A1A1D',
  surfaceLight: '#2A2A2F',
  primaryDark: '#FF6B6B',
  primary: colors.primaryButtonColor,
  primaryLight: '#CCAD27D4',
  accent: '#96CEB4',
  accentSecondary: '#FFEAA7',
  text: '#FFFFFF',
  textPrimary: '#F8F9FA',
  textSecondary: colors.primaryButtonColor,
  textMuted: '#6C757D',
  error: '#FF6B6B',
  success: '#51CF66',
  border: '#343A40',
  borderLight: '#495057',
  placeholder: '#868E96',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const ProfileEditScreen = ({setIsEditModalVisible, setUser, user, onSaveSuccess}) => {
  const [userName, setUserName] = useState(user?.userName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [characterCount, setCharacterCount] = useState(bio?.length || 0);
  const [loading, setLoading] = useState(false);
  const [profileURL, setProfileURL] = useState(user?.profileURL || null);
  const [backgroundCoverURL, setBackgroundCoverURL] = useState(user?.backgroundCoverURL || null);
  const [message, setMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [imageOptionsType, setImageOptionsType] = useState('profile'); // 'profile' or 'cover'

     const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
 
 const backAction = () => {
    showModal({
      title: 'Hold on!',
      content: 'Are you sure you want to go back?',
      mode: 'normal',
      confirmText: 'YES',
      cancelText: 'Cancel',
      showIcon: false,
      onConfirm: async () => {
        setIsEditModalVisible(false);
      },
    });
    return true; // prevent default behavior (exit app)
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove(); // cleanup on unmount
  }, []);

  // Bottom Sheet References
  const refRBSheet = useRef();

  const MAX_BIO_LENGTH = 160;

  // Debounce username check
  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const checkUsernameAvailability = debounce(async (username) => {
    if (username.trim() === "") {
      setMessage('Please enter a username.');
      return;
    }
    if (username.length < 5) {
      setMessage('Username must be at least 5 characters long.');
      return;
    }
    if (username.length > 20) {
      setMessage('Username must be less than 20 characters long.');
      return;
    }
    try {
      const response = await axiosInstance.get(`/profile/username-availability`, {
        params: { userName: username.trim() }, 
      });
      // console.log(response.data,username)
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error checking username availability');
    }
  }, 500);

  const uploadImage = async (imageUri, path) => {
    // const formData = new FormData();
    // const fileName = imageUri.split('/').pop();
    // const fileType = fileName.split('.').pop();
    
    // formData.append('image', {
    //   uri: imageUri,
    //   name: fileName || `upload.${fileType}`,
    //   type: `image/${fileType}`,
    // });

    try {
      console.log(await uploadImageToS3(imageUri,path));
      return await uploadImageToS3(imageUri,path);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const showImagePickerOptions = (type) => {
    setImageOptionsType(type);
    refRBSheet.current.open();
  };

  const hideImagePickerOptions = () => {
    refRBSheet.current.close();
  };
const pickCoverImage = async() => {
  // console.log("this one",imageOptionsType)
    hideImagePickerOptions();
    const hasPermission = await checkPermission('gallery');
    if (!hasPermission) return;
     launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        quality: 1,
        maxWidth: 500,
        maxHeight: 500,
      },
      async(response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.log('Error: ' + response.errorMessage);
          return;
        } 
        if (response.assets && response.assets.length > 0) {
          const image = response.assets[0];
          try {
    //         const croppedImage = await ImagePicker.openCropper({
    //           path: image?.uri,
    //           width: 300,
    //           height: 300,
    //           cropping: true,
    //           cropperCircleOverlay: true,
    // avoidEmptySpaceAroundImage: true,
    // // These options help with UI positioning:
    // forceJpg: true,
    // compressImageQuality: 0.8,
    // mediaType: 'photo',
    
    //   cropperCancelText: 'Cancel',
    //   cropperChooseText: 'Confirm',
    // // Platform-specific fixes:
    // ...Platform.select({
    //   ios: {
    //     // iOS-specific options
    //   },
    //   android: {
    //     // Android-specific options to prevent status bar issues
    //     statusBarColor: '#000000', // Set your app's status bar color
    //     hideBottomControls: false,
    //     enableRotationGesture: true,
    //   }})
    //         });
    
      const uploaded = await uploadImage(image.uri, "background-images");
      setBackgroundCoverURL({key:uploaded});
          } catch(error) {
            if (error.message.includes('User cancelled image selection')) {
              console.log('User cancelled image cropping');
              return;
            }
            console.error("Error uploading image:", error);
            ToastAndroid.show('Failed to upload profile image', ToastAndroid.SHORT);
          }
        }
      }
    );
    // try {
    //   const image = await ImageCropPicker.openPicker({
    //     mediaType: 'photo',
    //     width: 1000,
    //     height: 500,
    //     cropping: true,
    //     cropperToolbarTitle: 'Crop Image',
    //     includeBase64: false,
    //   });
      
    //   const uploaded = await uploadImage(image.path, "background-images");
    //   setBackgroundCoverURL({key:uploaded});
    // } catch(error) {
    //   if (error.message.includes('User cancelled image selection')) {
    //     console.log('User cancelled image cropping');
    //     return;
    //   }
    //   console.error("Error uploading Cover image:", error);
    //   ToastAndroid.show('Failed to upload cover image', ToastAndroid.SHORT);
    // }
};

  const pickImage = async() => {
    hideImagePickerOptions();
    const hasPermission = await checkPermission('gallery');
    if (!hasPermission) return;
// console.log("thsi ")
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        quality: 1,
        maxWidth: 500,
        maxHeight: 500,
      },
      async(response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          console.log('Error: ' + response.errorMessage);
          return;
        } 
        if (response.assets && response.assets.length > 0) {
          const image = response.assets[0];
          try {
    //         const croppedImage = await ImagePicker.openCropper({
    //           path: image?.uri,
    //           width: 300,
    //           height: 300,
    //           cropping: true,
    //           cropperCircleOverlay: true,
    // avoidEmptySpaceAroundImage: true,
    // // These options help with UI positioning:
    // forceJpg: true,
    // compressImageQuality: 0.8,
    // mediaType: 'photo',
    
    //   cropperCancelText: 'Cancel',
    //   cropperChooseText: 'Confirm',
    // // Platform-specific fixes:
    // ...Platform.select({
    //   ios: {
    //     // iOS-specific options
    //   },
    //   android: {
    //     // Android-specific options to prevent status bar issues
    //     statusBarColor: '#000000', // Set your app's status bar color
    //     hideBottomControls: false,
    //     enableRotationGesture: true,
    //   }})
    //         });
            const uploaded = await uploadImage(image?.uri, "profile-images");
            setProfileURL({key:uploaded});
          } catch(error) {
            if (error.message.includes('User cancelled image selection')) {
              console.log('User cancelled image cropping');
              return;
            }
            console.error("Error uploading image:", error);
            ToastAndroid.show('Failed to upload profile image', ToastAndroid.SHORT);
          }
        }
      }
    );
  };

  // const takePhoto = async() => {
  //   hideImagePickerOptions();
  //   const hasPermission = await checkPermission('camera');
  //   if (!hasPermission) return;
    
  //   launchCamera(
  //     {
  //       mediaType: 'photo',
  //       includeBase64: false,
  //       quality: 1,
  //       maxWidth: 500,
  //       maxHeight: 500,
  //     },
  //     async(response) => {
  //       if (response.didCancel) return;
  //       if (response.errorCode) {
  //         ToastAndroid.show('Error: ' + response.errorMessage, ToastAndroid.SHORT);
  //         return;
  //       }
  //       if (response.assets && response.assets.length > 0) {
  //         const image = response.assets[0];
  //         try {
  //           const croppedImage = await ImagePicker.openCropper({
  //             path: image?.uri,
  //             width: 300,
  //             height: 300,
  //             cropping: true,
  //             cropperCircleOverlay: true,
  // cropperStatusBarColor: '#000000',
  //           });
  //           const uploaded = await uploadImage(croppedImage?.path, "profile-images");
  //           setProfileURL({key:uploaded});
  //         } catch(error) {
  //           if (error.message.includes('User cancelled image selection')) {
  //             console.log('User cancelled image cropping');
  //             return;
  //           }
  //           console.error("Error uploading image:", error);
  //           ToastAndroid.show('Failed to upload profile image', ToastAndroid.SHORT);
  //         }
  //       }
  //     }
  //   );
  // };

  const takePhoto = async () => {
  hideImagePickerOptions();
  const hasPermission = await checkPermission('camera');
  if (!hasPermission) return;

  launchCamera(
    {
      mediaType: 'photo',
      includeBase64: false,
      quality: 1,
      maxWidth: imageOptionsType === 'cover' ? 1000 : 500,
      maxHeight: imageOptionsType === 'cover' ? 500 : 500,
    },
    async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        ToastAndroid.show('Error: ' + response.errorMessage, ToastAndroid.SHORT);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const image = response.assets[0];
        try {
          if (imageOptionsType === 'cover') {
            // const croppedImage = await ImagePicker.openCropper({
            //   path: image?.uri,
            //   width: 1000,
            //   height: 500,
            //   cropping: true,
            // });
            const uploaded = await uploadImage(image?.uri, "background-images");
            setBackgroundCoverURL({ key: uploaded });
          } else {
            // const croppedImage = await ImagePicker.openCropper({
            //   path: image?.uri,
            //   width: 300,
            //   height: 300,
            //   cropping: true,
            //   cropperCircleOverlay: true,
            //   cropperStatusBarColor: '#000000',
            // });
            const uploaded = await uploadImage(image?.uri, "profile-images");
            setProfileURL({ key: uploaded });
          }
        } catch (error) {
          if (error.message.includes('User cancelled image selection')) {
            console.log('User cancelled image cropping');
            return;
          }
          console.error("Error uploading image:", error);
          ToastAndroid.show(
            `Failed to upload ${imageOptionsType === 'cover' ? 'cover' : 'profile'} image`,
            ToastAndroid.SHORT
          );
        }
      }
    }
  );
};



const [errorBio,setBioError]=useState('')
const handleBioChange = (text) => {
  // Remove any numbers from the input
  const cleanedText = text.replace(/[0-9]/g, ""); 

  if (cleanedText.length <= MAX_BIO_LENGTH) {
    setBio(cleanedText);
    setCharacterCount(cleanedText.length);

    // Show error if user tried entering numbers
    if (text !== cleanedText) {
      setBioError("Numbers are not allowed in bio");
    } else {
      setBioError(null);
    }
  }
};



  const saveProfile = async () => {
    if(userName.trim() === "") {
      setMessage('Please enter a username!');
      ToastAndroid.show('Please enter a username!', ToastAndroid.SHORT);
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.put('profile', {
        userName: userName,
        bio: bio,
        gender: gender || null,
        profileURL: profileURL,
        backgroundCoverURL: backgroundCoverURL,
      });
      
      if (response.data.status) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        
        // Pass the updated username to refresh callback
        // ✅ Encode username to handle special characters
        if (onSaveSuccess) {
          onSaveSuccess(encodeURIComponent(updatedUser.userName));
        }
        
        setIsEditModalVisible(false);
        ToastAndroid.show('Profile updated successfully!', ToastAndroid.SHORT);
      }
    } catch(error) {
      console.log('Error updating profile:', error.response.data.message);
      ToastAndroid.show( error.response.data.message, ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };
  const handleGoBackAdvanced = useDebouncedGoBack(() => {
  showModal({
      title: 'Hold on !',
      content: 'You have unsaved Selection. Save changes before leaving?',
      mode: 'normal',
      confirmText: 'Confirm',
      showIcon:false,
      onConfirm: async () => {
        // Your warning action logic here
        await performGoBack();
      },
    });
});

const performGoBack = () => {
setIsEditModalVisible(false)
};

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor={COLORS.background} barStyle="light-content" />
       <GlobalConfirmModal
        visible={modalConfig.visible}
        onClose={hideModal}
        onConfirm={handleConfirm}
        title={modalConfig.title}
        content={modalConfig.content}
        mode={modalConfig.mode}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showIcon={modalConfig.showIcon}
        isLoading={modalConfig.isLoading}
      />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleGoBackAdvanced}
            style={styles.backButton}
          >
            <ArrowLeftCircle size={24} color={COLORS.textPrimary}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          {/* <TouchableOpacity 
            onPress={() => showImagePickerOptions('cover')}
            activeOpacity={0.8}
          >
            {backgroundCoverURL?.key ? (
              <Image 
                source={{ uri: `${AWS_CDN_URL}${backgroundCoverURL?.key}` }} 
                style={styles.coverImage} 
              />
            ) : (
              <LinearGradient
                colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradientCover}
              >
                <View style={styles.coverPlaceholder}>
                  <Icon name="add-photo-alternate" color={COLORS.text} size={48} />
                  <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
                </View>
              </LinearGradient>
            )}
            <View style={styles.coverOverlay}>
              <LinearGradient
                colors={['transparent', COLORS.overlay]}
                style={styles.coverGradientOverlay}
              >
                <TouchableOpacity 
                  onPress={() => showImagePickerOptions('cover')}
                  style={styles.coverEditButton}
                >
                  <Icon name="edit" color={COLORS.text} size={20} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </TouchableOpacity> */}
        </View>
{/* {console.log(`${AWS_CDN_URL}${profileURL?.key}`)} */}
        {/* Profile Image */}

        <View style={styles.profileImageContainer}>
          <TouchableOpacity 
            onPress={() => showImagePickerOptions('profile')}
            activeOpacity={0.8}
            style={styles.profileImageWrapper}
          >
            {profileURL?.key ? (
              <Image 
                source={{ uri: `${AWS_CDN_URL}${profileURL?.key}` }} 
                style={styles.profileImage} 
              />
            ) : (
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceLight]}
                style={styles.placeholderImage}
              >
                <Icon name="person" color={COLORS.textSecondary} size={60} />
              </LinearGradient>
            )}
            <View style={styles.profileImageOverlay}>
              <LinearGradient
                colors={['transparent', COLORS.overlay]}
                style={styles.profileGradientOverlay}
              >
                <Icon name="camera-alt" color={COLORS.text} size={24} />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.inputContainer}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="person" size={16} color={COLORS.primary} /> Username
            </Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrapper}>
                <Icon name="alternate-email" color={COLORS.primary} size={20} />
              </View>
              <TextInput
                style={styles.input}
                value={userName}
                onChangeText={(text) => {
                  // Remove spaces and any non-alphanumeric characters (allow underscores)
                  const cleanedText = text.replace(/[^a-zA-Z0-9_]/g, '');

                  setUserName(cleanedText);
                  
                  // Show error if user tried entering invalid characters
                  if (text !== cleanedText) {
                    setUsernameError("Only letters, numbers and underscores are allowed");
                  } else {
                    setUsernameError('');
                  }
                  
                  if (cleanedText) {
                    checkUsernameAvailability(cleanedText);
                  }
                }}
                placeholder="Enter your username"
                placeholderTextColor={COLORS.placeholder}
                selectionColor={COLORS.primary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {usernameError ? (
              <Text style={[styles.errorMessage, {color: COLORS.error, marginTop: 4}]}>
                {usernameError}
              </Text>
            ) : null}
            {message && !usernameError ? (
              <View style={styles.messageContainer}>
                <Icon 
                  name={message.includes('available') ? 'check-circle' : 'error'} 
                  size={16} 
                  color={message.includes('available') ? COLORS.success : COLORS.error}
                />
                <Text style={[styles.messageText, 
                  message.includes('available') ? styles.successText : styles.errorText]}>
                  {message}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="description" size={16} color={COLORS.primary} /> Bio
            </Text>
            <View style={styles.bioContainer}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={handleBioChange}
                placeholder="Tell us about yourself..."
                placeholderTextColor={COLORS.placeholder}
                multiline
                maxLength={MAX_BIO_LENGTH}
                selectionColor={COLORS.primary}
              />
              <View style={styles.bioFooter}>
                <Text style={[
                  styles.characterCount, 
                  characterCount > MAX_BIO_LENGTH * 0.9 ? styles.errorText : null
                ]}>
                  {characterCount}/{MAX_BIO_LENGTH}
                </Text>
              </View>
            </View>
            {errorBio &&<Text className='text-red-500 mt-1'>{errorBio}</Text>}
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              <Icon name="wc" size={16} color={COLORS.primary} /> Gender (Optional)
            </Text>
            <GenderSelection
              selectedGender={gender}
              onGenderChange={setGender}
              disabled={loading}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveProfile}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? [COLORS.textMuted, COLORS.textMuted] : [COLORS.primary, '#CCAD27D4']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <>
                    <Icon name="check" size={20} color={COLORS.text} />
                    <Text style={styles.buttonText}>Save Profile</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => handleGoBackAdvanced()}
              activeOpacity={0.8}
            >
              <View style={styles.cancelButtonContent}>
                <Icon name="close" size={20} color={COLORS.textSecondary} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sheet for Image Picker */}
      <RBSheet
        ref={refRBSheet}
        closeOnDragDown={true}
        closeOnPressMask={true}
        draggable
        dragOnContent={true}
        animationType="slide"
        height={300}
        customStyles={{
          wrapper: {
            backgroundColor: COLORS.overlay,
          },
          draggableIcon: {
            backgroundColor: COLORS.textMuted,
          },
          container: {
            backgroundColor: COLORS.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        }}
      >
        <View style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>
              {imageOptionsType === 'profile' ? 'Profile Photo' : 'Cover Photo'}
            </Text>
          </View>
          
          <View style={styles.bottomSheetOptions}>
            <TouchableOpacity 
              style={styles.bottomSheetOption} 
              onPress={takePhoto}
            >
              <LinearGradient
                colors={[COLORS.primaryLight, COLORS.primary]}
                style={styles.optionIconContainer}
              >
                <Icon name="camera-alt" size={24} color={COLORS.text} />
              </LinearGradient>
              <Text style={styles.optionText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bottomSheetOption} 
              onPress={imageOptionsType === 'profile' ? pickImage : pickCoverImage}
            >
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentSecondary]}
                style={styles.optionIconContainer}
              >
                <Icon name="photo-library" size={24} color={COLORS.text} />
              </LinearGradient>
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  coverImageContainer: {
    width: '100%',
    height: 90,  // 220,
    position: 'relative',
    marginBottom: 10,
  },
  coverImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  gradientCover: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholder: {
    alignItems: 'center',
  },
  coverPlaceholderText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverGradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 16,
  },
  coverEditButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: -80,
    marginBottom: 30,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: COLORS.background,
  },
  placeholderImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: COLORS.background,
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 80,
    overflow: 'hidden',
  },
  profileGradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  inputContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIconWrapper: {
    width: 50,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  errorText: {
    color: COLORS.error,
  },
  successText: {
    color: COLORS.success,
  },
  bioContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  bioInput: {
    minHeight: 120,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    padding: 16,
  },
  bioFooter: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  characterCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cancelButtonContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Bottom Sheet styles
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bottomSheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  bottomSheetOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  bottomSheetOption: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileEditScreen;
