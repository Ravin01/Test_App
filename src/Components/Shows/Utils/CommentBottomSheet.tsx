import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import Icon from 'react-native-vector-icons/Ionicons';

// Dummy data
const comments = new Array(12).fill(null).map((_, i) => ({
  id: `${i}`,
  user: 'Makapa',
  avatar: 'https://placehold.co/40x40',
  likeCount: 1,
  text:
    i % 3 === 0
      ? 'wow such a great product...try this @themeena'
      : '10/10 would buy again.. If I ever lose this one under the couch',
}));

const CommentBottomSheet = ({ isOpen, onClose, onSubmit, index }) => {
  const refRBSheet = useRef();
  const [comment, setComment] = useState('');
  
  {/* 
 const handleSheetChanges = (index) => {
    console.log('handleSheetChanges', index);
  };
  
  useEffect(() => {
	  handleSheetChanges(index);
    if (isOpen && refRBSheet.current) {
      refRBSheet.current.open();
    } else if (!isOpen && refRBSheet.current) {
      refRBSheet.current.close();
    }
  }, [isOpen, index]);
  
*/}

  useEffect(() => {
    if (isOpen && refRBSheet.current) {
      refRBSheet.current.open();
    } else if (!isOpen && refRBSheet.current) {
      refRBSheet.current.close();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (onSubmit && comment.trim()) {
      onSubmit(comment.trim());
      setComment('');
      refRBSheet.current.close();
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.commentRow}>
      <Image
          source={
            item.profileURL
              ? {uri: item.profileURL}
              :undefined
          }
          style={styles.avatar}
        />
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{item.user}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
	  <View style={{flexDirection: 'column'}}>
      <TouchableOpacity>
        <Icon name="heart-outline" size={18} color="white" />
      </TouchableOpacity>
	  <Text style={[styles.commentText, {textAlign: 'center'}]}>{item.likeCount}</Text>
	  </View>
    </View>
  );

  return (
    <RBSheet
      ref={refRBSheet}
      height={Dimensions.get('window').height * 0.65}
      openDuration={250}
      closeOnDragDown
      draggable
      onClose={onClose}
      customStyles={{
        wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
        draggableIcon: { backgroundColor: '#777' },
        container: {
          backgroundColor: '#2A2A2A',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
        },
      }}
    >
      <Text style={styles.commentsLabel}>Comments</Text>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <View style={styles.inputContainer}>
	    <TouchableOpacity>
	    <Text>🙂 </Text>
		</TouchableOpacity>
        <TextInput
          placeholder="Send your comments"
          placeholderTextColor="#999"
          style={styles.input}
          value={comment}
          onChangeText={setComment}
        />
        <TouchableOpacity onPress={handleSend}>
          <Icon name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  commentsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
	
	textAlign:'center'
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
	 borderWidth: 1,
    borderColor: '#FFD700',
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  commentText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#444',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 0,
	//backgroundColor: 'red'
  },
  input: {
    flex: 1,
    color: '#fff',
    marginRight: 10,
  },
});

export default CommentBottomSheet;
