import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, X, Trash2, CheckCircle, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Toast } from '../../../../Utils/dateUtils';

// Types
interface VariantImage {
  status: 'pending' | 'uploading' | 'done' | 'error';
  key?: string;
  preview?: string;
}

interface VariantAttribute {
  id: string | number;
  name: string;
  label?: string;
  enabled: boolean;
  values: string[];
  valueInput?: string;
}

interface Variant {
  id: string;
  title?: string;
  sku?: string;
  quantity?: number | string;
  MRP?: number | string;
  productPrice?: number | string;
  variantAttributes?: Record<string, string | number>;
  images?: VariantImage[];
  requiresNewImage?: boolean;
}

interface ColorGroup {
  color: string;
  colorAttrName: string;
  otherAttrName: string;
  otherAttrLabel: string;
  variants: Variant[];
}

interface VariantEditorProps {
  isVisible: boolean;
  onClose: () => void;
  variants: Variant[];
  variantAttributes?: VariantAttribute[];
  onUpdateVariant: (id: string, field: string, value: string) => void;
  onRemoveVariant: (id: string) => void;
  onPickImage: (id: string) => void;
  onRemoveImage: (variantId: string, imageIndex: number) => void;
  validationIssues?: string[];
  cdnURL: string;
  getVariantErrors?: (variant: Variant) => Record<string, string> | null;
  isEditMode?: boolean;
}

// Color hex mapping for visual display
const colorHexMapping: Record<string, string> = {
  'Black': '#000000',
  'White': '#FFFFFF',
  'Red': '#FF0000',
  'Blue': '#0000FF',
  'Green': '#00FF00',
  'Yellow': '#FFFF00',
  'Orange': '#FF8C00',
  'Purple': '#800080',
  'Pink': '#FFC0CB',
  'Brown': '#8B4513',
  'Grey': '#808080',
  'Navy': '#000080',
  'Beige': '#F5F5DC',
  'Maroon': '#800000',
  'Gold': '#FFD700',
  'Silver': '#C0C0C0'
};

const { width } = Dimensions.get('window');

// Local input component - uses local state for smooth typing, syncs on blur
const VariantInput = React.memo(({
  value,
  onChangeValue,
  style,
  placeholder,
  keyboardType,
  sanitize,
}: {
  value: string;
  onChangeValue: (value: string) => void;
  style: any;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  sanitize?: (text: string) => string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);

  // Sync local value with prop when not focused (external updates)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChangeText = useCallback((text: string) => {
    const sanitized = sanitize ? sanitize(text) : text;
    setLocalValue(sanitized);
    // Immediately update parent for validation feedback
    onChangeValue(sanitized);
  }, [sanitize, onChangeValue]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    // Ensure parent has the final value
    onChangeValue(localValue);
  }, [localValue, onChangeValue]);

  return (
    <TextInput
      style={style}
      placeholder={placeholder}
      placeholderTextColor="#666"
      value={localValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      keyboardType={keyboardType}
    />
  );
});

