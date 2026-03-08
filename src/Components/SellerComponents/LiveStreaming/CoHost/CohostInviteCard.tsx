import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import * as Animatable from 'react-native-animatable';
import { AWS_CDN_URL } from '../../../../Utils/aws';
import { colors } from '../../../../Utils/Colors';
import { useNavigation } from '@react-navigation/native';
import { Navigation } from 'lucide-react-native';

const statusStyles = {
  pending: { color: '#fbbf24', text: 'Pending Response' },
  accepted: { color: '#22c55e', text: 'Accepted' },
  rejected: { color: '#ef4444', text: 'Declined' },
  cancelled: { color: '#f97316', text: 'Cancelled' },
  left: { color: '#64748b', text: 'Ended' },
};

const formatDate = iso =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    : 'Invalid Date';

const InviteCard = ({ invite, onAccept, onReject, onJoin }) => {
  const { status, show, inviteId, liveStreamId, host, reason } = invite;
  const st = statusStyles[status] || statusStyles.left;
  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isLive = show?.showStatus === 'live';
  // console.log(invite)

  const pastText = (() => {
    if (show?.showStatus === 'ended' && !['rejected','cancelled'].includes(status))
      return 'This live stream has ended.';
    if (status === 'rejected') return 'You declined this invitation.';
    if (status === 'cancelled') return 'Host cancelled this invitation.';
    if (status === 'left') return 'You left this live stream.';
    return 'This invitation is no longer active.';
  })();
  const navigation =useNavigation()

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={300}
      style={[styles.card]}
    >

      {/* <View style={styles.main}> */}
        {/* Host Info */}
        <TouchableOpacity onPress={()=>navigation.navigate('ViewSellerProdile',{id:host?.userName})} style={styles.main}>
        <Image
          source={{ uri:host.profileURL? `${AWS_CDN_URL}${host.profileURL}` : undefined }}
          style={styles.avatar}
        //   defaultSource={require('./assets/default-avatar.png')}j
        />
        <View style={styles.textArea}>
          <Text style={styles.hostName}>{host?.userName}</Text>
          <Text style={styles.company}>{host?.companyName || 'No Company'}</Text>
        </View>
        <View style={[styles.badge, { borderColor: st.color }]}>
          <Text style={{ color: st.color, fontWeight: '600' }}>{st?.text}</Text>
        </View>
        </TouchableOpacity>
      {/* </View> */}

      <View style={styles.showArea}>
        <Text style={styles.showTitle}>{show.title || 'Untitled Show'}</Text>
        <Text style={styles.meta}>
          📅 {formatDate(show.scheduledAt)} · {show.showStatus}
        </Text>
      </View>

      {/* Action Area */}
      <View style={styles.actionArea}>
        {isPending && (
          <>
            <View style={styles.infoBox}>
              <Feather name="star" size={16} color="#fbbf24" />
              <Text style={styles.infoText}>
                Co‑Host invitation: Accept now to secure your spot!
              </Text>
            </View>
            <View style={styles.buttonsRow}>
              <Pressable style={[styles.btn, styles.accept]} onPress={() => onAccept(inviteId)}>
                <Feather name="check" size={18} color="#000" />
                <Text style={styles.btnText}>Accept</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.reject]} onPress={() => onReject(inviteId)}>
                <Feather name="x" size={18} color="#fff" />
                <Text style={[styles.btnText,{color:'#fff'}]}>Decline</Text>
              </Pressable>
            </View>
          </>
        )}

        {isAccepted && (
          <View style={styles.infoBox}>
            {!isLive &&
            <Feather name={isLive ? "video" : "check"} size={16} color={isLive ? "#fbbf24" : "#22c55e"} />}
            <Text style={styles.infoText}>
              {isLive ? 'Show is Live! Join now.' : 'Invitation accepted. Waiting for live.'}
            </Text>
            {isLive && (
              <Pressable style={[styles.btn, styles.join]} onPress={() => onJoin(show.showId, liveStreamId)}>
                <Feather name="video" size={18} color="#000" />
                <Text style={styles.btnText}>Join Live</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isPending && !isAccepted && (
          <View style={[styles.infoBox, { backgroundColor: '#1f1f1f' }]}>
            <Feather name="clock" size={16} color="#64748b" />
            <Text style={styles.infoText}>{pastText}</Text>
          </View>
        )}
      </View>
      <View style={[styles.statusBar, { backgroundColor: st.color }]} />

    </Animatable.View>
  );
};

export default InviteCard;

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    // borderWidth: 2,
    borderRadius: 16,
    backgroundColor: colors.primaryColor,
    overflow: 'hidden',
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  statusBar: { height: 2, width: '100%' },
  main: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    margin: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f'
  },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    backgroundColor: '#1f1f1f',
    borderWidth: 2,
    borderColor: '#fbbf24'
  },
  textArea: { flex: 1, marginLeft: 16 },
  hostName: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#ffffff'
  },
  company: { 
    fontSize: 14, 
    color: '#9ca3af',
    marginTop: 2
  },
  badge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#111111'
  },
  showArea: { 
    marginHorizontal: 16, 
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f'
  },
  showTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 6,
    color: '#ffffff'
  },
  meta: { 
    fontSize: 14, 
    color: '#9ca3af',
    fontWeight: '500'
  },
  actionArea: { marginHorizontal: 16, marginBottom: 16 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  infoText: { 
    marginLeft: 12, 
    flex: 1, 
    color: '#e5e7eb',
    fontWeight: '500',
    fontSize: 14
  },
  buttonsRow: { 
    flexDirection: 'row', 
    marginTop: 12,
    gap: 12
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  accept: { 
    backgroundColor: '#fbbf24',
    borderWidth: 2,
    borderColor: '#f59e0b'
  },
  reject: { 
    backgroundColor: '#1f1f1f',
    borderWidth: 2,
    borderColor: '#ef4444'
  },
  join: { 
    backgroundColor: '#fbbf24', 
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignSelf: 'flex-start',
    paddingHorizontal: 24
  },
  btnText: { 
    color: '#000000', 
    marginLeft: 8, 
    fontWeight: '700',
    fontSize: 15
  },
});