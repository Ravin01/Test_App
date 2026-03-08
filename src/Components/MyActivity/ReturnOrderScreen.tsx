import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  TextInput,
  Dimensions,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableHighlight,
  Platform,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Checkbox } from 'react-native-paper';
import { AWS_CDN_URL, deleteObjectFromS3, uploadImageToS3 } from '../../Utils/aws';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';

// import { useAlert } from "../resources/Alerts/useAl
// ert";
// import { uploadImageToS3 } from '../../utils/aws';

import axiosInstance from '../../Utils/Api';
import { Toast } from '../../Utils/dateUtils';
import { checkPermission } from '../../Utils/Permission';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

const RETURN_REASONS = [
  "Wrong item received",
  "Damaged product",
  "Quality issues",
  "Doesn't match description",
  "Changed my mind",
  "Other"
];

const ReturnOrderScreen = ({ navigation, route }) => {
  const { order } = route.params || {};
  // const { Toast, negative } = useAlert();

  const [activeTab, setActiveTab] = useState('Orders');
  const [activeFilter, setActiveFilter] = useState('On the way');
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customReason, setCustomReason] = useState('');
  
  // Modal states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalReason, setModalReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [returnImages, setReturnImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reasonsList = [
    "Wrong item received",
    "Damaged product",
    "Quality issues",
    "Doesn't match description",
    "Changed my mind",
    "Other"
  ];

  const toggleReason = (reason) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };


/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const handleImageUpload = () => {
  if (!checkPermission('gallery')) {
    return;
  }

  const options = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 0.8,
    selectionLimit: 4 - returnImages.length,
  };

  launchImageLibrary(options, async response => {
    if (response.didCancel || response.error) {
      return;
    }

    const assets = response.assets || [];
    if (assets.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    // ✅ Validate all files before upload
    const invalidFiles = assets.filter(
      file => !validTypes.includes(file.type),
    );

    if (invalidFiles.length > 0) {
      Toast('Invalid file type(s). Only JPG, JPEG, PNG allowed.');
      return;
    }

    const oversizedFiles = assets.filter(
      file => file.fileSize > 5 * 1024 * 1024,
    );

    if (oversizedFiles.length > 0) {
      Toast('One or more files exceed the 5MB size limit.');
      return;
    }

    setUploadingImages(true);
    const newImages = [];

    await Promise.all(
      assets.map(async asset => {
        try {
          const file = {
            uri: asset.uri,
            type: asset.type,
            name: asset.fileName || `image_${Date.now()}.jpg`,
          };

          const awsKey = await uploadImageToS3(
            file.uri,
            `returns/${order._id}/${order?.products[0]?.productId?._id}`,
          );

          newImages.push({
            preview: asset.uri,
            name: file.name,
            key: awsKey,
          });
        } catch (error) {
          Toast(`Failed to upload ${asset.fileName || 'image'}.`);
        }
      }),
    );

    setReturnImages(prev => [...prev, ...newImages]);
    setUploadingImages(false);
  });
};


  const removeImage = async(indexToRemove) => {
    try{
    await deleteObjectFromS3(returnImages[indexToRemove]?.key)
    setReturnImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }catch(error)
    {
      console.log(error)
    }

  };
// console.log(order?.products[0]?._id)
  const handleModalSubmit = async () => {
    if (!modalReason) {
      Toast("Please select a return reason");
      return;
    }

    setIsLoading(true);
  
    try {
      const response = await axiosInstance.post(`/order/${order._id}/return`, {
   orderItemId:order?.products[0]?._id,
        reason: modalReason,
        additionalNotes,
        images: returnImages.map(img => img.key)
      });

      if (response.data.status) {
        Toast("Return request submitted!");
        setShowReturnModal(false);
        resetModalState();
        navigation.navigate('bottomtabbar', { screen: 'myactivity' });
      } else {
        Toast(response.data.message);
      }
    } catch (error) {
      // Toast("Failed to submit return request");
      Toast(error?.response.data.message);
      console.log(error.response.data)
    } finally {
      setIsLoading(false);
    }
  };