const VariantEditor = ({
  isVisible,
  onClose,
  variants,
  variantAttributes = [],
  onUpdateVariant,
  onRemoveVariant,
  onPickImage,
  onRemoveImage,
  validationIssues,
  cdnURL,
  getVariantErrors,
  isEditMode = false,
}: VariantEditorProps) => {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedColorGroups, setExpandedColorGroups] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const toggleColorGroup = useCallback((colorValue: string) => {
    setExpandedColorGroups(prev =>
      prev.includes(colorValue)
        ? prev.filter(c => c !== colorValue)
        : [...prev, colorValue]
    );
  }, []);

  // Group variants by color
  const groupedVariants = useMemo((): ColorGroup[] | null => {
    const enabledAttrs = variantAttributes.filter(
      (a) => a.enabled && a.name?.trim() && a.values?.length > 0
    );
    
    const colorAttr = enabledAttrs.find(
      (a) => a.name === 'color' || a.label?.toLowerCase() === 'color'
    );
    
    if (!colorAttr || enabledAttrs.length !== 2) {
      return null;
    }

    const otherAttr = enabledAttrs.find((a) => a !== colorAttr);
    if (!otherAttr) return null;

    const grouped: Record<string, ColorGroup> = {};

    variants.forEach((variant) => {
      const colorValue = String(variant.variantAttributes?.[colorAttr.name] || '');
      if (!grouped[colorValue]) {
        grouped[colorValue] = {
          color: colorValue,
          colorAttrName: colorAttr.name,
          otherAttrName: otherAttr.name,
          otherAttrLabel: otherAttr.label || otherAttr.name,
          variants: []
        };
      }
      grouped[colorValue].variants.push(variant);
    });

    return Object.values(grouped);
  }, [variants, variantAttributes]);

  const hasColorAttribute = useMemo(() => {
    const enabledAttrs = variantAttributes.filter(
      (a) => a.enabled && a.name?.trim() && a.values?.length > 0
    );
    return enabledAttrs.some(
      (attr) => attr.name === 'color' || attr.label?.toLowerCase() === 'color'
    );
  }, [variantAttributes]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(width);
      fadeAnim.setValue(0);
    }
  }, [isVisible, slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setHasAttemptedSubmit(false);
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  const handleDoneEditing = useCallback(() => {
    setHasAttemptedSubmit(true);
    // Check if there are any validation issues
    const hasErrors = variants.some(variant => {
      const errors = getVariantErrors?.(variant);
      return errors && Object.keys(errors).length > 0;
    });
    
    if (!hasErrors) {
      handleClose();
    }
    // Toast("Please fix the highlighted issues before proceeding.");
  }, [variants, getVariantErrors, handleClose]);

  const variantsCount = useMemo(() => variants?.length || 0, [variants?.length]);

  if (!isVisible) return null;

  const renderVariantCard = (variant: Variant, index: number, otherAttrName?: string) => {
    const errors = hasAttemptedSubmit ? (getVariantErrors?.(variant) || {}) : {};
    const otherAttrValue = otherAttrName ? variant.variantAttributes?.[otherAttrName] : null;
// console.log(variants)
    return (
      <View key={variant.id} style={styles.variantCard}>
        <View style={styles.variantHeader}>
          <View style={styles.variantTitleRow}>
            {otherAttrValue ? (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{String(otherAttrValue)}</Text>
              </View>
            ) : (
              <Text style={styles.variantIndex}>Variant {index + 1}</Text>
            )}
            {!otherAttrName && (
              <View style={styles.variantAttributesRow}>
                {Object.entries(variant.variantAttributes || {}).map(([key, value]) => (
                  <View key={key} style={styles.variantAttributeBadge}>
                    <Text style={styles.variantAttributeText}>
                      {key}: {String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* Hide delete button for existing backend variants in edit mode */}
          {/* MongoDB ObjectId is a 24-character hex string */}
          {!(isEditMode && variant.id && /^[0-9a-fA-F]{24}$/.test(variant.id)) && (
            <TouchableOpacity
              onPress={() => onRemoveVariant(variant.id)}
              style={styles.deleteButton}
            >
              <Trash2 size={18} color="#FF4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>SKU *</Text>
            <VariantInput
              style={[styles.input, errors.sku && styles.inputError]}
              placeholder="SKU123"
              value={variant.sku || ''}
              onChangeValue={(text) => onUpdateVariant(variant.id, 'sku', text)}
            />
            {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Qty *</Text>
            {/* Only disable quantity for existing backend variants (MongoDB ObjectIds) */}
            {isEditMode && variant.id && /^[0-9a-fA-F]{24}$/.test(variant.id) ? (
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledInputText}>{String(variant.quantity || '0')}</Text>
              </View>
            ) : (
              <VariantInput
                style={[styles.input, errors.quantity && styles.inputError]}
                placeholder="100"
                value={String(variant.quantity || '')}
                onChangeValue={(text) => onUpdateVariant(variant.id, 'quantity', text)}
                keyboardType="numeric"
                sanitize={(text) => text.replace(/[^0-9]/g, '')}
              />
            )}
            {errors.quantity && !(isEditMode && variant.id && /^[0-9a-fA-F]{24}$/.test(variant.id)) && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>MRP ₹ *</Text>
            <VariantInput
              style={[styles.input, errors.MRP && styles.inputError]}
              placeholder="999"
              value={String(variant.MRP || '')}
              onChangeValue={(text) => onUpdateVariant(variant.id, 'MRP', text)}
              keyboardType="decimal-pad"
              sanitize={(text) => text.replace(/[^0-9.]/g, '')}
            />
            {errors.MRP && <Text style={styles.errorText}>{errors.MRP}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Price ₹ *</Text>
            <VariantInput
              style={[styles.input, errors.productPrice && styles.inputError]}
              placeholder="899"
              value={String(variant.productPrice || '')}
              onChangeValue={(text) => onUpdateVariant(variant.id, 'productPrice', text)}
              keyboardType="decimal-pad"
              sanitize={(text) => text.replace(/[^0-9.]/g, '')}
            />
            {errors.productPrice && <Text style={styles.errorText}>{errors.productPrice}</Text>}
          </View>
        </View>

        <View style={styles.imagesSection}>
          <View style={styles.imagesHeader}>
            <Text style={[styles.fieldLabel, errors.images && styles.fieldLabelError]}>Images (1-4) *</Text>
            {variant.requiresNewImage ? (
              <View style={[styles.requiredBadge, errors.images && styles.requiredBadgeError]}>
                <Text style={[styles.requiredText, errors.images && styles.requiredTextError]}>
                  {errors.images ? '⚠️ Required' : '⚠️ Required'}
                </Text>
              </View>
            ) : (
              <View style={styles.autoAppliedBadge}>
                <Text style={styles.autoAppliedText}>✓ Auto</Text>
              </View>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            {(variant.images || []).map((image, imgIndex) => {
              const imageUri = image.status === 'done' && image.key
                ? `${cdnURL}${image.key}`
                : image.preview || null;
              return (
                <View key={imgIndex} style={styles.imageContainer}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.variantImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.variantImage, styles.imagePlaceholder]}>
                      {image.status === 'error' ? (
                        <AlertCircle size={20} color="#FF4444" />
                      ) : (
                        <ActivityIndicator color="#EFBB16" size="small" />
                      )}
                    </View>
                  )}
                  {(image.status === 'pending' || image.status === 'uploading') && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#EFBB16" size="small" />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => onRemoveImage(variant.id, imgIndex)}
                    style={styles.removeImageButton}
                  >
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {(variant.images || []).filter(img => img.status !== 'error').length < 4 && (
              <TouchableOpacity
                onPress={() => onPickImage(variant.id)}
                style={[styles.addImageButton, errors.images && styles.addImageButtonError]}
              >
                <Plus size={20} color={errors.images ? "#FF4444" : "#666"} />
              </TouchableOpacity>
            )}
          </ScrollView>
          {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="none" transparent onRequestClose={handleClose}>
      <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.modalContainer, { transform: [{ translateX: slideAnim }] }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex1}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Package size={24} color="#EFBB16" />
                <Text style={styles.modalTitle}>Variant Editor</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{variantsCount}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              {hasColorAttribute ? (
                <Text style={styles.infoBannerWarning}>
                  ⚠️ Color variants: Upload unique images for each color (1-4 per variant)
                </Text>
              ) : (
                <Text style={styles.infoBannerSuccess}>
                  ✓ Parent images auto-applied to all variants
                </Text>
              )}
            </View>

            {/* Content */}
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {variants.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={64} color="#666" />
                  <Text style={styles.emptyStateTitle}>No Variants</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    All variants have been removed. Go back to add new variant attributes and generate variants.
                  </Text>
                  <TouchableOpacity style={styles.emptyStateButton} onPress={handleClose}>
                    <Plus size={20} color="#000" />
                    <Text style={styles.emptyStateButtonText}>Add Variants</Text>
                  </TouchableOpacity>
                </View>
              ) : groupedVariants ? (
                // Grouped by color
                groupedVariants.map((group) => (
                  <View key={group.color} style={styles.colorGroupContainer}>
                    <TouchableOpacity
                      onPress={() => toggleColorGroup(group.color)}
                      style={styles.colorGroupHeader}
                      activeOpacity={0.7}
                    >
                      <View style={styles.colorGroupLeft}>
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: colorHexMapping[group.color] || '#808080' }
                          ]}
                        />
                        <View>
                          <Text style={styles.colorGroupTitle}>{group.color}</Text>
                          <Text style={styles.colorGroupSubtitle}>
                            {group.variants.length} {group.otherAttrLabel}{group.variants.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.colorGroupRight}>
                        <View style={styles.colorGroupBadge}>
                          <Text style={styles.colorGroupBadgeText}>{group.variants.length}</Text>
                        </View>
                        {expandedColorGroups.includes(group.color) ? (
                          <ChevronUp size={20} color="#EFBB16" />
                        ) : (
                          <ChevronDown size={20} color="#EFBB16" />
                        )}
                      </View>
                    </TouchableOpacity>

                    {expandedColorGroups.includes(group.color) && (
                      <View style={styles.colorGroupContent}>
                        {group.variants.map((variant, idx) =>
                          renderVariantCard(variant, idx, group.otherAttrName)
                        )}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                // Ungrouped (flat list)
                (variants || []).map((variant, index) => renderVariantCard(variant, index))
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              {validationIssues?.length === 0 ? (
                <View style={styles.footerStatus}>
                  <CheckCircle size={20} color="#4CAF50" />
                  <Text style={[styles.footerStatusText, { color: '#4CAF50' }]}>
                    All variants configured!
                  </Text>
                </View>
              ) : (
                <View style={styles.footerStatus}>
                  <AlertCircle size={20} color="#FFA500" />
                  <Text style={[styles.footerStatusText, { color: '#FFA500' }]}>
                    {validationIssues?.length || 0} issue(s) remaining
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={handleDoneEditing} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done Editing</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    width: width > 500 ? 500 : width,
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EFBB16',
  },
  countBadge: {
    backgroundColor: '#EFBB16',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  infoBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoBannerWarning: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '500',
  },
  infoBannerSuccess: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  // Color Group Styles
  colorGroupContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(239, 187, 22, 0.3)',
    overflow: 'hidden',
  },
  colorGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  colorGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  colorGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  colorGroupSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  colorGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorGroupBadge: {
    backgroundColor: '#EFBB16',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  colorGroupBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  colorGroupContent: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Variant Card Styles
  variantCard: {
    backgroundColor: '#0d0d0d',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  variantIndex: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sizeBadge: {
    backgroundColor: '#EFBB16',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  sizeBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  variantAttributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 8,
  },
  variantAttributeBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFBB16',
  },
  variantAttributeText: {
    fontSize: 12,
    color: '#EFBB16',
  },
  deleteButton: {
    padding: 4,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  formField: {
    width: '48%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  inputDisabled: {
    backgroundColor: '#1a1a1a',
    borderColor: '#444',
    justifyContent: 'center',
  },
  disabledInputText: {
    color: '#888',
    fontSize: 13,
  },
  errorText: {
    fontSize: 11,
    color: '#FF4444',
    marginTop: 4,
  },
  imagesSection: {
    gap: 8,
  },
  imagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requiredBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '600',
  },
  autoAppliedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoAppliedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  imagesRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 10,
  },
  variantImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButtonError: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  fieldLabelError: {
    color: '#FF4444',
  },
  requiredBadgeError: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  requiredTextError: {
    color: '#FF4444',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#EFBB16',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFBB16',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  // Error Banner Styles
  errorBannerContainer: {
    backgroundColor: '#1a0000',
    borderBottomWidth: 1,
    borderBottomColor: '#FF444440',
  },
  errorBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  errorBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorBannerToggle: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: '500',
  },
  errorBannerContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  errorCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF444415',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  errorCategoryIcon: {
    fontSize: 18,
  },
  errorCategoryText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  errorCategoryBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  errorCategoryCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorBannerHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    paddingLeft: 4,
  },
});

export default VariantEditor;
