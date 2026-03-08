import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, View, StyleSheet, FlatList, Text, TouchableOpacity } from "react-native";

const RegionalSection = ({ regions = [], fetchSellersByCity, onLoadCities }) => {
  const [activeRegion, setActiveRegion] = useState(regions[0] || "");
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    fetchSellersByCity(activeRegion?.city);
  }, [activeRegion, fetchSellersByCity]);

  const handleScroll = useCallback((event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isEnd = layoutMeasurement.width + contentOffset.x >= contentSize.width - 10;
    setIsAtEnd(isEnd);
  }, []);

  //if (!regions.length) return null;

  return (
  <View style={styles.regionalSection}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitleText}>🌍 Regional Specials</Text>
      </View>
      <Text style={styles.seeMore}>{isAtEnd ? "← back   " : "Scroll →"}</Text>
    </View>

    {regions.length > 0 ? (
      <FlatList
        data={regions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item?.city || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.regionTab,
              activeRegion === item && styles.regionTabActive,
            ]}
            onPress={() => {
              setActiveRegion(item);
            }}
          >
            <Text
              style={[
                styles.regionTabText,
                activeRegion === item && styles.regionTabTextActive,
              ]}
            >
              {item?.city}
            </Text>
          </TouchableOpacity>
        )}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    ) : onLoadCities ? (   // ✅ removed extra { }
      <View style={{ marginVertical: 16, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={{ color: "#888", marginTop: 6, fontSize: 12 }}>
          Loading cities...
        </Text>
      </View>
    ) : (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ color: "#888", marginVertical: 20 }}>
          No cities found
        </Text>
      </View>
    )}
  </View>
);
};

const styles = StyleSheet.create({
  regionalSection: {
    backgroundColor: "rgba(255,215,0,0.05)",
    padding: 10,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  regionTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  regionTabActive: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderColor: "#FFD700",
  },
  regionTabText: {
    fontSize: 10,
    // fontWeight: "700",
    color: "#fff",
    textTransform:'capitalize'
  },
  regionTabTextActive: {
    color: "#FFD700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  seeMore: {
    fontSize: 11,
    color: "#FFD700",
    fontWeight: "600",
  },
});

export default RegionalSection;
