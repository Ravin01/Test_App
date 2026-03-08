import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { XCircle, FileText, Download , 
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AWS_CDN_URL} from '../../../Config';

  const generateAttachmentUrl = (filename) => {
    return `${AWS_CDN_URL}${filename}`;
  };

const TicketModal = ({ ticket, visible, onClose, viewMore }) => {
  if (!ticket) return null;

  const statusConfig = {
    Open: { color: '#3b82f6', icon: Clock },
    'In Progress': { color: '#eab308', icon: AlertCircle },
    Resolved: { color: '#22c55e', icon: CheckCircle },
    Closed: { color: '#6b7280', icon: XCircle },
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const config = statusConfig[ticket.status] || statusConfig["Open"];
  const IconComponent = config.icon;

    const StatusBadge = ({ status }) => {
      const config = statusConfig[status] || statusConfig.Open;
      const IconComponent = config.icon;
      return (
        <View style={[styles.badge, { borderColor: config.color }]}>
          <IconComponent size={14} color={config.color} />
          <Text style={[styles.badgeText, { color: config.color }]}>{status}</Text>
        </View>
      );
    };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Modal Box */}
        <View style={styles.modalBox}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: config.bgColor }]}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: config.color },
                  ]}
                >
                  <IconComponent size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.ticketId}>{ticket.ticketId}</Text>
                  <Text style={[styles.issueType]}>
                    {ticket.issueType}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <XCircle size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Details */}
            <View style={styles.section}>
              <View style={{flexDirection:'row', marginBottom: 10,alignItems:'center'}}>
              <Text style={styles.label}>Status: </Text>
              <StatusBadge status={ticket.status} />
              </View>
             
              <Text style={styles.label}>Created</Text>
              <Text style={styles.value}>{formatDate(ticket.createdAt)}</Text>

              {viewMore && ticket.raisedBy && (
                <>
                  <Text style={styles.label}>Raised By</Text>
                  <Text style={styles.value}>
                    {ticket.raisedBy.username ||
                      ticket.raisedBy.email ||
                      "Unknown User"}
                  </Text>
                </>
              )}

              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>
                {ticket.raisedByRole || "User"}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.descriptionBox}>
                <Text style={styles.value}>
                  {ticket.description}
                  </Text>
              </View>
            </View>

            {/* Context Info */}
            {(ticket.ticketPurposePage || ticket.ticketPurposeId) && (
              <View style={styles.section}>
                <Text style={styles.label}>Context Information</Text>
                <View style={styles.descriptionBox}>
                  {ticket.ticketPurposePage && (
                    <Text style={styles.contextText}>
                      Page: {ticket.ticketPurposePage}
                    </Text>
                  )}
                  {ticket.ticketPurposeId && (
                    <Text style={styles.contextText}>
                      Reference ID: {ticket.ticketPurposeId}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  Attachments ({ticket.attachments.length})
                </Text>
                {ticket.attachments.map((filename, index) => (
                  <View key={index} style={styles.attachmentBox}>
                    <View style={styles.attachmentLeft}>
                      <FileText size={16} color="#9ca3af" />
                      <Text numberOfLines={1} style={styles.attachmentText}>
                        {filename}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => 
                       Linking.openURL(generateAttachmentUrl(filename))
                      }
                      style={styles.downloadBtn}
                    >
                      <Download size={18} color="#facc15" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default TicketModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    width: "100%",
    maxHeight: "90%",
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  ticketId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f9fafb",
  },
  issueType: {
    fontSize: 14,
    color:'#ddd'
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: "#f9fafb",
    marginBottom: 12,
  },
  descriptionBox: {
    backgroundColor: "#111111",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 8,
  },
  contextText: {
    color: "#facc15",
    marginBottom: 6,
  },
  attachmentBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 8,
    justifyContent: "space-between",
  },
  attachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attachmentText: {
    color: "#f9fafb",
    marginLeft: 8,
    flexShrink: 1,
  },
  downloadBtn: {
    padding: 6,
    borderRadius: 8,
  },

    badge: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
});
