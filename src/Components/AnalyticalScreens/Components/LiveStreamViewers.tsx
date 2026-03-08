import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Clock,
  Search,
  UserX
} from 'lucide-react-native';
import axiosInstance from '../../../Utils/Api';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { intialAvatar } from '../../../Utils/Constants';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const LiveStreamViewers = ({ showId }) => {
  const navigation = useNavigation();
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Format time duration
  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Get role badge style
  const getRoleStyle = (role) => {
    switch (role) {
      case "seller":
        return { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' };
      case "dropshipper":
        return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' };
      default:
        return { backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#A855F7' };
    }
  };

  // Fetch viewers from API
  const fetchViewers = useCallback(async (pageNum = 1, search = '', isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await axiosInstance.get(
        `live-interactions/${showId}/viewers`,
        { params: { page: pageNum, limit: 15, search } }
      );
      const { viewers: newViewers, pagination } = response.data.data;

      if (pageNum === 1 || isRefresh) {
        setViewers(newViewers);
      } else {
        setViewers(prev => [...prev, ...newViewers]);
      }
      setHasMore(pagination.hasNextPage);
      setError(null);

      // Animate when data loads
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

    } catch (err) {
      console.error('Error fetching viewers:', err);
      setError('Failed to load viewers. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showId, fadeAnim]);

  // Handle initial load and search term changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchViewers(1, searchTerm);
  }, [searchTerm, fetchViewers]);

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore && viewers.length > 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchViewers(nextPage, searchTerm);
    }
  };

  // Handle pull to refresh
  const onRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchViewers(1, searchTerm, true);
  };

  // Navigate to user profile
  const navigateToProfile = (userName) => {
    if (userName) {
      navigation.navigate('ViewSellerProdile', {id: userName });
    }
  };

  // Render viewer item
  const renderViewerItem = ({ item: viewer, index }) => {
    const roleStyle = getRoleStyle(viewer.role);
    
    return (
      <AnimatedTouchable
        style={[
          styles.viewerCard,
          { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0]
          })}] }
        ]}
        onPress={() => navigateToProfile(viewer.userName)}
        activeOpacity={0.7}
      >
        <View style={styles.viewerContent}>
          {/* User Avatar and Basic Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {viewer.profileURL ? (
                <Image
                  source={{ uri: viewer.profileURL.key?`${AWS_CDN_URL}${viewer.profileURL.key}` :`${intialAvatar}${viewer.name || "Unknown User"}`}}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={20} color="#A1A1AA" />
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            
            <View style={styles.userDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {viewer.name || "Unknown User"}
                </Text>
                {viewer.role && (
                  <View style={[styles.roleBadge, { backgroundColor: roleStyle.backgroundColor }]}>
                    <Text style={[styles.roleText, { color: roleStyle.color }]}>
                      {viewer.role}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{viewer.userName || "unknown_username"}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {/* <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sessions</Text>
              <Text style={styles.statValue}>{viewer.sessionCount}</Text>
            </View> */}
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{formatTime(viewer.watchDuration)}</Text>
            </View>
            
            {/* <View style={styles.statItem}>
              <Text style={styles.statLabel}>Last Seen</Text>
              <Text style={styles.statValue}>
                {new Date(viewer.lastSeenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View> */}
          </View>
        </View>
      </AnimatedTouchable>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UserX size={48} color="#A1A1AA" />
      <Text style={styles.emptyTitle}>No Viewers Found</Text>
      <Text style={styles.emptyMessage}>
        {searchTerm 
          ? `No viewers match "${searchTerm}"` 
          : "This stream hasn't been viewed by logged-in users yet"}
      </Text>
    </View>
  );

  // Render load more footer
  const renderFooter = () => {
    if (loading && viewers.length > 0) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#F7CE45" />
        </View>
      );
    }
    
    if (!hasMore && viewers.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.endText}>You've reached the end of the list</Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <User size={20} color="#F7CE45" />
          <Text style={styles.title}>Viewers</Text>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#A1A1AA" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search viewers..."
            placeholderTextColor="#A1A1AA"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Error State */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchViewers(1, searchTerm)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.viewersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F7CE45']}
              tintColor="#F7CE45"
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 20;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {viewers.length > 0 ? (
            <>
              {viewers.map((viewer, index) => (
                <View key={`${viewer.userId}-${index}`}>
                  {renderViewerItem({ item: viewer, index })}
                </View>
              ))}
              {renderFooter()}
            </>
          ) : (
            !loading && renderEmptyState()
          )}
          
          {/* Initial Loading */}
          {loading && viewers.length === 0 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F7CE45" />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    width: '55%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 14,
  },
  viewersList: {
    maxHeight: 500,
  },
  viewerCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  viewerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.5)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#09090B',
    borderWidth: 2,
    borderColor: 'rgba(247, 206, 69, 0.3)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: '#F7CE45',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#18181B',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
    marginRight: 8,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  username: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statLabel: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAFA',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#F7CE45',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
  },
});

export default LiveStreamViewers;