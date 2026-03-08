// // InviteBottomSheet.js
// InviteBottomSheet.js
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ToastAndroid, 
  Dimensions
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from '../../../../Utils/Api';
import { AWS_CDN_URL } from "../../../../Utils/aws";
import { useFollowApi } from "../../../../Utils/FollowersApi";
import { Toast } from "../../../../Utils/dateUtils";

import { colors } from '../../../../Utils/Colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
const {width, height} = Dimensions.get('window');

const MAX_COHOSTS = 3;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}


const InviteBottomSheet = ({ isOpen, setIsOpen, showId, onInvite }) => {
  const refRBSheet = useRef();

  const [searchText, setSearchText] = useState("");
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCohosts, setActiveCohosts] = useState([]); // ✅ multiple
    const [selectedUsers, setSelectedUsers] = useState([]); // ✅ track selections
    const debouncedSearchText = useDebounce(searchText, 500);
  
    const getProfileImage = (profileURLKey) =>
      profileURLKey ? `${AWS_CDN_URL}${profileURLKey}` : null;
  
    // ✅ Fetch active cohosts (multiple)
    const fetchActiveInvites = useCallback(async () => {
      console.log("Fetching active co-hosts for showId:", showId);
      if (!showId) return;
      try {
        const response = await axiosInstance.get(`cohost/invited/${showId}`);
        const receivedData = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const filtered = receivedData.filter((invite) =>
          ["pending", "accepted"].includes(invite.status)
        );
        setActiveCohosts(filtered);
      } catch (err) {
        console.log("Error fetching active co-hosts:", err.response.data);
        setActiveCohosts([]);
      }
    }, [showId]);
  
    useEffect(() => {
      fetchActiveInvites();
    }, [fetchActiveInvites]);
  
    // ✅ Search users excluding already invited
    useEffect(() => {
      const fetchUsers = async () => {
        if (!debouncedSearchText) {
          setUsers([]);
          return;
        }
  
        try {
          setIsLoading(true);
          const response = await axiosInstance.get("cohost/users", {
            params: { search: debouncedSearchText },
          });
          const receivedData = response.data?.data || [];
          const activeIds = activeCohosts.map((c) => c.cohost.userId);
          const filtered = receivedData.filter(
            (u) => !activeIds.includes(u.userId)
          );
          setUsers(filtered);
        } catch (error) {
          console.error("Error fetching users:", error);
          setUsers([]);
        } finally {
          setIsLoading(false);
        }
      };
  
      fetchUsers();
    }, [debouncedSearchText, activeCohosts]);
  
    // ✅ Toggle selection with limit check
    const toggleUserSelection = (user) => {
      const isSelected = selectedUsers.some((u) => u.userId === user.userId);
      if (isSelected) {
        setSelectedUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      } else {
        const total = activeCohosts.length + selectedUsers.length + 1;
        if (total > MAX_COHOSTS) {
          ToastAndroid.show(
            `Max ${MAX_COHOSTS} cohosts allowed (currently ${activeCohosts.length} active, ${selectedUsers.length} selected)`,
            ToastAndroid.SHORT
          );
          return;
        }
        setSelectedUsers((prev) => [...prev, user]);
      }
    };
  
    // ✅ Batch invite
    const handleInviteMultiple = async () => {
      if (selectedUsers.length === 0) {
        ToastAndroid.show("Select at least one cohost", ToastAndroid.SHORT);
        return;
      }
      const total = activeCohosts.length + selectedUsers.length;
      if (total > MAX_COHOSTS) {
        ToastAndroid.show("Cohost limit exceeded", ToastAndroid.SHORT);
        return;
      }
  
      try {
        const ids = selectedUsers.map((u) => u.userId);
        console.log("Inviting users:", ids);
        await onInvite(ids);
        setSelectedUsers([]);
        setSearchText("");
        await fetchActiveInvites();
        ToastAndroid.show("Invites sent successfully!", ToastAndroid.SHORT);
      } catch (err) {
        console.error("Error inviting:", err);
        ToastAndroid.show("Failed to send invites", ToastAndroid.SHORT);
      }
    };
  
    // ✅ Cancel/remove
