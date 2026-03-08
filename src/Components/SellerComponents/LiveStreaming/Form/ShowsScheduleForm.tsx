import React, {useState, useContext, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Dropdown} from 'react-native-element-dropdown';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import DatePicker from 'react-native-date-picker';
import {launchImageLibrary} from 'react-native-image-picker';
import {ProgressBar} from 'react-native-paper';
import Video from 'react-native-video';
import {AuthContext} from '../../../../Context/AuthContext';
import SellerHeader from '../../SellerForm/Header';
import {checkPermission} from '../../../../Utils/Permission';
import {uploadImageToS3, uploadVideoToS3, AWS_CDN_URL, deleteObjectFromS3} from '../../../../Utils/aws';

interface FormData {
  showTitle: string;
  date: string;
  time: string;
  category: string;
  subcategory: string;
  showNotes: string;
  streamingLanguage: string;
}

interface ValidationErrors {
  showTitle?: string;
  date?: string;
  time?: string;
  category?: string;
  subcategory?: string;
  streamingLanguage?: string;
}

const ShowsScheduleForm = ({navigation}) => {
  const {categories, user}: any = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    showTitle: '',
    date: '',
    time: '',
    category: '',
    subcategory: '',
    showNotes: '',
    streamingLanguage: 'tamil',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  
  // Step 2 - Media state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Step 3 - Product types state
  const [enabledProductTypes, setEnabledProductTypes] = useState({
    buyNow: false,
    auction: false,
    giveaway: false,
  });
  
  const supportedVideoTypes = [
    'video/mp4',
    'video/mov',
    'video/webm',
    'video/x-matroska',
    'video/x-msvideo',
    'video/x-m4v',
    'video/quicktime',
    'video/avi',
  ];

  // Get allowed categories for seller
  const allowedCategories = useMemo(() => {
    if (!user?.sellerInfo?.productCategories) return [];
    return categories.filter(cat =>
      user.sellerInfo.productCategories.includes(cat.categoryName),
    );
  }, [categories, user]);

  const categoryData = allowedCategories.map(cat => ({
    label: cat.categoryName,
    value: cat.categoryName,
  }));

  const selectedCategoryObj = allowedCategories.find(
    cat => cat.categoryName === formData.category,
  );

  const subcategoryData =
    selectedCategoryObj?.subcategories?.map(sub => ({
      label: sub.name,
      value: sub.name,
    })) || [];

  const languageData = [
    {value: 'hindi', label: 'Hindi'},
    {value: 'bengali', label: 'Bengali'},
    {value: 'telugu', label: 'Telugu'},
    {value: 'marathi', label: 'Marathi'},
    {value: 'tamil', label: 'Tamil'},
    {value: 'urdu', label: 'Urdu'},
    {value: 'gujarati', label: 'Gujarati'},
    {value: 'kannada', label: 'Kannada'},
    {value: 'malayalam', label: 'Malayalam'},
    {value: 'odia', label: 'Odia'},
    {value: 'punjabi', label: 'Punjabi'},
    {value: 'assamese', label: 'Assamese'},
    {value: 'maithili', label: 'Maithili'},
    {value: 'sanskrit', label: 'Sanskrit'},
    {value: 'english', label: 'English'},
  ];

  // Real-time validation
  const validateField = (field: keyof FormData, value: string) => {
    let error = '';

    switch (field) {
      case 'category':
        if (!value) {
          error = 'Category is required';
        }
        break;

      case 'subcategory':
        if (!value) {
          error = 'Subcategory is required';
        }
        break;

      case 'showTitle':
        if (!value) {
          error = 'Show title is required';
        } else if (value.length < 10) {
          error = `Title must be at least 10 characters (${value.length}/10)`;
        } else if (value.length > 150) {
          error = `Title cannot exceed 150 characters (${value.length}/150)`;
        }
        break;

      case 'date':
        if (!value) {
          error = 'Date is required';
        } else {
          const datePattern =
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;
          if (!datePattern.test(value)) {
            error = 'Invalid date format (MM/DD/YYYY)';
          } else {
            const inputDate = new Date(value.split('/').reverse().join('-'));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (inputDate < today) {
              error = 'Date must be today or in the future';
            }
          }
        }
        break;

      case 'time':
        if (!value) {
          error = 'Time is required';
        } else {
          const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/;
          if (!timeRegex.test(value)) {
            error = 'Invalid time format (HH:MM AM/PM)';
          }
        }
        break;

      case 'streamingLanguage':
        if (!value) {
          error = 'Streaming language is required';
        }
        break;
    }

    setErrors(prev => ({...prev, [field]: error}));
    return error === '';
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    validateField(field, value);

    // Clear subcategory if category changes
    if (field === 'category' && formData.category !== value) {
      setFormData(prev => ({...prev, subcategory: ''}));
      setErrors(prev => ({...prev, subcategory: ''}));
    }
  };

  // Date/Time helpers
  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [month, day, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return new Date();
    const [time, modifier] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let date = new Date();
    date.setHours(modifier === 'PM' ? (+hours % 12) + 12 : +hours % 12);
    date.setMinutes(+minutes);
    date.setSeconds(0);
    return date;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const validateStep1 = () => {
    const fields: (keyof FormData)[] = [
      'category',
      'subcategory',
      'showTitle',
      'date',
      'time',
      'streamingLanguage',
    ];
    
    let isValid = true;
    fields.forEach(field => {
      if (!validateField(field, formData[field])) {
        isValid = false;
      }
    });

    return isValid;
  };

  // Media upload handlers
  const selectMedia = async (type: 'photo' | 'video') => {
    const hasPermission = await checkPermission('gallery');
    if (!hasPermission) {
      return;
    }

    const options: any = {mediaType: type, quality: 1};

    launchImageLibrary(options, async response => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        ToastAndroid.show('Error selecting media. Please try again.', ToastAndroid.SHORT);
        return;
      }

      const asset = response.assets[0];
     

      if (type === 'photo') {
        if (imageUrl) {
          await deleteObjectFromS3(imageUrl);
        }
        setLoading(true);
        const url = await uploadImageToS3(asset.uri, 'liveThumbnails') || '';
        setImageUrl(url);
        setLoading(false);
        setImageUploadProgress(0);
      } else if (type === 'video') {
        const maxSize = 1 * 1024 * 1024 * 1024; // 1GB
        const maxDuration = 90; // seconds
        const videoSize = asset.fileSize;
        const videoDuration = asset.duration;

        if (!supportedVideoTypes.includes(asset.type)) {
          ToastAndroid.show(
            'Unsupported video format. Supported: MP4, MOV, WEBM, MKV, AVI, M4V',
            ToastAndroid.SHORT,
          );
          return;
        }

        if (!videoSize || !videoDuration) {
          ToastAndroid.show('Unable to read video properties.', ToastAndroid.SHORT);
          return;
        }

        if (videoDuration > maxDuration) {
          ToastAndroid.show(
            `Video exceeds ${maxDuration}s. Your video is ${Math.round(videoDuration)}s.`,
            ToastAndroid.SHORT,
          );
          return;
        }

        if (videoSize > maxSize) {
          ToastAndroid.show('Video is too large (Max 1GB).', ToastAndroid.SHORT);
          return;
        }

        if (videoUrl) {
          await deleteObjectFromS3(videoUrl);
        }
        setLoading(true);
        const url = await uploadVideoToS3(asset.uri, 'liveThumbnails', progress => {
          setVideoUploadProgress(progress);
        }) || '';
        setVideoUrl(url);
        setVideoUploadProgress(0);
        setLoading(false);
      }
    });
  };

  const validateStep2 = () => {
    if (!imageUrl) {
      ToastAndroid.show('Thumbnail image is required', ToastAndroid.SHORT);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        setCurrentStep(2);
      } else {
        ToastAndroid.show('Please fix all errors before continuing', ToastAndroid.SHORT);
      }
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Details';
      case 2:
        return 'Add thumbnail and preview Video';
      case 3:
        return 'Products & Settings';
      case 4:
        return 'Co-hosts & Sponsors';
      default:
        return 'Basic Details';
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.stepText}>Step {currentStep} of 4</Text>
        <Text style={styles.stepLabel}>{getStepLabel()}</Text>
      </View>
      <View style={styles.progressBarContainer}>
        {[1, 2, 3, 4].map(step => (
          <View
            key={step}
            style={[
              styles.progressSegment,
              step < currentStep && styles.progressSegmentCompleted,
              step === currentStep && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      {/* Category */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <MaterialIcons name="category" color="#FFD700" size={20} />
          <Text style={styles.label}>Category</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <Dropdown
          data={categoryData}
          labelField="label"
          valueField="value"
          placeholder="Select Category"
          value={formData.category}
          onChange={item => handleChange('category', item.value)}
          style={[
            styles.dropdown,
            errors.category && styles.inputError,
          ]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          itemTextStyle={styles.itemTextStyle}
          containerStyle={styles.dropdownContainer}
          activeColor="#333"
        />
        {errors.category && (
          <Text style={styles.errorText}>{errors.category}</Text>
        )}
      </View>

      {/* Subcategory */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <MaterialIcons name="filter-none" color="#FFD700" size={20} />
          <Text style={styles.label}>Subcategory</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <Dropdown
          data={subcategoryData}
          labelField="label"
          valueField="value"
          placeholder="Select Subcategory"
          value={formData.subcategory}
          onChange={item => handleChange('subcategory', item.value)}
          style={[
            styles.dropdown,
            errors.subcategory && styles.inputError,
            !formData.category && styles.dropdownDisabled,
          ]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          itemTextStyle={styles.itemTextStyle}
          containerStyle={styles.dropdownContainer}
          activeColor="#333"
          disable={!formData.category}
        />
        {errors.subcategory && (
          <Text style={styles.errorText}>{errors.subcategory}</Text>
        )}
      </View>

      {/* Show Title */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <MaterialIcons name="title" color="#FFD700" size={20} />
          <Text style={styles.label}>Show Title</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            errors.showTitle && styles.inputError,
          ]}
          placeholder="Enter your show title"
          placeholderTextColor="#666"
          value={formData.showTitle}
          onChangeText={text => handleChange('showTitle', text)}
          maxLength={150}
        />
        <View style={styles.characterCount}>
          <Text style={styles.characterCountText}>
            {formData.showTitle.length}/150
          </Text>
        </View>
        {errors.showTitle && (
          <Text style={styles.errorText}>{errors.showTitle}</Text>
        )}
      </View>

      {/* Date and Time Row */}
      <View style={styles.rowContainer}>
        {/* Show Date */}
        <View style={[styles.fieldContainer, styles.halfWidth]}>
          <View style={styles.labelRow}>
            <MaterialIcons name="date-range" color="#FFD700" size={20} />
            <Text style={styles.label}>Show Date</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.input,
              errors.date && styles.inputError,
            ]}
            onPress={() => setDatePickerOpen(true)}
          >
            <Text style={formData.date ? styles.inputText : styles.placeholderText}>
              {formData.date || 'mm/dd/yyyy'}
            </Text>
          </TouchableOpacity>
          {errors.date && (
            <Text style={styles.errorText}>{errors.date}</Text>
          )}
        </View>

        {/* Show Time */}
        <View style={[styles.fieldContainer, styles.halfWidth]}>
          <View style={styles.labelRow}>
            <MaterialIcons name="access-time" color="#FFD700" size={20} />
            <Text style={styles.label}>Show Time</Text>
            <Text style={styles.required}>*</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.input,
              errors.time && styles.inputError,
            ]}
            onPress={() => setTimePickerOpen(true)}
          >
            <Text style={formData.time ? styles.inputText : styles.placeholderText}>
              {formData.time || '--:-- PM'}
            </Text>
          </TouchableOpacity>
          {errors.time && (
            <Text style={styles.errorText}>{errors.time}</Text>
          )}
        </View>
      </View>

      {/* Streaming Language */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <AntDesign name="earth" color="#FFD700" size={20} />
          <Text style={styles.label}>Streaming Language</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <Dropdown
          data={languageData}
          labelField="label"
          valueField="value"
          placeholder="Select Language"
          value={formData.streamingLanguage}
          onChange={item => handleChange('streamingLanguage', item.value)}
          style={[
            styles.dropdown,
            errors.streamingLanguage && styles.inputError,
          ]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          itemTextStyle={styles.itemTextStyle}
          containerStyle={styles.dropdownContainer}
          activeColor="#333"
          search
          searchPlaceholder="Search language..."
        />
        {errors.streamingLanguage && (
          <Text style={styles.errorText}>{errors.streamingLanguage}</Text>
        )}
      </View>

      {/* Show Notes */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <MaterialIcons name="note" color="#FFD700" size={20} />
          <Text style={styles.label}>Show notes</Text>
          <Text style={styles.optionalText}>(Optional)</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Type your notes"
          placeholderTextColor="#666"
          value={formData.showNotes}
          onChangeText={text => handleChange('showNotes', text)}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <View style={styles.characterCount}>
          <Text style={styles.characterCountText}>
            {formData.showNotes.length}/500
          </Text>
        </View>
      </View>

      {/* Date Picker Modal */}
      <DatePicker
        modal
        open={datePickerOpen}
        date={parseDate(formData.date)}
        mode="date"
        minimumDate={new Date()}
        onConfirm={selectedDate => {
          setDatePickerOpen(false);
          const formatted = formatDate(selectedDate);
          handleChange('date', formatted);
        }}
        onCancel={() => setDatePickerOpen(false)}
      />

      {/* Time Picker Modal */}
      <DatePicker
        modal
        open={timePickerOpen}
        date={parseTime(formData.time)}
        mode="time"
        onConfirm={selectedTime => {
          setTimePickerOpen(false);
          const formatted = formatTime(selectedTime);
          handleChange('time', formatted);
        }}
        onCancel={() => setTimePickerOpen(false)}
      />
    </ScrollView>
  );

  const handleRemoveImage = async () => {
    if (imageUrl) {
      await deleteObjectFromS3(imageUrl);
      setImageUrl(null);
      ToastAndroid.show('Thumbnail removed', ToastAndroid.SHORT);
    }
  };

  const handleRemoveVideo = async () => {
    if (videoUrl) {
      await deleteObjectFromS3(videoUrl);
      setVideoUrl(null);
      ToastAndroid.show('Preview video removed', ToastAndroid.SHORT);
    }
  };

  const renderStep2 = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Thumbnail Image Upload */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Feather name="image" color="#FFD700" size={20} />
          <Text style={styles.label}>Thumbnail Image</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadContainer}
          onPress={() => selectMedia('photo')}
          disabled={loading}
        >
          {imageUrl ? (
            <>
              <Image
                source={{uri: `${AWS_CDN_URL}${imageUrl}`}}
                style={styles.uploadedImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveImage}
              >
                <Feather name="trash-2" size={20} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Feather name="upload" size={32} color="#FFD700" />
              <Text style={styles.uploadText}>Tap to upload thumbnail</Text>
              <Text style={styles.uploadHint}>Recommended: 16:9 ratio</Text>
            </View>
          )}
        </TouchableOpacity>
        {imageUploadProgress > 0 && imageUploadProgress < 1 && (
          <ProgressBar
            progress={imageUploadProgress}
            color="#FFD700"
            style={styles.progressBar}
          />
        )}
      </View>

      {/* Preview Video Upload */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Feather name="video" color="#FFD700" size={20} />
          <Text style={styles.label}>Preview Video</Text>
          <Text style={styles.optionalText}>(Optional - 9:16 ratio)</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadContainer}
          onPress={() => selectMedia('video')}
          disabled={loading}
        >
          {videoUrl ? (
            <>
              <Video
                source={{uri: `${AWS_CDN_URL}${videoUrl}`}}
                style={styles.uploadedVideo}
                resizeMode="cover"
                repeat={true}
                muted={true}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveVideo}
              >
                <Feather name="trash-2" size={20} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Feather name="video" size={32} color="#FFD700" />
              <Text style={styles.uploadText}>Tap to upload preview video</Text>
              <Text style={styles.uploadHint}>Max 90 seconds, 1GB</Text>
            </View>
          )}
        </TouchableOpacity>
        {videoUploadProgress > 0 && videoUploadProgress < 1 && (
          <ProgressBar
            progress={videoUploadProgress}
            color="#FFD700"
            style={styles.progressBar}
          />
        )}
      </View>
    </ScrollView>
  );

  const toggleProductType = (type: 'buyNow' | 'auction' | 'giveaway') => {
    setEnabledProductTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const renderStep3 = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <MaterialIcons name="shopping-cart" color="#FFD700" size={20} />
          <Text style={styles.label}>Product Types</Text>
          <Text style={styles.required}>*</Text>
        </View>
        <Text style={styles.productTypeDescription}>
          Select the product types you want to enable for this live show
        </Text>

        {/* Horizontal Tabs */}
        <View style={styles.tabsContainer}>
          {/* Buy Now Tab */}
          <TouchableOpacity
            style={[
              styles.tab,
              enabledProductTypes.buyNow && styles.tabActive,
            ]}
            onPress={() => toggleProductType('buyNow')}
          >
            <Text style={[
              styles.tabText,
              enabledProductTypes.buyNow && styles.tabTextActive,
            ]}>
              Buy Now
            </Text>
          </TouchableOpacity>

          {/* Auction Tab */}
          <TouchableOpacity
            style={[
              styles.tab,
              enabledProductTypes.auction && styles.tabActive,
            ]}
            onPress={() => toggleProductType('auction')}
          >
            <Text style={[
              styles.tabText,
              enabledProductTypes.auction && styles.tabTextActive,
            ]}>
              Auction
            </Text>
          </TouchableOpacity>

          {/* Giveaway Tab */}
          <TouchableOpacity
            style={[
              styles.tab,
              enabledProductTypes.giveaway && styles.tabActive,
            ]}
            onPress={() => toggleProductType('giveaway')}
          >
            <Text style={[
              styles.tabText,
              enabledProductTypes.giveaway && styles.tabTextActive,
            ]}>
              Giveaway
            </Text>
          </TouchableOpacity>
        </View>

        {!enabledProductTypes.buyNow && 
         !enabledProductTypes.auction && 
         !enabledProductTypes.giveaway && (
          <Text style={styles.errorText}>
            Please select at least one product type
          </Text>
        )}

        {/* Product Selection Area */}
        <View style={styles.productSelectionContainer}>
          <View style={styles.productSelectionPlaceholder}>
            <MaterialIcons name="inventory" size={48} color="#666" />
            <Text style={styles.productSelectionText}>
              Product selection will appear here
            </Text>
            <Text style={styles.productSelectionSubtext}>
              {enabledProductTypes.buyNow && 'Buy Now products'}
              {enabledProductTypes.auction && enabledProductTypes.buyNow && ' • '}
              {enabledProductTypes.auction && 'Auction products'}
              {enabledProductTypes.giveaway && (enabledProductTypes.buyNow || enabledProductTypes.auction) && ' • '}
              {enabledProductTypes.giveaway && 'Giveaway products'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <View style={styles.comingSoonContainer}>
      <Text style={styles.comingSoonText}>Step 4: Co-hosts & Sponsors</Text>
      <Text style={styles.comingSoonSubText}>Coming soon...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={getStepLabel()} />
      
      {renderProgressBar()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  stepLabel: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressSegmentCompleted: {
    backgroundColor: '#FFD700',
  },
  progressSegmentActive: {
    backgroundColor: '#FFD700',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  required: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  optionalText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFF',
    minHeight: 48,
    justifyContent: 'center',
  },
  inputText: {
    color: '#FFF',
    fontSize: 14,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dropdown: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    marginTop: 4,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#666',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#FFF',
  },
  itemTextStyle: {
    fontSize: 14,
    color: '#FFF',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  buttonContainer: {
    // backgroundColor:'red',
    flexDirection: 'row',
    gap: 12,
    // paddingVertical: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '700',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  comingSoonSubText: {
    fontSize: 14,
    color: '#999',
  },
  uploadContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    borderStyle: 'dashed',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  uploadText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 12,
    fontWeight: '500',
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
  },
  uploadedVideo: {
    width: '100%',
    height: 300,
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  productTypeDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  productSelectionContainer: {
    marginTop: 8,
  },
  productSelectionPlaceholder: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  productSelectionText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  productSelectionSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});

export default ShowsScheduleForm;
