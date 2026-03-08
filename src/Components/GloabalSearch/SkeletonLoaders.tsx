import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced Shimmer component with smooth animation
const Shimmer = ({ width, height, borderRadius = 8, style = {} }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <View
      style={[
        styles.shimmerContainer,
        { width, height, borderRadius },
        style,
      ]}
    >
      
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

// Modern skeleton components
const ShowSkeleton = () => (
  <View style={styles.showContainer}>
    <Shimmer width="100%" height={120} borderRadius={12} />
    <View style={styles.showContent}>
      <Shimmer width="85%" height={18} borderRadius={4} />
      <Shimmer width="60%" height={14} borderRadius={4} />
      <View style={styles.showMeta}>
        <Shimmer width={40} height={12} borderRadius={6} />
        <Shimmer width={60} height={12} borderRadius={6} />
      </View>
    </View>
  </View>
);

const VideoSkeleton = () => (
  <View style={styles.videoContainer}>
    <Shimmer width="100%" height={120} borderRadius={12} />
    <View style={styles.videoContent}>
      <Shimmer width="90%" height={16} borderRadius={4} />
      <Shimmer width="70%" height={12} borderRadius={4} />
      <View style={styles.videoMeta}>
        <Shimmer width={24} height={24} borderRadius={12} />
        <View style={styles.videoMetaText}>
          <Shimmer width={80} height={10} borderRadius={4} />
          <Shimmer width={60} height={10} borderRadius={4} />
        </View>
      </View>
    </View>
  </View>
);

const ProductSkeleton = () => (
  <View style={styles.productContainer}>
    <Shimmer width="100%" height={140} borderRadius={12} />
    <View style={styles.productContent}>
      <Shimmer width="80%" height={16} borderRadius={4} />
      <View style={styles.productPrice}>
        <Shimmer width={50} height={18} borderRadius={4} />
        <Shimmer width={35} height={14} borderRadius={4} />
      </View>
      <View style={styles.productRating}>
        <Shimmer width={80} height={12} borderRadius={4} />
        <Shimmer width={40} height={12} borderRadius={4} />
      </View>
    </View>
  </View>
);

const UserSkeleton = () => (
  <View style={styles.userContainer}>
    <View style={styles.userRow}>
      <Shimmer width={42} height={40} borderRadius={36} />
      <View style={styles.userInfo}>
        <Shimmer width={120} height={16} borderRadius={4} />
        <Shimmer width={90} height={12} borderRadius={4} />
        <View style={styles.userMeta}>
          {/* <Shimmer width={60} height={10} borderRadius={4} /> */}
          {/* <Shimmer width={40} height={10} borderRadius={4} /> */}
        </View>
      </View>
    </View>
    {/* <Shimmer width={80} height={32} borderRadius={16} /> */}
  </View>
);

const TabItemSkeleton = () => (
  <View style={styles.tabItemContainer}>
    <View style={styles.tabRow}>
      <Shimmer width={24} height={24} borderRadius={12} />
      <View style={styles.tabContent}>
        <Shimmer width={100} height={16} borderRadius={4} />
        <Shimmer width={80} height={12} borderRadius={4} />
      </View>
    </View>
    <Shimmer width={30} height={20} borderRadius={10} />
  </View>
);

const SkeletonLoader = ({ type, count = 1, columns = 2 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'show':
        return <ShowSkeleton />;
      case 'video':
        return <VideoSkeleton />;
      case 'product':
        return <ProductSkeleton />;
      case 'user':
        return <UserSkeleton />;
      case 'tab-item':
        return <TabItemSkeleton />;
      default:
        return (
          <View style={styles.defaultContainer}>
            <Shimmer width="100%" height={64} />
          </View>
        );
    }
  };

  const getItemWidth = () => {
    const padding = 16;
    const gap = 12;
    if (columns === 1) return '100%';
    if (columns === 2) return `${(100 - padding) / 2}%`;
    if (columns === 3) return `${(100 - padding * 2) / 3}%`;
    return `${100 / columns}%`;
  };

  return (
    <View style={styles.loaderContainer}>
      <View style={[styles.grid, { gap: type === 'user' ? 8 : 12 }]}>
        {Array(count)
          .fill()
          .map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.skeletonWrapper,
                { width: getItemWidth() },
                (type === 'user' )&& styles.userWrapper,
              ]}
            >
              {/* {console.log(getItemWidth)} */}
              {renderSkeleton()}
            </View>
          ))}
      </View>
    </View>
  );
};

const LoadingGrid = ({ type, count = 16, columns = 3 }) => {
  return (
    <SafeAreaView style={styles.loadingGrid}>
      {/* <View className='container rounded-full border-1 border-gray-700  border' style={{width:'90%',alignSelf:'center'}}><Text className='text-gray-500'>Search</Text></View> */}
      <SkeletonLoader type={type} count={count} columns={columns} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Shimmer styles
  shimmerContainer: {
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmerGradient: {
    width: 350,
    height: '100%',
  },

  // Layout styles
  loaderContainer: {
    // paddingHorizontal: 8,
    // backgroundColor:'yellow',
    // paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // backgroundColor:'#fff',
    // marginTop:-10,
    justifyContent: 'space-evenly',
  },
  loadingGrid: {
    flex: 1,
    // padding:10
    // paddingTop:-10,
    // backgroundColor:'red'
  },
  skeletonWrapper: {
    marginBottom: 16,
    // backgroundColor:'#fff'
    // width:200
  },
  userWrapper: {
    width: '100%',
    flexDirection:'column'
  },

  // Show skeleton styles
  showContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    width:150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  showContent: {
    padding: 12,
    gap: 8,
  },
  showMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },

  // Video skeleton styles
  videoContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  videoContent: {
    padding: 10,
    gap: 6,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  videoMetaText: {
    gap: 4,
  },

  // Product skeleton styles
  productContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productContent: {
    padding: 12,
    gap: 8,
  },
  productPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // User skeleton styles
  userContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    gap: 6,
    flex: 1,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 12,
  },

  // Tab item skeleton styles
  tabItemContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabContent: {
    marginLeft: 12,
    gap: 6,
  },

  // Default skeleton styles
  defaultContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
});

export { SkeletonLoader, LoadingGrid };