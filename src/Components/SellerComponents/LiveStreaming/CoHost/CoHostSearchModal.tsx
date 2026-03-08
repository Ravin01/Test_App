// // CoHostSearchModal.js

// CoHostSearchModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import api from '../../../../Utils/Api';
import { colors } from '../../../../Utils/Colors';
import { AWS_CDN_URL } from '../../../../Utils/aws';

const CoHostSearchModal = ({
  isOpen,
  onClose,
  onSelectCoHost,
  selectedCohosts = [],
  maxCohosts = 3,
  isSubmitting,
  isUploading,
}) => {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const debouncedSearchText = useDebounce(searchText, 500);

  function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
  }

  const getProfileImage = (profileURLKey) =>
    profileURLKey ? `${AWS_CDN_URL}${profileURLKey}` : null;

  const getUserInitials = (userName) =>
    (userName || '').slice(0, 2).toUpperCase() || '??';

  const isUserSelected = (userId) =>
    selectedCohosts.some((c) => c.userId === userId);

  const canAddMore = selectedCohosts.length < maxCohosts;

  useEffect(() => {
    if (!debouncedSearchText || debouncedSearchText.length < 3) {
      setUsers([]);
      if (error) setError(null);
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get('/cohost/users', {
          params: { search: debouncedSearchText },
        });
        const receivedData = response.data?.data || [];
        setUsers(
          receivedData.map((user) => ({
            ...user,
            _id: user.userId,
            displayProfileURL: user.profileURL
              ? getProfileImage(user.profileURL)
              : null,
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to search for users.');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedSearchText, error]);

  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
      setUsers([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSelect = (user) => {
    // Allow deselection by clicking on selected users
    // The parent component (CohostSelector) handles the toggle logic
    onSelectCoHost({
      userId: user.userId,
      userName: user.userName,
      role: user.role,
      profileURL: user.profileURL,
      companyName: user.companyName,
      sellerType: user.sellerType,
    });
  };

  const renderUserItem = ({ item }) => {
    const selected = isUserSelected(item.userId);
    const disabled = !canAddMore && !selected;

    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          selected && styles.selectedCard,
          disabled && styles.disabledCard,
        ]}
        onPress={() => handleSelect(item)}
        disabled={disabled}
      >
        {item.displayProfileURL ? (
          <Image source={{ uri: item.displayProfileURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{getUserInitials(item.userName)}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text
            style={[styles.name, selected && styles.selectedText]}
            numberOfLines={1}
          >
            {item.companyName || item.userName}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{item.userName}
          </Text>
          <View style={styles.tags}>
            <Text style={styles.role}>{item.role}</Text>
            {item.sellerType && (
              <Text style={styles.sellerType}>{item.sellerType}</Text>
            )}
          </View>
        </View>

        {selected && (
          <View style={styles.checkIcon}>
            <Feather name="check" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Select Co-hosts</Text>
                <Text style={styles.subTitle}>
                  Selected: {selectedCohosts.length}/{maxCohosts}{' '}
                  {!canAddMore && '(Maximum reached)'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#888"
                style={{ marginHorizontal: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username or company..."
                placeholderTextColor="#aaa"
                value={searchText}
                onChangeText={setSearchText}
                editable={!isSubmitting && !isUploading}
              />
              {isLoading && (
                <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 8 }} />
              )}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Results */}
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color="#FACC15"
                style={{ marginTop: 20 }}
              />
            ) : users.length > 0 ? (
              <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                renderItem={renderUserItem}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color="#666"
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.emptyText}>
                  {debouncedSearchText.length < 3
                    ? 'Enter at least 3 characters'
                    : 'No users found. Try another search.'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FACC15' },
  subTitle: { fontSize: 13, color: '#9CA3AF' },
  closeBtn: {
    backgroundColor: '#FACC15',
    padding: 6,
    borderRadius: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', padding: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: { marginLeft: 6, color: '#DC2626', fontSize: 13 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 10,
    backgroundColor: '#1F2937',
  },
  selectedCard: { borderColor: '#10B981', backgroundColor: '#064E3B' },
  disabledCard: { opacity: 0.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initials: { color: '#FACC15', fontWeight: '600', fontSize: 14 },
  info: { flex: 1 },
  name: { fontWeight: '600', fontSize: 15, color: '#fff' },
  selectedText: { color: '#34D399' },
  username: { fontSize: 13, color: '#9CA3AF' },
  tags: { flexDirection: 'row', marginTop: 4 },
  role: {
    backgroundColor: '#374151',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    fontSize: 11,
  },
  sellerType: {
    backgroundColor: '#FACC1533',
    color: '#FACC15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 11,
  },
  checkIcon: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 3,
  },
  list: { paddingVertical: 8 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 8, color: '#9CA3AF', fontSize: 14 },
});

export default CoHostSearchModal;



// import React, { useEffect, useState, useRef } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TextInput,
//   FlatList,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   StyleSheet,
//   Keyboard,
//   TouchableWithoutFeedback,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import api from '../../../../Utils/Api';
// import { colors } from '../../../../Utils/Colors';
// import SearchComponent from '../../../GloabalSearch/SearchComponent';
// import { AWS_CDN_URL } from '../../../../Utils/aws';

// const CoHostSearchModal = ({
//   isOpen,
//   onClose,
//   onSelectCoHost,
//   isSubmitting,
//   isUploading,
// }) => {
//   const [searchText, setSearchText] = useState('');
//   const [users, setUsers] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const debouncedSearchText = useDebounce(searchText, 500);
//   const textInputRef = useRef(null);

//   function useDebounce(value, delay) {
//     const [debouncedValue, setDebouncedValue] = useState(value);

//     useEffect(() => {
//       const handler = setTimeout(() => {
//         setDebouncedValue(value);
//       }, delay);

//       return () => {
//         clearTimeout(handler);
//       };
//     }, [value, delay]);

//     return debouncedValue;
//   }

//   useEffect(() => {
//     if (!debouncedSearchText || debouncedSearchText.length < 3) {
//       setUsers([]);
//       if (error && debouncedSearchText.length < 3) setError(null);
//       return;
//     }

//     const fetchUsers = async () => {
//       setIsLoading(true);
//       setError(null);
//       try {
//         const response = await api.get('/cohost/users', {
//           params: { search: debouncedSearchText },
//         });
//         const receivedData = response.data?.data || [];
//         setUsers(
//           receivedData.map(user => ({
//             ...user,
//             _id: user.userId,
//             displayProfileURL: user?.profileURL
//               ? `${AWS_CDN_URL}${user.profileURL}`
//               : null,
//           })),
//         );
//       } catch (err) {
//         setError(err.response?.data?.message || 'Failed to search for users.');
//         setUsers([]);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchUsers();
//   }, [debouncedSearchText]);

//   useEffect(() => {
//     if (!isOpen) {
//       setSearchText('');
//       setUsers([]);
//       setIsLoading(false);
//       setError(null);
//     }
//   }, [isOpen]);

//   const getUserInitials = name => (name ? name.slice(0, 2) : '').toUpperCase() || '??';

//   const handleSelect = user => {
//     onSelectCoHost({
//       userId: user.userId,
//       userName: user.userName,
//       role: user.role,
//       profileURL: user.profileURL,
//       companyName: user.companyName,
//       sellerType: user.sellerType,
//     });
//     onClose();
//   };

//   const renderUserItem = ({ item }) => (
//     <TouchableOpacity style={styles.userCard} onPress={() => handleSelect(item)}>
//       {item.displayProfileURL ? (
//         <Image source={{ uri: item.displayProfileURL }} style={styles.avatar} onError={(e)=>console.log(e.nativeEvent.error)} />
//       ) : (
//         <View style={styles.avatarFallback}>
//           <Text style={styles.initials}>{getUserInitials(item.userName)}</Text>
//         </View>
//       )}
//       {/* {console.log(item)} */}
//       <View style={styles.info}>
//         <Text style={styles.name}>{item.companyName || item.userName}</Text>
//         <Text style={styles.username}>@{item.userName}</Text>
//         <View style={styles.tags}>
//           <Text style={styles.role}>{item.role}</Text>
//           {item.sellerType && <Text style={styles.sellerType}>{item.sellerType}</Text>}
//         </View>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <Modal 
//       visible={isOpen} 
//       animationType="slide" 
//       transparent
//       onRequestClose={onClose}
//       statusBarTranslucent={true}
//     >
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={styles.keyboardAvoidingView}
//         enabled={true}
//       >
//         <View style={styles.overlay}>
//           <View style={styles.modal}>
//                 <View style={styles.header}>
//                   <Text style={styles.headerTitle}>Select a Co‑host</Text>
//                   <TouchableOpacity onPress={onClose}>
//                     <MaterialIcons name="close" size={24} color="#ccc" />
//                   </TouchableOpacity>
//                 </View>
//                 {/* <View style={styles.searchContainer}>
//                <SearchComponent searchTerm={searchText} setSearchTerm={setSearchText} /> 
//               </View> */}
//                <View style={{marginTop:15}}>
//                <SearchComponent searchTerm={searchText} setSearchTerm={setSearchText} /> 
//                </View>
//                 {/* <View style={styles.searchContainer}>
//                   <Ionicons name="search-outline" size={20} color="#777" style={styles.searchIcon} />
//                   <TextInput
//                     ref={textInputRef}
//                     style={styles.searchInput}
//                     placeholder="Search by username or company..."
//                     value={searchText}
//                     placeholderTextColor='#aaa'
//                     onChangeText={setSearchText}
//                     editable={!isSubmitting && !isUploading}
//                     autoCorrect={false}
//                     autoCapitalize="none"
//                     returnKeyType="search"
//                     blurOnSubmit={false}
//                     keyboardType="default"
//                     multiline={false}
//                     numberOfLines={1}
//                     textContentType="none"
//                     autoFocus={false}
//                   />
//                 </View> */}

//                 {error && (
//                   <View style={styles.errorBox}>
//                     <Ionicons name="alert-circle" size={20} color="#b00020" />
//                     <Text style={styles.errorText}>{error}</Text>
//                   </View>
//                 )}

//                 {isLoading ? (
//                   <ActivityIndicator size="large" color="#FFC107" style={{ marginTop: 20 }} />
//                 ) : users.length > 0 ? (
//                   <FlatList
//                     data={users}
//                     keyExtractor={item => item._id}
//                     renderItem={renderUserItem}
//                     contentContainerStyle={styles.list}
//                     keyboardShouldPersistTaps="handled"
//                     showsVerticalScrollIndicator={false}
//                   />
//                 ) : (
//                   <View style={styles.emptyState}>
//                     <Ionicons name="people-outline" size={48} color="#999" />
//                     <Text style={styles.emptyText}>
//                       {debouncedSearchText.length < 3
//                         ? 'Enter at least 3 characters'
//                         : 'No users found. Try a different search.'}
//                     </Text>
//                   </View>
//                 )}
//           </View>
//         </View>
//       </KeyboardAvoidingView>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   keyboardAvoidingView: {
//     flex: 1,
//   },
//   overlay: {
//     flex: 1,
//     backgroundColor: '#000000aa',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   modal: {
//     backgroundColor: colors.SecondaryColor,
//     borderRadius: 20,
//     padding: 20,
//     maxHeight: '90%',
//     borderWidth: 1,
//     borderColor: '#333'
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#FFC107',
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.SecondaryColor,
//     borderRadius: 10,
//     marginTop: 15,
//     // borderWidth: 1,
//     // borderColor: '#333'
//   },
//   searchIcon: {
//     marginHorizontal: 10,
//   },
//   searchInput: {
//     flex: 1,
//     padding: 10,
//     // backgroundColor: '#333',
//     color: '#ddd'
//   },
//   errorBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 10,
//     padding: 10,
//     backgroundColor: '#fdecea',
//     borderRadius: 10,
//   },
//   errorText: {
//     marginLeft: 5,
//     color: '#b00020',
//   },
//   userCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     borderBottomColor: '#333',
//     borderBottomWidth: 1,
//   },
//   avatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     marginRight: 12,
//   },
//   avatarFallback: {
//     width: 48,
//     height: 48,
//     borderRadius: 24,
//     backgroundColor: '#333',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   initials: {
//     color: '#FFC107',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   info: {
//     flex: 1,
//   },
//   name: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     color: '#fff'
//   },
//   username: {
//     color: '#888',
//   },
//   tags: {
//     flexDirection: 'row',
//     marginTop: 4,
//   },
//   role: {
//     backgroundColor: '#eee',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     marginRight: 5,
//     fontSize: 12,
//     color: '#444',
//   },
//   sellerType: {
//     backgroundColor: '#d0e8ff',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 10,
//     fontSize: 12,
//     color: '#0366d6',
//   },
//   list: {
//     marginTop: 10,
//   },
//   emptyState: {
//     alignItems: 'center',
//     marginTop: 40,
//   },
//   emptyText: {
//     marginTop: 10,
//     color: '#666',
//     fontSize: 14,
//     textAlign: 'center',
//   },
// });

// export default CoHostSearchModal;
