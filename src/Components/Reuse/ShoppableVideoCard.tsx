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

const getThumbnailUrl = (video: any) => {
  const thumbnailPath = video.thumbnailURL || video.thumbnailBlobName || video.images?.[0]?.key
  return generateCDNUrl(thumbnailPath)
}

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)
  const weeks = Math.round(days / 7)
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const { width } = Dimensions.get('window')
const cardWidth =  (width - 48) / 2        //(width - 48) / 3 // 3 columns with padding

interface ShoppableVideoCardProps {
  video: any
  index: number
}

export default function ShoppableVideoCard({ video, index }: ShoppableVideoCardProps) {
  const navigation = useNavigation<any>()
  const cdnThumbnailURL = getThumbnailUrl(video)
  const timeAgo = formatTimeAgo(video.createdAt)

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ShopableAnalyse', { videoId: video._id })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              cdnThumbnailURL ||
              'https://via.placeholder.com/180x320?text=Video',
          }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.gradient} />
        
        <View style={styles.playIconContainer}>
          <Icon name="play-circle" size={48} color="rgba(255, 255, 255, 0.8)" />
        </View>

        <View style={styles.contentOverlay}>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {video.title || 'Untitled Video'}
            </Text>
            {video.hashTags && video.hashTags.length > 0 && (
              <View style={styles.hashTagsContainer}>
                {video.hashTags.slice(0, 3).map((tag: string, i: number) => (
                  <View key={i} style={styles.hashTag}>
                    <Text style={styles.hashTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.footer}>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
              <View style={styles.categoryBadge}>
                <MaterialCommunityIcons name="tag" size={12} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.categoryText} numberOfLines={1}>
                  {video.category?.split(' & ')[0] || 'General'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={(e) => {
              e.stopPropagation()
              navigation.navigate('ShopableAnalyse', { videoId: video._id })
            }}
          >
            <MaterialCommunityIcons name="chart-bar" size={16} color="#1A1A1A" />
            <Text style={styles.analyticsButtonText}>View Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    aspectRatio: 9 / 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.5)',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    justifyContent: 'flex-end',
  },
  content: {
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  hashTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  hashTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hashTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeAgo: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    maxWidth: 50,
  },
  analyticsButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsButtonText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
  },
})
