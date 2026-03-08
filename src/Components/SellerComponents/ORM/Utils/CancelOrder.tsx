import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const CancelReasonModal = ({onSubmit, isOPen, setIsOpen}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading,setLoading]=useState(false)
  const bottomSheetRef = useRef();
  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }
    try {
      setLoading(true);
      await onSubmit(reason);
      setReason('');
      setError('');
    } catch (error) {
      console.error('Error canceling order:', error);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOPen) bottomSheetRef.current.open();
    else {bottomSheetRef.current.close();
    setLoading(false)}
  }, [isOPen]);

  return (
    <RBSheet
      ref={bottomSheetRef}
      height={330}
      closeOnDragDown={true}
      closeOnPressBack
      closeOnPressMask={true}
      customStyles={{
        container: styles.sheetContainer,
        draggableIcon: styles.draggableIcon,
      }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cancel Order Reason</Text>
          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Why are you canceling this order?</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            multiline
            numberOfLines={4}
            placeholder="Enter reason for cancellation..."
            placeholderTextColor="#666"
            value={reason}
            onChangeText={text => {
              setReason(text);
              if (error) setError('');
            }}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setIsOpen(false)}
              disabled={loading}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Confirm Cancel</Text>
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
    paddingHorizontal: 16,
    paddingBottom:20
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
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    marginBottom: 16,
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
  confirmButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default React.memo(CancelReasonModal);
