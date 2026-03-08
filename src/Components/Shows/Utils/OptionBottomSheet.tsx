import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  ToastAndroid,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import axiosInstance from '../../Utils/Api';
import { Pencil } from 'lucide-react-native';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import RBSheet from 'react-native-raw-bottom-sheet';
import { location, locationActive } from '../../../assets/assets';
const PaymentBottomSheet = ({navigation,isOpen,selectedAddress, isCLose}) => {
  const bottomSheetRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState('address');
  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['25%', '50%', '80%'], []);

  // console.log('selected Address Id', selectedAddress);

  const handleSheetChanges = (index) => {
    console.log('handleSheetChanges', index);
  };

const openBottomSheet = () => {
  if (bottomSheetRef.current) {
    bottomSheetRef.current.open();
    console.log('work')
  }
};

const closeBottomSheet = () => {
  if (bottomSheetRef.current) {
    bottomSheetRef.current.close();
  }
 setTimeout(() => {
    isCLose?.();
  }, 250);
};

  useEffect(()=>{
    if(isOpen)
      openBottomSheet()
    else 
    closeBottomSheet()
  },[isOpen])

  const OptionItem = ({ icon, title, subtitle, isSelected, onPress, hasWarning , onEdit}) => (
    <TouchableOpacity 
      style={[styles.optionItem, isSelected && styles.selectedOption]} 
      onPress={onPress}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.iconContainer]}>
          {icon}
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, isSelected &&{color:'#000'}]}>{title}</Text>
          <Text style={[styles.optionSubtitle, isSelected &&{color:'#121212'}]}>{subtitle}</Text>
        </View>
      </View>
      {isSelected && <TouchableOpacity style={styles.optionRight} 
      onPress = {onEdit}
      // onPress={()=>{
      //   isCLose?.();
      //   navigation.navigate('EditAddressScreen');
      // }}
      >
      
          <Pencil color={isSelected?'#000':'#fff'} size={20}/>
        {/* </View> */}
      </TouchableOpacity>}
    </TouchableOpacity>
  );

  const renderBottomSheetContent = () => (
    <View style={styles.bottomSheetContent}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Payment & Address</Text>
        <Text style={styles.bottomSheetSubtitle}>
          Choose how to pay and where to deliver your products.
        </Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {!selectedAddress?
        <OptionItem
          icon={<Image source={selectedOption === 'address'?  {uri:locationActive}
                    : {uri:location}}
          style={{height:30,width:30}}
          />}
          title="Add address"
          subtitle="Please add your address for shipping your product"
          isSelected={selectedOption === 'address'}
          onPress={() => setSelectedOption('address')}
          onEdit = {()=>{
            isCLose?.();
            setTimeout(() => {
              navigation.navigate('EditAddressScreen');
            }, 250);
          }}
          hasWarning={true}
        />
        :
        
        <OptionItem
              icon={<Image source={selectedOption === 'shipping'  ? {uri:locationActive}
                    :{uri:location}}
              style={{height:30,width:30}}
              />}
          title="Shipping address"
          subtitle={`${selectedAddress?.line1} ${selectedAddress?.city}\n${selectedAddress?.state} ${selectedAddress?.pincode}`}
          isSelected={selectedOption === 'shipping'}
          onPress={() => setSelectedOption('shipping')}
          onEdit={()=>{
        isCLose?.();
         setTimeout(() => {
      navigation.navigate('EditAddressScreen');
    }, 250);
      }
      }
        />
        }
        <OptionItem
          icon={<FontAwesome6 name='wallet' size={20} color={selectedOption === 'payment'?'#000':'#fff'}/>}
          title="Payment"
          subtitle={`Please input your payment info \n(coming soon)`}
          isSelected={selectedOption === 'payment'}
          onPress={() => setSelectedOption('payment')}
          onEdit={()=>{
        ToastAndroid.show('Feature coming soon 🚀', ToastAndroid.SHORT);
      }
      }
        />
      </View>
    </View>
  );
 

  return (
    // <GestureHandlerRootView style={styles.container}>
    //   <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      <RBSheet
  ref={bottomSheetRef}
  height={400}   //500
  openDuration={250}
  draggable={true}
  onClose={closeBottomSheet}
  customStyles={{
    wrapper: styles.sheetWrapper,
    container: styles.bottomSheetBackground,
  }}
  closeOnPressBack={true}
>
  {renderBottomSheetContent()}
</RBSheet>

    // </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetWrapper:{

  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
  },
  openButton: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  openButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#000000E5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#666666',
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetHeader: {
    marginBottom: 15,
    justifyContent:'center',
    alignItems:'center'
  },
  bottomSheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign:'center',
    color: '#ffffff',
    marginBottom: 8,
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  optionsContainer: {
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#333333',
    borderRadius: 12,
  },
  selectedOption: {
    backgroundColor: '#F7CE45',
    // borderWidth: 1,
    // borderColor: '#FFB800',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default PaymentBottomSheet;