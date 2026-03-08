import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { X } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageModal = ({ visible, imageUri, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.2)" barStyle="light-content" />
      <View style={styles.modalContainer}>
        <ImageViewer
          imageUrls={[{ url: imageUri }]}
          enableSwipeDown
          onSwipeDown={onClose}
          // onClick={onClose}
           imageProps={{
            style: styles.zoomImage
          }}
          enablePreload
        renderIndicator={()=>null}
          renderHeader={() => (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#FFFFFF" size={24} />
            </TouchableOpacity>
          )}
          footerContainerStyle={styles.footerContainer}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    
  },
  zoomImage:{  width: 200,
    borderRadius: 150,
    height: 200,},
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    bottom: 20,
  },
});

export default ImageModal;