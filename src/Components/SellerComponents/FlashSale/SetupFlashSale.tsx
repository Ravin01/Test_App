import React, {useState, useEffect, useContext, useCallback, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {
  Package,
  Clock,
  Calendar,
  IndianRupee,
  Search,
  Flame,
  ShoppingBag,
  PlusCircle,
  Edit,
  Monitor,
} from 'lucide-react-native';
import {useCountdown} from '../../../hooks/useCountdown';
import axiosInstance from '../../../Utils/Api';
import SellerHeader from '../SellerForm/Header';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {AuthContext} from '../../../Context/AuthContext';

import * as Animatable from 'react-native-animatable';

import {Dropdown} from 'react-native-element-dropdown';
const {width} = Dimensions.get('window');

const FlashSaleSetupScreen = ({navigation}) => {
  const [activeTab, setActiveTab] = useState('regular');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const {categories} = useContext(AuthContext);
  
  // Use refs to track current values without causing re-renders
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  
  // Memoize tabs array to prevent recreation on every render
  const tabs = useMemo(() => [
    {id: 'regular', name: 'Products', icon: ShoppingBag},
    {id: 'upcoming', name: 'Upcoming', icon: Calendar},
    {id: 'live', name: 'Live', icon: Flame},
  ], []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async (reset = false) => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current && !reset) return;

    const currentPage = reset ? 1 : pageRef.current;
    loadingRef.current = true;
    setLoading(true);

    try {
      const endpoints = {
        regular: '/flash-sale/regular',
        upcoming: '/flash-sale/upcoming-flash',
        live: '/flash-sale/live-flash',
      };

      const response = await axiosInstance.get(endpoints[activeTab], {
        params: {
          page: currentPage,
          limit: 12,
          search: debouncedSearchQuery,
          category: categoryFilter,
        },
      });

      const newProducts = response.data.data.products || [];

      if (reset) {
        setProducts(newProducts);
        pageRef.current = 2;
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        pageRef.current = pageRef.current + 1;
      }

      setHasMore(response.data.data.hasMore);
    } catch (error) {
      console.log("error fetching",error.response.data)
      // Alert.alert('Error', 'Failed to fetch products');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearchQuery, categoryFilter]);

  useEffect(() => {
    fetchProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearchQuery, categoryFilter]);

  // Refresh data when screen comes into focus (after creating flash sale)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we're returning from another screen
      // This prevents initial load duplication
      const unsubscribe = navigation.addListener('focus', () => {
        if (products.length > 0) {
          fetchProducts(true);
        }
      });
      
      return unsubscribe;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, products.length])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const loadMore = () => {
    // Only load more if:
    // 1. There are more items to load (hasMore is true)
    // 2. Not currently loading
    // 3. We have products already loaded (prevents initial load issues)
    // 4. Not refreshing
    if (hasMore && !loadingRef.current && !loading && products.length > 0 && !refreshing) {
      fetchProducts();
    }
  };

  const handleTabPress = useCallback(tabId => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setProducts([]);
      pageRef.current = 1;
      setHasMore(true);
    }
  }, [activeTab]);

  const handleSetupFlashSale = product => {
    navigation.navigate('Flashsaleform', {product});
  };

  const renderProduct = ({item: product}) => (
    <ProductCard
      product={product}
      tab={activeTab}
      navigation={navigation}
      onSetupFlashSale={handleSetupFlashSale}
    />
  );

  const renderHeader = useCallback(() => (
    <View>
      {/* Title */}
      {/* <View className="mb-3"> */}
        {/* <View className="flex-row items-center mb-2">
          <Zap size={28} color="#F59E0B" />
          <Text className="text-2xl font-bold text-yellow-400 ml-2">
            Flash Sales
          </Text>
        </View> */}
        {/* <Text className="text-gray-400 text-lg">
          Manage flash sale campaigns
        </Text> */}
      {/* </View> */}

      {/* Search and Filter */}
      {/* <SearchComponent
        searchTerm={searchQuery}
        setSearchTerm={setSearchQuery}
      /> */}
     
      <View className="flex-row pr-4 items-center px-2 pl-2 mb-3 bg-secondary-color border border-gray-700 rounded-lg">
        <Search
          size={20}
          color="#9CA3AF"
          className="absolute left-3 top-3 z-10 "
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          className=" text-gray-200"
        />
      </View>
      <View className="flex-row mb-6 bg-secondary-color rounded-lg p-1">
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handleTabPress(tab.id)}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-md ${
              activeTab === tab.id ? 'bg-yellow-400' : 'bg-transparent'
            }`}>
            <tab.icon
              size={16}
              color={activeTab === tab.id ? '#1F2937' : '#9CA3AF'}
            />
            <Text
              className={`ml-2 font-medium ${
                activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'
              }`}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View className="mb-4 space-y-3">
        <View className="relative">
          {/* <Filter 
            size={20} 
            color="#9CA3AF" 
            className="absolute left-3 top-3 z-10" 
          /> */}
          <View className="pl-4 pr-2 py-3 bg-secondary-color border border-gray-700 rounded-lg">
            <Dropdown
              data={categories}
              value={categoryFilter}
              style={[{paddingRight: 10}]}
              activeColor="transparent"
              selectedTextStyle={{color: '#fff'}}
              itemTextStyle={{color: '#fff'}}
              containerStyle={{
                marginBottom: 10,
                backgroundColor: '#212121',
                borderColor: '#FFD700',
                borderWidth: 1,
                borderRadius: 10,
              }}
              placeholder="Select a category"
              placeholderStyle={{color: '#777'}}
              onChange={item => setCategoryFilter(item.categoryName)}
              labelField={'categoryName'}
              valueField={'categoryName'}
            />
          </View>
        </View>
      </View>
       <TouchableOpacity
        className="mb-4 self-end"
        onPress={() => {
          setSearchQuery('');
          setCategoryFilter('');
        }}>
        <Text className="text-blue-400">Clear filters</Text>
      </TouchableOpacity>

      {/* Tabs */}
    </View>
  ), [searchQuery, activeTab, tabs, categories, categoryFilter, handleTabPress]);

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center py-12">
      <Package size={48} color="#6B7280" />
      <Text className="text-gray-400 text-lg mt-4">No products found</Text>
      <Text className="text-gray-500 text-sm mt-1">
        Try adjusting your search
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary-color">
      <SellerHeader navigation={navigation} message={'⚡ Flash Sales'} />

{/* <Animatable.View 
  animation="bounceIn" 
  duration={800} 
  className="absolute bottom-[30px] right-[20px] z-[1000]"
>
  <TouchableOpacity
    className="flex-row items-center bg-brand-yellow px-4 py-3 rounded-full shadow-md"
    onPress={() => navigation.navigate('FlashsaleManager')}
  >
    <Monitor size={16} stroke={'#000'} />
    <Text className="text-black font-semibold ml-1.5">Manage</Text>
  </TouchableOpacity>
</Animatable.View> */}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item,index) => index.toString()}
        numColumns={2}
        columnWrapperStyle={{justifyContent: 'space-between'}}
        contentContainerStyle={{padding: 16}}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

// Product Card Component
const ProductCard = ({product, tab, onSetupFlashSale, navigation}) => {
  const cdnURL = AWS_CDN_URL;
  const imageUrl = product.images?.[0]?.key
    ? `${cdnURL}${product.images[0].key}`
    : null;

  const countdown = useCountdown(
    tab === 'upcoming'
      ? product.flashSale?.startsAt
      : product.flashSale?.endsAt,
  );

  const isSale = tab === 'upcoming' || tab === 'live';
  const discount = isSale
    ? Math.round(
        100 -
          (product.flashSale?.flashPrice / product.flashSale?.originalPrice) *
            100,
      )
    : 0;

  const cardWidth = (width - 48) / 2; // Account for padding and gap
  
  // console.log(product)
  return (
    <TouchableOpacity
        onPress={() => {
            // if(isSale)
            //     navigation.navigate('Flashsaledetails',{flashSales:product})
        }}
      className="bg-secondary-colo rounded-xl mb-4 border border-gray-700"
      style={{width: cardWidth}}>
      {/* Image */}
      <View className="relative">
        {/* {imageUrl ? ( */}
        <Image
          source={{uri: imageUrl}}
          className="w-full h-32 rounded-t-xl"
          style={{
            height: 100,
            width: '100%',
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
          resizeMode="cover"
        />
        {/* ) : ( */}
        {/* <View className="w-full h-32 bg-gray-700 rounded-t-xl items-center justify-center">
            <Package size={32} color="#6B7280" />
          </View> */}
        {/* )} */}

        {/* Sale Badges */}
        {isSale && (
          <View className="absolute top-2 left-2 right-2 flex-row justify-between">
            {discount > 0 && (
              <View className="bg-red-500 px-2 py-1 rounded ">
                <Text className="text-white text-xs font-bold">
                  {discount}% OFF
                </Text>
              </View>
            )}
            {!isSale && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Flashsaleedit', {saleData: product})
                }
                className="bg-gray-600 p-1 rounded-full">
                <Edit color={'#fff'} size={17} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-3">
        <Text className="text-white font-bold text-sm mb-1" numberOfLines={1}>
          {product.title}
        </Text>
        {!isSale && (
          <Text className="text-gray-400 text-xs mb-2" numberOfLines={1}>
            {product.category}
          </Text>
        )}

        {/* Price */}
        {isSale ? (
          <View className="flex-row gap-1 mb-1">
            <View className="flex-row items-center">
              <IndianRupee size={14} color="#F7CE45" />
              <Text className="text-yellow-400 font-bold">
                {product.flashSale?.flashPrice?.toLocaleString('en-IN')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <IndianRupee size={12} color="#9CA3AF" />
              <Text className="text-gray-400 text-sm line-through">
                {product.flashSale?.originalPrice?.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center mb-2">
            <IndianRupee size={14} color="#F7CE45" />
            <Text className="text-yellow-400 font-bold">
              {product.productPrice?.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        {/* Variants Count - Always occupies space for consistent layout */}
        <View className="flex-row items-center mb-1" style={{minHeight: 16}}>
          {product.childVariantIds && product.childVariantIds.length > 0 ? (
            <>
              <Package size={12} color="#60A5FA" />
              <Text className="text-blue-400 text-xs ml-1">
                Variants: {product.childVariantIds.length}
              </Text>
            </>
          ) : null}
        </View>

        {/* Stock */}
        <View className="flex-row items-center mb-1">
          <Package size={12} color="#9CA3AF" />
          <Text className="text-gray-400 text-xs ml-1">
            Stock:{' '}
            {product.childVariantIds && product.childVariantIds.length > 0
              ? product.childVariantIds.reduce(
                  (total, variant) => total + (variant.stockId?.quantity ?? 0),
                  0,
                )
              : product.stockId?.quantity ?? 0}
          </Text>
        </View>

        {/* Countdown */}
        {(tab === 'upcoming' || tab === 'live') && (
          <CountdownTimer
            countdown={countdown}
            type={tab === 'upcoming' ? 'Starts' : 'Ends'}
            color={tab === 'upcoming' ? 'blue' : 'red'}
          />
        )}

        {/* Setup Button */}
        {!isSale && (
          <TouchableOpacity
            onPress={() => onSetupFlashSale(product)}
            className="bg-yellow-400 py-2 px-3 rounded-lg flex-row items-center justify-center mt-2">
            <PlusCircle size={16} color="#1F2937" />
            <Text className="text-gray-900 font-medium ml-1 text-sm">
              Setup Sale
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Countdown Timer Component
const CountdownTimer = ({countdown, type, color}) => {
  const isBlue = color === 'blue';

  return (
    <View
      className={`p-2 rounded-lg mb-2 ${
        isBlue ? 'bg-gray-800' : 'bg-red-900/50'
      }`}>
      <View
        className={`flex-row items-center mb-2 ${
          isBlue ? 'text-blue-400' : 'text-red-400'
        }`}>
        {type === 'Starts' ? (
          <Calendar size={12} color={isBlue ? '#60A5FA' : '#F87171'} />
        ) : (
          <Clock size={12} color={isBlue ? '#60A5FA' : '#F87171'} />
        )}
        <Text
          className={`ml-1 text-xs ${
            isBlue ? 'text-blue-400' : 'text-red-400'
          }`}>
          {type} in:
        </Text>
      </View>

      <View className="flex-row justify-between">
        {['days', 'hours', 'minutes', 'seconds'].map(unit => (
          <View key={unit} className="items-center flex-1">
            <View
              className={`px-2 py-1 rounded ${
                isBlue ? 'bg-blue-900' : 'bg-red-900'
              }`}>
              <Text className="text-white text-xs font-mono">
                {String(countdown[unit] || 0).padStart(2, '0')}
              </Text>
            </View>
            <Text className="text-gray-400 text-xs mt-1">
              {unit.slice(0, 3)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default FlashSaleSetupScreen;
