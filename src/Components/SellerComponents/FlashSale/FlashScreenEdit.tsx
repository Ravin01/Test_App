import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Toast } from '../../../Utils/dateUtils';
import axiosInstance from '../../../Utils/Api';
import SellerHeader from '../SellerForm/Header';
import DatePicker from 'react-native-date-picker';

const EditFlashSaleScreen = ({ navigation, route }) => {
  const { saleData } = route.params;
  
  const [formData, setFormData] = useState({
    title: '',
    discount: '',
    stockLimit: '',
    startTime: '',
    endTime: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (saleData) {
      // Helper function to format date to YYYY-MM-DDTHH:mm
      const toDateTimeLocal = (dateStr) => {
        const date = new Date(dateStr);
        return date;
      };
      
      setFormData({
        title: saleData.title || '',
        discount: saleData.discount?.toString() || '',
        stockLimit: saleData.stockLimit?.toString() || '',
        startTime: saleData.startTime ? toDateTimeLocal(saleData.startTime) : '',
        endTime: saleData.endTime ? toDateTimeLocal(saleData.endTime) : ''
      });
    }
  }, [saleData]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showAlert = (title, message) => {
    Toast(message);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openDatePicker = (field) => {
    setCurrentDateField(field);
    setSelectedDate(formData[field] || new Date());
    setDatePickerOpen(true);
  };

  const confirmDate = () => {
    if (currentDateField) {
      setFormData(prev => ({ ...prev, [currentDateField]: selectedDate }));
    }
    setDatePickerOpen(false);
  };

  const cancelDatePicker = () => {
    setDatePickerOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.title ||  !formData.startTime || !formData.endTime) {
      showAlert('Validation Error', 'Please fill all required fields');
      return;
    }
    
    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      showAlert('Validation Error', 'End time must be after start time');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axiosInstance.patch(`/flash-sale/${saleData._id}`, {
        ...formData,
        discount: parseFloat(formData.discount),
        stockLimit: formData.stockLimit ? parseInt(formData.stockLimit) : null
      });
      navigation.goBack();
    } catch (error) {
      console.log('Error updating flash sale:', );
      showAlert('Error', error.response.data.message||'Failed to update flash sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-color">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <SellerHeader navigation={navigation} message={'Edit Flash Sale'}/>

        <ScrollView className="flex-1 p-4">
          <View className="space-y-4">
            {/* Sale Title */}
            <View className="mb-4">
              <Text className="text-gray-200 text-lg mb-2">Flash Sale Title</Text>
              <TextInput
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
                className="w-full px-4 py-3 bg-secondary-color border border-gray-700 rounded-lg text-gray-200 text-lg"
                placeholder="Enter sale title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Discount 
            <View className="mb-4">
              <Text className="text-gray-200 font-medium text-lg mb-2">Discount (%)</Text>
              <TextInput
                value={formData.discount}
                onChangeText={(value) => handleInputChange('discount', value)}
                className="w-full px-4 py-3 bg-secondary-color border border-gray-700 rounded-lg text-gray-200 text-lg"
                placeholder="Enter discount percentage"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>*/}

            {/* Stock Limit 
            <View className="mb-4">
              <Text className="text-gray-200 font-medium text-lg mb-2">Stock Limit (Optional)</Text>
              <TextInput
                value={formData.stockLimit}
                onChangeText={(value) => handleInputChange('stockLimit', value)}
                className="w-full px-4 py-3 bg-secondary-color border border-gray-700 rounded-lg text-gray-200 text-lg"
                placeholder="Leave empty for unlimited"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>*/}

            {/* Start Time */}
            <View className="mb-4">
              <Text className="text-gray-200 font-medium text-lg mb-2">Start Time</Text>
              <TouchableOpacity 
                onPress={() => openDatePicker('startTime')}
                className="w-full px-4 py-3 bg-secondary-color border border-gray-700 rounded-lg"
              >
                <Text className="text-gray-200 text-lg">
                  {formData.startTime ? formatDate(formData.startTime) : 'Select start time'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* End Time */}
            <View className="mb-6">
              <Text className="text-gray-200 font-medium text-lg mb-2">End Time</Text>
              <TouchableOpacity 
                onPress={() => openDatePicker('endTime')}
                className="w-full px-3 py-3 bg-secondary-color border border-gray-700 rounded-lg"
              >
                <Text className="text-gray-200 text-lg">
                  {formData.endTime ? formatDate(formData.endTime) : 'Select end time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          transparent={true}
          animationType="slide"
          visible={datePickerOpen}
          onRequestClose={cancelDatePicker}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-primary-color p-5 rounded-t-3xl">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-gray-200 text-xl font-bold">
                  Select {currentDateField === 'startTime' ? 'Start' : 'End'} Date & Time
                </Text>
                <TouchableOpacity onPress={cancelDatePicker}>
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <DatePicker
                mode="datetime"
                date={selectedDate}
                onDateChange={setSelectedDate}
                textColor="#FFFFFF"
                theme="dark"
                minuteInterval={5}
              />
              <TouchableOpacity 
                onPress={confirmDate}
                className="bg-yellow-400 py-3 rounded-lg mt-4"
              >
                <Text className="text-gray-900 text-center font-bold text-lg">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Bottom Buttons */}
        <View className="p-4 border-t border-gray-700">
          <View className="flex-row justify-end space-x-4 gap-3">
            <TouchableOpacity 
              onPress={handleClose}
              className="py-3 px-8 bg-gray-600 rounded-lg active:bg-gray-700"
            >
              <Text className="text-white font-medium text-lg">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`py-3 px-8 rounded-lg ${
                isSubmitting 
                  ? 'bg-yellow-400 opacity-50' 
                  : 'bg-yellow-400 active:bg-yellow-500'
              }`}
            >
              {isSubmitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#1F2937" />
                  <Text className="text-gray-900 font-bold text-lg ml-2">Updating...</Text>
                </View>
              ) : (
                <Text className="text-gray-900 font-bold text-lg">Update Sale</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditFlashSaleScreen;