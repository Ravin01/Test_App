import React, {useContext, useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  Animated, 
  BackHandler,
  ActivityIndicator
} from "react-native";
import Icon from 'react-native-vector-icons/Feather';
import axiosInstance from '../../Utils/Api';
import {AuthContext} from '../../Context/AuthContext';

const SellerMuteModal = ({ sellerId, visible, onClose }) => {
  const { user } =useContext(AuthContext);
  const [mutedTypes, setMutedTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user && sellerId && visible) {
      fetchMuteSettings();
    }
  }, [user, sellerId, visible]);

  useEffect(() => {
    const backAction = () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => BackHandler.removeEventListener("hardwareBackPress", backAction);
  }, [visible]);

  const fetchMuteSettings = async () => {
    try {
      const response = await axiosInstance.get("mute-notifications/mute-settings");
      const data = response.data;
      if (data.status && data.data) {
        const sellerMute = data.data.mutedSellers.find((s) => s.sellerId === sellerId);
        setMutedTypes(sellerMute ? sellerMute.mutedTypes : []);
      }
    } catch (error) {
      console.error("Error fetching mute settings:", error);
    }
  };

  const updateMuteSettings = async (newMutedTypes) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post("mute-notifications/mute-settings", {
        sellerId,
        mutedTypes: newMutedTypes,
      });
      if (response.data.status) setMutedTypes(newMutedTypes);
    } catch (error) {
      console.error("Error updating mute settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const allMuted = mutedTypes.length === 3;
  const someMuted = mutedTypes.length > 0 && mutedTypes.length < 3;

  const toggleAllNotifications = () => {
    const allTypes = ["new_video", "new_product", "live_stream_start"];
    const newMutedTypes = mutedTypes.length === allTypes.length ? [] : allTypes;
    updateMuteSettings(newMutedTypes);
  };

  const toggleNotificationType = (type) => {
    const newMutedTypes = mutedTypes.includes(type)
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type];
    updateMuteSettings(newMutedTypes);
  };

  const notificationTypes = [
    { id: "new_video", label: "New Videos", icon: "video" },
    { id: "new_product", label: "New Products", icon: "package" },
    { id: "live_stream_start", label: "Live Stream", icon: "radio" },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, allMuted ? styles.redBg : styles.yellowBg]}>
                <Icon name={allMuted ? "volume-x" : "volume-2"} size={20} color={allMuted ? "red" : "#ffd700"} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <Text style={styles.headerSubtitle}>Manage your notification preferences</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="x" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalBody}>
            {/* Master Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.yellowIcon}>
                  <Icon name="bell" size={20} color="#ffd700" />
                </View>
                <View>
                  <Text style={styles.toggleTitle}>All Notifications</Text>
                  <Text style={styles.toggleSubtitle}>
                    {allMuted ? "Enable all notifications" : "Disable all notifications"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitch, allMuted ? styles.switchOff : styles.switchOn]}
                onPress={toggleAllNotifications}
                disabled={loading}
              >
                <Animated.View style={[styles.switchCircle, { transform: [{ translateX: allMuted ? 0 : 22 }] }]} />
              </TouchableOpacity>
            </View>

            {/* Individual Notification Types */}
            {notificationTypes.map((type) => {
              const isEnabled = !mutedTypes.includes(type.id);
              return (
                <View key={type.id} style={[styles.toggleRow, isEnabled ? styles.enabledRow : styles.disabledRow]}>
                  <View style={styles.toggleLeft}>
                    <View style={[styles.iconContainer, isEnabled ? styles.greenBg : styles.grayBg]}>
                      <Icon name={type.icon} size={20} color={isEnabled ? "green" : "gray"} />
                    </View>
                    <View>
                      <Text style={[styles.toggleTitle, isEnabled ? styles.enabledText : styles.disabledText]}>
                        {type.label}
                      </Text>
                      <Text style={styles.toggleSubtitle}>{type.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, isEnabled ? styles.switchOn : styles.switchOff]}
                    onPress={() => toggleNotificationType(type.id)}
                    disabled={loading}
                  >
                    <Animated.View style={[styles.switchCircle, { transform: [{ translateX: isEnabled ? 22 : 0 }] }]} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>Changes are saved automatically</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", backgroundColor: '#1B1B1B', borderRadius: 20, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#333", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  iconContainer: { padding: 8, borderRadius: 8, marginRight: 8 },
  redBg: { backgroundColor: "rgba(255,0,0,0.2)" },
  yellowBg: { backgroundColor: "rgba(255,255,0,0.2)" },
  headerTitle: { color: "#ffd700", fontWeight: "bold" },
  headerSubtitle: { color: "white", fontSize: 12 },
  modalBody: { padding: 16 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#333" },
  toggleLeft: { flexDirection: "row", alignItems: "center" },
  yellowIcon: { padding: 8, borderRadius: 8, backgroundColor: "rgba(255,255,0,0.2)", marginRight: 8 },
  toggleTitle: { color: "white", fontWeight: "bold" },
  toggleSubtitle: { color: "gray", fontSize: 12 },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, justifyContent: "center", padding: 2 },
  switchOn: { backgroundColor: "#ffd700" },
  switchOff: { backgroundColor: "gray" },
  switchCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: "white" },
  enabledRow: { backgroundColor: "rgba(255, 215, 0, 0.)"
   // "rgba(0,255,0,0.1)"
 },
  disabledRow: { backgroundColor: "rgba(128,128,128,0.1)" },
  greenBg: { backgroundColor:  "rgba(0,255,0,0.2)" },
  grayBg: { backgroundColor: "rgba(128,128,128,0.2)" },
  enabledText: { color: "white" },
  disabledText: { color: "gray" },
  modalFooter: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: "#333" },
  footerText: { color: "gray" },
  doneButton: { backgroundColor: "gold", padding: 8,paddingHorizontal : 16,  borderRadius: 12 },
  doneText: { color: "black", fontWeight: "bold" },
});

export default SellerMuteModal;
