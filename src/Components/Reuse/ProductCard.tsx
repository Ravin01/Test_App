import React from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/Ionicons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AWS_CDN_URL } from '../../../Config'

const CDN_BASE_URL = AWS_CDN_URL

const generateCDNUrl = (imagePath: string | undefined) => {
  if (!imagePath || imagePath.startsWith('http')) return imagePath
  const cleanCdnUrl = CDN_BASE_URL?.endsWith('/')
    ? CDN_BASE_URL.slice(0, -1)
    : CDN_BASE_URL
  const cleanImagePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return `${cleanCdnUrl}/${cleanImagePath}`
}

const { width } = Dimensions.get('window')
const cardWidth = (width - 48) / 2 // 2 columns with padding

interface ProductCardProps {
  product: any
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigation = useNavigation<any>()
  const imageUrl = product.images?.[0]?.key
  const cdnImageUrl = generateCDNUrl(imageUrl)
  const discountPercentage =
    product?.MRP && product.productPrice
      ? Math.round(((product.MRP - product.productPrice) / product.MRP) * 100)
      : 0

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ProductAnalyse', { productId: product._id })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              cdnImageUrl ||
              'https://via.placeholder.com/256x192?text=Product',
          }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {product.title}
          </Text>
          <View style={styles.categoryContainer}>
            <MaterialCommunityIcons name="package-variant" size={14} color="#FFB800" />
            <Text style={styles.category} numberOfLines={1}>
              {product.category || 'Uncategorized'}
            </Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{product.productPrice}</Text>
              {discountPercentage > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
                </View>
              )}
            </View>
            <Text style={styles.mrp}>MRP: ₹{product?.MRP}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ProductAnalyse', { productId: product._id })}
          >
            <MaterialCommunityIcons name="chart-bar" size={20} color="#1A1A1A" />
            <Text style={styles.buttonText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#262626',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.5)',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#1F2937',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 8,
  },
  titleSection: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
    flex: 1,
  },
  priceSection: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'column',
    gap: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  discountBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4ADE80',
  },
  mrp: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  buttonContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.5)',
  },
  button: {
    backgroundColor: '#FFB800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
})
