/* eslint-disable react-native/no-inline-styles */
import React, {useContext, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ToastAndroid,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import {launchImageLibrary} from 'react-native-image-picker';
import Video from 'react-native-video';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../../Utils/Api';
import {AuthContext} from '../../../Context/AuthContext';
import ProductTabShopaAble from './ProducrsTab';
import {checkPermission} from '../../../Utils/Permission';
import {
  AWS_CDN_URL,
  deleteObjectFromS3,
  uploadImageToS3,
  uploadVideoToS3,
} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {optimizeUrl} from '../../../../Config';
import axios from 'axios';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDebouncedGoBack} from '../../../Utils/useDebouncedGoBack';
import ToggleSwitch from 'toggle-switch-react-native';
import useConfirmModal from '../../../hooks/useAlertModal';
import GlobalConfirmModal from '../../Reuse/AlertModal';
import axiosInstance from '../../../Utils/Api';
import {
  useEffectiveSellerId,
  useAccessModeInfo,
} from '../../../Context/AccessContext';
import {useSellerContext} from '../../../Context/SellerContext';

const {width, height} = Dimensions.get('window');

const ShopableForm = React.memo(
  ({navigation, initialData, isEditMode, onSubmit, goBack}) => {
    //	console.log('initialData====',initialData);
    const {modalConfig, showModal, hideModal, handleConfirm} =
      useConfirmModal();

    // Access mode hooks
    const effectiveSellerId = useEffectiveSellerId();
    const {isAccessMode} = useAccessModeInfo();

    // Title character count
    const MAX_TITLE_LENGTH = 100;
    const [titleCharacterCount, setTitleCharacterCount] = useState(
      initialData?.title?.length || 0,
    );

    const handleGoBackAdvanced = useDebouncedGoBack(() => {
      showModal({
        title: 'Unsaved Changes',
        content:
          'You have modified your product selection. Save changes before leaving?',
        mode: 'warning',
        confirmText: 'Continue',
        showIcon: false,
        onConfirm: async () => {
          // Your warning action logic here
          await performGoBack();
        },
      });
      // const hasChanges = true

      // let title, message, buttons;

      // // if (isEditMode && hasChanges) {
      //   title = "Unsaved Changes";
      //   message = "You have modified your product selection. Save changes before leaving?";
      //   buttons = [
      //     { text: "Cancel", style: "cancel" },

      //     {
      //       text: "Confim",
      //       onPress: () => {
      //         // onSelectProducts(selectedProducts);
      //         // setIsChangesMade(false);
      //         performGoBack();
      //       }
      //     }
      //   ];
      // // }

      // Alert.alert(title, message, buttons);
    });

    const performGoBack = () => {
      if (typeof goBack === 'function' && isEditMode) {
        goBack();
      } else {
        navigation.goBack();
      }
    };
    const [selectedProduct, setSelectedProduct] = useState(
      initialData?.productsListed || [],
    );
    const [autoCategory, setAutoCategory] = useState({
      category: initialData?.category || '',
      subcategory: initialData?.subcategory || '',
    });

    const [loading, setloading] = useState(false);
    const [formData, setFormData] = useState({
      videoTitle: initialData?.title || '',
      description: initialData?.description || '',
      thumbnail: null,
      videoFile: null,
      hashtags: initialData?.hashTags || [],
      thumbnailBlobName: initialData?.thumbnailBlobName || '',
      search: '',
      hashtagInput: '',
      category: initialData?.category || ' ',
      subcategory: initialData?.subcategory || ' ',
      originalVideoBlobName: initialData?.originalVideoBlobName || '',
      videoId: initialData?.videoId || '',
      originalFileSize: initialData?.originalFileSize || '',
      //isThumbnailEnabled: initialData?.thumbnailBlobName!=undefined ||true,
      isThumbnailEnabled:
        initialData?.isThumbnailEnabled !== undefined
          ? initialData.isThumbnailEnabled
          : false, // // false = auto-generate by default
      isProduct:
        initialData?.isProductsAvailable !== undefined
          ? initialData.isProductsAvailable
          : false,
    });

    const [autoGeneratingThumbnail, setAutoGeneratingThumbnail] =
      useState(false);

    // console.log(formData?.thumbnailBlobName);
    const [paused, setPaused] = useState(true);
    // console.log(initialData.isProductsAvailable)
    const togglePlayback = () => {
      setPaused(prev => !prev);
    };
    const supportedTypes = [
      'video/mp4',
      'video/mov',
      'video/webm',
      'video/x-matroska', // .mkv
      'video/x-msvideo', // .avi
      'video/x-m4v', // .m4v
      'video/quicktime', // Alternative MIME type for .mov
      'video/avi', // Alternative MIME type for .avi
    ];
    // console.log(formData)
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [videoDetails, setVideoDetails] = useState(null);

    const selectMedia = async type => {
      const hasPermission = await checkPermission('gallery');
      if (!hasPermission) {
        return;
      }

      const options = {mediaType: type, quality: 1};

      launchImageLibrary(options, async response => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          console.error('Image Picker Error: ', response.errorMessage);
          return;
        }
        const img = response.assets[0];

        if (type === 'photo') {
          if (formData.thumbnailBlobName) {
            await deleteObjectFromS3(formData.thumbnailBlobName);
          }

          setloading(true);

          // const url = (await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL)) || '';
          const url = await uploadImageToS3(img.uri, 'thumbnails');

          // console.log(url);
          handleInputChange('thumbnail', url);
          handleInputChange('thumbnailBlobName', url);
          setloading(false);
        } else if (type === 'video') {
          const maxSize = 1 * 1024 * 1024 * 1024; // 1GB
          const maxDuration = 90; // seconds
          const minDuration = 4; // seconds
          const video = response.assets[0];
          // console.log(video)

          const videoSize = video.fileSize;
          const videoDuration = video.duration;
          setVideoDetails({videoSize, videoDuration, videoType: video.type});

          if (!supportedTypes.includes(video.type)) {
            ToastAndroid.show(
              'Unsupported video format. Supported formats: MP4, MOV, WEBM, MKV, AVI, M4V',
              ToastAndroid.SHORT,
            );
            return;
          }

          if (!videoSize || !videoDuration) {
            ToastAndroid.show(
              'Unable to read video properties.',
              ToastAndroid.SHORT,
            );
            return;
          }

          if (videoDuration > maxDuration) {
            ToastAndroid.show(
              `Video duration exceeds ${maxDuration} seconds. Your video is ${Math.round(
                videoDuration,
              )} seconds.`,
              ToastAndroid.SHORT,
            );
            return;
          }

          if (videoDuration < minDuration) {
            ToastAndroid.show(
              `Video duration is too short. Minimum duration is ${minDuration} seconds.`,
              ToastAndroid.SHORT,
            );
            return;
          }

          if (videoSize > maxSize) {
            ToastAndroid.show(
              'Video is too large (Max 1GB).',
              ToastAndroid.SHORT,
            );
            return;
          }

          // If all validations pass, proceed with upload
          // setloading(true);
          setIsUploading(true);
          try {
            const url = await uploadVideoToS3(video.uri, 'videos', progress => {
              setUploadProgress(Math.round(progress));
            });
            console.log(url);
            handleInputChange('videoFile', url);
            //Needed for optimize api call
            handleInputChange('originalVideoBlobName', url);
            handleInputChange('originalFileSize', videoSize);

            if (!formData.isThumbnailEnabled && url)
              await generateThumbNail(url); //Auto generate thumbnail
          } catch (error) {
            console.log('Video upload failed:', error);
            ToastAndroid.show('Video upload failed.', ToastAndroid.SHORT);
          } finally {
            setIsUploading(false);
            setloading(false);
          }
        }
      });
    };

    // Function to remove uploaded video
    const removeVideo = async () => {
      try {
        // Delete video from S3
        if (formData.videoFile) {
          await deleteObjectFromS3(formData.videoFile);
        }

        // Delete ONLY autogenerated thumbnail from S3 (custom thumbnails should be preserved)
        if (formData.thumbnailBlobName && !formData.isThumbnailEnabled) {
          await deleteObjectFromS3(formData.thumbnailBlobName);
        }

        // Clear video data and autogenerated thumbnail data
        // Custom thumbnails are preserved so user can reuse them
        setFormData(prev => ({
          ...prev,
          videoFile: null,
          originalVideoBlobName: '',
          originalFileSize: '',
          // Only clear thumbnail if it was autogenerated
          thumbnail: !formData.isThumbnailEnabled ? null : prev.thumbnail,
          thumbnailBlobName: !formData.isThumbnailEnabled
            ? ''
            : prev.thumbnailBlobName,
        }));
        setVideoDetails(null);
      } catch (e) {
        console.log(e);
      }
    };

    // Format file size to readable format
    const formatFileSize = bytes => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format duration to MM:SS format
    const formatDuration = seconds => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Function to autogenerate thumbnail
    const generateThumbNail = async url => {
      try {
        setAutoGeneratingThumbnail(true);
        const res = await axiosInstance.post(`/thumbnail/generate-thumbnail`, {
          timeStamp: 1,
          videoKey: url,
        });
        // console.log('Auto generate thumbnail res ===',res.data)
        handleInputChange('thumbnail', res.data.thumbnailKey); //thumbnailKey
        handleInputChange('thumbnailBlobName', res.data.thumbnailKey);
        ToastAndroid.show(res.data.message, ToastAndroid.SHORT);
      } catch (err) {
        console.log(err);
        handleInputChange('isThumbnailEnabled', true);
      } finally {
        setAutoGeneratingThumbnail(false);
      }
    };

    const handleThumbnailToggle = async () => {
      const newState = !formData.isThumbnailEnabled;
      handleInputChange('isThumbnailEnabled', newState);

      if (newState) {
        // ✅ Switched ON → custom thumbnail
        if (formData.thumbnailBlobName) {
          await deleteObjectFromS3(formData.thumbnailBlobName);
          handleInputChange('thumbnail', '');
          handleInputChange('thumbnailBlobName', '');
        }
      } else {
        // ✅ Switched OFF → auto-generate thumbnail if video exists
        if (formData?.originalVideoBlobName) {
          generateThumbNail(formData.originalVideoBlobName);
        }
      }
    };

    // console.log(selectedProduct)
    const handleSubmit = async () => {
      // Form validations
      if (formData.isProduct) {
        if (selectedProduct.length === 0) {
          ToastAndroid.show(
            'Please select at least one product or press confirm selection button.',
            ToastAndroid.SHORT,
          );
          return;
        }
      }

      // if (!selectedCategory) {
      //   ToastAndroid.show('Please select a category.', ToastAndroid.SHORT);
      //   return;
      // }

      // if (!selectedSubCategory) {
      //   ToastAndroid.show('Please select a subcategory.', ToastAndroid.SHORT);
      //   return;
      // }

      if (!isEditMode) {
        if (!formData.videoFile) {
          ToastAndroid.show('Please upload a video.', ToastAndroid.SHORT);
          return;
        }
      }
      if (formData.isThumbnailEnabled) {
        if (!formData.thumbnailBlobName) {
          ToastAndroid.show(
            'Please upload a thumbnail image.',
            ToastAndroid.SHORT,
          );
          return;
        }
      }

      // if (!formData?.description?.trim()) {
      //   ToastAndroid.show('Please enter a description.', ToastAndroid.SHORT);
      //   return;
      // }

      if (!formData.videoTitle?.trim()) {
        ToastAndroid.show('Please enter a video title.', ToastAndroid.SHORT);
        return;
      }

      // if (!formData.hashtags || formData.hashtags.length === 0) {
      //   ToastAndroid.show(
      //     'Please enter at least one hashtag.',
      //     ToastAndroid.SHORT,
      //   );
      //   return;
      // }

      // console.log('Submit Completed validation');

      setloading(true); // Start loading

      try {
        let videoId = formData.videoId;

        // Create mode: call optimization API
        if (!isEditMode) {
          let optimizeResult;

          try {
            console.log('Calling optimization API...');
            const optimizeResponse = await axios.post(
              'https://control-backend-server-prod.flykup.live/api/video/optimize',
              // `${optimizeUrl}/processing/optimize`,
              {
                key: formData.originalVideoBlobName,
              },
            );

            // if (!optimizeResponse.ok) {
            //   const errorText = await optimizeResponse.text();
            //   throw new Error(`Optimization failed: ${errorText}`);
            // }

            // console.log("optimized url====",optimizeResponse.data);
            optimizeResult = optimizeResponse.data.data;

            if (!optimizeResult?.videoId) {
              throw new Error('No video ID received from optimization API');
            }

            videoId = optimizeResult.videoId;
            console.log('Completed the optimize API call');
          } catch (err) {
            console.error('Error during optimization API call:', err.message);
            ToastAndroid.show(
              `Optimization failed: ${err.message}`,
              ToastAndroid.SHORT,
            );
            return;
          }

          // Payload for creation - convert product objects to IDs for API
          const payload = {
            title: formData.videoTitle,
            // description: formData.description,
            thumbnailURL: formData.thumbnail,
            thumbnailBlobName: formData.thumbnailBlobName,
            videoURL: formData.videoFile,
            productsListed: formData.isProduct
              ? selectedProduct.map(p => p._id)
              : [],

            isProductsAvailable: formData.isProduct,
            hashTags: formData.hashtags,
            category: autoCategory.category,
            subcategory: autoCategory.subcategory,
            originalVideoBlobName: formData.originalVideoBlobName || null,
            videoId: videoId,
            originalFileSize: formData.originalFileSize,

            durationSeconds: videoDetails.videoDuration,
            isThumbnailEnabled: formData?.isThumbnailEnabled,
          };

          // If in access mode, include the effective seller ID to create under that seller
          if (effectiveSellerId) {
            payload.hostId = effectiveSellerId;
          }

          console.log('payload', payload);

          // API Call to create video
          await api.post(`/shoppable-videos/`, payload);
          ToastAndroid.show(
            'Successfully created shoppable video.',
            ToastAndroid.SHORT,
          );
          navigation.goBack();
        } else {
          // Edit mode logic - convert product objects to IDs for API
          const payload = {
            title: formData.videoTitle.trim(),
            // description: formData.description.trim(),
            category: autoCategory.category,
            subcategory: autoCategory.subcategory,
            productsListed: formData.isProduct
              ? selectedProduct.map(p => p._id)
              : [],
            hashTags: formData.hashtags,
            thumbnailBlobName: formData.thumbnailBlobName,
            originalVideoBlobName: formData.originalVideoBlobName,
            originalFileSize: formData.originalFileSize,
            videoId: videoId,
            isProductsAvailable: formData.isProduct,
            isThumbnailEnabled: formData?.isThumbnailEnabled,
          };

          console.log('Edit Payload', payload);

          if (typeof onSubmit === 'function') {
            await onSubmit(payload);
            // navigate("/seller/viewvideo");
            //goBack();
          }
        }
      } catch (error) {
        console.error('Submission failed:', error.response.data);
        ToastAndroid.show(
          `Submission failed: ${
            error?.response?.data?.message || error?.message || 'Unknown error'
          }`,
          ToastAndroid.SHORT,
        );
      } finally {
        setloading(false); // Stop loading in both success or failure
      }
    };

    const popularTags = [
      'fashion',
      'beauty',
      'tech',
      'lifestyle',
      'trending',
      'viral',
      'style',
      'shopping',
    ];

    const renderTagItem = ({item}) => {
      const selected = formData.hashtags.includes(item);

      return (
        <TouchableOpacity
          style={[styles.tagButton, selected && styles.tagButtonSelected]}
          onPress={() => addHashtag(item)}
          activeOpacity={0.7}>
          <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
            #{item}
          </Text>
          {selected && (
            <Icon
              name="check"
              size={14}
              color="#fff"
              style={styles.checkIcon}
            />
          )}
        </TouchableOpacity>
      );
    };
    const addHashtag = tag => {
      // const tag = formData.hashtagInput.trim().replace(/[^a-zA-Z0-9]/g, '');

      if (tag) {
        const hashtagToAdd = `#${tag}`;
        // Check if hashtag already exists (case-insensitive)
        const isDuplicate = formData.hashtags.some(
          existingTag =>
            existingTag.toLowerCase() === hashtagToAdd.toLowerCase(),
        );

        if (isDuplicate) {
          ToastAndroid.show(
            'This hashtag has already been added.',
            ToastAndroid.SHORT,
          );
          return;
        }

        setFormData(prev => ({
          ...prev,
          hashtags: [...prev.hashtags, hashtagToAdd],
          hashtagInput: '',
        }));
      }
    };
    const handleInputChange = (name, value) => {
      setFormData(prev => ({...prev, [name]: value}));
    };

    const handleTitleChange = text => {
      if (text.length <= MAX_TITLE_LENGTH) {
        handleInputChange('videoTitle', text);
        setTitleCharacterCount(text.length);
      }
    };
    const removeHashtag = index => {
      setFormData(prev => ({
        ...prev,
        hashtags: prev.hashtags.filter((_, i) => i !== index),
      }));
    };
    const handleCategoryAutoPopulate = (category, subcategory) => {
      setAutoCategory({category, subcategory});
    };
    // console.log(optimizeUrl)
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          {loading ? (
            <View style={styles.overlay}>
              <View style={styles.overlayContainer}>
                <ActivityIndicator color="gray" size={20} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBackAdvanced}
              activeOpacity={0.7}>
              <Ionicons
                name="arrow-back-circle-outline"
                size={30}
                color="white"
              />
            </TouchableOpacity>
            <LinearGradient
              colors={['#B38728', '#FFD700']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.headerGradient}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {isEditMode ? 'Edit' : 'Upload'} Shoppable
                </Text>
              </View>
            </LinearGradient>
          </View>
          {/* <SellerHeader navigation={navigation} message={`${isEditMode ? 'Edit' : 'Upload'} Shoppable`}/> */}
          {/* Main FlatList to handle scrolling of entire form and product list */}
          <FlatList
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{paddingBottom: 100}}
            data={[1]} // Only 1 item for the entire form
            keyExtractor={item => item.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <View style={{padding: 10}}>
                {/* <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              
              <ArrowLeftCircle  size={25} color={colors.whiteColor}/>
            </TouchableOpacity>

            <Text style={styles.header}>
              Upload Shoappable<Text style={{color: '#fff'}}> Video</Text>
            </Text> */}

                <View style={styles.row}>
                  <Entypo name="video" size={20} color={colors.whiteColor} />
                  <Text style={styles.label}>
                    Video Title <Text style={{color: 'red'}}>*</Text>
                  </Text>
                </View>

                <View>
                  <View style={styles.titleFooter}>
                    <Text
                      style={[
                        styles.titleCharacterCount,
                        titleCharacterCount > MAX_TITLE_LENGTH * 0.9
                          ? styles.titleCountWarning
                          : null,
                      ]}>
                      Limit : {titleCharacterCount}/{MAX_TITLE_LENGTH}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Video Title"
                    value={formData.videoTitle}
                    onChangeText={handleTitleChange}
                    placeholderTextColor={'#777'}
                    maxLength={MAX_TITLE_LENGTH}
                  />
                </View>

                {/* Product List FlatList */}

                <View className="bg-secondary-color rounded-xl p-4 mb-5 border border-gray-700/30">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-semibold text-lg mb-1">
                        Product Tagging
                      </Text>
                      <Text className="text-gray-300 text-sm leading-5">
                        {formData.isProduct
                          ? 'Products can be tagged in this video for shopping features'
                          : 'This will be a regular video without product tagging capabilities'}
                      </Text>
                    </View>

                    <ToggleSwitch
                      isOn={formData.isProduct}
                      onColor="#F7CE45" // Your primary yellow
                      offColor="#374151" // Dark gray for disabled
                      onToggle={isOn => handleInputChange('isProduct', isOn)}
                      thumbColor="#ffffff"
                      ios_backgroundColor="#374151"
                      size="medium"
                      animationSpeed={300}
                      trackOnStyle={{
                        backgroundColor: '#F7CE45',
                        borderColor: '#F59E0B', // Slightly darker yellow border
                      }}
                      trackOffStyle={{
                        backgroundColor: '#374151',
                        borderColor: '#4B5563',
                      }}
                      thumbOnStyle={{
                        backgroundColor: '#ffffff',
                        shadowColor: '#F7CE45',
                        shadowOffset: {width: 0, height: 2},
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                      }}
                      thumbOffStyle={{
                        backgroundColor: '#D1D5DB',
                        shadowColor: '#000',
                        shadowOffset: {width: 0, height: 1},
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                      }}
                    />
                  </View>

                  {/* Status indicator with yellow accent */}
                  <View className="flex-row items-center">
                    <View
                      className={`w-2 h-2 rounded-full mr-2`}
                      style={{
                        backgroundColor: formData.isProduct
                          ? '#F7CE45'
                          : '#6B7280',
                      }}
                    />
                    <Text
                      className={`text-sm font-medium ${
                        formData.isProduct ? 'text-yellow-300' : 'text-gray-400'
                      }`}>
                      {formData.isProduct
                        ? 'Product tagging enabled'
                        : 'Regular video mode'}
                    </Text>
                  </View>
                </View>
                {/* Price Input */}
                {/* <View style={styles.row}>
                  <Ionicons
                    name="reader-outline"
                    size={20}
                    color={colors.whiteColor}
                  />
                  <Text style={styles.label}>
                    Description <Text style={{color: 'red'}}>*</Text>
                  </Text>
                </View> */}

                {/* <TextInput
                  style={styles.textArea}
                  value={formData.description}
                  placeholder="Describe your product and key features"
                  placeholderTextColor={'#777'}
                  onChangeText={text => handleInputChange('description', text)}
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                /> */}
                {formData.isProduct && (
                  <ProductTabShopaAble
                    initialSelectedProducts={selectedProduct}
                    onSelectProducts={setSelectedProduct}
                    isEditMode={isEditMode}
                    // category={autoCategory.}
                    onCategoryChange={handleCategoryAutoPopulate}
                    // subcategory={selectedSubCategory}
                  />
                )}

                {/* Video Upload */}
                <View style={styles.row}>
                  <AntDesign
                    name="filetext1"
                    size={20}
                    color={colors.whiteColor}
                  />
                  <Text style={styles.label}>
                    Shoppable Video <Text style={{color: 'red'}}>*</Text>
                  </Text>
                </View>
                {/* Video details display */}
                {(formData.videoFile || videoDetails) && (
                  <View style={styles.videoDetailsContainer}>
                    <View style={styles.videoDetailsRow}>
                      <Text style={styles.videoDetailLabel}>Duration:</Text>
                      <Text style={styles.videoDetailValue}>
                        {videoDetails
                          ? formatDuration(videoDetails.videoDuration)
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.videoDetailsRow}>
                      <Text style={styles.videoDetailLabel}>Size:</Text>
                      <Text style={styles.videoDetailValue}>
                        {videoDetails
                          ? formatFileSize(videoDetails.videoSize)
                          : formData.originalFileSize
                          ? formatFileSize(formData.originalFileSize)
                          : 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={removeVideo}>
                      <Ionicons name="trash-outline" size={16} color="red" />
                      <Text style={styles.removeVideoText}>Remove Video</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.uploadButton}
                  disabled={
                    isEditMode &&
                    !formData?.videoFile &&
                    !!initialData?.originalVideoBlobName
                  }
                  onPress={() => selectMedia('video')}>
                  {isEditMode &&
                  !formData?.videoFile &&
                  (initialData?.masterPlaylistKey ||
                    initialData?.originalVideoBlobName) ? (
                    <>
                      <Video
                        style={{height: '90%', width: '100%'}}
                        source={{
                          uri: `${AWS_CDN_URL}${
                            initialData?.originalVideoBlobName ||
                            initialData?.masterPlaylistKey
                          }`,
                        }}
                        resizeMode="contain"
                        repeat={true}
                        paused={paused}
                      />
                      <TouchableOpacity
                        onPress={togglePlayback}
                        style={styles.playPauseButton}>
                        <Ionicons
                          name={paused ? 'play-circle' : 'pause-circle'}
                          size={20}
                          color="#ffffff"
                        />
                      </TouchableOpacity>
                      <Text
                        style={{
                          bottom: 1,
                          position: 'absolute',
                          color: '#eee',
                          fontSize: 12,
                          textAlign: 'center',
                        }}>
                        <Text
                          style={{
                            fontWeight: 'bold',
                            fontSize: 13,
                            color: 'red',
                          }}>
                          Note:
                        </Text>{' '}
                        Uploaded Video Cannot be changed
                      </Text>
                    </>
                  ) : isUploading ? (
                    <>
                      <ActivityIndicator color="orange" size={'small'} />
                      {/* <AntDesign name="loading1" size={30} color="orange" /> */}
                      <Text
                        style={{
                          color: 'orange',
                          fontSize: 12,
                          textAlign: 'center',
                        }}>
                        Uploading... {uploadProgress}%
                      </Text>
                    </>
                  ) : formData?.videoFile ? (
                    <>
                      <Video
                        style={{height: '90%', width: '100%'}}
                        source={{
                          uri: `${AWS_CDN_URL}${formData?.videoFile}`,
                        }}
                        resizeMode="contain"
                        repeat={true}
                        controls={true}
                        // paused={paused}
                      />
                      {/* <AntDesign name="checkcircle" size={30} color="green" /> */}
                      {/* <Text
                        style={{
                          color: 'green',
                          fontSize: 12,
                          textAlign: 'center',
                        }}>
                        Video Uploaded Successfully
                      </Text> */}
                    </>
                  ) : (
                    <>
                      <AntDesign name="upload" size={30} color="#fcd34d" />
                      <Text style={styles.uploadButtonText}>
                        Click to upload product video (max 1.30 minutes and max
                        size 1GB)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View className="flex-row items-center justify-between p-3 bg-secondary-color mb-4 rounded-2xl border border-primary-color">
                  <View className="flex-row gap-2 items-center">
                    <AntDesign
                      name="camerao"
                      size={14}
                      color={colors.whiteColor}
                    />
                    <Text className="text-base font-medium text-gray-200">
                      Auto-Generate Thumbnail
                    </Text>
                  </View>

                  <ToggleSwitch
                    onColor="#F7CE45" //Yellow for ON
                    offColor="#374151" // Gray for OFF
                    size="medium"
                    isOn={!formData.isThumbnailEnabled}
                    onToggle={handleThumbnailToggle}
                    disabled={autoGeneratingThumbnail}
                    // onToggle={() =>
                    //   handleInputChange(
                    //     'isThumbnailEnabled',
                    //     !formData.isThumbnailEnabled,
                    //   )
                    // }
                  />
                </View>

                {formData.isThumbnailEnabled ? (
                  <>
                    <View style={styles.row}>
                      <AntDesign
                        name="camerao"
                        size={20}
                        color={colors.whiteColor}
                      />
                      <Text style={styles.label}>
                        Thumbnail Image <Text style={{color: 'red'}}>*</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => selectMedia('photo')}>
                      {formData?.thumbnailBlobName ? (
                        <FastImage
                          source={{
                            uri: `${AWS_CDN_URL}${formData?.thumbnailBlobName}`,
                          }}
                          style={{height: '100%', width: '100%'}}
                          // onError={e => console.log(e.nativeEvent.error)}
                          resizeMode="contain"
                        />
                      ) : (
                        <>
                          <AntDesign name="upload" size={30} color="#fcd34d" />
                          <Text style={styles.uploadButtonText}>
                            Click to upload product image (JPEG, JPG, PNG), size
                            200 X 200
                          </Text>
                        </>
                      )}
                      {/* {image?<Text style={{color:'green'}}>{image} Image Submitted</Text>:<Text style={styles.uploadButtonText}>
                
              </Text>} */}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{marginTop: 12, color: '#fff'}}>
                      AutoGenerated Thumbnail
                    </Text>
                    <View style={styles.autoContainer}>
                      {autoGeneratingThumbnail ? (
                        <View style={styles.centered}>
                          <ActivityIndicator size="small" color={'#ffd700'} />
                          <Text style={styles.loadingText1}>
                            Generating thumbnail from video...
                          </Text>
                          <Text style={[styles.subText, {color: '#fff'}]}>
                            This may take a moment
                          </Text>
                        </View>
                      ) : formData?.thumbnailBlobName ? (
                        <View style={styles.previewWrapper}>
                          <FastImage
                            source={{
                              uri: `${AWS_CDN_URL}${formData?.thumbnailBlobName}`,
                            }}
                            style={styles.thumbnailImage}
                            resizeMode="contain"
                          />
                          <View style={styles.badgeAuto}>
                            <Text style={styles.badgeText}>Auto-generated</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.centered}>
                          <AntDesign
                            name="camerao"
                            size={30}
                            color={'#ffd700'}
                          />
                          <Text style={styles.subText}>
                            Upload a video first to auto-generate thumbnail
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                <View style={styles.row}>
                  <AntDesign name="slack" size={20} color={colors.whiteColor} />
                  <Text style={styles.label}>
                    Add Hashtags (Optional)
                    {/* <Text style={{color: 'red'}}>*</Text> */}
                  </Text>
                </View>
                <FlatList
                  data={popularTags}
                  renderItem={renderTagItem}
                  keyExtractor={item => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tagsContainer}
                  ItemSeparatorComponent={() => (
                    <View style={styles.tagSeparator} />
                  )}
                />

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder="Eg #trending #popular #botsquad"
                    placeholderTextColor={'#777'}
                    value={formData.hashtagInput}
                    style={{width: '90%', color: '#ddd'}}
                    onChangeText={text =>
                      handleInputChange('hashtagInput', text)
                    }
                  />
                  <TouchableOpacity
                    onPress={() =>
                      addHashtag(
                        formData.hashtagInput
                          .trim()
                          .replace(/[^a-zA-Z0-9]/g, ''),
                      )
                    }
                    style={{
                      padding: 10,
                      backgroundColor: '#2F2E31',
                      borderRadius: 20,
                    }}>
                    <Ionicons name="send-outline" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 10,
                  }}>
                  {formData.hashtags.map((tag, index) => {
                    return (
                      <View key={index} style={styles.selectedTags}>
                        <Text style={{color: 'white'}}>{tag} </Text>
                        <TouchableOpacity onPress={() => removeHashtag(index)}>
                          <AntDesign name="close" size={17} color="red" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <View className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 rounded-md">
                  <Text className="text-yellow-800 font-bold mb-2 text-lg">
                    Copyright & Content Warning
                  </Text>
                  <Text className="text-yellow-700 text-sm">
                    Please ensure your video does not contain any copyrighted
                    material, such as movie songs, clips, or other protected
                    audio/video for which you do not own the rights.
                  </Text>
                  <Text className="text-yellow-700 text-sm mt-2">
                    Uploading copyrighted content may result in your video being
                    removed.
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? 'Save Changes' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  },
);

// Styles
const styles = StyleSheet.create({
  videoDetailsContainer: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },

  tagsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagSeparator: {
    width: 12,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minHeight: 36,
  },
  tagButtonSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  tagTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 6,
  },
  selectedContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  selectedTagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976d2',
  },
  videoDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  videoDetailLabel: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  videoDetailValue: {
    color: '#FFF',
    fontSize: 14,
  },
  removeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  removeVideoText: {
    color: 'red',
    marginLeft: 5,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.primaryColor,
    // marginTop: Platform.select({ ios: 10, android: height * 0.02 }),
    alignItems: 'center',
    gap: width * 0.1,
    // paddingVertical: height * 0.01,
    // paddingHorizontal: width * 0.02,
    // marginBottom:20,
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
  },
  title: {
    color: 'white',
    fontSize: Math.min(15, width * 0.045),
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: colors.SecondaryColor,
    // borderWidth: 1,
    // borderColor: colors.textColor,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#ddd',
    minHeight: 100,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  ap: {
    borderRadius: 10,
    color: '#fff',
    padding: 4,
    backgroundColor: '#f7ce45',
    marginTop: 10,
  },
  productQuantity: {
    color: 'green',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 5,
    backgroundColor: '#dcfce7',
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10',
  },
  productImage: {
    width: 70,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  productHeader: {fontWeight: 'bold', fontSize: 17},
  productDescription: {color: '#777'},
  productAddButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: '25%',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    gap: 5,
  },
  selectedTags: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    padding: 5,
    borderRadius: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 5,
    height: 50,
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  inputBox: {
    // color: '#777',
    backgroundColor: colors.SecondaryColor,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    // borderColor:
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 10,
    marginBottom: 20,
    padding: 10,
    color: '#ddd',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  container: {
    flex: 1,
    padding: 10,
    paddingBottom: 20,
    backgroundColor: colors.primaryColor,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',

    color: colors.whiteColor,
  },
  dropdown: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.SecondaryColor,
    padding: 10,
    marginBottom: 20,
    color: '#fff',
    paddingLeft: 10,
    fontSize: 14,
  },
  uploadButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 150,
    paddingHorizontal: 10,
    backgroundColor: '#FDD1221A',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dotted',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fcd34d',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  videoPreview: {
    height: 200,
    width: '100%',
    backgroundColor: '#000',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#ffbe00',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    // color: '#',
    fontWeight: 'bold',
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 50,
    left: '46%',
    //  backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  autoContainer: {
    // backgroundColor: colors.blackDark,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: '#ddd', // gray-600
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 10,
    borderStyle: 'dotted',
  },
  previewWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor:'red'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  // overlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: 'rgba(0,0,0,0.5)',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  overlayText: {
    color: 'white',
    marginTop: 8,
    fontSize: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    borderRadius: 12,
    padding: 4,
  },
  badgeCustom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#2563eb', // blue-600
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeAuto: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#16a34a', // green-600
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  placeholderWrapper: {
    alignItems: 'center',
  },
  placeholderTitle: {
    color: colors.whiteLight,
    fontSize: 14,
    marginTop: 8,
  },
  placeholderSubtitle: {
    color: colors.whiteHalf,
    fontSize: 12,
    marginBottom: 12,
  },
  selectBtn: {
    backgroundColor: colors.blackDark,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectBtnText: {
    color: colors.yellow,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText1: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  subText: {
    color: '#ffd700',
    fontSize: 12,
  },
  titleFooter: {
    backgroundColor: 'transparent', //'red',  //colors.SecondaryColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
    // marginBottom: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -20,
  },
  titleCharacterCount: {
    color: '#888', // colors.primaryButtonColor,
    fontSize: 12,
    fontWeight: '500',
  },
  titleCountWarning: {
    color: '#FF6B6B',
  },
});
5;

export default ShopableForm;
