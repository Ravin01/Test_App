import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import axiosInstance from '../../Utils/Api';
import {ActivityIndicator} from 'react-native-paper';
import {colors, overlay} from '../../Utils/Colors';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Toast} from '../../Utils/dateUtils';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
import { Plus, UserPlus } from 'lucide-react-native';
import { AuthContext } from '../../Context/AuthContext';
import {useFocusEffect} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import useConfirmModal from '../../hooks/useAlertModal';
import GlobalConfirmModal from '../Reuse/AlertModal';
const {width, height} = Dimensions.get('window');

const ViewSavedAddress = ({navigation}) => {
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);
  const {setSelectedAddress}:any = useContext(AuthContext);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressData, setAddressData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [intialloading, setintitalLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {modalConfig, showModal, hideModal, handleConfirm} = useConfirmModal();

  const formatAddress = addr =>
    `${addr.line1}, ${addr.line2}, ${addr.city}, ${addr.state}, ${
      addr.pincode
    }, ${'India'}`;

  const renderHeaderIcons = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        activeOpacity={0.7}>
        <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
      </TouchableOpacity>
      <LinearGradient
        colors={['#B38728', '#FFD700']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My address</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const fetcAddressData = async (refresh = false) => {
    try {
      // console.log(addressData.length)
      if (!refresh || addressData.length==0) setintitalLoading(true);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'));
        }, 15000); // 15 seconds timeout
      });
      
      // Race between the API call and timeout
      const response: any = await Promise.race([
        axiosInstance.get('/user/addresses'),
        timeoutPromise
      ]);
      
      setAddressData(response.data.data);
      
      // Set the initially selected address to the default one
      const defaultAddress = response.data.data.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
      }
    } catch (error) {
      console.log('Error fetching address data:', error);
      
      // Check if it's a timeout error
      if (error.message === 'TIMEOUT') {
        Toast('Your network speed is low. Please try again.');
      } else {
        Toast('Failed to load addresses. Please try again.');
      }
    } finally {
      setintitalLoading(false);
      setRefresh(false);
    }
  };
  // console.log(selectedAddressId)

  const handleSubmit = async () => {
    if (!selectedAddressId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.put(
        `/user/addresses/${selectedAddressId}`,
        {
          isDefault: true,
        },
      );
      
      // Update the local state to reflect the new default
      const updatedAddresses = addressData.map(addr => ({
        ...addr,
        isDefault: addr._id === selectedAddressId
      }));
      
      setAddressData(updatedAddresses);
      
      // Find and set the selected address
      const defaultAddress = updatedAddresses.find(addr => addr._id === selectedAddressId);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
      // console.log(selectedAddressId,defaultAddress)
      
      Toast(response.data.message || 'Address set as default successfully');
//       setTimeout(() => {
//   navigation.goBack();
// }, 500);
    } catch (error) {
      console.log('Error setting default address:', error.response?.data);
      Toast(error.response?.data?.message || 'Failed to set default address');
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {

  // }, []);
  useFocusEffect(
    React.useCallback(() => {
    fetcAddressData();
      return () => {};
    }, []),
  );

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
  };

  const confirmDelete = (addressId: string) => {
    showModal({
      title: 'Delete Address',
      content: 'Are you sure you want to delete this address? This action cannot be undone.',
      mode: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showIcon: true,
      onConfirm: () => handleDelete(addressId),
    });
  };

  const handleDelete = async (addressId: string) => {
    try {
      setDeletingId(addressId);
      
      const response = await axiosInstance.delete(
        `/user/addresses/${addressId}`
      );
      
      // Remove the deleted address from local state
      const updatedAddresses = addressData.filter(addr => addr._id !== addressId);
      setAddressData(updatedAddresses);
      
      // If the deleted address was selected, clear selection or select first available
      if (selectedAddressId === addressId) {
        if (updatedAddresses.length > 0) {
          const defaultAddress = updatedAddresses.find(addr => addr.isDefault);
          setSelectedAddressId(defaultAddress?._id || updatedAddresses[0]._id);
        } else {
          setSelectedAddressId(null);
        }
      }
      
      Toast(response.data?.message || 'Address deleted successfully');
    } catch (error) {
      console.log('Error deleting address:', error.response?.data);
      Toast(error.response?.data?.message || 'Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeaderIcons()}
{intialloading && <View style={styles.loadingOverlay}>
        <ActivityIndicator size={'small'} color={colors.primaryButtonColor} />
      </View>}
      {/* Add new address */}
      <TouchableOpacity
        style={styles.addNew}
        onPress={() => {
          navigation.navigate('AddressForm');
        }}>
        <Icon name="add-circle-outline" size={20} color="#FFD700" />
        <Text style={styles.addNewText}>Add new address</Text>
      </TouchableOpacity>

      {/* Address List */}
      <FlatList
        data={addressData}
        keyExtractor={item => item._id}
        refreshing={refresh}
        onRefresh={() => {
          setRefresh(true);
          fetcAddressData(true);
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => handleAddressSelect(item._id)}
            activeOpacity={0.8}>
            <View style={styles.addressCard}>
              <View style={styles.row}>
                <Icon
                  name={
                    item._id === selectedAddressId
                      ? 'radio-button-checked'
                      : 'radio-button-unchecked'
                  }
                  size={16}
                  color="#FFD700"
                />
                <Text style={styles.name}>{item.name}</Text>
                {/* {item.isDefault && (
                  <View style={styles.defaultTag}>
                    <Text style={styles.defaultTagText}>Default</Text>
                  </View>
                )} */}
                <View style={[styles.tag, item.isDefault && styles.defaultTag]}>
                  <Text style={[styles.tagText, item.isDefault && styles.defaultTagText]}>{item.addressType || 'Home'}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      navigation.navigate('AddressForm', {item: item});
                    }}>
                    <Feather name="edit" size={16} color="#ccc" />
                  </TouchableOpacity>
                  {!item.isDefault && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      disabled={deletingId === item._id}
                      onPress={() => confirmDelete(item._id)}>
                      {deletingId === item._id ? (
                        <ActivityIndicator size="small" color="#FF4444" />
                      ) : (
                        <MaterialIcons name="delete-outline" size={18} color="#FF4444" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={18} color={item.isDefault ? "#4ADE80" : "#9CA3AF"} />
                <Text style={styles.addressText}>{formatAddress(item)}</Text>
              </View>
              <Text style={styles.mobileText}>Mobile number {item.mobile}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: height * 0.2,
            }}>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('AddressForm');
              }}
              style={{alignItems: 'center', gap: 5}}>
              <UserPlus size={50} color="#777" />
              <Text style={{color: '#777', fontWeight: '500', fontSize: 16, textAlign: 'center'}}>
                No address found
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Deliver button */}
      <TouchableOpacity
        style={[styles.deliverButton, !selectedAddressId && {opacity: 0.5}]}
        disabled={!selectedAddressId || loading}
        onPress={handleSubmit}>
        {loading ? (
          <ActivityIndicator color={'#000'} size={'small'} />
        ) : (
          <Text style={styles.deliverButtonText}>
           Deliver Here
          </Text>
        )}
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <GlobalConfirmModal
        visible={modalConfig.visible}
        onClose={hideModal}
        onConfirm={handleConfirm}
        title={modalConfig.title}
        content={modalConfig.content}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        mode={modalConfig.mode}
        isLoading={modalConfig.isLoading}
        showIcon={modalConfig.showIcon}
      />
    </SafeAreaView>
  );
};