const handleRemoveOrCancel = async (invite) => {
  if (!invite) return;

  const isPending = invite.status === "pending";
  const actionText = isPending ? "Cancelling" : "Removing";

  try {
    if (isPending) {
      // For cancel: pass cohostUserId in body
      await axiosInstance.patch(`cohost/cancel/${invite.inviteId}/${invite.cohost.userId}`, {
        cohostUserId: invite.cohost.userId,
      });
    } else {
      // For remove: cohostUserId goes in the URL
      await axiosInstance.patch(
        `cohost/remove/${invite.inviteId}/${invite.cohost.userId}`
      );
    }

    ToastAndroid.show(
      `Co-host ${isPending ? "cancelled" : "removed"} successfully!`,
      ToastAndroid.SHORT
    );

    // Refresh the list
    await fetchActiveInvites();
  } catch (error) {
    const msg = error.response?.data?.message || "Error occurred";
    console.error(`Error ${actionText.toLowerCase()} co-host:`, error);
    ToastAndroid.show(`Failed: ${msg}`, ToastAndroid.LONG);
  }
};

  
    const getUserInitials = (name) =>
      (name || "??").slice(0, 2).toUpperCase();
  
    const remainingSlots = MAX_COHOSTS - activeCohosts.length;
  
  // --- OPEN / CLOSE ---
  useEffect(() => {
    if (isOpen) {
      
      refRBSheet.current.open();
    } else {
      refRBSheet.current.close();
    }
  }, [isOpen]);

  return (
    <RBSheet
      ref={refRBSheet}
     // height={600}
    height={height * 0.8}
     openDuration={250}
    closeOnPressBack
      draggable={true}
      onClose={() => setIsOpen(false)}
      customStyles={{
        container: {
          backgroundColor: "#121212",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16,
        },
        draggableIcon: {
          backgroundColor: "#ddd",
          width: 60,
          height: 3,
        },
      }}
    >
      <Text style={styles.title}>Invite Co-host</Text>
      <View style={styles.container}>
        {/* ✅ Active cohosts list */}
        {/* {console.log('Active cohosts:', activeCohosts)} */}
        {activeCohosts.length > 0 && (
          <View style={styles.activeList}>
            <Text style={styles.sectionTitle}>
              Active Co-hosts ({activeCohosts.length}/{MAX_COHOSTS})
            </Text>
            {activeCohosts.map((invite, index) => (
              <View key={`${invite?.inviteId}-${index}`} style={styles.activeCard}>
                <View style={styles.userInfo}>
                  {getProfileImage(invite.cohost.profileURL) ? (
                    <Image
                      source={{ uri: getProfileImage(invite.cohost.profileURL) }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getUserInitials(invite.cohost.userName)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    {console.log('Invite:', invite)}
                    <Text style={styles.userName}>
                      {invite.cohost.userName}{" "}
                      <Text style={styles.statusTag}>{invite.status}</Text>
                    </Text>
                    <Text style={styles.userSub}>
                      {invite.cohost.companyName || "No company"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveOrCancel(invite)}
                >
                  <Text style={styles.removeButtonText}>
                    {invite.status === "pending" ? "Cancel" : "Remove"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ✅ Selected users list */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedList}>
            <Text style={styles.sectionTitle}>
              Selected ({selectedUsers.length}) •{" "}
              {remainingSlots - selectedUsers.length} slots left
            </Text>
            {selectedUsers.map((user) => (
              <View key={user.userId} style={styles.selectedCard}>
                <Text style={styles.userName}>{user.userName}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedUsers((prev) =>
                      prev.filter((u) => u.userId !== user.userId)
                    )
                  }
                >
                  <Text style={{ color: "red" }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInviteMultiple}
            >
              <Text style={styles.inviteButtonText}>
                Send Invites ({selectedUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ✅ Search */}
        <TextInput
          style={styles.input}
          placeholder={
            remainingSlots <= 0
              ? "Max cohosts reached"
              : `Search co-hosts... (${remainingSlots} slots)`
          }
          value={searchText}
          onChangeText={setSearchText}
          editable={remainingSlots > 0}
          placeholderTextColor="#aaa"
        />
        {isLoading && <ActivityIndicator size="small" color="#FFD700" />}

        {/* ✅ User results */}
        {remainingSlots > 0 && (
          <FlatList
            nestedScrollEnabled
            data={users}
            keyExtractor={(item) => item.userId.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedUsers.some(
                (u) => u.userId === item.userId
              );
              return (
                <View style={styles.userCard}>
                  <View style={styles.userInfo}>
                    {getProfileImage(item.profileURL) ? (
                      <Image
                        source={{ uri: getProfileImage(item.profileURL) }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {getUserInitials(item.userName)}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>
                        {item.companyName || item.userName}
                      </Text>
                      <Text style={styles.userSub}>
                        @{item.userName}{" "}
                        {item.sellerType ? `(${item.sellerType})` : ""}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.inviteButton,
                      isSelected && { backgroundColor: "red" },
                    ]}
                    onPress={() => toggleUserSelection(item)}
                  >
                    <Text style={styles.inviteButtonText}>
                      {isSelected ? "Remove" : "Select"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={() =>
              debouncedSearchText ? (
                <Text style={styles.emptyText}>
                  No users found for "{debouncedSearchText}"
                </Text>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#999" />
                  <Text style={styles.emptyText}>
                    Start typing to search for co-hosts
                  </Text>
                  <Text style={styles.emptyText}>
                    ({remainingSlots} slots available)
                  </Text>
                </View>
              )
            }
          />
        )}
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 18, fontWeight: "600", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFD700",
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
    marginRight: 10,
  },
  avatarText: { fontSize: 15, color: "#FFD700", fontWeight: "600" },
  name: { color: "#fff", fontSize: 16, fontWeight: "500" },
  subText: { color: "#aaa", fontSize: 12 },
  badge: { width: 16, height: 16, marginLeft: 6, marginRight: 12 },
  inviteBtn: {
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: "auto",
  },
  inviteText: { color: "#fff", fontSize: 14 },
  activeCard: {
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginBottom: 12,
  },
  removeBtn: {
    backgroundColor: "#e11d48",
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  removeBtnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  statusTag: {
    backgroundColor: "#333",
    color: "#ccc",
    fontSize: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    padding: 10,
    color: "#fff",
    backgroundColor: "#222",
    marginBottom: 12,
  },
  noMoreText: { textAlign: "center", color: "gray", padding: 16 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#fff", fontSize: 14, marginTop: 6 },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },


  /** ========== INPUT ========== */
  input: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    backgroundColor: "#222",
    marginBottom: 12,
  },

  container: {
   // backgroundColor: colors.SecondaryColor,
   // borderRadius: 20,
    padding: 6,
    flex: 1,           // Crusial change to make Flatlist scroll work
  },

  /** ========== ACTIVE COHOSTS ========== */
  activeList: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "600",
    marginBottom: 8,
  },
  activeCard: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginBottom: 12,
    flexDirection:'row'
  },

  /** ========== USERS (SEARCH RESULTS) ========== */
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFD700", fontWeight: "bold" },
  userName: { color: "#fff", fontWeight: "bold" },
  userSub: { color: "#aaa", fontSize: 12 },
  statusTag: {
    backgroundColor: "#444",
    color: "#ccc",
    fontSize: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
  },

  /** ========== BUTTONS ========== */
  inviteButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  inviteButtonText: { color: "#000", fontWeight: "bold" },
  removeButton: {
    backgroundColor: "#e11d48",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
   // width: 80,
  //  alignItems: "center",
  },
  removeButtonText: { color: "#fff"},

  /** ========== SELECTED USERS LIST ========== */
  selectedList: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginBottom: 16,
  },
  selectedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },

  /** ========== EMPTY STATE ========== */
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },

});

export default InviteBottomSheet;


















// import React, {useRef, useState, useEffect, useCallback} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   FlatList,
//   StyleSheet,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import RBSheet from 'react-native-raw-bottom-sheet';
// import {useFollowApi} from '../../../../Utils/FollowersApi';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { AWS_CDN_URL } from '../../../../Utils/aws';

// const InviteBottomSheet = ({isOpen, setIsOpen}) => {
//   const refRBSheet = useRef();
//   const {getFollowers} = useFollowApi();

//   const [followers, setFollowers] = useState([]);
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const loadedIds = useRef(new Set());

//   // console.log('Current followers:', followers); // For debugging

//   const fetchFollowers = useCallback(async () => {
//     const userId = (await AsyncStorage.getItem('userId')) || '';
//     // console.log('Fetching followers for userId:', userId, 'page:', page); // Debugging

//     // If there's no more data or we're already loading, prevent duplicate calls
//     if (!hasMore || loading) {
//       console.log('Skipping fetch: hasMore', hasMore, 'loading', loading);
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await getFollowers(userId, searchTerm, page);
//       const newFollowers = response?.data?.followers || [];
//       // console.log('API Response newFollowers count:', newFollowers.length); // Debugging

//       const uniqueNewFollowers = newFollowers.filter(
//         user => !loadedIds.current.has(user.userId),
//       );

//       if (uniqueNewFollowers.length > 0) {
//         uniqueNewFollowers.forEach(user => loadedIds.current.add(user.userId));
//         setFollowers(prev => [...prev, ...uniqueNewFollowers]);
//         // console.log('Total followers after adding:', [...followers, ...uniqueNewFollowers].length); // Debugging
//       } else {
//         console.log('No unique new followers to add.'); // Debugging
//       }

//       // If the number of new followers is less than the page size (20), it means no more data
//       setHasMore(newFollowers.length === 20);
//     } catch (error) {
//       console.log('Failed to load followers:', error); // Use console.error for errors
//     } finally {
//       setLoading(false);
//       console.log('Loading set to false.'); // Debugging
//     }
//   }, [page, hasMore, loading, getFollowers, searchTerm]); // Added page to dependencies for clarity

//   const handleScroll = useCallback(() => {
//     // Only increment page if there's more data to load and not currently loading
//     if (hasMore && !loading) {
//       // console.log('Scrolling to end, incrementing page.'); // Debugging
//       setPage(prev => prev + 1);
//     } else {
//       // console.log('Scroll end triggered but no more data or already loading.'); // Debugging
//     }
//   }, [hasMore, loading]);

//   // Effect to fetch followers when page changes
//   useEffect(() => {
//     // console.log('Page changed to:', page, ' - initiating fetchFollowers.'); // Debugging
//     fetchFollowers();
//   }, [page, fetchFollowers]); // Depend on fetchFollowers to ensure it's up-to-date

//   const openBottomSheet = async () => {
//     // console.log('Opening bottom sheet...');
//     // Reset all state variables for a fresh load
//     setPage(1);
//     setFollowers([]);
//     loadedIds.current.clear();
//     setHasMore(true);
//     setLoading(false); // Explicitly set loading to false to ensure it's not stuck
//     refRBSheet.current.open();
//     // The useEffect for `page` will  handle the initial fetch for page 1
//   };
//   useEffect(() => {
//     if (!isOpen) loadedIds.current.clear();
//     else openBottomSheet()
//   }, [isOpen]);

//   const renderItem = ({item}) => (
//     <View style={styles.row}>
//       {item?.profileURL ? (
//         <Image
//           source={
//             item.profileURL
//               ? {uri: `${AWS_CDN_URL}${item.profileURL}`}
//               : require('../../../../assets/images/logo.png') // fallback
//           }
//           style={styles.avatar}
//         />
//       ) : (
//         <TouchableOpacity style={styles.avatar1}>
//           <Text
//             style={{
//               fontSize: 15,
//               textTransform: 'capitalize',
//               color: '#e4b640',
//               fontWeight: '500',
//             }}>
//             {item?.userName?.charAt(0) || ''}
//             {item?.userName?.charAt(1) || ''}
//           </Text>
//         </TouchableOpacity>
//       )}
//       <Text style={styles.name}>{item.userName}</Text>
//       {item.isVerified && (
//         <Image
//           source={require('../../../../assets/images/verifiedUserSuccess.png')}
//           style={styles.badge}
//         />
//       )}
//       <TouchableOpacity style={styles.inviteBtn}>
//         <Text style={styles.inviteText}>Send invite</Text>
//       </TouchableOpacity>
//     </View>
//   );

//   return (
//     <>
//       {/* <TouchableOpacity onPress={openBottomSheet}>
//         <Text style={{color: '#ddd'}}>Open Invite BottomSheet</Text>
//       </TouchableOpacity> */}

//       <RBSheet
//         ref={refRBSheet}
//         height={400}
//         openDuration={250}
//         closeOnDragDown={true}
//         draggable={true}
//         onClose={()=>setIsOpen(false)}
//         customStyles={{
//           container: {
//             backgroundColor: '#121212',
//             borderTopLeftRadius: 20,
//             borderTopRightRadius: 20,
//             padding: 20,
//             paddingTop: 8,
//           },
//           draggableIcon: {
//             backgroundColor: '#ddd',
//             width: 60,
//             height: 3,
//             marginTop: 0,
//           },
//         }}>
//         <Text style={styles.title}>Send invite</Text>

//         {loading && followers.length === 0 && (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="small" color="#FFD700" />
//             <Text style={styles.loadingText}>Loading...</Text>
//           </View>
//         )}

//         <FlatList
//           data={followers}
//           onEndReached={handleScroll}
//           onEndReachedThreshold={0.5}
//           showsVerticalScrollIndicator={false}
//           keyExtractor={item => item.userId?.toString()}
//           renderItem={renderItem}
//           ListEmptyComponent={
//             !loading && followers.length === 0 && !hasMore ? (
//               <Text style={styles.noMoreText}>No followers found</Text>
//             ) : null
//           }
//           ListFooterComponent={() =>
//             loading && followers.length > 0 ? (
//               <View style={styles.loadingFooter}>
//                 <ActivityIndicator size="small" color="#FFD700" />
//                 <Text style={styles.loadingText}>Loading more...</Text>
//               </View>
//             ) : null
//           }
//         />

//         {/* No More Users Message */}
//         {!hasMore && followers.length > 0 && (
//           <Text style={styles.noMoreText}>No more users to show</Text>
//         )}
//       </RBSheet>
//     </>
//   );
// };

// const styles = StyleSheet.create({
//   title: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '600',
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: 10,
//   },
//   avatar: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     borderWidth: 2,
//     borderColor: '#FFD700',
//     marginRight: 10,
//   },
//   name: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   badge: {
//     width: 16,
//     height: 16,
//     marginLeft: 6,
//     marginRight: 12,
//   },
//   inviteBtn: {
//     borderWidth: 1,
//     borderColor: '#fff',
//     borderRadius: 16,
//     paddingVertical: 4,
//     paddingHorizontal: 12,
//     marginLeft: 'auto',
//   },
//   inviteText: {
//     color: '#fff',
//     fontSize: 14,
//   },
//   noMoreText: {
//     textAlign: 'center',
//     color: 'gray',
//     padding: 16,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     // paddingVertical: 20,---------------
//   },
//   loadingText: {
//     color: '#fff',
//     fontSize: 16,
//     marginTop: 10,
//   },
//   loadingFooter: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 10,
//   },
//   avatar1: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: '#333',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: '#FFD700',
//     marginRight: 10,
//   },
// });

// export default InviteBottomSheet;
