/* eslint-disable react/no-unstable-nested-components */
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axiosInstance from '../../../../Utils/Api';
import {AWS_CDN_URL} from '../../../../Utils/aws';
import {colors} from '../../../../Utils/Colors';
import ToggleSwitch from 'toggle-switch-react-native';
import {checkBgaHealth} from '../../../../Utils/bgaAxiosInstance';
import {Toast} from '../../../../Utils/dateUtils';
import BundleSaleTabContent from './BundleSaleTabContent';
import AuctionTabContent from './AuctionTabContent';
import GiveawayTabContent from './GiveawayTabContent';
import styles from './StylesForProductLS';
import BuyNowTabContent from './BuyNowTabContent';

// ============= TYPE DEFINITIONS =============
interface Product {
  _id: string;
  title: string;
  images: Array<{key: string}>;
  quantity: number;
  productPrice?: number;
  imageUrl?: string;
  startingPrice?: number;
  reservedPrice?: number;
  isVariant?: boolean;
  isParentProduct?: boolean;
  isVariantProduct?: boolean;
  parentProductId?: string;
  parentId?: string;
  variantCount?: number;
  totalVariantStock?: number;
}

interface SelectedProduct {
  productId: string;
  title: string;
  imageUrl: string;
  quantity: number;
  productPrice?: string;
  buyNowQuantity?: string;
  startingPrice?: string;
  reservedPrice?: string;
  auctionQuantity?: string;
  requireAutoFollow?: boolean;
  giveawayQuantity?: string;
  giveawayTier?: string;
  minWatchDuration?: number;
  preBidsEnabled?: boolean;
  preBidIncrement?: number;
  _tempId?: string;
  productTitle?: string;
  productOwnerSellerId?: string;
  giveawayObjectId?: string;
  isActive?: boolean;
  isGiveawayEnded?: boolean;
  giveawayStatus?: string;
  [key: string]: any;
}

interface SelectedProductsState {
  buyNow: SelectedProduct[];
  auction: SelectedProduct[];
  giveaway: SelectedProduct[];
}

interface Show {
  _id?: string;
  scheduledAt?: string;
  buyNowProducts?: Array<{
    productId: Product | string;
    productPrice?: number;
    buyNowQuantity?: number;
  }>;
  auctionProducts?: Array<{
    productId: Product | string;
    startingPrice?: number;
    reservedPrice?: number;
  }>;
  giveawayProducts?: Array<{
    productId: string;
    requireAutoFollow?: boolean;
    giveawayQuantity?: number;
    giveawayObjectId?: string;
    isActive?: boolean;
    isGiveawayEnded?: boolean;
    giveawayStatus?: string;
  }>;
}

interface ProductTabProps {
  initialData?: any;
  onSelectProducts: (products: {
    buyNow: SelectedProduct[];
    auction: SelectedProduct[];
    giveaway: SelectedProduct[];
    bundleSale: SelectedProduct[];
  }) => void;
  show?: Show;
  enabledProductTypes?: {
    buyNow: boolean;
    auction: boolean;
    giveaway: boolean;
    bundleSale?: boolean;
  };
  editMode?: boolean;
  selectedBundleSales?: any[];
  setSelectedBundleSales?: (bundles: any[]) => void;
}

// ============= TAB CONFIGURATION =============
const TAB_INFO = {
  buyNow: {
    label: 'Buy Now',
    icon: 'cart',
    activeColor: '#FFD700',
    inactiveColor: '#1B1B1B',
    incolor: '#fff',
  },
  auction: {
    label: 'Auction',
    icon: 'hammer',
    activeColor: '#FFD700',
    inactiveColor: '#1B1B1B',
    incolor: '#fff',
  },
  giveaway: {
    label: 'Giveaway',
    icon: 'gift',
    activeColor: '#FFD700',
    inactiveColor: '#1B1B1B',
    incolor: '#fff',
  },
} as const;

// ============= HELPER FUNCTIONS =============
const getImageUrl = (product: any): string => {
  if (product.imageUrl) return product.imageUrl;
  if (product.images?.[0]?.key) return `${AWS_CDN_URL}${product.images[0].key}`;
  return 'https://via.placeholder.com/50';
};

