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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AWS_CDN_URL } from '../../../Config'

const CDN_BASE_URL = AWS_CDN_URL

const getFullImageUrl = (imagePath: string | undefined) => {
  if (!imagePath) return 'https://via.placeholder.com/200x300.png?text=No+Preview'
  if (imagePath.startsWith('http')) return imagePath
  const cdnUrl = CDN_BASE_URL?.endsWith('/') ? CDN_BASE_URL.slice(0, -1) : CDN_BASE_URL
  const cleanImagePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  return `${cdnUrl}/${cleanImagePath}`
}

const getInitials = (username: string | undefined) => {
  if (!username) return 'U'
  return username.substring(0, 2).toUpperCase()
}

const formatViewersCount = (count: number | undefined) => {
  if (!count) return 0
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

const { width } = Dimensions.get('window')
const cardWidth =  (width - 48) / 2           //(width - 48) / 3 // 3 columns with padding

interface LiveStreamCardProps {
  show: any
  index: number
}

export default function LiveStreamCard({ show, index }: LiveStreamCardProps) {
  const navigation = useNavigation<any>()

  if (!show?._id) {
    return null
  }

  const isLive = show?.showStatus === 'live' || show?.isLive
  const isEnded = show?.showStatus === 'ended'
  const fullThumbnailUrl = getFullImageUrl(show?.thumbnailImage)
  const hostProfileUrl = show?.host?.userInfo?.profileURL?.key
    ? getFullImageUrl(show.host.userInfo.profileURL.key)
    : null
  const hostName = show?.host?.userInfo?.name || show?.host?.companyName || 'Unknown'

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        if (isLive || isEnded) {
          navigation.navigate('LiveStreamAnalyticsPage', { showId: show._id })
        }
      }}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: fullThumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.gradient} />

        {/* Top bar (Live/Upcoming/Viewers) */}
        <View style={styles.topBar}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>Live</Text>
            </View>
          ) : (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingText}>Upcoming</Text>
            </View>
          )}
          {isLive && show.viewerCount > 0 && (
            <View style={styles.viewersContainer}>
              <MaterialCommunityIcons name="account-group" size={12} color="#F9FAFB" />
              <Text style={styles.viewersText}>{formatViewersCount(show.viewerCount)}</Text>
            </View>
          )}
        </View>

        {/* Bottom Content Overlay */}
        <View style={styles.bottomContent}>
          <Text style={styles.title} numberOfLines={2}>
            {show?.title}
          </Text>

          {/* Conditional Analytics Button */}
          {isLive || isEnded ? (
            <TouchableOpacity
              style={styles.analyticsButton}
              onPress={() =>
                navigation.navigate('LiveStreamAnalyticsPage', { showId: show._id })
              }
            >
              <MaterialCommunityIcons name="chart-bar" size={16} color="#1A1A1A" />
              <Text style={styles.analyticsButtonText}>View Analytics</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.hostContainer}>
              <View style={styles.hostAvatar}>
                {hostProfileUrl ? (
                  <Image
                    source={{ uri: hostProfileUrl }}
                    style={styles.hostAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.hostAvatarPlaceholder}>
                    <Text style={styles.hostInitials}>{getInitials(hostName)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hostName} numberOfLines={1}>
                {hostName}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    aspectRatio: 4 / 5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
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
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
  },
  topBar: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  liveBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: 'bold',
  },
  upcomingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  viewersText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  analyticsButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsButtonText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  hostAvatarImage: {
    width: '100%',
    height: '100%',
  },
  hostAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hostName: {
    color: '#F9FAFB',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
})
