import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native"
import { UserX, Flag } from "lucide-react-native"
import { Toast } from "../../../Utils/dateUtils"

const OptionsMenu = ({ visible, onClose, onBlockUser, blockStatus }) => {
  const handleReportUser = () => {
    Toast("Report feature coming soon")
    onClose()
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={onBlockUser}>
            <UserX color="red" size={18} />
            <Text style={[styles.menuItemText, { color: "red" }]}>
              {blockStatus.blockedByCurrentUser ? "Unblock User" : "Block User"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
            <Flag color="orange" size={18} />
            <Text style={[styles.menuItemText, { color: "orange" }]}>Report User</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 70,
    paddingRight: 20,
  },
  menu: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
})

export default React.memo(OptionsMenu)
