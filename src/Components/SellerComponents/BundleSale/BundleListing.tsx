import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  ToastAndroid,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from 'react-native-linear-gradient';
import axiosInstance from "../../../Utils/Api";
import { SafeAreaView } from "react-native-safe-area-context";
import { AWS_CDN_URL } from "../../../../Config";
import SellerHeader from "../SellerForm/Header";
import { Plus } from "lucide-react-native";
import { colors } from "../../../Utils/Colors";

const { width } = Dimensions.get("window");

// Toast helper for cross-platform
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Success', message);
  }
};

// Stats configuration with gradients
const statsConfig = [
  {
    label: 'Total Bundles',
    key: 'total',
    icon: 'package-variant',
    gradient: ['#3B82F6', '#2563EB'],
  },
  {
    label: 'Active Bundles',
    key: 'active',
    icon: 'eye',
    gradient: ['#10B981', '#059669'],
  },
  {
    label: 'Inactive Bundles',
    key: 'inactive',
    icon: 'eye-off',
    gradient: ['#6B7280', '#4B5563'],
  },
];

// Modern Stats Cards with Gradient
const StatsCards = ({ stats }: { stats: { total: number; active: number; inactive: number } }) => {
  return (
    <View style={styles.statsContainer}>
      {statsConfig.map((config, index) => {
        const count = stats[config.key as keyof typeof stats] || 0;

        return (
          <LinearGradient
            key={index}
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialIcon name={config.icon} size={22} color="#fff" />
            </View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{config.label}</Text>
            <View style={styles.statGlow} />
          </LinearGradient>
        );
      })}
    </View>
  );
};

