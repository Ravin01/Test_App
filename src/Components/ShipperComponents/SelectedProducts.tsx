import React from 'react';
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { AWS_CDN_URL } from '../../Utils/aws';

const SelectedProductList = ({
  selected = [],
  onRemove,
  onChange,
  type,
  getValidationError
}) => {
  const getTitle = () => {
    switch (type) {
      case 'buyNow': return 'Buy Now';
      case 'auction': return 'Auction';
      case 'giveaway': return 'Giveaway';
      default: return '';
    }
  };

  if (!selected || selected.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products selected for {getTitle()} yet.</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <View style={styles.itemContainer}>
      <Image
         source={{uri: `${AWS_CDN_URL}${item?.images[0]?.key}` }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>

        {type === 'buyNow' && (
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, getValidationError('buyNow', index, 'price') && styles.inputError]}
              keyboardType="decimal-pad"
              value={item.productPrice}
              onChangeText={(val) => onChange(item.productId, 'productPrice', val, 'buyNow')}
              placeholder="Enter Price"
            />
            {getValidationError('buyNow', index, 'price') && (
              <Text style={styles.errorText}>{getValidationError('buyNow', index, 'price')}</Text>
            )}
          </View>
        )}

        {type === 'auction' && (
          <>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, getValidationError('auction', index, 'starting') && styles.inputError]}
                keyboardType="decimal-pad"
                value={item.startingPrice}
                onChangeText={(val) => onChange(item.productId, 'startingPrice', val, 'auction')}
                placeholder="Start Price"
              />
              {getValidationError('auction', index, 'starting') && (
                <Text style={styles.errorText}>{getValidationError('auction', index, 'starting')}</Text>
              )}
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, getValidationError('auction', index, 'reserved') && styles.inputError]}
                keyboardType="decimal-pad"
                value={item.reservedPrice}
                onChangeText={(val) => onChange(item.productId, 'reservedPrice', val, 'auction')}
                placeholder="Reserve Price"
              />
              {getValidationError('auction', index, 'reserved') && (
                <Text style={styles.errorText}>{getValidationError('auction', index, 'reserved')}</Text>
              )}
            </View>
          </>
        )}

        {type === 'giveaway' && (
          <View style={styles.switchContainer}>
            <Text>Followers Only?</Text>
            <Switch
              value={!!item.followersOnly}
              onValueChange={(val) => onChange(item.productId, val)}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={(e) => onRemove(type, item.productId, e)}
          style={styles.removeBtn}
        >
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Selected {getTitle()} Items</Text>
      <View style={styles.listContainer}>
        <FlatList
          data={selected}
          renderItem={renderItem}
          keyExtractor={(item) => item.productId.toString()}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          contentContainerStyle={{ paddingBottom: 10 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    margin: 16,
    flex: 1,
  },
  listContainer: {
    height: 300,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginBottom:10,
  },
  emptyText: {
    color: '#777',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  inputGroup: {
    marginBottom: 8,
  },
  input: {
    height: 38,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  removeBtn: {
    backgroundColor: '#fee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  removeText: {
    color: '#d00',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SelectedProductList;
