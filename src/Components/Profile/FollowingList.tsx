import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dimensions, 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  ToastAndroid, 
  StatusBar 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFollowApi } from '../../Utils/FollowersApi';
import UserItem from './UserItem';
import { colors } from '../../Utils/Colors';
import Icons from 'react-native-vector-icons/Feather';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const isTablet = screenWidth >= 768;
const isLargeScreen = screenWidth >= 1024;
const isSmallScreen = screenWidth < 375;

// Skeleton User Item (loading state)
const SkeletonUserItem = () => (
  <View className={`
    flex-row p-4 items-center
    ${isTablet ? 'px-6 py-5' : 'px-4 py-4'}
    ${isLargeScreen ? 'px-8 py-6' : ''}
  `}>
    <View className={`
      bg-gray-300 rounded-full
      ${isLargeScreen ? 'w-14 h-14' : isTablet ? 'w-12 h-12' : 'w-10 h-10'}
    `} />
    <View className={`ml-3 flex-1 justify-center ${isTablet ? 'ml-4' : ''}`}>
      <View className={`
        bg-gray-300 rounded mb-1.5
        ${isLargeScreen ? 'w-32 h-3' : isTablet ? 'w-28 h-2.5' : 'w-24 h-2.5'}
      `} />
      <View className={`
        bg-gray-300 rounded
        ${isLargeScreen ? 'w-40 h-2.5' : isTablet ? 'w-36 h-2' : 'w-32 h-2'}
      `} />
    </View>
  </View>
);

