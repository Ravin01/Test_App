import React, { useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

const ChatScreen = ({navigation}) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hey there! How are you?',
      createdAt: new Date(),
      user: {
        id: '2',
        name: 'Friend',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    },
    {
      id: '2',
      text: 'Hey there! How are you?',
      createdAt: new Date(),
      user: {
        id: '1',
        name: 'Friend',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    },
    {
      id: '4',
      text: 'Great! What about you?',
      createdAt: new Date(),
      user: {
        id: '4',
        name: 'Friend',
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim().length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      createdAt: new Date(),
      user: {
        id: '1',
        name: 'You',
      },
    };

    setMessages((prevMessages) => [ ...prevMessages, newMessage]);
    setInputText('');
  };

  const renderItem = ({ item }) => {
    const isCurrentUser = item.user.id === '1';
    // Format time to 12-hour format with a.m. / p.m.
    const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    });

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageRight : styles.messageLeft,
        ]}
      >
        {!isCurrentUser && (
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        )}
        <View
          style={[
            styles.bubble,
            isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timeText}>{formattedTime}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
    {/*  Chat Header */}
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://i.pravatar.cc/150?img=1' }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Friend</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <TouchableOpacity style={styles.headerMenu}>
          <MaterialIcons name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

    {/* Chat Body */}
    <KeyboardAvoidingView
      style={styles.chatBody}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      //  inverted
        contentContainerStyle={styles.chatContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5ddd5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black', //'#f7cf4b',    //'#075e54',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    color: '#eee',   //'#d0f0c0',
    fontSize: 12,
  },
  headerMenu: {
    marginLeft: 10,
  },
  chatBody: {
    flex: 1,
  },
  chatContainer: {
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
   // flexDirection: 'row-reverse',
   
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 15,
  },
  bubbleLeft: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 0,
    paddingBottom: 3,
  },
  bubbleRight: {
    backgroundColor:'#f7cf4b',    //'#dcf8c6',
    borderTopRightRadius: 0,
    paddingBottom: 3,
  },
  messageText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sendText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    color: '#555',
    textAlign: 'right',
    marginTop: 4,
  },  
});

export default ChatScreen;

