import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,ToastAndroid
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { close, noteWhite, noteYellow } from '../../../../assets/assets';

const NoteModal = ({ visible, onClose, note }) => {
  const [noteInput, setNoteInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
 
  // console.log('note',note);

const handleSave = () => {
	
	
  // onSubmit(noteInput);             
  setSubmitted(true);             
  setNoteInput('');              

  // Show a Toast message immediately
  ToastAndroid.show('Note added!', ToastAndroid.SHORT);

  // Delay closing the modal so user sees the toast
  setTimeout(() => {
    onClose();                    
    setSubmitted(false);          
  }, 300);                        
};
// console.log(visible)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={100}
            reducedTransparencyFallbackColor="white"
          />

          {/* Close Icon */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Image
              source={{uri:close}}
              style={styles.closeIcon}
            />
          </TouchableOpacity>

          {/* Title */}
		  <View style={{flexDirection:'row', gap: 4}}>
		  <Image
  source={
  {uri: noteInput !== ''
      ? noteWhite
      :noteYellow}
  }
  style={styles.TitleIcon}
/>

          <Text style={[styles.headerText,noteInput !== '' && {color:'#fff'}]}>See note</Text>
          </View>
		  

          {/* Input */}
          <TextInput
            placeholder="No note added..."
  placeholderTextColor="#ccc"
//  value={noteInput}
value = {note}
  onChangeText={setNoteInput}
  style={styles.textarea}
  multiline={true}
  numberOfLines={4}
  editable={false} 
          />

      {/* Submit Button */}
			{/* {submitted?
		    (
			 <TouchableOpacity onPress={handleSave} style={styles.button} disabled={submitted}>
              <LinearGradient
              colors={['#E0E0E075', '#E0E0E075']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
              >
              <Text style={styles.buttonText}>Note added</Text>
              </LinearGradient>
             </TouchableOpacity>
			)
		    :
			(<TouchableOpacity onPress={handleSave} style={styles.button}>
            <LinearGradient
              colors={['#AC8201', '#FFC100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text style={styles.buttonText}>
                Add Note
                </Text>
            </LinearGradient>
          </TouchableOpacity>)
			  } */}
        </View>
      </View>
    </Modal>
  );
};

export default NoteModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: 320,
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',  //'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
  },
  closeIcon: {
    width: 20,
    height: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC100',
    marginBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  productTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productCategory: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  productStock: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
  },
textarea: {
  width: '100%',
  height: 150, // <-- increased height
  borderWidth: 0,
  borderColor: '#ddd',
  borderRadius: 16,
  padding: 12,
  color: '#fff',
  backgroundColor: '#D9D9D940', // semi-transparent
  marginBottom: 40,
  textAlignVertical: 'top', // ensures text starts at the top for multiline
},
  button: {
    width: '60%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  label: {
	color: '#fafafa',
    fontSize: 16,
    fontWeight: '500',
	alignSelf: 'flex-start',
	marginBottom: 4
  },
  TitleIcon: {
  width: 24,
  height: 24,
  resizeMode: 'contain',
  //marginRight: 4,
  marginTop: 4
},

});
