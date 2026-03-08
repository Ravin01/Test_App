import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ToastAndroid,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Fontisto from 'react-native-vector-icons/Fontisto';
import {ActivityIndicator, FAB} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import moment from 'moment';
import api from '../../Utils/Api';

const ViewShopableShipper = ({navigation}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setsearch] = useState('');

  // const Navigation = useNavigation();

  // Fetch products from API
  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const productResponse = await api.get(`/shoppable-videos/my-videos`);
      console.log('Fetched videos:', productResponse.data.data);
      setProducts(productResponse.data.data);
      setFilteredProducts(productResponse.data.data);
    } catch (err) {
      console.log('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use both useFocusEffect and navigation listener for reliability
  useFocusEffect(
    React.useCallback(() => {
      console.log('Screen focused - fetching videos');
      fetchProducts();
      return () => {
        console.log('Screen unfocused');
      };
    }, [fetchProducts]),
  );

  // Add navigation listener as backup
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Navigation focus event - fetching videos');
      fetchProducts();
    });

    return unsubscribe;
  }, [navigation, fetchProducts]);
  // Handle product rendering
  const renderProduct = ({item: selectedProduct}) => {
    const imageUrls = selectedProduct.thumbnailURL || [];
    // console.log(imageUrls)
    const handledelete = async id => {
      setLoading(true);
      try {
        await api.delete(`/shoppable-videos/${id}`);
        fetchProducts()
        ToastAndroid.show('Shoppable Video Deleted. ', ToastAndroid.SHORT);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <View key={selectedProduct._id} style={styles.productCard}>
        <Image
          source={{uri: imageUrls}}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={{width: '68%'}}>
          <Text style={styles.productTitle}>{selectedProduct?.title}</Text>
          <Text style={styles.productDescription}>
            {selectedProduct?.description}
          </Text>
          <Text style={styles.productExpiryDate}>
            {selectedProduct.category}
          </Text>
          <View style={{flexDirection: 'row', gap: 5, marginBottom: 10}}>
            <TouchableOpacity
              style={[styles.addButton, {backgroundColor: '#7480ff'}]} onPress={()=>navigation.navigate('ShoppableVideoDetail',{id:selectedProduct._id})}>
              <AntDesign name="eyeo" size={20} color="#fff" />
              <Text style={{color: '#fff'}}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, {backgroundColor: '#ff5861'}]}
              onPress={() => handledelete(selectedProduct._id)}>
              <AntDesign name="delete" size={20} />
              <Text>Delete</Text>
            </TouchableOpacity>
          </View>
          <Text style={{textAlign: 'right', color: '#ccc', marginRight: 10}}>
            {moment(selectedProduct.createdAt).fromNow()}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    
    if (search) {
      const query = search.toLowerCase();
      setFilteredProducts(
        products.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.category.toLowerCase().includes(query) ||
          p.subcategory.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [products, search]);
  return (
    <>
      {/* {loading && (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color="gray" size={20} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      )} */}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateShipperVideo')}
      />

      <View style={styles.container}>
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item._id}
          renderItem={renderProduct}
          // contentContainerStyle={styles.container}
          ListHeaderComponent={
            <View style={{padding: 10}}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={20} />
                <Text style={{fontSize: 17}}>Back</Text>
              </TouchableOpacity>

              <Text style={styles.headerText}>Shoppable Videos</Text>

              <View style={styles.inputContainer}>
                <AntDesign name="search1" size={20} />
                <TextInput
                  placeholder="search"
                  placeholderTextColor={'#777'}
                  value={search}
                  onChangeText={setsearch}
                />
              </View>
              {/* </View> */}
            </View>
          }
          scrollEnabled
          ListEmptyComponent={
            <View style={styles.noProductsContainer}>
              <Animatable.View animation={'shake'} iterationCount={1}>
                <Fontisto name="shopping-basket-add" size={35} color="#777" />
              </Animatable.View>
              <Text style={{textAlign: 'center', color: '#777'}}>
                Your Shoppable Video is currently empty.
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  stockImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    // backgroundColor:'red'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
    marginBottom: 20,
  },
  backButtonText: {
    color: 'black',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    height: 50,
    // justifyContent: 'space-between',

    // marginBottom: 20,
    paddingHorizontal: 10,
  },

  fab: {
    position: 'absolute',
    // margin: 16,
    borderRadius: 40,
    marginBottom: 10,
    alignItems: 'center',
    // height:50,
    right: 20,
    alignSelf: 'center',
    zIndex: 1,
    bottom: 0,
    backgroundColor: '#fbdd74',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '60%',
    marginTop: 10,
    alignItems: 'center',
    marginLeft: 10,
    paddingVertical: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    // borderBottomWidth: 1,
    backgroundColor: '#fff',
    elevation: 2,
    // borderBottomColor: '#ccc',
  },
  tab: {
    paddingVertical: 8,
    flexDirection: 'row',
    paddingHorizontal: 10,
    justifyContent: 'center',
    // width: '50%',
    alignItems: 'center',

    gap: 10,
    borderRadius: 15,
    // marginBottom: 10,
  },
  selectedTab: {
    backgroundColor: '#fbdd74',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  selectedTabText: {
    color: 'black',
  },
  editButton: {
    // backgroundColor: '#f9dd7c',
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    // padding: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    borderRadius: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 10,
    flexDirection: 'row',
    paddingVertical: 7,
    elevation: 5,
    gap: 10,
    marginTop: 10,
    marginRight: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fbdd74',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  container: {
    backgroundColor: '#F7CE45',
    padding: 10,
    flex: 1,
    paddingBottom: 50,
    // marginBottom:100
    // padding:10
    // flex:1
  },
  headerText: {
    color: '#374151',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'left',
    textTransform: 'capitalize',
  },
  productCard: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 10,
    borderRadius: 10,
    padding: 15,
    elevation: 5,
  },
  productImage: {
    height: 150,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor:'#ccc',
    width: 100,
    marginRight: 10, // space between images if multiple
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    // marginBottom: 10,
    textTransform:'capitalize',
  },
  productDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    lineHeight: 20,
  },
  productQuantity: {
    fontSize: 14,
    color: '#333',
    // marginBottom: 15,
  },
  productExpiryDate: {
    fontSize: 16,
    // textAlign:'center',
    width: '90%',
    color: '#555',
    marginBottom: 12,
  },
  noProductsContainer: {
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 20,
  },
});

export default ViewShopableShipper;
