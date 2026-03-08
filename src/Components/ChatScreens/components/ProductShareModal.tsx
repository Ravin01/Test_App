import React, {useState, useEffect, useRef
} from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { X, Package } from "lucide-react-native"; // or use react-native-vector-icons
import { AWS_CDN_URL } from "../../../../Config";
import axiosInstance from '../../../Utils/Api';

const ProductShareModal = ({
  showProductPicker,
  isSeller,
  setShowProductPicker,
  handleProductShare,
  //handleProductScroll,
}) => {
  if (!showProductPicker || !isSeller) return null;

      // Product share states
    const [sellerProducts, setSellerProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsPage, setProductsPage] = useState(1);
    const [productsHasMore, setProductsHasMore] = useState(true);
    const [productsSearch, setProductsSearch] = useState('');

      const typingTimeoutRef = useRef(null);

      const handleProductScroll = ()=>{
        if (productsHasMore && !productsLoading) {
        fetchSellerProducts(productsPage + 1, productsSearch);
        }
      }

 const handleProductSearch = (text) => {
    setProductsSearch(text);

    // Debounce search
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setSellerProducts([]);
      setProductsPage(1);
      fetchSellerProducts(1, text);
    }, 500);
  };

      const fetchSellerProducts = async (page, search) => {
        try {
            setProductsLoading(true);
            
            const params = {
                page,
                limit: 20,
                search: search || undefined
            };

            const response = await axiosInstance.get('/product/listing/seller', { params });

            if (response.data?.data?.products) {
                const { products: newProducts, page: currentPage, totalPages } = response.data.data;
                
                setSellerProducts(prev => page === 1 ? newProducts : [...prev, ...newProducts]);
                setProductsPage(currentPage);
                setProductsHasMore(currentPage < totalPages);
            }
        } catch (error) {
            console.error('Error fetching seller products:', error);
           // negative('Failed to load products');
        } finally {
            setProductsLoading(false);
        }
    };

        // Fetch seller products when product share is opened
    useEffect(() => {
        if (showProductPicker && isSeller && sellerProducts.length === 0) {
            fetchSellerProducts(1, '');
        }
    }, [showProductPicker, isSeller]);

  return (
    <Modal
      visible={showProductPicker}
      animationType="fade"
      transparent
      onRequestClose={() => setShowProductPicker(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Package color="#FFD700" size={24} />
              <Text style={styles.headerText}>Share Your Products</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowProductPicker(false)}
              style={styles.closeButton}
            >
              <X color="#aaa" size={20} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your products..."
              placeholderTextColor="#888"
              value={productsSearch}
              onChangeText={handleProductSearch}
            />
          </View>

          {/* Product List */}
          <View style={styles.listContainer}>
            {productsLoading && sellerProducts.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : sellerProducts.length === 0 ? (
              <View style={styles.centered}>
                <Package color="#555" size={48} />
                <Text style={styles.noProductsText}>No products found</Text>
              </View>
            ) : (
              <FlatList
                data={sellerProducts}
                style={{ maxHeight: 300 }}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: "space-between" }}
                onEndReached={handleProductScroll}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{ paddingBottom: 20}}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.productCard}
                    onPress={() => handleProductShare(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.productContent}>
                      <Image
                        source={{
                          uri:
                            item.images?.[0]?.key
                              ? `${AWS_CDN_URL}${item.images[0].key}`
                              : "https://via.placeholder.com/150",
                        }}
                        style={styles.productImage}
                      />
                      <View style={styles.productInfo}>
                        <Text
                          style={styles.productTitle}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={styles.productSub}
                          numberOfLines={1}
                        >
                          {item.subcategory}
                        </Text>
                        <Text style={styles.productPrice}>
                          ₹{item.productPrice}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  productsLoading && sellerProducts.length > 0 ? (
                    <View style={styles.footerLoading}>
                      <ActivityIndicator size="small" color="#FFD700" />
                      <Text style={styles.loadingMoreText}>Loading more...</Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProductShareModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#333",
    paddingBottom: 10
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#333",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    borderBottomWidth: 1,
    borderColor: "#333",
    padding: 12,
  },
  searchInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listContainer: {
   // flex: 1,
    padding: 12,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#aaa",
    marginTop: 8,
  },
  noProductsText: {
    color: "#888",
    marginTop: 8,
  },
  productCard: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    width: "48%",
  },
  productContent: {
    flexDirection: "row",
    gap: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productTitle: {
    color: "#fff",
    fontWeight: "600",
  },
  productSub: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 2,
  },
  productPrice: {
    color: "#4ade80",
    fontWeight: "bold",
    marginTop: 4,
  },
  footerLoading: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingMoreText: {
    color: "#aaa",
    marginLeft: 6,
  },
});
