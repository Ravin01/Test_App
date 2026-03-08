import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  Modal,
  FlatList,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import api from '../../Utils/Api';
import {launchImageLibrary} from 'react-native-image-picker';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import ProductTabShopaAble from './ProductTab';
import { useAzureUpload } from '../../Utils/Azure';
import {checkPermission } from '../../Utils/Permission';
import DatePicker from 'react-native-date-picker';
import { deleteObjectFromS3, uploadImageToS3, uploadVideoToS3 } from '../../Utils/aws';

const EditShows = React.memo(({navigation,route}) => {
  // State to store form values
  const [formValues, setFormValues] = useState({
    showTitle: '',
    date: '',
    time: '',
    streamingLanguage: '',
  });
  const [categories, setCategories] = useState([
    {categoryName: 'No Data Found'},
  ]);
  const {uploadFileToAzure}=useAzureUpload()
  const [imageUrl, setImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setloading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const data = route.params;
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
  const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
  });
  // const navigation =useNavigation()

const [open, setOpen] = useState(false);
const [timeOpen, setTimeOpen] = useState(false);

const [imageUploadProgress, setImageUploadProgress] = useState(0);
const [videoUploadProgress, setVideoUploadProgress] = useState(0);

console.log('formValues', formValues);

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
  };
  const handleChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  //  setFormValues({...formValues, [field]: value});
    validateField(field, value);
  };
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
      const img= response.assets[0]
      const file = {
      uri: img.uri,
      name: img.fileName || `image_${Date.now()}.jpg`,
      type: img.type || 'image/jpeg',
      size: img.fileSize,
    };
      if (type === 'photo') {
        if(imageUrl?.key)
        {
          await deleteObjectFromS3(imageUrl?.key)
        }
        setloading(true);
        const url = await uploadImageToS3(img.uri,"show-thumbnails",(progress)=>{setImageUploadProgress(progress)}) ||''
        // const url =
        //   (await uploadFileToAzure(file)) ||'';
        // console.log(url)
        setImageUrl(url);
        setImageUploadProgress(0);
        setloading(false);
        // console.log()
      } else if (type === 'video') {
        //   const videoDuration = response.assets[0].duration;
        if(videoUrl?.key)
        {
          await deleteObjectFromS3(videoUrl.key)
        }
        setloading(true);
        // const url =
        //   (await uploadFileToAzure(file, {
        //     documentType: 'video/mp4',
        //     // other metadata as needed
        //   })) || '';
        const url = await uploadVideoToS3(img.uri,"live-stream-previews",(progress)=>{setVideoUploadProgress(progress)}) ||''
        setVideoUrl(url);
        setVideoUploadProgress(0)
        setloading(false);
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
          }
        }
        break;

      default:
        break;
    }

    setErrors(prevState => ({...prevState, [name]: errorMessage}));
  };
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
  };
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (!imageUrl) {
      ToastAndroid.show('Choose an Image for thumbnail', ToastAndroid.SHORT);
      return;
    }
    if (selectedTags.length <= 0) {
      ToastAndroid.show('Choose some Tags', ToastAndroid.SHORT);
      return;
    }
    if (Object.keys(validationErrors).length === 0) {
      setloading(true);
      //   console.log(data?.item)
      try {
        await api.put(`/shows/update/${data?.item?._id}`, {
          title: formValues.showTitle,
          date: formValues.date,
          time: formValues.time,
          category: selectedCategory,
          subCategory: selectedSubCategory,
          tags: selectedTags,
          thumbnailImage: imageUrl,
          previewVideo: videoUrl,
          language: formValues.streamingLanguage,
        });
        navigation.goBack();
        ToastAndroid.show(`Show Updated Successfully`, ToastAndroid.SHORT);
      } catch (error) {
        console.log('error creating live', error);
      } finally {
        setloading(false);
      }
    } else {
      setErrors(validationErrors);
    }
  };
  useEffect(() => {
    const fetchCategories = async () => {
      setloading(true);
      try {
        const categoryResponse = await api.get('/categories/get');
        setCategories(categoryResponse.data);
      } catch (err) {
        console.log('Failed to fetch categories & products', err);
      } finally {
        setloading(false);
      }
    };

    fetchCategories();
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/shows/view/${data?.item?._id}`);
        const url = response.data.data.thumbnailImage;
        // console.log(data?.item)
        setFormValues({
          showTitle: data?.item?.title,
          date: new Date(data?.item?.date).toLocaleDateString(),
          time: data?.item?.time,
          streamingLanguage: data?.item?.language,
        });
        setSelectedProducts({
          buyNow: data?.item?.buyNowProducts,
          giveaway: data?.item?.giveawayProducts,
          auction: data?.item?.auctionProducts,
        });
        // console.log(selectedProducts)

        setSelectedCategory(data?.item?.category);
        setSelectedSubCategory(data?.item?.subCategory);
        setSelectedTags(data?.item?.tags);
        setImageUrl(url);
        setVideoUrl(data?.item?.videoUrl);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, []);

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
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text>Back</Text>
              </TouchableOpacity>
              <View style={styles.headerContainer}>
                <Text style={styles.headerText}>
                  Update a Scheduled Live Show
                </Text>
              </View>

              {/* Show Title */}
              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    {alignSelf: 'flex-start', marginBottom: 10},
                  ]}>
                  {/* <MaterialIcons name="title" color="#fcd34d" size={25} /> */}
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
                  {/* <MaterialIcons name="category" color="#fcd34d" size={25} /> */}
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
                  {/* <MaterialIcons name="filter-none" color="#fcd34d" size={25} /> */}
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
                {/* <AntDesign name="tago" color="#fcd34d" size={25} /> */}
                <Text style={styles.label}>Tags *</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalVisible(true)}
                style={styles.tagButton}>
                <AntDesign name="plus" size={25} />
                <Text>Add Tags</Text>
              </TouchableOpacity>
              <View style={styles.selectedTagsContainer}>
                {selectedTags.length > 0 ? (
                  selectedTags.map((item, index) => (
                    <Text key={index} style={styles.selectedTag}>
                      {item}
                    </Text>
                  ))
                ) : (
                  <Text>No tags selected</Text>
                )}
              </View>
            </>
          );
        }}
        contentContainerStyle={styles.container}
        ListFooterComponent={
          <>
            <ProductTabShopaAble
              onSelectProducts={setSelectedProducts}
              initialSelectedProducts={selectedProducts}
            />

            {/* Streaming Language Dropdown */}
            <View style={styles.dropdownContainer}>
              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginBottom: 10},
                ]}>
                {/* <AntDesign name="earth" color="#fcd34d" size={25} /> */}
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
                {/* <Feather name="image" color="#fcd34d" size={25} /> */}
                <Text style={styles.label}>Thumbnail Image *</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.upload,
                  {borderColor: imageUrl ? 'green' : '#ccc', borderWidth: 2},
                ]}
                onPress={() => selectMedia('photo')}>
                <Text>Click to Upload a Thumbnail Image</Text>
                {imageUploadProgress>0?<ProgressBar  progress={imageUploadProgress} color={colors.primaryButtonColor}/>:null}
              </TouchableOpacity>

              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginTop: 10, marginBottom: 10},
                ]}>
                {/* <Feather name="video" color="#fcd34d" size={25} /> */}
                <Text style={styles.label}>Preview Video (9:16)</Text>
                <Text style={{color: '#ccc'}}>(optional)</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.upload,
                  {borderColor: videoUrl ? 'green' : '#ccc', borderWidth: 2},
                ]}
                onPress={() => selectMedia('video')}>
                <Text>Click to Upload a Preview Video</Text>
                {videoUploadProgress>0?<ProgressBar  progress={videoUploadProgress} color={colors.primaryButtonColor}/>:null}
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Feather name="video" size={20} />
              <Text style={styles.buttonText}>Update a Show</Text>
            </TouchableOpacity>
          </>
        }
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
    backgroundColor: '#fff',
    flexGrow: 1,
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
    // padding: 5,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  tagButton: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 5,
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
    height: 150,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 10,
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
    fontSize: 20,
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
    borderRadius: 10,
    padding: 10,
  },
  label: {
    fontSize: 16,
    // fontWeight: '600',
    color: 'gray',
    // marginBottom: 5,
  },
  button: {
    backgroundColor: '#fcd34d',
    padding: 12,
    borderRadius: 5,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    // color: '#fff',
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});

export default EditShows;
