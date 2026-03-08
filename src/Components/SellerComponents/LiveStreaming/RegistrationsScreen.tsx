import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image , FlatList, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import api from '../../../Utils/Api';
import { formatDateForDisplay, formatTimeForDisplay } from '../../../Utils/dateUtils';
import SellerHeader from '../SellerForm/Header';
import { AWS_CDN_URL } from '../../../../Config';
import { SafeAreaView } from 'react-native-safe-area-context';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { intialAvatar } from '../../../Utils/Constants';

const RegistrationsScreen = ({ navigation , route}) => {
const { showId } = route.params;
const [selectedShowRegistrations, setSelectedShowRegistrations] = useState([]);
const [loadingRegistrations, setLoadingRegistrations] = useState(false);

// 1. function to fetch registrations:
const fetchRegistrations = async () => {
  console.log('show  Id', showId);
  setLoadingRegistrations(true);
  try {
    const { data } = await api.get(`register-show/${showId}/registrations`);
    console.log(data.data.registrations);
    setSelectedShowRegistrations(data.data.registrations);
  } catch (error) {
    console.error("Error fetching registrations:", error);
   // negative("Failed to fetch registrations.");
  } finally {
    setLoadingRegistrations(false);
  }
};

useEffect(() => {
    fetchRegistrations();
  }, [showId]);

 const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.userCard}
    //  onPress={()=>navigation.navigate("ViewSellerProdile",{id:item?.userId?.name})}
     >
      <Image
        source={{ uri: item?.userId?.profileURL?.key?`${AWS_CDN_URL}${item.userId?.profileURL?.key}` :`${intialAvatar}${item.userId?.name}` }}
        style={styles.avatar}
      />
      {/* {console.log(item)} */}
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.userId?.name || 'No Name'}</Text>
        <View style={{flexDirection:'row', gap:12, marginTop: 4}}>
        {item.userId?.email &&<View style={{backgroundColor:'#fcd34d', borderRadius:20, paddingHorizontal: 6}}>
        <Text style={styles.time1}>
           {item.userId?.email}
        </Text>
        </View>}
        {item.userId?.phone && <View style={{backgroundColor:'#fcd34d', borderRadius:20, paddingHorizontal: 6}}>
        <Text style={styles.time1}>
          {item.userId?.phone}
        </Text>
        </View>}
        </View>
        <Text style={styles.date}>Registered on</Text>
        <Text style={styles.time}>
           {formatDateForDisplay(item.registeredAt)} •{' '}
          {formatTimeForDisplay(item.registeredAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

   return (
    <SafeAreaView style={styles.container}>
       <SellerHeader navigation={navigation} message={'Registrations'} />

      <View style={styles.header}>
        <Icon name="users" size={20} color="#fcd34d" />
        <Text style={styles.headerText}>
          Show Registrations ({selectedShowRegistrations.length})
        </Text>
      </View>

      {loadingRegistrations ? (
        <ActivityIndicator size="large" color="#fcd34d" style={{ marginTop: 32 }} />
      ) : selectedShowRegistrations.length === 0 ? (
         <View style={styles.centerContent}>
    <Icon name="users" size={48} color="#cccccc" style={{ marginBottom: 12 }} />
    <Text style={styles.emptyTitle}>No Registrations Yet</Text>
    <Text style={styles.emptySubtitle}>No users have registered for this show yet.</Text>
  </View>
      ):
      (
        <FlatList
          data={selectedShowRegistrations}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24,marginHorizontal: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

export default RegistrationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
   // padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16
  },
  headerText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 8,
  },
  userCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    color:  '#fcd34d',  //'#aaaaaa',
    fontSize: 12,
    marginTop: 4,
  },
  time: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  time1: {
    color: '#333',
    fontSize: 12,
  },

centerContent: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 32,
},
emptyTitle: {
  color: '#ffffff',
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 4,
},
emptySubtitle: {
  color: '#cccccc',
  fontSize: 14,
  textAlign: 'center',
  paddingHorizontal: 32,
},
});