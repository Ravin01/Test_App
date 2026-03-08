/* eslint-disable react/no-unstable-nested-components */
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axiosInstance from '../../../Utils/Api';

import DatePicker from 'react-native-date-picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Toast} from '../../../Utils/dateUtils';
import SellerHeader from '../SellerForm/Header';
import {AWS_CDN_URL} from '../../../../Config';
import {Box, IndianRupee} from 'lucide-react-native';
const FlashSaleForm = ({navigation, route}) => {
  const data = route.params || {};
  // console.log(data)
  const [selectedProduct, setSelectedProduct] = useState(data.product || {});

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    price: '',
    selectedProduct: selectedProduct || '',
  });

  const [errors, setErrors] = useState({
    title: '',
    startTime: '',
    endTime: '',
    category: '',
    price: '',
    selectedProduct: '',
  });

  const [datePickerOpen, setDatePickerOpen] = useState({
    start: false,
    end: false,
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    if (field == 'category') setSelectedProduct(null);
    
    // Handle price field - restrict to 2 decimal places
    if (field === 'price') {
      // Allow empty string
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [field]: value,
        }));
        validateForm(field, value);
        return;
      }
      
      // Check if value matches valid price pattern (numbers with optional decimal and up to 2 decimal places)
      const priceRegex = /^\d*\.?\d{0,2}$/;
      
      if (!priceRegex.test(value)) {
        // Don't update if it doesn't match the pattern
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    validateForm(field, value);
  };
  // console.log(selectedProduct)

  const validateForm = (field, value) => {
    let errorMsg = '';
    // console.log(selectedProduct,value)

    switch (field) {
      case 'title':
        if (!value.trim()) {
          errorMsg = 'Title is required';
        } else if (value.trim().length < 3) {
          errorMsg = 'Title must be at least 3 characters';
        }
        break;

      case 'price':
        if (!value.trim()) {
          errorMsg = 'Price is required';
        } else if (isNaN(value) || parseFloat(value) < 1) {
          errorMsg = 'Price must be at least ₹1';
        } else if (
          !isNaN(value) &&
          Number(selectedProduct?.productPrice) <= Number(value)
        ) {
          errorMsg = 'Price must be lesser than product price.';
        } else {
          // Check decimal places (should not exceed 2)
          const decimalPart = value.split('.')[1];
          if (decimalPart && decimalPart.length > 2) {
            errorMsg = 'Price can have maximum 2 decimal places';
          }
        }
        break;

      case 'startTime':
        const now = new Date();
        if (value < now) {
          errorMsg = 'Start time cannot be in the past';
        }
        break;

      case 'endTime':
        if (value <= formData.startTime) {
          errorMsg = 'End time must be after start time';
        }
        break;

      default:
        break;
    }

    setErrors(prev => ({
      ...prev,
      [field]: errorMsg,
    }));
  };

  const validateAllFields = () => {
    const fields = ['title', 'price', 'startTime', 'endTime'];
    let isValid = true;

    fields.forEach(field => {
      validateForm(field, formData[field]);
      if (errors[field]) {
        isValid = false;
      }
    });

    if (
      !formData.title.trim() ||
      !formData.price.trim()
    ) {
      isValid = false;
    }

    return isValid;
  };

  // Helper function to get available stock (uses totalStock for variant products)
  const getAvailableStock = () => {
    if (selectedProduct?.childVariantIds && selectedProduct.childVariantIds.length > 0) {

      console.log('Flash selected Product', JSON.stringify(selectedProduct, null, 2));

      console.log('Variant product detected. Using totalStock for stock calculation.');
      console.log('Selected Product:', selectedProduct);
      // For variant products, use totalStock
      return selectedProduct?.totalStock || 0;
    }
    // For non-variant products, use stockId.quantity
    return selectedProduct?.stockId?.quantity || 0;
  };

  const handleSubmit = async () => {
    if (!validateAllFields()) {
      Toast('Validation Error, Please fix all errors before submitting');
      return;
    }

    // Check if product has stock available
    const availableStock = getAvailableStock();
    if (availableStock === 0) {
      Toast('Cannot create flash sale - Product is out of stock');
      return;
    }

    setLoading(true);

    try {
      const flashSaleData = {
        title: formData.title.trim(),
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        products: [
          {
            productId: selectedProduct._id,
            flashPrice: parseFloat(formData.price),
            flashStock: availableStock, // - sales will deduct from actual product stock
          },
        ],
      };

      const response = await axiosInstance.post('/flash-sale', flashSaleData);
       console.log(response.data)
      //   if (response.data.success) {
      Toast('Flash sale created successfully!');
      navigation.goBack();
      //   }
    } catch (error) {
      console.log('Flash sale creation error:', error.response.data);
      Toast(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = date => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Create form data array for FlatList
  // const formSections = [
  //   {
  //     id: 'category',
  //     type: 'dropdown',
  //     label: 'Category *',
  //     component: () => (
  //       <View style={styles.fieldContainer}>
  //         <Text style={styles.label}>Category <Text className='text-red-500'>*</Text></Text>
  //         <Dropdown
  //           data={categories}
  //           value={formData.category}
  //           style={[styles.input, {paddingRight: 10}]}
  //           activeColor="transparent"
  //           selectedTextStyle={{color: '#fff'}}
  //           itemTextStyle={{color: '#fff'}}
  //           containerStyle={{
  //             marginBottom: 10,
  //             backgroundColor: '#212121',
  //             borderColor: '#FFD700',
  //             borderWidth: 1,
  //             borderRadius: 10,
  //           }}
  //           placeholder="Select category"
  //           placeholderStyle={{color: '#777'}}
  //           onChange={item => handleInputChange('category', item.categoryName)}
  //           labelField={'categoryName'}
  //           valueField={'categoryName'}
  //         />
  //         {errors.category && (
  //           <Text style={styles.errorText}>{errors.category}</Text>
  //         )}
  //       </View>
  //     ),
  //   },
  //   {
  //     id: 'productSelection',
  //     type: 'productTab',
  //     component: () =>
  //       formData.category ? (
  //         <View style={styles.productTabContainer}>
  //           <ProductTabFlashSale
  //             onSelectProducts={data => setSelectedProduct(data)}
  //             selectedCategory={formData.category}
  //           />
  //         </View>
  //       ) : null,
  //   },
  // ];

  // Add form fields only if product is selected
  // if (selectedProduct && Object.keys(selectedProduct).length > 0) {
  const formSections = [
    {
      id: 'title',
      type: 'input',
      component: () => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Flash Sale Title <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            value={formData.title}
            onChangeText={value => handleInputChange('title', value)}
            placeholder="Enter flash sale title"
            placeholderTextColor="#8E8E93"
            maxLength={100}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>
      ),
    },
    {
      id: 'price',
      type: 'input',
      component: () => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Sale Price <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.price ? styles.inputError : null]}
            value={formData.price}
            onChangeText={value => handleInputChange('price', value)}
            placeholder="Enter sale price"
            placeholderTextColor="#8E8E93"
            keyboardType="decimal-pad"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          <Text style={styles.infoText}>
            Sales during flash sale will deduct from actual stock
          </Text>
            {/* Variants Info */}
              {selectedProduct?.childVariantIds && selectedProduct.childVariantIds.length > 0 && (
                <View style={styles.variantInfoContainer}>
                  <Text style={styles.variantInfoText}>
                    📦 This product has {selectedProduct.childVariantIds.length} variants. The discount percentage will be applied to all child products.
                  </Text>
                </View>
              )}
        </View>
      ),
    },
    {
      id: 'startTime',
      type: 'datePicker',
      component: () => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Start Time <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.startTime ? styles.inputError : null,
            ]}
            onPress={() => setDatePickerOpen(prev => ({...prev, start: true}))}>
            <Text style={styles.dateButtonText}>
              {formatDateTime(formData.startTime)}
            </Text>
          </TouchableOpacity>
          {errors.startTime && (
            <Text style={styles.errorText}>{errors.startTime}</Text>
          )}
        </View>
      ),
    },
    {
      id: 'endTime',
      type: 'datePicker',
      component: () => (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            End Time <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.endTime ? styles.inputError : null,
            ]}
            onPress={() => setDatePickerOpen(prev => ({...prev, end: true}))}>
            <Text style={styles.dateButtonText}>
              {formatDateTime(formData.endTime)}
            </Text>
          </TouchableOpacity>
          {errors.endTime && (
            <Text style={styles.errorText}>{errors.endTime}</Text>
          )}
        </View>
      ),
    },
    {
      id: 'buttons',
      type: 'buttons',
      component: () => (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            className="bg-brand-yellow"
            style={[
              styles.submitButton,
              loading ? styles.disabledButton : null,
            ]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Flash Sale</Text>
            )}
          </TouchableOpacity>

          {/* <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity> */}
        </View>
      ),
    },
  ];
  // }
  // console.log(selectedProduct)
  const renderFormSection = ({item}) => {
    return <View key={item.id}>{item.component()}</View>;
  };

  const imageUrl = selectedProduct.images?.[0]?.key
    ? `${AWS_CDN_URL}${selectedProduct.images[0].key}`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={'Flash Sale'} />

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          data={formSections}
          renderItem={renderFormSection}
          ListHeaderComponent={
            <View className="mb-4 p-4 bg-secondary-color rounded-lg">
              <View className="flex-row items-center gap-4">
                <Image
                  source={{uri: imageUrl}}
                  style={{height: 70, width: 70, borderRadius: 10}}
                />
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg mb-2">
                    {selectedProduct?.title}
                  </Text>
                  <View className="flex-row items-center space-x-4">
                    <View className="flex-row items-center space-x-1 mr-3">
                      <IndianRupee size={14} color="#F7CE45" />
                      <Text className="text-brand-yellow font-medium">
                        {selectedProduct?.productPrice}
                      </Text>
                    </View>
                    <Box size={15} color={'#ccc'} />
                    <Text className="text-gray-300 ml-2 font-medium">
                      {getAvailableStock()} available
                    </Text>
                  </View>
                </View>
              </View>
            
              {getAvailableStock() <= 10 && getAvailableStock() > 0 && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    Low Stock Warning: Only {getAvailableStock()} items left!
                  </Text>
                </View>
              )}
              {getAvailableStock() === 0 && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorWarningText}>
                    Out of Stock - Cannot create flash sale
                  </Text>
                </View>
              )}
            </View>
          }
          keyExtractor={item => item.id}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          removeClippedSubviews={false}
        />

        {/* Date Pickers */}
        <DatePicker
          modal
          open={datePickerOpen.start}
          date={formData.startTime}
          mode="datetime"
          minimumDate={new Date()}
          theme="dark"
          onConfirm={date => {
            setDatePickerOpen(prev => ({...prev, start: false}));
            handleInputChange('startTime', date);
          }}
          onCancel={() => {
            setDatePickerOpen(prev => ({...prev, start: false}));
          }}
        />

        <DatePicker
          modal
          open={datePickerOpen.end}
          date={formData.endTime}
          mode="datetime"
          minimumDate={formData.startTime}
          theme="dark"
          onConfirm={date => {
            setDatePickerOpen(prev => ({...prev, end: false}));
            handleInputChange('endTime', date);
          }}
          onCancel={() => {
            setDatePickerOpen(prev => ({...prev, end: false}));
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  flatListContent: {
    padding: 20,
    flexGrow: 1,
  },
  fieldContainer: {
    marginBottom: 8,
  },
  productTabContainer: {
    height: 400, // Fixed height for product selection
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#404040',
  },
  buttonContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#404040',
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF453A',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoText: {
    color: '#F7CE45',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#404040',
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: '#1E1E1E',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  submitButton: {
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#555555',
  },
  cancelButton: {
    backgroundColor: '#555555',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  warningContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  warningText: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  errorWarningText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
  },
  variantInfoContainer: {
    // marginTop: 12,
    padding: 8,
    marginVertical:4,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  variantInfoText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FlashSaleForm;
