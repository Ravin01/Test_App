// BottomSheet.js
import React, { useRef , useEffect} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const ReportBottomSheet = ({isOpen, isClose}) => {
  const refRBSheet = useRef();
  
   const handleSheetChanges = index => {
    console.log('handleSheetChanges', index);
  };

  const openBottomSheet = () => {
    if (refRBSheet.current) {
      refRBSheet.current.open();
      console.log('work');
    }
  };

  const closeBottomSheet = () => {
    if (refRBSheet.current) {
      refRBSheet.current.close();
    }
  };
  
    useEffect(() => {
    if (isOpen) openBottomSheet();
    else closeBottomSheet();
  }, [isOpen]);

  return (
    <>
      <RBSheet
        ref={refRBSheet}
        height={250}
        openDuration={250}
		 draggable={true}
         onClose={isClose}
        customStyles={{
          container: styles.sheetContainer,
        }}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.option} onPress = {closeBottomSheet}>
            <Icon name="eye" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.text}>Interested</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress = {closeBottomSheet}>
            <Icon name="eye-off" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.text}>Not Interested</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress = {closeBottomSheet}>
            <Icon name="alert-circle-outline" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.text}>Report Seller</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress = {closeBottomSheet}>
            <Icon name="bug-outline" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.text}>Report Bug</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  icon: {
    marginRight: 16,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ReportBottomSheet;
