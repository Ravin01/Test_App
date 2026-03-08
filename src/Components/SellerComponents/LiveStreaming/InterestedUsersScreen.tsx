import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {sellerInterestService} from '../../Shows/Services/productInterestService';
import {
  Heart,
  Users,
  Package,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import SellerHeader from '../SellerForm/Header';
import { formatFollowerCount } from '../../../Utils/dateUtils';

const {width, height} = Dimensions.get('window');

interface InterestedUser {
  userId: string;
  name: string;
  userName: string;
  emailId: string;
  profileURL: any;
  interestedAt: string;
}

interface Product {
  itemId: string;
  itemTitle: string;
  itemPrice: number;
  itemImage: any;
  itemType: string;
  interestCount: number;
  interestedUsers: InterestedUser[];
}

interface RouteParams {
  showId: string;
}

const InterestedUsersScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {showId} = route.params as RouteParams;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const usersPerPage = 10;

  const loadInterestedProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sellerInterestService.getInterestedProductsByShow(
        showId,
      );

      if (result.status) {
        setData(result.data);
      } else {
        setError('Failed to load interested users');
      }
    } catch (error: any) {
      console.error('Error loading interested users:', error);
      setError(
        error.response?.data?.message || 'Failed to load interested users',
      );
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    loadInterestedProducts();
  }, [loadInterestedProducts]);

  const getImageUrl = (imagePath: any) => {
    if (!imagePath) return null;

    if (typeof imagePath === 'string') {
      if (imagePath.startsWith('http')) return imagePath;
      return `${AWS_CDN_URL}${imagePath}`;
    }

    if (typeof imagePath === 'object' && imagePath.key) {
      return `${AWS_CDN_URL}${imagePath.key}`;
    }

    return null;
  };

  const getInitials = (name?: string, userName?: string) => {
    if (userName && userName.length >= 2) {
      return userName.substring(0, 2).toUpperCase();
    }
    if (name && name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setModalPage(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setModalPage(1);
  };

  const getPaginatedUsers = () => {
    if (!selectedProduct) return [];
    const startIndex = (modalPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return selectedProduct.interestedUsers.slice(startIndex, endIndex);
  };

  const totalPages = selectedProduct
    ? Math.ceil(selectedProduct.interestedUsers.length / usersPerPage)
    : 0;

  const renderProductItem = ({item}: {item: Product}) => {
    const userImageUrl = getImageUrl(item.itemImage);

    return (
      <Animatable.View animation="fadeInUp" duration={500} style={styles.card}>
        <View style={styles.cardImageContainer}>
          <Image
            source={{uri: userImageUrl || undefined}}
            style={styles.cardImage}
          />
          {item.itemType === 'bundle' && (
            <View style={styles.bundleBadge}>
              <Text style={styles.bundleBadgeText}>Bundle</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.itemTitle}
          </Text>

          <View style={styles.cardPriceContainer}>
            <Text style={styles.cardPrice}>₹{item.itemPrice}</Text>
          </View>

          <TouchableOpacity
            style={styles.interestedButton}
            onPress={() => openModal(item)}
            activeOpacity={0.7}>
            <LinearGradient
              colors={['#DC2626', '#EC4899']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.interestedButtonGradient}>
              <Heart size={18} color="#fff" fill="#fff" />
              <Text style={styles.interestedButtonText}>
                {formatFollowerCount(item.interestCount)} {item.interestCount === 1 ? 'User' : 'Users'}{' '}
                Interested
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };

  const renderUserItem = ({item, index}: {item: InterestedUser; index: number}) => {
    const userImageUrl = getImageUrl(item.profileURL);

    const handleUserClick = () => {
      closeModal();
      navigation.navigate('ViewSellerProdile' as never, {id: item.userName} as never);
    };

    return (
      <Animatable.View
        animation="fadeInLeft"
        delay={index * 50}
        duration={300}>
        <TouchableOpacity
          style={styles.userItem}
          onPress={handleUserClick}
          activeOpacity={0.7}>
          {userImageUrl ? (
            <Image source={{uri: userImageUrl}} style={styles.userAvatar} />
          ) : (
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.userAvatarFallback}>
              <Text style={styles.userAvatarText}>
                {getInitials(item.name, item.userName)}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userUsername}>@{item.userName}</Text>
            <Text style={styles.userEmail}>{item.emailId}</Text>
          </View>

          <View style={styles.userDateContainer}>
            <Text style={styles.userDateLabel}>Interested</Text>
            <Text style={styles.userDate}>
              {new Date(item.interestedAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}
            </Text>
            <Text style={styles.userTime}>
              {new Date(item.interestedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading interested users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <ArrowLeftCircle color="#fff" size={28} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Heart size={24} color="#FFD700" fill="#FFD700" />
            <Text style={styles.headerTitle}>Interested Users</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Show: {data?.showTitle || 'Live Stream'}
          </Text>
        </View>
      </View> */}
      <SellerHeader message={'Interested Users'} navigation={navigation}/>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <Animatable.View animation="fadeIn" delay={100} style={{flex: 1}}>
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Heart size={22} color="#fff" />
              </View>
              <Text style={styles.statCount}>
                {formatFollowerCount(data?.summary?.totalInterests) || 0}
              </Text>
              <Text style={styles.statLabel}> Interests</Text>
              <View style={styles.statGlow} />
            </LinearGradient>
          </Animatable.View>

          <Animatable.View animation="fadeIn" delay={200} style={{flex: 1}}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users size={22} color="#fff" />
              </View>
              <Text style={styles.statCount}>
                {formatFollowerCount(data?.summary?.uniqueUsers) || 0}
              </Text>
              <Text style={styles.statLabel}> Users</Text>
              <View style={styles.statGlow} />
            </LinearGradient>
          </Animatable.View>

          <Animatable.View animation="fadeIn" delay={300} style={{flex: 1}}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Package size={22} color="#fff" />
              </View>
              <Text style={styles.statCount}>
                {formatFollowerCount(data?.summary?.uniqueItems) || 0}
              </Text>
              <Text style={styles.statLabel}>Products</Text>
              <View style={styles.statGlow} />
            </LinearGradient>
          </Animatable.View>
        </View>

        {/* Products Grid */}
        {data?.products && data.products.length > 0 ? (
          <FlatList
            data={data.products}
            renderItem={renderProductItem}
            keyExtractor={item => item.itemId}
            numColumns={2}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Heart size={60} color="#555" />
            <Text style={styles.emptyText}>
              No users have shown interest yet
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal for Interested Users */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Image
                  source={{uri: getImageUrl(selectedProduct?.itemImage) || undefined}}
                  style={styles.modalProductImage}
                />
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductTitle} numberOfLines={2}>
                    {selectedProduct?.itemTitle}
                  </Text>
                  {selectedProduct?.itemType === 'bundle' && (
                    <View style={styles.modalBundleBadge}>
                      <Text style={styles.modalBundleBadgeText}>Bundle</Text>
                    </View>
                  )}
                  <Text style={styles.modalProductPrice}>
                    ₹{selectedProduct?.itemPrice}
                  </Text>
                  <Text style={styles.modalProductInterests}>
                    {selectedProduct?.interestCount}{' '}
                    {selectedProduct?.interestCount === 1 ? 'user' : 'users'}{' '}
                    interested
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeModal}
                activeOpacity={0.7}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <FlatList
              data={getPaginatedUsers()}
              renderItem={renderUserItem}
              keyExtractor={(item, index) => `${item.userId}-${index}`}
              contentContainerStyle={styles.modalUsersList}
              showsVerticalScrollIndicator={false}
            />

            {/* Modal Footer with Pagination */}
            {totalPages > 1 && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    modalPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => setModalPage(prev => Math.max(1, prev - 1))}
                  disabled={modalPage === 1}
                  activeOpacity={0.7}>
                  <ChevronLeft
                    size={18}
                    color={modalPage === 1 ? '#555' : '#fff'}
                  />
                  <Text
                    style={[
                      styles.paginationButtonText,
                      modalPage === 1 && styles.paginationButtonTextDisabled,
                    ]}>
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={styles.paginationText}>
                  Page {modalPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    modalPage === totalPages && styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    setModalPage(prev => Math.min(totalPages, prev + 1))
                  }
                  disabled={modalPage === totalPages}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.paginationButtonText,
                      modalPage === totalPages &&
                        styles.paginationButtonTextDisabled,
                    ]}>
                    Next
                  </Text>
                  <ChevronRight
                    size={18}
                    color={modalPage === totalPages ? '#555' : '#fff'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.SecondaryColor,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    color: '#fff',
    fontSize: 13,
  textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9,
  },
  statGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },
  productsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: (width - 48) / 2,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: '#333',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  bundleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#A855F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bundleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    minHeight: 40,
  },
  cardPriceContainer: {
    marginBottom: 12,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  interestedButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  interestedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  interestedButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
    maxHeight: height * 0.85,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  modalProductImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalBundleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginVertical: 4,
  },
  modalBundleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C084FC',
  },
  modalProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 4,
  },
  modalProductInterests: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalUsersList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#333',
  },
  userAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  userUsername: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  userDateContainer: {
    alignItems: 'flex-end',
  },
  userDateLabel: {
    fontSize: 10,
    color: '#aaa',
  },
  userDate: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  userTime: {
    fontSize: 10,
    color: '#777',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: 'rgba(51, 51, 51, 0.5)',
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  paginationButtonTextDisabled: {
    color: '#555',
  },
  paginationText: {
    fontSize: 13,
    color: '#ccc',
  },
});

export default InterestedUsersScreen;
