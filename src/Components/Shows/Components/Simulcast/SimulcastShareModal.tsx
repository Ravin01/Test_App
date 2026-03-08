import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share as RNShare,
  Clipboard,
} from 'react-native';
import {Cast, X, Copy, Share2, Info} from 'lucide-react-native';
import {Toast} from '../../../../Utils/dateUtils';
import {shareUrl} from '../../../../../Config';

interface SimulcastShareModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
}

const SimulcastShareModal: React.FC<SimulcastShareModalProps> = ({
  visible,
  onClose,
  streamId,
}) => {
  const [simulcastShareLink, setSimulcastShareLink] = useState('');

  // Generate simulcast link when modal opens
  React.useEffect(() => {
    if (visible && streamId) {
      const link = `${shareUrl}user/show/${streamId}?simulcast=true`;
      setSimulcastShareLink(link);
    }
  }, [visible, streamId]);

  // Copy simulcast link to clipboard
  const copySimulcastLink = async () => {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        await Clipboard.setString(simulcastShareLink);
        Toast('Simulcast link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying link:', error);
      Toast('Failed to copy link');
    }
  };

  // Share simulcast link via native share
  const shareSimulcastLink = async () => {
    try {
      const result = await RNShare.share({
        message: `Join me to set up simulcast streaming: ${simulcastShareLink}`,
        url: simulcastShareLink,
        title: 'Simulcast Setup Link',
      });

      if (result.action === RNShare.sharedAction) {
        Toast('Link shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing link:', error);
      Toast('Failed to share link');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Cast size={20} color="#a855f7" />
              <Text style={styles.headerText}>Simulcast Setup Link</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Icon & Description */}
            <View style={styles.shareLinkContainer}>
              <View style={styles.shareLinkIcon}>
                <Cast size={32} color="#a855f7" />
              </View>
              <Text style={styles.shareLinkTitle}>Simulcast Setup Link</Text>
              <Text style={styles.shareLinkDescription}>
                Share this link to access simulcast configuration
              </Text>
            </View>

            {/* Link Display */}
            <View style={styles.linkDisplayBox}>
              <Text style={styles.linkText} numberOfLines={3}>
                {simulcastShareLink}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.shareLinkButtons}>
              <TouchableOpacity
                onPress={copySimulcastLink}
                style={styles.copyLinkButton}>
                <Copy size={18} color="#fff" />
                <Text style={styles.copyLinkButtonText}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={shareSimulcastLink}
                style={styles.shareNowButton}>
                <Share2 size={18} color="#fff" />
                <Text style={styles.shareNowButtonText}>Share Now</Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>

            {/* Info Note */}
            <View style={styles.shareLinkInfoBox}>
              <Info size={14} color="#60a5fa" />
              <Text style={styles.shareLinkInfoText}>
                <Text style={{fontWeight: 'bold'}}>Note:</Text> Anyone with this
                link can access the simulcast setup page for this show. Use it
                to configure YouTube, Instagram, or Facebook streaming.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1c1917',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  shareLinkContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shareLinkIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shareLinkTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  shareLinkDescription: {
    fontSize: 14,
    color: '#a8a29e',
    textAlign: 'center',
  },
  linkDisplayBox: {
    backgroundColor: '#292524',
    borderWidth: 1,
    borderColor: '#44403c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#d6d3d1',
  },
  shareLinkButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  copyLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f7',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyLinkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareNowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292524',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#292524',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareLinkInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  shareLinkInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#93c5fd',
    lineHeight: 18,
  },
});

export default SimulcastShareModal;
