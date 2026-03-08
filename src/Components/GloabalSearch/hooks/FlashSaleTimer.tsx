import React from "react";
import { View, Text, StyleSheet } from "react-native";
import useFlashSaleTimer from "../../SellerProfile/useFlashSaleTimer";


/**
 * FlashSaleTimer Component
 * Displays a countdown timer for flash sales
 * @param {string} endsAt - ISO timestamp when flash sale ends
 */
const FlashSaleTimer = ({ endsAt }) => {
  const { days, hours, minutes, seconds, isExpired }:any = useFlashSaleTimer(endsAt);

  if (isExpired) {
    return (
      <View style={styles.container}>
        <Text style={styles.expiredText}>Flash Sale Ended</Text>
      </View>
    );
  }

  return (
    <View style={styles.timerContainer}>
      {days > 0 && (
        <>
          <View style={styles.timeBlock}>
            <Text style={styles.timeValue}>{days}</Text>
            <Text style={styles.timeLabel}>D</Text>
          </View>
          <Text style={styles.separator}>:</Text>
        </>
      )}
      
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{String(hours).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>H</Text>
      </View>
      <Text style={styles.separator}>:</Text>
      
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{String(minutes).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>M</Text>
      </View>
      <Text style={styles.separator}>:</Text>
      
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{String(seconds).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>S</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  expiredText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  timeBlock: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  separator: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginHorizontal: 4,
  },
});

export default FlashSaleTimer;