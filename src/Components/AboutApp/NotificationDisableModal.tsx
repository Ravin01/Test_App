import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';

const NotificationDisableModal = ({ visible, onClose }) => {
  const handleOpenSettings = () => {
    onClose();
    Linking.openSettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Disable Notifications</Text>
          <Text style={styles.modalText}>
            To disable notifications, please turn them off in your phone settings.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenSettings} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationDisableModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    elevation: 10,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalButtonText: {
    color: '#F7CE45',
    fontSize: 15,
    fontWeight: '500',
  },
});