const BundleListing: React.FC = () => {
  const navigation = useNavigation();
  const cdnURL = AWS_CDN_URL;

  // Bundle Sales State
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState(new Set<string>());
  const limit = 15;

  const toggleBundleExpansion = (bundleId: string) => {
    setExpandedBundles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bundleId)) {
        newSet.delete(bundleId);
      } else {
        newSet.add(bundleId);
      }
      return newSet;
    });
  };

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await axiosInstance.get("seller/bundle-sale/list", {
        params,
      });

      if (response.data?.status) {
        setBundles(response.data.data.bundleSales || []);
        setTotal(response.data.data.total || 0);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error: any) {
      console.log("Error fetching bundles:", error);
      showToast(error.response?.data?.message || "Failed to load bundle sales", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  // Auto-refresh when screen comes into focus (after creating/editing)
  useFocusEffect(
    useCallback(() => {
      fetchBundles();
    }, [fetchBundles])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchBundles();
  };

  const handleToggleStatus = async (bundleId: string) => {
    try {
      const response = await axiosInstance.patch(
        `seller/bundle-sale/${bundleId}/toggle-status`
      );

      if (response.data?.status) {
        showToast(response.data.message || "Bundle status updated");
        fetchBundles();
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      showToast(error.response?.data?.message || "Failed to update status", 'error');
    }
  };

  const handleDeleteClick = (bundle: any) => {
    setBundleToDelete(bundle);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bundleToDelete) return;

    setDeleting(true);
    try {
      const response = await axiosInstance.delete(
        `seller/bundle-sale/${bundleToDelete._id}`
      );

      if (response.data?.status) {
        showToast("Bundle deleted successfully");
        setShowDeleteModal(false);
        setBundleToDelete(null);
        fetchBundles();
      }
    } catch (error: any) {
      console.error("Error deleting bundle:", error);
      showToast(error.response?.data?.message || "Failed to delete bundle", 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    setPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    setShowFilterModal(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Calculate stats
  const stats = {
    total: total,
    active: bundles.filter((b) => b.isActive).length,
    inactive: bundles.filter((b) => !b.isActive).length,
  };

  const renderBundleCard = (bundle: any) =>{
    const isExpanded = expandedBundles.has(bundle._id);

    return (
      <View key={bundle._id} style={styles.bundleCard}>
        <TouchableOpacity onPress={() => toggleBundleExpansion(bundle._id)} activeOpacity={0.7}>
          {/* Top Section: Image and Title */}
          <View style={styles.bundleHeader}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: bundle.bundleImage?.key ? `${cdnURL}${bundle.bundleImage.key}` : "https://via.placeholder.com/200" }}
                style={styles.bundleImage}
                resizeMode="cover"
              />
              <View style={[styles.badge, styles.statusBadge, bundle.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={styles.badgeText}>{bundle.isActive ? "Active" : "Inactive"}</Text>
              </View>
              <View style={[styles.badge, styles.productsBadge]}>
                <Text style={styles.badgeText}>{bundle.products?.length || 0} Products</Text>
              </View>
            </View>
            <View style={styles.bundleInfo}>
              <Text style={styles.bundleTitle} numberOfLines={2}>{bundle.title}</Text>
              {bundle.description && <Text style={styles.bundleDescription} numberOfLines={2}>{bundle.description}</Text>}
            </View>
            <View style={styles.chevronContainer}>
              <MaterialIcon name="chevron-down" size={20} color="#F7CE45" />
            </View>
          </View>

          {/* Bottom Section: Pricing Details */}
          <View style={styles.detailsSection}>
            <View style={styles.priceDetailsRow}>
              <View style={styles.priceDetailCard}>
                <Text style={styles.priceDetailLabel}>MRP</Text>
                <Text style={styles.mrpValue}>₹{bundle.bundleMRP?.toFixed(0) || 0}</Text>
              </View>
              
              <View style={styles.priceDetailCard}>
                <Text style={styles.priceDetailLabel}>SELLING PRICE</Text>
                <Text style={styles.sellingPriceValue}>₹{bundle.sellingPrice?.toFixed(0)}</Text>
              </View>
              
              <View style={styles.priceDetailCard}>
                <Text style={styles.priceDetailLabel}>DISCOUNT</Text>
                <Text style={styles.discountValue}>{bundle.discount?.percentage?.toFixed(1)}%</Text>
              </View>
            </View>

            <View style={styles.metaDetailsRow}>
              <View style={styles.metaDetailItem}>
                <MaterialIcon name="truck-outline" size={18} color="#999" />
                <Text style={styles.metaDetailText}>Delivery: ₹{bundle.deliveryCharge}</Text>
              </View>
              <View style={styles.metaDetailItem}>
                <MaterialIcon name="clock-outline" size={18} color="#999" />
                <Text style={styles.metaDetailText}>{bundle.estimatedDeliveryDate} days</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.productsSection}>
            <View style={{padding: 12, borderTopWidth: 1, borderTopColor: '#2A2A2A'}}>
              <Text style={{color: '#F5F5F5', fontSize: 14, fontWeight: '600', marginBottom: 8}}>
                Products ({bundle.products?.length || 0})
              </Text>
              {bundle.products && bundle.products.length > 0 ? (
                <FlatList
                  horizontal
                  data={bundle.products}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  contentContainerStyle={{paddingRight: 12}}
                  renderItem={({item: product}) => (
                    <View style={styles.productCard}>
                      <Image
                        source={{ uri: product.images?.[0]?.key ? `${cdnURL}${product.images[0].key}` : "https://via.placeholder.com/150" }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                      <View style={{padding: 8}}>
                        <Text style={{color: '#F5F5F5', fontSize: 12, fontWeight: '500'}} numberOfLines={2}>{product.title}</Text>
                        <Text style={{color: '#4ADE80', fontSize: 14, fontWeight: 'bold', marginTop: 4}}>
                          ₹{product.flashSale?.isActive && product.flashSale?.flashPrice > 0 ? product.flashSale.flashPrice : product.productPrice}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              ) : (
                <Text style={{color: '#999', textAlign: 'center', padding: 20}}>No products</Text>
              )}
            </View>
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={() => (navigation as any).navigate("BundleEdit", { bundleId: bundle._id })}
            activeOpacity={0.7}
            style={styles.actionButtonWrapper}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}>
              <MaterialIcon name="pencil" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleToggleStatus(bundle._id)}
            activeOpacity={0.7}
            style={styles.actionButtonWrapper}>
            <LinearGradient
              colors={bundle.isActive ? ['#6B7280', '#4B5563'] : ['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}>
              <MaterialIcon name={bundle.isActive ? "eye-off" : "eye"} size={18} color="#fff" />
              <Text style={styles.actionButtonText}>{bundle.isActive ? 'Deactivate' : 'Activate'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* <TouchableOpacity 
            onPress={() => handleDeleteClick(bundle)}
            activeOpacity={0.7}
            style={styles.actionButtonWrapper}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}>
              <MaterialIcon name="delete-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </LinearGradient>
          </TouchableOpacity> */}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader navigation={navigation} message={"Bundle Sale"}/>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4}}>
            <MaterialIcon name="shopping" size={32} color="#F7CE45" />
            <Text style={styles.headerTitle}>BUNDLE SALES</Text>
          </View>
          <Text style={styles.headerSubtitle}>Manage your bundle sale offerings</Text>
        </View>
        <StatsCards stats={stats} />
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={16} color="#999" style={{marginRight: 8}} />
            <TextInput style={styles.searchInput} placeholder="Search bundles..." placeholderTextColor="#999" value={searchTerm} onChangeText={handleSearchChange} />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Text style={styles.filterButtonText}>{statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Inactive"}</Text>
            <MaterialIcon name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.bundlesContainer}>
          {loading && page === 1 ? (
            <View style={{paddingVertical: 80, alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#F7CE45" />
            </View>
          ) : bundles.length > 0 ? (
            bundles.map((bundle) => renderBundleCard(bundle))
          ) : (
            <View style={{alignItems: 'center', paddingVertical: 40}}>
              <MaterialIcon name="shopping" size={64} color="#666" />
              <Text style={{color: '#F5F5F5', fontSize: 18, fontWeight: '600', marginTop: 16}}>No bundle sales found</Text>
              <Text style={{color: '#999', marginTop: 8, marginBottom: 16}}>{searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first bundle sale"}</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => (navigation as any).navigate("BundleCreate")}>
                <Icon name="plus" size={16} color="#000" />
                <Text style={styles.createButtonText}>Create Bundle Sale</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {totalPages > 1 && (
          <View style={{padding: 16, borderTopWidth: 1, borderTopColor: '#2A2A2A'}}>
            <Text style={{color: '#999', fontSize: 12, marginBottom: 12, textAlign: 'center'}}>
              Showing {bundles.length} of {total} bundles (Page {page} of {totalPages})
            </Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', gap: 8}}>
              <TouchableOpacity style={[styles.pageButton, page === 1 && {opacity: 0.5}]} onPress={() => handlePageChange(page - 1)} disabled={page === 1}>
                <Text style={{color: '#F5F5F5', fontSize: 12}}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pageButton, page === totalPages && {opacity: 0.5}]} onPress={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                <Text style={{color: '#F5F5F5', fontSize: 12}}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => (navigation as any).navigate("BundleCreate")}
        activeOpacity={0.8}>
        <LinearGradient
          colors={['#F7CE45', '#F0B429']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}>
            <Plus size={24} color="#000" />
          {/* <Icon name="plus" size={24} color="#000" /> */}
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Bundle Sale</Text>
            <Text style={{color: '#999', marginBottom: 16}}>Are you sure you want to delete "<Text style={{color: '#F5F5F5', fontWeight: 'bold'}}>{bundleToDelete?.title}</Text>"? This action cannot be undone.</Text>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#6B7280'}]} onPress={() => { setShowDeleteModal(false); setBundleToDelete(null); }} disabled={deleting}>
                <Text style={{color: '#fff', fontWeight: '600'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#EF4444'}]} onPress={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <ActivityIndicator size="small" color="#fff" /> : <><Icon name="trash" size={14} color="#fff" /><Text style={{color: '#fff', fontWeight: '600', marginLeft: 8}}>Delete</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}>
                <MaterialIcon name="close" size={24} color="#F5F5F5" />
              </TouchableOpacity>
            </View>
            {['all', 'active', 'inactive'].map((status) => (
              <TouchableOpacity key={status} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: statusFilter === status ? 'rgba(255, 193, 7, 0.1)' : 'transparent', borderRadius: 8, marginBottom: 8}} onPress={() => handleStatusFilterChange(status)}>
                <Text style={{color: statusFilter === status ? '#F7CE45' : '#F5F5F5', fontSize: 16, textTransform: 'capitalize'}}>{status === 'all' ? 'All Status' : status}</Text>
                {statusFilter === status && <Icon name="check" size={20} color="#F7CE45" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryColor || "#121212" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#F5F5F5" },
  headerSubtitle: { fontSize: 14, color: "#999" },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F7CE45", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginTop: 12, gap: 8 },
  createButtonText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  statsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 8, 
    padding: 16,
    paddingHorizontal: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 48) / 3.5,
    maxWidth: (width - 48) / 3,
    borderRadius: 12,
    padding: 12,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statCount: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
  },
  statGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -20,
    right: -20,
  },
  filtersContainer: { padding: 16, gap: 12 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 8, borderWidth: 1, borderColor: "#2A2A2A", paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, color: "#F5F5F5", fontSize: 14 },
  filterButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1A1A1A", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#2A2A2A" },
  filterButtonText: { color: "#F5F5F5", fontSize: 14 },
  bundlesContainer: { padding: 16 },
  bundleCard: { backgroundColor: "#1A1A1A", borderRadius: 8, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 16, overflow: "hidden" },
  bundleHeader: { 
    flexDirection: "row", 
    gap: 12, 
    padding: 16,
    alignItems: 'flex-start',
  },
  imageContainer: { 
    width: 100, 
    height: 100, 
    backgroundColor: "#2A2A2A", 
    borderRadius: 8, 
    position: "relative",
    flexShrink: 0,
  },
  bundleImage: { width: "100%", height: "100%", borderRadius: 8 },
  badge: { position: "absolute", paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4 },
  statusBadge: { top: 6, right: 6 },
  activeBadge: { backgroundColor: "#4ADE80" },
  inactiveBadge: { backgroundColor: "#9CA3AF" },
  productsBadge: { bottom: 6, left: 6, backgroundColor: "#F7CE45" },
  badgeText: { fontSize: 9, fontWeight: "600", color: "#000" },
  bundleInfo: { 
    flex: 1, 
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  chevronContainer: {
    paddingTop: 4,
    paddingLeft: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  bundleTitle: { fontSize: 16, fontWeight: "bold", color: "#F5F5F5", lineHeight: 22 },
  bundleDescription: { fontSize: 12, color: "#999", marginTop: 4, lineHeight: 16 },
  detailsSection: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  priceDetailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priceDetailCard: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  priceDetailLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  mrpValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#999',
    textDecorationLine: 'line-through',
  },
  sellingPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F7CE45',
  },
  metaDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  metaDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDetailText: {
    fontSize: 12,
    color: '#F5F5F5',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  priceContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.2)',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F7CE45',
    letterSpacing: -0.5,
  },
  discountContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  discountLabel: {
    fontSize: 9,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  discountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  statsGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  bundleStatCard: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 10, 
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    position: 'relative',
    shadowColor: "#F7CE45",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 206, 69, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.3)',
  },
  discountCard: {
    backgroundColor: '#2A2A2A',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  discountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bundleStatLabel: { 
    fontSize: 10, 
    color: "#999", 
    marginBottom: 4,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceText: { 
    fontSize: 18, 
    fontWeight: "900", 
    color: "#F7CE45",
  },
  discountText: {
    color: "#10B981",
  },
  productsSection: { borderTopWidth: 1, borderTopColor: "#2A2A2A", backgroundColor: "rgba(0, 0, 0, 0.3)" },
  productCard: { 
    width: 150, 
    backgroundColor: "#2A2A2A", 
    borderRadius: 8, 
    overflow: "hidden",
    marginRight: 12,
  },
  productImage: { width: 150, height: 150 },
  actionButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12, 
    gap: 8,
    borderTopWidth: 1, 
    borderTopColor: "#2A2A2A", 
    backgroundColor: "rgba(0, 0, 0, 0.3)" 
  },
  actionButtonWrapper: {
    flex: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "#1A1A1A", borderRadius: 12, padding: 20, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: "#2A2A2A" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#F5F5F5", flex: 1 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  modalButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 8, gap: 8 },
  pageButton: { backgroundColor: "#1A1A1A", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A" },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    margin:4,
    justifyContent: 'space-between',
  },
  fab: {
    position: 'absolute',
    bottom: 50,
    right: 30,
    zIndex: 1000,
  },
  fabGradient: {
    width: 54,
    height: 54,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F7CE45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
});

export default BundleListing;
