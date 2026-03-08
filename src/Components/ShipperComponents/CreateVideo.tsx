/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useContext, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import {launchImageLibrary} from 'react-native-image-picker';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import ProductTabShopaAble from './ProductsTab';
import { useAzureUpload } from '../../Utils/Azure';
import {checkPermission } from '../../Utils/Permission';
import { deleteObjectFromS3, uploadImageToS3, uploadVideoToS3 } from '../../Utils/aws';

const CreateShipperVideo = React.memo(({navigation,route}) => {
  const [selectedProduct, setSelectedProduct] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [loading, setloading] = useState(false);
  const {id}: any = route?.params || {};
  const {uploadFileToAzure}=useAzureUpload()
  const {categories}: any = useContext(AuthContext);
  const [image, setImage] = useState('');
  const [video, setVideo] = useState('');
  const [formData, setFormData] = useState({
    videoTitle: '',
    description: '',
    thumbnail: null,
    videoFile: null,
    hashtags: [],
    thumbnailBlobName: '',
    search: '',
    hashtagInput: '',
    category: ' ',
    subcategory: ' ',
  });

    const supportedTypes = [
      'video/mp4',
      'video/mov',
      'video/webm',
      'video/x-matroska',   // .mkv
      'video/x-msvideo',    // .avi
      'video/x-m4v',        // .m4v
      'video/quicktime',    // Alternative MIME type for .mov
      'video/avi',          // Alternative MIME type for .avi
    ];

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
         if(formData.thumbnailBlobName)
        {
          await deleteObjectFromS3(formData.thumbnailBlobName)
        }

        setloading(true);

        const url= await uploadImageToS3(img.uri,'thumbnails')
      
        console.log(url);

        // const url =
        //   (await uploadFileToAzure(file)) || '';
        setImage(file.name);
       // handleInputChange('thumbnail', url?.jpgUrl);
        handleInputChange('thumbnailBlobName', url);
        setloading(false);
      } else if (type === 'video') {
        const maxSize = 1 * 1024 * 1024 * 1024; // 1GB
        const maxDuration = 90; // seconds
        const video = response.assets[0];

        const videoSize = video.fileSize;
        const videoDuration = video.duration;

         if(!supportedTypes.includes(video.type)){
          ToastAndroid.show('Unsupported video format. Supported formats: MP4, MOV, WEBM, MKV, AVI, M4V',ToastAndroid.SHORT);
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

        if (videoSize > maxSize) {
          ToastAndroid.show(
            'Video is too large (Max 1GB).',
            ToastAndroid.SHORT,
          );
          return;
        }

          setloading(true);
          // const url =
          //   (await uploadFileToAzure(file,  {
          //     documentType: 'video/mp4',
          //     // other metadata as needed
          //   })) || '';
          try{
          const url= await uploadVideoToS3(img.uri,"videos")
          console.log(url);

         // setVideo('filename',file.name);
          handleInputChange('videoFile',url);
          }
          catch (error) {
          console.error('Video upload failed:', error);
          ToastAndroid.show('Video upload failed.', ToastAndroid.SHORT);
          } 
          finally {
          setloading(false);
          } 
      }
    });
  };

  const handleSubmit = async () => {
    
    if (!id) {
      if (selectedProduct.length === 0) {
      ToastAndroid.show('Please select at least one product.', ToastAndroid.SHORT);
      return;
    }

   if (!selectedCategory) {
  ToastAndroid.show('Please select a category.', ToastAndroid.SHORT);
  return;
  }

if (!selectedSubCategory) {
  ToastAndroid.show('Please select a subcategory.', ToastAndroid.SHORT);
  return;
}

if (!formData.videoFile) {
  ToastAndroid.show('Please upload a video.', ToastAndroid.SHORT);
  return;
}

if (!formData.videoTitle?.trim()) {
  ToastAndroid.show('Please enter a video title.', ToastAndroid.SHORT);
  return;
}

if (!formData.hashtags || formData.hashtags.length === 0) {
  ToastAndroid.show('Please enter at least one hashtag.', ToastAndroid.SHORT);
  return;
}

    }

    // Price validation
    const payload = {
      title: formData.videoTitle,
      description: formData.description,
      thumbnailURL: formData.thumbnail,
      thumbnailBlobName:formData.thumbnailBlobName?.key,    //Image key
      videoURL: formData.videoFile?.key,                    //Video key
      productsListed: selectedProduct,
      hashTags: formData.hashtags,
      category: selectedCategory,
      subcategory: selectedSubCategory,
    };
    // console.log(payload)
    setloading(true);
    try {
      if (!id) {
        await api.post(`/shoppable-videos/`, payload);
      } else {
        await api.put(`/shoppable-videos/${id}`);
      }
       Navigation.goBack()
      ToastAndroid.show('successfully shoppable video created. ', ToastAndroid.SHORT);
    } catch (err) {
     console.log('Error creating shoppable video', err.response);
      ToastAndroid.show(err.data.message,ToastAndroid.SHORT)
    } finally {
      setloading(false);
    }
  };

  const addHashtag = () => {
    const tag = formData.hashtagInput.trim().replace(/[^a-zA-Z0-9]/g, '');

    if (tag) {
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, `#${tag}`],
        hashtagInput: '',
      }));
    }
  }

  // console.log(formData.hashtags)
  const handleInputChange = (name, value) => {
    setFormData(prev => ({...prev, [name]: value}));
  }

  const removeHashtag =(index) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter((_, i) => i !== index),
    }));
  }
 
  // console.log(selectedProduct)
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

      {/* Main FlatList to handle scrolling of entire form and product list */}
      <FlatList
        style={styles.container}
        contentContainerStyle={{paddingBottom: 100}}
        data={[1]} // Only 1 item for the entire form
        keyExtractor={item => item.toString()}
        renderItem={() => (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <AntDesign name="left" size={25} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.header}>
              Upload Shoappable<Text style={{color: '#fff'}}> Video</Text>
            </Text>

            <View style={styles.row}>
              <Entypo name="video" size={20} />
              <Text style={styles.label}>
                Video Title <Text style={{color: 'red'}}>*</Text>
              </Text>
            </View>
            <TextInput
              style={styles.inputBox}
              placeholder="Video Title"
              value={formData.videoTitle}
              onChangeText={text => handleInputChange('videoTitle', text)}
              placeholderTextColor={'#777'}
            />

            {/* Price Input */}
            <View style={styles.row}>
              <Ionicons name="reader-outline" size={20} />
              <Text style={styles.label}>
                Description <Text style={{color: 'red'}}>*</Text>
              </Text>
            </View>

            <TextInput
              style={[styles.inputBox, {height: 100, textAlignVertical: 'top'}]}
              value={formData.description}
              placeholder="Describe your product and key features"
              placeholderTextColor="#777"
              onChangeText={text => handleInputChange('description', text)}
              multiline={true}
              numberOfLines={5}
            />

            {/* Product List FlatList*/}
            <ProductTabShopaAble onSelectProducts={setSelectedProduct} />

            {/* Category and Subcategory Select */}
            <View style={styles.row}>
              <Ionicons name="layers" size={20} />
              <Text style={styles.label}>
                Select Category <Text style={{color: 'red'}}>*</Text>
              </Text>
            </View>
            <Dropdown
              value={selectedCategory}
              data={categories}
              onChange={item => setSelectedCategory(item.categoryName)}
              labelField="categoryName"
              valueField="categoryName"
              placeholder="Choose a category"
              style={styles.dropdown}
            />

            {selectedCategory && (
              <>
                <View style={styles.row}>
                  <Ionicons name="duplicate-outline" size={20} />
                  <Text style={styles.label}>
                    Select Subcategory <Text style={{color: 'red'}}>*</Text>
                  </Text>
                </View>
                <Dropdown
                  value={selectedSubCategory}
                  data={
                    categories.find(
                      category => category.categoryName === selectedCategory,
                    )?.subcategories || []
                  }
                  onChange={item => setSelectedSubCategory(item.name)}
                  labelField="name"
                  valueField="name"
                  placeholder="Choose a subcategory"
                  style={styles.dropdown}
                />
              </>
            )}
            <View style={styles.row}>
              <AntDesign name="slack" size={20} />
              <Text style={styles.label}>
                Add Hashtags to increase visibility{' '}
                <Text style={{color: 'red'}}>*</Text>
              </Text>
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
                      <AntDesign name="close" size={17} color="#fff" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Eg #trending #popular #botsquad"
                placeholderTextColor={'#777'}
                value={formData.hashtagInput}
                style={{width: '90%'}}
                onChangeText={text => handleInputChange('hashtagInput', text)}
                // returnKeyType="done" // shows a tick or "done" button
        // onSubmitEditing={()=>addHashtag()} // triggers when tick is pressed
        // blurOnSubmit={true}
              />
              <TouchableOpacity
                onPress={addHashtag}
                style={{
                  padding: 10,
                  // backgroundColor: '#2F2E31',
                  borderRadius: 20,
                }}>
                <Ionicons name="send-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            {/* Image Upload */}
            <View style={styles.row}>
              <AntDesign name="camerao" size={20} />
              <Text style={styles.label}>
                Thumbnail Image <Text style={{color: 'red'}}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => selectMedia('photo')}>
              <AntDesign name="upload" size={30} color="white" />
              {formData?.thumbnailBlobName?.key ? (
                <Text style={{color: 'green'}}>Success Full Image Uploaded.</Text>
              ) : (
                <Text style={styles.uploadButtonText}>
                  Click to upload product image (JPEG, JPG, PNG), size 200 X 200
                </Text>
              )}
            </TouchableOpacity>

            {/* Video Upload */}
            <View style={styles.row}>
              <AntDesign name="filetext1" size={20} />
              <Text style={styles.label}>
                Shoppable Video <Text style={{color: 'red'}}>*</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => selectMedia('video')}>
              <AntDesign name="upload" size={30} color="white" />
              {formData?.videoFile ? (
                <Text style={{color: 'green'}}>Success Full Video Uploaded.</Text>
              ) : (
                <Text style={styles.uploadButtonText}>
                 Click to upload product video (max 1.30 minutes and max size
                    1GB)
                </Text>
              )}
            </TouchableOpacity>

            {/* Hashtags Section */}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </>
        )}
      />
    </>
  );
});

// Styles
const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  sellerContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '500',
  },
  userName: {
    fontSize: 14,
    color: '#777',
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
    width: 'auto',
    paddingVertical: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    backgroundColor: '#dcfce7',
  },
  productContainer: {
    // flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    // height:200,
    padding: 10,
    maxWidth: 200,
    elevation: 1,
    backgroundColor: '#e7ddf0',
    // gap: 10,
  },
  productImage: {
    width: '100%',
    height: 70,
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#ccc',
  },
  productHeader: {fontWeight: 'bold', fontSize: 18},
  productDescription: {color: '#777'},
  productAddButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    // width: '25%',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    gap: 5,
  },
  selectedTags: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
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
    backgroundColor: '#fff',
    borderRadius: 5,
    height: 50,
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  inputBox: {
    color: '#777',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 10,
    marginBottom: 20,
    padding: 10,
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
    backgroundColor: '#f7ce45',
  },
  header: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdown: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: '#222',
    padding: 12,
    height: 100,
    gap: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
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
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CreateShipperVideo;
