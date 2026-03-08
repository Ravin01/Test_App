import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Dimensions,
  Image,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import LinearGradient from "react-native-linear-gradient";
import axiosInstance from "../../Utils/Api";
import { Globe } from "lucide-react-native";
import {AWS_CDN_URL} from '../../Utils/aws';

const { width, height } = Dimensions.get("window");

const ShowsDetails = ({ route, navigation }) => {
  const  {id} = route.params;
  const [showDetails, setShowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [products,setProducts]=useState([])
  const [activeTab, setActiveTab] = useState('Buy Now');
// console.log(id)

  console.log(showDetails);
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    const fetchShowDetails = async () => {
      try {
        const response = await axiosInstance.get(`/shows/get/${id}`);
        setShowDetails(response.data.data);
        setProducts(response.data.data.buyNowProducts)
      } catch (error) {
        console.error("Error fetching show details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShowDetails();
  }, [id]);
  useEffect(() => {
    if(activeTab === 'Buy Now'){
      setProducts(showDetails?.buyNowProducts)
    }else if(activeTab === 'Auction'){
        setProducts(showDetails?.auctionProducts)
    }
    else if(activeTab === 'GiveAway'){            
        setProducts(showDetails?.giveawayProducts)
    }

  },[activeTab])


  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
        <Text style={styles.loadingText}>Loading show details...</Text>
      </View>
    );
  }
  // {console.log(showDetails)}

  if (!showDetails) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#CF6679" />
        <Text style={styles.errorText}>Failed to load show details.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { title,  scheduledAt,  tags, category,  language } = showDetails;

  // Format date and time for better display
  const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Header section with image, title and watch button
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ImageBackground
        source={{ uri: `${AWS_CDN_URL}${showDetails?.thumbnailImage}` || "https://via.placeholder.com/400x200/121212/FFFFFF?text=No+Image" }}
        style={styles.coverImage}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
      >
        <LinearGradient
          colors={['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 0.8)', '#121212']}
          style={styles.gradient}
        >
          {imageLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator size="small" color="#BB86FC" />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
      
      <TouchableOpacity style={styles.watchButton} onPress={() => navigation.navigate("LiveScreen", { stream:showDetails })}>
        <Icon name="play-circle" size={22} color="#121212" />
        <Text style={styles.watchButtonText}>Watch Stream</Text>
      </TouchableOpacity>
    </View>
  );

  // Info section with date, time and description
  const renderInfo = () => (
    <View style={styles.infoSection}>
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="calendar" size={20} color="#BB86FC" />
          <Text style={styles.infoText}>{formattedDate}</Text>
        </View>
        <View style={styles.infoItem}>
            <Globe color={'#BB86FC'} size={20}/>
          {/* <Icon name="clock" size={20} color="#BB86FC" /> */}
          <Text style={styles.infoText}>{language}</Text>
        </View>
      </View>
      
      {tags &&
      <View style={styles.tagsContainer}>
        {tags && tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>}
    </View>
  );

  // Product section
  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productItem} onPress={() => navigation.navigate("ProductDetails", { id:item.productId })}>
        {/* {console.log(item)} */}
      <Image 
        source={{ uri: `${AWS_CDN_URL}${item?.images[0]?.key}` || "https://via.placeholder.com/100" }} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.title}</Text>
        {/* <Text style={styles.descriptionTitle}>{item.description}</Text> */}
        <View style={styles.infoRow}>
        <Text style={[styles.productPrice,{textDecorationLine:'line-through',color:'#777'}]}>₹ {item.MRP}</Text>
        <Text style={styles.productPrice}>  ₹{item.reservedPrice}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={20} color="#BB86FC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item,index) => index}
        renderItem={renderProductItem}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderInfo()}
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <View style={[styles.infoRow,{alignSelf:'center',borderBottomColor:'#777',borderBottomWidth:1,paddingBottom:10}]}>

                {["Buy Now", "Auction","GiveAway"].map((tab) => {
                    return(
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{marginRight: 10}}>
                        <Text style={{color: activeTab === tab ? "#BB86FC" : "#E1E1E1", fontSize: 16, fontWeight: "bold"}}>{tab}</Text>
                        </TouchableOpacity>
                )})}
            
            </View>
          </>
        }
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyProductsContainer}>
            <Icon name="shopping-bag" size={50} color="#333" />
            <Text style={styles.emptyProductsText}>No products available</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  loadingText: {
    color: "#E1E1E1",
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 20,
  },
  errorText: {
    color: "#E1E1E1",
    fontSize: 18,
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContainer: {
    position: "relative",
  },
  coverImage: {
    width: width,
    height: height * 0.3,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: "rgba(187, 134, 252, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  categoryText: {
    color: "#BB86FC",
    fontSize: 12,
    fontWeight: "600",
  },
  watchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#BB86FC",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 16,
    elevation: 3,
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#121212",
    marginLeft: 8,
  },
  infoSection: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  infoText: {
    color: "#E1E1E1",
    fontSize: 14,
    marginLeft: 8,
    textTransform:'capitalize',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#BBBBBB",
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  tag: {
    backgroundColor: "#272727",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: "#03DAC6",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  productsList: {
    paddingBottom: 16,
  },
  productItem: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#2A2A2A",
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    // color: "#BB86FC",
    color: "green",
    fontWeight: "bold",
  },
  emptyProductsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyProductsText: {
    color: "#666",
    fontSize: 16,
    marginTop: 12,
  },
});

export default ShowsDetails;