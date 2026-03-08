import React, { useEffect, useRef } from "react";
import { View, ScrollView, Animated, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const SkeletonLoader = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#2A2A2A", "#3A3A3A"],
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabRow}>
        {[...Array(4)].map((_, index) => (
          <Animated.View key={index} style={[styles.tabPlaceholder, { backgroundColor }]} />
        ))}
      </View>

      {/* Section Header - Upcoming & Live */}
      <View style={styles.sectionHeader}>
        <Animated.View style={[styles.sectionTitle, { backgroundColor }]} />
        <Animated.View style={[styles.seeAllBtn, { backgroundColor }]} />
      </View>

      {/* Live Video Cards - 3 Columns */}
      <View style={styles.liveCardContainer}>
        {[...Array(6)].map((_, index) => (
          <View key={index} style={styles.liveCard}>
            <Animated.View style={[styles.liveImage, { backgroundColor }]} />
            <Animated.View style={[styles.liveText, { backgroundColor }]} />
          </View>
        ))}
      </View>

      {/* Section Header - Shoppable Videos */}
      <View style={styles.sectionHeader}>
        <Animated.View style={[styles.sectionTitle, { backgroundColor }]} />
        <Animated.View style={[styles.shrinkBtn, { backgroundColor }]} />
      </View>

      {/* Shoppable Videos - 2 Columns */}
      <View style={styles.shoppableContainer}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={styles.shoppableCard}>
            <Animated.View style={[styles.shoppableImage, { backgroundColor }]} />
            <Animated.View style={[styles.shoppableText, { backgroundColor }]} />
          </View>
        ))}
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {[...Array(5)].map((_, index) => (
          <View key={index} style={styles.navItem}>
            <Animated.View style={[styles.navIcon, { backgroundColor }]} />
            <Animated.View style={[styles.navText, { backgroundColor }]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: "#121212",
  },

  /* Tabs */
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tabPlaceholder: {
    width: width * 0.2,
    height: 30,
    borderRadius: 15,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    width: "40%",
    height: 18,
    borderRadius: 5,
  },
  seeAllBtn: {
    width: 50,
    height: 15,
    borderRadius: 5,
  },
  shrinkBtn: {
    width: 60,
    height: 15,
    borderRadius: 5,
  },

  /* Live Cards (3 columns) */
  liveCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  liveCard: {
    width: (width - 40) / 3, // 3 columns with spacing
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#1E1E1E",
    overflow: "hidden",
  },
  liveImage: {
    width: "100%",
    height: width * 0.25,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  liveText: {
    width: "80%",
    height: 12,
    borderRadius: 5,
    margin: 6,
  },

  /* Shoppable Cards (2 columns) */
  shoppableContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  shoppableCard: {
    width: (width - 30) / 2,
    marginBottom: 15,
  },
  shoppableImage: {
    width: "100%",
    height: width * 0.4,
    borderRadius: 10,
    marginBottom: 8,
  },
  shoppableText: {
    width: "70%",
    height: 12,
    borderRadius: 5,
  },

  /* Bottom Navigation */
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
  },
  navItem: {
    alignItems: "center",
  },
  navIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  navText: {
    width: 30,
    height: 8,
    borderRadius: 4,
  },
});

export default SkeletonLoader;
