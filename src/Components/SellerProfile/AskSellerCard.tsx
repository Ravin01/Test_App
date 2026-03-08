import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ToastAndroid, KeyboardAvoidingView, Platform } from "react-native";
import { Send } from "lucide-react-native"; // same icon library for React Native
import * as Animatable from "react-native-animatable";
import axiosInstance from '../../Utils/Api';
import {shareUrl} from '../../../Config';

const AskSellerCard = ({ seller, user, product, productId }) => {
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

//   console.log('product',product);
//   console.log('Seller ID:', seller?.userInfo?._id, 'User ID:', user?._id, 'Product ID:', productId);

  if (!seller || !user || user._id === seller?.userInfo?._id) return null;
  if (!productId || !product) return null;

  const onSubmit = async () => {
    if (!chatMessage.trim()) return;
    try {
      setIsSendingMessage(true);
      await handleSendChatMessage(chatMessage);
      setChatMessage("");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendChatMessage = async (chatMessage) => {
    
    if (!chatMessage.trim() || isSendingMessage) return;

    if (!user) {
      return;
    }

    setIsSendingMessage(true);
    
    try {
      const chatResponse = await axiosInstance.post('chat/direct-message', {
        userId: seller?.userInfo?._id,
        userType: 'user'
      });

      if (chatResponse.data.status) {
        const chatRoom = chatResponse.data.data;
        
        // Send product URL first
        await axiosInstance.post(
          `chat/rooms/${chatRoom._id}/messages`,
          {
            messageType: 'text',
            content: { text: `${shareUrl}/user/product/${productId}` },
            metadata: {
              fromProduct: productId,
              productTitle: product?.title,
              context: 'product_link'
            },
            source: 'product'
          }
        );

        // Then send user's message
        const messageResponse = await axiosInstance.post(
          `chat/rooms/${chatRoom._id}/messages`,
          {
            messageType: 'text',
            content: { text: chatMessage.trim() },
            metadata: {
              fromProduct: productId,
              productTitle: product?.title,
              messageType: 'product_question',
              context: 'product_ask_seller'
            },
            source: 'product'
          }
        );

        if (messageResponse.data.status) {
          setChatMessage('');
          ToastAndroid.show('Message sent to seller!', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      ToastAndroid.show('Failed to send message', ToastAndroid.SHORT);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    // <KeyboardAvoidingView
    //   behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    //   keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    // >
      <Animatable.View
        animation="fadeInUp"
        duration={500}
        style={styles.card}
      >
        <Text style={styles.title}>
          <Send size={18} color="#FFD60A" style={{ marginRight: 6 }} /> Ask the Seller
        </Text>
        <Text style={styles.subtitle}>
          Have a question? Ask {seller?.companyName || "the seller"} directly
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            value={chatMessage}
            onChangeText={setChatMessage}
            placeholder="Ask Seller..."
            placeholderTextColor="#888"
            editable={!isSendingMessage}
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.button,
              (!chatMessage.trim() || isSendingMessage) && styles.buttonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!chatMessage.trim() || isSendingMessage}
            activeOpacity={0.8}
          >
            {isSendingMessage ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Send size={16} color="#000" />
                {/* <Text style={styles.buttonText}>Send Message</Text> */}
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animatable.View>
    // </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#222", // bg-blackDark
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 16,
  },
  title: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 8,
    flexDirection: "row",
  },
  subtitle: {
    color: "#bbb",
    fontSize: 13,
    marginBottom: 12,
  },
  formContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a", // bg-blackLight
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#FFD60A", // newYellow
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#000",
    fontWeight: "500",
    fontSize: 14,
  },
});

export default AskSellerCard;
