import React, { useState } from 'react';
import {Dimensions, View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, FlatList, TouchableHighlight } from 'react-native';
import FastImage from 'react-native-fast-image';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Dropdown} from 'react-native-element-dropdown';
import DatePicker from 'react-native-date-picker';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';

const { width, height } = Dimensions.get('window');

const ExchangeConfirmScreen = ({navigation,route}) => {
  const {order} = route.params || {};
  const [activeTab, setActiveTab] = useState('Orders');
  const [activeFilter, setActiveFilter] = useState('On the way');
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [isPickingStart, setIsPickingStart] = useState(true);

  const filters = [
    { name: 'On the way', active: true },
    { name: 'Delivered', active: false },
    { name: 'Cancelled', active: false },
    { name: 'Refund', active: false },
    { name: 'Review', active: false },
  ];

  const [productVariant, setProductVariant] = useState({
    color: '',
    size: ''
  });

  const [scheduledAt, setScheduledAt] = useState({
    date: '',
    time: {startTime: '', endTime: ''},
  })

 const parseDate = dateStr => {
  if (!dateStr) return new Date();
  // Example input: "18 May, 2025"
  const parsed = new Date(dateStr);

  if (isNaN(parsed)) {
    //console.warn('Invalid date string:', dateStr);
    return new Date(); // Fallback to now
  }
  return parsed;
};

    // To format the date as "DD/MM/YYYY"
  const formatDate = d => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  };

    // Helper to format time as "HH:MM AM/PM"
