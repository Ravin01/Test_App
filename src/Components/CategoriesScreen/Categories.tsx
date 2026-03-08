/* eslint-disable react/no-unstable-nested-components */
import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
  Image,
  ScrollView,
  InteractionManager,
  BackHandler,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {colors} from '../../Utils/Colors';
import {AWS_CDN_URL} from '../../../Config';
import {  SafeAreaView } from 'react-native-safe-area-context';
import {Toast} from '../../Utils/dateUtils';
import { useFocusEffect } from '@react-navigation/native';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import axiosInstance from '../../Utils/Api';
import { Fashion, Beauty, Sports, Gifts, BabyKids, Electronics,
   HomeLiving, Food, Health, Books, Automobiles, Industrial, Pets, Gaming, Tools, Construction, Misc, Luxury, fashion } from '../../assets/assets';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import RBSheet from "react-native-raw-bottom-sheet";
//import { useStreamEventCallbacks } from '../../Context/StreamEventContext';
import { useStreamEventTimestamps } from '../../Context/StreamEventContext';


const {width, height} = Dimensions.get('window');
// const categories = [
//   { id: 1, name: "Fashion & Accessories", iconPath: Fashion },
//   { id: 2, name: "Beauty & Personal Care", iconPath: Beauty },
//   { id: 3, name: "Sports & Fitness", iconPath: Sports },
//   { id: 4, name: "Gifts & Festive Needs", iconPath: Gifts },
//   { id: 5, name: "Baby & Kids", iconPath: BabyKids },
//   { id: 6, name: "Electronics & Gadgets", iconPath: Electronics },
//   { id: 7, name: "Home & Living", iconPath: HomeLiving },
//   { id: 8, name: "Food & Beverages", iconPath: Food },
//   { id: 9, name: "Health & Wellness", iconPath: Health },
//   { id: 10, name: "Books, Hobbies & Stationery", iconPath: Books },
//   { id: 11, name: "Automobiles & Accessories", iconPath: Automobiles },
//   { id: 12, name: "Industrial & Scientific", iconPath: Industrial },
//   { id: 13, name: "Pets", iconPath: Pets },
//   { id: 14, name: "Gaming", iconPath: Gaming },
//   { id: 15, name: "Tools & Hardware", iconPath: Tools },
//   { id: 16, name: "Construction Materials", iconPath: Construction },
//   { id: 17, name: "Miscellaneous", iconPath: Misc },
//   { id: 18, name: "Luxury & Collectibles", iconPath: Luxury },
// ];

const categories = [
  { id: 1, name: "Fashion & Accessories", iconText: '👗' },
  { id: 2, name: "Beauty & Personal Care", iconText: '💄' },
  { id: 3, name: "Sports & Fitness", iconText: '⚽' },
  { id: 4, name: "Gifts & Festive Needs", iconText: '🎁' },
  { id: 5, name: "Baby & Kids", iconText: '👶' },
  { id: 6, name: "Electronics & Gadgets", iconText: '📱' },
  { id: 7, name: "Home & Living", iconText: '🏠' },
  { id: 8, name: "Food & Beverages", iconText: '🍔' },
  { id: 9, name: "Health & Wellness", iconText: '🩺' },
  { id: 10, name: "Books, Hobbies & Stationery", iconText: '📚' },
  { id: 11, name: "Automobiles & Accessories", iconText: '🚗' },
  { id: 12, name: "Industrial & Scientific", iconText: '🔬' },
  { id: 13, name: "Pets", iconText: '🐾' },
  { id: 14, name: "Gaming", iconText: '🎮' },
  { id: 15, name: "Tools & Hardware", iconText: '🛠️' },
  { id: 16, name: "Construction & Building Materials", iconText: '🏗️' },
  { id: 17, name: "Miscellaneous", iconText: '📦' },
  { id: 18, name: "Luxury & Collectibles", iconText: '💎'  },
];


// 🔧 Header extracted as a standalone component
const Header = ({
  searchQuery,
  handleSearchChange,
  clearSearch,
  inputRef,
  navigation,
  onOpenFilter,
}) => (
  <>
    {/*
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
      </TouchableOpacity>
      <LinearGradient
        colors={['#B38728', '#FF6B00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>All Categories</Text>
        </View>
      </LinearGradient>
    </View>
  */}
    <View style={styles.searchContainer}>
      <Ionicons
        name="search"
        size={20}
        color="#fff"
        style={styles.searchIcon}
      />
      {/* <TouchableOpacity style={styles.searchBtn}><Icon name="magnify" size={14} color="#fff" /></TouchableOpacity> */}
      <TextInput
        ref={inputRef}
        style={styles.searchInput}
        placeholder="Search/filter your categories"
        placeholderTextColor="#8B8B8B"
        onChangeText={handleSearchChange}
        value={searchQuery}
        autoCorrect={false}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearSearch}
          activeOpacity={0.7}>
          <Ionicons name="close-circle" size={20} color="#8B8B8B" />
        </TouchableOpacity>
      )}
       
      <TouchableOpacity onPress={onOpenFilter} style={styles.filterButton} activeOpacity={0.7}>
      <Ionicons name="options-outline" size={20} color="#8B8B8B" />
      </TouchableOpacity>
    </View>
  </>
);


const seed = (arr) => arr.map((i, idx) => ({ id: String(idx), ...i }));

const TRENDING = seed([
  { rank: 1, term: 'Silk saree', searches: '', momentum: '↑0%' },
  { rank: 2, term: 'iPhone 15', searches: '', momentum: '↑0%' },
  { rank: 3, term: 'Bags', searches: '', momentum: '↑0%' },
  { rank: 4, term: 'Makeup kit', searches: '', momentum: '↑0%' },
]);

// 💡 Load More button component for live shows
const LoadMoreLiveButton = ({isLoading, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={isLoading}
    style={styles.liveItem}
    activeOpacity={0.7}>
    <LinearGradient
      colors={[
        'rgba(255, 0, 0, 0.1)',
        'rgba(0, 0, 0, 0.6)',
      ]}
      style={StyleSheet.absoluteFillObject}
    />
    <View style={styles.loadMoreContent}>
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadMoreText}>Loading...</Text>
        </>
      ) : (
        <>
          <Ionicons name="add-circle" size={40} color="#FFD700" />
          <Text style={styles.loadMoreText}>Load More</Text>
        </>
      )}
    </View>
  </TouchableOpacity>
);

