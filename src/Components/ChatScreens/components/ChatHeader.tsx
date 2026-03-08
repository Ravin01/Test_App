import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { ChevronLeft, MoreVertical } from "lucide-react-native"
import LinearGradient from "react-native-linear-gradient"
import { AWS_CDN_URL } from "../../../Utils/aws"

const ChatHeader = ({ otherParticipant, userOnlineStatus, typingUsers, navigation, onOptionsPress }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <ChevronLeft size={28} color="#F7CE45" />
      </TouchableOpacity>

      <LinearGradient colors={["#FFD700", "#FCED9C", "#FAFAFA"]} style={styles.avatarGradient}>
        <TouchableOpacity
          style={styles.avatarInner}
          onPress={() =>
            navigation.navigate("ViewSellerProdile", {
              id: otherParticipant?.userId?.userName,
            })
          }
        >
          {otherParticipant?.userId?.profileURL?.key ? (
            <Image
              source={{
                uri: `${AWS_CDN_URL}${otherParticipant?.userId?.profileURL?.key}`,
              }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarInitialsContainer}>
              <Text style={styles.avatarInitials}>
                {otherParticipant?.userId?.name
                  ?.replace(/[^a-zA-Z0-9]/g, "")
                  .substring(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.headerInfo}>
        <TouchableOpacity   onPress={() =>
            navigation.navigate("ViewSellerProdile", {
              id: otherParticipant?.userId?.userName,
            })
          }><Text style={styles.headerName}>{otherParticipant?.userId?.name || "Unknown User"}</Text></TouchableOpacity>
        
        <View style={styles.statusContainer}>
          {typingUsers.length > 0 ? (
            <Text style={styles.typingText}>typing...</Text>
          ) : (
            <>
              <View
                style={[
                  styles.activeIndicator,
                  {
                    backgroundColor: userOnlineStatus === "online" ? "#22C55E" : "#999",
                  },
                ]}
              />
              <Text style={styles.headerStatus}>{userOnlineStatus === "online" ? "Online" : "Last seen recently"}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onOptionsPress}>
          <MoreVertical size={20} color="#F7CE45" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 28,
    padding: 2,
    marginLeft: 8,
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    backgroundColor: "#1A1A1A",
    padding: 1,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  avatarInitialsContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
    backgroundColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    color: "#F7CE45",
    fontSize: 18,
    fontWeight: "600",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  activeIndicator: {
    backgroundColor: "#22C55E",
    borderRadius: 4,
    height: 8,
    width: 8,
    marginRight: 6,
  },
  headerStatus: {
    color: "#FFFFFF",
    fontSize: 13,
    opacity: 0.8,
  },
  typingText: {
    color: "#F7CE45",
    fontSize: 13,
    fontStyle: "italic",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
})

export default React.memo(ChatHeader)
