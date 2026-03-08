
import React, {useEffect, useMemo, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  SectionList,
  Modal,
  ToastAndroid,
  Dimensions,
  Linking,
} from 'react-native';
import Header from '../../Reuse/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Animatable from 'react-native-animatable';
import {useFocusEffect} from '@react-navigation/native';
import api from '../../../Utils/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator} from 'react-native-paper';
import {FAB} from 'react-native-paper';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {colors} from '../../../Utils/Colors';
import {ArrowLeftCircle, EarthIcon, Eye, Plus, Lock, UserCheck, CheckCircle, Clock as ClockIcon} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
const {width, height} = Dimensions.get('window');
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import MaterialDesignIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { bgaSocketUrl, shareUrl } from '../../../../Config';
import {
  usePagePermissions,
  useEffectiveSellerId,
  useAccessModeInfo,
} from '../../../Context/AccessContext';
import { useSellerContext } from '../../../Context/SellerContext';

const LiveStreaming = React.memo(({navigation, route}) => {
    // Access control hooks
  const {canView, canCreate, canEdit, canDelete} = usePagePermissions('SHOWS');
  const effectiveSellerId = useEffectiveSellerId();
  const {isAccessMode, isOwnData, sellerInfo} = useAccessModeInfo();
  const { sellerCategories, categoriesLoaded, categoriesError } = useSellerContext();
  const [activeTab, setActiveTab] = useState('all');
  const [allShows, setAllShows] = useState([]); // Store all fetched shows
  const [displayShows, setDisplayShows] = useState([]); // Shows to display based on filter
  const [pagination, setPagination] = useState({
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
    totalPages: 1,
    totalShows: 0
  });
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    created: 0,
    live: 0,
    cancelled: 0,
    ended: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const scrollViewRef = useRef(null);
  const currentScrollPosition = useRef(0);

  // Helper function to get full CDN URL
  const getCDNUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath === 'string') {
      if (imagePath.startsWith('http')) return imagePath;
      return `${AWS_CDN_URL}${imagePath}`;
    }
    if (imagePath && imagePath.key) {
      return `${AWS_CDN_URL}${imagePath.key}`;
    }
    return null;
  };

  const renderItem = ({item}) => {
    // console.log('cohost', item);
    const handleEdit = () => {
      if (!canEdit) {
        ToastAndroid.show("You don't have permission to edit shows", ToastAndroid.SHORT);
        return;
      }
      // navigation.navigate('EditTaggedProducts', {showId:item._id});
      navigation.navigate('EditLs', {item});
    };

    return (
      <View style={styles.renderContent}>
        <View style={styles.itemContainer}>
          <Image
            source={{uri: `${AWS_CDN_URL}${item.thumbnailImage}`}}
            style={styles.thumbnailImage}
          />
          <View style={styles.textContainer}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}>
              <Text style={styles.title}>{item.title}</Text>
            
              {item.showStatus != 'ended' && item.showStatus != 'cancelled' && (
                canEdit ? (
              <TouchableOpacity
                    onPress={handleEdit}
                style={{position: 'absolute', padding: 10, right: 0, top: 0}}>
                <Feather name="edit" size={20} color="#ddd" />
                  </TouchableOpacity>
                ) : (
                  <View style={{position: 'absolute', padding: 0, right: 10, top: 0}}>
                    <Lock size={16} color="#666" />
                  </View>
                )
              )}
            </View>

            <View style={styles.row}>
              <Text style={[styles.time, {color: '#FFD700'}]}>
                Scheduled Date & time
              </Text>
              <Text style={styles.time}>
                {new Date(item.scheduledAt).toLocaleDateString()}{' '}
                {new Date(item.scheduledAt).toLocaleTimeString()}
              </Text>
            </View>

            {item.registrationCount > 0 ?
              <TouchableOpacity
                  onPress={() => navigation.navigate('RegistrationsScreen',{showId: item?._id})}
                  style={{ flexDirection:'row', marginBottom: 8}}>
                  <Icon5 name="users" size={16} color="#eee" />
                  <Text style={{ color: '#fff' }}> {item.registrationCount}</Text>
              </TouchableOpacity>:
              <View style={{marginBottom: 8}}></View>
            }

         

            <View style={styles.actions}>
              {/* Interest Button - Show for all statuses */}
              {/* <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  navigation.navigate('InterestedUsersScreen', {showId: item?._id});
                }}>
                <Icon name="heart" size={16} color="#DC2626" />
              </TouchableOpacity> */}

              {item.showStatus != 'created'&&item.showStatus != 'live' ? (
                <TouchableOpacity
                  style={[styles.actionButton]}
                  onPress={() => {
                     navigation.navigate('LiveStreamAnalyticsPage', {showId: item?._id});
                  }}>
                  {/* <Text style={styles.buttonText}>Analyze</Text> */}
                  <MaterialDesignIcons name="google-analytics" size={16} color="#ffd700" />
                </TouchableOpacity>
              ) : null}

              {item.showStatus != 'ended' && item.showStatus != 'live' ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      item?.showStatus?.toLowerCase() === 'cancelled' && {
                        backgroundColor: '#D92D2042',
                      },
                    ]}
                    disabled={item?.showStatus?.toLowerCase() === 'cancelled'}
                    onPress={() => {
                      setIsModalVisible(true);
                      setSelectedId(item._id);
                    }}>
                    <Text
                      style={[
                        styles.buttonText,
                        item?.showStatus?.toLowerCase() === 'cancelled' && {
                          color: 'red',
                        },
                      ]}>
                      {item?.showStatus?.toLowerCase() === 'cancelled'
                        ? 'Cancelled'
                        : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {item?.showStatus?.toLowerCase() === 'live' ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {}}>
                  <Text style={styles.buttonText}>End</Text>
                </TouchableOpacity>
              ) : null}

              {item?.showStatus != 'cancelled' && item.showStatus != 'ended' ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor:
                        item?.showStatus?.toLowerCase() === 'live'
                          ? 'red'
                          : '#FFD700',
                    },
                  ]}
                  onPress={() => 
                    Linking.openURL(`${shareUrl}seller/show/${item._id}/seller`)
                                      // ToastAndroid.show('This feature is only available on web',ToastAndroid.SHORT)
                    // navigation.navigate('StreamPreviewScreen',{item:{_id:item?._id,role:"host"}})
                  }>
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color:
                          item?.showStatus?.toLowerCase() === 'live'
                            ? '#fff'
                            : 'black',
                      },
                    ]}>
                    {item?.showStatus?.toLowerCase() === 'live'
                      ? 'LIVE'
                      : 'Start Show'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {item?.showStatus?.toLowerCase() === 'ended' ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {}}>
                  <Text style={styles.buttonText}>Ended</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
           {/* Cohost Section */}
            {item.hasCoHost && item.cohosts && item.cohosts.length > 0 && (
              <View style={styles.cohostSection}>
                <View style={styles.cohostHeader}>
                  <View style={styles.cohostBadge}>
                    <UserCheck size={12} color="#FFD700" />
                    <Text style={styles.cohostBadgeText}>
                      {item.cohosts.length} Co-Host{item.cohosts.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.cohostList}>
                  {item.cohosts.map((cohost, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => navigation.navigate('ViewSellerProdile', { id: cohost.userName })}
                      style={[
                        styles.cohostChip,
                        {
                          backgroundColor: cohost.status === 'accepted' 
                            ? 'rgba(46, 204, 113, 0.1)' 
                            : 'rgba(247, 206, 69, 0.1)',
                          borderColor: cohost.status === 'accepted' 
                            ? 'rgba(46, 204, 113, 0.3)' 
                            : 'rgba(247, 206, 69, 0.3)',
                        }
                      ]}
                      activeOpacity={0.7}>
                      {/* Avatar with Status Ring */}
                      <View style={styles.cohostAvatarContainer}>
                        {getCDNUrl(cohost.profileURL) ? (
                          <Image
                            source={{ uri: getCDNUrl(cohost.profileURL) }}
                            style={[
                              styles.cohostAvatar,
                              {
                                borderColor: cohost.status === 'accepted' ? '#2ecc71' : '#FFD700',
                              }
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.cohostAvatarFallback,
                              {
                                backgroundColor: cohost.status === 'accepted' ? '#2ecc71' : '#FFD700',
                                borderColor: cohost.status === 'accepted' ? '#2ecc71' : '#FFD700',
                              }
                            ]}>
                            <Text style={styles.cohostAvatarText}>
                              {(cohost.name || cohost.userName || 'C').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {/* Status Indicator Dot */}
                        <View
                          style={[
                            styles.cohostStatusDot,
                            {
                              backgroundColor: cohost.status === 'accepted' ? '#2ecc71' : '#FFD700',
                            }
                          ]}
                        />
                      </View>

                      {/* Name */}
                      <Text 
                        style={[
                          styles.cohostName,
                          { color: cohost.status === 'accepted' ? '#2ecc71' : '#fff' }
                        ]}
                        numberOfLines={1}>
                        {cohost.name || `@${cohost.userName}` || 'Co-Host'}
                      </Text>

                      {/* Status Icon */}
                      {cohost.status === 'accepted' ? (
                        <CheckCircle size={12} color="#2ecc71" />
                      ) : (
                        <ClockIcon size={12} color="#FFD700" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
      </View>
    );
  };
  // console.log(bgaSocketUrl,"caak")

  const handleReject = async () => {
    setLoading(true);
    try {
      const response = await api.patch(`/shows/${selectedId}/cancel`, {
        showStatus: 'cancelled',
      });
      // Refresh data after cancellation
      handleRefresh();
      ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
    } catch (error) {
      console.log('error cancelling the show', error);
    } finally {
      setLoading(false);
      setIsModalVisible(false);
    }
  };
  const PAGELIMIT=10;
 
  const fetchShows = async (page = 1, loadMore = false) => {
    // Prevent multiple simultaneous requests
    if (loadMore && loadingMore) {
      return;
    }
    if (!loadMore && loading) {
      return;
    }
    
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await api.get(`/shows/myshows?page=${page}&limit=${PAGELIMIT}`);
      
      const newData = response.data.data || [];
      const fetchedStatusCounts = response.data.statusCounts || {};
      console.log('Fetched shows:', newData);
      console.log('Status counts:', fetchedStatusCounts);
      
      // Update status counts
      setStatusCounts({
        all: fetchedStatusCounts.total || 0,
        created: fetchedStatusCounts.created || 0,
        live: fetchedStatusCounts.live || 0,
        cancelled: fetchedStatusCounts.cancelled || 0,
        ended: fetchedStatusCounts.ended || 0,
        total: fetchedStatusCounts.total || 0
      });
      
      if (loadMore) {
        // Append new data for infinite scroll
        setAllShows(prev => {
          const combined = [...prev, ...newData];
          return combined;
        });
      } else {
        // Replace data for new fetch (refresh or initial load)
        setAllShows(newData);
      }
      
      // Update pagination state
      setPagination(response.data.pagination || {
        currentPage: page,
        hasNextPage: false,
        hasPrevPage: page > 1,
        limit: 10,
        totalPages: 1,
        totalShows: newData.length
      });
      
    } catch (error) {
      console.log('Error fetching shows:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };
// console.log(pagination)
  // Load more data when reaching end of list
  const loadMoreData = () => {
    // For filtered tabs, check if we need more data
    if (activeTab !== 'all') {
      // If we have less than 5 filtered items and there's more data to load
      if ( pagination.hasNextPage && !loadingMore && !loading) {
        const nextPage = pagination.currentPage + 1;
        fetchShows(nextPage, true);
      }
    } else {
      // For 'all' tab, normal pagination
      if (pagination.hasNextPage && !loadingMore && !loading) {
        const nextPage = pagination.currentPage + 1;
        fetchShows(nextPage, true);
      }
    }
  };
// console.log(backendurl)
  const renderFooter = () => {
    if(loadingMore){
      return <View className='w-full items-center justify-center'>
                        <ActivityIndicator
                          size="small"
                          color="#FFD700"
                          style={{marginVertical: 10}}
                        />
                        <Text className='text-gray-300'>Loading more...</Text>
                      </View>
    }
    
    // Show load more button if there's more data available
    const shouldShowLoadMore = pagination.hasNextPage && !loading && displayShows.length > 0;
    
    if(shouldShowLoadMore) {
      return <TouchableOpacity
        onPress={loadMoreData}
        activeOpacity={0.7}
        className="flex-row items-center justify-center bg-brand-yellow px-4 py-2 mx-28 rounded-full shadow-md"
        style={{marginTop: 10}}
      >
        <Text className="text-black font-semibold text-base">Load More</Text>
      </TouchableOpacity>
    }
    return null;
  };

  // Refresh data (pull to refresh)
  const handleRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({...prev, currentPage: 1}));
    fetchShows(1, false);
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Don't reset data, just filter it
  };

  // Update display shows whenever allShows or activeTab changes (client-side filtering)
  useEffect(() => {
    if (activeTab === 'all') {
      setDisplayShows(allShows);
    } else {
      const filtered = allShows.filter(
        show => show?.showStatus?.toLowerCase() === activeTab?.toLowerCase(),
      );
      setDisplayShows(filtered);
      
      // Auto-load more if filtered results are too few
      if (filtered.length < 5 && pagination.hasNextPage && !loading && !loadingMore) {
        fetchShows(pagination.currentPage + 1, true);
      }
    }
  }, [allShows, activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      setActiveTab('all');
      setPagination(prev => ({...prev, currentPage: 1}));
      fetchShows(1, false);
    }, [])
  );

  // Restore scroll position after refresh completes
  useEffect(() => {
    if (!refreshing && scrollViewRef.current && currentScrollPosition.current > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ 
          x: currentScrollPosition.current, 
          animated: false 
        });
      }, 100);
    }
  }, [refreshing]);

  const renderTabBar = () => (
    <View style={{paddingHorizontal: 0, paddingVertical: 10}}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        contentContainerStyle={styles.tabBar}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          // Save current scroll position
          currentScrollPosition.current = event.nativeEvent.contentOffset.x;
        }}>
        {['all', 'created', 'live', 'cancelled', 'ended'].map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              handleTabChange(tab);
              // Use setTimeout to ensure DOM is updated before scrolling
              setTimeout(() => {
                if (scrollViewRef.current) {
                  // Scroll to show the clicked tab - simple left scroll based on index
                  const scrollX = index * 100; // Approximate position
                  currentScrollPosition.current = scrollX; // Save the position
                  scrollViewRef.current.scrollTo({ 
                    x: scrollX, 
                    animated: true 
                  });
                }
              }, 100);
            }}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeText,
              ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {statusCounts[tab] > 0 && (
                <Text style={[
                  styles.tabCountBadge,
                  activeTab === tab && styles.activeTabCountBadge
                ]}>
                  {' '}({statusCounts[tab]})
                </Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyComponent = () => {
    const getEmptyStateContent = () => {
      switch (activeTab) {
        case 'live':
          return {
            icon: 'radio',
            iconLib: 'Feather',
            title: 'No Live Shows',
            description: 'You don\'t have any shows streaming right now.',
            tips: ['Schedule a show to go live', 'Start broadcasting to your audience'],
          };
        case 'created':
          return {
            icon: 'calendar',
            iconLib: 'Feather',
            title: 'No Scheduled Shows',
            description: 'You haven\'t created any upcoming shows yet.',
            tips: ['Plan your next live session', 'Schedule shows in advance for better reach'],
          };
        case 'cancelled':
          return {
            icon: 'x-circle',
            iconLib: 'Feather',
            title: 'No Cancelled Shows',
            description: 'Great! You haven\'t cancelled any shows.',
            tips: ['Keep your schedule consistent', 'Your audience appreciates reliability'],
          };
        case 'ended':
          return {
            icon: 'check-circle',
            iconLib: 'Feather',
            title: 'No Completed Shows',
            description: 'You haven\'t completed any shows yet.',
            tips: ['Go live to engage with your audience', 'Build your streaming history'],
          };
        default:
          return {
            icon: 'video',
            iconLib: 'Feather',
            title: 'Start Your Live Streaming Journey',
            description: 'No shows yet. Create your first live show and connect with your audience in real-time!',
            tips: [
              'Engage directly with customers',
              'Showcase products live',
              'Build trust and community',
              'Boost sales through interaction',
            ],
          };
      }
    };

    const content = getEmptyStateContent();
    
    return (
      <ScrollView>
      <Animatable.View 
        animation="fadeInUp" 
        duration={800}
        style={styles.emptyStateContainer}>
        {/* Animated Icon Container */}
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={2000}
          style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#FFD700', '#B38728']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.emptyIconGradient}>
            <Feather name={content.icon} color="#000" size={50} />
          </LinearGradient>
        </Animatable.View>

        {/* Title */}
        <Text style={styles.emptyStateTitle}>{content.title}</Text>

        {/* Description */}
        <Text style={styles.emptyStateDescription}>{content.description}</Text>

        {/* Tips Section */}
        {content.tips && content.tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb-o" size={18} color="#FFD700" />
              <Text style={styles.tipsHeaderText}>Quick Tips</Text>
            </View>
            {content.tips.map((tip, index) => (
              <Animatable.View
                key={index}
                animation="fadeInLeft"
                delay={200 * (index + 1)}
                style={styles.tipItem}>
                <View style={styles.tipBullet}>
                  <View style={styles.tipBulletDot} />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </Animatable.View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.emptyStateActions}>
          {activeTab !== 'all' && (
            <TouchableOpacity
              style={styles.emptyStateSecondaryButton}
              onPress={() => handleTabChange('all')}
              activeOpacity={0.7}>
              <Feather name="grid" size={18} color="#FFD700" />
              <Text style={styles.emptyStateSecondaryButtonText}>View All Shows</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.emptyStatePrimaryButton}
            onPress={() => {
              if (!canCreate) {
                ToastAndroid.show("You don't have permission to create shows", ToastAndroid.SHORT);
                return;
              }
              navigation.navigate('LiveStreamForm');
            }}
            activeOpacity={0.7}>
            <LinearGradient
              colors={canCreate ? ['#FFD700', '#B38728'] : ['#666', '#444']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.emptyStatePrimaryButtonGradient}>
              <Feather 
                name={canCreate ? "plus-circle" : "lock"} 
                size={20} 
                color={canCreate ? "#000" : "#999"} 
              />
              <Text style={[
                styles.emptyStatePrimaryButtonText,
                !canCreate && {color: '#999'}
              ]}>
                {canCreate ? 'Create New Show' : 'No Permission'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        {activeTab === 'all' && (
          <View style={styles.infoCardsContainer}>
            <View style={styles.infoCard}>
              <Icons name="account-group" size={24} color="#FFD700" />
              <Text style={styles.infoCardTitle}>Reach Audience</Text>
              <Text style={styles.infoCardText}>Connect with customers in real-time</Text>
            </View>
            <View style={styles.infoCard}>
              <Icons name="cart-check" size={24} color="#FFD700" />
              <Text style={styles.infoCardTitle}>Boost Sales</Text>
              <Text style={styles.infoCardText}>Showcase products live</Text>
            </View>
          </View>
        )}
      </Animatable.View>
      </ScrollView>
    );
  };

  return (
    <>
      {loading && !refreshing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color="gray" size={20} />
          </View>
        </View>
      ) : null}

      {canCreate ? (
      <FAB
        icon="plus"
        color="#000"
        style={styles.fab}
        onPress={() => navigation.navigate('LiveStreamForm')}
      />
      ) : (
        <FAB
          icon="lock"
          color="#000"
          style={styles.fab}
          onPress={() => {
            ToastAndroid.show("You don't have permission to create shows", ToastAndroid.SHORT);
          }}
        />
      )}

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <ArrowLeftCircle color={'#fff'} size={30} />
          </TouchableOpacity>
          <LinearGradient
            colors={['#B38728', '#FFD700']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerGradient}>
            <View style={styles.titleContainer}>
              <Text style={styles.headertitle}>Live</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Access Mode Banner */}
        {isAccessMode && (
          <View style={styles.accessModeBanner}>
            <View style={styles.accessModeHeader}>
              <Eye color="#FFD700" size={20} />
              <View style={styles.accessModeHeaderText}>
                <Text style={styles.accessModeTitle}>
                  Access Mode Active
                  {/* <Text style={styles.accessModeBadge}> Read-Only</Text> */}
                </Text>
                <Text style={styles.accessModeSubtitle}>
                  Viewing shows for:{' '}
                  <Text style={styles.accessModeSellerName}>
                    {sellerInfo?.userName || 'Seller'}
                  </Text>
                </Text>
              </View>
            </View>
            <View style={styles.permissionTags}>
              <View
                style={[
                  styles.permissionTag,
                  canView ? styles.permissionAllowed : styles.permissionDenied,
                ]}>
                <Text style={styles.permissionTagText}>
                  {canView ? '✓ View' : '✗ View'}
                </Text>
              </View>
              <View
                style={[
                  styles.permissionTag,
                  canCreate ? styles.permissionAllowed : styles.permissionDenied,
                ]}>
                <Text style={styles.permissionTagText}>
                  {canCreate ? '✓ Create' : '✗ Create'}
                </Text>
              </View>
              <View
                style={[
                  styles.permissionTag,
                  canEdit ? styles.permissionAllowed : styles.permissionDenied,
                ]}>
                <Text style={styles.permissionTagText}>
                  {canEdit ? '✓ Edit' : '✗ Edit'}
                </Text>
              </View>
              {/* <View
                style={[
                  styles.permissionTag,
                  canDelete ? styles.permissionAllowed : styles.permissionDenied,
                ]}>
                <Text style={styles.permissionTagText}>
                  {canDelete ? '✓ Delete' : '✗ Delete'}
                </Text>
              </View> */}
            </View>
          </View>
        )}

        {displayShows.length == 0 && !loading?( renderEmptyComponent()):
        <SectionList
          sections={[{title: 'Shows', data: displayShows}]}
          keyExtractor={(item,index) => index.toString()}
          renderItem={renderItem}
          renderSectionHeader={() => null}
          contentContainerStyle={{paddingBottom: 50}}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.3}
          removeClippedSubviews={false} 
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          ListHeaderComponent={renderTabBar}
          ListFooterComponent={renderFooter}
          // ListEmptyComponent={renderEmptyComponent}
          ItemSeparatorComponent={() => <View style={{height: 10}} />}
          style={{paddingHorizontal: 20}}
        />}
        
      </SafeAreaView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Are you Sure want to cancel the Show ?
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => setIsModalVisible(false)}>
                <Text style={styles.submitButtonText}>Return</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleReject()}>
                <Text style={styles.closeButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // height:'100%'
    // paddingHorizontal: 20,
    backgroundColor: colors.primaryColor,
  },
   footer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    marginLeft: 10,
    color: '#777',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 4,
    marginRight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    borderRadius: 50,
    // padding: 10,
    elevation: 5,
    zIndex: 1, // Ensures the FAB is on top
    backgroundColor: '#FFD700',
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 10,
    marginRight:10,
    gap: 10,
    alignItems: 'center',
    alignSelf: 'flex-end',
    // justifyContent: 'space-evenly',
  },
  buttonText: {
    fontSize: 14,
    color: '#fff',
  },
  row: {
    flexDirection: 'column',
    // gap: 5,
    marginBottom:  4 , //20,
    // flexWrap: 1,
    // alignItems: 'center',
  },

  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 300,
    // height: '60%',
    padding: 20,
    backgroundColor: colors.primaryColor,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color:'#fff',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flex: 1, // Ensures the checkbox and text take up the available space
    //backgroundColor: 'red'
  },
  tagText: {
    fontSize: 16,
    marginLeft: 10,
  },

  submitButton: {
    backgroundColor: '#fcd34d',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    width: '50%',
  },
  submitButtonText: {
    // color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 5,
    width: '50%',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 16,
    padding:10,
    // paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
    backgroundColor: '#333',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 10,

    marginTop: 10,
    paddingBottom: 10,
  },
  renderContent: {
    marginBottom: 20,
    // alignItems:'c'
    // borderBottomWidth: 1,
    // borderBottomColor: '#ccc',
    // backgroundColor: '#fff',
    // padding: 10,
    // elevation: 3,
    borderRadius: 10,
    backgroundColor: colors.SecondaryColor,
    borderColor: '#333',
    borderWidth: 1,
    elevation: 5,
  },
  thumbnailImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#333',
  },
  textContainer: {
    // justifyContent: 'center',
    // backgroundColor:'yellow',
    width: '66%',
  },
  headertitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    // width:140
    textAlign: 'left',
    // width: 100,
    // backgroundColor:'red'
    color: '#fff',
  },
  category: {
    fontSize: 14,
    // marginBottom: 5,
    width: '66%',
    color: 'gray',
  },
  subCategory: {
    fontSize: 14,
    marginBottom: 5,
    color: 'gray',
  },
  time: {
    fontSize: 13,
    color: 'gray',
    // marginBottom: 5,
  },
  streamUrl: {
    fontSize: 12,
    color: 'blue',
    marginBottom: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 7,
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  status: {
    backgroundColor: '#333',
    textTransform: 'capitalize',
    color: 'white',
    fontSize: 16,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    height: 42,
    alignItems: 'center',
    backgroundColor: 'black',
    marginTop: 16,
    // gap:10,
    paddingHorizontal: 10,
    marginBottom: 20, // Remove any unwanted space
    borderRadius: 16,
  },
  tab: {
    height: 40,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    borderRadius: 0,
    elevation: 2,
    backgroundColor: 'transparent', //'#fff',
    marginRight: 10,
    alignItems: 'center',
    //borderBottomColor: '#FFD700',
    borderBottomWidth: 2,
  },
  activeTab: {
    // backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    borderBottomColor: '#FFD700',
  },
  iconContainer: {},
  tabText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFF',
  },
  activeText: {
    color: '#FFD700', // Dark text for active tab
    fontWeight: 'bold',
  },
  tabCountBadge: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  activeTabCountBadge: {
    color: '#FFD700',
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentText: {
    fontSize: 18,
    color: '#16161a',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    alignItems: 'baseline',
    gap: 5,
    marginBottom: 10,
    marginTop: 5,
    paddingHorizontal: 9,
    // marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
    //marginLeft: 4
  },
  viewAll: {
    fontSize: 13,
    color: '#FFD700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#D9D9D94F',
    marginBottom: 10,
    width: '65%',
    alignSelf: 'center',
  },
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginTop: 20,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  tipBullet: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginLeft: 8,
  },
  emptyStateActions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  emptyStateSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 8,
  },
  emptyStateSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  emptyStatePrimaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
  },
  emptyStatePrimaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyStatePrimaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoCardText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  accessModeBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    padding: 16,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  accessModeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accessModeHeaderText: {
    flex: 1,
  },
  accessModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  accessModeBadge: {
    fontSize: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  accessModeSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  accessModeSellerName: {
    fontWeight: '600',
    color: '#FFD700',
  },
  permissionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  permissionTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionAllowed: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  permissionDenied: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
  },
  permissionTagText: {
    fontSize: 12,
    color: '#fff',
  },
  // Cohost Styles
  cohostSection: {
    marginBottom: 12,
    marginHorizontal:8,
  //  marginLeft:10,
    marginTop: 4,
  },
  cohostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cohostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 206, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  cohostBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
  },
  cohostList: {
    flexDirection: 'row',
  //  flexWrap: 'wrap',
    gap: 8,
  //  backgroundColor:'red'
  },
  cohostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: '48%',
  },
  cohostAvatarContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  cohostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  cohostAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cohostAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cohostStatusDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(40,40,40,0.5)',
  },
  cohostName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LiveStreaming;
