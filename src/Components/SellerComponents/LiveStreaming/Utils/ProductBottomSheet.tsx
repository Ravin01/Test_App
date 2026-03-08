import React, {useRef, useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Alert,
  Dimensions,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import axiosInstance from '../../../../Utils/Api';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import {ActivityIndicator} from 'react-native-paper';
import {colors} from '../../../../Utils/Colors';
import { useNavigation } from '@react-navigation/native';
import bgaAxiosInstance, { checkBgaHealth } from '../../../../Utils/bgaAxiosInstance';
import { AuthContext } from '../../../../Context/AuthContext';
import { Toast } from '../../../../Utils/dateUtils';
import SearchComponent from '../../../GloabalSearch/SearchComponent';
const {width, height} = Dimensions.get('window');


const ProductBottomSheet = ({showId, isOpen, onClose,onRefresh,navigation}) => {
  // console.log('🔷 ProductBottomSheet: Rendering with showId:', showId);
  const productListSheetRef = useRef();
  // Safely access navigation - wrapped in try-catch for Modal context
  // let navigation = null;
  // try {
  //   navigation = useNavigation();
  //   console.log('✅ ProductBottomSheet: Navigation hook successful');
  // } catch (error) {
  //   console.log('❌ ProductBottomSheet: Navigation not available in Modal context');
  // }
  const categorySheetRef = useRef();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [successfull, setSuccessfull] = useState(false);
  const [loading, setloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchTerm,setSearchTerm]=useState('')
  
  const [show, setShow] = useState(null);
  const {user}=useContext(AuthContext)
  // Control product list sheet
  // console.log(searchTerm,show)
  useEffect(() => {
    console.log('🔷 ProductBottomSheet: isOpen changed to:', isOpen);
    if (isOpen) {
      productListSheetRef.current?.open();
    } else {
      productListSheetRef.current?.close();
    }
  }, [isOpen]);

  const categories = [
    {
      id: 'buynow',
      name: 'Buy now',
      description: 'List your product directly to buyers',
      icon: <FontAwesome5 name="shopping-cart" size={20} color="#fff" />,

      color: '#22C55E',
    },
    {
      id: 'auction',
      name: 'Auction',
      description: 'Let users bid on your product',
      icon: <FontAwesome5 name="gavel" size={20} color="#fff" />,
      color: '#A855F7',
    },
    {
      id: 'giveaway',
      name: 'Giveaway',
      description: 'Give your product away for free',
      icon: <FontAwesome5 name="gift" size={20} color="#fff" />,
      color: '#3B82F6',
    },
  ];
    const fetchShow = async () => {
    // setLoadingShow(true);
    if(showId==null)return
    try {
      const res = await axiosInstance.get(`/shows/get/live/${showId}`);
      // console.log(res.data)
      if (res.data.status) {
      }
      setShow(res.data);
    } catch (err) {
      console.error("Error fetching show:", err.message);
      // negative("Failed to fetch show details. Please try again.");
    } finally {
      // setLoadingShow(false);
    }
  };

  useEffect(() => {
    fetchShow();
  }, [showId]);

  const handleAddProduct = product => {
    setSelectedProduct(product);

    productListSheetRef.current?.close();
    categorySheetRef.current?.open();
    setSuccessfull(false);
  };

  const handleCategorySelect = category => {
    setSelectedCategory(category);
    handleProductSelect(category.name, selectedProduct);
  };
  const [bgaHealthStatus, setBgaHealthStatus] = useState({
      healthy: true,
      checked: false,
    });
    
    useEffect(() => {
      const checkBgaConnection = async () => {
        try {
          await checkBgaHealth();
          setBgaHealthStatus({healthy: true, checked: true});
        } catch (error) {
          console.log('BGA Backend not available:', error);
          setBgaHealthStatus({healthy: false, checked: true});
          Toast(
            'BGA Giveaway service is currently unavailable. Giveaway features may not work properly.',
          );
        }
      };
  
      checkBgaConnection();
    }, []);
  // console.log(show)
    const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
  });
