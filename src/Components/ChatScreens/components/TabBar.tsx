import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet
} from 'react-native';
import { Star , VolumeOff} from 'lucide-react-native'; // or your icon library

const TabBar = ({
  activeTab,
  onTabChange,
  totalUnreadCount = 0
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.scrollView}
    >
      <View style={styles.tabContainer}>
        {/* All Tab */}
        <TouchableOpacity
          onPress={() => onTabChange?.('all')}
          style={[
            styles.tabButton,
            activeTab === 'all' ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'all' && styles.activeTabText
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {/* Unread Tab */}
        <TouchableOpacity
          onPress={() => onTabChange?.('unread')}
          style={[
            styles.tabButton,
            activeTab === 'unread' ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <View style={styles.tabContent}>
            <Text style={[
              styles.tabText,
              activeTab === 'unread' && styles.activeTabText
            ]}>
              Unread
            </Text>
            {totalUnreadCount > 0 && (
              <View style={[
                styles.badge,
                activeTab === 'unread' ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={[
                  styles.badgeText,
                  activeTab === 'unread' && styles.activeBadgeText
                ]}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Online Tab */}
        <TouchableOpacity
          onPress={() => onTabChange?.('online')}
          style={[
            styles.tabButton,
            activeTab === 'online' ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'online' && styles.activeTabText
          ]}>
            Online
          </Text>
        </TouchableOpacity>

        {/* Favorites Tab */}
        <TouchableOpacity
          onPress={() => onTabChange?.('favorites')}
          style={[
            styles.tabButton,
            activeTab === 'favorites' ? styles.activeTab : styles.inactiveTab
          ]}
        >
          <View style={styles.tabContent}>
            <Star size={12} color={activeTab === 'favorites' ? '#000' : '#9CA3AF'} />
            <Text style={[
              styles.tabText,
              activeTab === 'favorites' && styles.activeTabText,
              styles.favoritesText
            ]}>
              Favorites
            </Text>
          </View>
        </TouchableOpacity>

        {/* Muted Tab */}
        <TouchableOpacity
          onPress={() => onTabChange?.('muted')}
          style={[
            styles.tabButton,
            activeTab === 'muted' ? styles.mutedActiveTab : styles.inactiveTab
          ]}
        >
          <View style={styles.tabContent}>
            <VolumeOff color={activeTab === 'muted' ? '#000' : '#9CA3AF'} size={12} />
            <Text style={[
              styles.tabText,
              activeTab === 'muted' && styles.mutedActiveText,
              styles.mutedText
            ]}>
              Muted
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    width: '100%',
  },
  scrollContainer: {
    paddingHorizontal: 8,
    marginTop: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    minWidth: '100%',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#FBBF24', // yellow-400
  },
  mutedActiveTab: {
    backgroundColor: '#FBBF24'      //'#4B5563', // gray-600
  },
  inactiveTab: {
    backgroundColor:'#1F2937', // gray-800   
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF', // gray-400
  },
  activeTabText: {
    color: '#000000', // black
  },
  mutedActiveText: {
    color: '#000000'    //'#FFFFFF', // white
  },
  favoritesText: {
    // For responsive text, you might need to handle this differently in RN
    // or use Platform.OS or dimensions to conditionally render
  },
  mutedText: {
    // Same as above for responsive text
  },
  badge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadge: {
    backgroundColor: '#000000', // black
  },
  inactiveBadge: {
    backgroundColor: '#EF4444', // red-500
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF', // white
  },
  activeBadgeText: {
    color: '#FBBF24', // yellow-400
  },
});

export default TabBar;