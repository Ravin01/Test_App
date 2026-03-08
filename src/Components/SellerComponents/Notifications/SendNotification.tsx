import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// import axiosCommunication from '../../../Utils/Api';
import { SafeAreaView } from 'react-native-safe-area-context';
import SellerHeader from '../SellerForm/Header';
import { Toast } from '../../../Utils/dateUtils';
import FollowersSelectionScreen from './FollowersList';
import { ActivityIndicator } from 'react-native-paper';
import { deleteObjectFromS3, uploadImageToS3 } from '../../../Utils/aws';
import { launchImageLibrary } from 'react-native-image-picker';

import Icon from 'react-native-vector-icons/MaterialIcons';
import axiosCommunication from '../../../Utils/axiosCommunication';

const SendNotifyScreen = ({navigation}) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successResponse, setSuccessRes] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [notificationResponse, setNotificationResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length > 500) {
      newErrors.message = 'Message must be less than 500 characters';
    }

    if (selectedImage && selectedImage.size > 5 * 1024 * 1024) {
      newErrors.image = 'Image must be less than 5MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImagePicker = async () => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: false,
      };

      const result = await launchImageLibrary(options);
      
      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        Toast('Failed to select image');
        console.log('ImagePicker Error: ', result.errorMessage);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        Toast('No image selected');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(asset.type)) {
        setErrors(prev => ({
          ...prev,
          image: 'Only JPG, JPEG, PNG, WEBP formats allowed'
        }));
        return;
      }

      if (asset.fileSize > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image must be less than 5MB'
        }));
        return;
      }

      setErrors(prev => ({ ...prev, image: '' }));

      setSelectedImage({
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName || `notification_${Date.now()}.jpg`,
        size: asset.fileSize,
        preview: asset.uri,
      });

    } catch (error) {
      console.error('Image picker error:', error);
      Toast('Failed to pick image');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    try {
      setUploadingImage(true);
      setErrors(prev => ({ ...prev, image: '' }));

      const imageUrl = await uploadImageToS3(
        selectedImage.uri,
        'notification-images'
      );

      console.log('Image uploaded successfully:', imageUrl);
      return imageUrl;

    } catch (error) {
      console.error('Image upload failed:', error);
      setErrors(prev => ({
        ...prev,
        image: 'Failed to upload image. Please try again.'
      }));
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (selectedImage?.url) {
      try {
        await deleteObjectFromS3(selectedImage.url);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
      }
    }
    setSelectedImage(null);
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const resetForm = () => {
    setFormData({ title: '', message: '', imageUrl: '' });
    setSelectedFollowers(new Set());
    setSelectedImage(null);
    setSelectAll(false);
    setErrors({});
  };

  const handleCloseResponseModal = () => {
    setShowResponse(false);
    setNotificationResponse(null);
    resetForm();
  };

  const handleSendNotify = async () => {
    try {
      if (!validateForm()) return;

      // Validate that followers are selected if not using selectAll
      if (!selectAll && selectedFollowers.size === 0) {
        Toast('Please select at least one follower');
        return;
      }

      setLoading(true);

      let imageUrl = '';
      if (selectedImage) {
        imageUrl = await uploadImage();
        if (!imageUrl && errors.image) {
          return;
        }
      }

      let response;
      if (selectAll) {
        // Send to all followers
        response = await axiosCommunication.post(`/seller/notifications/notify-all`, {
          title: formData.title,
          message: formData.message,
          image: imageUrl,
        });
      } else {
        // Send to selected followers only
        // Extract follower IDs from the Set of follower objects
        const ids = Array.from(selectedFollowers).map(f => f?.follower?._id || f?._id);
        
        const payload = {
          title: formData.title,
          message: formData.message,
          image: imageUrl,
          followerIds: ids
        };

        response = await axiosCommunication.post(`/seller/notifications/notify-selected`, payload);
      }

      console.log(response.data);
      
      // Store and display the response
      setNotificationResponse(response.data);
      setShowResponse(true);
      
      Toast('Notification sent successfully!');

    } catch (error) {
      console.log("Error sending notification:", error.response?.data);
      Toast(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const renderResponseModal = () => {
    if (!showResponse || !notificationResponse) return null;

    const { successful = 0, failed = 0, total = 0, message = '' } = notificationResponse;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

    return (
      <View style={styles.responseOverlay}>
        <View style={styles.responseModal}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleCloseResponseModal}
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.responseHeader}>
            <Icon 
              name={failed === 0 ? "check-circle" : "info"} 
              size={50} 
              color={failed === 0 ? "#4CAF50" : "#FFA500"}
            />
            <Text style={styles.responseTitle}>
              {failed === 0 ? 'Success!' : 'Notification Sent'}
            </Text>
          </View>

          <Text style={styles.responseMessage}>{message}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{total}</Text>
            </View>

            <View style={[styles.statBox, styles.successBox]}>
              <Text style={styles.statLabel}>Successful</Text>
              <Text style={[styles.statValue, styles.successText]}>{successful}</Text>
            </View>

            {failed > 0 && (
              <View style={[styles.statBox, styles.failedBox]}>
                <Text style={styles.statLabel}>Failed</Text>
                <Text style={[styles.statValue, styles.failedText]}>{failed}</Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Success Rate</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${successRate}%`,
                    backgroundColor: successRate === 100 ? '#4CAF50' : '#FFA500'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{successRate}%</Text>
          </View>

          <TouchableOpacity 
            style={styles.okButton}
            onPress={handleCloseResponseModal}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const formSections = [
    { id: 'title', type: 'title' },
    { id: 'message', type: 'message' },
    { id: 'imageUpload', type: 'imageUpload' },
    { id: 'imagePreview', type: 'imagePreview' },
    { id: 'followers', type: 'followers' },
    { id: 'submit', type: 'submit' },
  ];

  const renderTitleInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        Title <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={[
          styles.input,
          errors.title && styles.inputError
        ]}
        value={formData.title}
        onChangeText={(text) => {
          setFormData(prev => ({ ...prev, title: text }));
          if (errors.title) {
            setErrors(prev => ({ ...prev, title: '' }));
          }
        }}
        placeholder="Enter a catchy title..."
        placeholderTextColor="#666"
        maxLength={100}
      />
      {errors.title ? (
        <Text style={styles.errorText}>{errors.title}</Text>
      ) : null}
      <Text style={styles.charCount}>{formData.title.length}/100</Text>
    </View>
  );

  const renderMessageInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Message <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[
          styles.input,
          styles.messageInput,
          errors.message && styles.inputError
        ]}
        value={formData.message}
        onChangeText={(text) => {
          setFormData(prev => ({ ...prev, message: text }));
          if (errors.message) {
            setErrors(prev => ({ ...prev, message: '' }));
          }
        }}
        placeholder="What's on your mind?"
        placeholderTextColor="#666"
        multiline
        textAlignVertical="top"
        maxLength={500}
      />
      {errors.message ? (
        <Text style={styles.errorText}>{errors.message}</Text>
      ) : null}
      <Text style={styles.charCount}>{formData.message.length}/500</Text>
    </View>
  );

  const renderImageUpload = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Image (Optional)</Text>
      <Text style={styles.imageSubtitle}>
        Supported formats: JPG, PNG, WEBP • Max size: 5MB
      </Text>
      
      <TouchableOpacity
        style={[
          styles.imageUploadButton,
          errors.image && styles.inputError
        ]}
        onPress={handleImagePicker}
        disabled={uploadingImage}
      >
        {uploadingImage ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={styles.uploadingText}>Uploading Image...</Text>
          </View>
        ) : (
          <View style={styles.uploadContent}>
            <Icon name="add-photo-alternate" size={40} color="#666" />
            <Text style={styles.uploadText}>
              {selectedImage ? 'Change Image' : 'Select Image from Gallery'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {errors.image ? (
        <Text style={styles.errorText}>{errors.image}</Text>
      ) : null}
    </View>
  );

  const renderImagePreview = () => {
    if (!selectedImage) return null;

    return (
      <View style={styles.imagePreviewContainer}>
        <Text style={styles.label}>Image Preview</Text>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: selectedImage.preview }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeImage}
            disabled={uploadingImage}
          >
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
          
          {uploadingImage && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.uploadOverlayText}>Uploading...</Text>
            </View>
          )}
        </View>
        
        <View style={styles.imageInfo}>
          <Text style={styles.imageInfoText}>
            Size: {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB
          </Text>
          <Text style={styles.imageInfoText}>
            Type: {selectedImage.type.split('/')[1].toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const renderFollowersSelection = () => (
    <View style={styles.followersContainer}>
      <Text style={styles.label}>Select Followers <Text style={styles.required}>*</Text></Text>
      <View style={styles.followersWrapper}>
        <FollowersSelectionScreen
          onSelectionChange={setSelectedFollowers}
          allowMultiSelect={true}
          selectedFollowers1={selectedFollowers}
          selectAll={selectAll}
          setSelectAll={() => setSelectAll(!selectAll)}
        />
      </View>
    </View>
  );

  const renderSubmitButton = () => (
    <TouchableOpacity
      style={[
        styles.submitButton,
        (loading || uploadingImage) && styles.submitButtonDisabled
      ]}
      onPress={handleSendNotify}
      disabled={loading || uploadingImage}
      activeOpacity={0.8}
    >
      {loading || uploadingImage ? (
        <ActivityIndicator size={'small'} color='#000' />
      ) : (
        <Text style={styles.submitButtonText}>Send Notification</Text>
      )}
    </TouchableOpacity>
  );

  const renderFormSection = ({ item }) => {
    switch (item.type) {
      case 'title':
        return renderTitleInput();
      case 'message':
        return renderMessageInput();
      case 'imageUpload':
        return renderImageUpload();
      case 'imagePreview':
        return renderImagePreview();
      case 'followers':
        return renderFollowersSelection();
      case 'submit':
        return renderSubmitButton();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SellerHeader navigation={navigation} message={'Send Message'} />
        
        <FlatList
          data={formSections}
          renderItem={renderFormSection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />
      </KeyboardAvoidingView>
      
      {renderResponseModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  required: {
    color: 'red',
  },
  imageSubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    height: 50,
    fontSize: 16,
    color: '#FFFFFF',
    paddingHorizontal: 10,
  },
  messageInput: {
    height: 120,
    paddingTop: 16,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 4,
  },
  charCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  imageUploadButton: {
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFD700',
    marginTop: 8,
    fontSize: 14,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayText: {
    color: '#FFD700',
    marginTop: 8,
    fontSize: 14,
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  imageInfoText: {
    color: '#888',
    fontSize: 12,
  },
  followersContainer: {
    marginBottom: 20,
    padding: 5,
  },
  followersWrapper: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Response Modal Styles
  responseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  responseModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  responseHeader: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  responseMessage: {
    fontSize: 16,
    color: '#BBB',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  successBox: {
    borderColor: '#4CAF50',
  },
  failedBox: {
    borderColor: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successText: {
    color: '#4CAF50',
  },
  failedText: {
    color: '#FF6B6B',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  okButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  okButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SendNotifyScreen;
