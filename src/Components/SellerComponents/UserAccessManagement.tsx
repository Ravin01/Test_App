import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  UserCheck,
  Trash2,
  Edit,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '../../Utils/Api';
import { colors } from '../../Utils/Colors';
import SellerHeader from './SellerForm/Header';
import { AWS_CDN_URL } from '../../Utils/aws';

const UserAccessManagement = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantedUsers, setGrantedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAccessId, setEditingAccessId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Available pages with permissions (excluding locked and USER_ACCESS pages)
  const availablePages = [
    { 
      key: 'MESSAGE', 
      name: 'Message',
      description: 'Access chat and messaging features'
    },
    { 
      key: 'PRODUCT', 
      name: 'Products',
      description: 'Manage products, inventory, and listings'
    },
    { 
      key: 'BUNDLE', 
      name: 'Bundle Sales',
      description: 'Create and manage product bundles'
    },
    { 
      key: 'SHOPPABLE_VIDEO', 
      name: 'Shoppable Videos',
      description: 'Create and manage shoppable videos'
    },
    { 
      key: 'CO_HOST', 
      name: 'Co-Host',
      description: 'Manage co-hosts for live streams'
    },
    { 
      key: 'SHOWS', 
      name: 'Live Stream (Base)',
      description: 'Access to view and manage live shows (required for using any stream features)'
    },
    { 
      key: 'SHOWS_AUCTION', 
      name: '├─ Auction',
      description: 'Start and control auction features during live streams',
      isFeature: true
    },
    { 
      key: 'SHOWS_GIVEAWAY', 
      name: '├─ Giveaway',
      description: 'Start and control giveaway features during live streams',
      isFeature: true
    },
    { 
      key: 'SHOWS_BUY_NOW', 
      name: '├─ Buy Now',
      description: 'Add and manage Buy Now products during live streams',
      isFeature: true
    },
    { 
      key: 'SHOWS_FLASH_SALE', 
      name: '└─ Flash Sale',
      description: 'Start and control flash sales during live streams',
      isFeature: true
    },
    { 
      key: 'SPONSORS', 
      name: 'Sponsors',
      description: 'Manage show sponsors and partnerships'
    },
    { 
      key: 'ORDERS', 
      name: 'Orders',
      description: 'View and manage customer orders'
    },
    { 
      key: 'WALLET', 
      name: 'Wallet',
      description: 'Access wallet and financial information'
    },
    { 
      key: 'NOTIFICATIONS', 
      name: 'Notifications',
      description: 'View and manage notifications'
    },
    { 
      key: 'FLASHSALE', 
      name: 'FlashSale',
      description: 'Create and manage flash sales'
    },
    { 
      key: 'AUDIENCE', 
      name: 'Audience',
      description: 'View audience analytics and insights'
    },
    { 
      key: 'SETTINGS', 
      name: 'Settings',
      description: 'Access account and system settings'
    },
  ];

  const [selectedPages, setSelectedPages] = useState({});

  useEffect(() => {
    fetchGrantedUsers();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const fetchGrantedUsers = async () => {
    try {
      const response = await axiosInstance.get('/seller/user-access/granted-users');
      setGrantedUsers(response.data.data || []);
      //console.log("GRANTED USERS FETCHED",response.data.data)
    } catch (error) {
      console.error('Error fetching granted users:', error);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(`/search/users`, {
        params: { term: searchQuery.trim(), page: 1, limit: 20 },
      });
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setShowGrantModal(true);
    setIsEditMode(false);
    setEditingAccessId(null);
    setSelectedPages({});
  };

  const handleEditAccess = (access) => {
    setSelectedUser({
      _id: access.userId._id,
      userName: access.userId.name,
      emailId: access.userId.email,
      profileURL: access.userId.profileURL,
    });
    setIsEditMode(true);
    setEditingAccessId(access.userId._id);

    // Pre-fill existing permissions
    const existingPages = {};
    access.accessPages.forEach((page) => {
      existingPages[page.pageType] = {
        canView: page.canView,
        canCreate: page.canCreate,
        canEdit: page.canEdit,
        canDelete: page.canDelete,
      };
    });
    setSelectedPages(existingPages);
    setShowGrantModal(true);
  };

  const togglePagePermission = (pageKey: string, permission: string) => {
    setSelectedPages((prev) => {
      const currentPage = prev[pageKey] || {};
      return {
        ...prev,
        [pageKey]: {
          ...currentPage,
          [permission]: !(currentPage as any)[permission],
        },
      };
    });
  };

  const handleGrantAccess = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    const pages = Object.entries(selectedPages)
      .filter(([key, permissions]) => Object.values(permissions).some((val) => val === true))
      .map(([pageKey, permissions]) => {
        const page = availablePages.find((p) => p.key === pageKey);
        return {
          pageName: page.name,
          pageType: pageKey,
          canView: permissions.canView || false,
          canCreate: permissions.canCreate || false,
          canEdit: permissions.canEdit || false,
          canDelete: permissions.canDelete || false,
        };
      });

    if (pages.length === 0) {
      setError('Please select at least one page with permissions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditMode && editingAccessId) {
        await axiosInstance.put(`/seller/user-access/update/${editingAccessId}`, {
          accessPages: pages,
        });
        setSuccess('Access updated successfully!');
      } else {
        await axiosInstance.post('/seller/user-access/grant', {
          userId: selectedUser._id,
          accessPages: pages,
        });
        setSuccess('User tagged successfully!');
      }

      setShowGrantModal(false);
      setSelectedUser(null);
      setSelectedPages({});
      setIsEditMode(false);
      setEditingAccessId(null);
      fetchGrantedUsers();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error granting/updating access:', error);
      setError(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'grant'} access.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = (userId, userName) => {
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke access for ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/seller/user-access/revoke/${userId}`);
              setSuccess('Access revoked successfully');
              fetchGrantedUsers();
              setTimeout(() => setSuccess(''), 3000);
            } catch (error) {
              console.error('Error revoking access:', error);
              setError('Failed to revoke access');
            }
          },
        },
      ]
    );
  };

  const renderSearchResultItem = ({ item: user }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSelectUser(user)}
    >
      {user.profileURL?.key ? (
        <Image
          source={{ uri: user.profileURL.key }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user.userName?.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{user.userName}</Text>
        <Text style={styles.searchResultEmail}>{user.emailId}</Text>
      </View>
      <Plus size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderGrantedUserItem = ({ item: access }) => (
    <View style={styles.grantedUserCard}>
      <View style={styles.userInfoSection}>
        {access.userId?.profileURL ? (
          <Image
            source={{ uri: access.userId.profileURL }}
            style={styles.avatarSmall}
          />
        ) : (
          <View style={styles.avatarPlaceholderSmall}>
            <Text style={styles.avatarTextSmall}>
              {access.userId?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{access.userId?.name}</Text>
          <Text style={styles.userEmail}>{access.userId?.email}</Text>
        </View>
      </View>

      <View style={styles.accessPagesSection}>
        <Text style={styles.sectionLabel}>Access Pages:</Text>
        <View style={styles.badgeContainer}>
          {access.accessPages?.map((page, idx) => (
            <View key={idx} style={styles.badge}>
              <Text style={styles.badgeText}>{page.pageName}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            access.isActive ? styles.statusActive : styles.statusRevoked,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              access.isActive ? styles.statusTextActive : styles.statusTextRevoked,
            ]}
          >
            {access.isActive ? 'Active' : 'Revoked'}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(access.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditAccess(access)}
        >
          <Edit size={16} color="#FFC107" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.revokeButton}
          onPress={() => handleRevokeAccess(access.userId._id, access.userId.name)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={styles.revokeButtonText}>Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPermissionCheckbox = (pageKey, permission) => {
    const isChecked = selectedPages[pageKey]?.[permission] || false;
    return (
      <TouchableOpacity
        key={permission}
        style={styles.checkboxContainer}
        onPress={() => togglePagePermission(pageKey, permission)}
      >
        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
          {isChecked && <Check size={16} color="#1F2937" />}
        </View>
        <Text style={styles.checkboxLabel}>
          {permission.replace('can', '')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message="User Access" />
      <FlatList
        data={grantedUsers}
        renderItem={renderGrantedUserItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Success Message */}
            {success ? (
              <View style={styles.successMessage}>
                <Check size={20} color="#10B981" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorMessage}>
                <AlertCircle size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => setError('')}>
                  <X size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Search Section */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Tag a New User</Text>

              <View style={styles.searchInputContainer}>
                <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search users by name or email..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Search Results with ScrollView */}
              {searchResults.length > 0 && (
                <ScrollView 
                  style={styles.searchResults}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user._id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectUser(user)}
                    >
                      {user.profileURL ? (
                        <Image
                          source={{ uri: `${AWS_CDN_URL}${user.profileURL}` }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {user.userName?.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.searchResultInfo}>
                        <View style = {{flexDirection: 'row', gap: 10}}>
                        <Text style={styles.searchResultName}>{user.userName}</Text>
                          {user?.role &&<View
                            style={[
                              styles.rolebadge,
                              user.role === 'seller' ? styles.sellerBadge : styles.userBadge
                            ]}
                          >
                            <Text style={[
                              styles.badgeText,
                              user.role === 'seller' ? styles.sellerText : styles.userText
                            ]}>{user.role}</Text>
                          </View>}
                        </View>
                        {/* <Text style={styles.searchResultEmail}>{user.emailId}</Text> */}
                        {user.companyName ? <Text style={styles.searchResultEmail}>{user.companyName}</Text>:
                        <Text style={styles.searchResultEmail}>{user.emailId}</Text>
                        }
                      </View>
                      <Plus size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {loading && searchQuery ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFC107" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : null}
            </View>

            {/* Tagged Users Section Header */}
            <Text style={[styles.sectionTitle, { paddingLeft: 20, paddingTop: 20 }]}>
              Tagged Users ({grantedUsers.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <UserCheck size={48} color="#4B5563" />
            <Text style={styles.emptyStateTitle}>No users tagged yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Search and tag users to grant them access to your pages
            </Text>
          </View>
        }
      />

      {/* Grant Access Modal */}
      <Modal
        visible={showGrantModal && selectedUser !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowGrantModal(false);
          setSelectedUser(null);
          setSelectedPages({});
          setIsEditMode(false);
          setEditingAccessId(null);
          setError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Edit Access' : 'Grant Access'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowGrantModal(false);
                    setSelectedUser(null);
                    setSelectedPages({});
                    setIsEditMode(false);
                    setEditingAccessId(null);
                    setError('');
                  }}
                >
                  <X size={24} color="#D1D5DB" />
                </TouchableOpacity>
              </View>

              {/* Selected User Info */}
              {selectedUser && (
                <View style={styles.selectedUserInfo}>
                  {selectedUser.profileURL ? (
                    <Image
                      source={{ uri: `${AWS_CDN_URL}${selectedUser.profileURL}` }}
                      style={styles.selectedUserAvatar}
                    />
                  ) : (
                    <View style={styles.selectedUserAvatarPlaceholder}>
                      <Text style={styles.selectedUserAvatarText}>
                        {selectedUser.userName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.selectedUserName}>
                      {selectedUser.userName}
                    </Text>
                    <Text style={styles.selectedUserEmail}>
                      {selectedUser.emailId}
                    </Text>
                  </View>
                </View>
              )}

              {/* Page Selection */}
              <View style={styles.pageSelectionSection}>
                <Text style={styles.pageSelectionTitle}>
                  Select Pages & Permissions
                </Text>
                {availablePages.map((page) => (
                  <View key={page.key} style={styles.pageCard}>
                    <View style={styles.pageInfo}>
                      <Text style={styles.pageName}>{page.name}</Text>
                      <Text style={styles.pageDescription}>
                        {page.description}
                      </Text>
                    </View>

                    <View style={styles.permissionsGrid}>
                      {['canView', 'canCreate', 'canEdit', 
                     // 'canDelete'
                    ].map((permission) =>
                        renderPermissionCheckbox(page.key, permission)
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowGrantModal(false);
                    setSelectedUser(null);
                    setSelectedPages({});
                    setIsEditMode(false);
                    setEditingAccessId(null);
                    setError('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.grantButton, loading && styles.grantButtonDisabled]}
                  onPress={handleGrantAccess}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#1F2937" />
                  ) : (
                    <>
                      <Text style={styles.grantButtonText}>
                        {isEditMode ? 'Update Access' : 'Grant Access'}
                      </Text>
                      <Check size={16} color="#1F2937" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headLineColor,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textColor,
    marginTop: 8,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  successText: {
    color: '#10B981',
    flex: 1,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    flex: 1,
  },
  searchSection: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    padding: 20,
   // marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.headLineColor,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryColor,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.headLineColor,
    fontSize: 14,
  },
  searchResults: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 8,
    backgroundColor: colors.primaryColor,
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.2)',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFC107',
    fontWeight: '600',
    fontSize: 18,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.headLineColor,
  },
  searchResultEmail: {
    fontSize: 13,
    color: colors.textColor,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    color: colors.textColor,
  },
  grantedUsersSection: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.2)',
    overflow: 'hidden',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: colors.headLineColor,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    color: colors.textColor,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  grantedUserCard: {
    backgroundColor: colors.primaryColor,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.2)',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  avatarPlaceholderSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    color: '#FFC107',
    fontWeight: '600',
    fontSize: 16,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.headLineColor,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textColor,
    marginTop: 2,
  },
  accessPagesSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textColor,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFC107',
    fontSize: 11,
    fontWeight: '500',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusRevoked: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextRevoked: {
    color: '#EF4444',
  },
  dateText: {
    fontSize: 12,
    color: colors.textColor,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    color: colors.borderColor,
    fontSize: 13,
    fontWeight: '500',
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revokeButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headLineColor,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    gap: 12,
  },
  selectedUserAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.borderColor,
  },
  selectedUserAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    borderWidth: 2,
    borderColor: colors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedUserAvatarText: {
    color: colors.borderColor,
    fontWeight: '600',
    fontSize: 24,
  },
  selectedUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.headLineColor,
  },
  selectedUserEmail: {
    fontSize: 14,
    color: colors.textColor,
    marginTop: 4,
  },
  pageSelectionSection: {
    padding: 20,
  },
  pageSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headLineColor,
    marginBottom: 16,
  },
  pageCard: {
    backgroundColor: colors.primaryColor,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  pageInfo: {
    marginBottom: 12,
  },
  pageName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.headLineColor,
  },
  pageDescription: {
    fontSize: 12,
    color: colors.textColor,
    marginTop: 4,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 4,
    backgroundColor: colors.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.borderColor,
    borderColor: colors.borderColor,
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.headLineColor,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.2)',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: colors.headLineColor,
    fontSize: 14,
    fontWeight: '500',
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primaryButtonColor,
    borderRadius: 8,
  },
  grantButtonDisabled: {
    opacity: 0.5,
  },
  grantButtonText: {
    color: colors.primaryColor,
    fontSize: 14,
    fontWeight: '600',
  },

  rolebadge: {
    paddingHorizontal: 8,     // px-2
    paddingVertical: 2,       // py-0.5
    borderRadius: 12,         // rounded-full
    borderWidth: 1,
    alignSelf: 'flex-start',  // prevent full width stretch
    //marginTop: 4,

  },

  sellerBadge: {
    backgroundColor: 'rgba(255, 204, 0, 0.2)',  // newYellow/20
    borderColor: 'rgba(255, 204, 0, 0.3)',
  },

  userBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500/20
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },

  rolebadgeText: {
    fontSize: 12, // text-xs
    fontWeight: '500',
  },

  sellerText: {
    color: '#FFCC00', // newYellow
  },

  userText: {
    color: '#60A5FA', // blue-400
  },
});

export default UserAccessManagement;
