import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ToastAndroid } from 'react-native';
import { ShoppingCart, Hammer, Gift } from "lucide-react-native"; 
import ProductSelectionList from './ProductSelectionList';
import SelectedProductList from './SelectedProducts'; 
import axiosInstance from '../../Utils/Api';
// --- End Imports ---



const ProductTab = React.memo(({ onSelectProducts, initialSelectedProducts = { buyNow: [], auction: [], giveaway: [] } }) => {
  // console.log(initialSelectedProducts)
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("buyNow");
  const [selectedProducts, setSelectedProducts] = useState(initialSelectedProducts);
  const [validationErrors, setValidationErrors] = useState({});
  const [searchQuery] = useState('');
  const [openSellerId, setOpenSellerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableGroupedProducts, setAvailableGroupedProducts] = useState([]);


  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isLoading && groupedProducts.length === 0) return;

    const query = searchQuery.toLowerCase();
    const allSelectedIds = [
      ...selectedProducts.buyNow.map(p => p.productId),
      ...selectedProducts.auction.map(p => p.productId),
      ...selectedProducts.giveaway.map(p => p.productId)
    ];

    const filteredAndGrouped = groupedProducts
      .map(group => {
        const availableProdsInGroup = group.products.filter(p => {
          const isSelected = allSelectedIds.includes(p._id);
          if (isSelected) return false;

          if (!query) return true;

          return (
            p.title?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query) ||
            p.subcategory?.toLowerCase().includes(query)
          );
        });

        if (availableProdsInGroup.length > 0) {
          return { ...group, products: availableProdsInGroup };
        }
        return null;
      })
      .filter(group => group !== null);

    setAvailableGroupedProducts(filteredAndGrouped);

    if (openSellerId && !filteredAndGrouped.some(g => g.sellerInfo._id === openSellerId)) {
      setOpenSellerId(null);
    }

  }, [groupedProducts, selectedProducts, searchQuery, openSellerId, isLoading]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setGroupedProducts([]);
    setAvailableGroupedProducts([]);
    try {
  
        const { data } = await axiosInstance.get('/product/listing/dropshipper')
      
      if (data.status && Array.isArray(data.data)) {
      
        setGroupedProducts(data.data);
      } else {
        console.error("Invalid data structure received:", data);
        setGroupedProducts([]);
      }
    } catch (error) {
      console.log("Error fetching products:", error);
      ToastAndroid.show(error.response.data.message,ToastAndroid.SHORT);
      setGroupedProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (tabType, product) => {
    const newProduct = {
      productId: product._id,
      title: product.title,
      images: product.images,
      imageUrl: product.imageUrl,
      ...(tabType === "buyNow" && { productPrice: product.productPrice?.toString() || "" }),
      ...(tabType === "auction" && { startingPrice: product.startingPrice?.toString() || "", reservedPrice: product.reservedPrice?.toString() || "" }),
      ...(tabType === "giveaway" && { followersOnly: false }),
    };

    setSelectedProducts((prev) => ({
      ...prev,
      [tabType]: [...prev[tabType], newProduct],
    }));

    const newIndex = selectedProducts[tabType].length;
    setValidationErrors(prevErr => {
      const updatedErrors = { ...prevErr };
      delete updatedErrors[`${tabType}-${newIndex}-price`];
      delete updatedErrors[`${tabType}-${newIndex}-starting`];
      delete updatedErrors[`${tabType}-${newIndex}-reserved`];
      return updatedErrors;
    });
  };

  const handleProductRemove = (tabType, productId) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [tabType]: prev[tabType].filter((p) => p.productId !== productId),
    }));

    setValidationErrors(prevErr => {
      const updatedErrors = { ...prevErr };
      Object.keys(updatedErrors).forEach(key => {
        if (key.startsWith(`${tabType}-`) && selectedProducts[tabType].findIndex(p => p.productId === productId) === parseInt(key.split('-')[1])) {
          delete updatedErrors[key];
        }
      });
      return updatedErrors;
    });
  };

  const handleSelectedProductChange = (productId, field, value, type) => {
    if (type === 'buyNow' || type === 'auction') {
      const regex = /^\d*\.?\d*$/; 
      if (value === "" || regex.test(value)) {
        setSelectedProducts((prev) => ({
          ...prev,
          [type]: prev[type].map((p) =>
            p.productId === productId ? { ...p, [field]: value } : p
          ),
        }));

        const index = selectedProducts[type].findIndex(p => p.productId === productId);
        const errorField = field === 'productPrice' ? 'price' : field === 'startingPrice' ? 'starting' : 'reserved';
        setValidationErrors(prev => ({ ...prev, [`${type}-${index}-${errorField}`]: undefined }));
      }
    }
  };

  const handleGiveawayToggleChange = (productId, checked) => {
    setSelectedProducts((prev) => ({
      ...prev,
      giveaway: prev.giveaway.map((p) =>
        p.productId === productId ? { ...p, followersOnly: checked } : p
      ),
    }));
  };

  const validateSelectedFields = () => {
    const errors = {};
    const priceRegex = /^[1-9]\d*(\.\d+)?$/;

    selectedProducts.buyNow.forEach((product, index) => {
      if (!product.productPrice || !priceRegex.test(product.productPrice)) {
        errors[`buyNow-${index}-price`] = "Requires a valid price > 0";
      }
    });

    selectedProducts.auction.forEach((product, index) => {
      if (!product.startingPrice || !priceRegex.test(product.startingPrice)) {
        errors[`auction-${index}-starting`] = "Requires a valid start price > 0";
      }
      if (product.reservedPrice && (!priceRegex.test(product.reservedPrice))) {
        errors[`auction-${index}-reserved`] = "If entered, requires a valid reserve price > 0";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateSelectedFields()) {
      ToastAndroid.show("Please correct the errors in the selected products section(s).",ToastAndroid.SHORT);
      return;
    }

    const formattedSelectedProducts = {
      buyNow: selectedProducts.buyNow.map(p => ({
        productId: p.productId,
        productPrice: parseFloat(p.productPrice),
      })),
      auction: selectedProducts.auction.map(p => ({
        productId: p.productId,
        startingPrice: parseFloat(p.startingPrice),
        reservedPrice: p.reservedPrice ? parseFloat(p.reservedPrice) : null,
      })),
      giveaway: selectedProducts.giveaway.map(p => ({
        productId: p.productId,
        followersOnly: Boolean(p.followersOnly),
      }))
    };

    onSelectProducts(formattedSelectedProducts);
    ToastAndroid.show("Product selections confirmed!",ToastAndroid.SHORT);
  };

  const tabInfo = {
    buyNow: { label: "Buy Now", icon: ShoppingCart },
    auction: { label: "Auction", icon: Hammer },
    giveaway: { label: "Giveaway", icon: Gift },
  };

  const totalSelectedCount =
    selectedProducts.buyNow.length +
    selectedProducts.auction.length +
    selectedProducts.giveaway.length;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
      >
        <View style={styles.tabs}>
          {Object.keys(tabInfo).map((tabKey) => {
            const IconComponent = tabInfo[tabKey].icon;
            const { label } = tabInfo[tabKey];

            return (
              <TouchableOpacity
                key={tabKey}
                style={[styles.tab, activeTab === tabKey && styles.activeTab]}
                onPress={() => setActiveTab(tabKey)}
              >
                <IconComponent size={18} />
                <Text>{label} ({selectedProducts[tabKey].length})</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.content}>
        <ProductSelectionList
          availableGroupedProducts={availableGroupedProducts}
          onSelect={handleProductSelect}
          openSellerId={openSellerId}
          setOpenSellerId={setOpenSellerId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          type={activeTab}
        />

        <SelectedProductList
          selected={selectedProducts[activeTab]}
          onRemove={handleProductRemove}
          onChange={activeTab === 'giveaway' ? handleGiveawayToggleChange : handleSelectedProductChange}
          type={activeTab}
          getValidationError={(type, index, field) => validationErrors[`${type}-${index}-${field}`]}
        />
      </View>

      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, { opacity: totalSelectedCount === 0 || Object.keys(validationErrors).some(key => validationErrors[key]) ? 0.5 : 1 }]}
          onPress={handleSubmit}
          disabled={totalSelectedCount === 0 || Object.keys(validationErrors).some(key => validationErrors[key])}
        >
          <Text style={styles.submitText}>Confirm Selection ({totalSelectedCount})</Text>
        </TouchableOpacity>
        {Object.keys(validationErrors).some(key => validationErrors[key]) && (
          <Text style={styles.errorText}>Please fix errors in selected products before confirming.</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
    borderRadius:10,
    padding:10,
    marginBottom:10,
  },
  tabsScrollView: {
    flexGrow: 0,
    maxHeight: 60,
  },
  tabs: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    gap:5,
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007BFF',
  },
  content: {
    flex: 1,
  },
  submitContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
});

export default ProductTab;
