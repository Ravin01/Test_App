import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Shield } from "lucide-react-native"

const BlockedUserBanner = ({ blockStatus }) => {
  return (
    <View style={styles.container}>
      <Shield color="#fff" size={25} />
      <Text style={styles.text}>
        {blockStatus.blockMessage || "You have been blocked by this user. Cannot send or receive messages."}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "red",
    flexDirection: "row",
    gap: 10,
  },
  text: {
    color: "#fff",
    flex: 1,
    fontWeight: "bold",
    fontSize: 14,
  },
})

export default React.memo(BlockedUserBanner)
