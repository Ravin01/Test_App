import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { X, Upload, Ticket, Send, FileText, Image as ImageIcon } from 'lucide-react-native';
import axiosInstance from '../../Utils/Api';
import { AuthContext } from '../../Context/AuthContext';
import { uploadImageToS3 } from '../../Utils/aws';
import { CREATE_TICKET } from '../../../Config';
import { Toast } from '../../Utils/dateUtils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';

const TicketFormModal = ({
  visible,
  onClose,
  ticketPurposeId = '',
  ticketPurposePage = '',
  userRole = 'User',
  onTicketCreated = null,
}) => {
  const [formData, setFormData] = useState({
    issueType: '',
    description: '',
    attachments: [],
  });
  const isUploading = formData.attachments.some((att) => att.uploading);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    issueType?: string;
    description?: string;
    attachments?: string;
  }>({});
  const { user }: any = useContext(AuthContext);
  const [isFocusedDropdown, setIsFocusedDropdown] = useState(false);

  const issueTypes = [
    { label: 'Technical Issue', value: 'Technical Issue', icon: 'bug-report' },
    { label: 'Payment Problem', value: 'Payment Problem', icon: 'payment' },
    { label: 'Account Issue', value: 'Account Issue', icon: 'account-circle' },
    { label: 'Product Related', value: 'Product Related', icon: 'shopping-bag' },
    { label: 'Shipping/Delivery', value: 'Shipping/Delivery', icon: 'local-shipping' },
    { label: 'Refund Request', value: 'Refund Request', icon: 'money-off' },
    { label: 'General Inquiry', value: 'General Inquiry', icon: 'help-outline' },
    { label: 'Bug Report', value: 'Bug Report', icon: 'bug-report' },
    { label: 'Feature Request', value: 'Feature Request', icon: 'lightbulb-outline' },
    { label: 'Other', value: 'Other', icon: 'more-horiz' },
  ];

  // Helper functions for file type detection
  const isImageFile = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    return imageExtensions.includes(extension);
  };

  const isPDFFile = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    return extension === 'pdf';
  };

  const getFileExtension = (fileName) => {
    return fileName?.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const handleFileUpload = async () => {
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024;

      const pickerOptions = {
        type: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/pdf',
          'application/msword',
          'text/plain',
        ],
        copyTo: 'cachesDirectory' as const,
        allowMultiSelection: false,
        presentationStyle: 'pageSheet' as const,
      };

      const results = await DocumentPicker.pick(pickerOptions);

      const validFiles = results.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          Toast(`File too large (max 10MB): ${file.name}`);
          return false;
        }
        return true;
      });

      if (!validFiles || !Array.isArray(validFiles) || validFiles.length === 0) {
        Toast('No valid files selected');
        return;
      }

      const newAttachments = validFiles.map((file) => ({
        file,
        key: null,
        uploading: true,
        uploaded: false,
        error: null,
      }));

      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments],
      }));

      for (let i = 0; i < results.length; i++) {
        const file = results[i];
        const attachmentIndex = formData.attachments.length + i;

        try {
          // For React Native file picker, we need to handle the URI properly
          // The file.uri might be a content:// URI, we need to extract the actual file path
          let filePath = file.uri;
          
          // If it's a content URI or document URI, use the fileCopy path if available
          if (file.fileCopyUri) {
            filePath = file.fileCopyUri;
          }
          
          const key = await uploadImageToS3(filePath, 'support-tickets');
          setFormData((prev) => ({
            ...prev,
            attachments: prev.attachments.map((att, idx) =>
              idx === attachmentIndex
                ? { ...att, key, uploading: false, uploaded: true }
                : att
            ),
          }));
        } catch (err) {
          console.error('Upload error:', err);
          Toast(`Failed to upload ${file.name}: ${err.message}`);
          setFormData((prev) => ({
            ...prev,
            attachments: prev.attachments.map((att, idx) =>
              idx === attachmentIndex
                ? { ...att, uploading: false, uploaded: false, error: err.message }
                : att
            ),
          }));
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('File picker error:', err);
        Toast('Error selecting file');
      }
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors: {
      issueType?: string;
      description?: string;
      attachments?: string;
    } = {};
    if (!user || !user._id) {
      Toast('Please log in to create a support ticket');
      return false;
    }
    if (!formData.issueType.trim()) newErrors.issueType = 'Issue type is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.description.trim().length < 10)
      newErrors.description = 'Description must be at least 10 characters';
    if (formData.attachments.some((att) => att.uploading))
      newErrors.attachments = 'Please wait for uploads to finish';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const capitalizeRole = (role) =>
        role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User';

      const submitData = {
        raisedBy: user._id,
        raisedByRole: capitalizeRole(user.role),
        ticketPurposeId: ticketPurposeId || 'general',
        ticketPurposePage: ticketPurposePage || 'mobile-app',
        issueType: formData.issueType,
        description: formData.description,
        attachments: formData.attachments
          .filter((att) => att.uploaded && att.key)
          .map((att) => att.key),
        lastUpdatedBy: user._id,
        lastUpdatedByRole: capitalizeRole(user.role),
      };

      //console.log('Submitting ticket data:', submitData);

      const response = await axiosInstance.post(CREATE_TICKET, submitData);
      if (response.status === 201) {
        Toast(`Ticket ${response.data.ticketId} created successfully!`);

        if (onTicketCreated) onTicketCreated();
        handleClose();
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      Toast('Failed to create ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ issueType: '', description: '', attachments: [] });
      setErrors({});
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ticket size={22} color="#facc15" />
              </View>
              <Text style={styles.headerText}>Raise Support Ticket</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={styles.closeButton}
            >
              <X size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* User Info Card */}
            <View style={styles.userCard}>
              <View style={styles.userIconContainer}>
                <Icon name="person" size={28} color="#ccc" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name || user.email}</Text>
                <Text style={styles.userRole}>
                  Creating as: <Text style={styles.roleHighlight}>{user.role || 'User'}</Text>
                </Text>
              </View>
            </View>

            {/* Issue Type Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Issue Type <Text style={styles.required}>*</Text>
              </Text>
              <Dropdown
                style={[
                  styles.dropdown,
                  isFocusedDropdown && styles.dropdownFocused,
                  errors.issueType && styles.dropdownError,
                ]}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconStyle={styles.iconStyle}
                containerStyle={styles.dropdownContainer}
                itemContainerStyle={styles.dropdownItemContainer}
                itemTextStyle={styles.dropdownItemText}
                activeColor='#333'
                data={issueTypes}
                search
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder={!isFocusedDropdown ? 'Select issue type...' : '...'}
                searchPlaceholder="Search issue type..."
                value={formData.issueType}
                onFocus={() => setIsFocusedDropdown(true)}
                onBlur={() => setIsFocusedDropdown(false)}
                onChange={(item) => {
                  setFormData((prev) => ({ ...prev, issueType: item.value }));
                  setIsFocusedDropdown(false);
                }}
                renderLeftIcon={() => (
                  <Icon
                    name="category"
                    size={20}
                    color={isFocusedDropdown ? '#facc15' : '#6b7280'}
                    style={styles.dropdownIcon}
                  />
                )}
                renderItem={(item) => (
                  <View style={styles.dropdownItem}>
                    <Icon name={item.icon} size={20} color="#9ca3af" />
                    <Text style={styles.dropdownItemLabel}>{item.label}</Text>
                  </View>
                )}
              />
              {errors.issueType && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.issueType}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.textareaContainer, errors.description && styles.textareaError]}>
                <TextInput
                  style={styles.textarea}
                  multiline
                  numberOfLines={6}
                  maxLength={500}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, description: text }))
                  }
                  placeholder="Please describe your issue in detail..."
                  placeholderTextColor="#6b7280"
                  editable={!isSubmitting}
                />
                <View style={styles.charCount}>
                  <Text style={styles.charCountText}>
                    {formData.description.length}/500
                  </Text>
                </View>
              </View>
              {errors.description && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.description}</Text>
                </View>
              )}
            </View>

            {/* Attachments */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Attachments (Optional)</Text>
              <Text style={styles.subLabel}>Max 10MB • Images, PDF, DOC, TXT</Text>

              <TouchableOpacity
                style={[
                  styles.uploadBox,
                  (isUploading || isSubmitting) && styles.uploadBoxDisabled,
                ]}
                onPress={handleFileUpload}
                disabled={isUploading || isSubmitting}
              >
                <View style={styles.uploadIcon}>
                  <Upload size={24} color="#facc15" />
                </View>
                <Text style={styles.uploadText}>Tap to select files</Text>
                <Text style={styles.uploadSubText}>or drag and drop</Text>
              </TouchableOpacity>

              {formData.attachments.length > 0 && (
                <View style={styles.attachmentsGrid}>
                  {formData.attachments.map((att, index) => (
                    <View key={index} style={styles.attachmentCard}>
                      {/* Preview Container */}
                      <View style={styles.previewContainer}>
                        {isImageFile(att.file.name) ? (
                          // Image Preview
                          <Image
                            source={{ uri: att.file.uri }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                        ) : isPDFFile(att.file.name) ? (
                          // PDF Preview
                          <View style={[styles.fileTypePreview, styles.pdfPreview]}>
                            <FileText size={32} color="#ef4444" />
                            <Text style={styles.fileTypeLabel}>PDF</Text>
                          </View>
                        ) : (
                          // Other File Types Preview
                          <View style={[styles.fileTypePreview, styles.otherFilePreview]}>
                            <FileText size={32} color="#9ca3af" />
                            <Text style={styles.fileTypeLabel}>
                              {getFileExtension(att.file.name)}
                            </Text>
                          </View>
                        )}

                        {/* Upload Status Overlay */}
                        {att.uploading && (
                          <View style={styles.uploadOverlay}>
                            <ActivityIndicator size="large" color="#facc15" />
                            <Text style={styles.uploadingText}>Uploading...</Text>
                          </View>
                        )}

                        {/* Success Indicator */}
                        {att.uploaded && (
                          <View style={styles.successBadge}>
                            <Icon name="check-circle" size={16} color="#fff" />
                          </View>
                        )}

                        {/* Error Overlay */}
                        {att.error && (
                          <View style={styles.errorOverlay}>
                            <Icon name="error" size={28} color="#ef4444" />
                            <Text style={styles.errorOverlayText}>Failed</Text>
                          </View>
                        )}

                        {/* Remove Button */}
                        <TouchableOpacity
                          onPress={() => removeAttachment(index)}
                          disabled={isSubmitting || att.uploading}
                          style={[
                            styles.removeButtonOverlay,
                            (isSubmitting || att.uploading) && styles.removeButtonDisabled,
                          ]}
                        >
                          <X size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      {/* File Info Footer */}
                      <View style={styles.fileInfoFooter}>
                        <Text style={styles.fileNameText} numberOfLines={1}>
                          {att.file.name}
                        </Text>
                        <Text style={styles.fileSizeText}>
                          {(att.file.size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {errors.attachments && (
                <View style={styles.errorContainer}>
                  <Icon name="error-outline" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.attachments}</Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (isSubmitting || isUploading) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Send size={18} color="#000" />
                  <Text style={styles.submitBtnText}>Create Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
    backgroundColor: '#111',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f1f1f',
  },
  userIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  userRole: {
    color: '#9ca3af',
    fontSize: 13,
  },
  roleHighlight: {
    color: '#facc15',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  required: {
    color: '#ef4444',
  },
  subLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -4,
  },
  dropdown: {
    height: 52,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dropdownFocused: {
    borderColor: '#facc15',
    borderWidth: 1.5,
  },
  dropdownError: {
    borderColor: '#ef4444',
  },
  dropdownContainer: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginTop: 4,
  },
  dropdownItemContainer: {
    backgroundColor: '#111',
  },
  dropdownItemText: {
    color: '#e5e7eb',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  inputSearchStyle: {
    height: 44,
    fontSize: 14,
    // backgroundColor: '#0a0a0a',
    color: '#fff',
    borderRadius: 8,
  },
  iconStyle: {
    width: 20,
    height: 20,
    tintColor: '#facc15',
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  dropdownItemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#e5e7eb',
  },
  textareaContainer: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  textareaError: {
    borderColor: '#ef4444',
  },
  textarea: {
    color: '#fff',
    fontSize: 14,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: 'flex-end',
  },
  charCountText: {
    color: '#6b7280',
    fontSize: 12,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  uploadBoxDisabled: {
    opacity: 0.5,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  uploadSubText: {
    color: '#6b7280',
    fontSize: 12,
  },
  attachmentsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentCard: {
    width: '31%',
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    overflow: 'hidden',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#0a0a0a',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  fileTypePreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfPreview: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  otherFilePreview: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  fileTypeLabel: {
    color: '#9ca3af',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 9,
    marginTop: 6,
    fontWeight: '500',
  },
  successBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlayText: {
    color: '#ef4444',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  removeButtonOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  fileInfoFooter: {
    padding: 6,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
  },
  fileNameText: {
    color: '#e5e7eb',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSizeText: {
    color: '#6b7280',
    fontSize: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: colors.primaryButtonColor,
    paddingVertical: 13 ,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TicketFormModal;
