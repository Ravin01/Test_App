/* eslint-disable react/no-unstable-nested-components */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
  Image,
  ToastAndroid,
  RefreshControl
} from 'react-native';

import VideoResults from './VideoResult';
import ProductResults from './ProductsResult';
import UserResults from './UserResult';
import ShowResults from './ShowResult';
import {ActivityIndicator} from 'react-native-paper';
import SearchComponent from './SearchComponent';

import Icon from 'react-native-vector-icons/Feather';
import Header from '../Reuse/Header';
import { colors } from '../../Utils/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { SearchAPI } from './hooks/SearchService';
import { SearchDataStorage } from './hooks/SearchStores';
import { bag, bagActive, liveInActive, playInActive, shopGray, shopVideo } from '../../assets/assets';
//import { useStreamEventCallbacks } from '../../Context/StreamEventContext';
import { useStreamEventTimestamps } from '../../Context/StreamEventContext';


const DEBOUNCE_DELAY = 500;

export default function GlobalSearch({navigation, route}) {
  const categories = route.params?.categories || '';
  const tabName = route.params?.tabName;
  
  // State for triggering re-renders when data changes
  const [_refresh, setRefresh] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState(SearchDataStorage.getDebouncedSearchTerm());
  
  // Memoized ListHeader component
  const currentSearchTerm = SearchDataStorage.getSearchTerm();
  const currentSelectedTab = SearchDataStorage.getSelectedTab();
  
  const flatListRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);
  const previousCategoryRef = useRef(categories);

  // Handle route params changes with useFocusEffect for better navigation handling
  useFocusEffect(
    useCallback(() => {
      if (categories && categories !== previousCategoryRef.current) {
        previousCategoryRef.current = categories;
        
        // Clear existing results immediately and show loader
        const currentTab = SearchDataStorage.getSelectedTab();
        SearchDataStorage.setResults(currentTab, []); // Clear old results
        setIsSearching(true); // Show loader immediately
        
        SearchDataStorage.setSearchTerm(categories);
        SearchDataStorage.setDebouncedSearchTerm(categories);
        setDebouncedTerm(categories); // Update state immediately to trigger fetch
        forceRefresh();
      }
    }, [categories])
  );

  // Initialize with route params on mount
  useEffect(() => {
    const currentSearchTerm = SearchDataStorage.getSearchTerm();
    if (categories && categories !== currentSearchTerm) {
      // Clear existing results immediately and show loader
      const currentTab = SearchDataStorage.getSelectedTab();
      SearchDataStorage.setResults(currentTab, []); // Clear old results
      setIsSearching(true); // Show loader immediately
      
      SearchDataStorage.setSearchTerm(categories);
      SearchDataStorage.setDebouncedSearchTerm(categories);
      setDebouncedTerm(categories); // Update state immediately to trigger fetch
      forceRefresh();
    }
  }, [categories]);

  // Function to force component refresh
  const forceRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const currentSearchTerm = SearchDataStorage.getSearchTerm();
    searchTimeoutRef.current = setTimeout(() => {
      SearchDataStorage.setDebouncedSearchTerm(currentSearchTerm);
      setDebouncedTerm(currentSearchTerm);
    }, DEBOUNCE_DELAY);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [currentSearchTerm]); // Track the actual search term value

  useFocusEffect(
    useCallback(() => {
      if (tabName) {
        SearchDataStorage.setSelectedTab(tabName);
        forceRefresh();
      }
      return () => {
        // Cleanup if needed
        SearchDataStorage.setSelectedTab('shows');
        SearchDataStorage.setSearchTerm('');
        SearchDataStorage.setDebouncedSearchTerm('');
        isFetchingRef.current = false;
      };
    }, [tabName])
  );

  const handleToggleWishlist = useCallback(async (productId) => {
    const result = await SearchAPI.toggleWishlist(productId);
    if (result.success) {
      // Update the product in results
      const products = SearchDataStorage.getResults().products;
      const updatedProducts = products.map(product =>
        product._id === productId
          ? { ...product, isInWishlist: result.data.isInWishlist }
          : product
      );
      
      SearchDataStorage.setResults('products', updatedProducts);
      forceRefresh();
      
      ToastAndroid.show(
        result.message || (result.data.isInWishlist ? "Added to wishlist" : "Removed from wishlist"),
        ToastAndroid.SHORT
      );
    } else {
      ToastAndroid.show("Failed to update wishlist", ToastAndroid.SHORT);
    }
  }, []);

  // Fetch data for a category
  const fetchDataForCategory = useCallback(async (category, term, page = 1, appendResults = false, forceFresh = false) => {
    // console.log('fetchDataForCategory called with:', {category, term, page, appendResults, forceFresh});

    // Check if we have preloaded data for the first page with empty search term (skip if forceFresh is true)
    if (page === 1 && !term.trim() && !forceFresh && SearchDataStorage.hasPreloadedData(category)) {
      const preloadedData = SearchDataStorage.getPreloadedCategoryData(category);
      SearchDataStorage.setResults(category, preloadedData.data, appendResults);
      SearchDataStorage.setPagination(category, {
        currentPage: preloadedData.pagination.currentPage,
        totalCount: preloadedData.pagination.totalCount,
        totalPages: preloadedData.pagination.totalPages,
        hasMore: preloadedData.pagination.hasMore ??
                preloadedData.pagination.currentPage < preloadedData.pagination.totalPages,
      });
      SearchDataStorage.setLoadingState(category, false);
      SearchDataStorage.setIsRefreshing(false);
      if (page === 1 && !appendResults) {
        SearchDataStorage.setIsInitialLoad(false);
      }
      forceRefresh();
      return;
    }

    SearchDataStorage.setLoadingState(category, true);
    // Set pagination loading state for immediate UI feedback
    if (appendResults) {
      setIsPaginationLoading(true);
    }
    if (page === 1 && !appendResults) {
      SearchDataStorage.setIsInitialLoad(false);
      setIsSearching(true);
    }

    try {
      const response = await SearchAPI.fetchCategoryData(
        category, 
        term, 
        page, 
        SearchDataStorage.getPagination()[category].limit
      );

      if (response.success) {
        SearchDataStorage.setResults(category, response.data, appendResults);
        
        SearchDataStorage.setPagination(category, {
          currentPage: response.pagination.currentPage,
          totalCount: response.pagination.totalCount,
          totalPages: response.pagination.totalPages,
          hasMore: response.pagination.hasMore ??
                  response.pagination.currentPage < response.pagination.totalPages,
        });
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      SearchDataStorage.setErrorState(category, error.message);
      if (!appendResults) {
        SearchDataStorage.setResults(category, []);
        SearchDataStorage.setPagination(category, {
          currentPage: 1,
          totalCount: 0,
          totalPages: 1,
          hasMore: false,
        });
      }
    } finally {
      SearchDataStorage.setLoadingState(category, false);
      SearchDataStorage.setIsRefreshing(false);
      setIsPaginationLoading(false);
      setIsRefreshing(false); // Update React state
      forceRefresh();
      setIsSearching(false);
    }
  }, []);

  // ✅ FIX: Force fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const currentTab = SearchDataStorage.getSelectedTab();
      const searchTermValue = SearchDataStorage.getDebouncedSearchTerm();
      
      // Check if we have any results for the current tab
      const currentResults = SearchDataStorage.getResults()[currentTab] || [];
      
      // If no results and not currently loading, fetch data
      if (currentResults.length === 0 && !SearchDataStorage.getLoadingStates()[currentTab]) {
        console.log('📡 [GlobalSearch] Screen focused - fetching initial data for:', currentTab);
        fetchDataForCategory(currentTab, searchTermValue, 1, false, false);
      }
      
      return () => {
        // Cleanup on blur if needed
      };
    }, [fetchDataForCategory])
  );

  // Optimized search effect with debouncing
  useEffect(() => {
    if (isFetchingRef.current) {
      isFetchingRef.current = false;
      return;
    }
    
    const currentTab = SearchDataStorage.getSelectedTab();
    
    const handleSearch = async () => {
      await fetchDataForCategory(currentTab, debouncedTerm, 1);
    };

    handleSearch();
  }, [fetchDataForCategory, debouncedTerm, currentSelectedTab]); // Track actual values


  const { lastStreamLiveAt, lastStreamEndedAt } = useStreamEventTimestamps();
  
  useEffect(() => {
    if (lastStreamLiveAt || lastStreamEndedAt) {
      fetchDataForCategory('shows', SearchDataStorage.getDebouncedSearchTerm(), 1, false, true);
    }
  }, [lastStreamLiveAt, lastStreamEndedAt]);

    // 🎯 Use stream events hook for real-time updates
  // This will refresh shows when streams go live or end
  // const { registerStreamCallbacks } = useStreamEventCallbacks();
  
  // useEffect(() => {
  //   const unsubscribe = registerStreamCallbacks({
  //     onStreamLive: () => fetchDataForCategory('shows', SearchDataStorage.getDebouncedSearchTerm(), 1, false, true),
  //     onStreamEnded: () => fetchDataForCategory('shows', SearchDataStorage.getDebouncedSearchTerm(), 1, false, true),
  //   });
    
  //   return unsubscribe;
  // }, []);


  const handleTabChange = useCallback((tabKey) => {
    SearchDataStorage.setSelectedTab(tabKey);
    forceRefresh();
    isFetchingRef.current = true;
    
    // Fetch data for the new tab if we don't have results or search term changed
    fetchDataForCategory(
      tabKey, 
      SearchDataStorage.getDebouncedSearchTerm(), 
      1
    );
  }, [fetchDataForCategory]);

  const loadMore = useCallback(() => {
    const category = SearchDataStorage.getSelectedTab();
    const currentPagination = SearchDataStorage.getPagination()[category];
    
    if (!SearchDataStorage.getLoadingStates()[category] && currentPagination.hasMore) {
      fetchDataForCategory(
        category,
        SearchDataStorage.getDebouncedSearchTerm(),
        currentPagination.currentPage + 1,
        true,
      );
    }
  }, [fetchDataForCategory]);

  // Memoized loading indicator to show when data is being fetched
  const renderLoadingIndicator = useCallback(() => {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }, []);

  // Memoized tab icons to prevent unnecessary re-renders
  const getTabIcon = useCallback((tabKey, isActive) => {
    const icons = {
      shows: {
        active: {type: 'image', source: {uri:playInActive}},
        inactive: {type: 'image', source: {uri:liveInActive}}
      },
      videos: {
        active: {type: 'image', source: {uri:shopVideo}},
        inactive: {type: 'image', source: {uri:shopGray}},
      },
      products: {
        active: {type: 'image', source: {uri:bagActive}},
        inactive: {type: 'image', source:{uri:bag}},
      },
      users: {
        active: {type: 'icon', name: 'users', color: '#fff'},
        inactive: {type: 'icon', name: 'users', color: 'gray'},
      },
    };
    
    return isActive ? icons[tabKey]?.active : icons[tabKey]?.inactive;
  }, []);

  
  const ListHeader = useMemo(() => (
    <View style={{maxHeight: 300}}>
      <View className='px-2'>
        <Header navigation={navigation} />
      </View>
      <SearchComponent
        searchTerm={currentSearchTerm}
        setSearchTerm={(term) => {
          SearchDataStorage.setSearchTerm(term);
          forceRefresh();
        }}
      />
      <ScrollView
        horizontal
        contentContainerStyle={styles.tabContainer}
        showsHorizontalScrollIndicator={false}>
        {['shows', 'videos', 'products', 'users'].map(key => {
          const isActive = currentSelectedTab === key;
          const icon = getTabIcon(key, isActive);

          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, isActive && styles.selectedTab]}
              onPress={() => handleTabChange(key)}>
              {icon?.type === 'image' && (
                <Image
                  source={icon.source}
                  style={{ height: 22, width: 22 }}
                  resizeMode="contain"
                />
              )}
              {icon?.type === 'icon' && (
                <Icon
                  name={icon.name}
                  size={22}
                  color={icon.color}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [navigation, currentSearchTerm, currentSelectedTab, getTabIcon, handleTabChange]);

  // Create a memoized render function for each result type
  const renderShowResult = useCallback((item) => (
    <ShowResults show={item} error={SearchDataStorage.getErrorStates().shows} />
  ), []);

  const renderVideoResult = useCallback((item) => (
    <VideoResults video={item} error={SearchDataStorage.getErrorStates().videos} />
  ), []);

  const renderProductResult = useCallback((item) => (
    <ProductResults 
      product={item} 
      onSave={handleToggleWishlist}
    />
  ), [handleToggleWishlist]);

  const renderUserResult = useCallback((item) => (
    <UserResults user={item} error={SearchDataStorage.getErrorStates().users} />
  ), []);

  // Memoized render function for results
  const renderResults = useCallback(() => {
    const selectedTab = SearchDataStorage.getSelectedTab();
    const currentResults = SearchDataStorage.getResults()[selectedTab] || [];
    const isLoading = SearchDataStorage.getLoadingStates()[selectedTab];
    const error = SearchDataStorage.getErrorStates()[selectedTab];
    const isInitialLoad = SearchDataStorage.getIsInitialLoad();
    const debouncedSearchTerm = SearchDataStorage.getDebouncedSearchTerm();

    // Show loading indicator when searching or loading initial data
    if (isSearching || (isInitialLoad && currentResults.length === 0 && !error)) {
      return renderLoadingIndicator();
    }

    const noResultsFound = !isLoading && currentResults.length === 0 && debouncedSearchTerm;

    // Get the appropriate render function based on selected tab
    let renderItemFunction;
    switch (selectedTab) {
      case 'shows':
        renderItemFunction = renderShowResult;
        break;
      case 'videos':
        renderItemFunction = renderVideoResult;
        break;
      case 'products':
        renderItemFunction = renderProductResult;
        break;
      case 'users':
        renderItemFunction = renderUserResult;
        break;
      default:
        renderItemFunction = () => null;
    }

    return (
      <FlatList
        ref={flatListRef}
        data={currentResults}
        keyExtractor={(item,index)=> item?._id || index.toString()}
        renderItem={({item}) => renderItemFunction(item)}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={selectedTab === 'users' ? 10 : 8}
        updateCellsBatchingPeriod={100}
        getItemLayout={selectedTab === 'users' ? undefined : (data, index) => ({
          length: 220,
          offset: 220 * Math.floor(index / 2),
          index,
        })}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              SearchDataStorage.setIsRefreshing(true);
              fetchDataForCategory(selectedTab, debouncedSearchTerm, 1, false, true); // Pass forceFresh = true
            }}
            colors={[colors.primaryButtonColor]}
            tintColor={colors.primaryButtonColor}
          />
        }
        numColumns={selectedTab === 'users' ? 1 : 2}
        key={`${selectedTab}`}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: 100,
          flexGrow: 1,
        }}
        columnWrapperStyle={
          selectedTab !== 'users' ? {justifyContent: 'space-between'} : null
        }
        ListEmptyComponent={
          !isLoading && noResultsFound ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {`No results found for "${debouncedSearchTerm}"`}
              </Text>
            </View>
          ) : !isLoading && debouncedSearchTerm === '' ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Discover top {selectedTab}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          (isLoading || isPaginationLoading) && currentResults.length > 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={colors.primaryButtonColor} />
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
    );
  }, [isSearching, isPaginationLoading, isRefreshing, loadMore, renderShowResult, renderVideoResult, renderProductResult, renderUserResult, fetchDataForCategory, renderLoadingIndicator]);

  // Auto-refresh data every 1 minute
  // useFocusEffect(
  //   useCallback(() => {
  //     // Set up auto-refresh interval
  //     autoRefreshIntervalRef.current = setInterval(() => {
  //       const currentCategory = SearchDataStorage.getSelectedTab();
  //       const currentSearchTerm = SearchDataStorage.getDebouncedSearchTerm();
        
  //       // Silently refresh data in the background without showing loading indicators - force fresh data
  //       fetchDataForCategory(currentCategory, currentSearchTerm, 1, false, true);
  //     }, AUTO_REFRESH_INTERVAL);

  //     // Cleanup interval when component loses focus or unmounts
  //     return () => {
  //       if (autoRefreshIntervalRef.current) {
  //         clearInterval(autoRefreshIntervalRef.current);
  //         autoRefreshIntervalRef.current = null;
  //       }
  //     };
  //   }, [fetchDataForCategory])
  // );

  useEffect(() => {
    const onBackPress = () => {
      const source = route.params?.source;
      
      // ✅ If navigated from categories screen, navigate back to Categories
      if (source === 'categories') {
        SearchDataStorage.setSearchTerm('');
        navigation.navigate('search'); // 'search' is the Categories tab in BottomTabBar
        return true;
      }
      
      // Normal back behavior
      if (navigation.canGoBack()) {
        SearchDataStorage.setSearchTerm('');
        navigation.goBack();
        return true;
      }

      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backHandler.remove();
  }, [navigation, route.params]);

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.container}>
            {ListHeader}
            {renderResults()}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop:5,
  },
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flex: 1
  },
  tabContainer: {
    justifyContent: 'space-around',
    width: '100%',
    height: 'auto',
    marginTop: 10,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#777',
  },
  selectedTab: {
    // Add selected tab styles if needed
  },
  selectedText: {
    color: '#fff'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#777',
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#777',
    fontSize: 16,
  }
});
