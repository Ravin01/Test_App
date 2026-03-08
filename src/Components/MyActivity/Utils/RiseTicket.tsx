import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Dropdown} from 'react-native-element-dropdown';
import {AuthContext} from '../../../Context/AuthContext';
import SellerHeader from '../../SellerComponents/SellerForm/Header';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../Utils/Colors';
import {AWS_CDN_URL} from '../../../../Config';
import {Toast} from '../../../Utils/dateUtils';
import axiosInstance from '../../../Utils/Api';
import {ActivityIndicator} from 'react-native-paper';
import {deleteObjectFromS3, uploadImageToS3} from '../../../Utils/aws';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const IssueReportOrder = ({route, navigation}) => {
  const orderDetails = route?.params?.orderDetails;
  const {user} = useContext(AuthContext);

  const [issueType, setIssueType] = useState(null);
  const [description, setDescription] = useState('');
  const [isFocus, setIsFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issueImage, setIssueImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({
    issueType: '',
    description: '',
    image: '',
  });

  const issueTypes = [
    {value: 'delivery_delay', label: 'Delivery Delay'},
    {value: 'damaged_product', label: 'Damaged Product'},
    {value: 'wrong_item', label: 'Wrong Item Received'},
    {value: 'missing_items', label: 'Missing Items'},
    {value: 'quality_issue', label: 'Quality Issue'},
    {value: 'return_refund', label: 'Return/Refund Issue'},
    {value: 'payment_issue', label: 'Payment Issue'},
    {value: 'address_change', label: 'Address Change Request'},
    {value: 'order_cancellation', label: 'Order Cancellation'},
    {value: 'other', label: 'Other Issue'},
  ];

  const validateForm = () => {
    let newErrors = {issueType: '', description: '', image: ''};
    let isValid = true;

    if (!issueType) {
      newErrors.issueType = 'Please select an issue type';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Please provide a description';
      isValid = false;
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };
    const capitalizeRole = (role) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const handleSubmit = async () => {
    // console.log("TRYING TO UPDATE")
    if (!validateForm()) {
      return;
    }
    // console.log("TRYING TO UPDATEafdajlm")

    setLoading(true);
  
    try {
       const submitData = {
        raisedBy: user._id,
        raisedByRole: capitalizeRole(user.role), // This ensures proper capitalization
        ticketPurposeId:  orderDetails?._id ||  orderDetails .id,
        ticketPurposePage: "order_details",
        issueType: issueType,
        description: description,
        orderId:  orderDetails?._id ||  orderDetails.id,
        attachments:issueImage?.key||'',
        lastUpdatedBy: user._id,
        lastUpdatedByRole: capitalizeRole(user.role) // This ensures proper capitalization
      };
      // console.log("trytinh to upload",submitData)
      const response = await axiosInstance.post(`tickets`, submitData);
      // Toast(response.data.message || 'Issue submitted successfully');
      Toast('Report submitted successfully');
      navigation.goBack();
    } catch (error) {
      console.log('Error submitting form', error.response?.data);
      console.log(error)
      Toast(error.response?.data?.message || 'Failed to submit issue');
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
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode) {
        Toast('Failed to select image');
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Clear image error
      setErrors(prev => ({...prev, image: ''}));

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          image: 'Only JPG, JPEG, PNG formats allowed',
        }));
        return;
      }

      // Set placeholder
      setIssueImage({
        preview: file.uri,
        key: null,
        status: 'uploading',
      });

      setUploadingImage(true);

      try {
        const url = await uploadImageToS3(
          file.uri,
           'support-tickets'
        );

        setIssueImage({
          preview: file.uri,
          key: url,
          status: 'done',
        });

        setUploadingImage(false);
      } catch (error) {
        console.error('Upload failed:', error);
        setIssueImage(null);
        setErrors(prev => ({...prev, image: 'Failed to upload image'}));
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (issueImage?.key) {
      try {
        await deleteObjectFromS3(issueImage.key);
      } catch (error) {
        console.error('Failed to delete image from S3:', error);
      }
    }
    setIssueImage(null);
    setErrors(prev => ({...prev, image: ''}));
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader message={'Report an Issue'} navigation={navigation} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS == 'ios' ? 90 : 0}
        style={{flex: 1}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 15, paddingBottom: 90}}>
          {/* User Details Section */}
          <View style={styles.section}>
            
            <Text style={styles.sectionTitle}>Raised By</Text>
            <View style={styles.userCard}>
              <Image
                source={{
                  uri: `${AWS_CDN_URL}${user?.profileURL?.key}`,
                }}
                style={styles.profileImage}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userEmail}>{user?.emailId}</Text>
              </View>
            </View>
          </View>

          {/* Order Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Order ID</Text>
                <Text style={styles.orderValue}>{orderDetails?.orderId}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Total Amount</Text>
                <Text style={styles.orderValue}>
                  ₹{orderDetails?.totalAmount}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Ordered Date</Text>
                <Text style={styles.orderValue}>
                  {new Date(orderDetails?.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Status</Text>
                <Text style={styles.statusBadge}>
                  {orderDetails?.orderStatus}
                </Text>
              </View>
            </View>
          </View>

          {/* Issue Type Dropdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Type *</Text>
            <Dropdown
              style={[
                styles.dropdown,
                isFocus && styles.dropdownFocused,
                errors.issueType && styles.inputError,
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconStyle={styles.iconStyle}
              containerStyle={styles.dropdownContainer}
              itemTextStyle={styles.dropdownItemText}
              activeColor="#2a2a2a"
              data={issueTypes}
              search
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={!isFocus ? 'Select issue type' : '...'}
              searchPlaceholder="Search..."
              value={issueType}
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
              onChange={item => {
                setIssueType(item.value);
                setIsFocus(false);
                setErrors(prev => ({...prev, issueType: ''}));
              }}
            />
            {errors.issueType ? (
              <Text style={styles.errorText}>{errors.issueType}</Text>
            ) : null}
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <TextInput
              style={[
                styles.textArea,
                errors.description && styles.inputError,
              ]}
              placeholder="Please describe your issue in detail..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={text => {
                setDescription(text);
                setErrors(prev => ({...prev, description: ''}));
              }}
              textAlignVertical="top"
            />
            {errors.description ? (
              <Text style={styles.errorText}>{errors.description}</Text>
            ) : null}
          </View>

          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Photo (Optional)</Text>
            <Text style={styles.imageSectionSubtitle}>
              Help us understand the issue better with a photo
            </Text>

            {!issueImage ? (
              <TouchableOpacity
                style={styles.imageUploadBox}
                onPress={handleImageChange}
                disabled={uploadingImage}>
                <Icon name="add-photo-alternate" size={40} color="#666" />
                <Text style={styles.imageUploadText}>Tap to upload photo</Text>
                <Text style={styles.imageUploadSubtext}>
                  JPG, JPEG or PNG (Max 5MB)
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{uri: issueImage.preview}}
                  style={styles.imagePreview}
                />
                {uploadingImage && (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator color="#fff" size="large" />
                  </View>
                )}
                {issueImage.status === 'done' && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}>
                    <Icon name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {errors.image ? (
              <Text style={styles.errorText}>{errors.image}</Text>
            ) : null}
          </View>

        </ScrollView>

        {/* Fixed Submit Button */}
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && {opacity: 0.6}]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading || uploadingImage}>
            {loading ? (
              <ActivityIndicator color="#000" size={'small'} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Issue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },

  // User Card Styles
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
  },

  // Order Card Styles
  orderCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  orderLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  orderValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  statusBadge: {
    backgroundColor: '#1a3a1a',
    color: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },

  // Dropdown Styles
  dropdown: {
    height: 52,
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1a1a1a',
  },
  dropdownFocused: {
    borderColor: colors.primaryButtonColor,
    borderWidth: 2,
  },
  dropdownContainer: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 10,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#666',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#fff',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderColor: '#3a3a3a',
  },
  iconStyle: {
    width: 20,
    height: 20,
    tintColor: '#888',
  },

  // Text Area Styles
  textArea: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    minHeight: 130,
  },

  // Image Upload Styles
  imageSectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  imageUploadBox: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  imageUploadSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error Styles
  inputError: {
    borderColor: '#ff4444',
    borderWidth: 1,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },

  // Fixed Button Container
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primaryColor,
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },

  // Submit Button Styles
  submitButton: {
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.primaryButtonColor,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default IssueReportOrder;
