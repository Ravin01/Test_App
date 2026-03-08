import React, { useState, useEffect, useRef , useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  Keyboard
} from 'react-native';
import { Send, Smile } from 'lucide-react-native';
import {io} from 'socket.io-client';
import { socketurl } from '../../../Config';
import axiosInstance from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';
import {
  GET_TICKET_DETAILS,
  SELLER_REPLY_TICKET,
} from '../../../Config';
import RBSheet from 'react-native-raw-bottom-sheet';
const {width, height} = Dimensions.get('window');

const socket = io(socketurl, {
  transports: ['websocket', 'polling'],
  autoConnect: false, // Don't auto-connect until we have user info
});

// If you want emojis, install react-native-emoji-selector and uncomment:
// import EmojiSelector from 'react-native-emoji-selector';

const TicketReplies = ({ ticketId,uniqueId, isOpen, setIsOpen }) => {
  const flatListRef = useRef(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const {user, fetchuser}: any = useContext(AuthContext);

  const refRBSheet = useRef();

  // Keyboard listeners
  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideListener = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Join socket room
  useEffect(() => {
    if (ticketId && user?._id) {

     if (!socket.connected) {
      socket.connect();
    }

      socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      });

      socket.emit('join_ticket', {
        ticketId,
        userId: user._id,
        userRole: user.role,
      });

      socket.on('new_reply', (data) => {
        console.log('new_reply socket',data);
        if (data.ticketId === ticketId) {
          setReplies((prev) => [...prev, data.reply]);
        }
      });

      
    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

      return () => {
        socket.emit('leave_ticket', { ticketId });
        socket.off('new_reply');
      };
    }
  }, [ticketId, user]);

  // Load existing replies
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const response = await axiosInstance.get(GET_TICKET_DETAILS(ticketId));
        setReplies(response.data.replies || []);
      } catch (error) {
        console.error('Error fetching replies:', error);
      }
    };
    if (ticketId) fetchReplies();
  }, [ticketId]);

  const fetchReplies = async () => {
      try {
        if(!ticketId){
          return
        }
        const response = await axiosInstance.get(GET_TICKET_DETAILS(ticketId));
        setReplies(response.data.replies || []);
      } catch (error) {
        console.error('Error fetching replies:', error);
      }
  };

  // Scroll to bottom when replies update
  useEffect(() => {
    if (flatListRef.current && replies.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [replies]);

  const handleSubmitReply = async () => {
    if (!newReply.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post(SELLER_REPLY_TICKET(ticketId), {
        message: newReply,
      });
      fetchReplies();
      setNewReply('');
     // setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentUserMessage = (reply) =>
    reply.repliedBy?._id === user?._id ||
    (reply.repliedByRole === user?.role && reply.repliedBy?.name === user?.name);

  const isAdminMessage = (reply) => reply.repliedByRole === 'Admin';

  const getDisplayName = (reply) => {
    if (isCurrentUserMessage(reply)) return 'You';
    if (isAdminMessage(reply)) return 'Flykup Team';
    return reply.repliedBy?.name || reply.repliedByRole;
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = isCurrentUserMessage(item);
    const isAdmin = isAdminMessage(item);

    let bubbleStyle = styles.otherBubble;
    let textColor = '#fff';
    if (isCurrentUser) {
      bubbleStyle = styles.userBubble;
      textColor = '#000';
    } else if (isAdmin) {
      bubbleStyle = styles.adminBubble;
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
        ]}
      >
        <View style={[styles.messageBubble, bubbleStyle]}>
          <Text style={[styles.sender, { color: textColor }]}>{getDisplayName(item)}</Text>
          <Text style={[styles.messageText, { color: textColor }]}>{item.message}</Text>
          <Text style={[styles.timestamp, { color: textColor }]}>
            {new Date(item.repliedAt).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

    // --- OPEN / CLOSE ---
    useEffect(() => {
      if (isOpen) {
        
        refRBSheet.current.open();
      } else {
        refRBSheet.current.close();
      }
    }, [isOpen]);

  return (
    // <RBSheet
    //     ref={refRBSheet}
    //     closeOnDragDown={true}
    //     closeOnPressMask={true}
    //     height={600} // adjust height as needed
    //     customStyles={{
    //       wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
    //       draggableIcon: { backgroundColor: '#ccc' },
    //       container: { borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: '#111' },
    //     }}
    //   >
        <RBSheet
      ref={refRBSheet}
     // height={600}
    height={height * 0.6}
     openDuration={250}
      closeOnDragDown={true}
      draggable={true}
      onClose={() => setIsOpen(false)}
      customAvoidingViewProps={{
        enabled: true,
        behavior: Platform.OS === 'ios' ? 'padding' : 'height',
      }}
      customStyles={{
        container: {
          backgroundColor: "#121212",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
        },
        draggableIcon: {
          backgroundColor: "#FFd700",
          width: 60,
          height: 3,
        },
      }}
    >
{/* <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={80} // adjust for header height
  > */}
    <View
      style={styles.container}
      //behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Chat - {uniqueId}
                  </Text>
                  {/* <TouchableOpacity onPress={() => setChatModalTicket(null)}>
                    <XCircle size={20} color="#9ca3af" />
                  </TouchableOpacity> */}
                </View>
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={replies}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      {/* Emoji picker (optional) */}
      {/* {showEmojiPicker && (
        <View style={{ height: 250 }}>
         <EmojiSelector
            onEmojiSelected={(emoji) => setNewReply((prev) => prev + emoji)}
            showSearchBar={false}
            showTabs={true}
          /> 
          <Text style={{ color: '#ccc', textAlign: 'center' }}>
            Emoji picker goes here
          </Text>
        </View>
      )} */}

      {/* Input */}
      <View style={[styles.inputContainer, isKeyboardVisible && { marginBottom: 20 }]}>
        {/* <TouchableOpacity
          onPress={() => setShowEmojiPicker((prev) => !prev)}
          style={styles.emojiBtn}
        >
          <Smile size={20} color="#ccc" />
        </TouchableOpacity> */}
        <TextInput
          style={styles.input}
          placeholder="Type your reply..."
          placeholderTextColor="#9ca3af"
          value={newReply}
          onChangeText={(text) => {
            setNewReply(text);
            //if (showEmojiPicker) setShowEmojiPicker(false);
          }}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          onPress={handleSubmitReply}
          disabled={!newReply.trim() || isSubmitting}
          style={[
            styles.sendBtn,
            (!newReply.trim() || isSubmitting) && { opacity: 0.5 },
          ]}
        >
          <Send size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
    {/* </KeyboardAvoidingView> */}
     </RBSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { padding: 12 },
  messageContainer: { flexDirection: 'row', marginBottom: 8 },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 12,
    padding: 8,
  },
  userBubble: { backgroundColor: '#facc15' },
  adminBubble: { backgroundColor: '#2563eb' },
  otherBubble: { backgroundColor: '#374151' },
  sender: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  messageText: { fontSize: 14 },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#111',
    marginBottom: 0,
  },
  emojiBtn: {
    padding: 6,
    marginRight: 4,
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  sendBtn: {
    backgroundColor: '#facc15',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
    modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
});

export default TicketReplies;
