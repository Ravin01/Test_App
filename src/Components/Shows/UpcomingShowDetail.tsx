import React, { useEffect, useState , useContext, useCallback} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useNavigation, useRoute } from "@react-navigation/native";
import axiosInstance from "../../Utils/Api";
import {AuthContext} from '../../Context/AuthContext';
import {AWS_CDN_URL} from '../../Utils/aws';
import {colors} from '../../Utils/Colors';

// Helpers
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return "https://via.placeholder.com/300x200";
  if (imagePath.startsWith("http")) return imagePath;
  // console.log(`Image path : ${AWS_CDN_URL}${imagePath}`);
  return `${AWS_CDN_URL}${imagePath}`;
};

const getInitials = (username) => {

  console.log('Username:', username);
  if (!username) return "U";
  return username.substring(0, 2).toUpperCase();
};

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(price);
};

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

// Product Card
const ProductCard = ({ product, type }) => {
  // console.log('product', product);
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: getFullImageUrl(product.productId?.images?.[0]?.key) }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.badgeWrapper}>
        <Text
          style={[
            styles.badge,
            type === "auction" && styles.badgeAuction,
            type === "buyNow" && styles.badgeBuyNow,
            type === "giveaway" && styles.badgeGiveaway,
          ]}
        >
          {type === "auction"
            ? "Auction"
            : type === "buyNow"
            ? "Buy Now"
            : "Giveaway"}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{product.productId?.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}
   ellipsizeMode="tail">{product.productId?.description}</Text>

        {type === "auction" && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>Starting Price:</Text>
              <Text style={styles.cardPrice}>{formatPrice(product.startingPrice)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>Reserved Price:</Text>
              <Text style={styles.cardValue}>{formatPrice(product.reservedPrice)}</Text>
            </View>
            {/* <View style={styles.rowBetween}>
              <Text style={styles.cardLabel}>Increment:</Text>
              <Text style={styles.cardValue}>{formatPrice(product.increment)}</Text>
            </View> */}
            {product.currentHighestBid > 0 && (
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>Current Bid:</Text>
                <Text style={styles.cardCurrentBid}>{formatPrice(product.currentHighestBid)}</Text>
              </View>
            )}
          </>
        )}

        {type === "buyNow" && (
          <View style={styles.rowBetween}>
            <Text style={styles.cardLabel}>Price:</Text>
            <Text style={styles.cardPrice}>{formatPrice(product.productPrice)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Upcoming Show
const UpcomingShow = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {user}: any = useContext(AuthContext);
  const { id, hostId } = route.params;

  //console.log('user:========', user?.sellerInfo?._id, hostId);

  const isHost = hostId === user?.sellerInfo?._id;

  //console.log(isHost);

  const [showData, setShowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // console.log('show data:', showData);

  // Registrations modal state
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);

  useEffect(() => {
    fetchShowData();
    fetchRegistrations();
    if (user) checkRegistrationStatus();
  }, [id, user]);

  const fetchShowData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/shows/get/live/${id}`);
      if (res.data && res.data._id) {
        setShowData(res.data);
        if (res.data.isLive || res.data.showStatus === "live") {
          // navigation.replace("LiveShow", { id });
        }
      }
    } catch (err) {
      setError("Failed to load show data");
    } finally {
      setLoading(false);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const res = await axiosInstance.get(
        `/register-show/${id}/check-registration`
      );
      if (res.data.status) setIsRegistered(res.data.data.isRegistered);
    } catch (err) {
      console.log(err);
    }
  };

  // --- Fetch registrations and open modal ---
  const fetchRegistrations = async (openModal = false) => {
    setLoadingRegistrations(true);
    try {
      const res = await axiosInstance.get(
        `/register-show/${id}/registrations`
      );
      if (res.data.status) {
        setRegisteredUsers(res.data.data.registrations || []);
        setRegistrationCount(res.data.data.totalRegistrations || 0);
        if (openModal) setRegistrationModalOpen(true);
      }
    } catch (err) {
      console.log("Error fetching registrations", err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

const formatRegisterCount = useCallback(count => {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (count >= 100000) {
      return (count / 100000).toFixed(1).replace('.0', '') + 'L';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return count.toString();
  }, []);


  const handleRegistration = async () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    if (isRegistering) return;
    setIsRegistering(true);
    try {
      if (!isRegistered) {
        const res = await axiosInstance.post(`register-show/${id}/register`);
        if (res.data.status) setIsRegistered(true);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primaryButtonColor} />
        <Text style={styles.loadingText}>Loading show details...</Text>
      </View>
    );
  }

  
    if (error || !showData)
        return (
            <View style={styles.centered}>
                <Icon name="alert-circle" size={50} color="#CF6679" />
                <Text style={styles.errorText}>Failed to load show details.</Text>
                <Text style={styles.errorSubText}>{error || "Show not found"}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );

  const scheduledDateTime = formatDateTime(showData.scheduledAt);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <Image
          source={{ uri: getFullImageUrl(showData.thumbnailImage) }}
          style={styles.headerImage}
        />
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <View>
            {/* <Text style={styles.badgeUpcoming}>Upcoming</Text> */}
            <View style={styles.rowBetweenHeader}>
              <View style={styles.row}>
                <Icon name="calendar" size={16} color="#fff" />
                <Text style={styles.headerInfo}>{scheduledDateTime.date}</Text>
                <Icon name="clock" size={16} color="#fff" />
                <Text style={styles.headerInfo}>{scheduledDateTime.time}</Text>
              </View>

              {/* Registration Count Button */}
              <TouchableOpacity
                onPress={()=>fetchRegistrations(true)}
               // disabled={loadingRegistrations}
                style={styles.regCountBtn}
                disabled={!isHost}
              >
                {loadingRegistrations ? (
                  <ActivityIndicator size="small" color={colors.primaryButtonColor} />
                ) : (
                  <View style={styles.row}>
                    <Icon name="users" size={16} color="#fff" />
                    <Text style={styles.regCountText}>
                      {formatRegisterCount(registrationCount)} Registered
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle} numberOfLines={2}
   ellipsizeMode="tail">{showData.title}</Text>

            {/* Host */}
            <View style={styles.row}>
              {showData.host?.userInfo?.profileURL?.key ? (
                <Image
                  source={{
                    uri: getFullImageUrl(
                      showData.host.userInfo.profileURL.key
                    ),
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {getInitials(showData.host?.userInfo?.userName)}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.hostName}>
                  {showData.host?.userInfo?.name ||
                    showData.host?.userInfo?.userName || 'Anonymous'}
                </Text>
                <Text style={styles.hostMeta}>
                  {showData.host?.companyName} • {showData.host?.sellerType || 'seller'}
                </Text>
              </View>
            </View>
          </View>

          {/* Register Button */}
          {user && (
            <TouchableOpacity
              style={[
                styles.registerBtn,
                { backgroundColor: isRegistered ? "#2ecc71" : "#f7ce45" },
              ]}
              disabled={isRegistering}
              onPress={handleRegistration}
            >
              <Text
                style={[
                  styles.registerText,
                  { color: isRegistered ? "#fff" : "#000" },
                ]}
              >
                {isRegistering
                  ? "Processing..."
                  : isRegistered
                  ? "✓ Registered"
                  : "Register"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* No Products Fallback */}
      {(!showData.auctionProducts || showData.auctionProducts.length === 0) &&
       (!showData.buyNowProducts || showData.buyNowProducts.length === 0) &&
       (!showData.giveawayProducts || showData.giveawayProducts.length === 0) && (
        <View style={styles.noProductsContainer}>
          <View style={styles.noProductsIconWrapper}>
            <Icon name="shopping-bag" size={48} color="#f7ce45" />
          </View>
          <Text style={styles.noProductsTitle}>No Products Yet</Text>
          <Text style={styles.noProductsText}>
            No products have been added to this show yet.
          </Text>
          <Text style={styles.noProductsSubText}>
            Check back later for exciting deals!
          </Text>
        </View>
      )}

      {/* Products */}
      {showData.auctionProducts?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auction Products</Text>
          {showData.auctionProducts.map((p, i) => (
            <ProductCard key={i} product={p} type="auction" />
          ))}
        </View>
      )}

      {showData.buyNowProducts?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buy Now Products</Text>
          {showData.buyNowProducts.map((p, i) => (
            <ProductCard key={i} product={p} type="buyNow" />
          ))}
        </View>
      )}

      {showData.giveawayProducts?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giveaway Products</Text>
          {showData.giveawayProducts.map((p, i) => (
            <ProductCard key={i} product={p} type="giveaway" />
          ))}
        </View>
      )}

      {/* Registration Modal */}
      <Modal
        visible={registrationModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRegistrationModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.row}>
                <View style={styles.modalIconWrap}>
                  <Icon name="users" size={20} color="#f7ce45" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Show Registrations</Text>
                  <Text style={styles.modalSub}>
                    {registeredUsers.length} users registered for this show
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setRegistrationModalOpen(false)}
                style={styles.modalClose}
              >
                <Icon name="x" size={20} color="#eee" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.modalBody}>
              {loadingRegistrations ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" />
                  <Text style={{ color: "#fff", marginTop: 10 }}>
                    Loading registrations...
                  </Text>
                </View>
              ) : registeredUsers.length === 0 ? (
                <View style={styles.centered}>
                  <View style={styles.emptyIconWrap}>
                    <Icon name="users" size={36} color="#ddd" />
                  </View>
                  <Text style={styles.emptyTitle}>No Registrations Yet</Text>
                  <Text style={styles.emptySub}>
                    Be the first to register and don't miss out on this amazing
                    show!
                  </Text>
                </View>
              ) : (
                <ScrollView>
                  {registeredUsers.map((registration) => (
                    <View key={registration._id} style={styles.userCard}>
                      <View style={styles.row}>
                        {registration.userId?.profileURL?.key ? (
                          <Image
                            source={{
                              uri: getFullImageUrl(
                                registration.userId.profileURL.key
                              ),
                            }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View style={styles.userAvatarPlaceholder}>
                            <Text style={styles.userAvatarText}>
                              {registration.userId?.name?.charAt(0)?.toUpperCase() ||
                                "U"}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName}>
                            {registration.userId?.name || "Unknown user"}
                          </Text>
                          {!!registration.userId?.email && (
                            <Text style={styles.userMeta}>
                              {registration.userId.email}
                            </Text>
                          )}
                          {!!registration.userId?.phone && (
                            <Text style={styles.userMeta}>
                              📱 {registration.userId.phone}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.statusPill}>REGISTERED</Text>
                          <Text style={styles.userMeta}>
                            {new Date(
                              registration.registeredAt
                            ).toLocaleDateString()}
                          </Text>
                          <Text style={styles.userMetaSmall}>
                            {new Date(
                              registration.registeredAt
                            ).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.row}>
                {/* <Icon name="star" size={18} color="#f7ce45" />
                <Text style={styles.footerNote}>
                  Don't miss out on this amazing show!
                </Text> */}
              </View>
              {/* <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => setRegistrationModalOpen(false)}
              >
                <Text style={styles.footerBtnText}>Close</Text>
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  headerWrapper: { position: "relative" },
  headerImage: { width: "100%", height: 220, backgroundColor:'red' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  headerContent: { position: "absolute", bottom: 10, left: 10, right: 10 },
  badgeUpcoming: { backgroundColor: "#f7ce45", color: "#000", padding: 6, borderRadius: 12, fontWeight: "bold", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetweenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerInfo: { color: "#fff", marginRight: 8, marginLeft: 6 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", marginVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#444", justifyContent: "center", alignItems: "center", marginRight: 10 },
  avatarText: { color: "#fff", fontWeight: "bold" },
  hostName: { color: "#fff", fontWeight: "600" },
  hostMeta: { color: "#aaa", fontSize: 12 },
  registerBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginTop: 10, alignSelf: "flex-start" },
  registerText: { fontWeight: "bold" },
  section: { padding: 16 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  card: { backgroundColor: "#222", borderRadius: 12, marginBottom: 12, overflow: "hidden", borderColor:'#333', borderWidth:1 },
  cardImage: { width: "100%", height: 150 },
  badgeWrapper: { position: "absolute", top: 8, left: 8 },
  badge: { color: "#fff", fontSize: 12, fontWeight: "bold", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeAuction: { backgroundColor: "#e74c3c" },
  badgeBuyNow: { backgroundColor: "#2ecc71" },
  badgeGiveaway: { backgroundColor: "#3498db" },
  cardContent: { padding: 12 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  cardDesc: { color: "#aaa", fontSize: 13, marginBottom: 8 },
  cardLabel: { color: "#ccc", fontSize: 12 },
  cardPrice: { color: "#f7ce45", fontWeight: "bold" },
  cardValue: { color: "#fff" },
  cardCurrentBid: { color: "#2ecc71", fontWeight: "bold" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111" },
  //errorText: { color: "#fff", fontSize: 18, marginBottom: 10 },
  backButton: { color: "#f7ce45", fontWeight: "bold", fontSize: 16 },
  // Reg button styles
  regCountBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.1)" },
  regCountText: { color: "#fff", marginLeft: 6 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 700, borderRadius: 16, backgroundColor: "#282828", overflow: "hidden", borderWidth: 1, borderColor: "rgba(247,206,69,0.3)" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.1)" },
  modalIconWrap: { padding: 8, borderRadius: 12, backgroundColor: "rgba(247,206,69,0.1)", marginRight: 8 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalSub: { color: "#eee", opacity: 0.8, fontSize: 12 },
  modalClose: { padding: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalBody: { padding: 16, maxHeight: 420 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 4 },
  emptySub: { color: "#ddd", textAlign: "center" },
  userCard: { padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 10 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, borderWidth: 2, borderColor: "#f7ce45" },
  userAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: "#f7ce45", justifyContent: "center", alignItems: "center" },
  userAvatarText: { color: "#111", fontWeight: "bold" },
  userName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  userMeta: { color: "#ddd", fontSize: 12 },
  userMetaSmall: { color: "#aaa", fontSize: 11 },
  statusPill: { color: "#f7ce45", fontWeight: "bold", fontSize: 10, backgroundColor: "rgba(247,206,69,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(247,206,69,0.3)", marginBottom: 6 },
  modalFooter: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerNote: { color: "#eee" },
  footerBtn: { backgroundColor: "#f7ce45", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  footerBtnText: { color: "#111", fontWeight: "bold" },

      errorText: {
    color: '#E1E1E1',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubText: {
    color: '#ccc',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
    retryButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
    loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
    loadingText: {
    color: '#E1E1E1',
    marginTop: 12,
    fontSize: 16,
  },
  // No Products styles
  noProductsContainer: {
    //flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    marginTop: '26%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247,206,69,0.2)',
  },
  noProductsIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(247,206,69,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(247,206,69,0.3)',
  },
  noProductsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  noProductsText: {
    color: '#ddd',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  noProductsSubText: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default UpcomingShow;
