import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../Config';
import { storeIcon } from '../../assets/assets';

const { width } = Dimensions.get('window');

interface Store {
  _id: string;
  companyName: string;
  productCategories?: string[];
  userInfo: {
    userName: string;
    profileURL?: {
      key: string;
    };
  };
  sellerType?: string;
}

interface TopStoresProps {
  stores: Store[];
  loadingStores: boolean;
  hasMoreStores: boolean;
  activeStore: string | null;
  page: number;
  onStorePress: (userName: string) => void;
  onLoadMore: (nextPage: number) => void;
}

const TopStores: React.FC<TopStoresProps> = ({
  stores,
  loadingStores,
  hasMoreStores,
  activeStore,
  page,
  onStorePress,
  onLoadMore,
}) => {
  const StoreCard = ({ userInfo, icon, name, cat, rating, online }: any) => (
    <TouchableOpacity
      onPress={() => {
        setTimeout(() => {
          onStorePress(userInfo?.userName);
        }, 100);
      }}
      style={[
        styles.storeCard,
        activeStore === name && styles.activeStoreCard,
      ]}>
      <View style={styles.storeAvatar}>
        {icon ? (
          <Image
            source={{ uri: `${AWS_CDN_URL}${icon}` }}
            style={styles.storeAvatarImage}
          />
        ) : (
          <View
            style={[
              styles.storeAvatar,
              {
                width: 38,
                height: 38,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 0,
                position: 'relative',
              },
            ]}>
         
              <Image
                source={{uri:storeIcon}}
                style={styles.storeAvatarImage}
              />
           
          </View>
        )}
        {false && <View style={styles.storeStatus} />}
      </View>
      <Text style={styles.storeName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.storeCategory} numberOfLines={1} ellipsizeMode="tail">
        {cat}
      </Text>
      <Text style={styles.storeRating}>⭐
        {/* {rating} */}
        </Text>
    </TouchableOpacity>
  );

  if (!stores || stores.length === 0) {
    return null;
  }

  return (
    <View style={[styles.section, { paddingTop: 4 }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitleText}>🏪 Top Stores</Text>
        </View>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.seeMore}></Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={stores}
        keyExtractor={(item, index) => item?._id?.toString() ?? index.toString()}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'flex-start', gap: 8 }}
        renderItem={({ item }) => {
          if (!item) return null;
          return (
            <StoreCard
              icon={item?.userInfo?.profileURL?.key || undefined}
              name={item.companyName || 'Unnamed'}
              cat={
                Array.isArray(item?.productCategories) && item.productCategories.length > 0
                  ? item.productCategories[0]
                  : 'Rating'
              }
              rating={'0.0'}
              userInfo={item?.userInfo}
              online={item?.sellerType === 'social' || false}
            />
          );
        }}
        contentContainerStyle={styles.storesGrid}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: 6, alignItems: 'center' }}>
            {loadingStores ? (
              <ActivityIndicator size="small" color="#F7CE45" />
            ) : hasMoreStores ? (
              <TouchableOpacity
                onPress={() => {
                  const nextPage = page + 1;
                  onLoadMore(nextPage);
                }}
                disabled={loadingStores}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(247, 206, 69, 0.2)', 'rgba(247, 206, 69, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.loadMoreGradientButton,
                    loadingStores && styles.loadMoreGradientButtonDisabled
                  ]}
                >
                  <View style={styles.loadMoreContent}>
                    <Text style={styles.loadMoreButtonText}>Load More</Text>
                    <Text style={styles.loadMoreArrow}>↓</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#888' }}>No more Stores</Text>
            )}
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: { paddingTop: 12, flexDirection: 'column' },
  sectionHeader: {
    marginTop: 20,
    marginHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitleText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  seeMore: { fontSize: 11, color: '#FFD700', fontWeight: '600' },
  storesGrid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
  },
  storeCard: {
    flexShrink: 1,
    flexBasis: (width - 24 - 10) / 3,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  activeStoreCard: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    borderWidth: 0.2,
  },
  storeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  storeAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    resizeMode: 'cover',
  },
  storeStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#141414',
  },
  storeName: { fontSize: 10, fontWeight: '700', color: '#fff', marginBottom: 2 },
  storeCategory: { fontSize: 9, color: '#888', marginBottom: 4 },
  storeRating: { fontSize: 9, color: '#FFD700' },
  loadMoreGradientButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(247, 206, 69, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreGradientButtonDisabled: {
    opacity: 0.5,
  },
  loadMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadMoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7CE45',
  },
  loadMoreArrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7CE45',
  },
});

export default TopStores;