const handleProductSelect = async (tab, product) => {
  console.log(tab, product);

  // Validate product and user data upfront
  if (!product?._id || !product.title) {
    console.error('Invalid product data:', product);
    Toast('Invalid product data. Please try again.');
    return;
  }

  let newProduct;
let name=''

  // Handle "Buy now" tab
  if (tab === "Buy now") {
    name='buyNow'
    newProduct = {
      productId: product._id,
      productPrice: String(product.productPrice || product.price || ""),
      title: product.title,
      images: product.images,
      quantity: product.quantity,
    };
  }
  // Handle "Auction" tab
  else if (tab === "Auction") {
    newProduct = {
      productId: product._id,
      startingPrice: String(product.startingPrice || ""),
      reservedPrice: String(product.reservedPrice || ""),
      title: product.title,
      images: product.images,
      quantity: product.quantity,
    };
    name='auction'
  }
  // Handle "Giveaway" tab
  else if (tab === "Giveaway") {
    name='giveaway'
    // Check if this product already has a giveaway prepared
    const existingGiveaway = show?.giveawayProducts?.find(
      (gp) => gp.productId === product._id
    );

    // If no existing giveaway and BGA is healthy, prepare a new giveaway
    if (!existingGiveaway?.giveawayObjectId && bgaHealthStatus.healthy) {
      try {
        const bgaPayload = {
          productId: product._id,                  // Required
          productTitle: product.title,             // Required
          productOwnerSellerId: user?.sellerInfo?._id || user?._id,  // Required
          scheduledAt: show?.scheduledAt,          // Required
          giveawayType: 'live',
        };
// console.log('Preparing BGA giveaway with payload:', bgaPayload);
        // Validate payload before sending
        if (!bgaPayload.productId || !bgaPayload.productTitle || !bgaPayload.productOwnerSellerId || !bgaPayload.scheduledAt) {
          throw new Error('Missing required fields in BGA payload');
        }

        const response = await bgaAxiosInstance.post('prepare', bgaPayload);

        if (!response.data.success || !response.data.data?._id) {
          throw new Error(response.data.message || 'Invalid giveaway preparation response');
        }

        const giveawayObjectId = response.data.data._id;

        // Update the giveaway with stream ID
        try {
          await bgaAxiosInstance.put(`update/${giveawayObjectId}`, {
            streamId: showId,
          });
        } catch (updateError) {
          console.warn('Failed to update giveaway with stream ID:', updateError);
        }

        // Create new product object with giveaway details
        newProduct = {
          productId: product._id,
          requireAutoFollow: existingGiveaway?.requireAutoFollow || false,
          title: product.title,
          images: product.images,
          quantity: product.quantity,
          productTitle: product.title,
          productOwnerSellerId: bgaPayload.productOwnerSellerId,
          giveawayObjectId,  // Use the newly created ID
          isActive: existingGiveaway?.isActive || false,
          isGiveawayEnded: existingGiveaway?.isGiveawayEnded || false,
          giveawayStatus: existingGiveaway?.giveawayStatus || 'ready',
        };
      } catch (error) {
        console.error('BGA Giveaway preparation failed:', error);
        Toast(`Failed to prepare giveaway: ${error?.response?.data?.message || error.message}`);
        return;
      }
    } else {
      // Use existing giveaway details if available
      newProduct = {
        productId: product._id,
        requireAutoFollow: existingGiveaway?.requireAutoFollow || false,
        title: product.title,
        images: product.images,
        quantity: product.quantity,
        productTitle: product.title,
        productOwnerSellerId: user?.sellerInfo?._id || user?._id,
        giveawayObjectId: existingGiveaway?.giveawayObjectId,
        isActive: existingGiveaway?.isActive || false,
        isGiveawayEnded: existingGiveaway?.isGiveawayEnded || false,
        giveawayStatus: existingGiveaway?.giveawayStatus || 'ready',
      };
    }

    // Final validation for giveawayObjectId
    if (!newProduct.giveawayObjectId) {
      console.error('Missing giveawayObjectId for giveaway product:', product.title);
      Toast('Failed to properly configure giveaway. Please try again.');
      return;
    }

    console.log('Giveaway product configured with ObjectId:', newProduct.giveawayObjectId);
  }

  // Update selected products
  setSelectedProducts((prev) => ({
    ...prev,
    [name]: [...prev[name], newProduct],
  }));
};


  const handleConfirmAddProduct = async () => {
    if (selectedProduct && selectedCategory) {
      //   categorySheetRef.current?.close();
      try {
        const payload = {
    buyNowProducts: selectedProducts.buyNow.map((p) => ({
      ...p,
      productPrice: parseFloat(p.productPrice),
    })),
    auctionProducts: selectedProducts.auction.map((p) => ({
      ...p,
      startingPrice: parseFloat(p.startingPrice),
      reservedPrice: parseFloat(p.reservedPrice),
    })),
    giveawayProducts: selectedProducts.giveaway.map((p) => ({
      ...p,
      requireAutoFollow: Boolean(p.requireAutoFollow), // Ensure boolean type
    })),
  };
        setloading(true);
        console.log('Updating show with payload:')
       const res= await axiosInstance.put(`/shows/tag/${showId}`,payload);
        productListSheetRef.current?.close();
// console.log(res.data)
Toast(res.data.message || 'Product added successfully')
setSuccessfull(true);
// Show success message
setSelectedCategory(null);
onRefresh()
        // setTimeout(() => {
          // ToastAndroid.show(
          // `Successfully product added to ${selectedCategory.name}!`,
          // ToastAndroid.SHORT,
          // );
        //   // onProductAdded?.(selectedProduct, selectedCategory);
        // }, 300);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    }
  };

  const handleCancel = () => {
    setSelectedCategory(null);
    categorySheetRef.current?.close();
  };
const checkProductInShow = (productId) => {
  if (!show || !productId) return null;

  // Check auctionProducts
  if (show.auctionProducts?.some((product) => product.productId?._id === productId)) {
    return 'auction';
  }

  // Check buyNowProducts
  if (show.buyNowProducts?.some((product) => product.productId?._id === productId)) {
    return 'buyNow';
  }

  // Check giveawayProducts
  if (show.giveawayProducts?.some((product) => product.productId?._id === productId)) {
    return 'giveaway';
  }

  // Product not found in any category
  // return null;
};
  const renderProductItem = ({item}) => {
    const imageurl = `${AWS_CDN_URL}${item?.images[0]?.key}`;
    const isselected = checkProductInShow(item._id);
    // console.log(isselected)
    return (
      <View style={styles.productItem}>
        {/* {console.log(item.images)} */}
        <Image source={{uri: imageurl}} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName}numberOfLines={2}>{item?.title}</Text>
          <Text style={styles.productCondition}>{item?.category}</Text>
          <Text style={styles.productPrice}>
            ₹{item?.MRP} 
          </Text>
        </View>
        <TouchableOpacity
        disabled={isselected?true:false}
          style={[styles.addButton, isselected && {backgroundColor: '#555'}]}
          onPress={() => handleAddProduct(item)}>
          <Text style={styles.addButtonText}>Add product</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategoryItem = ({item}) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?._id === item._id && styles.selectedCategoryItem,
      ]}
      onPress={() => handleCategorySelect(item)}>
      <View style={[styles.categoryIcon, {backgroundColor: item.color}]}>
        <Text style={styles.categoryIconText}>{item.icon}</Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDescription}>{item.description}</Text>
      </View>
      <View
        style={[
          styles.radioButton,
          selectedCategory?.id === item.id && styles.selectedRadioButton,
        ]}>
        {selectedCategory?.id === item.id && (
          <View style={styles.radioButtonInner} />
        )}
      </View>
    </TouchableOpacity>
  );
  const fetchProducts = async (page = 1, refreshing = false) => {
    if (!refreshing && currentPage != 1) setloading(true);
    try {
      const response = await axiosInstance.get(`/product/listing/seller?page=${page}&search=${searchTerm}`);
      const data = response.data.data;

      const newProducts = data.products || [];

      if (page === 1 || refreshing) {
        setProducts(newProducts); // Fresh load
      } else {
        setProducts(prev => [...prev, ...newProducts]); // Append
      }

      setCurrentPage(data.page);
      setTotalPages(data.totalPages || 1);

      // Prepare quantity map and total quantity
      let total = 0;
      const quantityMap = {};
      if (Array.isArray(newProducts)) {
        newProducts.forEach(product => {
          const qty = product?.quantity || 0;
          quantityMap[product?._id] = qty;
          total += qty;
        });
      }
    } catch (err) {
      console.log('Error fetching products:', err);
    } finally {
      setloading(false);
      // setIsRefreshing(false);
      setIsFetchingMore(false);
    }
  };
  useEffect(() => {
    // const fetchProducts = async () => {
    //   try {
    //     setloading(true);
    //     const res = await axiosInstance.get(`/product/listing/seller`);
    //     setProducts(res.data.data.products);
    //   } catch (error) {
    //     console.log(error);
    //   } finally {
    //     setloading(false);
    //   }
    // };
    fetchProducts();
  }, [searchTerm]);

  return (
    <>
      {/* Product List Bottom Sheet */}
      <RBSheet
        ref={productListSheetRef}
        height={height * 0.8}
        openDuration={250}
        closeDuration={200}
        onClose={onClose}
        draggable={true}
        closeOnPressBack
        // dragOnContent={true}
        customStyles={{
          wrapper: styles.sheetWrapper,
          container: styles.sheetContainer,
        }}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Add new product</Text>
        </View>

        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item._id}
          style={styles.productsList}
          nestedScrollEnabled
          ListHeaderComponent={<SearchComponent searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (currentPage < totalPages && !isFetchingMore) {
              setIsFetchingMore(true);
              fetchProducts(currentPage + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={ <View className="flex-1 justify-center items-center px-8">
      {/* Icon */}
      <View className="w-24 h-24 bg-white/20 rounded-full justify-center items-center">
        <Feather name="package" size={40} color="white" />
      </View>
      <TouchableOpacity 
        className=" px-6  rounded-full"
        onPress={() => {
          console.log('🔷 ProductBottomSheet: Navigate to Products pressed, navigation:', navigation);
          if (navigation) {
            navigation.navigate('Products');
          } else {
            console.log('❌ ProductBottomSheet: Navigation is null, cannot navigate');
          }
        }}
      >
      {/* Text */}
      <Text className="text-2xl font-bold text-white mb-2 text-center">
        No Products Yet
      </Text>
      <Text className="text-white text-center mb-8">
        Create a product to add
      </Text>
      
      {/* Button */}
      
        {/* <View className="flex-row items-center">
          <Feather name="plus" size={20} color="#facc15" />
          <Text className="text-yellow-500 font-semibold ml-2">
            Add Product
          </Text>
        </View> */}
      </TouchableOpacity>
    </View>}
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator
                size="small"
                color="#FFD700"
                style={{marginVertical: 10}}
              />
            ) : null
          }
          contentContainerStyle={styles.productsListContent}
        />
      </RBSheet>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.primaryButtonColor} size={'small'} />
        </View>
      )}
      {/* Category Selection Bottom Sheet */}
      <RBSheet
        ref={categorySheetRef}
        height={height * 0.8}
        openDuration={250}
        // dragOnContent={true}
        draggable={true}
        // closeDuration={200}
        customStyles={{
          wrapper: styles.sheetWrapper,
          container: styles.categorySheetContainer,
        }}>
        <ScrollView
          style={styles.categorySheetContent}
          contentContainerStyle={{marginBottom: 20}}>
          {successfull && (
            <Text style={styles.successTitle}>
              Successfully product added !!
            </Text>
          )}
          {selectedProduct && (
            <View style={styles.selectedContianer}>
              <View style={styles.selectedProductHeader}>
                <Image
                  source={{
                    uri: `${AWS_CDN_URL}${selectedProduct?.images[0]?.key}`,
                  }}
                  style={styles.selectedProductImage}
                />
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductName} numberOfLines={2}>
                    {selectedProduct?.title}
                  </Text>
                  <Text style={styles.selectedProductCondition} numberOfLines={3}>
                    {selectedProduct?.description}
                  </Text>
                  <Text style={styles.selectedProductPrice}>
                    ₹{selectedProduct?.MRP}{' '}
                    <Text
                      style={{
                        color: '#ccc',
                        textDecorationLine: 'line-through',
                        fontSize: 10,
                      }}>
                      ₹{selectedProduct?.productPrice}
                    </Text>
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: '100%',
                  height: 1,
                  backgroundColor: '#777',
                  margin: 10,
                }}
              />
              <Text style={{color: '#ccc'}}>
                Excellent condition, barely used. Includes original box and
                accessories.
              </Text>
              {/* </View> */}
            </View>
          )}

          {!successfull && (
            <>
              <Text style={styles.categorySheetTitle}>Choose Category</Text>

              <View style={styles.categoriesList}>
                {categories.map(category => (
                  <View key={category.id}>
                    {renderCategoryItem({item: category})}
                  </View>
                ))}
              </View>

              <View style={styles.categoryButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryActionButton,
                    styles.addProductButton,
                    !selectedCategory && styles.disabledButton,
                  ]}
                  onPress={handleConfirmAddProduct}
                  disabled={!selectedCategory}>
                  <Text style={styles.categoryActionButtonText}>
                    + Add Product
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.categoryActionButton, styles.cancelButton]}
                  onPress={handleCancel}>
                  <Text
                    style={[
                      styles.categoryActionButtonText,
                      styles.cancelButtonText,
                    ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </RBSheet>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    // backgroundColor: 'rgba(0, 0, 0, 0.8)',
    // alignItems:'center',flex:1,
    // justifyContent:'center'
  },
  sheetWrapper: {},
  sheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  categorySheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHeader: {
    padding: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: '#333',
    alignItems: 'center',
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productsListContent: {
    paddingVertical: 16,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productCondition: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  productPrice: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '600',
  },
  originalPrice: {
    color: '#08E85B',
    fontSize: 10,
    // textDecorationLine: 'line-through',

    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySheetContent: {
    flex: 1,
    padding: 20,
    // bottom:30
  },
  successTitle: {
    color: '#F7CE45',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  selectedContianer: {
    padding: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1B1B1B',
  },
  selectedProductHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    // marginBottom: 20,
    alignItems: 'center',
  },
  selectedProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 12,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedProductCondition: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  selectedProductPrice: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Roboto Condensed',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoriesList: {
    // flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    backgroundColor: '#1B1B1B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    // borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategoryItem: {
    borderColor: '#ffd700',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    color: '#888',
    fontSize: 14,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadioButton: {
    borderColor: '#ffd700',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffd700',
  },
  categoryButtonsContainer: {
    paddingTop: 20,
  },
  categoryActionButton: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  addProductButton: {
    backgroundColor: '#ffd700',
  },
  disabledButton: {
    backgroundColor: '#FACC15',
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    marginBottom: 30,
    borderColor: '#666',
  },
  categoryActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelButtonText: {
    color: '#fff',
  },
});

export default ProductBottomSheet;