const CategoriesScreen = ({navigation}) => {
 const debounceTimerRef = useRef(null);
  const inputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [filteredCategories, setFilteredCategories] = useState(categories);

const refRBSheet = useRef();
const [selectedFilter, setSelectedFilter] = useState("global");
const [selectedCategory, setSelectedCategory] = useState(null);

  const [live, setLive] = useState([]);
  const [livePage, setLivePage] = useState(1);
  const [hasMoreLive, setHasMoreLive] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [liveCount, setLiveCount] = useState(342);
  const [refreshing, setRefreshing] = useState(false);

   const handleSelect = (value) => {
    setSelectedFilter(value);
    refRBSheet.current.close(); // close sheet after selection
  };

  // --- API Fetching Logic --- Not Used
  // useEffect(() => {
  //   const fetchCategories = async () => {
  //     try {
  //       const response = await axiosInstance.get('categories/get');
  //       console.log('category res====', response.data);
  //      // setCategories(response.data || []);
  //     } catch (err) {
  //      // setError("Failed to fetch categories.");
  //     } finally {
  //      // setLoading(false);
  //     }
  //   };
  //   fetchCategories();
  // }, []);

  // console.log('categories', categories);

  //   useEffect(() => {
  //   const fetchCategories = async () => {
  //     try {
  //       const response = await axiosInstance.get('categories/get');
  //       const apiCategories = response.data || [];

  //       console.log('categories res====', apiCategories);

  //       // Merge local iconText with API data
  //       const merged = apiCategories.map(apiCat => {
  //         const localCat = localCategories.find(lc => lc.name === apiCat.categoryName);
  //         return {
  //           ...apiCat,
  //           iconText: localCat ? localCat.iconText : '❓', // fallback emoji
  //         };
  //       });

  //       setCategories(merged);
  //     } catch (err) {
  //       console.log('Failed to fetch categories', err);
  //     }
  //   };
  //   fetchCategories();
  // }, []);

  // --- API Live Fetching Logic ---
useEffect(() => {
  const fetchLive = async () => {
    try {
      const response = await axiosInstance.get('/search/shows', {
        params: {
          page: 1,
          limit: 20,
        },
      });

      setLive(response.data?.data || []);
      setLivePage(1);
      setHasMoreLive(response.data?.data?.length >= 5);
    } catch (err) {
      console.log('Error fetching initial live shows', err);
    }
  };

  fetchLive();
}, []);

  // --- Load More Live Shows ---
  const loadMoreLiveShows = useCallback(async () => {
    if (isLoadingMore || !hasMoreLive) return;

    setIsLoadingMore(true);
    try {
      const nextPage = livePage + 1;
      const response = await axiosInstance.get('/search/shows', {
        params: {
          page: nextPage,
          limit: 20,
        },
      });

      const newData = response.data?.data || [];
     // console.log('Load more live shows res====', newData);

      if (newData.length > 0) {
        setLive(prevLive => [...prevLive, ...newData]);
        setLivePage(nextPage);
        setHasMoreLive(newData.length >= 5);
      } else {
        setHasMoreLive(false);
      }
    } catch (err) {
      console.log('Error loading more', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [livePage, isLoadingMore, hasMoreLive]);

  // 🔄 Pull to Refresh Handler
  const handleRefresh = useCallback(async () => {
    // Prevent refresh if already loading more or currently refreshing
    if (isLoadingMore || refreshing) return;

    setRefreshing(true);
    try {
      // Fetch fresh data from page 1
      const response = await axiosInstance.get('/search/shows', {
        params: {
          page: 1,
          limit: 20,
        },
      });

      const newData = response.data?.data || [];
      
      // Update state with fresh data
      setLive(newData);
      setLivePage(1);
      setHasMoreLive(newData.length >= 5);
      
      // Note: We preserve selectedFilter, selectedCategory, searchQuery, and showAll
    } catch (err) {
      console.log('Error refreshing live shows', err);
      Toast('Failed to refresh. Please try again.');
      // Preserve existing data on error
    } finally {
      setRefreshing(false);
    }
  }, [isLoadingMore, refreshing]);

  const { lastStreamLiveAt, lastStreamEndedAt } = useStreamEventTimestamps();

useEffect(() => {
  if (lastStreamLiveAt || lastStreamEndedAt) {
    handleRefresh();
  }
}, [lastStreamLiveAt, lastStreamEndedAt]);


    // 🎯 Use stream events hook for real-time updates
  // This will refresh live shows when streams go live or end
  // const { registerStreamCallbacks } = useStreamEventCallbacks();
  
  // useEffect(() => {
  //   const unsubscribe = registerStreamCallbacks({
  //     onStreamLive: handleRefresh,
  //     onStreamEnded: handleRefresh,
  //   });
    
  //   return unsubscribe;
  // }, []);


  // 💡 Updated filteredLive: Removes duplicates
  const filteredLive = useMemo(() => {
    let filtered = live;

    if (selectedFilter === 'local' && selectedCategory) {
      filtered = live.filter(
        item =>
          item?.category?.toLowerCase() === selectedCategory?.toLowerCase(),
      );
    }

    // Remove duplicates
    filtered = filtered.filter(
      (item, index, self) => index === self.findIndex(t => t._id === item._id),
    );

    return filtered;
  }, [live, selectedFilter, selectedCategory]);

  useEffect(() => {
  if (selectedFilter === "global") {
    setSelectedCategory(null); // reset when back to global
  }
}, [selectedFilter]);


  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 500);
  }, []);

  useEffect(() => {
    return () => debounceTimerRef.current && clearTimeout(debounceTimerRef.current);
  }, []);

  useEffect(() => {
    setFilteredCategories(
      categories.filter(item =>
        item.name.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    );
  }, [debouncedQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  const [showAll, setShowAll] = useState(false);
  const displayedCategories = showAll
  ? [...filteredCategories, { id: 'less', name: 'Show Less', isToggle: true }]
  : [
      ...filteredCategories.slice(0, 15),
      ...(filteredCategories.length > 15 ? [{ id: 'more', name: 'More', isToggle: true }] : []),
    ];

  const handleCategoryPress = useCallback((category) => {

    if (category?.isToggle) {
    setShowAll(prev => !prev);
    return;
  }

    if (selectedFilter === "local") {
    // ✅ Just store the category instead of navigating
    setSelectedCategory(category?.name);
  } else {
    // ✅ Global filter → normal navigation
    navigation.navigate('GlobalSearch', {
      categories: category?.name,
      tabName: 'products',
      source: 'categories', // ✅ Pass source parameter for back navigation
    });
  }
  }, [navigation, selectedFilter]);


  const renderLiveItem = ({ item }) => {
    // Safety check for empty items
    if (!item || !item._id) return null;

    return(
    <TouchableOpacity  onPress={() => {
                // if (item?.isLive) {
                  navigation.navigate('LiveScreen', {stream: item});
                // } else {
                //   Toast(
                //     'This show is not live yet'
                //   );
                //   // setShowOverlay(true);
                //   // navigation.navigate('UpcomingShowDetail', {
                //   //   id: item._id,
                //   //   hostId: item.hostId,
                //   // });
                //   navigation.navigate('LiveScreen', {stream: item});
                // }
              }}
               style={styles.liveItem}>
              <Image
       source={{uri: `${AWS_CDN_URL}${item?.thumbnailImage}`}}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={[styles.liveBadge,!item?.isLive && {backgroundColor:'#333'}]}>

        <View style={[styles.liveBadgeDot]} />
        <Text style={styles.liveBadgeText}>{item?.isLive?'LIVE':'Upcoming'}</Text>
      </View>
      {/* <View style={styles.liveViewers}><Text style={styles.liveViewersText}>{item.viewers}</Text></View> */}
      <View style={styles.liveInfo}>
        <Text style={styles.liveCategory} 
        numberOfLines={1}
  ellipsizeMode="tail"
        >{item.category}</Text>
        <Text style={styles.liveSeller}
        numberOfLines={1}
  ellipsizeMode="tail">{item.title}</Text>
      </View>
    </TouchableOpacity>
  )};

    const renderTrendingCard = ({ item }) => (
    <TouchableOpacity onPress={()=>navigation.navigate('GlobalSearch',{categories: item?.term ,tabName: 'products'})} style={styles.trendingCard} activeOpacity={0.85}>
      <Text style={styles.trendingRank}>#{item.rank}</Text>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingTerm}>{item.term}</Text>
        <Text style={styles.trendingStats}>{item.searches} searches</Text>
      </View>
      <Text style={styles.trendingMomentum}>{item.momentum}</Text>
    </TouchableOpacity>
  );


  // ✅ BackHandler to navigate to Home tab when back is pressed on Categories screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Navigate to Home tab
        navigation.navigate('Home');
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => backHandler.remove();
    }, [navigation])
  );

  const CategoryItem = React.memo(({item, isSelected=false}) => {
    const isToggle = item.isToggle;
    return(
    <TouchableOpacity
      //  style={styles.categoryContainer}
      activeOpacity={0.7}
      onPress={() => handleCategoryPress(item)}>
      <LinearGradient
        colors={
          selectedCategory===item?.name
            ? ['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.2)']
            : ['rgba(255,255,255,0)', 'rgba(255,255,245,0.1)']   //'rgba(245,245,245,0.29)'
        }
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
        style={[styles.categoryContainer, selectedCategory===item?.name && {
    borderColor: '#FFD700',
    borderWidth: 0.2}]}>
          {/* {console.log(item.iconPath)} */}
        <View
          style={[
            styles.imageWrapper,
            isSelected && {backgroundColor: 'rgba(0, 0, 0, 0.5)'},
          ]}>
          {isToggle ? (
            <Ionicons
              name={item.id === 'more' ? 'add-circle-outline' : 'remove-circle-outline'}
              size={28}
              color="#FFD700"
            />
          ) :(
          // <FastImage
          //   source={{uri:item.iconPath}}
          //   style={styles.categoryImage}
          //   resizeMode={FastImage.resizeMode.contain}
          // />
          <Text style={{fontSize: 24}} allowFontScaling = {false}>{item?.iconText}</Text>
          )}
        </View>
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.selectedCategoryLabel,
          ]}
          allowFontScaling = {false}
          numberOfLines={1}
          ellipsizeMode="tail">
          {item.name}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )});

  return (
    // <SafeAreaView style={{flex: 1, backgroundColor:'#121212'}} edges={['top']}>
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidContainer}
        keyboardVerticalOffset={Platform.select({ios: 60, android: 0})}>
        <FlatList
         // data={filteredCategories}
          data= {displayedCategories}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FFD700']} // Android
              tintColor="#FFD700" // iOS
              title="Pull to refresh" // iOS
              titleColor="#FFD700" // iOS
            />
          }
          ListHeaderComponent={
            <>
            <Header
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
              clearSearch={clearSearch}
              inputRef={inputRef}
              navigation={navigation}
              onOpenFilter={() => refRBSheet.current.open()}
            />
           <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>⚡</Text>
                  <Text style={styles.sectionTitle}>Top Categories</Text>
                  <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>LIVE</Text></View>
                </View>
                {/* <TouchableOpacity onPress={()=>navigation.navigate('GlobalSearch')}>
                <Text style={styles.seeAll}>All →</Text>
                </TouchableOpacity> */}
              </View>
            </>
          }
          renderItem={({item}) => (
            <CategoryItem
              item={item}
              // isSelected={selectedCategory === item.value}
            />
          )}
          numColumns={4}
          contentContainerStyle={styles.categoriesGrid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
          ListFooterComponent={
            <>
            { true
           // Array.isArray(live) && live?.length>0 
            &&
            (<View style={styles.liveDiscovery}>
              <View style={styles.liveHeader}>
                <View style={styles.liveTitleRow}>
                  <Text style={styles.liveEmoji}>🔴</Text>
                  <Text style={styles.liveTitle}>Live in Categories</Text>
                  {/* <View style={styles.liveCount}><Text style={styles.liveCountText}>{'0'}</Text></View> */}
                </View>
                <TouchableOpacity onPress={()=>navigation.navigate('GlobalSearch', {tabcategoryName: 'shows'})} >
                <Text style={[styles.seeAll, { fontSize: 10 }]}>View all →</Text>
                </TouchableOpacity>
              </View>

              {Array.isArray(filteredLive) && filteredLive?.length > 0 ? (<FlatList
               data={filteredLive}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderLiveItem}
                keyExtractor={(item, index) => item._id?.toString() || `item-${index}`}
                scrollEnabled={true}
                ListFooterComponent={() =>
                  hasMoreLive ? (
                    <LoadMoreLiveButton
                      isLoading={isLoadingMore}
                      onPress={loadMoreLiveShows}
                    />
                  ) : null
                }
                // 🚀 Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={7}
                initialNumToRender={5}
                updateCellsBatchingPeriod={50}
                ListFooterComponentStyle={{marginRight: 10}}
              />):(
                <View style={{backgroundColor:'black',flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
     <Ionicons name="videocam-off-outline" size={50} color="gray" style={{ marginBottom: 10 }} />
      {selectedCategory ? <Text style={{  textAlign:'center', fontSize: 14, color: 'gray' }}>No live shows available in {`\n`}{selectedCategory}</Text>:
      <Text style={{  textAlign:'center', fontSize: 14, color: 'gray' }}>No live shows available</Text>
      }
    </View>
              )}
            </View>)}

            {/* <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>📈</Text>
                  <Text style={styles.sectionTitle}>Trending Searches</Text>
                </View>
              </View>

              <FlatList
                data={TRENDING}
                renderItem={renderTrendingCard}
                keyExtractor={(i) => i.id}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-around' }}
                scrollEnabled={false}
              />
            </View> */}


            <View style={styles.footer} />
            </>
        }
        />

         {/* Bottom Sheet */}
      <RBSheet
        ref={refRBSheet}
        closeOnPressBack={true}
        height={200}
        openDuration={250}
        customStyles={{
          container: {
            backgroundColor: "#1A1A1A", 
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          },
           wrapper: {
      backgroundColor: "rgba(0,0,0,0.6)", // dim background overlay
    },
    draggableIcon: {
      backgroundColor: "#666",          // gray drag handle
    },
        }}
      >
        <Text style={styles.sheetTitle}>Choose Filter</Text>

        {/* Local Filter */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handleSelect("local")}
        >
          <Ionicons
            name={selectedFilter === "local" ? "radio-button-on" : "radio-button-off"}
            size={20}
             color="#FFD700"
          />
          <Text style={styles.optionText}>Local Filter</Text>
        </TouchableOpacity>

        {/* Global Filter */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => handleSelect("global")}
        >
          <Ionicons
            name={selectedFilter === "global" ? "radio-button-on" : "radio-button-off"}
            size={20}
            color="#FFD700"
          />
          <Text style={styles.optionText}>Global Filter</Text>
        </TouchableOpacity>
      </RBSheet>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  keyboardAvoidContainer: {},
  header: {
    flexDirection: 'row',
    marginTop: Platform.select({ios: 10, android: height * 0.02}),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: height * 0.015,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFC100', //'#B38728',
    paddingHorizontal: width * 0.025,
    marginHorizontal: width * 0.05,
    marginBottom: 36,
    paddingTop: 1,
  },
  searchIcon: {
    marginRight: width * 0.02,
  },
  searchInput: {
    flex: 1,
    height: height * 0.04,
    color: 'white',
    paddingVertical: 8,
    // marginHorizontal:20,
    // paddingHorizontal:20,
  },
  clearButton: {
    padding: 5,
    marginRight: 5,
  },
  filterButton: {
    padding: 5,
  },
  categoriesGrid: {
    // paddingBottom: height * 0.05,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.013,
    gap: width * 0.03,
  },
  categoryContainer: {
    width: (width - width * 0.08 * 2) / 4,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: height * 0.015,
    //backgroundColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryImage: {
    width: '80%',
    height: '80%',
    borderRadius: 10,
  },
  footer: {
    height: height * 0.1,
  },

  imageWrapper: {
    width: '50%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1000, // large number to ensure it's a circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    padding: 4,
  },
  categoryLabel: {
    color: 'white',
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  selectedCategoryLabel: {
    color: '#000', //'#f7ce45',    //'#FF6B00',
  },
  gradientBorder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)', // transparent to show the gradient border
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F7CE45',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionHeader: {paddingHorizontal:20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionEmoji: { marginRight: 6, fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sectionBadge: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  sectionBadgeText: { color: '#000', fontWeight: '900', fontSize: 10 },
  seeAll: { color: '#FFD700', fontWeight: '600', fontSize: 11 },

  searchBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700', marginLeft: 4 },
  searchIconBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },

  liveDiscovery: { backgroundColor: 'rgba(255,0,64,0.03)', marginHorizontal: 10, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', marginBottom: 15 },
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  liveTitleRow: { flexDirection: 'row', alignItems: 'center' },
  liveEmoji: { marginRight: 6 },
  liveTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },
  liveCount: { backgroundColor: '#ff0040', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  liveCountText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  liveGrid: {},
  liveItem: { overflow: 'hidden',marginRight: 10, backgroundColor: '#141414', borderRadius: 10, aspectRatio: 3 / 4, width: (width - 20 - 6 * 2) / 3, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,0,64,0.2)', position: 'relative' },
  liveBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#ff0040', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  liveBadgeDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3, marginRight: 6 },
  liveBadgeText: { color: '#fff', fontWeight: '700', fontSize: 8 },
  liveViewers: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  liveViewersText: { color: '#fff', fontSize: 10 },
  liveInfo: { borderBottomStartRadius: 10,borderBottomEndRadius: 10,position: 'absolute', bottom: -2, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.7)' },
  liveCategory: { color: '#FFD700', fontWeight: '700', fontSize: 10 },
  liveSeller: { color: '#888', fontSize: 9 },

  // Load More Button Styles
  loadMoreContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadMoreText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  trendingCard: { backgroundColor: '#141414', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: (width - 20 - 8) / 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendingRank: { fontSize: 16, fontWeight: '900',color:'#FFD700' },
  trendingInfo: { flex: 1, marginLeft: 8 },
  trendingTerm: { fontSize: 11, fontWeight: '600', color: '#fff' },
  trendingStats: { fontSize: 9, color: '#888' },
  trendingMomentum: { fontSize: 10, color: '#FFD700', fontWeight: '700' },

  thumbnail: {
    width: '100%',
    height: 120,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#fff",    
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
   color: "#fff",    
    marginLeft: 10,
  },

    deepdiveTabs: { marginBottom: 10 },
  deepdiveTab: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 6 },
  deepdiveTabActive: { backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  deepdiveTabText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  deepdiveItem: { backgroundColor: '#141414', borderRadius: 10, padding: 8, width: (width - 20 - 6 * 2) / 3, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  deepdiveCount: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  deepdiveCountText: { color: '#888', fontSize: 9 },
  deepdiveName: { marginTop: 6, fontSize: 9, fontWeight: '600', color: '#fff' },
});

export default CategoriesScreen;

/***************************************
Product with subcategory added in below code. Commented because of no subcategory field in product data to filer
**************************************** */

// /* eslint-disable react/no-unstable-nested-components */
// import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   Dimensions,
//   Platform,
//   Keyboard,
//   KeyboardAvoidingView, ActivityIndicator,
//   FlatList, Image, ScrollView,
//   InteractionManager,
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import LinearGradient from 'react-native-linear-gradient';
// import FastImage from 'react-native-fast-image';
// import { colors } from '../../Utils/Colors';
// import { AWS_CDN_URL } from '../../../Config';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Toast } from '../../Utils/dateUtils';
// // Responsive Design Imports
// import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
// import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
// import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
// import axiosInstance from '../../Utils/Api';
// import {
//   Fashion, Beauty, Sports, Gifts, BabyKids, Electronics,
//   HomeLiving, Food, Health, Books, Automobiles, Industrial, Pets, Gaming, Tools, Construction, Misc, Luxury, fashion
// } from '../../assets/assets';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import axios from 'axios';
// import RBSheet from "react-native-raw-bottom-sheet";

// const { width, height } = Dimensions.get('window');
// // const categories = [
// //   { id: 1, name: "Fashion & Accessories", iconPath: Fashion },
// //   { id: 2, name: "Beauty & Personal Care", iconPath: Beauty },
// //   { id: 3, name: "Sports & Fitness", iconPath: Sports },
// //   { id: 4, name: "Gifts & Festive Needs", iconPath: Gifts },
// //   { id: 5, name: "Baby & Kids", iconPath: BabyKids },
// //   { id: 6, name: "Electronics & Gadgets", iconPath: Electronics },
// //   { id: 7, name: "Home & Living", iconPath: HomeLiving },
// //   { id: 8, name: "Food & Beverages", iconPath: Food },
// //   { id: 9, name: "Health & Wellness", iconPath: Health },
// //   { id: 10, name: "Books, Hobbies & Stationery", iconPath: Books },
// //   { id: 11, name: "Automobiles & Accessories", iconPath: Automobiles },
// //   { id: 12, name: "Industrial & Scientific", iconPath: Industrial },
// //   { id: 13, name: "Pets", iconPath: Pets },
// //   { id: 14, name: "Gaming", iconPath: Gaming },
// //   { id: 15, name: "Tools & Hardware", iconPath: Tools },
// //   { id: 16, name: "Construction Materials", iconPath: Construction },
// //   { id: 17, name: "Miscellaneous", iconPath: Misc },
// //   { id: 18, name: "Luxury & Collectibles", iconPath: Luxury },
// // ];

// const localCategories = [
//   { id: 1, name: "Fashion & Accessories", iconText: '👗' },
//   { id: 2, name: "Beauty & Personal Care", iconText: '💄' },
//   { id: 3, name: "Sports & Fitness", iconText: '⚽' },
//   { id: 4, name: "Gifts & Festive Needs", iconText: '🎁' },
//   { id: 5, name: "Baby & Kids", iconText: '👶' },
//   { id: 6, name: "Electronics & Gadgets", iconText: '📱' },
//   { id: 7, name: "Home & Living", iconText: '🏠' },
//   { id: 8, name: "Food & Beverages", iconText: '🍔' },
//   { id: 9, name: "Health & Wellness", iconText: '🩺' },
//   { id: 10, name: "Books, Hobbies & Stationery", iconText: '📚' },
//   { id: 11, name: "Automobiles & Accessories", iconText: '🚗' },
//   { id: 12, name: "Industrial & Scientific", iconText: '🔬' },
//   { id: 13, name: "Pets", iconText: '🐾' },
//   { id: 14, name: "Gaming", iconText: '🎮' },
//   { id: 15, name: "Tools & Hardware", iconText: '🛠️' },
//   { id: 16, name: "Construction & Building Materials", iconText: '🏗️' },
//   { id: 17, name: "Miscellaneous", iconText: '📦' },
//   { id: 18, name: "Luxury & Collectibles", iconText: '💎' },
// ];


// // 🔧 Header extracted as a standalone component
// const Header = ({
//   searchQuery,
//   handleSearchChange,
//   clearSearch,
//   inputRef,
//   navigation,
//   onOpenFilter,
// }) => (
//   <>
//     {/*
//     <View style={styles.header}>
//       <TouchableOpacity 
//         style={styles.backButton} 
//         onPress={() => navigation.goBack()}
//         activeOpacity={0.7}
//       >
//         <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
//       </TouchableOpacity>
//       <LinearGradient
//         colors={['#B38728', '#FF6B00']}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 1 }}
//         style={styles.headerGradient}
//       >
//         <View style={styles.titleContainer}>
//           <Text style={styles.title}>All Categories</Text>
//         </View>
//       </LinearGradient>
//     </View>
// 	*/}
//     <View style={styles.searchContainer}>
//       <Ionicons
//         name="search"
//         size={20}
//         color="#fff"
//         style={styles.searchIcon}
//       />
//       {/* <TouchableOpacity style={styles.searchBtn}><Icon name="magnify" size={14} color="#fff" /></TouchableOpacity> */}
//       <TextInput
//         ref={inputRef}
//         style={styles.searchInput}
//         placeholder="Search/filter your categories"
//         placeholderTextColor="#8B8B8B"
//         onChangeText={handleSearchChange}
//         value={searchQuery}
//         autoCorrect={false}
//         returnKeyType="search"
//         autoCapitalize="none"
//       />
//       {searchQuery.length > 0 && (
//         <TouchableOpacity
//           style={styles.clearButton}
//           onPress={clearSearch}
//           activeOpacity={0.7}>
//           <Ionicons name="close-circle" size={20} color="#8B8B8B" />
//         </TouchableOpacity>
//       )}

//       <TouchableOpacity onPress={onOpenFilter} style={styles.filterButton} activeOpacity={0.7}>
//         <Ionicons name="options-outline" size={20} color="#8B8B8B" />
//       </TouchableOpacity>
//     </View>
//   </>
// );


// const seed = (arr) => arr.map((i, idx) => ({ id: String(idx), ...i }));

// const TRENDING = seed([
//   { rank: 1, term: 'Silk saree', searches: '4', momentum: '↑234%' },
//   { rank: 2, term: 'iPhone 15', searches: '4', momentum: '↑156%' },
//   { rank: 3, term: 'Bags', searches: '3', momentum: '↑89%' },
//   { rank: 4, term: 'Makeup kit', searches: '5', momentum: '↑67%' },
// ]);

// const CategoriesScreen = ({ navigation }) => {
//   const debounceTimerRef = useRef(null);
//   const inputRef = useRef(null);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [debouncedQuery, setDebouncedQuery] = useState('');

//   const [allProducts, setAllProducts] = useState([]);
//   const [products, setProducts] = useState([]);

//   console.log('filtered products', products);

//   const [categories, setCategories] = useState([]);

//   const [selectedSubcategory, setSelectedSubCategory] = useState(null);

//   const [loading, setLoading] = useState(false);

//   const [filteredCategories, setFilteredCategories] = useState(categories);

//   const refRBSheet = useRef();
//   const [selectedFilter, setSelectedFilter] = useState("global");
//   const [selectedCategory, setSelectedCategory] = useState(null);

//   const [live, setLive] = useState([]);
//   const [liveCount, setLiveCount] = useState(342);

//   const handleSelect = (value) => {
//     setSelectedFilter(value);
//     refRBSheet.current.close(); // close sheet after selection
//   };

//   // --- API Fetching Logic --- Not Used
//   // useEffect(() => {
//   //   const fetchCategories = async () => {
//   //     try {
//   //       const response = await axiosInstance.get('categories/get');
//   //       console.log('category res====', response.data);
//   //      // setCategories(response.data || []);
//   //     } catch (err) {
//   //      // setError("Failed to fetch categories.");
//   //     } finally {
//   //      // setLoading(false);
//   //     }
//   //   };
//   //   fetchCategories();
//   // }, []);


//   useEffect(() => {

//     const fetchCategories = async () => {
//       setLoading(true); // start loading
//       try {
//         const response = await axiosInstance.get('categories/get');
//         const apiCategories = response.data || [];

//         // console.log('categories res====', apiCategories);

//         // Merge local iconText with API data
//         const merged = apiCategories.map(apiCat => {
//           const localCat = localCategories.find(lc => lc.name === apiCat.categoryName);
//           return {
//             ...apiCat,
//             iconText: localCat ? localCat.iconText : '❓', // fallback emoji
//           };
//         });

//         setCategories(merged);
//       } catch (err) {
//         console.log('Failed to fetch categories', err);
//       }
//       finally {
//         setLoading(false); // start loading
//       }
//     };
//     fetchCategories();
//   }, []);

//   // --- API Live Fetching Logic ---
//   useEffect(() => {
//     const fetchLive = async () => {
//       try {
//         const response = await axiosInstance.get('/search/shows', {
//           params: {
//             page: 0,
//             limit: 30,
//           },
//         });

//         // console.log('Live shows res====', response.data);
//         setLive(response.data?.data || []);
//       } catch (err) {
//         console.log('Error', err);
//       }
//     };

//     fetchLive();
//   }, []); // ✅ run once on mount

//   // --- API Product Fetching Logic ---
//   useEffect(() => {
//     const fetchProduct = async () => {
//       try {
//         const response = await axiosInstance.get('/search/products', {
//           params: {
//             page: 0,
//             limit: 20,
//           },
//         });

//         // console.log('Products res====', response.data);
//         setAllProducts(response.data?.data || []);
//         setProducts(response.data?.data || []); // default
//       } catch (err) {
//         console.log('Error', err);
//       }
//     };

//     fetchProduct();
//   }, []); // ✅ run once on mount

//   // useEffect(() => {
//   //   let filtered = allProducts;

//   //   if (selectedCategory) {
//   //     filtered = filtered.filter(
//   //       (p) =>
//   //         p.category &&
//   //         p.category.toLowerCase().trim() === selectedCategory?.categoryName?.toLowerCase().trim()
//   //     );
//   //   }

//   //   console.log('selectedSubcategory', selectedSubcategory);

//   //   if (selectedSubcategory) {
//   //     filtered = filtered.filter(
//   //       (p) =>
//   //         p.subCategory &&
//   //         p.subCategory.toLowerCase().trim() === selectedSubcategory.toLowerCase().trim()
//   //     );
//   //   }

//   //   console.log("filtered products ===>", filtered?.length, filtered);
//   //   setProducts(filtered);
//   // }, [selectedCategory, selectedSubcategory, allProducts]);

// // Fixed useEffect for product filtering
// useEffect(() => {
//   let filtered = allProducts;

//   if (selectedCategory) {
//     filtered = filtered.filter(
//       (p) =>
//         p.category &&
//         p.category.toLowerCase().trim() === selectedCategory?.categoryName?.toLowerCase().trim()
//     );
//   }

//   console.log('selectedSubcategory', selectedSubcategory);

//   if (selectedSubcategory) {
//     filtered = filtered.filter(
//       (p) => {
//         // Debug logging to see what we're comparing
//         console.log('Product subCategory:', p.subCategory);
//         console.log('Selected subcategory:', selectedSubcategory);
        
//         return p.subCategory &&
//                p.subCategory.toLowerCase().trim() === selectedSubcategory.toLowerCase().trim();
//       }
//     );
//   }

//   console.log("filtered products ===>", filtered?.length, filtered);
//   setProducts(filtered);
// }, [selectedCategory, selectedSubcategory, allProducts]);

//   const filteredLive = useMemo(() => {
//     if (selectedFilter === "local" && selectedCategory) {
//       return live.filter(item =>
//         item?.category?.toLowerCase() === selectedCategory?.categoryName.toLowerCase()
//       );
//     }
//     return live;
//   }, [live, selectedFilter, selectedCategory]);

//   useEffect(() => {
//     if (selectedFilter === "global") {
//       setSelectedCategory(null); // reset when back to global
//     }
//   }, [selectedFilter]);


//   const handleSearchChange = useCallback((text) => {
//     setSearchQuery(text);
//     if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
//     debounceTimerRef.current = setTimeout(() => {
//       setDebouncedQuery(text);
//     }, 500);
//   }, []);

//   useEffect(() => {
//     return () => debounceTimerRef.current && clearTimeout(debounceTimerRef.current);
//   }, []);

//   useEffect(() => {
//     if (categories.length > 0) {
//       if (debouncedQuery) {
//         // Filter categories based on search
//         const filtered = categories.filter(item =>
//           item.categoryName.toLowerCase().includes(debouncedQuery.toLowerCase())
//         );
//         setFilteredCategories(filtered);
//       } else {
//         // Show all categories when no search query
//         setFilteredCategories(categories);
//       }
//     }
//   }, [debouncedQuery, categories]);

//   const clearSearch = useCallback(() => {
//     setSearchQuery('');
//     setDebouncedQuery('');
//     inputRef.current?.focus();
//   }, []);

//   const [showAll, setShowAll] = useState(false);
//   const displayedCategories = showAll
//     ? [...filteredCategories, { id: 'less', categoryName: 'Show Less', isToggle: true }]
//     : [
//       ...filteredCategories.slice(0, 15),
//       ...(filteredCategories.length > 15 ? [{ id: 'more', categoryName: 'More', isToggle: true }] : []),
//     ];


//   const handleCategoryPress = useCallback((category) => {

//     if (category?.isToggle) {
//       setShowAll(prev => !prev);
//       return;
//     }

//     if (selectedFilter === "local") {
//       // ✅ Just store the category instead of navigating
//       setSelectedCategory(category);
//       setSelectedSubCategory(null);   //Newly added
//     } else {
//       // ✅ Global filter → normal navigation
//       navigation.navigate('GlobalSearch', {
//         categories: category?.categoryName,
//         tabName: 'products',
//       });
//     }
//   }, [navigation, selectedFilter]);


//   const renderLiveItem = ({ item }) => {

//     return (
//       <TouchableOpacity onPress={() => {
//         if (item?.isLive) {
//           navigation.navigate('LiveScreen', { stream: item });
//         } else {
//           Toast(
//             'This show is not live yet'
//           );
//           // setShowOverlay(true);
//           navigation.navigate('UpcomingShowDetail', {
//             id: item._id,
//             hostId: item.hostId,
//           });
//         }
//       }}
//         style={styles.liveItem}>
//         <Image
//           source={{ uri: `${AWS_CDN_URL}${item?.thumbnailImage}` }}
//           style={StyleSheet.absoluteFillObject}
//           resizeMode="cover"
//         />
//         <View style={[styles.liveBadge, !item?.isLive && { backgroundColor: '#333' }]}>

//           <View style={[styles.liveBadgeDot]} />
//           <Text style={styles.liveBadgeText}>{item?.isLive ? 'LIVE' : 'Upcoming'}</Text>
//         </View>
//         {/* <View style={styles.liveViewers}><Text style={styles.liveViewersText}>{item.viewers}</Text></View> */}
//         <View style={styles.liveInfo}>
//           <Text style={styles.liveCategory}
//             numberOfLines={1}
//             ellipsizeMode="tail"
//           >{item.category}</Text>
//           <Text style={styles.liveSeller}
//             numberOfLines={1}
//             ellipsizeMode="tail">{item.title}</Text>
//         </View>
//       </TouchableOpacity>
//     )
//   };

//   const renderTrendingCard = ({ item }) => (
//     <TouchableOpacity onPress={() => navigation.navigate('GlobalSearch', { categories: item?.term, tabName: 'products' })} style={styles.trendingCard} activeOpacity={0.85}>
//       <Text style={styles.trendingRank}>#{item.rank}</Text>
//       <View style={styles.trendingInfo}>
//         <Text style={styles.trendingTerm}>{item.term}</Text>
//         <Text style={styles.trendingStats}>{item.searches} searches</Text>
//       </View>
//       <Text style={styles.trendingMomentum}>{item.momentum}</Text>
//     </TouchableOpacity>
//   );


//   const CategoryItem = React.memo(({ item, isSelected = false }) => {
//     const isToggle = item.isToggle;
//     return (
//       <TouchableOpacity
//         //  style={styles.categoryContainer}
//         activeOpacity={0.7}
//         onPress={() => handleCategoryPress(item)}>
//         <LinearGradient
//           colors={
//             selectedCategory?.categoryName === item?.categoryName
//               ? ['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.2)']
//               : ['rgba(255,255,255,0)', 'rgba(255,255,245,0.1)']   //'rgba(245,245,245,0.29)'
//           }
//           start={{ x: 0.5, y: 0 }}
//           end={{ x: 0.5, y: 1 }}
//           style={[styles.categoryContainer, selectedCategory?.categoryName === item?.categoryName && {
//             borderColor: '#FFD700',
//             borderWidth: 0.2
//           }]}>
//           {/* {console.log(item.iconPath)} */}
//           <View
//             style={[
//               styles.imageWrapper,
//               isSelected && { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
//             ]}>
//             {isToggle ? (
//               <Ionicons
//                 name={item.id === 'more' ? 'add-circle-outline' : 'remove-circle-outline'}
//                 size={28}
//                 color="#FFD700"
//               />
//             ) : (
//               // <FastImage
//               //   source={{uri:item.iconPath}}
//               //   style={styles.categoryImage}
//               //   resizeMode={FastImage.resizeMode.contain}
//               // />
//               <Text style={{ fontSize: 24 }}>{item?.iconText}</Text>
//             )}
//           </View>
//           <Text
//             style={[
//               styles.categoryLabel,
//               isSelected && styles.selectedCategoryLabel,
//             ]}
//             numberOfLines={2}
//             ellipsizeMode="tail">
//             {item.categoryName}
//           </Text>
//         </LinearGradient>
//       </TouchableOpacity>
//     )
//   });

//   if (loading) {
//     return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
//       <ActivityIndicator size="large" color="#FFD700" />
//     </View>)
//   }


//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: '#121212' }} edges={['top']}>
//       <View style={styles.container}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//           style={styles.keyboardAvoidContainer}
//           keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}>
//           <FlatList
//             // data={filteredCategories}
//             data={displayedCategories}
//             keyExtractor={item => item._id}
//             ListHeaderComponent={
//               <>
//                 <Header
//                   searchQuery={searchQuery}
//                   handleSearchChange={handleSearchChange}
//                   clearSearch={clearSearch}
//                   inputRef={inputRef}
//                   navigation={navigation}
//                   onOpenFilter={() => refRBSheet.current.open()}
//                 />
//                 <View style={styles.sectionHeader}>
//                   <View style={styles.sectionTitleRow}>
//                     <Text style={styles.sectionEmoji}>⚡</Text>
//                     <Text style={styles.sectionTitle}>Top Categories</Text>
//                     <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>LIVE</Text></View>
//                   </View>
//                   <Text style={styles.seeAll}>All →</Text>
//                 </View>
//               </>
//             }
//             renderItem={({ item }) => (
//               <CategoryItem
//                 item={item}
//               // isSelected={selectedCategory === item.value}
//               />
//             )}
//             numColumns={4}
//             contentContainerStyle={styles.categoriesGrid}
//             columnWrapperStyle={styles.columnWrapper}
//             showsVerticalScrollIndicator={false}
//             keyboardShouldPersistTaps="always"
//             keyboardDismissMode="interactive"
//             ListFooterComponent={
//               <>
//                 {Array.isArray(live) && live?.length > 0 &&
//                   (<View style={styles.liveDiscovery}>
//                     <View style={styles.liveHeader}>
//                       <View style={styles.liveTitleRow}>
//                         <Text style={styles.liveEmoji}>🔴</Text>
//                         <Text style={styles.liveTitle}>Live in Categories</Text>
//                         {/* <View style={styles.liveCount}><Text style={styles.liveCountText}>{'0'}</Text></View> */}
//                       </View>
//                       <TouchableOpacity onPress={() => navigation.navigate('GlobalSearch', { tabcategoryName: 'shows' })} >
//                         <Text style={[styles.seeAll, { fontSize: 10 }]}>View all →</Text>
//                       </TouchableOpacity>
//                     </View>

//                     {Array.isArray(filteredLive) && filteredLive?.length > 0 ? (<FlatList
//                       // data={live}
//                       data={filteredLive}
//                       horizontal
//                       renderItem={renderLiveItem}
//                       keyExtractor={(item, index) => item._id?.toString() || index.toString()}
//                       scrollEnabled={Array.isArray(filteredLive) && filteredLive?.length > 0 ? true : false}
//                     />) : (
//                       <View style={{ backgroundColor: 'black', flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
//                         <Ionicons name="videocam-off-outline" size={50} color="gray" style={{ marginBottom: 10 }} />
//                         <Text style={{ textAlign: 'center', fontSize: 14, color: 'gray' }}>No live shows available in {`\n`}{selectedCategory?.categoryName}</Text>
//                       </View>
//                     )}
//                   </View>)}

//                 <View style={styles.section}>
//                   <View style={styles.sectionHeader}>
//                     <View style={styles.sectionTitleRow}>
//                       <Text style={styles.sectionEmoji}>📈</Text>
//                       <Text style={styles.sectionTitle}>Trending Searches</Text>
//                     </View>
//                     <Text style={styles.seeAll}>More →</Text>
//                   </View>

//                   <FlatList
//                     data={TRENDING}
//                     renderItem={renderTrendingCard}
//                     keyExtractor={(i) => i.id}
//                     numColumns={2}
//                     columnWrapperStyle={{ justifyContent: 'space-around' }}
//                     scrollEnabled={false}
//                   />
//                 </View>

//                 {selectedCategory && <View style={styles.section}>
//                   <View style={styles.sectionHeader}>
//                     <View style={styles.sectionTitleRow}>
//                       <Text style={styles.sectionEmoji}>🎯</Text>
//                       <Text style={styles.sectionTitle}>{selectedCategory?.categoryName
//                         //    || categories[0]?.categoryName
//                       }</Text>
//                     </View>
//                   </View>
//                   <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deepdiveTabs} contentContainerStyle={{ paddingHorizontal: 10 }}>
//                     {(selectedCategory?.subcategories
//                       //   || categories[0]?.subcategories 
//                       || []).map((subcat, index) => (
//                         <TouchableOpacity
//                           onPress={() => setSelectedSubCategory(subcat.name)}
//                           key={subcat._id || index} // fallback to index if _id is missing
//                           style={[styles.deepdiveTab, (
//                             //   !selectedSubcategory? index === 0 : 
//                             subcat.name === selectedSubcategory) && styles.deepdiveTabActive]}
//                         >
//                           <Text
//                             style={[
//                               styles.deepdiveTabText,
//                               (
//                                 // !selectedSubcategory? index === 0 : 
//                                 subcat.name === selectedSubcategory) && { color: '#FFD700' },
//                             ]}
//                           >
//                             {subcat.name || 'Unnamed'} {/* fallback text if name missing */}
//                           </Text>
//                         </TouchableOpacity>
//                       ))}
//                   </ScrollView>

//                   <FlatList
//                     data={products}
//                     renderItem={({ item }) => (
//                       <View style={styles.card}>
//                         <Image
//                           source={{
//                             uri: item?.images?.[0]?.key
//                               ? `${AWS_CDN_URL}${item?.images[0].key}`
//                               : undefined,
//                           }}
//                           style={styles.image}
//                           resizeMode="cover"
//                         />
//                         <Text style={styles.price}>₹{item.productPrice}</Text>
//                         <Text style={styles.title} numberOfLines={1}>
//                           {item.title}
//                         </Text>
//                       </View>
//                     )}
//                     keyExtractor={(item) => item._id}
//                     numColumns={3}
//                     columnWrapperStyle={{ justifyContent: 'space-between' }}
//                     scrollEnabled={false}
//                   />
//                 </View>}
//                 <View style={styles.footer} />
//               </>
//             }
//             ListEmptyComponent={() => (
//               <Text style={{ textAlign: 'center', marginTop: 20 }}>
//                 No products found
//               </Text>
//             )}
//           />

//           {/* Bottom Sheet */}
//           <RBSheet
//             ref={refRBSheet}
//             height={200}
//             openDuration={250}
//             customStyles={{
//               container: {
//                 backgroundColor: "#1A1A1A",
//                 borderTopLeftRadius: 20,
//                 borderTopRightRadius: 20,
//                 padding: 20,
//               },
//               wrapper: {
//                 backgroundColor: "rgba(0,0,0,0.6)", // dim background overlay
//               },
//               draggableIcon: {
//                 backgroundColor: "#666",          // gray drag handle
//               },
//             }}
//           >
//             <Text style={styles.sheetTitle}>Choose Filter</Text>

//             {/* Local Filter */}
//             <TouchableOpacity
//               style={styles.optionButton}
//               onPress={() => handleSelect("local")}
//             >
//               <Ionicons
//                 name={selectedFilter === "local" ? "radio-button-on" : "radio-button-off"}
//                 size={20}
//                 color="#FFD700"
//               />
//               <Text style={styles.optionText}>Local Filter</Text>
//             </TouchableOpacity>

//             {/* Global Filter */}
//             <TouchableOpacity
//               style={styles.optionButton}
//               onPress={() => handleSelect("global")}
//             >
//               <Ionicons
//                 name={selectedFilter === "global" ? "radio-button-on" : "radio-button-off"}
//                 size={20}
//                 color="#FFD700"
//               />
//               <Text style={styles.optionText}>Global Filter</Text>
//             </TouchableOpacity>
//           </RBSheet>
//         </KeyboardAvoidingView>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.primaryColor,
//   },
//   keyboardAvoidContainer: {},
//   header: {
//     flexDirection: 'row',
//     marginTop: Platform.select({ ios: 10, android: height * 0.02 }),
//     alignItems: 'center',
//     gap: width * 0.1,
//     paddingVertical: height * 0.01,
//     paddingHorizontal: width * 0.02,
//   },
//   backButton: {
//     padding: 5,
//   },
//   headerGradient: {
//     borderRadius: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     alignSelf: 'center',
//     height: height * 0.045,
//     width: '60%',
//   },
//   titleContainer: {
//     backgroundColor: '#1A1A1A',
//     height: '90%',
//     borderRadius: 20,
//     width: '98%',
//     paddingHorizontal: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     color: 'white',
//     fontSize: Math.min(18, width * 0.045),
//     fontWeight: 'bold',
//   },
//   searchContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginVertical: height * 0.015,
//     backgroundColor: '#1A1A1A',
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: '#FFC100', //'#B38728',
//     paddingHorizontal: width * 0.025,
//     marginHorizontal: width * 0.05,
//     marginBottom: 36,
//     paddingTop: 1,
//   },
//   searchIcon: {
//     marginRight: width * 0.02,
//   },
//   searchInput: {
//     flex: 1,
//     height: height * 0.04,
//     color: 'white',
//     paddingVertical: 8,
//     // marginHorizontal:20,
//     // paddingHorizontal:20,
//   },
//   clearButton: {
//     padding: 5,
//     marginRight: 5,
//   },
//   filterButton: {
//     padding: 5,
//   },
//   categoriesGrid: {
//     // paddingBottom: height * 0.05,
//     flexGrow: 1,
//   },
//   columnWrapper: {
//     justifyContent: 'flex-start',
//     paddingHorizontal: width * 0.04,
//     marginBottom: height * 0.013,
//     gap: width * 0.03,
//   },
//   categoryContainer: {
//     width: (width - width * 0.08 * 2) / 4,
//     aspectRatio: 1,
//     borderRadius: 10,
//     overflow: 'hidden',
//     marginBottom: height * 0.015,
//     //backgroundColor: 'red',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: '#333',
//   },
//   categoryImage: {
//     width: '80%',
//     height: '80%',
//     borderRadius: 10,
//   },
//   footer: {
//     height: height * 0.1,
//   },

//   imageWrapper: {
//     width: '50%',
//     aspectRatio: 1,
//     backgroundColor: 'rgba(255, 255, 255, 0.2)',
//     borderRadius: 1000, // large number to ensure it's a circle
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 8,
//     padding: 4,
//   },
//   categoryLabel: {
//     color: 'white',
//     fontSize: 8,
//     textAlign: 'center',
//     paddingHorizontal: 5,
//     marginTop: 5,
//   },
//   selectedCategoryLabel: {
//     color: '#000', //'#f7ce45',    //'#FF6B00',
//   },
//   gradientBorder: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0)', // transparent to show the gradient border
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#F7CE45',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   section: { paddingHorizontal: 10, paddingTop: 10 },
//   sectionHeader: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
//   sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
//   sectionEmoji: { marginRight: 6, fontSize: 14 },
//   sectionTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
//   sectionBadge: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
//   sectionBadgeText: { color: '#000', fontWeight: '900', fontSize: 10 },
//   seeAll: { color: '#FFD700', fontWeight: '600', fontSize: 11 },

//   searchBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700', marginLeft: 4 },
//   searchIconBtn: { backgroundColor: 'rgba(255,255,255,0.1)' },

//   liveDiscovery: { backgroundColor: 'rgba(255,0,64,0.03)', marginHorizontal: 10, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', marginBottom: 15 },
//   liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
//   liveTitleRow: { flexDirection: 'row', alignItems: 'center' },
//   liveEmoji: { marginRight: 6 },
//   liveTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },
//   liveCount: { backgroundColor: '#ff0040', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
//   liveCountText: { color: '#fff', fontWeight: '700', fontSize: 10 },
//   liveGrid: {},
//   liveItem: { overflow: 'hidden', marginRight: 10, backgroundColor: '#141414', borderRadius: 10, aspectRatio: 3 / 4, width: (width - 20 - 6 * 2) / 3, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,0,64,0.2)', position: 'relative' },
//   liveBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#ff0040', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
//   liveBadgeDot: { width: 6, height: 6, backgroundColor: '#fff', borderRadius: 3, marginRight: 6 },
//   liveBadgeText: { color: '#fff', fontWeight: '700', fontSize: 8 },
//   liveViewers: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
//   liveViewersText: { color: '#fff', fontSize: 10 },
//   liveInfo: { borderBottomStartRadius: 10, borderBottomEndRadius: 10, position: 'absolute', bottom: -2, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.7)' },
//   liveCategory: { color: '#FFD700', fontWeight: '700', fontSize: 10 },
//   liveSeller: { color: '#888', fontSize: 9 },

//   trendingCard: { backgroundColor: '#141414', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: (width - 20 - 8) / 2, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
//   trendingRank: { fontSize: 16, fontWeight: '900', color: '#FFD700' },
//   trendingInfo: { flex: 1, marginLeft: 8 },
//   trendingTerm: { fontSize: 11, fontWeight: '600', color: '#fff' },
//   trendingStats: { fontSize: 9, color: '#888' },
//   trendingMomentum: { fontSize: 10, color: '#FFD700', fontWeight: '700' },

//   thumbnail: {
//     width: '100%',
//     height: 120,
//   },

//   sheetTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     marginBottom: 15,
//     color: "#fff",
//   },
//   optionButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 12,
//   },
//   optionText: {
//     fontSize: 16,
//     color: "#fff",
//     marginLeft: 10,
//   },

//   deepdiveTabs: { marginBottom: 10 },
//   deepdiveTab: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 6 },
//   deepdiveTabActive: { backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
//   deepdiveTabText: { fontSize: 10, fontWeight: '600', color: '#fff' },
//   deepdiveItem: { backgroundColor: '#141414', borderRadius: 10, padding: 8, width: (width - 20 - 6 * 2) / 3, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
//   deepdiveCount: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
//   deepdiveCountText: { color: '#888', fontSize: 9 },
//   deepdiveName: { marginTop: 6, fontSize: 9, fontWeight: '600', color: '#fff' },

//   row: {
//     justifyContent: 'space-between',
//   },
//   card: {
//     flex: 1,                // makes it auto-fit in row
//     margin: 4,
//     backgroundColor: '#121212',
//     borderRadius: 10,
//     padding: 6,
//     alignItems: 'center',
//     elevation: 2,
//     borderColor: '#333',
//     borderWidth: 1
//   },
//   image: {
//     width: '100%',
//     aspectRatio: 1,         // square image
//     borderRadius: 8,
//     marginBottom: 6,
//   },
//   price: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: 'green',
//     marginBottom: 4,
//   },
//   title: {
//     fontSize: 12,
//     textAlign: 'center',
//     color: '#fff'
//   },
// });

// export default CategoriesScreen;