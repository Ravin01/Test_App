import React, { useState, useTransition, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useSharedValue,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import SellerHeader from '../SellerComponents/SellerForm/Header';
// Import wallet components
import WalletBalance from './WalletComponents/WalletBalance';
import AddMoney from './WalletComponents/AddMoney';
import TransactionHistory from './WalletComponents/TransactionHistory';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface Tab {
  id: 'wallet' | 'history';
  label: string;
  icon: string;
}

interface Stat {
  icon: string;
  title: string;
  description: string;
  colors: string[];
  iconColor: string;
}

const WalletPage = () => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'history'>('wallet');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const navigation = useNavigation();

  // Animated values for background
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(90);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1.2);

  // Start background animations
  React.useEffect(() => {
    rotation1.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    rotation2.value = withRepeat(
      withTiming(450, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );
    scale1.value = withRepeat(
      withTiming(1.2, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    scale2.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const handleAddMoneySuccess = useCallback(() => {
    startTransition(() => {
      setRefreshKey(prev => prev + 1);
    });
  }, []);

  const handleTabChange = useCallback((tabId: 'wallet' | 'history') => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  }, []);

  const tabs: Tab[] = useMemo(
    () => [
      { id: 'wallet', label: 'Wallet', icon: 'wallet' },
      { id: 'history', label: 'History', icon: 'history' },
    ],
    []
  );

  const stats: Stat[] = useMemo(
    () => [
      {
        icon: 'shield-check',
        title: 'Secure',
        description: 'Bank-grade encryption',
        colors: [
          '#10b98133',
          //'#059669', 
          '#059669'],
        iconColor: '#34d399',
      },
      {
        icon: 'lightning-bolt',
        title: 'Instant',
        description: 'Lightning-fast transactions',
        colors: ['#f59e0b33', '#d97706'],
        iconColor: '#fbbf24',
      },
      {
        icon: 'trophy',
        title: 'Reliable',
        description: '24/7 support available',
        colors: ['#3b82f633', '#2563eb'],
        iconColor: '#60a5fa',
      },
    ],
    []
  );

  // Animated background styles
  const animatedBg1Style = useAnimatedStyle(() => {
    'worklet';
    const rotateValue = `${rotation1.value}deg`;
    const scaleValue = scale1.value;
    return {
      transform: [{ rotate: rotateValue }, { scale: scaleValue }],
    };
  });

  const animatedBg2Style = useAnimatedStyle(() => {
    'worklet';
    const rotateValue = `${rotation2.value}deg`;
    const scaleValue = scale2.value;
    return {
      transform: [{ rotate: rotateValue }, { scale: scaleValue }],
    };
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <SellerHeader navigation={navigation} message={'Wallet'} />
      {/* <LinearGradient
        colors={['#1a1a1a', '#2a2a2a', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.bgAnimationContainer}>
          <Animated.View style={[styles.bgCircle1, animatedBg1Style]} />
          <Animated.View style={[styles.bgCircle2, animatedBg2Style]} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.walletIconContainer}
            >
              <FontAwesome6 name="wallet" size={24} color="#000" />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>My Wallet</Text>
              <Text style={styles.headerSubtitle}>
                Manage your balance and transactions
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient> */}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <LinearGradient
        colors={['#1a1a1a80', '#2a2a2a80']}
        style={styles.tabsGradient}
      >
        <View style={styles.tabsRow}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.7}
                style={styles.tabButton}
              >
                {isActive && (
                  <LinearGradient
                    colors={['#FFD700', '#FFA500', '#FFD700']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activeTabBackground}
                  />
                )}
                <Icon
                  name={tab.icon}
                  size={18}
                  color={isActive ? '#000' : '#999'}
                  style={styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );

  const renderStatCard = ({ item, index }: { item: Stat; index: number }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.statCard}>
      <LinearGradient
        colors={item.colors}
        style={styles.statCardGradient}
      >
        <View style={styles.statIconContainer}>
          <Icon name={item.icon} size={24} color={item.iconColor} />
        </View>
        <Text style={styles.statTitle}>{item.title}</Text>
        <Text style={styles.statDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderWalletContent = () => (
    <View style={styles.contentContainer}>
      {/* Balance and Add Money - Stacked Vertically for Mobile */}
      <View style={styles.walletSection}>
        <WalletBalance key={refreshKey} />
      </View>
      
      <View style={styles.addMoneySection}>
        <AddMoney onSuccess={handleAddMoneySuccess} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <FlatList
          data={stats}
          renderItem={renderStatCard}
          keyExtractor={(item, index) => `stat-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsListContent}
          snapToInterval={width * 0.75}
          decelerationRate="fast"
        />
      </View>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'wallet') {
      return renderWalletContent();
    }
    return (
      <View style={styles.contentContainer}>
        <TransactionHistory />
      </View>
    );
  };

  // FlatList data - using single item to wrap content
  const listData = useMemo(() => [{ key: 'content' }], []);

  const renderItem = useCallback(() => renderContent(), [activeTab, refreshKey]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
        style={styles.mainGradient}
      >
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={item => item.key}
          ListHeaderComponent={
            <>
              {renderHeader()}
              {renderTabs()}
            </>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          bounces={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={5}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#0a0a0a',
  },
  mainGradient: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  headerContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  bgAnimationContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFD70030',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFD70020',
  },
  headerContent: {
    zIndex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabsGradient: {
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  tabIcon: {
    zIndex: 1,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  activeTabLabel: {
    color: '#000',
  },
  inactiveTabLabel: {
    color: '#999',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  walletSection: {
    marginBottom: 12,
  },
  addMoneySection: {
    marginBottom: 16,
  },
  statsSection: {
    marginTop: 8,
    marginBottom:80
  },
  statsListContent: {
    paddingRight: 16,
  },
  statCard: {
    width: width * 0.72,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a1a1a80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  statTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    color: '#ddd', //'#999',
    textAlign: 'center',
  },
});

export default WalletPage;
