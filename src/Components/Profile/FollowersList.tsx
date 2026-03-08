import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ToastAndroid, 
  StatusBar,
  TextInput,
  Keyboard
} from 'react-native';
import { useFollowApi } from '../../Utils/FollowersApi';
import UserItem from './UserItem';
import { colors } from '../../Utils/Colors';
import Icons from 'react-native-vector-icons/Feather';


const SkeletonUserItem = () => (
  <View className={`flex-row p-4 items-center`}>
    <View className={`bg-gray-300 rounded-full w-10 h-10`} />
    <View className="ml-3 flex-1 justify-center">
      <View className="bg-gray-300 rounded mb-1.5 w-24 h-2.5" />
      <View className="bg-gray-300 rounded w-32 h-2" />
    </View>
  </View>
);

const FollowersList = ({ userName, userId, setisFollowers, isActionVisible = true ,active='',setisFollowing}: {
  userName: string;
  userId: string;
  setisFollowers: (value: boolean) => void;
  isActionVisible?: boolean;
  active?: string;
  setisFollowing: (value: boolean) => void;
}): React.JSX.Element => {
  const { getFollowing, getFollowers, followUser, unfollowUser } = useFollowApi();

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState(active||'followers');
  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);

  const loadedFollowerIds = useRef(new Set());
  const loadedFollowingIds = useRef(new Set());
  const searchInputRef = useRef(null);
  const isLoadingRef = useRef(false);
  const followersHasMoreRef = useRef(true);
  const followingHasMoreRef = useRef(true);

  const tabHasMore = activeTab === 'followers' ? followersHasMore : followingHasMore;
  const currentData = activeTab === 'followers' ? followers : following;

  // Keep refs in sync with state
  useEffect(() => {
    followersHasMoreRef.current = followersHasMore;
  }, [followersHasMore]);

  useEffect(() => {
    followingHasMoreRef.current = followingHasMore;
  }, [followingHasMore]);

  const fetchFollowers = useCallback(async (page: number) => {
    if (!followersHasMoreRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const response = await getFollowers(userId, searchTerm, page);
      const newFollowers = response?.data?.followers || [];
      const uniqueNewFollowers = newFollowers.filter(user => !loadedFollowerIds.current.has(user.userId));
      if (uniqueNewFollowers.length > 0) {
        uniqueNewFollowers.forEach(user => loadedFollowerIds.current.add(user.userId));
        setFollowers(prev => [...prev, ...uniqueNewFollowers]);
      }
      const hasMore = newFollowers.length >= 20;
      setFollowersHasMore(hasMore);
      followersHasMoreRef.current = hasMore;
    } catch (error) {
      console.log('Failed to load followers');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [userId, getFollowers, searchTerm]);

  const fetchFollowing = useCallback(async (page: number) => {
    if (!followingHasMoreRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const response = await getFollowing(userId, searchTerm, page);
      const newFollowing = response?.data?.following || [];
      const uniqueNewFollowing = newFollowing.filter(user => !loadedFollowingIds.current.has(user.userId));
      if (uniqueNewFollowing.length > 0) {
        uniqueNewFollowing.forEach(user => loadedFollowingIds.current.add(user.userId));
        setFollowing(prev => [...prev, ...uniqueNewFollowing]);
      }
      const hasMore = newFollowing.length >= 20;
      setFollowingHasMore(hasMore);
      followingHasMoreRef.current = hasMore;
    } catch (error) {
      console.log('Failed to load following');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [userId, getFollowing, searchTerm]);

  useEffect(() => {
    loadedFollowerIds.current.clear();
    loadedFollowingIds.current.clear();
    setFollowers([]);
    setFollowing([]);
    setFollowersPage(1);
    setFollowingPage(1);
    setFollowersHasMore(true);
    setFollowingHasMore(true);
    followersHasMoreRef.current = true;
    followingHasMoreRef.current = true;
  }, [userId, searchTerm, activeTab]);

  useEffect(() => {
    if (activeTab === 'followers') {
      fetchFollowers(followersPage);
    } else {
      fetchFollowing(followingPage);
    }
  }, [followersPage, followingPage, activeTab, fetchFollowers, fetchFollowing]);

  const handleFollow = async (userName) => {
    try {
      await followUser(userName);
      ToastAndroid.show('Successfully followed', ToastAndroid.SHORT);
      setFollowers(prev => prev.map(user => user.userId === userName ? { ...user, followStatus: "Following" } : user));
      setFollowing(prev => prev.map(user => user.userId === userName ? { ...user, followStatus: "Following" } : user));
    } catch (error) {
      console.log('Failed to follow');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await unfollowUser(userId);
      ToastAndroid.show('Successfully unfollowed', ToastAndroid.SHORT);
      setFollowers(prev => prev.map(user => user.userId === userId ? { ...user, followStatus: "unfollow" } : user));
      setFollowing(prev => prev.map(user => user.userId === userId ? { ...user, followStatus: "unfollow" } : user));
    } catch (error) {
      console.log('Failed to unfollow');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    Keyboard.dismiss();
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
  };

  const handleLoadMore = useCallback(() => {
    if (isLoadingRef.current) return;
    if (activeTab === 'followers' && followersHasMoreRef.current) {
      setFollowersPage(prev => prev + 1);
    } else if (activeTab === 'following' && followingHasMoreRef.current) {
      setFollowingPage(prev => prev + 1);
    }
  }, [activeTab]);

  return (
    <View className="flex-1 pb-12" style={{ backgroundColor: colors.primaryColor }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() =>{
          setisFollowing(false)
          setisFollowers(false)}} className="w-8 h-8 mr-2 items-center justify-center border border-white rounded-full">
          <Icons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-base flex-1">{userName || 'N/A'}</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mb-2">
        <TouchableOpacity className={`flex-1 items-center py-2 ${activeTab === 'followers' ? 'border-b-2 border-yellow-400' : ''}`} onPress={() => setActiveTab('followers')}>
          <Text className="text-white">Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`flex-1 items-center py-2 ${activeTab === 'following' ? 'border-b-2 border-yellow-400' : ''}`} onPress={() => setActiveTab('following')}>
          <Text className="text-white">Following</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="mx-4 mb-3 flex-row items-center bg-[#222] rounded-lg px-3 ">
        <Icons name="search" size={18} color="#fff" />
        <TextInput
          ref={searchInputRef}
          className="flex-1 ml-2 text-white text-base"
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} className="ml-2">
            <Icons name="x-circle" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading && currentData.length === 0 ? (
        <View className="flex-1">
          {Array.from({ length: 20 }).map((_, index) => (
            <SkeletonUserItem key={`skeleton-${index}`} />
          ))}
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <UserItem user={item} onFollow={handleFollow} onUnfollow={handleUnfollow} isActionVisible={isActionVisible} />
          )}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={!loading && (
            <View className="items-center justify-center py-10">
              <Text className="text-gray-400">No {activeTab} found</Text>
            </View>
          )}
          ListFooterComponent={() => (
            <View className="items-center py-4">
              {loading && currentData.length > 0 ? (
                <View className="flex-row items-center">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonUserItem key={`footer-skeleton-${index}`} />
                  ))}
                </View>
              ) : tabHasMore && currentData.length > 0 ? (
                <Text className="text-gray-400">Scroll for more...</Text>
              ) : currentData.length > 0 ? (
                <Text className="text-gray-400">No more users to show</Text>
              ) : null}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default FollowersList;