export default ViewSavedAddress

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: 15, //If change this value also change it in header marginHorizontal value
    // paddingTop: 4,
  },
   loadingOverlay: {
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
  //   header: {
  //     flexDirection: 'row',
  //     alignItems: 'center',
  //     marginBottom: 15,
  //   },
  //   headerTitle: {
  //     color: '#fff',
  //     fontSize: 16,
  //     fontWeight: '600',
  //     borderColor: '#FFD700',
  //     borderWidth: 1,
  //     borderRadius: 30,
  //     paddingHorizontal: 20,
  //     paddingVertical: 4,
  //     marginLeft: 10,
  //   },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    padding: 15,
    borderRadius: 4,
    marginBottom: 10,
  },
  addNewText: {
    color: '#FFD700',
    marginLeft: 10,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#212121',  //'#2A2A2A',
    borderRadius: 6,
    padding: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  tag: {
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 10,
  },
  defaultTag: {
    backgroundColor: '#22C55E',
  },
  tagText: {
    color: '#ccc',
    fontSize: 12,
  },
  defaultTagText: {
    color: '#000',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  addressText: {
    color: '#ccc',
    marginLeft: 5,
    flex: 1,
    fontSize: 14,
  },
  mobileText: {
    color: '#ccc',
    marginTop: 8,
    fontSize: 13,
    marginLeft: 24,
  },
  deliverButton: {
    backgroundColor: '#ffcc00', //'#FFD700',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 15,
  },
  deliverButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
    marginHorizontal: -15,
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
  actionButtons: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 7,
  },
});
