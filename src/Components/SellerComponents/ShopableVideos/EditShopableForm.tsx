import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ToastAndroid,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from '../../../Utils/Api';
import ShopableForm from "./ShopableForm";

import Icon from "react-native-vector-icons/MaterialIcons"; // For "error-outline" and "refresh"
import FontAwesome from "react-native-vector-icons/FontAwesome"; // For "video-camera"

const EditShopableForm = ({navigation}) => {
  // const navigation = useNavigation();
  const route = useRoute();
  const { videoId } = route.params;

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await api.get(`/shoppable-videos/${videoId}`);
      if (response.data.status) {
        setInitialData({
          ...response.data.data,
          productsListed: response.data.data.productsListed,  //.map((p) => p._id),
        });
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Error fetching video data:", err);
      ToastAndroid.show("Failed to load video data", ToastAndroid.SHORT);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  const handleSubmit = async (formData) => {
    try {
      const response = await api.put(`/shoppable-videos/${videoId}`, formData);
      if (response.status === 200) {
        ToastAndroid.show("Video updated successfully", ToastAndroid.SHORT);
      //  navigation.navigate("ViewVideo", { videoId });
    navigation.goBack();
      }
    } catch (err) {
      console.error("Update failed:", err);
      ToastAndroid.show(
        err.response?.data?.message || "Failed to update video",
        ToastAndroid.SHORT
      );
    }
  };

  const handleRetry = () => {
    fetchVideoData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading Video Data...</Text>
      </View>
    );
  }

  if (!initialData || error) {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <View style={styles.iconWrapper}>
          <FontAwesome name="video-camera" size={64} color="#e74c3c" />
          <Icon
            name="error-outline"
            size={28}
            color="#e67e22"
            style={styles.errorOverlayIcon}
          />
        </View>
        <Text style={styles.errorTitle}>Video Not Found</Text>
        <Text style={styles.errorDescription}>
          Sorry, we couldn't find the video you're looking for. It may have been removed, renamed, or is temporarily unavailable.
        </Text>

        <TouchableOpacity onPress={handleRetry} style={styles.primaryButton}>
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ShopableForm
      initialData={initialData}
      onSubmit={handleSubmit}
      isEditMode={true}
    goBack= {()=>navigation.goBack()}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#121212",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#eee",
  },
  iconWrapper: {
    marginBottom: 20,
    position: "relative",
  },
  errorOverlayIcon: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E90FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#333",
  },
});

export default EditShopableForm;
