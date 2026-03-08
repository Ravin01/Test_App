import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axiosInstance from '../../Utils/Api';
import {AWS_CDN_URL} from '../../Utils/aws';

const ProductTabShopaAble = ({ onSelectProducts, initialSelectedProducts = [] }) => {
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(initialSelectedProducts);
  const [availableGroupedProducts, setAvailableGroupedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [openSellerId, setOpenSellerId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = groupedProducts.map(group => {
      const filteredProducts = products.filter(p => {
        if (selectedProducts.includes(p._id)) return false;
        if (!query) return true;
        return (
          p.title?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.subcategory?.toLowerCase().includes(query)
        );
      });
      if (filteredProducts.length > 0) {
        return { ...group, products: filteredProducts };
      }
      return null;
    }).filter(Boolean);
    setAvailableGroupedProducts(filtered);
  }, [groupedProducts, selectedProducts, searchQuery]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get('/product/listing/dropshipper');
      if (data.status && Array.isArray(data.data)) {
       
        setGroupedProducts(data.data);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    if (!selectedProducts.includes(productId)) {
      setSelectedProducts(prev => [...prev, productId]);
    }
  };

  const handleProductRemove = (productId) => {
    setSelectedProducts(prev => prev.filter(id => id !== productId));
  };

  const selectedProductDetails = selectedProducts.map(id => {
    for (const group of groupedProducts) {
      const product = group.products.find(p => p._id === id);
      if (product) return product;
    }
    return null;
  }).filter(Boolean);

  const flatData = availableGroupedProducts.flatMap(group => {
    const sellerHeader = {
      type: 'header',
      id: `header-${group.sellerInfo._id}`,
      sellerInfo: group.sellerInfo,
      count: group.products.length
    };
    const products = group.products.map(product => ({
      type: 'product',
      ...product,
      sellerId: group.sellerInfo._id,
    }));
    return [sellerHeader, ...products];
  });

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
       
        <TouchableOpacity onPress={() => setOpenSellerId(openSellerId === item.sellerInfo._id ? null : item.sellerInfo._id)}>
          <View style={styles.accordionHeader}>
            <Text style={styles.accordionTitle}>
              {item.sellerInfo.companyName || item.sellerInfo.userInfo?.name || 'Unknown Seller'}
            </Text>
            <Text style={styles.accordionBadge}>{item.count} items</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (openSellerId !== item.sellerId) return null;

    return (
      <View style={styles.productRow}>
        
        <Image source={{ uri: `${AWS_CDN_URL}${item.images[0]?.key}` }} style={styles.productImage} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text style={styles.productSub}>{item.category} / {item.subcategory}</Text>
          <Text style={styles.productPrice}>₹{item.productPrice}</Text>
        </View>
        <TouchableOpacity onPress={() => handleProductSelect(item._id)} style={styles.addButton}>
          <Icon name="plus-circle" size={18} color="#4F46E5" />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    const totalAvailableCount = availableGroupedProducts.reduce((sum, group) => sum + group.products.length, 0);
    return (
      <View>
        <Text style={styles.title}>Add Products to Your Show</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>{totalAvailableCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Selected</Text>
            <Text style={styles.statValue}>{selectedProducts.length}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#aaa" style={{ position: 'absolute', left: 10, top: 12 }} />
          <TextInput
            placeholder="Search products by name, category..."
            placeholderTextColor={"#777"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <View >
      {selectedProductDetails.length > 0 && (
        <View style={styles.selectedSection}>

          <Text style={styles.sectionTitle}>Selected Products</Text>
          {selectedProductDetails.map((product) => (
            <View key={product._id} style={styles.productRow}>
              <Image source={{ uri: `${AWS_CDN_URL}${product.images[0].key}` }}style={styles.productImage} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productSub}>{product.category} / {product.subcategory}</Text>
              </View>
              <TouchableOpacity onPress={() => handleProductRemove(product._id)} style={styles.removeButton}>
                <Icon name="trash-2" size={18} color="red" />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        disabled={selectedProducts.length === 0}
        onPress={() => onSelectProducts(selectedProducts)}
        style={[styles.submitButton, selectedProducts.length === 0 && { backgroundColor: '#ccc' }]}
      >
        <Text style={styles.submitText}>Confirm Selection ({selectedProducts.length})</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{backgroundColor:'#fff',padding:5,borderRadius:10,marginBottom:10}}>
  {  isLoading ? (
      <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
    ) : (
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.type === 'header' ? item.id : item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{gap:10}}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={<Text style={styles.noData}>No Products Found</Text>}
      />)}
      </View>
    
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  statsContainer: { flexDirection: 'row', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#E0E7FF', padding: 12, margin: 4, borderRadius: 8, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#1E40AF', fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
  searchBox: { marginBottom: 16 },
  input: {
    padding: 10,
    paddingLeft: 36,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8
  },
  noData: { textAlign: 'center', marginTop: 40, color: '#888' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8,marginBottom:10 },
  accordionTitle: { fontWeight: '600' },
  accordionBadge: { fontSize: 12, color: '#4B5563' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 10,marginBottom:10, },
  productImage: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#eee' },
  productTitle: { fontWeight: 'bold', fontSize: 14 },
  productSub: { fontSize: 12, color: '#666' },
  productPrice: { fontSize: 14, color: 'green', fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  addText: { color: '#4F46E5', marginLeft: 4 },
  selectedSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  removeButton: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  removeText: { color: 'red', marginLeft: 4 },
  submitButton: {
    marginTop: 24,
    padding: 14,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30
  },
  submitText: { color: '#fff', fontWeight: 'bold' }
});

export default ProductTabShopaAble;