// ============= MAIN COMPONENT =============
const ProductTab: React.FC<ProductTabProps> = ({
  initialData = {},
  editMode = false,
  selectedBundleSales = [],
  setSelectedBundleSales,
  onSelectProducts,
  show = {},
  enabledProductTypes = {
    buyNow: false,
    auction: false,
    giveaway: false,
    bundleSale: false,
  },
}) => {
  // ============= STATE =============
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<string>('buyNow');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductsState>({
    buyNow: initialData?.buyNow || [],
    auction: initialData?.auction || [],
    giveaway: initialData?.giveaway || [],
  });
  const [bgaHealthStatus, setBgaHealthStatus] = useState({
    healthy: true,
    checked: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [bundleSaleEnabled, setBundleSaleEnabled] = useState(
    selectedBundleSales.length > 0,
  );
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [organizedProducts, setOrganizedProducts] = useState<Product[]>([]);

  // ============= REFS =============
  const isMountedRef = useRef(false);
  const pendingUpdatesRef = useRef<NodeJS.Timeout | null>(null);
  const selectedProductsRef = useRef(selectedProducts);
  const selectedBundleSalesRef = useRef(selectedBundleSales);

  // Keep refs in sync
  useEffect(() => {
    selectedProductsRef.current = selectedProducts;
  }, [selectedProducts]);

  useEffect(() => {
    selectedBundleSalesRef.current = selectedBundleSales;
  }, [selectedBundleSales]);

  // ============= MEMOIZED VALUES =============
  const totalSelectedProducts = useMemo(
    () =>
      (selectedProducts.buyNow?.length || 0) +
      (selectedProducts.auction?.length || 0) +
      (selectedProducts.giveaway?.length || 0) +
      (selectedBundleSales?.length || 0),
    [selectedProducts, selectedBundleSales],
  );

  // Create stable selected IDs set
  const selectedIds = useMemo(() => {
    return new Set<string>([
      ...selectedProducts.buyNow.map(p => p.productId),
      ...selectedProducts.auction.map(p => p.productId),
      ...selectedProducts.giveaway.map(p => p.productId),
    ]);
  }, [selectedProducts]);

  // ============= CALLBACKS =============
  
  // Debounced parent callback to batch updates
  const notifyParent = useCallback(
    (updatedProducts: SelectedProductsState, updatedBundles?: any[]) => {
      if (pendingUpdatesRef.current) {
        clearTimeout(pendingUpdatesRef.current);
      }

      pendingUpdatesRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onSelectProducts({
            ...updatedProducts,
            bundleSale: updatedBundles ?? selectedBundleSalesRef.current,
          });
        }
      }, 50); // Small debounce for batching rapid updates
    },
    [onSelectProducts],
  );

  // Toggle parent expansion
  const toggleParentExpansion = useCallback((parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

  // Organize products with variants
  const organizeProductsWithVariants = useCallback((productsList: Product[]) => {
    const productMap = new Map<string, Product>();
    const parentProducts: Product[] = [];
    const variantProducts: Product[] = [];

    productsList.forEach(product => {
      const isVariantProduct = product.parentProductId || product.isVariant;
      if (isVariantProduct) {
        variantProducts.push(product);
      } else {
        parentProducts.push(product);
      }
      productMap.set(product._id, product);
    });

    const organized: Product[] = [];
    const processedVariants = new Set<string>();

    parentProducts.forEach(parent => {
      const variants = variantProducts.filter(
        v => v.parentProductId === parent._id && !processedVariants.has(v._id),
      );

      const totalVariantStock = variants.reduce(
        (sum, variant) => sum + (variant.quantity || 0),
        0,
      );
      const hasVariants = variants.length > 0;

      organized.push({
        ...parent,
        variantCount: variants.length,
        totalVariantStock: hasVariants ? totalVariantStock : parent.quantity,
        isParentProduct: hasVariants,
        isVariantProduct: false,
      });

      variants.forEach(variant => {
        organized.push({
          ...variant,
          isVariantProduct: true,
          isVariant: true,
          parentId: parent._id,
        });
        processedVariants.add(variant._id);
      });
    });

    variantProducts.forEach(variant => {
      if (!processedVariants.has(variant._id)) {
        organized.push({
          ...variant,
          isVariantProduct: true,
          isVariant: true,
          parentId: variant.parentProductId,
        });
      }
    });

    return organized;
  }, []);

  // Get display products based on tab
  const getDisplayProducts = useCallback(
    (productsList: Product[], tab: string = 'buyNow') => {
      if (tab === 'buyNow') {
        return productsList.filter(product => {
          if (selectedIds.has(product._id)) return false;
          if (
            product.isVariantProduct ||
            product.isVariant ||
            product.parentProductId
          ) {
            return false;
          }
          return true;
        });
      }

      // For auction and giveaway tabs
      // First, calculate which parent products have available children
      const parentsWithAvailableChildren = new Set<string>();
      
      productsList.forEach(product => {
        if (product.isVariantProduct || product.isVariant) {
          const parentId = product.parentId || product.parentProductId;
          // Check if this variant is not already selected
          if (!selectedIds.has(product._id) && parentId) {
            parentsWithAvailableChildren.add(parentId);
          }
        }
      });

      return productsList.filter(product => {
        // Skip already selected products (except parent products which are just containers)
        if (!product.isParentProduct && selectedIds.has(product._id))
          return false;
        
        // Skip parent products that have no variants (variantCount is 0 or undefined)
        if (product.isParentProduct && (!product.variantCount || product.variantCount === 0)) {
          return false;
        }
        
        // Skip parent products where all children are already selected
        if (product.isParentProduct && !parentsWithAvailableChildren.has(product._id)) {
          return false;
        }
        
        // Hide variant products unless their parent is expanded
        if (
          product.isVariantProduct &&
          !expandedParents.has(product.parentId || '')
        ) {
          return false;
        }
        
        // Also hide variant products that are already selected
        if (product.isVariantProduct && selectedIds.has(product._id)) {
          return false;
        }
        
        return true;
      });
    },
    [selectedIds, expandedParents],
  );

  // Get available products for a tab
  const getAvailableProducts = useCallback(
    (tab: string) => {
      if (activeTab === 'buyNow') {
        return organizedProducts.filter(product => {
          if (selectedIds.has(product._id)) return false;
          if (
            product.isVariant ||
            product.isVariantProduct ||
            product.parentProductId
          ) {
            return false;
          }
          return true;
        });
      }

      return organizedProducts.filter(
        product =>
          !selectedProducts.buyNow.some(p => p.productId === product._id) &&
          !selectedProducts.auction.some(p => p.productId === product._id) &&
          !selectedProducts.giveaway.some(p => p.productId === product._id),
      );
    },
    [organizedProducts, selectedIds, selectedProducts, activeTab],
  );

  // Validation error getter
  const getValidationError = useCallback(
    (tabName: string, index: number, field: string) => {
      return validationErrors[`${tabName}-${index}-${field}`];
    },
    [validationErrors],
  );

  // Validate fields
  const validateFields = useCallback(() => {
    const errors: Record<string, string> = {};

    selectedProducts.buyNow.forEach((product, index) => {
      if (
        product.productPrice === '' ||
        isNaN(parseFloat(product.productPrice || ''))
      ) {
        errors[`buyNow-${index}-price`] =
          'Price is required and must be a number';
      }
    });

    selectedProducts.giveaway.forEach((product, index) => {
      const quantity = parseInt(product.giveawayQuantity || '0');
      if (!product.giveawayQuantity || quantity <= 0 || isNaN(quantity)) {
        errors[`giveaway-${index}-quantity`] =
          'Quantity must be greater than 0';
      } else if (quantity > product.quantity) {
        errors[`giveaway-${index}-quantity`] = `Max available: ${product.quantity}`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedProducts]);

  // Fetch products with optimized state updates
  const fetchProducts = useCallback(
    async (pageNumber = 1) => {
      const isInitialLoad = pageNumber === 1;

      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const response = await axiosInstance.get(
          `/product/listing/seller?page=${pageNumber}&limit=30`,
        );
        const data = response.data.data;

        // Use InteractionManager for smooth UI updates
        InteractionManager.runAfterInteractions(() => {
          if (isInitialLoad) {
            setProducts(data.products || []);
          } else {
            setProducts(prev => [...prev, ...(data.products || [])]);
          }
          setHasNextPage(pageNumber < data.totalPages);
          setPage(pageNumber);
        });
      } catch (error) {
        console.error('Error fetching products:', error);
        setHasNextPage(false);
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [],
  );

  // ============= OPTIMIZED PRODUCT HANDLERS =============
  
  // Handle product selection with optimistic update
  const handleProductSelect = useCallback(
    (tab: string, product: any) => {
      const imageUrl = getImageUrl(product);

      const newProduct: SelectedProduct = {
        productId: product._id,
        title: product.title || 'Untitled Product',
        imageUrl: imageUrl,
        quantity: product.quantity || 0,
        ...(tab === 'buyNow' && {
          productPrice: product.productPrice?.toString() || '',
          buyNowQuantity: product.buyNowQuantity?.toString() || '1',
        }),
        ...(tab === 'auction' && {
          startingPrice: product.startingPrice?.toString() || '',
          reservedPrice: product.reservedPrice?.toString() || '',
          auctionQuantity: product.auctionQuantity?.toString() || '1',
          preBidsEnabled: product.preBidsEnabled || false,
          preBidIncrement: product.preBidIncrement || 50,
        }),
        ...(tab === 'giveaway' && {
          requireAutoFollow: Boolean(product.requireAutoFollow),
          giveawayQuantity: product.giveawayQuantity?.toString() || '1',
          giveawayTier: product.giveawayTier || 'silver',
          minWatchDuration: product.minWatchDuration,
        }),
      };

      // Optimistic update with functional state
      setSelectedProducts(prev => {
        const updated = {
          ...prev,
          [tab]: [...prev[tab as keyof SelectedProductsState], newProduct],
        };
        
        // Schedule parent notification
        InteractionManager.runAfterInteractions(() => {
          notifyParent(updated);
        });
        
        return updated;
      });

      setIsConfirmed(false);
    },
    [notifyParent],
  );

  // Handle product removal with optimistic update
  const handleProductRemove = useCallback(
    (tab: string, productId: string) => {
      // Optimistic update
      setSelectedProducts(prev => {
        const updated = {
          ...prev,
          [tab]: prev[tab as keyof SelectedProductsState].filter(
            p => p.productId !== productId,
          ),
        };

        // Schedule parent notification
        InteractionManager.runAfterInteractions(() => {
          notifyParent(updated);
        });

        return updated;
      });

      setIsConfirmed(false);
    },
    [notifyParent],
  );

  // Handle price/field changes with debounced parent update
  const handlePriceChange = useCallback(
    (productId: string, field: string, value: string) => {
      setIsConfirmed(false);

      setSelectedProducts(prev => {
        const isAuction = prev.auction.some(p => p.productId === productId);
        const isBuyNow = prev.buyNow.some(p => p.productId === productId);

        const updated = {
          ...prev,
          auction: isAuction
            ? prev.auction.map(p =>
                p.productId === productId ? {...p, [field]: value} : p,
              )
            : prev.auction,
          buyNow: isBuyNow
            ? prev.buyNow.map(p =>
                p.productId === productId ? {...p, [field]: value} : p,
              )
            : prev.buyNow,
        };

        // Debounced parent notification for typing
        notifyParent(updated);
        return updated;
      });
    },
    [notifyParent],
  );

  // Handle giveaway field changes
  const handleGiveawayChange = useCallback(
    (productId: string, field: string, value: any) => {
      setIsConfirmed(false);

      setSelectedProducts(prev => {
        const updated = {
          ...prev,
          giveaway: prev.giveaway.map(p =>
            p.productId === productId ? {...p, [field]: value} : p,
          ),
        };

        notifyParent(updated);
        return updated;
      });
    },
    [notifyParent],
  );

  // Handle bundle selection
  const handleBundleSelect = useCallback(
    (bundle: any) => {
      const updatedBundles = [
        ...selectedBundleSalesRef.current,
        {
          ...bundle,
          bundleSaleId: bundle._id,
        },
      ];
      setSelectedBundleSales?.(updatedBundles);
      setIsConfirmed(false);

      if (isMountedRef.current) {
        notifyParent(selectedProductsRef.current, updatedBundles);
      }
    },
    [setSelectedBundleSales, notifyParent],
  );

  // Handle bundle removal
  const handleBundleRemove = useCallback(
    (bundleId: string) => {
      const updatedBundles = selectedBundleSalesRef.current.filter(
        b => b.bundleSaleId !== bundleId,
      );
      setSelectedBundleSales?.(updatedBundles);
      setIsConfirmed(false);

      if (isMountedRef.current) {
        notifyParent(selectedProductsRef.current, updatedBundles);
      }
    },
    [setSelectedBundleSales, notifyParent],
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!validateFields()) {
      return;
    }
    setIsConfirmed(true);

    onSelectProducts({
      ...selectedProductsRef.current,
      bundleSale: selectedBundleSalesRef.current,
    });
    Toast('Products confirmed successfully!');
  }, [validateFields, onSelectProducts]);

  // ============= EFFECTS =============

  // Mark component as mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pendingUpdatesRef.current) {
        clearTimeout(pendingUpdatesRef.current);
      }
    };
  }, []);

  // Check BGA health
  useEffect(() => {
    const checkBgaConnection = async () => {
      try {
        await checkBgaHealth();
        setBgaHealthStatus({healthy: true, checked: true});
      } catch (error) {
        console.error('BGA Backend not available:', error);
        setBgaHealthStatus({healthy: false, checked: true});
        Toast(
          'BGA Giveaway service is currently unavailable. Giveaway features may not work properly.',
        );
      }
    };

    checkBgaConnection();
  }, []);

  // Normalize products from show data
  useEffect(() => {
    if (show && Object.keys(show).length > 0) {
      const groupAuctions = (auctionProducts: any[]) => {
        if (!auctionProducts || auctionProducts.length === 0) return [];

        const auctionMap = new Map();

        auctionProducts.forEach(auction => {
          const productId = auction.productId?._id || auction.productId;
          const fullProduct =
            typeof auction.productId === 'object' ? auction.productId : auction;

          if (!auctionMap.has(productId)) {
            const imageUrl =
              fullProduct.imageUrl ||
              `${AWS_CDN_URL}${fullProduct.images?.[0]?.key}` ||
              'https://via.placeholder.com/50';

            auctionMap.set(productId, {
              productId: productId,
              title: fullProduct.title || auction.title || 'Untitled Product',
              imageUrl: imageUrl,
              quantity: fullProduct.quantity || 0,
              startingPrice: auction.startingPrice?.toString() || '',
              reservedPrice: auction.reservedPrice?.toString() || '',
              productOwnerSellerId: auction.productOwnerSellerId,
              auctionQuantity: '1',
              auctionObjectIds: [auction.auctionObjectId],
              auctionObjectId: auction.auctionObjectId,
            });
          } else {
            const existing = auctionMap.get(productId);
            existing.auctionQuantity = (
              parseInt(existing.auctionQuantity) + 1
            ).toString();
            existing.auctionObjectIds.push(auction.auctionObjectId);
          }
        });

        return Array.from(auctionMap.values());
      };

      const groupGiveaways = (giveawayProducts: any[]) => {
        if (!giveawayProducts || giveawayProducts.length === 0) return [];

        const giveawayMap = new Map();

        giveawayProducts.forEach(giveaway => {
          const productId = giveaway.productId?._id || giveaway.productId;
          const fullProduct =
            typeof giveaway.productId === 'object'
              ? giveaway.productId
              : giveaway;

          if (!giveawayMap.has(productId)) {
            const imageUrl =
              fullProduct.imageUrl ||
              `${AWS_CDN_URL}${fullProduct.images?.[0]?.key}` ||
              'https://via.placeholder.com/50';

            giveawayMap.set(productId, {
              productId: productId,
              title:
                fullProduct.title ||
                giveaway.productTitle ||
                'Untitled Product',
              imageUrl: imageUrl,
              quantity: fullProduct.quantity || 0,
              productOwnerSellerId: giveaway.productOwnerSellerId,
              requireAutoFollow: Boolean(giveaway.requireAutoFollow),
              giveawayTier: giveaway.giveawayTier || 'silver',
              isSponsored: giveaway.isSponsored || false,
              sponsoredBy: giveaway.sponsoredBy || null,
              sponsorType: giveaway.sponsorType || null,
              giveawayQuantity: '1',
              giveawayObjectIds: [giveaway.giveawayObjectId],
              giveawayObjectId: giveaway.giveawayObjectId,
            });
          } else {
            const existing = giveawayMap.get(productId);
            existing.giveawayQuantity = (
              parseInt(existing.giveawayQuantity) + 1
            ).toString();
            existing.giveawayObjectIds.push(giveaway.giveawayObjectId);
          }
        });

        return Array.from(giveawayMap.values());
      };

      const normalizeBuyNow = (buyNowProducts: any[]) => {
        if (!buyNowProducts || buyNowProducts.length === 0) return [];

        return buyNowProducts.map(product => {
          const fullProduct =
            typeof product.productId === 'object'
              ? product.productId
              : product;

          const imageUrl =
            fullProduct.imageUrl ||
            `${AWS_CDN_URL}${fullProduct.images?.[0]?.key}` ||
            'https://via.placeholder.com/50';

          return {
            productId: fullProduct._id || product.productId,
            title: fullProduct.title || 'Untitled Product',
            imageUrl: imageUrl,
            quantity: fullProduct.quantity || 0,
            productPrice: product.productPrice?.toString() || '',
            buyNowQuantity: product.buyNowQuantity?.toString() || '1',
          };
        });
      };

      const updated = {
        buyNow: normalizeBuyNow(show.buyNowProducts),
        auction: groupAuctions(show.auctionProducts),
        giveaway: groupGiveaways(show.giveawayProducts),
      };

      setSelectedProducts(updated);
    }
  }, [show]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update organized products when products change
  useEffect(() => {
    if (products.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        const organized = organizeProductsWithVariants(products);
        setOrganizedProducts(organized);
      });
    }
  }, [products, organizeProductsWithVariants]);

  // ============= MEMOIZED TAB CONTENT PROPS =============
  const buyNowProps = useMemo(
    () => ({
      fetchProducts,
      products: getDisplayProducts(getAvailableProducts('buyNow'), 'buyNow'),
      page,
      hasNextPage,
      setPage,
      setHasNextPage,
      isFetchingMore,
      setIsFetchingMore,
      selected: selectedProducts.buyNow,
      onSelect: (product: any) => handleProductSelect('buyNow', product),
      onRemove: (productId: string) => handleProductRemove('buyNow', productId),
      onChange: handlePriceChange,
      validationErrors,
      getValidationError,
      type: 'buyNow',
    }),
    [
      fetchProducts,
      getDisplayProducts,
      getAvailableProducts,
      page,
      hasNextPage,
      isFetchingMore,
      selectedProducts.buyNow,
      handleProductSelect,
      handleProductRemove,
      handlePriceChange,
      validationErrors,
      getValidationError,
    ],
  );

  const auctionProps = useMemo(
    () => ({
      products: getDisplayProducts(getAvailableProducts('auction'), 'auction'),
      selected: selectedProducts.auction,
      onSelect: (product: any) => handleProductSelect('auction', product),
      onRemove: (productId: string) =>
        handleProductRemove('auction', productId),
      onChange: handlePriceChange,
      validationErrors,
      getValidationError,
      fetchProducts,
      page,
      hasNextPage,
      setPage,
      setHasNextPage,
      isFetchingMore,
      setIsFetchingMore,
      expandedParents,
      onToggleExpand: toggleParentExpansion,
    }),
    [
      getDisplayProducts,
      getAvailableProducts,
      selectedProducts.auction,
      handleProductSelect,
      handleProductRemove,
      handlePriceChange,
      validationErrors,
      getValidationError,
      fetchProducts,
      page,
      hasNextPage,
      isFetchingMore,
      expandedParents,
      toggleParentExpansion,
    ],
  );

  const giveawayProps = useMemo(
    () => ({
      products: getDisplayProducts(
        getAvailableProducts('giveaway'),
        'giveaway',
      ),
      selected: selectedProducts.giveaway,
      onSelect: (product: any) => handleProductSelect('giveaway', product),
      onRemove: (productId: string) =>
        handleProductRemove('giveaway', productId),
      onChange: handleGiveawayChange,
      fetchProducts,
      page,
      hasNextPage,
      editMode,
      setPage,
      setHasNextPage,
      isFetchingMore,
      setIsFetchingMore,
      validationErrors,
      getValidationError,
      expandedParents,
      onToggleExpand: toggleParentExpansion,
    }),
    [
      getDisplayProducts,
      getAvailableProducts,
      selectedProducts.giveaway,
      handleProductSelect,
      handleProductRemove,
      handleGiveawayChange,
      fetchProducts,
      page,
      hasNextPage,
      editMode,
      isFetchingMore,
      validationErrors,
      getValidationError,
      expandedParents,
      toggleParentExpansion,
    ],
  );

  // ============= MEMOIZED TAB BUTTON RENDERER =============
  const TabButton = useCallback(
    ({tab}: {tab: string}) => {
      const {icon, label, activeColor, inactiveColor} = TAB_INFO[tab as keyof typeof TAB_INFO];
      const isActive = activeTab === tab;
      
      return (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabButton,
            {backgroundColor: isActive ? activeColor : inactiveColor},
          ]}
          onPress={() => setActiveTab(tab)}>
          <Icon name={icon} size={20} color={isActive ? '#000' : '#ccc'} />
          <Text style={[styles.tabText, {color: isActive ? '#000' : '#ccc'}]}>
            {label}
          </Text>
        </TouchableOpacity>
      );
    },
    [activeTab],
  );

  // ============= DISABLED TAB CONTENT =============
  const DisabledTabContent = useCallback(
    ({productType}: {productType: string}) => (
      <View style={styles.disabledProductTypeContainer}>
        <View style={styles.disabledProductTypeCard}>
          <Icon name="lock-outline" size={48} color="#FDD122" />
          <Text style={styles.disabledProductTypeTitle}>
            {productType} Products Not Enabled
          </Text>
          <Text style={styles.disabledProductTypeMessage}>
            This product type is currently not available for this live stream.
            Please enable it in the stream settings to add {productType}{' '}
            products.
          </Text>
        </View>
      </View>
    ),
    [],
  );

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primaryButtonColor} />
      </View>
    );
  }

  // ============= RENDER =============
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1}}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          {Object.keys(TAB_INFO).map(tab => (
            <TabButton key={tab} tab={tab} />
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.tabContent}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={true}>
          {/* Buy Now Tab */}
          {activeTab === 'buyNow' && !enabledProductTypes.buyNow && (
            <DisabledTabContent productType="Buy Now" />
          )}

          {activeTab === 'buyNow' && enabledProductTypes.buyNow && (
            <BuyNowTabContent {...buyNowProps} />
          )}

          {/* Auction Tab */}
          {activeTab === 'auction' && !enabledProductTypes.auction && (
            <DisabledTabContent productType="Auction" />
          )}

          {activeTab === 'auction' && enabledProductTypes.auction && (
            <AuctionTabContent {...auctionProps} />
          )}

          {/* Giveaway Tab */}
          {activeTab === 'giveaway' && !enabledProductTypes.giveaway && (
            <DisabledTabContent productType="Giveaway" />
          )}

          {activeTab === 'giveaway' && enabledProductTypes.giveaway && (
            <GiveawayTabContent {...giveawayProps} />
          )}
        </ScrollView>

        {/* Bundle Sales Section */}
        {activeTab === 'buyNow' && enabledProductTypes.buyNow && (
          <View style={styles.bundleSaleMainContainer}>
            <View style={styles.bundleSaleCard}>
              <View style={styles.bundleHeader}>
                <View style={styles.bundleHeaderLeft}>
                  <View style={styles.bundleIconContainer}>
                    <Icon
                      name="package-variant-closed"
                      size={28}
                      color="#FDD122"
                    />
                  </View>
                  <View style={styles.bundleHeaderText}>
                    <Text style={styles.bundleTitle}>Bundle Sales</Text>
                    <Text style={styles.bundleSubtitle}>
                      Enable to add bundle sales to this show
                    </Text>
                  </View>
                </View>
                <ToggleSwitch
                  isOn={bundleSaleEnabled}
                  onToggle={setBundleSaleEnabled}
                  onColor="#FDD122"
                  offColor="#555"
                  size="medium"
                />
              </View>

              {bundleSaleEnabled && (
                <View style={styles.bundleContent}>
                  <BundleSaleTabContent
                    selected={selectedBundleSales}
                    onSelect={handleBundleSelect}
                    onRemove={handleBundleRemove}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isConfirmed
                ? '#10B981'
                : totalSelectedProducts > 0
                ? '#FFD700'
                : '#555',
            },
          ]}
          onPress={handleSubmit}
          disabled={totalSelectedProducts === 0}
          activeOpacity={0.7}>
          <Text
            style={{fontWeight: 'bold', color: isConfirmed ? '#fff' : '#000'}}>
            {isConfirmed
              ? '✓ Confirmed'
              : `Confirm Selection (${totalSelectedProducts})`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default React.memo(ProductTab);
