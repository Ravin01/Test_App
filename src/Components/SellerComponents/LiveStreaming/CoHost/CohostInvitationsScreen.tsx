import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Linking,
} from 'react-native';
import axios from 'axios';
// import { Toast } from '../Utils/Toast';
import InviteCard from './CohostInviteCard';
import axiosInstance from '../../../../Utils/Api';
import { colors } from '../../../../Utils/Colors';
import SellerHeader from '../../SellerForm/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shareUrl } from '../../../../../Config';


const CohostInvitationsScreen = ({navigation}) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const Toast = message => {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  };
  const fetchInvites = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/cohost/invite/received`);
      setInvites(res.data.data || []);
      // console.log(res.data)
    } catch (e) {
      //   Toast({ type: 'error', text1: 'Error fetching invites' });
      Toast(e.response.data.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
    const id = setInterval(fetchInvites, 15000);
    return () => clearInterval(id);
  }, [fetchInvites]);

  const handleResponse = async (inviteId, action) => {
    const snapshot = [...invites];
    setInvites(iv =>
      iv.map(i => (i.inviteId === inviteId ? {...i, status: action} : i)),
    );
    try {
      await axiosInstance.patch(`/cohost/respond/${inviteId}`, {action});
      Toast(`Invitation ${action}`);
      fetchInvites();
    } catch (e) {
      setInvites(snapshot);
      Toast(`Failed to ${action}`);
    }
  };

  const upcoming = invites.filter(i =>
    ['pending', 'accepted'].includes(i.status),
  );
  const past = invites.filter(i =>
    ['rejected', 'cancelled', 'left'].includes(i.status),
  );
  const renderItem = ({item}) => {
    // console.log(item)
    return(
    <InviteCard
      invite={item}
      onAccept={id => handleResponse(id, 'accepted')}
      onReject={id => handleResponse(id, 'rejected')}
      onJoin={(sid, lid) =>
        // Toast("Upcoming Feature! Join live stream as co-host")
        Linking.openURL(`${shareUrl}seller/show/${item.show?.showId}/cohost`)
        // navigation.navigate('StreamPreviewScreen', {item:{_id: sid, role:"co-host"}})
      }
    />
  )};

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming'
          ? 'No pending or accepted invitations.'
          : 'No past invitations to review.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.header}>
        <Text style={styles.title}>Co‑Host Invitations</Text>
      </View> */}
      <SellerHeader message={'Co‑Host Invitations'} navigation={navigation}/>

      {/* Simple Tab Switch */}
      <View style={styles.tabs}>
        {['upcoming', 'past'].map(tab => (
          <Text
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} color={colors.primaryButtonColor} />
      ) : (
        <FlatList
          data={activeTab === 'upcoming' ? upcoming : past}
          renderItem={renderItem}
         
            keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </SafeAreaView>
  );
};

export default CohostInvitationsScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.primaryColor},
  header: {
    // padding: 10,
    backgroundColor: colors.SecondaryColor,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  title: {fontSize: 20, fontWeight: 'bold',color:'#fff'},
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    // backgroundColor: '#fff',
  },
  tab: {padding: 12,  fontSize: 16, color: '#6b7280'},
  activeTab: {color:colors.primaryButtonColor, borderBottomWidth: 2, borderColor: colors.primaryButtonColor},
  loader: {flex: 1, justifyContent: 'center'},
  list: {padding: 16},
  emptyContainer: {alignItems: 'center', marginTop: 60},
  emptyText: {fontSize: 16, color: '#6b7280'},
});
