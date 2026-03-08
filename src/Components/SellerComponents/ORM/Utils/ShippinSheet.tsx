import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const ShippingDetailsModal = ({ onSubmit, isOPen, setIsOpen, isSubmitting = false }) => {
  const [formData, setFormData] = useState({ 
    carrier: '', 
    trackingNumber: '', 
    estimatedDelivery: null 
  });
  const [touched, setTouched] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const bottomSheetRef=useRef(null)

  useEffect(() => {
    if (bottomSheetRef.current?.state?.isOpen) {
      setFormData({ carrier: '', trackingNumber: '', estimatedDelivery: null });
      setTouched({});
    }
  }, [bottomSheetRef.current?.state?.isOpen]);

  const errors = {
    carrier: !formData.carrier ? "Carrier name is required" : "",
    trackingNumber: !formData.trackingNumber ? "Tracking number is required" : "",
  };
    useEffect(() => {
      if (isOPen) bottomSheetRef.current.open();
      else bottomSheetRef.current.close();
    }, [isOPen]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = () => {
    const newTouched = {
      carrier: true,
      trackingNumber: true
    };
    setTouched(newTouched);
    
    if (errors.carrier || errors.trackingNumber) {
      return;
    }
    
    onSubmit({
      ...formData,
      estimatedDelivery: formData.estimatedDelivery?.toISOString().split('T')[0] || ''
    });
    bottomSheetRef.current.close();
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, estimatedDelivery: selectedDate });
    }
  };

  return (
    <RBSheet
      ref={bottomSheetRef}
      height={450}
      closeOnPressBack
      onClose={()=>setIsOpen(false)}
      closeOnPressMask={true}
      customStyles={{
        container: styles.sheetContainer,
        draggableIcon: styles.draggableIcon
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Enter Shipping Details</Text>
          <TouchableOpacity 
            onPress={() => setIsOpen(false)} 
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Courier/Carrier Name</Text>
            <TextInput
              style={[
                styles.input,
                touched.carrier && errors.carrier ? styles.inputError : null
              ]}
              placeholder="e.g., Delhivery"
              placeholderTextColor="#666"
              value={formData.carrier}
              onChangeText={(text) => setFormData({ ...formData, carrier: text })}
              onBlur={() => handleBlur('carrier')}
            />
            {touched.carrier && errors.carrier && (
              <Text style={styles.errorText}>
                <MaterialIcons name="error-outline" size={14} color="#FF0000" /> {errors.carrier}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tracking Number</Text>
            <TextInput
              style={[
                styles.input,
                touched.trackingNumber && errors.trackingNumber ? styles.inputError : null
              ]}
              placeholder="Enter tracking ID"
              placeholderTextColor="#666"
              value={formData.trackingNumber}
              onChangeText={(text) => setFormData({ ...formData, trackingNumber: text })}
              onBlur={() => handleBlur('trackingNumber')}
            />
            {touched.trackingNumber && errors.trackingNumber && (
              <Text style={styles.errorText}>
                <MaterialIcons name="error-outline" size={14} color="#FF0000" /> {errors.trackingNumber}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Delivery (Optional)</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={formData.estimatedDelivery ? styles.dateText : styles.placeholderText}>
                {formData.estimatedDelivery 
                  ? new Date(formData.estimatedDelivery).toLocaleDateString() 
                  : 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.estimatedDelivery || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, isSubmitting && styles.disabledButton]}
              onPress={() => bottomSheetRef.current.close()}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={[styles.buttonText, styles.submitButtonText, styles.loadingText]}>Updating...</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, styles.submitButtonText]}>Confirm Shipment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16
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
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  dateText: {
    color: '#FFFFFF',
  },
  placeholderText: {
    color: '#666666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  submitButton: {
    backgroundColor: '#FFD700',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#000000',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
});

export default ShippingDetailsModal