const formatTime = date => {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};


  // Helper to parse time string like "02:30 PM" into a Date object
  const parseTime = timeStr => {
    if (!timeStr) return new Date();
    const [time, modifier] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let date = new Date();
    date.setHours(modifier === 'PM' ? (+hours % 12) + 12 : +hours % 12);
    date.setMinutes(+minutes);
    date.setSeconds(0);
    return date;
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
   // navigation.navigate('ReturnConfirmScreen');
  };

    // Main sections for FlatList
  const sections = [
    { 
      id: 'order',
      type: 'order',
      data: order
    },
    { 
      id: 'recommendations',
      type: 'recommendations',
    },
    { 
      id: 'address',
      type: 'address',
    },
    { 
      id: 'SchedulePickup',
      type: 'SchedulePickup',
    },
    { 
      id: 'summary',
      type: 'summary',
     // data: orderStatus
    },
  ];

  const products = [
    { 
      id: 1, 
      brand: 'Alexander McQueen', 
      name: 'Oversized White Black Sneakers', 
      price: '₹71,711', 
      image: 'https://placehold.co/60x60/png'
    },
    { 
      id: 2, 
      brand: 'Puma - Cat Pack 2', 
      name: 'Unisex Cricket Shoes', 
      price: '₹6,000', 
      image: 'https://placehold.co/60x60/png'
    },
  ];

  // Render different sections based on type
  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'address':
        return (
          <View style={styles.addressContainer}>
            <Text style={styles.sectionTitle}>Pickup Address</Text>
            <View style={styles.addressTextContainer}>
              <View style={{width: '64%'}}>
              <Text style={styles.addressText}>
                127, Peters Rd, Gopalapuram, Chennai, Tamil Nadu 600086, India.
              </Text>
              </View>
              <TouchableOpacity>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <FontAwesome5 name="edit" size={14} color="#FBBF24" />
              <Text style={styles.branchText}>Edit</Text>
              </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case 'order':
        return (
          <>
          {renderOrderCard(order)}
          </>
    // <FlatList
    //   data={orders}
   
    //   contentContainerStyle={styles.ordersContainer}
    //   renderItem={({item})=>renderOrderCard(item)}
    //   scrollEnabled
    //    keyExtractor={item => item.id}
    //   // ListFooterComponent={<View style={{marginBottom:100}}/>}
    //   />
        );
      
      case 'SchedulePickup':
        return (
           <View style={styles.scheduleContainer}>
             <Text style={styles.sectionTitle}>Schedule Product Pickup</Text>
             {/* <View style={styles.inputContainer}> */}
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  onPress={() => setOpen(true)}
                  style={styles.dateInput}>
                  <Text style={{color: scheduledAt.date ? '#aaa' : '#777'}}>
                    {scheduledAt.date ? scheduledAt.date : 'DD MM, YYYY'}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  open={open}
                  date={parseDate(scheduledAt.date)}
                  mode="date"
                  onConfirm={selectedDate => {
                    setOpen(false);
                    const formatted = formatDate(selectedDate);
                    //handleChange('date', formatted);
                    setScheduledAt(prev => ({ ...prev, date: formatted }));
                  }}
                  onCancel={() => {
                    setOpen(false);
                  }}
                />
              {/* </View> */}
              {/* Time */}
              {/* <View style={styles.inputContainer}> */}

                <TouchableOpacity
  onPress={() => {
    setIsPickingStart(true);
    setTimeOpen(true);
  }}
  style={styles.dateInput}>
 <Text style={{ color: scheduledAt.time.startTime && scheduledAt.time.endTime
      ?'#aaa': '#777', textAlign: 'center' }}>
    {scheduledAt.time.startTime && scheduledAt.time.endTime
      ? `${scheduledAt.time.startTime} - ${scheduledAt.time.endTime}`
      : 'Select Time Range'}
  </Text>

</TouchableOpacity>


<DatePicker
  modal
  open={timeOpen}
  mode="time"
  date={new Date()}
  onConfirm={selectedTime => {
    const formatted = formatTime(selectedTime);

    if (isPickingStart) {
      // Set start time and immediately prompt for end time
      setScheduledAt(prev => ({
        ...prev,
        time: { ...prev.time, startTime: formatted },
      }));
      // Delay switching state to ensure DatePicker reopens properly
      setTimeout(() => {
        setIsPickingStart(false);   // Now we're picking end time
        setTimeOpen(true);          // Reopen picker for end time
      }, 200);
      setTimeOpen(false); // Close temporarily
    } else {
      // Set end time and finish
      setScheduledAt(prev => ({
        ...prev,
        time: { ...prev.time, endTime: formatted },
      }));
      setIsPickingStart(true);
      setTimeOpen(false);
    }
  }}
  onCancel={() => {
    setTimeOpen(false);
    setIsPickingStart(true);
  }}
/>

              {/* </View> */}
            </View>
          </View>
        );
      
      case 'summary':
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product Price</Text>
              <Text style={styles.detailValue}>₹49,711</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Exchange Fee</Text>
              <Text style={styles.detailValue}>₹0.00</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Refund / Payable</Text>
              <View style={styles.orderIdContainer}>
                <Text style={styles.highlightText}>₹0.00</Text>
                {/* <TouchableOpacity style={styles.copyButton}>
                  <Feather name="copy" size={14} color="#9CA3AF" />
                </TouchableOpacity> */}
              </View>
            </View>
            
            <View style={styles.guaranteeContainer}>
               <FontAwesome5 name="shield-alt" size={14} color="#FBBF24" />
              <Text style={styles.detailLabel}>Safe & easy exchange guarantee</Text>
            </View>
          </View>
        );
      
      case 'recommendations':
        return (
            <View style={styles.dropdownContainerWrapper}>
              
             <Text style={styles.sectionTitle}>Schedule Product Pickup</Text>
             <View style={styles.dropdownContainer}>
             <View  style={{width: '46%'}}>
              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start'},
                ]}>
                <Text style={styles.dropdownLabel}>Color</Text>
              </View>
              <Dropdown
                data={[
                  {value: 'black', label: 'Black'},
                  {value: 'red', label: 'Red'},
                  {value: 'yellow', label: 'Yellow'},
                  {value: 'green', label: 'Green'},
                  {value: 'orange', label: 'Orange'},
                  {value: 'blue', label: 'Blue'},
                  {value: 'gray', label: 'Gray'},
                  {value: 'violet', label: 'Violet'},
                  {value: 'pink', label: 'Pink'},
                ]}
                labelField="label"
                valueField="value"
                style={styles.dropdown}
                placeholder="color"
                placeholderStyle={{color: '#777'}}
                selectedTextStyle= {styles.selectedTextStyle}
                value={productVariant.color}
                onChange={item => setProductVariant(prev => ({ ...prev, color: item }))}
                search
                searchPlaceholder="Search color"
                searchPlaceholderTextColor="#777"
              />
              </View>
              <View  style={{width: '46%'}}>
              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start'},
                ]}>
                <Text style={styles.dropdownLabel}>Size</Text>
              </View>
              <Dropdown
                data={[
                  {value: '26', label: '26'},
                  {value: '28', label: '28'},
                  {value: '30', label: '30'},
                  {value: '32', label: '32'},
                  {value: '34', label: '34'},
                  {value: '36', label: '36'},
                  {value: '40', label: '40'},
                  {value: '42', label: '42'},
                ]}
                labelField="label"
                valueField="value"
                style={styles.dropdown}
                selectedTextStyle= {styles.selectedTextStyle}
                placeholder="size"
                placeholderStyle={{color: '#777'}}
                value={productVariant.size}
                 onChange={item => setProductVariant(prev => ({ ...prev, size: item }))}
                search
                searchPlaceholder="Search size"
                searchPlaceholderTextColor="#777"
              />
              </View>
              </View>
              <Text style={{color:'#9CA3AF'}}>Available: <Text style={{color:'#FBBF24'}}>In Stock</Text></Text>
          </View>
        );
      
      default:
        return null;
    }
  };


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

  const renderOrderCard = (order) => (
    <View style={styles.orderCard} key={order.id}>
      <View style={styles.cardHeader}>
        <View style={styles.vendorContainer}>
          <MaterialIcons name="store" size={16} color="#888" />
          <Text style={styles.vendorName}>{order.vendor}</Text>
        </View>
        <Text style={styles.statusText}>{order.status}</Text>
      </View>
      
      <TouchableOpacity style={styles.cardContent} onPress={()=>{}}>
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
  );

  const FooterComponent = React.memo(() => {
  return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={()=>navigation.navigate('bottomtabbar', { screen: 'myactivity' })}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={()=>navigation.navigate('bottomtabbar', { screen: 'myactivity' })}>
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </View>
  );
});

  return (
    <SafeAreaView style={styles.container}>
     
       {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>My Activity</Text> */}
        {renderHeaderIcons()}
      {/* </View> */}
      
      <FlatList
     // data={orders}
     data= {sections}
      contentContainerStyle={styles.ordersContainer}
     // renderItem={({item})=>renderOrderCard(item)}
     renderItem={renderItem}
     showsVerticalScrollIndicator={false}
      scrollEnabled
       keyExtractor={item => item.id}
      // ListFooterComponent={<View style={{marginBottom:100}}/>}
       ListFooterComponent={FooterComponent}
      />
      {/* <ScrollView style={styles.ordersContainer}>
        {orders.map(order => renderOrderCard(order))}
      </ScrollView> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor,
    // padding:20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor:'#29282B',
    marginBottom:20,
    paddingVertical: 12,
  },
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
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#1a1a1a',
    marginTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#fff',  //'#ffcc00',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff', //'#ffcc00',
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
  addressContainer: {
    backgroundColor: '#2C2C2C',
    padding: 16,
   // flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    marginBottom: 16
  },
  addressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    flex: 1,
    gap: '20%',
    justifyContent: 'space-between'
  },
  addressText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: '#2C2C2C',
    marginBottom: 20,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#9CA3AF',
  },
  detailValue: {
    color: '#D1D5DB',
  },
  highlightText: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButton: {
    marginLeft: 8,
  },
  guaranteeContainer: {
    marginTop: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6
  },
  totalText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  totalAmount: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 18,
  },
    sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
  },
    branchText: {
    color: '#FBBF24',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold'
  },
  dropdownContainer:{
    backgroundColor: '#2C2C2C',
    //padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    marginBottom: 10
  },
   dropdownContainerWrapper:{
    backgroundColor: '#2C2C2C',
    flexDirection: 'column',
    // alignItems: 'center',
    // justifyContent: 'space-between',
    borderRadius: 8,
     marginBottom: 16,
     paddingVertical: 16,
     paddingHorizontal: 16,
   //  backgroundColor: 'red',
  },
    dropdown: {
    //borderWidth: 1,
    borderColor: '#ccc',
    height: 30,
    borderRadius: 8,
    backgroundColor: '#111',
    padding: 10,
    //width: '50%'
  },
  dropdownLabel:{
    color:'#9CA3AF',
    marginBottom: 4
  },
  selectedTextStyle:{
    color: '#777',
  },
  dateInput:{
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    height: 40,
    textAlignVertical: 'top',
    backgroundColor: '#1a1a1a',
    marginTop: 0,
  },
  scheduleContainer: {
    backgroundColor: '#2C2C2C',
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    borderRadius: 8,
    marginBottom: 16
  },
  inputContainer: {
    backgroundColor: '#2C2C2C',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'space-between',
    padding: 10,
    gap: 8
  },
});

export default ExchangeConfirmScreen;
