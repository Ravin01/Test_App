import React, {useCallback, useContext, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../Utils/Api';
import {launchImageLibrary} from 'react-native-image-picker';
import {ActivityIndicator, Checkbox, ProgressBar} from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import {AuthContext} from '../../Context/AuthContext';
import {ChevronLeft} from 'lucide-react-native';
import ProductTabShopaAble from './ProductTab';
import {useAzureUpload} from '../../Utils/Azure';
import {GENERATE_IMAGE_SAS_URL} from '../../../Config';
import Video from 'react-native-video';
import {checkPermission } from '../../Utils/Permission';
import DatePicker from 'react-native-date-picker';
import { deleteObjectFromS3, uploadImageToS3, uploadVideoToS3, AWS_CDN_URL } from '../../Utils/aws';

const CreateShowsForm = React.memo(({navigation}) => {
  // State to store form values
  const [formValues, setFormValues] = useState({
    showTitle: '',
    date: '',
    time: '',
    category: '',
    subcategory: '',
    streamingLanguage: '',
  });
  const {uploadFileToAzure} = useAzureUpload();
  const {categories}: any = useContext(AuthContext);
  const [imageUrl, setImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [loading, setloading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
  });
  const tags = [
    'Music',
    'Gaming',
    'Live',
    'Q&A',
    'Tutorial',
    'Interview',
    'Podcast',
    'Art',
    'Cooking',
    'Fitness',
    'Tech',
    'Fashion',
    'Travel',
    'Photography',
    'Vlog',
    'News',
    'Education',
    'Comedy',
    'DIY',
    'Science',
    'Motivation',
    'Review',
    'Sports',
    'Health',
    'Finance',
    'Business',
    'Lifestyle',
    'History',
    'Spirituality',
    'Nature',
    'Movies',
    'Animation',
    'Programming',
    'Coding',
    'Startups',
    'Marketing',
    'Investing',
    'Self-Improvement',
    'Books',
    'Psychology',
    'Pets',
    'Food',
    'Automobile',
    'Workout',
    'Dance',
    'Writing',
    'Memes',
    'Design',
  ];

const [open, setOpen] = useState(false);
const [timeOpen, setTimeOpen] = useState(false);

const [imageUploadProgress, setImageUploadProgress] = useState(0);
const [videoUploadProgress, setVideoUploadProgress] = useState(0);

const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}`);
};

// To format the date as "DD/MM/YYYY"
const formatDate = (d) => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

// Helper to format time as "HH:MM AM/PM"
const formatTime = (date) => {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 -> 12 for AM
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

// Helper to parse time string like "02:30 PM" into a Date object
const parseTime = (timeStr) => {
  if (!timeStr) return new Date();
  const [time, modifier] = timeStr.split(' ');
  const [hours, minutes] = time.split(':');
  let date = new Date();
  date.setHours(modifier === 'PM' ? (+hours % 12) + 12 : +hours % 12);
  date.setMinutes(+minutes);
  date.setSeconds(0);
  return date;
};

  const toggleTagSelection = tag => {
    setSelectedTags(prevSelectedTags => {
      if (prevSelectedTags.includes(tag)) {
        // Deselect the tag
        return prevSelectedTags.filter(item => item !== tag);
      } else {
        // Select the tag
        return [...prevSelectedTags, tag];
      }
    });
  }

  const handleChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
   // setFormValues({...formValues, [field]: value});
    validateField(field, value);
  }
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
      // const file = {
      //   uri: img.uri,
      //   name: img.fileName || `image_${Date.now()}.jpg`,
      //   type: img.type || 'image/jpeg',
      //   size: img.fileSize,
      // };
      if (type === 'photo') {
        if(imageUrl?.key)
        {
          await deleteObjectFromS3(imageUrl?.key)
        }
        setImageLoading(true);
        const url = await uploadImageToS3(img.uri,"live-stream-thumbnails") ||''
        // const url =
        //   (await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL)) || '';

        // console.log({key:url.key})
        setImageUrl(url);
        setImageLoading(false);
        setImageUploadProgress(0)
        // console.log()
      } else if (type === 'video') {
        //   const videoDuration = response.assets[0].duration;
 if(videoUrl?.key)
        {
          await deleteObjectFromS3(videoUrl?.key)
        }
        setVideoLoading(true);
        // const url =
        //   (await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL, {
        //     documentType: 'video/mp4',
        //     // other metadata as needed
        //   })) || '';
        const url = await uploadVideoToS3(img.uri,"live-stream-previews") ||''
        // console.log({key:url.key});
        setVideoUrl(url);
        setVideoUploadProgress(0)
        setVideoLoading(false);
      }
    });
  };
  const validateField = (name, value) => {
    let errorMessage = '';

    switch (name) {
      case 'showTitle':
        if (!value) errorMessage = 'Title is required';

        break;
      case 'time':
        const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/; // Regex for HH:MM AM/PM format

        if (!value) {
          errorMessage = 'Time is required';
        } else if (!timeRegex.test(value)) {
          errorMessage = 'Invalid time format. Please use HH:MM AM/PM';
        }
        break;
      case 'date':
        if (!value) {
          errorMessage = 'Date is required';
        } else {
          // Check if the date is in the correct format (MM/DD/YYYY)
          const datePattern =
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;
          if (!datePattern.test(value)) {
            errorMessage = 'Date must be in the format MM/DD/YYYY';
          } else {
            // Convert the input date to a Date object
            const inputDate = new Date(value.split('/').reverse().join('-'));

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set the time to midnight for comparison

            // Check if the input date is today or in the future
            if (inputDate < today) {
              errorMessage = 'Date must be today or in the future';
            }
          }
        }
        break;

      default:
        break;
    }

    setErrors(prevState => ({...prevState, [name]: errorMessage}));
  }

  const validateForm = () => {
    let validationErrors = {};
    if (!formValues.showTitle)
      validationErrors.showTitle = 'Show Title is required';
    if (!formValues.date) validationErrors.date = 'Date is required';
    if (!formValues.time) validationErrors.time = 'Time is required';
    if (!selectedCategory) validationErrors.category = 'Category is required';
    if (!selectedSubCategory)
      validationErrors.subcategory = 'Subcategory is required';
    if (!formValues.streamingLanguage)
      validationErrors.streamingLanguage = 'Streaming Language is required';

    return validationErrors;
  }
  
  const handleSubmit = async () => {
    console.log('Inside submit form',formValues);
    console.log('inside submit',imageUrl);
    const validationErrors = validateForm();
    if (!imageUrl) {
      ToastAndroid.show('Choose an Image for thumbnail', ToastAndroid.SHORT);
      return;
    }
    if (selectedTags.length <= 0) {
      ToastAndroid.show('Choose some Tags', ToastAndroid.SHORT);
      return;
    }
    if (
      selectedProducts.auction.length <= 0 &&
      selectedProducts.buyNow.length <= 0 &&
      selectedProducts.giveaway.length <= 0
    ) {
      ToastAndroid.show('Choose an Product for stream.', ToastAndroid.SHORT);
      return;
    }
    
    if (Object.keys(validationErrors).length === 0) {
      setloading(true);
      try {
        await api.post(`/shows/create`, {
          title: formValues.showTitle,
          date: formValues.date,
          time: formValues.time,
          category: selectedCategory,
          subCategory: selectedSubCategory,
          tags: selectedTags,
          thumbnailImage: imageUrl,
          previewVideo: videoUrl,
          language: formValues.streamingLanguage,
          // sellerId: sellerId,
          buyNowProducts: selectedProducts.buyNow,
          auctionProducts: selectedProducts.auction,
          giveawayProducts: selectedProducts.giveaway,
        });
        navigation.goBack();
        ToastAndroid.show(
          `Show Scheduled on ${formValues.time}`,
          ToastAndroid.SHORT,
        );
      } catch (error) {
        console.log('error creating live', error);
      } finally {
        setloading(false);
      }
    } else {
      setErrors(validationErrors);
    }
  };

  return (
    <>
      {loading ? (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color="gray" size={20} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={[1]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({item}) => {
          return (
            <>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}>
                <ChevronLeft size={20} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={styles.headerContainer}>
                  <Feather name="video" size={30} color="#000" />

                  <Text style={styles.headerText}>Schedule Live Show</Text>
                </View>
                <Text style={{fontSize: 14, color: '#777'}}>
                  Fill in the details to set up your live stream
                </Text>
              </View>

              <View>
                {/* Show Title */}
                <View style={styles.inputContainer}>
                  <View
                    style={[
                      styles.headerContainer,
                      {alignSelf: 'flex-start', marginBottom: 10},
                    ]}>
                    <MaterialIcons name="title" color="#000" size={25} />
                    <Text style={styles.label}>Show Title *</Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter engaging title for show"
                    placeholderTextColor={'#777'}
                    value={formValues.showTitle}
                    onChangeText={text => handleChange('showTitle', text)}
                  />
                  {errors.showTitle && (
                    <Text style={styles.errorText}>{errors.showTitle}</Text>
                  )}
                </View>
{/* Date */}
<View
    style={[
      styles.headerContainer,
      { alignSelf: 'flex-start', marginBottom: 10 },
    ]}>
    <MaterialIcons name="date-range" color="#000" size={25} />
    <Text style={styles.label}>Date *</Text>
  </View>

  <View style={styles.inputContainer}>
    <TouchableOpacity
      onPress={() => setOpen(true)}
      style={styles.input}>
      <Text style={{ color: formValues.date ? '#000' : '#777' }}>
        {formValues.date ? formValues.date : 'MM/DD/YYYY'}
      </Text>
    </TouchableOpacity>

    <DatePicker
      modal
      open={open}
      date={parseDate(formValues.date)}
      mode="date"
      onConfirm={(selectedDate) => {
        setOpen(false);
        console.log(selectedDate);
        const formatted = formatDate(selectedDate);
        handleChange('date', formatted);
      }}
      onCancel={() => {
        setOpen(false);
      }}
    />

    {errors.date && (
      <Text style={styles.errorText}>{errors.date}</Text>
    )}
  </View>

   {/* Time */}
  <View style={styles.inputContainer}>
  <View
    style={[
      styles.headerContainer,
      { alignSelf: 'flex-start', marginBottom: 10 },
    ]}>
    <MaterialIcons name="access-time" color="#000" size={25} />
    <Text style={styles.label}>Time *</Text>
  </View>

  <TouchableOpacity
    onPress={() => setTimeOpen(true)}
    style={styles.input}>
    <Text style={{ color: formValues.time ? '#000' : '#777' }}>
      {formValues.time || 'HH:MM AM/PM'}
    </Text>
  </TouchableOpacity>

  <DatePicker
    modal
    open={timeOpen}
    date={parseTime(formValues.time)}
    mode="time"
    onConfirm={(selectedTime) => {
      setTimeOpen(false);
      console.log(selectedTime);
      const formatted = formatTime(selectedTime);
      handleChange('time', formatted);
    }}
    onCancel={() => {
      setTimeOpen(false);
    }}
  />

  {errors.time && (
    <Text style={styles.errorText}>{errors.time}</Text>
  )}
</View>

                {/* Category Dropdown */}
                <View style={styles.dropdownContainer}>
                  <View
                    style={[
                      styles.headerContainer,
                      {alignSelf: 'flex-start', marginBottom: 10},
                    ]}>
                    <MaterialIcons name="category" color="#000" size={25} />
                    <Text style={styles.label}>Category *</Text>
                  </View>
                  <Dropdown
                    data={categories}
                    labelField="categoryName"
                    valueField="categoryName"
                    placeholder="Select Category"
                    value={selectedCategory}
                    style={styles.dropdown}
                    onChange={item => setSelectedCategory(item.categoryName)}
                  />
                  {errors.category && (
                    <Text style={styles.errorText}>{errors.category}</Text>
                  )}
                </View>

                {/* Subcategory Dropdown */}
                <View style={styles.dropdownContainer}>
                  <View
                    style={[
                      styles.headerContainer,
                      {alignSelf: 'flex-start', marginBottom: 10},
                    ]}>
                    <MaterialIcons name="filter-none" color="#000" size={25} />
                    <Text style={styles.label}>SubCategory *</Text>
                  </View>
                  <Dropdown
                    data={
                      categories.find(category => {
                        return category.categoryName === selectedCategory;
                      })?.subcategories || []
                    }
                    onChange={item => setSelectedSubCategory(item.name)}
                    labelField="name"
                    valueField="name"
                    style={styles.dropdown}
                    placeholder="Select Subcategory"
                    value={selectedSubCategory}
                  />
                  {errors.subcategory && (
                    <Text style={styles.errorText}>{errors.subcategory}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.headerContainer,
                    {alignSelf: 'flex-start', marginBottom: 10},
                  ]}>
                  <AntDesign name="tago" color="#000" size={25} />
                  <Text style={styles.label}>Tags *</Text>
                </View>
                {/* #a5b4fc */}

                <View
                  style={{
                    backgroundColor: '#f0f7ff',
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    elevation: 4,
                  }}>
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(true)}
                    style={styles.tagButton}>
                    <AntDesign name="plus" size={25} />
                    <Text>Add Tags</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.selectedTagsContainer}>
                  {selectedTags.length > 0 ? (
                    selectedTags.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.selectedTag}
                        onPress={() => setIsModalVisible(true)}>
                        <Text style={{fontSize: 16}}>{item}</Text>
                        <MaterialIcons
                          name="remove-circle-outline"
                          size={17}
                          color="red"
                        />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text>No tags selected</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.productContainer,
                    {justifyContent: undefined},
                  ]}>
                  <Feather name="shopping-cart" size={23} />
                  <Text style={{fontSize: 20}}>Add Products to Stream</Text>
                </View>
              </View>
            </>
          );
        }}
        ListFooterComponent={
          <>
            {/* Product Tabs */}

            <ProductTabShopaAble onSelectProducts={setSelectedProducts} />

            <View style={styles.dropdownContainer}>
              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginBottom: 10},
                ]}>
                <AntDesign name="earth" color="#000" size={25} />
                <Text style={styles.label}>Streaming Language *</Text>
              </View>
              <Dropdown
                data={[
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
                ]}
                labelField="label"
                valueField="value"
                style={styles.dropdown}
                placeholder="Select Language"
                value={formValues.streamingLanguage}
                onChange={item => handleChange('streamingLanguage', item.value)}
                search
                searchPlaceholder="Search a Language"
                searchPlaceholderTextColor="#777"
                renderRightIcon={() => (
                  <AntDesign name="earth" size={20} color="#000" /> // Custom icon here
                )}
              />
              {errors.streamingLanguage && (
                <Text style={styles.errorText}>{errors.streamingLanguage}</Text>
              )}

              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginTop: 10, marginBottom: 10},
                ]}>
                <Feather name="image" color="#000" size={25} />
                <Text style={styles.label}>Thumbnail Image *</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.upload,
                  {borderColor: imageUrl ? 'green' : '#ccc', borderWidth: 2},
                ]}
                onPress={() => selectMedia('photo')}>
               {imageUrl?.key ? (
                              <Image
                                source={{uri: `${AWS_CDN_URL}${imageUrl?.key}`}}
                                style={{height: '50%', width: '50%'}}
                              />
                            ) : (
                              <Text>Click to Upload a Thumbnail Image</Text>
                            )}
                {imageLoading ? (
                  <View style={{padding: 20, width: 200}}>
                    <ProgressBar indeterminate={true} color="#F7CE45" />
                  </View>
                ) : null}
              </TouchableOpacity>

              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginTop: 10, marginBottom: 10},
                ]}>
                <Feather name="video" color="#000" size={25} />
                <Text style={styles.label}>Preview Video (9:16)</Text>
                <Text style={{color: '#ccc'}}>(optional)</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.upload,
                  {borderColor: videoUrl ? 'green' : '#ccc', borderWidth: 2},
                ]}
                onPress={() => selectMedia('video')}>
              {videoUrl?.key ? (
                <Video
                  style={{height: '90%', width: '70%'}}
                  source={{uri: `${AWS_CDN_URL}${videoUrl?.key}`}}
                  resizeMode="cover"
                  repeat={true}
                  controls={true}
                />
              ) : (
                <Text>Click to Upload a Preview Video</Text>
              )}
                {videoLoading && !videoUrl?.key ? (
                  <View style={{padding: 20, width: 200}}>
                    <ProgressBar indeterminate={true} color="#F7CE45" />
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <Animatable.View
              animation={'bounce'}
              iterationCount={10}
              style={{}}>
              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
               {loading?  (<ActivityIndicator color="gray" size={20} />):
                (<>
                  <Feather name="video" size={20} color="#fff" />
                <Text style={styles.buttonText}>Schedule a Live Stream</Text>
                </>)}
              </TouchableOpacity>
            </Animatable.View>
          </>
        }
        contentContainerStyle={styles.container}
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Tags</Text>

            {/* List of tags with checkboxes, arranged in two columns */}
            <FlatList
              data={tags}
              renderItem={({item}) => (
                <View style={styles.tagContainer}>
                  <Checkbox
                    status={
                      selectedTags.includes(item) ? 'checked' : 'unchecked'
                    }
                    color={selectedTags.includes(item) ? 'green' : 'red'}
                    onPress={() => toggleTagSelection(item)}
                  />
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
              numColumns={2} // This will display tags in 2 columns
              columnWrapperStyle={styles.columnWrapper} // Space between columns
            />

            {/* Submit button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => setIsModalVisible(false)}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 17,
    backgroundColor: '#F7CE45',
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
    marginBottom: 20,
  },
  backButtonText: {
    color: 'black',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 30,
  },
  removeButton: {
    flexDirection: 'row',
    backgroundColor: '#ff5861',
    paddingVertical: 5,
    gap: 10,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  avatar: {height: 100, width: '20%', borderRadius: 10},
  avatar1: {height: 100, width: '30%', borderRadius: 10},
  empty: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 18,
    color: '#ccc',
  },
  productContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-evenly',
    marginBottom: 10,
    alignItems: 'center',
  },
  prductLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    elevation: 5,
    width: '100%',
    marginTop: 2,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    // borderWidth:1,
    // borderColor:'blue'
    // borderBottomWidth: 1,
    // borderBottomColor: 'blue',
  },
  tab: {
    paddingVertical: 8,
    flexDirection: 'row',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    // marginBottom: 10,
  },
  selectedTab: {
    backgroundColor: '#fbdd74',
    alignItems: 'center',
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    textTransform: 'capitalize',
    // color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedTabText: {
    color: 'black',
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
  selectedTagsContainer: {
    marginTop: 20,
    padding: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // justifyContent: 'center',
    borderColor: '#ccc',
    gap: 10,
    width: '90%',
    marginBottom: 10,
  },
  selectedTagsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectedTag: {
    fontSize: 16,
    padding: 5,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  tagButton: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 5,
    elevation: 3,
    // paddingHorizontal:10,
    backgroundColor: '#fcd34d',
    borderRadius: 10,
    // marginBottom: 10,
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upload: {
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    height: 150,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dotted',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent:'c'
    // marginBottom:20,
    alignSelf: 'center',
    gap: 10,
  },

  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 300,
    height: '60%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 10,
    flex: 1, // Ensures the checkbox and text take up the available space
  },
  tagText: {
    fontSize: 16,
    marginLeft: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between', // Adds space between the columns
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#fcd34d',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  headerText: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    color: 'black',
    fontSize: 16,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    // marginBottom: 5,
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default CreateShowsForm;
