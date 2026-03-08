import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';

interface NotificationEnableModalProps {
  visible: boolean;
  onClose: () => void;
  permission?: string; // optional, used for display
}

const NotificationEnableModal: React.FC<NotificationEnableModalProps> = ({
  visible,
  onClose,
  permission,
  checkPermission = () => {}, // default to empty function if not provided
}) => {
  const readableName = permission
    ? permission.charAt(0).toUpperCase() + permission.slice(1)
    : 'This';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Permission Required</Text>
          <Text style={styles.modalText}>
            {readableName} permission was denied. Please enable it in settings to continue.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onClose();
                Linking.openSettings();
                setTimeout(() => {
                    // Re-check permission after opening settings
                    checkPermission();
                }, 3000);
              }}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NotificationEnableModal;

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
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 12,
  },
  modalButtonText: {
    color: '#F7CE45',
    fontSize: 15,
    fontWeight: '500',
  },
});
