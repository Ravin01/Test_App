import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ToastAndroid,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import {CountdownCircleTimer} from 'react-native-countdown-circle-timer';
import {AuthContext} from '../../Context/AuthContext';
import {
  AWS_CDN_URL,
  deleteObjectFromS3,
  uploadImageToS3,
} from '../../Utils/aws';
import axiosInstance from '../../Utils/Api';
import {launchImageLibrary} from 'react-native-image-picker';
import { colors } from '../../Utils/Colors';

const ReviewSection = ({productId, fetchReview, reviews}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const {user}: any = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [errors, setErrors] = useState({});

  // console.log({productId, fetchReview, reviews})
  // //testing
  // const [key, setKey] = useState(0);
  // const [tick, setTick] = useState(0);

  const renderStars = (selectedRating, onPress) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => onPress(star)}>
            {star <= selectedRating ? (
              <Icon
                name="star"
                size={22}
                color={star <= selectedRating ? '#ffcc00' : '#555'}
                style={styles.starIcon}
              />
            ) : (
              <Icon
                name="star-o"
                size={22}
                color={'#ffcc00'}
                style={styles.starIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const Toast = msg => {
    return ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  const handleSubmit = async () => {
    // console.log('Starting review submission...');

    if (rating === 0 || !review.trim()) {
      // console.log('Validation failed - missing rating or content');
      Toast('Please provide both rating and review content');
      return;
    }

    try {
      setLoading(true);

      // Extract just the AWS keys from the images
      const imageKeys = reviewImages.map(img => img.key).filter(key => key);
      // console.log('Image keys to submit:', imageKeys);

      const reviewData = {
        reviewType: 'product',
        productId: productId,
        rating: rating,
        content: review.trim(),
        images: imageKeys, // Send just the keys as strings
      };
      // console.log(reviewData,"rean")

      let response;

      if (reviews && reviews._id) {
        response = await axiosInstance.put(
          `/review/${reviews._id}`,
          reviewData,
        );
      } else {
        response = await axiosInstance.post(`/review`, reviewData);
      }

      fetchReview();

      Toast(response?.data?.message);
      // if ( response.data.status) {
      //   setRating(0);
      //   setReview('');
      //   setReviewImages([]);
      //   setErrors({});
      // } else {
      //   console.log('Unexpected response:', response.data);
      //   Toast('Unexpected response from server');
      // }
    } catch (error) {
      console.error('Error submitting review:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.response?.data?.message) {
        Toast(error.response.data.message);
      } else {
        Toast('Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      selectionLimit: 4 - reviewImages.length, // Limit based on existing images
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode) {
        Toast('Failed to select images');
        return;
      }

      const files = result.assets;
      if (files.length === 0) return;

      // Reset image error immediately
      setErrors(prev => ({...prev, images: undefined}));

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const invalidFiles = files.filter(
        file => !validTypes.includes(file.type),
      );
      if (invalidFiles.length > 0) {
        Toast('Invalid file type(s). Only JPG, JPEG, PNG allowed.');
        return;
      }

      const newImages = files.map(file => ({
        preview: file.uri,
        key: null,
        status: 'pending',
        file,
        tempId: Date.now() + Math.random(),
      }));

      // Update reviewImages state with placeholders
      setReviewImages(prev => [...prev, ...newImages].slice(0, 4));

      setUploadingImages(true);

      const uploadPromises = newImages.map(async newImage => {
        try {
          setReviewImages(prev =>
            prev.map(img =>
              img.tempId === newImage.tempId
                ? {...img, status: 'uploading'}
                : img,
            ),
          );

          const file = {
            uri: newImage.file.uri,
            name: newImage.file.fileName || `image_${Date.now()}.jpg`,
            type: newImage.file.type || 'image/jpeg',
            size: newImage.file.fileSize,
          };

          const url = await uploadImageToS3(
            newImage.file.uri,
            `reviews/${productId}`,
          );

          console.log('Uploaded image URL:', url);

          setReviewImages(prev =>
            prev.map(img =>
              img.tempId === newImage.tempId
                ? {
                    ...img,
                    key: url,
                    status: 'done',
                    file: null,
                  }
                : img,
            ),
          );
        } catch (error) {
          console.error('Upload failed:', error);
          setReviewImages(prev =>
            prev.map(img =>
              img.tempId === newImage.tempId
                ? {...img, status: 'error', file: null}
                : img,
            ),
          );
          setErrors(prev => ({
            ...prev,
            images: 'Upload failed for one or more images.',
          }));
        }
      });

      await Promise.all(uploadPromises);

      const hasError = reviewImages.some(img => img.status === 'error');
      if (!hasError) {
        setErrors(prev => ({...prev, images: undefined}));
      }

      setUploadingImages(false);
    } catch (error) {
      console.error('Image selection error:', error);
      setUploadingImages(false);
    }
  };

  const removeImage = async index => {
    const updatedImages = [...reviewImages];
    const removed = updatedImages.splice(index, 1)[0];

    if (removed.key) {
      try {
        await deleteObjectFromS3(removed.key);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
      }
    }

    setReviewImages(updatedImages);

    if (errors.images) {
      setErrors(prev => ({...prev, images: undefined}));
    }
  };

  const renderImageItem = ({item, index}) => {
    const imageUri = item.key ? `${AWS_CDN_URL}${item.key}` : item.preview;

    return (
      <View style={styles.imageContainer}>
        <Image source={{uri: imageUri}} style={styles.reviewImage} />

        {/* Loading overlay */}
        {item.status === 'uploading' && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFC107" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}

        {/* Error overlay */}
        {item.status === 'error' && (
          <View style={styles.errorOverlay}>
            <Icon name="exclamation-triangle" size={16} color="#ff4444" />
            <Text style={styles.errorText}>Failed</Text>
          </View>
        )}

        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(index)}>
          <Icon name="times" size={10} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderAddImageButton = () => {
    if (reviewImages.length >= 4) return null;

    return (
      <TouchableOpacity
        style={styles.addImageButton}
        onPress={handleImageChange}
        disabled={uploadingImages}>
        {/* {uploadingImages ? (
          <ActivityIndicator size="small" color="#FFC107" />
        ) : ( */}
        <>
          <Icon name="camera" size={20} color="#FFC107" />
          <Text style={styles.addImageText}>Add Photo</Text>
        </>
        {/* )}- */}
      </TouchableOpacity>
    );
  };
  useEffect(() => {
    if (reviews) {
      setRating(reviews.rating);
      setReview(reviews?.content);
      const newImages = reviews?.images.map(imgPath => ({
        preview: `${AWS_CDN_URL}${imgPath}`, // full URL
        key: null,
        status: 'uploaded', // different from 'pending'
        file: null, // no file since it's already uploaded
        tempId: Date.now() + Math.random(),
      }));

      setReviewImages(prev => [...prev, ...newImages].slice(0, 4));
    }
  }, [reviews]);
  // console.log(reviews)
  return (
    <View style={styles.container}>
      {/* Write Review */}
      <View style={styles.reviewBox}>
        <View style={styles.writeRow}>
          {user?.profileURL?.key ?
          (<Image
            source={{
              uri:
                `${AWS_CDN_URL}${user?.profileURL?.key}` 
              //  || 'https://i.pravatar.cc/102',
            }}
            style={styles.avatar}
          />):(
             <FontAwesome6 name="user-circle" size={34} color={colors.primaryButtonColor} style={styles.avatar}/>
          )
          }
          <Text style={styles.writeReviewText}>Write a Review</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate this product</Text>
          {renderStars(rating, setRating)}
        </View>

        {/* Review Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts about this product..."
          placeholderTextColor="#aaa"
          multiline
          value={review}
          onChangeText={setReview}
        />

        {/* Image Upload Section */}
        <View style={styles.imageSection}>
          <Text style={styles.imageSectionTitle}>Add Photos (Optional)</Text>
          <Text style={styles.imageSectionSubtitle}>
            Help others by sharing photos of this product
          </Text>

          <View style={styles.imageGrid}>
            <FlatList
              data={reviewImages}
              renderItem={renderImageItem}
              keyExtractor={(item, index) =>
                item.tempId?.toString() || index.toString()
              }
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageList}
              ListFooterComponent={renderAddImageButton}
            />
          </View>

          {errors.images && (
            <Text style={styles.errorMessage}>{errors.images}</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.submitText}> Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    paddingTop: 16,
    flex: 1,
  },
  reviewBox: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 10,
  },
  writeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#333',
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  input: {
    height: 80,
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  imageSectionSubtitle: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 12,
  },
  imageGrid: {
    minHeight: 80,
  },
  imageList: {
    paddingHorizontal: 0,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  reviewImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    color: colors.primaryButtonColor,
    fontSize: 10,
    marginTop: 4,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 70,
    height: 70,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: colors.primaryButtonColor,
    fontSize: 10,
    marginTop: 4,
  },
  errorMessage: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#666',
  },
  submitText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },

  // Existing styles for testing (keep if needed)
  time: {
    fontSize: 40,
    color: colors.primaryButtonColor,
  },
});

export default ReviewSection;
