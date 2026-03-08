import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../../Utils/Colors';
import ProfileSetup from './ProfileSetup';
import { X } from 'lucide-react-native';

interface ProfileSetupModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  visible,
  onClose,
  navigation,
}) => {
  return (
    <View style={{ height: '100%', justifyContent: 'center', position: 'relative' }}>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={()=>{
         // onClose(); // Prevent closing the modal with back button
        }
        }
        onDismiss={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Complete Profile Setup</Text>
            {/* <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color="#FFC107" size={24} />
            </TouchableOpacity> */}
          </View>

          {/* Profile Setup Component */}
          <ProfileSetup navigation={navigation} onClose={onClose} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',  //'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color:'#F7CE45', //'#FFC107',
  },
  closeButton: {
    padding: 4,
  },
});

export default ProfileSetupModal;
