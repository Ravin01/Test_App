import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const PendingBottomSheet = ({ 
  message = '', 
  onWait, 
  isOpen, 
  onClose,
  phoneNumber = '+1234567890',
  whatsappNumber = '+1234567890',
  email = 'support@flykup.in'
}) => {
  const rbSheetRef = useRef();

  useEffect(() => {
    if (isOpen)
      rbSheetRef.current?.open();
    else
      rbSheetRef.current?.close();
  }, [isOpen]);

  const handleWait = () => {
    rbSheetRef.current?.close();
    onClose();
    onWait && onWait();
  };

  const handleCall = () => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${whatsappNumber}&text=Hello, I need help with my pending application.`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${email}?subject=Application Status Inquiry&body=Hello, I would like to inquire about my pending application status.`);
  };

  const handleGoBack = () => {
    rbSheetRef.current?.close();
    onClose();
  };

  return (
    <RBSheet
      ref={rbSheetRef}
      height={480}
      openDuration={250}
      closeDuration={200}
      onClose={onClose}
      closeOnDragDown={true}
      draggable={true}
      customStyles={{
        wrapper: {
          backgroundColor: 'rgba(0,0,0,0.7)',
        },
        container: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: '#121212',
          paddingHorizontal: 0,
        },
        draggableIcon: {
          backgroundColor: '#666666',
          width: 40,
          height: 4,
        },
      }}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="schedule" size={45} color="#F7CE45" />
            </View>
            <Text style={styles.title}>Application Pending</Text>
            <Text style={styles.subtitle}>
              Your application is currently under review
            </Text>
          </View>

          {/* Status Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Status Update:</Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                {message || 'Your application is being processed. Please wait for further updates or contact support if you need immediate assistance.'}
              </Text>
            </View>
          </View>

          {/* Contact Support Section */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportTitle}>Need Help? Contact Support</Text>
            <View style={styles.contactOptions}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Icon name="call" size={20} color="#F7CE45" />
                </View>
                <Text style={styles.contactText}>Call Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Icon name="chat" size={20} color="#F7CE45" />
                </View>
                <Text style={styles.contactText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleEmail}
                activeOpacity={0.8}
              >
                <View style={styles.contactIconContainer}>
                  <Icon name="email" size={20} color="#F7CE45" />
                </View>
                <Text style={styles.contactText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.goBackButton]}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.waitButton]}
              onPress={handleWait}
              activeOpacity={0.8}
            >
              <Text style={styles.waitButtonText}>Wait</Text>
              <Icon name="access-time" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 30,
    minHeight: 430,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#2A2417',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3D3524',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F7CE45',
    minHeight: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  messageText: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  supportContainer: {
    marginBottom: 20,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  contactButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    minWidth: 80,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2417',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  goBackButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444444',
  },
  waitButton: {
    backgroundColor: '#F7CE45',
    elevation: 3,
    shadowColor: '#F7CE45',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  waitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default PendingBottomSheet;