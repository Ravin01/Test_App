// CohostSelector.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CoHostSearchModal from './CoHostSearchModal';
import { colors } from '../../../../Utils/Colors';
import { AWS_CDN_URL } from '../../../../Utils/aws';

const CohostSelector = ({
  onCoHostSelect = (_cohosts) => {},
  onClearCoHost = () => {},
  isSubmitting = false,
  isUploading = false,
  initialHasCoHost = false,
  initialCoHost = null,
}) => {
  const [hasCoHost, setHasCoHost] = useState(initialHasCoHost);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCohosts, setSelectedCohosts] = useState([]);
  const MAX_COHOSTS = 3;
  // console.log(initialCoHost)

const getProfileImage = (profileURLKey) => {
  if (!profileURLKey) return null;

  // If it's an object with a 'key' property
  if (typeof profileURLKey === 'object' && profileURLKey.key) {
    return `${AWS_CDN_URL}${profileURLKey.key}`;
  }

  // If it's a string (direct key)
  if (typeof profileURLKey === 'string') {
    return `${AWS_CDN_URL}${profileURLKey}`;
  }

  return null; // fallback
};


  const getUserInitials = (userName) =>
    (userName || '').slice(0, 2).toUpperCase() || '??';

  // sync props to state
  useEffect(() => {
    setHasCoHost(initialHasCoHost);
    if (initialCoHost) {
      const cohostArray = Array.isArray(initialCoHost)
        ? initialCoHost
        : [initialCoHost];
      setSelectedCohosts(
        cohostArray.map((c) => ({
          ...c,
          displayProfileURL: c.profileURL ? getProfileImage(c.profileURL) : null,
        }))
      );
    } else {
      setSelectedCohosts([]);
    }
  }, [initialHasCoHost, initialCoHost]);

  const handleToggle = () => {
    if (isSubmitting || isUploading) return;
    const next = !hasCoHost;
    setHasCoHost(next);
    if (next && selectedCohosts.length === 0) {
      setModalVisible(true);
    } else if (!next) {
      setSelectedCohosts([]);
      onClearCoHost();
    }
  };

  const handleSelect = (user) => {
    const exists = selectedCohosts.some((c) => c.userId === user.userId);
    
    // If already selected, remove it (toggle off)
    if (exists) {
      handleRemove(user.userId);
      return;
    }

    const newCohost = {
      ...user,
      displayProfileURL: user.profileURL ? getProfileImage(user.profileURL) : null,
    };

    const updated = [...selectedCohosts, newCohost];
    setSelectedCohosts(updated);
    onCoHostSelect(updated);
    // Don't close modal - allow selecting multiple cohosts
  };

  const handleRemove = (userId) => {
    const updated = selectedCohosts.filter((c) => c.userId !== userId);
    setSelectedCohosts(updated);
    if (updated.length === 0) {
      setHasCoHost(false);
      onClearCoHost();
    } else {
      onCoHostSelect(updated);
    }
  };

  const handleAddMore = () => {
    if (selectedCohosts.length < MAX_COHOSTS) {
      setModalVisible(true);
    }
  };

  const renderCohost = ({ item }) => (
    <View style={styles.cohostCard}>
      {/* {console.log(item)} */}
      <View style={styles.cohostInfo}>
        {item.displayProfileURL ? (
          <Image source={{ uri: item.displayProfileURL }} 
          defaultSource={{uri:`${AWS_CDN_URL}${item?.profileURL?.key}`}}
          style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{getUserInitials(item.userName)}</Text>
          </View>
        )}
        <View style={styles.checkIcon}>
          <Feather name="check" size={12} color="#fff" />
        </View>
        <View style={styles.cohostText}>
          <Text style={styles.name} numberOfLines={1}>
            {item.companyName || item.userName}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{item.userName}
          </Text>
          <View style={styles.tagRow}>
            <Text style={styles.tag}>{item.role || 'seller'}</Text>
            {item.sellerType ? (
              <Text style={[styles.tag, styles.sellerTag]}>{item.sellerType}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemove(item.userId)}
        disabled={isSubmitting || isUploading}
        style={styles.removeBtn}
      >
        <MaterialIcons name="close" size={18} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="people-outline" size={22} color="#FACC15" />
          </View>
          <View>
            <Text style={styles.title}>Co-host Settings</Text>
            <Text style={styles.subtitle}>
              Add up to {MAX_COHOSTS} co-hosts
              {selectedCohosts.length > 0
                ? ` (${selectedCohosts.length}/${MAX_COHOSTS})`
                : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleToggle}
          disabled={isSubmitting || isUploading}
          style={[
            styles.toggle,
            hasCoHost ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <View
            style={[
              styles.thumb,
              hasCoHost ? styles.thumbOn : styles.thumbOff,
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {hasCoHost && (
        <View style={styles.content}>
          {selectedCohosts.length > 0 ? (
            <>
              <FlatList
                data={selectedCohosts}
                renderItem={renderCohost}
              keyExtractor={(item, index) => item.userId?.toString() || index.toString()}
                contentContainerStyle={styles.list}
              />
              {selectedCohosts.length < MAX_COHOSTS && (
                <TouchableOpacity
                  onPress={handleAddMore}
                  disabled={isSubmitting || isUploading}
                  style={styles.addMoreBtn}
                >
                  <Feather name="user-plus" size={18} color="#FACC15" />
                  <Text style={styles.addMoreText}>
                    Add More ({MAX_COHOSTS - selectedCohosts.length} left)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.placeholder}
              onPress={() => setModalVisible(true)}
            >
              <Feather name="user-plus" size={28} color="#9CA3AF" />
              <Text style={styles.placeholderText}>
                Click toggle to select co-hosts.
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

     
    </View>
     {/* Modal */}
      <CoHostSearchModal
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectCoHost={handleSelect}
        selectedCohosts={selectedCohosts}
        maxCohosts={MAX_COHOSTS}
        isSubmitting={isSubmitting}
        isUploading={isUploading}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    backgroundColor: '#FDD1221A',
    padding: 6,
    borderRadius: 10,
    marginRight: 10,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#FACC15' },
  subtitle: { fontSize: 13, color: '#9CA3AF' },
  toggle: {
    width: 50,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: '#FACC15', alignItems: 'flex-end' },
  toggleOff: { backgroundColor: '#4B5563', alignItems: 'flex-start' },
  thumb: { width: 20, height: 20, borderRadius: 10 },
  thumbOn: { backgroundColor: colors.SecondaryColor },
  thumbOff: { backgroundColor: '#FACC15' },
  content: { marginTop: 12 },
  list: { gap: 8 },
  cohostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  cohostInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24,backgroundColor:'#555' },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#FACC15', fontSize: 14, fontWeight: '600' },
  checkIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 2,
  },
  cohostText: { marginLeft: 10, flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#fff' },
  username: { fontSize: 13, color: '#FACC15' },
  tagRow: { flexDirection: 'row', marginTop: 4 },
  tag: {
    backgroundColor: '#374151',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    fontSize: 11,
  },
  sellerTag: { backgroundColor: '#FACC1533', color: '#FACC15' },
  removeBtn: { padding: 6, marginLeft: 8 },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginTop: 8,
  },
  addMoreText: { marginLeft: 6, color: '#FACC15', fontWeight: '500' },
  placeholder: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: { marginTop: 8, color: '#9CA3AF', textAlign: 'center' },
});

export default CohostSelector;




// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Switch,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import CoHostSearchModal from './CoHostSearchModal';
// import { colors } from '../../../../Utils/Colors';
// import ToggleSwitch from 'toggle-switch-react-native';
// import { AWS_CDN_URL } from '../../../../Utils/aws';

// const CohostSelector = ({
//   onCoHostSelect = () => {},
//   onClearCoHost = () => {},
//   isSubmitting = false,
//   isUploading = false,
//   initialHasCoHost = false,
//   initialCoHost = null,
// }) => {
//   const [hasCoHost, setHasCoHost] = useState(initialHasCoHost);
//   const [selectedCoHost, setSelectedCoHost] = useState(initialCoHost);
//   const [modalVisible, setModalVisible] = useState(false);

//   useEffect(() => {
//     setHasCoHost(initialHasCoHost);
//     if (initialCoHost) {
//       setSelectedCoHost({
//         ...initialCoHost,
//         displayProfileURL: initialCoHost.profileURL
//           ? `${AWS_CDN_URL}${initialCoHost.profileURL}`
//           : null,
//       });
//     } else {
//       setSelectedCoHost(null);
//     }
//   }, [initialHasCoHost, initialCoHost, AWS_CDN_URL]);

//   const getInitials = name =>
//     (name ? name.slice(0, 2).toUpperCase() : '??');

//   const handleToggle = value => {
//     if (isSubmitting || isUploading) return;
//     setHasCoHost(value);
//     if (!value) {
//       setSelectedCoHost(null);
//       onClearCoHost();
//     } else {
//       setModalVisible(true);
//     }
//   };

//   const handleSelect = user => {
//     const coHost = {
//       ...user,
//       displayProfileURL: user.displayProfileURL,
//     };
//     setSelectedCoHost(coHost);
//     onCoHostSelect(coHost);
//     setModalVisible(false);
//   };

//   const clearSelection = () => {
//     setSelectedCoHost(null);
//     onClearCoHost();
//   };

//   return (
//     <>
//     <View style={styles.container}>
//       <View style={styles.card}>
//         {/* Header */}
//         <View style={styles.header}>
//           <View style={styles.headerLeft}>
//             <View style={styles.iconCircle}>
//               <Ionicons name="people-outline" size={24} color='#fcd34d' />
//             </View>
//             <View>
//               <Text style={styles.title}>Co‑host Settings</Text>
//               <Text style={styles.subtitle}>
//                 Add a collaborator to your show
//               </Text>
//             </View>
//           </View>
//           <View style={styles.headerRight}>
//            {/* <Text style={styles.status}>
//               {hasCoHost ? 'Enabled' : 'Disabled'}
//             </Text>  */}
//             <ToggleSwitch
//               isOn={hasCoHost}
//               onToggle={handleToggle}
//               disabled={isSubmitting || isUploading}
//               trackOffStyle={{color:'gray'}} 

//               trackOnStyle={{backgroundColor:'#F3F4F6'}}

//               // isoncolo={{ false: 'gray', true: '#FACC15' }}
//               circleColor={hasCoHost ? '#D97706' : '#F3F4F6'}
//               // thumbColor=
//             />
//           </View>
//         </View>

//         {/* Co-host Content */}
//         {hasCoHost && (
//           <View style={styles.content}>
//             {selectedCoHost ? (
//               <View style={styles.selectedRow}>
//                 <View style={styles.selectedLeft}>
//                   {selectedCoHost.displayProfileURL ? (
//                     <Image
//                       source={{ uri: selectedCoHost.displayProfileURL }}
//                       style={styles.avatar}
//                     />
//                   ) : (
//                     <View style={styles.avatarFallback}>
//                       <Text style={styles.initials}>
//                         {getInitials(selectedCoHost.userName)}
//                       </Text>
//                     </View>
//                   )}
//                   <Ionicons
//                     name="checkmark-circle"
//                     size={20}
//                     color="#10B981"
//                     style={styles.checkIcon}
//                   />
//                 </View>
//                 <View style={styles.selectedInfo}>
//                   <Text style={styles.selectedName}>
//                     {selectedCoHost.companyName || selectedCoHost.userName}
//                   </Text>
//                   <Text style={styles.selectedUsername}>
//                     @{selectedCoHost.userName}
//                   </Text>
//                   <View style={styles.tagRow}>
//                     <Text style={styles.tag}>{selectedCoHost.role}</Text>
//                     {selectedCoHost.sellerType && (
//                       <Text style={styles.tag}>
//                         {selectedCoHost.sellerType}
//                       </Text>
//                     )}
//                   </View>
//                 </View>
//                 <TouchableOpacity
//                   onPress={clearSelection}
//                   disabled={isSubmitting || isUploading}
//                   style={styles.clearBtn}
//                 >
//                   <MaterialIcons name="close" size={20} color="#DC2626" />
//                 </TouchableOpacity>
//               </View>
//             ) : (
//               <TouchableOpacity
//                 style={styles.placeholder}
//                 onPress={() => setModalVisible(true)}
//               >
//                 <Ionicons name="person-add-outline" size={32} color='#fcd34d' />
//                 <Text style={styles.placeholderText}>
//                   Tap toggle or here to add a co‑host.
//                 </Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}
//       </View>

//     </View>
    
//       <CoHostSearchModal
//         isOpen={modalVisible}
//         onClose={() => setModalVisible(false)}
//         onSelectCoHost={handleSelect}
//         isSubmitting={isSubmitting}
//         isUploading={isUploading}
//       />
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   container: { width: '100%', alignItems: 'center',marginBottom: 10 },
//   card: {
//     width: '100%',
//    backgroundColor:colors.SecondaryColor,
//     borderRadius: 16,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 5,
//     elevation: 2,
//     marginVertical: 8,
//   },
//   header: { flexDirection: 'row', justifyContent: 'space-between' },
//   headerLeft: { flexDirection: 'row', alignItems: 'center' },
//   iconCircle: {
//    backgroundColor:'#FDD1221A',
//     padding: 8,
//     borderRadius: 12,
//     marginRight: 12,
//   },
//   title: { fontSize: 18, fontWeight: '600', color: '#D97706' },
//   subtitle: { fontSize: 14, color: '#6B7280' },
//   headerRight: { flexDirection: 'row', alignItems: 'center' },
//   status: { marginRight: 8, fontSize: 14, color: '#374151' },
//   content: { marginTop: 12 },
//   selectedRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor:'#FDD1221A',
//    // backgroundColor: '#FEEBC8',
//     borderRadius: 12,
//     padding: 12,
//   },
//   selectedLeft: { position: 'relative' },
//   avatar: { width: 56, height: 56, borderRadius: 28 },
//   avatarFallback: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     backgroundColor: '#4B5563',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   initials: { color: '#F59E0B', fontSize: 18, fontWeight: '600' },
//   checkIcon: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFFFFF', borderRadius: 10 },
//   selectedInfo: { flex: 1, marginLeft: 12 },
//   selectedName: { fontSize: 16, fontWeight: '600', color: '#fff' },
//   selectedUsername: { fontSize: 14, color: '#D97706', marginVertical: 2 },
//   tagRow: { flexDirection: 'row', marginTop: 4 },
//   tag: {
//     backgroundColor: '#1F2937',
//     color: '#FFFFFF',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     marginRight: 6,
//     fontSize: 12,
//   },
//   clearBtn: {
//     padding: 6,
//     marginLeft: 8,
//   },
//   placeholder: {
//     backgroundColor:'#FDD1221A',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   placeholderText: {
//     marginTop: 8,
//     color: '#fcd34d',
//     textAlign: 'center',
//   },
// });

// export default CohostSelector;
