import React, { useRef, useEffect, useState } from "react";
import { View, Text, Animated, StyleSheet, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import TextTicker from "react-native-text-ticker";
import { useBatteryOptimization } from "../../hooks/useBatteryOptimization";

const Marquee = ({
   texts = [
    "🚀 Welcome to FLYKUP – India's 1st Live Commerce Platform!",
    "🛒 Shop via Live Shows, Auctions & Shoppable Videos!",
//    "💎 Tap & Take™ – Checkout in 3 Seconds!",
    "🔥 SparkChain™ Rewards – Earn & Save on Every Purchase!",
//    "📦 Dropship India™ – 10,000+ Products, Zero Inventory!",
//    "💯 Zero Commission – 100% Profit for Sellers!"
  ],
  isFocused = true
}) => {
  // 🔋 Battery optimization hook
  const { isLowPowerMode } = useBatteryOptimization();

  // 🔋 In low power mode OR when screen is not focused, show static text instead of scrolling marquee
  if (isLowPowerMode || !isFocused) {
    // if (isLowPowerMode) {
    //   console.log('🔋 [Marquee] Low Power Mode - Disabling scroll animation');
    // }
    // if (!isFocused) {
    //   console.log('👁️ [Marquee] Screen not focused - Disabling scroll animation');
    // }
    return (
      <LinearGradient
        colors={["rgba(247,206,69,0.27)", "rgba(217,45,32,0.27)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.staticContainer}>
          <Text style={styles.staticText} numberOfLines={1} ellipsizeMode="tail">
            {texts[0]}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Normal mode - show scrolling marquee
  return (
    <LinearGradient
      colors={["rgba(247,206,69,0.27)", "rgba(217,45,32,0.27)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.gradient}
    >
      <View>
       <TextTicker
            style={{ fontSize: 12, color: "white"}}
            duration={25000}
            loop
            bounce={false}
            repeatSpacer={50}
            marqueeDelay={1000}
          >
           {texts.join("        ")}
       </TextTicker>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    width: "100%",
    paddingVertical: 6,  //10,
    overflow: "hidden",
  },
  container: {
    flexDirection: "row",
   // alignItems: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 10,
  },
  staticContainer: {
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  staticText: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
});

export default Marquee;
