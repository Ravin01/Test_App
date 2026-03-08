import React, { useState, useCallback } from 'react';
import {KeyboardAvoidingView, TextInput,Dimensions, View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, FlatList, TouchableHighlight } from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Checkbox} from 'react-native-paper';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

const ExchangeReasonScreen = ({navigation, route}) => {
  const {order} = route.params || {};
  const [activeTab, setActiveTab] = useState('Orders');
  const [activeFilter, setActiveFilter] = useState('On the way');

  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customReason, setCustomReason] = useState('');

  const reasonsList = [
  'Received the wrong item',
  'Size Issue',
  'Product is damaged or defective',
  'Not as Described',
  'Received a different color/model',
  'Want a different size or variant',
  'Missing parts or accessories',
  'Other reasons',
];

 const toggleReason = (reason) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/

const handleConfirm = () => {
    console.log('Reasons:', selectedReasons);
    console.log('Custom Message:', customReason);
    navigation.navigate('ExchangeConfirmScreen',{order});
  };

  const filters = [
    { name: 'On the way', active: true },
    { name: 'Delivered', active: false },
    { name: 'Cancelled', active: false },
    { name: 'Refund', active: false },
    { name: 'Review', active: false },
  ];

  const FooterComponent = React.memo(() => {
  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: 20}}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.label}>Please let us know the reason for cancelling this product</Text>

      {reasonsList.map((reason) => (
        <View key={reason} style={styles.checkboxContainer}>
          <Checkbox
            status={selectedReasons.includes(reason) ? 'checked' : 'unchecked'}
            onPress={() => toggleReason(reason)}
            color="#ffcc00"
          />
          <Text style={styles.checkboxLabel}>{reason}</Text>
        </View>
      ))}

     {selectedReasons.includes('Other reasons') && (
      <TextInput
        style={styles.input}
        placeholder="Add additional comments..."
        placeholderTextColor="#888"
        value={customReason}
        onChangeText={setCustomReason}
        multiline
      />)}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
        style={[styles.confirmButton, !selectedReasons.length && { opacity: 0.5 }]}
        disabled={!selectedReasons.length}
        onPress={handleConfirm}>
          <Text style={styles.confirmText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
});


  // Replace with actual icons in your project
  const renderHeaderIcons = () => (
       <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
      </TouchableOpacity>
      <LinearGradient
        colors={['#B38728', '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Exchange</Text>
        </View>
      </LinearGradient>
    </View>
  );


  const renderOrderItem = (item, index) => (
    <View style={styles.orderItemContainer} key={`${item.name}-${index}`}>
      <Image source={item.image} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemMetaText}>Size - {item.size}</Text>
           
          <Text style={styles.itemMetaText}>Qty - {item.qty}</Text>
        </View>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
      </View>
    </View>
  );

  const renderOrderCard = useCallback((order) => (
    <View style={styles.orderCard} key={order.id}>
      <View style={styles.cardHeader}>
        <View style={styles.vendorContainer}>
          <MaterialIcons name="store" size={16} color="#888" />
          <Text style={styles.vendorName}>{order.vendor}</Text>
        </View>
        <Text style={styles.statusText}>{order.status}</Text>
      </View>
      
      <TouchableOpacity style={styles.cardContent} onPress={()=>navigation.navigate('OrderDetailScreen')}>
        {order.items.map((item, index) => renderOrderItem(item, index))}
        
      <View style={styles.shippingInfo}>
        <MaterialIcons name="local-shipping" size={16} color="#888" />
        <View style={styles.shippingDetails}>
          <Text style={styles.shippingStatus}>{order.shipping.status}</Text>
          <Text style={styles.deliveryEstimate}>
            Delivered on 25th December
          </Text>
        </View>
      </View>
      </TouchableOpacity>
      
      
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₹{order.total.toLocaleString()}</Text>
      </View>
    </View>
  ));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={60} // adjust this depending on your header/nav
    >
     <View style={{ flex: 1 }}>
        {renderHeaderIcons()}

      {/* <FlatList
      data={orders}
      contentContainerStyle={styles.ordersContainer}
      renderItem={({item})=>renderOrderCard(item)}
      showsVerticalScrollIndicator={false}
      scrollEnabled
      keyboardShouldPersistTaps="handled"
       keyExtractor={item => item.id.toString()}
       //ListFooterComponent={<View style={{marginBottom:100}}/>}
       ListFooterComponent={FooterComponent}
      /> */}

      <ScrollView
      contentContainerStyle={{ paddingBottom: 20}}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {renderOrderCard(order)}
      <Text style={styles.label}>Please let us know the reason for cancelling this product</Text>

      {reasonsList.map((reason) => (
        <View key={reason} style={styles.checkboxContainer}>
          <Checkbox
            status={selectedReasons.includes(reason) ? 'checked' : 'unchecked'}
            onPress={() => toggleReason(reason)}
            color="#ffcc00"
          />
          <Text style={styles.checkboxLabel}>{reason}</Text>
        </View>
      ))}

     {selectedReasons.includes('Other reasons') && (
      <TextInput
        style={styles.input}
        placeholder="Add additional comments..."
        placeholderTextColor="#888"
        value={customReason}
        onChangeText={setCustomReason}
        multiline
      />)}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
        style={[styles.confirmButton, !selectedReasons.length && { opacity: 0.5 }]}
        disabled={!selectedReasons.length}
        onPress={handleConfirm}>
          <Text style={styles.confirmText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
      
      </View>
       </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor,
    paddingHorizontal: 8,
    // padding:20
  },
  // header: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   paddingHorizontal: 16,
  //   backgroundColor:'#29282B',
  //   marginBottom:20,
  //   paddingVertical: 12,
  // },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerIcons: {
    flexDirection: 'row',
    gap:10,
  },
  iconButton: {
    marginLeft: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    // borderBottomWidth: 1,
    // borderBottomColor: '#333',
    gap:5,
    marginBottom:10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor:'#1F2937',
    borderRadius:20,

  },
  activeTab: {
    // borderBottomWidth: 2,
    // borderBottomColor: '#f4ba00',
    backgroundColor:colors.primaryButtonColor
  },
  tabText: {
    color: '#fff',
    fontWeight:'bold',
    fontSize: 14,
  },
  activeTabText: {
    color: '#000',
    fontWeight: '500',
  },
  filtersContainer: {
    // paddingVertical: 10,
    // marginVertical:20,
    // paddingHorizontal: 16,
    backgroundColor:'#2C2C2C',
    marginBottom:20,
    // width:'100%',
    height:50,
    alignItems:'center'
    // gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFC10030',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#f4ba00',
  },
  filterText: {
    color: '#888',
    fontSize: 12,
  },
  activeFilterText: {
    color: '#000',
    fontWeight: '500',
  },
  ordersContainer: {
    // flex: 1,
    paddingHorizontal: 16,
    // paddingTop: 8,
  },
  orderCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    marginBottom: 16,
    // padding:20,
    // paddingVertical:10,
    // paddingHorizontal:20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  vendorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorName: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  statusText: {
    color: '#f4ba00',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderItemContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    // backgroundColor: '#2C2C2C',
    // borderBottomColor: '#fff',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#777',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap:5,
  },
  itemMetaText: {
    color: '#888',
    fontSize: 12,
  },
  itemMetaDot: {
    color: '#888',
    marginHorizontal: 4,
  },
  itemPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
        
    paddingVertical: 8,
    backgroundColor: '#F7CE452B',
  },
  shippingDetails: {
    marginLeft: 8,
    flexDirection:'row',
    // justifyContent:'space-between'
    gap:6,
    alignItems:'center'
  },
  shippingStatus: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deliveryEstimate: {
    color: '#888',
    fontSize: 11,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    gap:10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight:'bold'
  },
  totalAmount: {
    color: colors.primaryButtonColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.10,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10,
    marginHorizontal: -8
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
  },
  input: {
    borderColor: '#F7CE45',  //'#333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#1a1a1a',
    marginTop: 12,
    marginHorizontal: '10%'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ffcc00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#ffcc00',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#ffcc00',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontWeight: '600',
  },
});

export default ExchangeReasonScreen;
