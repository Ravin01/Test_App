import { useRoute } from '@react-navigation/native';
import { List } from 'lucide-react-native';
import React, { useContext } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { colors } from '../../Utils/Colors';
import { AuthContext } from '../../Context/AuthContext';
import { useAccess } from '../../Context/AccessContext';
import { flykupLogo } from '../../assets/assets';


const Header = ({ navigation }) => {
  const route = useRoute(); // Get the current route
  const {notifyCount}:any=useContext(AuthContext)
  const { isAccessMode } = useAccess(); // Get access mode status
// console.log(notifyCount)
  return (
    <View style={styles.header} className='flex-row'>
      <TouchableOpacity>
        <Image
          source={{uri:flykupLogo}}
          style={styles.logo}
          resizeMode='cover'
        />
      </TouchableOpacity>
      
      <View style={{ flexDirection: 'row',gap:2 }}>
        {/* Only show search icon if current screen is NOT GlobalSearch */}
        {!isAccessMode && route.name !== 'GlobalSearch' && (
          <TouchableOpacity style={[styles.searchButton,{marginRight:7}]}  onPress={() => navigation.navigate('GlobalSearch',{categories:''})}>
            {/* <Search size={24} color={'#fff'} /> */}
             <Text style={styles.Emoji}>🔍</Text>
          </TouchableOpacity>
        )}

       {/* Only show notification icon if NOT in access mode */}
        {!isAccessMode && (
        <TouchableOpacity style={styles.searchButton} onPress={() => navigation.navigate('NotificationScreen')}>
          <Text style={styles.Emoji}>🔔</Text>
          {notifyCount>0 &&
          <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{Number(notifyCount)>99?'99+':`${notifyCount}`}</Text>
          </View>}
        </TouchableOpacity>)}

        <TouchableOpacity 
          style={styles.hamburgerButton}
          onPress={() => navigation.toggleDrawer()}
          // hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <List size={24} color={'#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryColor,

    // backgroundColor:'green',
    // backgroundColor:'red',
    // backgroundColor:'yellow',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  badgeContainer: {
  minWidth: 17,
  height: 17,
  position:'absolute',
  borderRadius: 10,
  backgroundColor: 'red',
  justifyContent: 'center',
  // padding:5,
  alignItems: 'center',
  // paddingHorizontal: 3,
  // paddingVertical:2,
  marginLeft: 10,
  left: 6,
  top: 0
},

badgeText: {
  fontSize: 8,
  fontWeight: '600',
  color: '#fff',
},
  logo: {
    width: 100,
    height: 40,
  },
  Emoji: { fontSize: 16 },
  searchButton: {
    width: 32,
    height: 32,
    borderRadius: 20, // makes it circular
    backgroundColor: '#333', // button background (change as needed)
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 5, // Android shadow
  },
  hamburgerButton: {
    alignSelf: 'center',
    paddingHorizontal:7,
    // paddingVertical: 10,
    minWidth: 32,
    minHeight: 32,
    // backgroundColor:'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;
