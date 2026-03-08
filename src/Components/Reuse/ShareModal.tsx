import React, { useState, useEffect, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ToastAndroid,
  Platform,
  Linking,
  Clipboard,
} from 'react-native';
import { Share } from 'react-native';
import { X, Search, MessageCircle, Check, Copy } from 'lucide-react-native';
import axiosInstance from '../../Utils/Api';
import { AuthContext } from '../../Context/AuthContext';
import { AWS_CDN_URL } from '../../Utils/aws';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Toast } from '../../Utils/dateUtils';
const ShareModal = ({
  isOpen,
  onClose,
  shareContent = '',
  shareUrl = '',
  onShare,
  source = null,
  liveStreamData = null, // NEW: For live stream sharing
  customShareHandler = null, // NEW: Custom handler for sharing
}) => {
  const { user }: any = useContext(AuthContext);
  const currentUserId = user?._id;

  const [searchTerm, setSearchTerm] = useState('');
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (isOpen && axiosInstance) {
      fetchChatRooms();
    }
  }, [isOpen, axiosInstance]);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/chat/rooms');
      if (response.data.status && response.data.data) {
        setChatRooms(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (room) => {
    if (room.roomType === 'direct_message' && room.participants) {
      const other = room.participants.find((p) => p.userId?._id !== currentUserId);
      return other?.userId;
    }
    return null;
  };

  const getChatDisplayName = (room) => {
    if (room.roomName) return room.roomName;
    const other = getOtherParticipant(room);
    return other?.name || 'Unknown User';
  };

  const getProfileImage = (user) => {
    if (user?.profileURL?.key) {
      return `${AWS_CDN_URL}${user.profileURL.key}`;
    }
    return null;
  };

  const filteredChatRooms = chatRooms.filter((room) => {
    const other = getOtherParticipant(room);
    if (!other || !other._id || !other.name) {
      return false;
    }
    const displayName = getChatDisplayName(room).toLowerCase();
    const userName = other?.userName?.toLowerCase() || '';
    return (
      displayName.includes(searchTerm.toLowerCase()) ||
      userName.includes(searchTerm.toLowerCase())
    );
  });

  const toggleChatSelection = (roomId) => {
    setSelectedChats((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };
// console.log(liveStreamData)
  const handleShareToChats = async () => {
    if (selectedChats.length === 0 || !axiosInstance) return;

    try {
      setIsSharing(true);

      const shareMessage = shareUrl
        ? `${shareUrl}${shareContent ? `\n${shareContent}` : ''}`
        : shareContent;

      // Send message to each selected chat with conditional source
      const sharePromises = selectedChats.map(async (roomId) => {
        let messagePayload;

        // Use custom share handler if provided (e.g., for product_share)
        if (customShareHandler) {
          return customShareHandler(roomId);
        }
        // Handle live stream sharing
        else if (source === 'liveVideo' && liveStreamData) {
          messagePayload = {
            messageType: 'live_stream_share',
            content: {
              liveStreamShare: {
                liveStreamId: liveStreamData._id || liveStreamData.id,
                streamTitle: liveStreamData.title || 'Live Stream',
                streamThumbnail:liveStreamData?.thumbnailImage|| liveStreamData.thumbnail || liveStreamData.thumbnailKey,
                isLive: liveStreamData.isLive !== undefined ? liveStreamData.isLive : true,
              },
            },
            metadata: {
              messageType: 'live_stream_share',
              context: 'share_modal',
            },
            source: 'liveVideo',
          };
        } else {
          // Regular text message sharing
          messagePayload = {
            messageType: 'text',
            content: { text: shareMessage },
            metadata: {
              messageType: 'shared_content',
              context: 'share_modal',
            },
          };

          // Only add source field for shoppable videos and products
          if (source === 'shoppable') {
            messagePayload.source = 'shoppable';
          } else if (source === 'product') {
            messagePayload.source = 'product';
          }
        }

        return axiosInstance.post(`/chat/rooms/${roomId}/messages`, messagePayload);
      });

      await Promise.all(sharePromises);

      // Only call onShare after successful sharing
      if (onShare) {
        onShare('chat', selectedChats);
      }

      setSelectedChats([]);
      const toastMessage = Platform.OS === 'android' ? ToastAndroid : Alert;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Shared successfully!', ToastAndroid.SHORT);
      } else {
        // Alert.alert('Success', 'Shared successfully!');
      }
      onClose();
    } catch (error) {
      console.log('Error sharing to chats:', error.response.data);
      Toast(error?.response?.data?.message)
      // Alert.alert('Error', 'Failed to share content');
    } finally {
      setIsSharing(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    const textToCopy = shareUrl
      ? `${shareContent ? shareContent + '\n' : ''}${shareUrl}`
      : shareContent;

    try {
      await Clipboard.setString(textToCopy);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);

      if (Platform.OS === 'android') {
        ToastAndroid.show('Copied to clipboard!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Content copied to clipboard!');
      }

      if (onShare) {
        onShare('copy', null);
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Share to external platforms
  const handleExternalShare = async (platform) => {
    const url = shareUrl || '';
    const text = shareContent || 'Check this out!';

    try {
      let shareUrl = '';

      switch (platform) {
        case 'whatsapp':
          shareUrl = `whatsapp://send?text=${encodeURIComponent(`${text} ${url}`)}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
          break;
      }

      const canOpen = await Linking.canOpenURL(shareUrl);
      if (canOpen) {
        await Linking.openURL(shareUrl);
        if (onShare) {
          onShare(platform, null);
        }
        onClose();
      } else {
        Alert.alert('Error', `Cannot open ${platform}`);
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      Alert.alert('Error', `Failed to share to ${platform}`);
    }
  };

  // Native share functionality
  const handleNativeShare = async () => {
    const shareData = {
      title: 'Check this out!',
      message: shareContent
        ? `${shareContent}${shareUrl ? '\n' + shareUrl : ''}`
        : shareUrl || 'Check this out!',
      url: shareUrl,
    };

    try {
      await Share.share(shareData);
      if (onShare) {
        onShare('native', null);
      }
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.title}>Share</Text>
            <TouchableOpacity
              onPress={handleShareToChats}
              disabled={selectedChats.length === 0 || isSharing}
              style={[
                styles.sendButton,
                (selectedChats.length === 0 || isSharing) && styles.sendButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.sendBtnText,
                  (selectedChats.length === 0 || isSharing) && styles.sendBtnTextDisabled,
                ]}
              >
                {isSharing ? 'Sharing...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Search size={16} color="#9ca3af" />
            <TextInput
              placeholder="Search people..."
              placeholderTextColor="#9ca3af"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          </View>

          {/* Chat List */}
          <ScrollView style={styles.chatList} showsVerticalScrollIndicator={true}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#f1c40f" />
                <Text style={styles.loadingText}>Loading chats...</Text>
              </View>
            ) : filteredChatRooms.length === 0 ? (
              <View style={styles.emptyBox}>
                <MessageCircle size={32} color="#9ca3af" />
                <Text style={styles.emptyText}>No chats found</Text>
              </View>
            ) : (
              filteredChatRooms.map((room) => {
                const other = getOtherParticipant(room);
                const displayName = getChatDisplayName(room);
                const profileImage = getProfileImage(other);
                const isSelected = selectedChats.includes(room._id);

                return (
                  <TouchableOpacity
                    key={room._id}
                    style={[styles.chatRow, isSelected && styles.chatRowSelected]}
                    onPress={() => toggleChatSelection(room._id)}
                  >
                    <View style={styles.avatarContainer}>
                      {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>
                            {displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Check size={12} color="#1e1e1e" />
                        </View>
                      )}
                    </View>

                    <View style={styles.chatInfo}>
                      <Text style={[styles.chatName, isSelected && styles.chatNameSelected]}>
                        {displayName}
                      </Text>
                      {room.lastActivity?.lastMessagePreview && (
                        <Text style={styles.lastMessage} numberOfLines={1}>
                          {room.lastActivity.lastMessagePreview.length > 30
                            ? `${room.lastActivity.lastMessagePreview.slice(0, 30)}...`
                            : room.lastActivity.lastMessagePreview}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* External Share Options */}
          <View style={styles.externalShareSection}>
            <Text style={styles.externalShareTitle}>Share to other platforms</Text>
            <View style={styles.platformsRow}>
              {/* Copy */}
              <TouchableOpacity style={styles.platformBtn} onPress={handleCopyToClipboard}>
                <View style={[styles.platformIcon, { backgroundColor: '#4b5563' }]}>
                  <Copy size={20} color="#fff" />
                </View>
                <Text style={styles.platformText}>Copy</Text>
                {copyFeedback && (
                  <View style={styles.copiedBadge}>
                    <Text style={styles.copiedText}>Copied!</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* WhatsApp */}
              <TouchableOpacity
                style={styles.platformBtn}
                onPress={() => handleExternalShare('whatsapp')}
              >
                <View style={[styles.platformIcon, { backgroundColor: '#25D366' }]}>
                  {/* <Text style={{ fontSize: 20 }}>📱</Text> */}
                  <FontAwesome size={30} color={'#fff'} name={'whatsapp'}/>
                </View>
                <Text style={styles.platformText}>WhatsApp</Text>
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                style={styles.platformBtn}
                onPress={() => handleExternalShare('facebook')}
              >
                <View style={[styles.platformIcon, { backgroundColor: '#1877F2' }]}>
                  <FontAwesome size={30} color={'#fff'} name={'facebook'}/>
                  {/* <Text style={{ fontSize: 20 }}>f</Text> */}
                </View>
                <Text style={styles.platformText}>Facebook</Text>
              </TouchableOpacity>

              {/* Twitter/X */}
              <TouchableOpacity
                style={styles.platformBtn}
                onPress={() => handleExternalShare('twitter')}
              >
                <View style={[styles.platformIcon, { backgroundColor: '#1DA1F2' }]}>
                  <Text style={{ fontSize: 20 }}>𝕏</Text>
                </View>
                <Text style={styles.platformText}>X</Text>
              </TouchableOpacity>

              {/* See All - Native Share */}
              <TouchableOpacity style={styles.platformBtn} onPress={handleNativeShare}>
                <View
                  style={[
                    styles.platformIcon,
                    { backgroundColor: '#8b5cf6', borderRadius: 24 },
                  ]}
                >
                  <Text style={{ fontSize: 20, color: '#fff' }}>•••</Text>
                </View>
                <Text style={styles.platformText}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  closeBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1c40f',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  sendBtnText: {
    color: '#1e1e1e',
    fontWeight: '600',
    fontSize: 14,
  },
  sendBtnTextDisabled: {
    color: '#9ca3af',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 8,
    fontSize: 14,
    color: '#fff',
  },
  chatList: {
    maxHeight: 300,
    paddingHorizontal: 8,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 14,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  chatRowSelected: {
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.3)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1c40f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  avatarText: {
    color: '#1e1e1e',
    fontWeight: '700',
    fontSize: 18,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f1c40f',
    borderWidth: 2,
    borderColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#fff',
  },
  chatNameSelected: {
    color: '#f1c40f',
  },
  lastMessage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    color: '#9ca3af',
    fontSize: 14,
  },
  externalShareSection: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
  },
  externalShareTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 16,
  },
  platformsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  platformBtn: {
    alignItems: 'center',
    position: 'relative',
  },
  platformIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformText: {
    fontSize: 12,
    color: '#d1d5db',
  },
  copiedBadge: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#f1c40f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copiedText: {
    color: '#1e1e1e',
    fontSize: 8,
    fontWeight: '600',
  },
});

export default ShareModal;