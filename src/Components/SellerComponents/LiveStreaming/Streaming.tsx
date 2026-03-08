import React, {useEffect, useState, useCallback, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  Image,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Foundation from 'react-native-vector-icons/Foundation';
import Ionicons from 'react-native-vector-icons/Ionicons';

import api from '../../../Utils/Api';
import {socketurl, shareUrl} from '../../../../Config';
import {colors} from '../../../Utils/Colors';
import {AWS_CDN_URL} from '../../../Utils/aws';
import {formatFollowerCount, Toast} from '../../../Utils/dateUtils';
import {AuthContext} from '../../../Context/AuthContext';
import likeService from '../../../Services/likeService';

import GlobalConfirmModal from '../../Reuse/AlertModal';
import LikeButton from '../../Reuse/LikeButton';
import ShareModal from '../../Reuse/ShareModal';
import LiveComments from '../../Shows/LiveComments.appsync';
import Vendor from './Utils/Vendor';
import ProductsBottomSheet from './Utils/ProductsLIsiting';
import NoteModal from './Utils/NoteModal';
import InviteBottomSheet from './Utils/InviteBottomSheet';
import SimulcastBottomSheet from './Utils/SimulcastBottomSheet';
import {UserRound} from 'lucide-react-native';
import { noteWhite } from '../../../assets/assets';

const socket = io(socketurl, {transports: ['websocket']});

// Types
interface StreamControls {
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isStopStreaming: boolean;
}

interface UIState {
  loading: boolean;
  liked: boolean;
  likes: number;
  isKeyboardVisible: boolean;
  flag: boolean;
}

interface ProductState {
  matchedProducts: {
    auction: any[];
    buynow: any[];
    giveaway: any[];
    bundleSales: any[];
  };
  auctionProduct: any;
}

interface Modals {
  isStoreVisible: boolean;
  isNotesVisible: boolean;
  isInviteVisible: boolean;
  isSimulcastVisible: boolean;
}

interface DataState {
  showData: any;
  messages: any[];
  flag: boolean;
}

const Streaming = ({route, navigation}: {route: any; navigation: any}) => {
  const {user} = useContext(AuthContext);
  const {item} = route.params || {};
  const streamId = item?._id;

  // Stream Controls
  const [streamControls, setStreamControls] = useState<StreamControls>({
    isCameraEnabled: true,
    isMicEnabled: true,
    isStopStreaming: false,
  });

  // Viewer & Streaming State
  const [viewerCount, setViewerCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [roomIdRef, setRoomIdRef] = useState<any>(null);

  // UI State
  const [uiState, setUiState] = useState<UIState>({
    loading: false,
    liked: false,
    likes: 0,
    isKeyboardVisible: false,
    flag: false,
  });

  // Product State
  const [productState, setProductState] = useState<ProductState>({
    matchedProducts: {
      auction: [],
      buynow: [],
      giveaway: [],
      bundleSales: [],
    },
    auctionProduct: {},
  });

  // Modal State
  const [modals, setModals] = useState<Modals>({
    isStoreVisible: false,
    isNotesVisible: false,
    isInviteVisible: false,
    isSimulcastVisible: false,
  });

  const [shareModal, setShareModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Data State
  const [dataState, setDataState] = useState<DataState>({
    showData: {},
    messages: [],
    flag: false,
  });

  // Flash Sale State
  const [activeFlashSales, setActiveFlashSales] = useState<any[]>([]);
  const [flashSaleHistory, setFlashSaleHistory] = useState<any[]>([]);
  const [flashSaleLoading, setFlashSaleLoading] = useState(false);
  const [flashSaleApiError, setFlashSaleApiError] = useState<string | null>(null);
  const [selectedProductForFlashSale] = useState(null);
  const [showStartModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // =====================
  // API Functions
  // =====================

  const sendLiveInvitation = async (userIds: string | string[]) => {
    const cohostUserIds = Array.isArray(userIds) ? userIds : [userIds];

    if (!streamId) {
      ToastAndroid.show('Show information is not available.', ToastAndroid.LONG);
      return;
    }

    try {
      const response = await api.post(`cohost/invite/${streamId}`, {
        cohostUserIds,
      });

      if (response.status === 200) {
        ToastAndroid.show(
          'Live invitation sent! Ask your new co-host to join now.',
          ToastAndroid.SHORT,
        );
      } else {
        ToastAndroid.show(
          response.data?.message || 'Failed to send live invitation',
          ToastAndroid.LONG,
        );
      }
    } catch (error: any) {
      ToastAndroid.show(
        error.response?.data?.message || 'Failed to send live invitation',
        ToastAndroid.LONG,
      );
    }
  };

  const fetchInitialData = async () => {
    try {
      setUiState(prev => ({...prev, loading: true}));
      const userId = (await AsyncStorage.getItem('userId')) || '';

      // Fetch initial likes
      try {
        const likesResponse = await likeService.getLikes(item?._id);
        if (likesResponse.success) {
          setUiState(prev => ({
            ...prev,
            likes: likesResponse.data.likes || 0,
            liked: likesResponse.data.likedBy?.includes(userId) || false,
          }));
        }
      } catch {
        setUiState(prev => ({
          ...prev,
          likes: item?.likes || 0,
          liked: item?.likedBy?.includes(userId) || false,
        }));
      }

      setDataState(prev => ({...prev, showData: item}));

      const response = await api.get(`shows/get/live/${item?._id}`);

      setDataState(prev => ({
        ...prev,
        messages: response?.data?.comments || [],
        flag: true,
      }));

      setProductState(prev => ({
        ...prev,
        matchedProducts: {
          auction: response?.data?.auctionProducts || [],
          buynow: response?.data?.buyNowProducts || [],
          giveaway: response?.data?.giveawayProducts || [],
          bundleSales: response?.data?.bundleSales || [],
        },
      }));
    } catch (err: any) {
      console.error('Error fetching initial data:', err.response?.data);
    } finally {
      setUiState(prev => ({...prev, loading: false}));
    }
  };

  const fetchFlashSaleHistory = useCallback(async () => {
    if (!streamId) return;
    setFlashSaleLoading(true);
    try {
      const response = await api.get(`/flash-live/${streamId}/flash-sale/history`);
      if (response.data.success) {
        setFlashSaleHistory(response.data.data || []);
      }
    } catch {
      setFlashSaleApiError('Failed to load history');
    } finally {
      setFlashSaleLoading(false);
    }
  }, [streamId]);

  // =====================
  // Socket Effects
  // =====================

  useEffect(() => {
    if (!streamId) return;
    
    socket.emit('joinRoom', streamId);
    fetchInitialData();

    return () => {
      socket.off('giveawayApplicantsUpdated');
      socket.off('giveawayWinner');
      socket.off('auctionStarted');
      socket.off('timerUpdate');
      socket.off('auctionEnded');
      socket.off('clrScr');
      socket.off('bidUpdated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, item]);

  // Flash Sale Socket Listeners
  useEffect(() => {
    if (!streamId) return;

    socket.emit('JOIN_LIVE_STREAM', streamId);

    const handleFlashSaleStarted = (data: any) => {
      setFlashSaleApiError(null);
      setActiveFlashSales(prev => {
        const exists = prev.some(sale => sale._id === data._id);
        if (!exists) {
          return [...prev, {...data, flashSaleId: data._id}];
        }
        return prev;
      });
    };

    const handleFlashSaleEnded = (data: any) => {
      setActiveFlashSales(prev =>
        prev.filter(
          sale => sale._id !== data.flashSaleId && sale.flashSaleId !== data.flashSaleId,
        ),
      );
      setTimeout(() => fetchFlashSaleHistory(), 1000);
    };

    const handleStockUpdate = (data: any) => {
      setActiveFlashSales(prev =>
        prev.map(sale => {
          if (sale._id === data.flashSaleId || sale.flashSaleId === data.flashSaleId) {
            const updatedProducts = sale.products?.map((p: any) =>
              p.productId === data.productId
                ? {...p, currentFlashStock: data.currentStock}
                : p,
            );
            return {...sale, currentStock: data.currentStock, products: updatedProducts};
          }
          return sale;
        }),
      );
    };

    const handleFlashSaleError = (data: any) => {
      setFlashSaleApiError(data.message || 'An unknown error occurred');
      Toast(data.message || 'Flash Sale Error');
      setFlashSaleLoading(false);
    };

    socket.on('LIVE_STREAM_FLASH_SALE_STARTED', handleFlashSaleStarted);
    socket.on('LIVE_STREAM_FLASH_SALE_ENDED', handleFlashSaleEnded);
    socket.on('LIVE_STREAM_STOCK_UPDATE', handleStockUpdate);
    socket.on('LIVE_STREAM_FLASH_SALE_ERROR', handleFlashSaleError);

    return () => {
      socket.off('LIVE_STREAM_FLASH_SALE_STARTED', handleFlashSaleStarted);
      socket.off('LIVE_STREAM_FLASH_SALE_ENDED', handleFlashSaleEnded);
      socket.off('LIVE_STREAM_STOCK_UPDATE', handleStockUpdate);
      socket.off('LIVE_STREAM_FLASH_SALE_ERROR', handleFlashSaleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, fetchFlashSaleHistory]);

  // Visual Timer for Flash Sales
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial Flash Sale Data Fetch
  useEffect(() => {
    const fetchFlashSaleData = async () => {
      if (!streamId) return;

      setFlashSaleLoading(true);
      try {
        const response = await api.get(`/flash-live/${streamId}/flash-sale/active`);
        if (response.data.success && response.data.data) {
          setActiveFlashSales(response.data.data.activeFlashSales || []);
        }
        await fetchFlashSaleHistory();
        await api.post(`/flash-live/${streamId}/flash-sale/initialize-timers`);
      } catch {
        setFlashSaleApiError('Failed to load initial flash sale data');
      } finally {
        setFlashSaleLoading(false);
      }
    };

    fetchFlashSaleData();
  }, [streamId, fetchFlashSaleHistory]);

  // =====================
  // Keyboard Handling
  // =====================

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () =>
      setUiState(prev => ({...prev, isKeyboardVisible: true})),
    );
    const hideListener = Keyboard.addListener('keyboardDidHide', () =>
      setUiState(prev => ({...prev, isKeyboardVisible: false})),
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // =====================
  // Like Subscription
  // =====================

  useEffect(() => {
    if (!streamId || !user) return;

    let cleanup: (() => void) | null = null;

    const setupLikeSubscription = async () => {
      try {
        cleanup = await likeService.subscribeLikeUpdates(
          streamId,
          (likeData: any) => {
            setUiState(prev => ({
              ...prev,
              likes: likeData.likes || 0,
              liked: likeData.likedBy?.includes(user._id) || false,
            }));
          },
          (error: any) => {
            console.error('Like subscription error:', error);
          },
        );
      } catch (error) {
        console.error('Failed to setup like subscription:', error);
      }
    };

    setupLikeSubscription();

    return () => {
      if (cleanup) cleanup();
    };
  }, [streamId, user]);

  // =====================
  // Toggle Functions
  // =====================

  const toggleModal = (modalName: keyof Modals) => {
    setModals(prev => ({...prev, [modalName]: !prev[modalName]}));
  };

  const toggleModalClose = (modalName: keyof Modals) => {
    setModals(prev => ({...prev, [modalName]: false}));
  };

  const toggleCamera = () => {
    setStreamControls(prev => ({...prev, isCameraEnabled: !prev.isCameraEnabled}));
  };

  const toggleMic = () => {
    setStreamControls(prev => ({...prev, isMicEnabled: !prev.isMicEnabled}));
  };

  // =====================
  // Navigation Handlers
  // =====================

  const handleBackPress = useCallback(() => {
    setShowExitModal(true);
    return true;
  }, []);

  const handleExitConfirm = useCallback(() => {
    setShowExitModal(false);
    navigation.goBack();
  }, [navigation]);

  const handleExitCancel = useCallback(() => {
    setShowExitModal(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => backHandler.remove();
    }, [handleBackPress]),
  );

  const toggleStreaming = () => {
    setStreamControls(prev => ({...prev, isStopStreaming: !prev.isStopStreaming}));
    navigation.goBack();
  };

  // =====================
  // Like Handler
  // =====================

  const handleLike = useCallback(async () => {
    if (!user?._id) return;

    const wasLiked = uiState.liked;
    setUiState(prev => ({
      ...prev,
      liked: !prev.liked,
      likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
    }));

    try {
      await likeService.toggleLike(streamId, user._id, user.userName || user.name || 'User');
    } catch {
      setUiState(prev => ({
        ...prev,
        liked: wasLiked,
        likes: wasLiked ? prev.likes + 1 : prev.likes - 1,
      }));
    }
  }, [streamId, user, uiState.liked]);

  // =====================
  // Flash Sale Data Object
  // =====================

  const flashSaleData = {
    showId: streamId,
    sellerId: user?.sellerInfo?._id,
    activeFlashSales,
    flashSaleHistory,
    flashSaleLoading,
    flashSaleApiError,
    currentTime,
    showStartModal,
    selectedProductForFlashSale,
  };

  // =====================
  // Render
  // =====================

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}>
          {/* Modals */}
          <ShareModal
            isOpen={shareModal}
            source="liveVideo"
            onClose={() => setShareModal(false)}
            onShare={() => setShareModal(false)}
            shareContent={`Premium Stream live now! Don't miss it\n ${dataState?.showData?.title}`}
            shareUrl={`${shareUrl}user/show/${streamId}`}
          />

          <NoteModal
            note={dataState?.showData?.notes || 'No Note Added'}
            visible={modals.isNotesVisible}
            onClose={() => toggleModal('isNotesVisible')}
          />

          <ProductsBottomSheet
            matchedProducts={productState.matchedProducts}
            onClose={() => toggleModalClose('isStoreVisible')}
            onGiveaway={() => {}}
            streamId={streamId}
            flashSaleData={flashSaleData}
            isOpen={modals.isStoreVisible}
          />

          {modals.isInviteVisible && (
            <InviteBottomSheet
              onInvite={sendLiveInvitation}
              showId={streamId}
              isOpen={modals.isInviteVisible}
              setIsOpen={() => toggleModal('isInviteVisible')}
            />
          )}

          {modals.isSimulcastVisible && (
            <SimulcastBottomSheet
              isOpen={modals.isSimulcastVisible}
              setIsOpen={() => toggleModal('isSimulcastVisible')}
              streamId={roomIdRef?.current}
              streamData={{streamStatus: isStreaming ? 'live' : 'notLive'}}
              onSimulcastUpdate={update => {
                console.log(`Simulcast ${update.action}: ${update.platforms?.join(', ') || ''}`);
              }}
            />
          )}

          <GlobalConfirmModal
            visible={showExitModal}
            onClose={handleExitCancel}
            onConfirm={handleExitConfirm}
            title="Exit Live Stream"
            content="Are you sure you want to exit? Your live stream will continue."
            confirmText="Exit"
            cancelText="Stay"
            mode="warning"
            showIcon={true}
          />

          {/* Main Content */}
          <View style={styles.content}>
            {item._id && (
              <Vendor
                showId={item?._id}
                IsCameraOn={streamControls.isCameraEnabled}
                IsMicrophoneOn={streamControls.isMicEnabled}
                isStopStreaming={streamControls.isStopStreaming}
                showData={item}
                onViewerCountChange={setViewerCount}
                onStreamingChange={setIsStreaming}
                setRoomIdRef={setRoomIdRef}
              />
            )}

            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ViewSellerProdile', {id: user?.userName})}
                style={styles.userInfo}>
                {user?.profileURL?.key ? (
                  <Image
                    source={{uri: `${AWS_CDN_URL}${user?.profileURL?.key}`}}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <FontAwesome name="user-circle-o" size={50} color="#777" />
                  </View>
                )}
                <Text style={styles.username}>@{user?.userName}</Text>
              </TouchableOpacity>

              <View style={styles.viewersContainer}>
                <View style={styles.viewerCountContainer}>
                  <View style={styles.viewerCountButton}>
                    <UserRound size={16} color="white" />
                    <Text style={styles.viewerCountText}>
                      {formatFollowerCount(viewerCount)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Notes Button */}
            <TouchableOpacity
              style={styles.notesButton}
              onPress={() => toggleModal('isNotesVisible')}>
              <Image
                source={{uri:noteWhite}}
                style={styles.notesIcon}
              />
              <Text style={styles.notesText}>Seller note</Text>
            </TouchableOpacity>

            {/* Loading Indicator */}
            {uiState.loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primaryButtonColor} size={25} />
              </View>
            )}

            {/* Comments and Controls */}
            {dataState.messages && dataState.flag && (
              <>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={[
                    styles.commentsContainer,
                    uiState.isKeyboardVisible && styles.commentsContainerKeyboard,
                  ]}>
                  <LiveComments
                    streamId={item?._id}
                    prevComments={dataState.messages}
                    navigateToStore={() =>
                      navigation.navigate('SellerStoreScreen', {
                        products: productState.matchedProducts,
                        flashSaleData,
                      })
                    }
                    feedBack={() => {}}
                    isKeyboardVisible={uiState.isKeyboardVisible}
                    isShowUpcoming={false}
                  />
                </KeyboardAvoidingView>

                {/* Product Box */}
                {!uiState.isKeyboardVisible && !productState?.auctionProduct && (
                  <View style={styles.productBox}>
                    <Image
                      source={{
                        uri: `${AWS_CDN_URL}${productState.auctionProduct?.productId?.images[0]?.key}`,
                      }}
                      style={styles.productImage}
                    />
                    <View>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {productState.auctionProduct?.productId?.title}
                      </Text>
                      <Text style={styles.productText}>
                        Available - {productState.auctionProduct?.productId?.quantity || 0} left!
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Content & Control Buttons */}
                {!uiState.isKeyboardVisible && productState?.auctionProduct && (
                  <>
                    <View style={styles.actionContent}>
                      <ScrollView
                        contentContainerStyle={styles.horizontalContent}
                        horizontal
                        showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                          style={[
                            styles.infoButton,
                            modals.isStoreVisible && styles.selectedButton,
                          ]}
                          onPress={() => toggleModal('isStoreVisible')}>
                          <Text
                            style={[
                              styles.notesText,
                              modals.isStoreVisible && styles.selectedText,
                            ]}>
                            View Product
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.infoButton,
                            modals.isInviteVisible && styles.selectedButton,
                          ]}
                          onPress={() => toggleModal('isInviteVisible')}>
                          <Text
                            style={[
                              styles.notesText,
                              modals.isInviteVisible && styles.selectedText,
                            ]}>
                            Invite Co-host
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>

                    <View style={styles.controlBox}>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          modals.isSimulcastVisible && styles.controlButtonActive,
                        ]}
                        onPress={() => toggleModal('isSimulcastVisible')}>
                        <Foundation name="sound" color="#fff" size={20} />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.controlButton} onPress={toggleMic}>
                        <FontAwesome
                          name={streamControls.isMicEnabled ? 'microphone' : 'microphone-slash'}
                          color="#fff"
                          size={20}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
                        {streamControls.isCameraEnabled ? (
                          <FontAwesome name="video-camera" color="#fff" size={20} />
                        ) : (
                          <FontAwesome6 name="video-slash" color="#fff" size={20} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.controlButton}
                        onPress={() =>
                          navigation.navigate('SellerStoreScreen', {
                            products: productState.matchedProducts,
                            flashSaleData,
                          })
                        }>
                        <Ionicons name="storefront" color="#fff" size={20} />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.stopButton} onPress={toggleStreaming}>
                        <FontAwesome name="stop" color="#fff" size={15} />
                        <Text style={styles.stopButtonText}>Stop Live</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            {/* Action Buttons */}
            <View
              style={[
                styles.actionButtons,
                uiState.isKeyboardVisible && styles.actionButtonsKeyboard,
              ]}>
              <TouchableOpacity style={styles.shareContainer} onPress={handleLike}>
                <LikeButton
                  initialLiked={uiState.liked}
                  initialLikes={uiState.likes}
                  onLike={handleLike}
                  isShowUpcoming={false}
                />
                <Text style={styles.notesText}>{formatFollowerCount(uiState.likes)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareContainer}
                onPress={() => setShareModal(true)}>
                <Image
                  source={require('../../../assets/images/liveshare.png')}
                  style={styles.actionIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: '28%',
    left: '50%',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  username: {
    fontSize: 18,
    color: 'white',
    textTransform: 'capitalize',
  },
  avatar: {
    height: 50,
    width: 50,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 70,
  },
  viewersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  viewerCountContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  viewerCountButton: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
  viewerCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  notesButton: {
    position: 'absolute',
    top: 80,
    left: 20,
    alignItems: 'center',
  },
  notesIcon: {
    height: 30,
    width: 30,
  },
  notesText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  commentsContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
    bottom: 100,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 1,
    gap: 5,
  },
  commentsContainerKeyboard: {
    bottom: 0,
    height: 300,
  },
  productBox: {
    gap: 10,
    position: 'absolute',
    backgroundColor: '#FFFFFF1C',
    bottom: 150,
    right: 20,
    left: 10,
    height: 90,
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  productImage: {
    height: 70,
    backgroundColor: '#333',
    width: 65,
    borderRadius: 10,
  },
  productTitle: {
    width: '50%',
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    flexShrink: 2,
  },
  productText: {
    color: '#ccc',
    fontSize: 12,
  },
  actionContent: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    left: 10,
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
    marginBottom: 10,
  },
  infoButton: {
    padding: 3,
    borderRadius: 20,
    paddingHorizontal: 7,
    backgroundColor: '#1B1B1B',
  },
  selectedButton: {
    backgroundColor: '#F7CE45',
  },
  selectedText: {
    color: '#000',
  },
  controlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'space-evenly',
    backgroundColor: '#1A1A1A',
  },
  controlButton: {
    padding: 13,
    borderRadius: 30,
    backgroundColor: '#E0E0E01F',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'dodgerblue',
  },
  stopButton: {
    backgroundColor: '#DC2626',
    padding: 10,
    gap: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtons: {
    gap: 20,
    position: 'absolute',
    right: 20,
    bottom: 350,
    zIndex: 999,
  },
  actionButtonsKeyboard: {
    bottom: 50,
  },
  shareContainer: {
    alignItems: 'center',
    gap: 5,
  },
  actionIcon: {
    padding: 5,
    borderRadius: 5,
    height: 38,
    width: 38,
  },
});

export default Streaming;
