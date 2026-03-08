import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
// import axiosCommunication from '../../../Utils/Api';
import { AWS_CDN_URL } from '../../../Utils/aws';
import SearchComponent from '../../GloabalSearch/SearchComponent';
import axiosCommunication from '../../../Utils/axiosCommunication';

const FollowersSelectionScreen = ({ 
  onSelectionChange, // Callback to parent component
  selectAll,
  allowMultiSelect = true, // Allow multiple selection
  maxSelection = null,
  setSelectAll,
  selectedFollowers1,
}) => {
  const [followers, setFollowers] = useState([]);
  const [selectedFollowers, setSelectedFollowers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Sync local state ONLY when parent explicitly resets (clears all selections)
  // This prevents flickering during normal selection operations
  useEffect(() => {
    // Only sync when parent clears selection (reset scenario)
    if (selectedFollowers1 && selectedFollowers1.size === 0 && selectedFollowers.size > 0) {
      setSelectedFollowers(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFollowers1.size]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalFollowers, setTotalFollowers] = useState(0);
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  
  const ITEMS_PER_PAGE = 15;

  // Debounced search function
  // const debounceSearch = useCallback((query) => {
  //   if (searchTimeout) {
  //     clearTimeout(searchTimeout);
  //   }
    
  //   const timeout = setTimeout(() => {
  //     fetchFollowers(true, 1, query);
  //   }, 500); // 500ms delay
    
  //   setSearchTimeout(timeout);
  // }, [searchTimeout]);
  // useEffect(()=>{
  //   if(selectAll==false){
  //       setSelectedFollowers(new Set());
  //   }
  // },[selectAll])

  const fetchFollowers = async (isRefresh = false, page = 1, search = '') => {
    try {
      if (isRefresh) {
        if (page === 1) {
          setLoading(true);
          setIsSearching(search.length > 0);
        } else {
          setLoadingMore(true);
        }
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const params = {
        page: page,
        limit: ITEMS_PER_PAGE,
        search,
      };
      
      const response = await axiosCommunication.get('/seller/notifications/followers', { params });
      
      const newFollowers = response.data.followers || [];
      const pagination = response.data || {};
      
      if (page === 1) {
        setFollowers(newFollowers);
      } else {
        setFollowers(prevFollowers => [...prevFollowers, ...newFollowers]);
      }
      
      setCurrentPage(page);
      setHasNextPage(pagination.hasMore || false);
      setTotalFollowers(pagination.totalFollowers || newFollowers.length);
      
    } catch (err) {
      setError('Failed to fetch followers. Please try again.');
      console.error('Error fetching followers:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
      if (isRefresh && page === 1) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFollowers(true, 1,searchQuery);
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setCurrentPage(1);
    setFollowers([]); // Clear current followers
    // debounceSearch(text);
  };

  const handleSelectAll = () => {
    if (selectAll || selectedFollowers.size === followers.length) {
      // Deselect all
      setSelectedFollowers(new Set());
      if (onSelectionChange) {
        onSelectionChange(new Set());
      }
    } else {
      // Select all current followers
      const allFollowersData = followers;
      setSelectedFollowers(new Set(followers.map(f => f._id)));
      if (onSelectionChange) {
        onSelectionChange(allFollowersData);
      }
    }
    setSelectAll();
  };

  useEffect(() => {
    if (selectedFollowers.size === followers.length && followers.length > 0) {
      // All followers are selected
    }
  }, [selectedFollowers, followers]);

  const handleFollowerToggle = (followerId) => {
    const newSelected = new Set(selectedFollowers);
    
    if (newSelected.has(followerId)) {
      newSelected.delete(followerId);
    } else {
      // Check max selection limit
      if (maxSelection && newSelected.size >= maxSelection) {
        Alert.alert(
          'Selection Limit',
          `You can only select up to ${maxSelection} followers.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (!allowMultiSelect) {
        newSelected.clear();
      }
      newSelected.add(followerId);
    }
    
    setSelectedFollowers(newSelected);
    
    // Notify parent component with the updated Set
    if (onSelectionChange) {
      const selectedFollowersData = new Set(followers.filter(f => newSelected.has(f._id)));
      onSelectionChange(selectedFollowersData);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchFollowers(true, 1, searchQuery);
  };

  const loadMoreFollowers = () => {
    if (!loadingMore && hasNextPage) {
      fetchFollowers(true, currentPage + 1, searchQuery);
    }
  };

  const formatFollowersCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const isAllSelected = followers.length > 0 && 
    followers.every(f => selectedFollowers?.has(f._id));

  const renderFollowerItem = ({ item }) => {
    const isSelected = selectedFollowers?.has(item._id);
    const followerData = item.follower;
    if(!followerData) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.followerItem,
          isSelected && styles.selectedFollowerItem
        ]}
        onPress={() => handleFollowerToggle(item._id)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {!followerData?.profileURL?.key? <View style={styles.avatar}>
          <Text className='text-brand-yellow font-semibold capitalize text-lg'>{followerData?.name?.charAt(0)}</Text>
          </View>:
        <Image
          source={{
            uri: `${AWS_CDN_URL}${followerData?.profileURL?.key}`
          }}
          style={styles.avatar}
          defaultSource={{ uri: 'https://via.placeholder.com/60x60?text=User' }}
        />}
        
        {/* Follower Info */}
        <View style={styles.followerInfo}>
          <View style={styles.followerHeader}>
            <Text style={styles.displayName} numberOfLines={1}>
              {followerData?.name || 'Unknown User'}
            </Text>
          </View>
          
          <Text style={styles.username} numberOfLines={1}>
            @{followerData?.userName || 'username'}
          </Text>
        </View>
        
        {/* Selection Indicator */}
        <View style={styles.selectionContainer}>
          <View style={[
            styles.checkbox,
            isSelected && styles.checkedCheckbox
          ]}>
            {isSelected && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading || isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>
            {isSearching ? 'Searching followers...' : 'Loading followers...'}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery ? 'No followers found matching your search.' : 'No followers found.'}
        </Text>
        {searchQuery && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => handleSearchChange('')}
          >
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (error && !refreshing && followers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchFollowers(true, 1, searchQuery)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Followers ({formatFollowersCount(totalFollowers)})</Text>
      </View>

      {/* Search Bar */}
      <SearchComponent searchTerm={searchQuery} setSearchTerm={setSearchQuery} placeholder='Search Followers'/>

      {/* Select All Button */}
      {allowMultiSelect && followers.length > 0 && (
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={handleSelectAll}
          activeOpacity={0.7}
        >
          <Text style={styles.selectAllText}>
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Followers List - SOLUTION: Use ScrollView instead of FlatList for nested scrolling */}
      <ScrollView
        style={styles.scrollView}
        nestedScrollEnabled={true} // Enable nested scrolling
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFD700']}
            tintColor="#FFD700"
          />
        }
        onScroll={({ nativeEvent }) => {
          // Handle load more when user reaches near bottom
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          
          if (isCloseToBottom && !loadingMore && hasNextPage) {
            loadMoreFollowers();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Render loading state */}
        {(loading || isSearching) && followers.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {/* Render followers */}
            {followers.map((item, index) => (
              <View key={index.toString()}>
                {renderFollowerItem({ item })}
              </View>
            ))}
            
            {/* Render footer */}
            {renderFooter()}
            
            {/* Render empty state if no followers */}
            {followers.length === 0 && !loading && !isSearching && (
              renderEmpty()
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    // Fixed height for followers selection
    // minHeight: 200,
  },
  scrollView: {
    flex: 1,
     maxHeight: 500
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 120,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  selectAllButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  selectAllText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 120,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearSearchButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearSearchText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '600',
  },
  followerItem: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedFollowerItem: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1A1A',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent:'center',
    alignItems:'center',
    marginRight: 12,
    backgroundColor: '#333',
  },
  followerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  followerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  username: {
    fontSize: 13,
    color: '#888',
  },
  selectionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  checkmark: {
    color: '#121212',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FollowersSelectionScreen;