const FollowersList = ({ userName, userId, setisFollowing ,isActionVisible=true}) => {
  const { getFollowing, getFollowers, followUser, unfollowUser } = useFollowApi();

  const [followers, setFollowers] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadedFollowerIds = useRef(new Set());
  const loadedFollowingIds = useRef(new Set());

  const [following, setFollowing] = useState([]);
  const [activeTab, setActiveTab] = useState('following');

  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [followingHasMore, setFollowingHasMore] = useState(true);

  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);

  const tabHasMore = activeTab === 'followers' ? followersHasMore : followingHasMore;
  const currentPage = activeTab === 'followers' ? followersPage : followingPage;
 const currentData = activeTab === 'followers' ? followers : following;
  const getCurrentData = () => {
    switch (activeTab) {
      case 'followers':
        return followers;
      case 'following':
        return following;
      default:
        return followers;
    }
  };
  // const currentData = getCurrentData();
  // console.log(userId,"userid")

  const fetchFollowers = useCallback(async () => {
    
   if (!tabHasMore || loading && !refresh) return;
    setLoading(true);
    try {
      const response = await getFollowers(userId, searchTerm, followersPage);
      const newFollowers = response?.data?.followers || [];
        
      const uniqueNewFollowers = newFollowers.filter(user => !loadedFollowerIds.current.has(user.userId));

      if (uniqueNewFollowers.length > 0) {
        uniqueNewFollowers.forEach(user => loadedFollowerIds.current.add(user.userId));
        setFollowers(prev => [...prev, ...uniqueNewFollowers]);
      }

      setFollowersHasMore(newFollowers.length >= 20);
    } catch (error) {
      console.log('Failed to load followers');
    } finally {
      setLoading(false);
      setRefresh(false)
    }
  }, [userId, followersPage, tabHasMore, loading, getFollowers, searchTerm, activeTab]);

  const fetchFollowing = useCallback(async () => {
    console.log("folloers")
    if (!tabHasMore || loading && !refresh) return;
    setLoading(true);
    try {
      const response = await getFollowing(userId, searchTerm, followingPage);
      const newFollowing = response?.data?.following || [];
      
      const uniqueNewFollowing = newFollowing.filter(user => 
        !loadedFollowingIds.current.has(user.userId)
      );
      
      if (uniqueNewFollowing.length > 0) {
        uniqueNewFollowing.forEach(user => loadedFollowingIds.current.add(user.userId));
        setFollowing(prev => [...prev, ...uniqueNewFollowing]);
      }

      setFollowingHasMore(newFollowing.length >= 20);
    } catch (error) {
      console.log('Failed to load following', error.response);
    } finally {
      setRefresh(false)
      setLoading(false);
    }
  }, [userId, followingPage, tabHasMore, loading, getFollowing, searchTerm, activeTab]);

  useEffect(() => {
    loadedFollowerIds.current.clear();
    loadedFollowingIds.current.clear();
    setFollowers([]);
    setFollowing([]);

    setFollowersPage(1);
    setFollowingPage(1);

    setFollowersHasMore(true);
    setFollowingHasMore(true);
  }, [userId, searchTerm, activeTab]);

  useEffect(() => {
    if (loading || !tabHasMore) return;
    
    if (activeTab === 'followers') {
      fetchFollowers();
    } else if (activeTab === 'following') {
      fetchFollowing();
    }
  }, [followersPage, followingPage, activeTab]);

  const handleFollow = async (userName) => {
    try {
      await followUser(userName);
      // console.log(userName)
      ToastAndroid.show('Successfully followed', ToastAndroid.SHORT);
      setFollowers(prev => prev.map(user => 
        user.userId === userName ? { ...user, followStatus: "Following" } : user
      ));
         setFollowing(prev => prev.map(user => 
        user.userId === userName ? { ...user, followStatus: "Following" } : user
      ));
    } catch (error) {
      console.log(error.response?.data?.message || 'Failed to follow');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      // console.log("this one called")
      await unfollowUser(userId);
      ToastAndroid.show('Successfully unfollowed', ToastAndroid.SHORT);
     setFollowers(prev => prev.map(user => {
  // console.log(user?.userName, userName);
  return user.userId === userId 
    ? { ...user, followStatus: "unfollow" } 
    : user;
}));

  setFollowing(prev => prev.map(user => {
  // console.log(user?.userName, userName);
  return user.userId === userId 
    ? { ...user, followStatus: "unfollow" } 
    : user;
}));

      // console.log(following,userName,"inside")
    } catch (error) {
      console.log(error.response?.data?.message || 'Failed to unfollow');
    }
  };

      // console.log(following)
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 50 && tabHasMore && !loading) {
      if (activeTab === 'followers') {
        setFollowersPage(prev => prev + 1);
      } else if (activeTab === 'following') {
        setFollowingPage(prev => prev + 1);
      }
    }
  }, [tabHasMore, loading, activeTab]);

  return (
    <View 
      className="flex-1 pb-12"
      style={{ backgroundColor: colors.primaryColor }}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className={`
        flex-row items-center
        ${isLargeScreen ? 'px-8 py-6' : isTablet ? 'px-6 py-5' : 'px-1 py-2'}
      `}>
        <TouchableOpacity 
          onPress={() => setisFollowing(false)} 
          className={`
            border border-white rounded-full flex-row items-center justify-center
            ${isLargeScreen ? 'w-10 h-10 mx-3' : isTablet ? 'w-9 h-9 mx-2.5' : 'w-8 h-8 mx-2'}
          `}
        > 
          <Icons 
            name="arrow-left" 
            size={isLargeScreen ? 24 : isTablet ? 22 : 20} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <Text className={`
          text-white font-bold  flex-1
          ${isLargeScreen ? 'text-xl' : isTablet ? 'text-lg' : 'text-base'}
        `}>
          {userName || 'N/A'}
        </Text>
      </View>

      {/* Search Bar - Commented out but responsive when needed */}
      {/* <View className={`
        ${isLargeScreen ? 'px-8 py-4' : isTablet ? 'px-6 py-4' : 'px-4'}
      `}>
        <TextInput
          value={searchTerm}
          onChangeText={(text) => setSearchTerm(text)}
          placeholder="Search by username..."
          placeholderTextColor={'#777'}
          className={`
            border border-gray-600 rounded text-gray-200
            ${isLargeScreen ? 'h-14 px-4 text-lg' : isTablet ? 'h-12 px-4 text-base' : 'h-12 px-2.5 text-sm'}
          `}
        />
      </View> */}

      {/* Tab Container */}
      <View 
        className={`
          flex-row border-t-gray-300 mb-2.5
          ${isLargeScreen ? 'mx-8' : isTablet ? 'mx-6' : ''}
        `}
        style={{ width: isLargeScreen ? 'auto' : isTablet ? screenWidth * 0.6 : screenWidth / 2 }}
      >
        <TouchableOpacity 
          className={`
            flex-1 justify-center items-center
            ${isLargeScreen ? 'h-14 px-6' : isTablet ? 'h-12 px-4' : 'h-11 px-2'}
            ${activeTab === 'followers' ? 'border-b-2 border-brand-yellow' : ''}
          `}
          onPress={() => setActiveTab('followers')}
        >
          <Text className={`
            text-white
            ${isLargeScreen ? 'text-lg font-semibold' : isTablet ? 'text-base font-medium' : 'text-sm'}
          `}>
            Followers
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`
            flex-1 justify-center items-center
            ${isLargeScreen ? 'h-14 px-6' : isTablet ? 'h-12 px-4' : 'h-11 px-2'}
            ${activeTab === 'following' ? 'border-b-2 border-brand-yellow' : ''}
          `}
          onPress={() => setActiveTab('following')}
        >
          <Text className={`
            text-white
            ${isLargeScreen ? 'text-lg font-semibold' : isTablet ? 'text-base font-medium' : 'text-sm'}
          `}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading Skeleton */}
      {loading && currentData.length === 0 && (
        <View className="flex-1">
          {Array.from({ length: isLargeScreen ? 17 : isTablet ? 15 : 13 }).map((_, index) => (
            <SkeletonUserItem key={`skeleton-init-${index}`} />
          ))}
        </View>
      )}

      {/* Main Content List */}
      <View className="flex-1">
        <FlatList
          data={getCurrentData()}
          keyExtractor={(item,index) => index.toString()}
          renderItem={({ item }) => (
            <UserItem 
              user={item} 
              onFollow={handleFollow}  
              onUnfollow={handleUnfollow} 
              isActionVisible={isActionVisible}
            />
          )}
          onScroll={handleScroll}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{
            paddingHorizontal: isLargeScreen ? 16 : isTablet ? 8 : 0,
            // paddingBottom: isLargeScreen ? 32 : isTablet ? 24 : 16,
            // backgroundColor:'red',
          }}
          ListEmptyComponent={
            !loading && currentData.length === 0 && !tabHasMore ? (
              <View className={`
                items-center justify-center
                ${isLargeScreen ? 'py-20' : isTablet ? 'py-16' : 'py-12'}
              `}>
                <Text className={`
                  text-gray-400 text-center
                  ${isLargeScreen ? 'text-lg' : isTablet ? 'text-base' : 'text-sm'}
                `}>
                  No {activeTab} found
                </Text>
              </View>
            ) : null
          }
            ListFooterComponent={()=>(!tabHasMore && currentData.length > 0 && !loading && (
                    <Text className={`
                      text-gray-400 text-center
                      ${isLargeScreen ? 'text-base' :
                       isTablet ? 'text-sm' :
                         'text-sm'  }
                    `}>
                      No more users to show
                    </Text>
                ))}
          refreshing={refresh}
          onRefresh={()=>{
            setRefresh(true)
            if(activeTab=='followers')
            fetchFollowers()
          else
            fetchFollowing()
              setRefresh(false)}}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* No More Users Message */}
      {/* {!tabHasMore && currentData.length > 0 && (
        <View className={`
          items-center py-4
          ${isTablet ? 'py-6' : ''}
        `}>
        
        </View>
      )}/}*/}
        </View> 
 );
 }; 

// Custom hook for responsive utilities specific to this component
export const useFollowersResponsive = () => {
  const { width, height } = Dimensions.get('window');
  
  return {
    width,
    height,
    isTablet: width >= 768,
    isLargeScreen: width >= 1024,
    isSmallScreen: width < 375,
    
    // Get responsive tab width
    getTabContainerWidth: () => {
      if (width >= 1024) return 'auto';
      if (width >= 768) return width * 0.6;
      return width / 2;
    },
    
    // Get responsive skeleton count
    getSkeletonCount: () => {
      if (width >= 1024) return 12;
      if (width >= 768) return 10;
      return 8;
    },
    
    // Get responsive padding classes
    getContainerPadding: () => {
      if (width >= 1024) return 'px-8 py-6';
      if (width >= 768) return 'px-6 py-5';
      return 'px-4 py-4';
    }
  };
};

export default FollowersList;