// console.log()
  const resetModalState = () => {
    setModalReason('');
    setAdditionalNotes('');
    setReturnImages([]);
    setSelectedProduct(null);
  };

  const openReturnModal = (product) => {
    setSelectedProduct(product);
    setShowReturnModal(true);
  };

  const handleConfirm = () => {
    // console.log('Reasons:', selectedReasons);
    // console.log('Custom Message:', customReason);
    navigation.navigate('bottomtabbar', { screen: 'myactivity' });
  };

  const filters = [
    { name: 'On the way', active: true },
    { name: 'Delivered', active: false },
    { name: 'Cancelled', active: false },
    { name: 'Refund', active: false },
    { name: 'Review', active: false },
  ];

  const renderHeaderIcons = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
      </TouchableOpacity>
      <LinearGradient
        colors={['#B38728', '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Return</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderOrderItem = (item, index) => {
    const imageUrl = item?.productId?.images?.[0]?.key
      ? `${AWS_CDN_URL}${item.productId?.images[0].key}`
      : undefined;
    
    return (
      <View style={styles.orderItemContainer} key={`${item.name}-${index}`}>
        <Image source={{uri: imageUrl}} style={styles.itemImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item?.productId?.title}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemMetaText}>Quantity - {item?.quantity}</Text>
          </View>
          <Text style={styles.itemPrice}>₹{item?.basePrice}</Text>
        </View>
        {/* <TouchableOpacity 
          style={styles.returnButton}
          onPress={() => openReturnModal(item)}
        >
          <Text style={styles.returnButtonText}>Return</Text>
        </TouchableOpacity> */}
      </View>
    );
  };

  const formatEstimateDate = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
    
  const renderOrderCard = (order) => (
    <View style={styles.orderCard} key={order._id}>
      <View style={styles.cardHeader}>
        <View style={styles.vendorContainer}>
          <MaterialIcons name="store" size={16} color="#888" />
          <Text style={styles.vendorName}> {order?.pickupAddresses[0]?.name || 'Unknown Vendor'}</Text>
        </View>
        <Text style={styles.statusText}>{order.orderStatus}</Text>
      </View>
      
      <TouchableOpacity style={styles.cardContent} onPress={()=>navigation.navigate('OrderDetailScreen',{order})}>
        {order.products.map((item, index) => renderOrderItem(item, index))}
        
        <View style={styles.shippingInfo}>
          <MaterialIcons name="local-shipping" size={16} color="#888" />
          <View style={styles.shippingDetails}>
            <Text style={styles.shippingStatus}>{''}</Text>
            <Text style={styles.deliveryEstimate}>
              Delivered on {formatEstimateDate(order?.statusTimeline?.delivered)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₹{order.totalAmount.toLocaleString()}</Text>
      </View>
    </View>
  );

  const renderReturnModal = () => (
    <Modal
      visible={showReturnModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowReturnModal(false)}
    >
      <View style={styles.modalOverlay}>
       
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={30}
      >
        <View style={{ flex: 1 }}>
          {renderHeaderIcons()}
          
          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderOrderCard(order)}
             <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* <Text style={styles.modalTitle}>Request Return</Text> */}
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Reason for Return *</Text>
              <View style={styles.pickerContainer}>
                {RETURN_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      // modalReason === reason && styles.reasonOptionSelected
                    ]}
                    onPress={() => setModalReason(reason)}
                  >
                      <Checkbox
                  status={  modalReason === reason ? 'checked' : 'unchecked'}
                  onPress={() => setModalReason(reason)}
                  color="#ffcc00"
                />
                    <Text style={[
                      styles.reasonText,
                      // modalReason === reason && styles.reasonTextSelected
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Additional Notes</Text>
              <TextInput 
                placeholder="Provide more details about your return..."
                placeholderTextColor="#888"
                style={styles.modalTextInput}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Upload Images (Optional)</Text>
              <View style={styles.imageContainer}>
                {returnImages.map((image, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image 
                      source={{uri: image.preview}} 
                      style={styles.uploadedImage}
                    />
                    <TouchableOpacity 
                      onPress={() => removeImage(index)}
                      style={styles.removeImageButton}
                    >
                      <Text style={styles.removeImageText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {returnImages.length < 4 && (
                  <TouchableOpacity
                    style={[styles.addImageButton, uploadingImages && { opacity: 0.5 }]}
                    onPress={handleImageUpload}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? (
                      <ActivityIndicator size="small" color="#888" />
                    ) : (
                      <Text style={styles.addImageText}>+</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.imageHelpText}>Max 4 images (5MB each)</Text>
            </View>
            
            {/* <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => {
                  setShowReturnModal(false);
                  resetModalState();
                }}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleModalSubmit}
                disabled={isLoading || !modalReason}
                style={[styles.modalSubmitButton, (!modalReason || isLoading) && { opacity: 0.5 }]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Return</Text>
                )}
              </TouchableOpacity>
            </View> */}
          </ScrollView>
        </View>
            {/* <Text style={styles.label}>Please let us know the reason for cancelling this product</Text>

            {reasonsList.map((reason) => (
              <View key={reason} style={styles.checkboxContainer}>
                <Checkbox
                  status={selectedReasons.includes(reason) ? 'checked' : 'unchecked'}
                  onPress={() => toggleReason(reason)}
                  color="#ffcc00"
                />


                <Text style={styles.checkboxLabel}>{reason}</Text>
              </View>
            ))}

            {selectedReasons.includes('Other') && (
              <TextInput
                style={styles.input}
                placeholder="Add additional comments..."
                placeholderTextColor="#888"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )} */}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.confirmButton, (!modalReason || isLoading)&& { opacity: 0.5 }]}
                 disabled={isLoading || !modalReason}
                // style={[styles.modalSubmitButton,  && { opacity: 0.5 }]}
                onPress={handleModalSubmit}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                <Text style={styles.confirmText}>Submit</Text>)}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        
        {/* {renderReturnModal()} */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    marginLeft: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: colors.primaryButtonColor
  },
  tabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#2C2C2C',
    marginBottom: 20,
    height: 50,
    alignItems: 'center'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFC10030',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#f4ba00',
  },
  filterText: {
    color: '#888',
    fontSize: 12,
  },
  activeFilterText: {
    color: '#000',
    fontWeight: '500',
  },
  ordersContainer: {
    paddingHorizontal: 16,
  },
  orderCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  vendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  statusText: {
    color: '#f4ba00',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderItemContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#777',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  itemMetaText: {
    color: '#888',
    fontSize: 12,
  },
  itemMetaDot: {
    color: '#888',
    marginHorizontal: 4,
  },
  itemPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  returnButton: {
    backgroundColor: '#f4ba00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  returnButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7CE452B',
  },
  shippingDetails: {
    marginLeft: 8,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  shippingStatus: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryEstimate: {
    color: '#888',
    fontSize: 11,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  totalAmount: {
    color: colors.primaryButtonColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.10,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
    marginHorizontal: -8
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
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
  },
  input: {
    borderColor: '#F7CE45',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#1a1a1a',
    marginTop: 12,
    marginHorizontal: '10%'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#ffcc00',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#1e1e1e',
    // borderColor: '#404040',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    // maxWidth: 400,
    // maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#404040',
  },
  reasonOption: {
    paddingVertical: 12,
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  reasonOptionSelected: {
    backgroundColor: '#f4ba00',
  },
  reasonText: {
    color: '#fff',
    fontSize: 14,
  },
  reasonTextSelected: {
    color: '#000',
    fontWeight: '500',
  },
  modalTextInput: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#404040',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  uploadedImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#777',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#404040',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: '#888',
    fontSize: 24,
    fontWeight: '300',
  },
  imageHelpText: {
    color: '#888',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#404040',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f4ba00',
  },
  modalSubmitText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReturnOrderScreen;