import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const RestrictModule = ({ visible, onClose, mode1, sellerName = "Makapa", profileURL='' }) => {
    const [mode,setmode]=useState(mode1)
  const renderContent = () => {
    switch(mode) {
      case 'access':
        return (
          <View style={styles.contentContainer}>
           
            <Text style={styles.title}>🔒 Access Restricted</Text>
            <Text style={styles.description}>
              Only verified users can participate in auctions.{'\n'}
              Become a verified user to start bidding now!
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Become verified user</Text>
            </TouchableOpacity>
          </View>
        );

      case 'giveaway':
        return (
          <View style={styles.contentContainer}>
           
            <Text style={styles.title}>🎁 Giveaway Access Restricted</Text>
            <Text style={styles.description}>
              Only followers of this seller can participate in this giveaway.{'\n'}
              Follow the seller to unlock access!
            </Text>
            
            <View style={styles.sellerInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <Text style={styles.sellerName}>{sellerName}</Text>
            </View>
            
            <TouchableOpacity style={styles.followButton} onPress={()=>setmode('success')}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
          </View>
        );

      case 'success':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>✅ Followed Successfully</Text>
            <Text style={styles.successDescription}>
              You've unlocked access to this giveaway!
            </Text>
            
            {/* <Text style={styles.giveawayTitle}>Giveaway - Nike shoes #23</Text>
            <Text style={styles.timeLeft}>⭐ {timeLeft} left</Text>
            <Text style={styles.entries}>Entries • {entries}</Text>
            
            <TouchableOpacity style={styles.enterButton}>
              <Text style={styles.enterButtonText}>Enter</Text>
            </TouchableOpacity> */}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={3}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.1)"
          />
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

export default RestrictModule;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: 320,
    minHeight: 280,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  successDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FFC100',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 200,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sellerInfo: {
    alignItems: 'center',
    marginBottom: 10,
    gap:5,
    flexDirection:'row'
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    // marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sellerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  followButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  giveawayTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeLeft: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 5,
  },
  entries: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  enterButton: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  enterButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});