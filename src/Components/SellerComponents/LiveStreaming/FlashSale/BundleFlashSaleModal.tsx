import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  X,
  Zap,
  Package,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '../../../../Utils/Colors';

const BundleFlashSaleModal = ({
  visible = false,
  bundle,
  onClose,
  onStart,
  calculateDiscount = (mrp, flashPrice) => Math.round(((mrp - flashPrice) / mrp) * 100),
  durationOptions = [10, 20, 30, 40, 50, 60, 240],
  cdnURL = '',
}) => {
  const [formData, setFormData] = useState({
    flashPrice: '',
    duration: 30,
  });
  const [formErrors, setFormErrors] = useState<{
    flashPrice?: string;
  }>({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Validate form fields
  const validateForm = useCallback(() => {
    const errors: { flashPrice?: string } = {};
    const flashPriceNum = parseFloat(formData.flashPrice);
    const bundlePrice = bundle?.sellingPrice || bundle?.productPrice || 0;
    
    if (!formData.flashPrice) {
      errors.flashPrice = 'Flash price is required';
    } else if (isNaN(flashPriceNum) || flashPriceNum <= 0) {
      errors.flashPrice = 'Please enter a valid price';
    } else if (flashPriceNum >= bundlePrice) {
      errors.flashPrice = 'Flash price must be less than bundle price';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, bundle]);

  const handleStartClick = async () => {
    if (!bundle) {
      setError('Bundle information is missing');
      return;
    }
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const processedData = {
        ...formData,
        duration: parseInt(formData.duration.toString(), 10),
        flashPrice: parseFloat(formData.flashPrice)
      };

      await onStart(processedData);
    } catch (err) {
      setError(err.message || 'Failed to start bundle flash sale');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({ flashPrice: '', duration: 30 });
    setFormErrors({});
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!visible || !bundle) {
    return null;
  }

  const bundlePrice = bundle?.sellingPrice || bundle?.productPrice || 0;
  const bundleMRP = bundle?.bundleMRP || bundlePrice;
  const imageUrl = bundle?.bundleImage?.key 
    ? `${cdnURL}${bundle.bundleImage.key}`
    : bundle?.images?.[0]?.key 
    ? `${cdnURL}${bundle.images[0].key}`
    : null;

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Zap size={20} color="#fecaca" />
            <Text style={styles.title}>Configure Bundle Flash Sale</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
            <X size={20} color="#fecaca" />
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Bundle Preview */}
          <View style={styles.bundlePreview}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.previewImage, styles.placeholderImage]}>
                <Package size={24} color="#6b7280" />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.bundleBadge}>🎁 BUNDLE</Text>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {bundle?.bundleTitle || bundle?.title || 'Bundle'}
              </Text>
              <Text style={styles.previewText}>
                MRP: ₹{bundleMRP}
              </Text>
              <Text style={styles.previewText}>
                Bundle Price: ₹{bundlePrice}
              </Text>
              {bundle?.products && (
                <Text style={styles.productCount}>
                  {bundle.products.length} Products in Bundle
                </Text>
              )}
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Flash Price (₹)</Text>
              <TextInput
                style={[styles.input, formErrors.flashPrice && styles.inputError]}
                value={formData.flashPrice}
                onChangeText={(text) => {
                  setFormData({ ...formData, flashPrice: text });
                  if (formErrors.flashPrice) {
                    setFormErrors({ ...formErrors, flashPrice: undefined });
                  }
                }}
                placeholder="Enter flash price"
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                maxLength={10}
              />
              {formErrors.flashPrice && (
                <Text style={styles.errorFieldText}>{formErrors.flashPrice}</Text>
              )}
              {(() => {
                const flashPriceNum = parseFloat(formData.flashPrice);
                return !isNaN(flashPriceNum) && 
                  flashPriceNum > 0 &&
                  flashPriceNum < bundleMRP && 
                  !formErrors.flashPrice && (
                    <View style={styles.discountPreview}>
                      <Text style={styles.discountText}>
                        Discount: {calculateDiscount(bundleMRP, flashPriceNum)}% OFF
                      </Text>
                      <Text style={styles.savingsText}>
                        You save ₹{bundleMRP - flashPriceNum}
                      </Text>
                    </View>
                  );
              })()}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (seconds)</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.durationOptions}
              >
                {durationOptions.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      formData.duration === duration && styles.selectedDurationOption,
                    ]}
                    onPress={() => setFormData({ ...formData, duration })}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        formData.duration === duration && styles.selectedDurationOptionText,
                      ]}
                    >
                      {duration}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.selectContainer}>
                <Text style={styles.selectText}>
                  {formData.duration} seconds
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingModal}>
              <ActivityIndicator size="large" color="#ef4444" />
              <Text style={styles.loadingModalText}>Starting Bundle Flash Sale...</Text>
              <Text style={styles.loadingModalSubtext}>Please wait</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              onPress={resetAndClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleStartClick}
              disabled={!formData.flashPrice || loading || !!formErrors.flashPrice}
              style={[
                styles.startButton,
                (!formData.flashPrice || loading || !!formErrors.flashPrice) && 
                styles.startButtonDisabled
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.startButtonText}>Starting...</Text>
                </>
              ) : (
                <Text style={styles.startButtonText}>Start Bundle Flash Sale</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fecaca',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#b91c1c',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bundlePreview: {
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  placeholderImage: {
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  bundleBadge: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
    marginBottom: 4,
  },
  previewTitle: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 2,
  },
  productCount: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.SecondaryColor,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#f3f4f6',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorFieldText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
  },
  discountPreview: {
    marginTop: 4,
    gap: 2,
  },
  discountText: {
    color: '#4ade80',
    fontSize: 14,
  },
  savingsText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '500',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.SecondaryColor,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
  },
  selectText: {
    color: '#f3f4f6',
    fontSize: 16,
  },
  durationOptions: {
    marginTop: 8,
  },
  durationOption: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedDurationOption: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  durationOptionText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  selectedDurationOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: colors.SecondaryColor,
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingModalText: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingModalSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BundleFlashSaleModal;
