import React, {useState, forwardRef, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import {Modal} from 'react-native';
import axiosInstance from '../../../../Utils/Api';
import {Toast} from '../../../../Utils/dateUtils';

const ReturnRequestModal = ({
  request,
  order,
  setOrders,
  setPage,
  fetchOrders,
  onClose,
  isOPen,
}) => {
  const ref = useRef(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const product = order?.products?.find(p => p._id === request?.orderItemId);

  const handleSubmitRejection = async () => {
    if (status === 'REJECTED' && !response.trim()) {
      setError('Response is required when rejecting');
      return;
    }

    try {
      setLoading(true);
      // console.log(order?._id,request?._id)
      const res = await axiosInstance.put(
        `/order/${order._id}/return/${request._id}/process`,
        {status, response},
      );
      // console.log(res.data);
      Toast(res?.data?.message);
      // Use passed functions from parent
      // setOrders([]);
      setPage(1);
      fetchOrders(true);
      onClose();
    } catch (error) {
      console.error('Failed to process return:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Server error';
      Toast(` ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isOPen) ref.current.open();
    else ref.current.close();
  }, [isOPen]);
  return (
    <>
      <RBSheet
        ref={ref}
        height={600}
        onClose={() => onClose()}
        closeOnPressBack
        closeOnPressMask={true}
        customStyles={{
          container: styles.sheetContainer,
          draggableIcon: styles.draggableIcon,
        }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Process Return Request</Text>
            <TouchableOpacity
              onPress={() => onClose()}
              style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.rowContainer}>
              {/* Product Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Product Details</Text>
                <View style={styles.productContainer}>
                  {product ? (
                    <>
                      <Image
                        source={{
                          uri: `${AWS_CDN_URL}${product.productId?.images?.[0]?.key}`,
                        }}
                        style={styles.productImage}
                        //   defaultSource={require('./placeholder.png')}
                      />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>
                          {product.productId?.title || 'Unknown Product'}
                        </Text>
                        <Text style={styles.productDetail}>
                          Qty: {product.quantity}
                        </Text>
                        <Text style={styles.productDetail}>
                          Size: {product.productId?.size || 'N/A'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.productNotFound}>
                      <MaterialIcons
                        name="error-outline"
                        size={24}
                        color="#FF0000"
                      />
                      <Text style={styles.productNotFoundText}>
                        Product details not available
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Return Reason */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Return Reason</Text>
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonText}>{request?.reason}</Text>
                  {request?.additionalNotes && (
                    <Text style={styles.notesText}>
                      Notes: {request.additionalNotes}
                    </Text>
                  )}
                </View>
              </View>
            </View>
            {/* Images */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Images</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesContainer}>
                {request?.images?.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedImage(`${AWS_CDN_URL}${img}`);
                      setPreviewVisible(true);
                    }}>
                    <Image
                      source={{uri: `${AWS_CDN_URL}${img}`}}
                      style={styles.evidenceImage}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                }}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    status === 'REJECTED'
                      ? styles.rejectButtonActive
                      : styles.rejectButton,
                  ]}
                  onPress={() => setStatus('REJECTED')}>
                  <Text style={styles.buttonText}>Reject Return</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    status === 'APPROVED'
                      ? styles.approveButtonActive
                      : styles.approveButton,
                  ]}
                  onPress={() => setStatus('APPROVED')}>
                  <Text style={styles.buttonText}>Approve Return</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Response */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Your Response{' '}
                {status === 'REJECTED' && (
                  <Text style={styles.required}>*</Text>
                )}
              </Text>
              <TextInput
                style={[
                  styles.responseInput,
                  error ? styles.inputError : null,
                  status === 'APPROVED' ? styles.disabledInput : null,
                ]}
                multiline
                numberOfLines={3}
                placeholder="Enter response to customer..."
                placeholderTextColor="#666"
                value={response}
                onChangeText={setResponse}
                editable={status !== 'APPROVED'}
              />
              {error && (
                <Text style={styles.errorText}>
                  <MaterialIcons
                    name="error-outline"
                    size={14}
                    color="#FF0000"
                  />{' '}
                  {error}
                </Text>
              )}
            </View>
            {/* Buttons */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitRejection}
              disabled={!status || loading}>
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Decision</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </RBSheet>
      <Modal visible={previewVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={() => setPreviewVisible(false)}
          />
          <Image
            source={{uri: selectedImage}}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeIconContainer}
            onPress={() => setPreviewVisible(false)}>
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
  },
  draggableIcon: {
    backgroundColor: '#666666',
    width: 40,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  required: {
    color: '#FF0000',
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 12,
    color: '#999999',
  },
  productNotFound: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productNotFoundText: {
    color: '#FF0000',
    marginLeft: 8,
  },
  reasonContainer: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  reasonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  notesText: {
    color: '#999999',
    fontSize: 12,
    marginTop: 8,
  },
  imagesContainer: {
    marginTop: 8,
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  responseInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#FF0000',
  },
  disabledInput: {
    backgroundColor: '#1A1A1A',
    color: '#666666',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    marginTop: 6,
    // flexWrap: 'wrap',
    marginBottom: 15,
    // gap: 8,
  },
  actionButton: {
    flex: 1,
    marginRight: 5,
    // minWidth: '30%',/
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#333333',
  },
  rejectButtonActive: {
    backgroundColor: '#FF0000',
  },
  approveButton: {
    backgroundColor: '#333333',
  },
  approveButtonActive: {
    backgroundColor: '#00AA00',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    minWidth: '100%',
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeIconContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
  },
});

export default React.memo(ReturnRequestModal);
