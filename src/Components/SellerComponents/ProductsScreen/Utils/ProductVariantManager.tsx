import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Plus, X, Package, AlertCircle, CheckCircle, Edit3, Layers, Sparkles } from 'lucide-react-native';
import { launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { AWS_CDN_URL } from '../../../../../Config';
import { Toast } from '../../../../Utils/dateUtils';
import { variantOptions, getVariantsForCategory } from './categoryVariantMapping';
import VariantEditor from './VariantEditor';
import { uploadImageToS3 } from '../../../../Utils/aws';
import GlobalConfirmModal from '../../../Reuse/AlertModal';
import ToggleSwitch from 'toggle-switch-react-native';

// Types
interface VariantImage {
  preview?: string | null;
  key?: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  file?: Asset | null;
}

interface VariantAttribute {
  id: string;
  name: string;
  label: string;
  enabled: boolean;
  values: string[];
  valueInput: string;
}

interface Variant {
  id: string;
  title: string;
  sku: string;
  quantity: string;
  MRP: string;
  productPrice: string;
  images: VariantImage[];
  variantAttributes: Record<string, string>;
  requiresNewImage: boolean;
}

interface AlertModalState {
  visible: boolean;
  title: string;
  content: string;
  mode: 'normal' | 'warning' | 'error';
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  showIcon: boolean;
}

interface ProductVariantManagerProps {
  parentProduct: {
    title?: string;
    category?: string;
    subcategory?: string;
    MRP?: string;
    productPrice?: string;
    sku?: string;
    images?: VariantImage[];
  };
  onVariantsChange: (data: {
    enabled: boolean;
    variants: Variant[];
    variantAttributes: VariantAttribute[];
    isValid: boolean;
    deletedVariantIds: string[];
  }) => void;
  initialVariantData?: {
    enabled?: boolean;
    variants?: Variant[];
    variantAttributes?: VariantAttribute[];
  };
  isEditMode?: boolean;
}

// Static color mapping
const COLOR_HEX_MAPPING: Record<string, string> = {
  'Black': '#000000', 'White': '#FFFFFF', 'Red': '#FF0000', 'Blue': '#0000FF',
  'Green': '#00FF00', 'Yellow': '#FFFF00', 'Orange': '#FF8C00', 'Purple': '#800080',
  'Pink': '#FFC0CB', 'Brown': '#8B4513', 'Grey': '#808080', 'Navy': '#000080',
  'Beige': '#F5F5DC', 'Maroon': '#800000', 'Gold': '#EFBB16', 'Silver': '#C0C0C0',
  'Teal': '#008080', 'Lavender': '#E6E6FA', 'Magenta': '#FF00FF', 'Cyan': '#00FFFF',
  'Olive': '#808000', 'Coral': '#FF7F50', 'Indigo': '#4B0082', 'Turquoise': '#40E0D0',
  'Violet': '#EE82EE', 'Peach': '#FFDAB9', 'Mint': '#98FF98', 'Ruby': '#E0115F',
  'Emerald': '#50C878', 'Sapphire': '#0F52BA', 'Amethyst': '#9966CC', 'Topaz': '#FFC87C',
  'Pearl': '#FDEEF4', 'Bronze': '#CD7F32', 'Platinum': '#E5E4E2',
};

// Memoized Components
const ColorSwatch = memo(({ colorName, isSelected, onPress }: { colorName: string; isSelected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.colorSwatch, { backgroundColor: COLOR_HEX_MAPPING[colorName] || '#808080' }, isSelected && styles.colorSwatchSelected]}
    onPress={onPress}
    disabled={isSelected}
  >
    {isSelected && <CheckCircle size={16} color="#4CAF50" />}
  </TouchableOpacity>
));

const ValueButton = memo(({ value, isSelected, onPress }: { value: string; isSelected: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.valueButton, isSelected && styles.valueButtonSelected]} onPress={onPress} disabled={isSelected}>
    <Text style={[styles.valueButtonText, isSelected && styles.valueButtonTextSelected]}>{value}</Text>
    {isSelected && <CheckCircle size={14} color="#000" />}
  </TouchableOpacity>
));

const SelectedValueBadge = memo(({ value, onRemove, disabled = false, isExisting = false }: { value: string; onRemove: () => void; disabled?: boolean; isExisting?: boolean }) => (
  <View style={[styles.selectedValueBadge, disabled && styles.selectedValueBadgeDisabled]}>
    <Text style={[styles.selectedValueText, disabled && styles.selectedValueTextDisabled]}>{value}</Text>
    {isExisting && <View style={styles.existingDot} />}
    {!disabled ? (
      <TouchableOpacity onPress={onRemove}><X size={14} color="#000" /></TouchableOpacity>
    ) : (
      <View style={styles.disabledRemoveIcon}><X size={14} color="#666" /></View>
    )}
  </View>
));


// Main Component
const ProductVariantManager = ({ parentProduct, onVariantsChange, initialVariantData, isEditMode = false }: ProductVariantManagerProps) => {
  const cdnURL = AWS_CDN_URL;
  
  const [enableVariants, setEnableVariants] = useState(initialVariantData?.enabled || false);
  const [variants, setVariants] = useState<Variant[]>(initialVariantData?.variants || []);
  const [variantAttributes, setVariantAttributes] = useState<VariantAttribute[]>(initialVariantData?.variantAttributes || []);
  const [excludedCombinations, setExcludedCombinations] = useState<string[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [suggestedAttributes, setSuggestedAttributes] = useState<Array<{key: string; label: string}>>([]);
  const [_uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});
  const [isPreviewScrolling, setIsPreviewScrolling] = useState(false);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false, title: '', content: '', mode: 'normal',
    confirmText: 'Confirm', cancelText: 'Cancel', onConfirm: () => {}, showIcon: true,
  });

  const prevVariantDataRef = useRef<string>('');
  const initialDataApplied = useRef(false);
  const lastAppliedInitialData = useRef<string>('');

  // Memoized values
  const enabledAttrs = useMemo(() => 
    variantAttributes.filter(a => a.enabled && a.name.trim() && a.values.length > 0), [variantAttributes]);

  const hasColorAttribute = useMemo(() => 
    enabledAttrs.some(attr => attr.name === 'color' || attr.label?.toLowerCase() === 'color'), [enabledAttrs]);

  const previewCombinations = useMemo(() => {
    if (enabledAttrs.length === 0) return [];
    const combos: Record<string, string>[] = [];
    if (enabledAttrs.length === 1) {
      enabledAttrs[0].values.forEach(val => {
        const combo = { [enabledAttrs[0].name]: val };
        if (!excludedCombinations.includes(JSON.stringify(combo))) combos.push(combo);
      });
    } else if (enabledAttrs.length === 2) {
      enabledAttrs[0].values.forEach(val1 => {
        enabledAttrs[1].values.forEach(val2 => {
          const combo = { [enabledAttrs[0].name]: val1, [enabledAttrs[1].name]: val2 };
          if (!excludedCombinations.includes(JSON.stringify(combo))) combos.push(combo);
        });
      });
    }
    return combos;
  }, [enabledAttrs, excludedCombinations]);

  const getVariantErrors = useCallback((variant: Variant) => {
    const errors: Record<string, string> = {};
    if (!variant.sku?.trim()) errors.sku = 'SKU is required';
    if (!variant.quantity || Number(variant.quantity) < 0) errors.quantity = 'Valid quantity is required';
    if (!variant.MRP || parseFloat(variant.MRP) <= 0) errors.MRP = 'Valid MRP is required';
    if (!variant.productPrice || parseFloat(variant.productPrice) <= 0) errors.productPrice = 'Valid selling price is required';
    if (variant.productPrice && variant.MRP && parseFloat(variant.productPrice) > parseFloat(variant.MRP)) {
      errors.productPrice = 'Selling price cannot exceed MRP';
    }
    if (hasColorAttribute && variant.images.filter(img => img.status === 'done').length === 0) {
      errors.images = 'At least one image is required';
    }
    return errors;
  }, [hasColorAttribute]);

  const validationIssues = useMemo(() => {
    if (!enableVariants || variants.length === 0) return [];
    const issues: string[] = [];
    variants.forEach((v, idx) => {
      Object.values(getVariantErrors(v)).forEach(error => issues.push(`Variant ${idx + 1}: ${error}`));
    });
    return issues;
  }, [enableVariants, variants, getVariantErrors]);

  const validateVariants = useCallback(() => {
    if (!enableVariants) return true;
    if (variants.length === 0) return false;
    return variants.every(v => 
      v.sku?.trim() && v.quantity && Number(v.quantity) >= 0 && v.MRP && parseFloat(v.MRP) > 0 &&
      v.productPrice && parseFloat(v.productPrice) > 0 &&
      (hasColorAttribute ? v.images.filter(img => img.status === 'done').length > 0 : true)
    );
  }, [enableVariants, variants, hasColorAttribute]);

  // Callbacks
  const showAlertModal = useCallback((options: Partial<AlertModalState>) => {
    setAlertModal({
      visible: true, title: options.title || '', content: options.content || '',
      mode: options.mode || 'normal', confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel', onConfirm: options.onConfirm || (() => {}),
      showIcon: options.showIcon !== undefined ? options.showIcon : true,
    });
  }, []);

  const hideAlertModal = useCallback(() => setAlertModal(prev => ({ ...prev, visible: false })), []);
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  // Helper function to check if an ID is a valid MongoDB ObjectId (24 hex chars)
  const isMongoObjectId = useCallback((id: string) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }, []);

  const handleToggle = useCallback((checked: boolean) => {
    setEnableVariants(checked);
    if (!checked) {
      setVariants([]);
      setExcludedCombinations([]);
      setVariantAttributes([]);
      closePanel();
      setUploadingImages({});
    }
  }, [closePanel]);

  const createEmptyVariant = useCallback((inheritImages = false): Variant => ({
    id: String(Date.now() + Math.random()),
    title: '', sku: '', quantity: '',
    MRP: parentProduct?.MRP || '',
    productPrice: parentProduct?.productPrice || '',
    images: inheritImages && parentProduct?.images ? [...parentProduct.images] : [],
    variantAttributes: {},
    requiresNewImage: !inheritImages,
  }), [parentProduct?.MRP, parentProduct?.productPrice, parentProduct?.images]);

  const generateVariantSKU = useCallback((attributes: Record<string, string>) => {
    const base = parentProduct?.sku || 'SKU';
    const attr = Object.values(attributes).join('-').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    return `${base}-${attr}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }, [parentProduct?.sku]);

  const generateVariants = useCallback(() => {
    if (!parentProduct?.title) { Toast('Please fill in the parent product title first'); return; }
    if (enabledAttrs.length === 0) { Toast('Please enable and configure at least one attribute'); return; }

    // Keep track of existing variants to preserve their data
    const existingVariantsMap = new Map<string, Variant>();
    variants.forEach(v => {
      const comboKey = JSON.stringify(v.variantAttributes);
      existingVariantsMap.set(comboKey, v);
    });

    const resultVariants: Variant[] = [];

    if (enabledAttrs.length === 1) {
      const attr = enabledAttrs[0];
      const isColorAttr = attr.name === 'color' || attr.label?.toLowerCase() === 'color';
      attr.values.forEach(val => {
        const combo = { [attr.name]: val };
        const comboKey = JSON.stringify(combo);
        if (excludedCombinations.includes(comboKey)) return;
        
        // Check if this combination already exists
        const existingVariant = existingVariantsMap.get(comboKey);
        if (existingVariant) {
          // Preserve existing variant data, only update title if needed
          resultVariants.push({
            ...existingVariant,
            title: `${parentProduct.title} - ${val}`,
          });
        } else {
          // Create new variant
          const variant = createEmptyVariant(!isColorAttr);
          variant.variantAttributes = combo;
          variant.title = `${parentProduct.title} - ${val}`;
          variant.sku = generateVariantSKU(combo);
          resultVariants.push(variant);
        }
      });
    } else if (enabledAttrs.length === 2) {
      const [attr1, attr2] = enabledAttrs;
      attr1.values.forEach(val1 => {
        attr2.values.forEach(val2 => {
          const combo = { [attr1.name]: val1, [attr2.name]: val2 };
          const comboKey = JSON.stringify(combo);
          if (excludedCombinations.includes(comboKey)) return;
          
          // Check if this combination already exists
          const existingVariant = existingVariantsMap.get(comboKey);
          if (existingVariant) {
            // Preserve existing variant data, only update title if needed
            resultVariants.push({
              ...existingVariant,
              title: `${parentProduct.title}  - ${val2}`,
            });
          } else {
            // Create new variant
            const variant = createEmptyVariant(!hasColorAttribute);
            variant.variantAttributes = combo;
            variant.title = `${parentProduct.title} - ${val2}`;
            variant.sku = generateVariantSKU(combo);
            resultVariants.push(variant);
          }
        });
      });
    }
    
    setVariants(resultVariants);
    openPanel();
    
    // Show appropriate toast message
    // if (preservedCount > 0 && newCount > 0) {
    //   Toast(`✓ ${preservedCount} existing variant(s) preserved, ${newCount} new added`);
    // } else if (preservedCount > 0 && newCount === 0) {
    //   Toast(`✓ ${preservedCount} existing variant(s) - no new combinations`);
    // } else if (newCount > 0) {
    //   Toast(`✓ ${newCount} new variant(s) generated`);
    // }
  }, [parentProduct?.title, enabledAttrs, excludedCombinations, hasColorAttribute, createEmptyVariant, generateVariantSKU, openPanel, variants]);

  const addNewAttribute = useCallback((suggestion: {key: string; label: string}) => {
    if (variantAttributes.length >= 2) { Toast('Maximum 2 attributes supported'); return; }
    setVariantAttributes(prev => [...prev, {
      id: String(Date.now() + Math.random()), name: suggestion.key, label: suggestion.label,
      enabled: true, values: [], valueInput: ''
    }]);
  }, [variantAttributes.length]);

  const removeAttribute = useCallback((attrId: string) => {
    const attr = variantAttributes.find(a => a.id === attrId);
    if (!attr) return;
    
    // In edit mode, check if any values have existing backend variants
    if (isEditMode) {
      const hasExistingVariants = attr.values.some(value => 
        variants.some(variant => 
          variant.variantAttributes?.[attr.name] === value && isMongoObjectId(variant.id)
        )
      );
      
      if (hasExistingVariants) {
        Toast('Cannot remove attribute - has existing variants in backend');
        return;
      }
    }
    
    showAlertModal({
      title: 'Remove Attribute', content: 'Remove this attribute? All associated values will be lost.',
      mode: 'warning', confirmText: 'Remove', cancelText: 'Cancel',
      onConfirm: () => { 
        // Also remove any variants that use this attribute
        setVariants(prev => prev.filter(v => !v.variantAttributes?.[attr.name]));
        setVariantAttributes(prev => prev.filter(a => a.id !== attrId)); 
        Toast('Attribute removed'); 
        hideAlertModal(); 
      },
    });
  }, [showAlertModal, hideAlertModal, variantAttributes, variants, isEditMode, isMongoObjectId]);

  const addAttributeValue = useCallback((index: number, value?: string) => {
    const attr = variantAttributes[index];
    const newValue = value || attr.valueInput.trim();
    if (!newValue || attr.values.includes(newValue)) { if (attr.values.includes(newValue)) Toast('Value exists'); return; }
    setVariantAttributes(prev => {
      const newAttrs = [...prev];
      newAttrs[index] = { ...newAttrs[index], values: [...newAttrs[index].values, newValue], valueInput: value ? newAttrs[index].valueInput : '' };
      return newAttrs;
    });
  }, [variantAttributes]);

  const removeAttributeValue = useCallback((attrIndex: number, valueIndex: number) => {
    const attr = variantAttributes[attrIndex];
    const valueToRemove = attr?.values[valueIndex];
    
    setVariantAttributes(prev => {
      const newAttrs = [...prev];
      newAttrs[attrIndex] = { ...newAttrs[attrIndex], values: newAttrs[attrIndex].values.filter((_, idx) => idx !== valueIndex) };
      return newAttrs;
    });
    
    // Also remove any variants that have this attribute value
    if (valueToRemove && attr) {
      setVariants(prev => prev.filter(v => v.variantAttributes?.[attr.name] !== valueToRemove));
    }
  }, [variantAttributes]);

  const updateAttributeInput = useCallback((index: number, text: string) => {
    setVariantAttributes(prev => {
      const newAttrs = [...prev];
      newAttrs[index] = { ...newAttrs[index], valueInput: text };
      return newAttrs;
    });
  }, []);

  const removeAllValuesForAttribute = useCallback((attrName: string, value: string) => {
    // Remove the value from variant attributes
    setVariantAttributes(prev => {
      const newAttrs = [...prev];
      const attrIndex = newAttrs.findIndex(a => a.name === attrName);
      if (attrIndex !== -1) newAttrs[attrIndex] = { ...newAttrs[attrIndex], values: newAttrs[attrIndex].values.filter(v => v !== value) };
      return newAttrs;
    });
    
    // Also remove any variants that have this attribute value
    setVariants(prev => {
      const filtered = prev.filter(v => {
        const attrValue = v.variantAttributes?.[attrName];
        return attrValue !== value;
      });
      return filtered;
    });
    
    // Also add all matching combos to excluded combinations for safety
    setExcludedCombinations(prev => {
      const combosToExclude = variants
        .filter(v => v.variantAttributes?.[attrName] === value)
        .map(v => JSON.stringify(v.variantAttributes));
      const newExcluded = [...prev];
      combosToExclude.forEach(combo => {
        if (!newExcluded.includes(combo)) {
          newExcluded.push(combo);
        }
      });
      return newExcluded;
    });
    
    Toast(`${value} removed`);
  }, [variants]);

  const getSecondaryValuesForPrimary = useCallback((primaryValue: string, primaryAttrName: string, secondaryAttr: VariantAttribute) => {
    return secondaryAttr.values.filter(secondaryValue => {
      const combo = enabledAttrs[0].name === primaryAttrName
        ? { [primaryAttrName]: primaryValue, [secondaryAttr.name]: secondaryValue }
        : { [secondaryAttr.name]: secondaryValue, [primaryAttrName]: primaryValue };
      return !excludedCombinations.includes(JSON.stringify(combo));
    });
  }, [enabledAttrs, excludedCombinations]);

  const removeSpecificCombination = useCallback((pv: string, sv: string, pan: string, san: string) => {
    const combo = enabledAttrs[0].name === pan ? { [pan]: pv, [san]: sv } : { [san]: sv, [pan]: pv };
    setExcludedCombinations(prev => [...prev, JSON.stringify(combo)]);
    
    // Also remove the variant that matches this specific combination
    setVariants(prev => prev.filter(v => {
      const matchesPrimary = v.variantAttributes?.[pan] === pv;
      const matchesSecondary = v.variantAttributes?.[san] === sv;
      return !(matchesPrimary && matchesSecondary);
    }));
    
    Toast(`Removed ${pv} - ${sv}`);
  }, [enabledAttrs]);

  const updateVariant = useCallback((id: string, field: string, value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  }, []);

  const removeVariant = useCallback((id: string) => {
    const variantToRemove = variants.find(v => v.id === id);
    showAlertModal({
      title: 'Remove Variant', content: 'Remove this variant?', mode: 'error', confirmText: 'Remove', cancelText: 'Cancel',
      onConfirm: () => { 
        // Track deleted variant ID if it's from backend (MongoDB ObjectId format)
        if (isMongoObjectId(id)) {
          setDeletedVariantIds(prev => {
            if (!prev.includes(id)) {
              return [...prev, id];
            }
            return prev;
          });
        }
        
        // Add the variant's combination to excluded combinations so it's removed from preview
        if (variantToRemove?.variantAttributes) {
          const comboKey = JSON.stringify(variantToRemove.variantAttributes);
          const newExcludedCombinations = excludedCombinations.includes(comboKey) 
            ? excludedCombinations 
            : [...excludedCombinations, comboKey];
          
          setExcludedCombinations(newExcludedCombinations);
          
          // Check if any attribute values should be removed (when all their combinations are excluded)
          // Get remaining variants after this removal
          const remainingVariants = variants.filter(v => v.id !== id);
          
          // Check each attribute value in the removed variant
          Object.entries(variantToRemove.variantAttributes).forEach(([attrName, attrValue]) => {
            // Check if this value is used by any remaining variant
            const isValueUsedByOthers = remainingVariants.some(v => 
              v.variantAttributes?.[attrName] === attrValue
            );
            
            // If no other variant uses this value, remove it from attribute values
            if (!isValueUsedByOthers) {
              setVariantAttributes(prev => {
                const newAttrs = [...prev];
                const attrIndex = newAttrs.findIndex(a => a.name === attrName);
                if (attrIndex !== -1) {
                  newAttrs[attrIndex] = {
                    ...newAttrs[attrIndex],
                    values: newAttrs[attrIndex].values.filter(v => v !== attrValue)
                  };
                }
                return newAttrs;
              });
            }
          });
        }
        setVariants(prev => prev.filter(v => v.id !== id)); 
        hideAlertModal(); 
        Toast('Removed'); 
      },
    });
  }, [showAlertModal, hideAlertModal, variants, excludedCombinations, isMongoObjectId]);

  const removeVariantImage = useCallback((variantId: string, imageIndex: number) => {
    setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: v.images.filter((_, idx) => idx !== imageIndex) } : v));
  }, []);

  const pickVariantImage = useCallback(async (variantId: string) => {
    const currentVariant = variants.find(v => v.id === variantId);
    if (!currentVariant) return;
    const existingCount = currentVariant.images.filter(img => img.status !== 'pending' && img.status !== 'uploading').length;
    
    try {
      const result: ImagePickerResponse = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 as 0 | 1, maxWidth: 1000, maxHeight: 1000, selectionLimit: 4 - existingCount });
      if (result.didCancel || result.errorCode || !result.assets?.length) return;

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (result.assets.some(f => !validTypes.includes(f.type || ''))) {
        showAlertModal({ title: 'Invalid', content: 'Only JPG/PNG allowed', mode: 'error', confirmText: 'OK', onConfirm: hideAlertModal });
        return;
      }

      const colorAttr = enabledAttrs.find(a => a.name === 'color' || a.label?.toLowerCase() === 'color');
      const currentColor = colorAttr ? currentVariant.variantAttributes?.[colorAttr.name] : null;
      const shouldAutoShare = colorAttr && currentColor && currentVariant.requiresNewImage;

      const newImages: VariantImage[] = result.assets.map(f => ({ preview: f.uri, key: null, status: 'pending' as const, file: f }));
      setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: [...v.images, ...newImages].slice(0, 4) } : v));
      setUploadingImages(prev => ({ ...prev, [variantId]: true }));

      for (const image of newImages) {
        try {
          setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: v.images.map(img => img.preview === image.preview ? { ...img, status: 'uploading' as const } : img) } : v));
          const key = await uploadImageToS3(image.file?.uri || '', 'variants');
          setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: v.images.map(img => img.preview === image.preview ? { ...img, key, status: 'done' as const, preview: null, file: null } : img) } : v));
          
          if (shouldAutoShare && colorAttr) {
            setVariants(prev => prev.map(v => {
              if (v.id !== variantId && v.variantAttributes?.[colorAttr.name] === currentColor && !v.images.some(img => img.key === key)) {
                const sharedImage: VariantImage = { key, status: 'done' as const, preview: null, file: null };
                return { ...v, images: [...v.images, sharedImage].slice(0, 4) };
              }
              return v;
            }));
          }
        } catch { setVariants(prev => prev.map(v => v.id === variantId ? { ...v, images: v.images.map(img => img.preview === image.preview ? { ...img, status: 'error' as const, file: null } : img) } : v)); }
      }
    } catch { console.log('Picker error'); } finally { setUploadingImages(prev => ({ ...prev, [variantId]: false })); }
  }, [variants, enabledAttrs, showAlertModal, hideAlertModal]);

  // Effects
  useEffect(() => {
    if (initialVariantData) {
      // Create a stable key to check if the initial data has actually changed
      const dataKey = JSON.stringify({
        enabled: initialVariantData.enabled,
        variantIds: initialVariantData.variants?.map(v => v.id).sort(),
        variantPrices: initialVariantData.variants?.map(v => ({
          id: v.id,
          MRP: v.MRP,
          productPrice: v.productPrice,
          quantity: v.quantity,
          sku: v.sku,
        })),
        attributeNames: initialVariantData.variantAttributes?.map(a => a.name).sort(),
      });
      
      // Only apply if this is new data (different from what we last applied)
      if (dataKey !== lastAppliedInitialData.current) {
        lastAppliedInitialData.current = dataKey;
        initialDataApplied.current = true;
        
        if (initialVariantData.enabled !== undefined) setEnableVariants(initialVariantData.enabled);
        if (initialVariantData.variants?.length) {
          // Deep copy variants to avoid mutation issues
          const variantsCopy = initialVariantData.variants.map(v => ({
            ...v,
            images: v.images ? [...v.images] : [],
            variantAttributes: { ...v.variantAttributes },
          }));
          setVariants(variantsCopy);
        }
        if (initialVariantData.variantAttributes?.length) {
          // Deep copy attributes
          const attrsCopy = initialVariantData.variantAttributes.map(a => ({
            ...a,
            values: [...a.values],
          }));
          setVariantAttributes(attrsCopy);
        }
      }
    }
  }, [initialVariantData]);

  useEffect(() => {
    if (parentProduct?.category && parentProduct?.subcategory) {
      setSuggestedAttributes(getVariantsForCategory(parentProduct.category, parentProduct.subcategory) || []);
    }
  }, [parentProduct?.category, parentProduct?.subcategory]);

  useEffect(() => {
    const dataString = JSON.stringify({ enabled: enableVariants, vLen: variants.length, aLen: variantAttributes.length, isValid: validateVariants(), deletedIds: deletedVariantIds.length });
    if (dataString !== prevVariantDataRef.current) {
      prevVariantDataRef.current = dataString;
      onVariantsChange({ enabled: enableVariants, variants, variantAttributes, isValid: validateVariants(), deletedVariantIds });
    }
  }, [enableVariants, variants, variantAttributes, validateVariants, onVariantsChange, deletedVariantIds]);

  // Render functions
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Package size={24} color="#EFBB16" />
        <Text style={styles.headerTitle}>Product Variants</Text>
      </View>
    </View>
  );

  const renderToggle = () => (
    <TouchableOpacity style={styles.toggleContainer} onPress={() => handleToggle(!enableVariants)} activeOpacity={0.8}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>Enable Product Variants</Text>
        <ToggleSwitch isOn={enableVariants} trackOnStyle={styles.toggleSwitchActive} onToggle={() => handleToggle(!enableVariants)} />
      </View>
      <Text style={styles.toggleDescription}>Create multiple variants (e.g., colors, sizes) - each becomes an individual product</Text>
    </TouchableOpacity>
  );

  const renderSuggestedAttributes = () => {
    if (!suggestedAttributes?.length) return null;
    return (
      <View style={styles.suggestedContainer}>
        <View style={styles.suggestedHeader}>
          <Sparkles size={18} color="#EFBB16" />
          <Text style={styles.suggestedTitle}>Suggested for {parentProduct?.subcategory || parentProduct?.category}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.suggestedList}>
            {suggestedAttributes.slice(0, 4).map(attr => (
              <TouchableOpacity key={attr.key} style={[styles.suggestedButton, variantAttributes.some(a => a.name === attr.key) && styles.suggestedButtonDisabled]}
                onPress={() => addNewAttribute(attr)} disabled={variantAttributes.some(a => a.name === attr.key)}>
                <Plus size={16} color="#000" />
                <Text style={styles.suggestedButtonText}>{attr.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };
  // Helper function to check if an ID is a valid MongoDB ObjectId (24 hex chars)
  const isExistingVariant = useCallback((id: string) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }, []);

  // Helper function to check if an attribute value has any existing variants
  const hasExistingVariantsForAttributeValue = useCallback((attrName: string, value: string) => {
    return variants.some(variant => 
      variant.variantAttributes?.[attrName] === value && isExistingVariant(variant.id)
    );
  }, [variants, isExistingVariant]);

  // Helper function to check if a specific combination has an existing variant
  const hasExistingVariantForCombination = useCallback((combination: Record<string, string>) => {
    const comboKey = JSON.stringify(combination);
    return variants.some(variant => {
      const variantComboKey = JSON.stringify(variant.variantAttributes);
      return variantComboKey === comboKey && isExistingVariant(variant.id);
    });
  }, [variants, isExistingVariant]);

  const renderAttributeCard = (attr: VariantAttribute, index: number) => {
    const predefinedValues = variantOptions[attr.name]?.values || [];
    const isColorAttr = attr.name === 'color' || attr.label?.toLowerCase() === 'color';
    const itemsPerRow = predefinedValues.length <= 3 ? predefinedValues.length : Math.ceil(predefinedValues.length / 3);
    const valueRows: string[][] = [];
    for (let i = 0; i < predefinedValues.length; i += itemsPerRow) valueRows.push(predefinedValues.slice(i, i + itemsPerRow));

    return (
      <View key={attr.id} style={styles.attributeCard}>
        <View style={styles.attributeHeader}>
          <View style={styles.attributeTitleRow}>
            <Text style={styles.attributeName}>{attr.label || `Attribute ${index + 1}`}</Text>
            <View style={styles.valueCountBadge}><Text style={styles.valueCountText}>{attr.values.length}</Text></View>
          </View>
          <TouchableOpacity style={styles.removeAttributeButton} onPress={() => removeAttribute(attr.id)}><X size={20} color="#FF4444" /></TouchableOpacity>
        </View>
        <View style={styles.attributeValuesContainer}>
          {predefinedValues.length > 0 && (
            <>
              <Text style={styles.quickSelectTitle}>Quick Select {attr.label || attr.name}</Text>
              {isColorAttr ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.colorGridContainer}>
                    {valueRows.map((row, ri) => <View key={ri} style={styles.colorGridRow}>{row.map(c => <ColorSwatch key={c} colorName={c} isSelected={attr.values.includes(c)} onPress={() => addAttributeValue(index, c)} />)}</View>)}
                  </View>
                </ScrollView>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.valueGridContainer}>
                    {valueRows.map((row, ri) => <View key={ri} style={styles.valueGridRow}>{row.map(v => <ValueButton key={v} value={v} isSelected={attr.values.includes(v)} onPress={() => addAttributeValue(index, v)} />)}</View>)}
                  </View>
                </ScrollView>
              )}
            </>
          )}
          <View style={styles.addValueContainer}>
            <Text style={styles.addValueLabel}>{predefinedValues.length > 0 ? 'Or Add Custom Value' : 'Add Values'}</Text>
            <View style={styles.addValueInputRow}>
              <TextInput style={styles.valueInput} placeholder="Type value..." placeholderTextColor="#666" value={attr.valueInput} onChangeText={t => updateAttributeInput(index, t)} onSubmitEditing={() => addAttributeValue(index)} />
              <TouchableOpacity style={styles.addValueButton} onPress={() => addAttributeValue(index)}><Plus size={20} color="#000" /></TouchableOpacity>
            </View>
          </View>
          {attr.values.length > 0 && <View style={styles.selectedValues}>{attr.values.map((val, vi) => {
            const hasExisting = hasExistingVariantsForAttributeValue(attr.name, val);
            return (
              <SelectedValueBadge 
                key={`${val}-${vi}`} 
                value={val} 
                onRemove={() => {
                  if (hasExisting) {
                    Toast(`Cannot remove ${val} - has existing variants`);
                  } else {
                    removeAttributeValue(index, vi);
                  }
                }}
                disabled={hasExisting}
                isExisting={hasExisting}
              />
            );
          })}</View>}
        </View>
      </View>
    );
  };

  const renderAttributes = () => (
    <View style={styles.attributesContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Define Variant Attributes</Text>
        <Text style={styles.sectionSubtitle}>Choose 1 or 2 attributes</Text>
      </View>
      {variantAttributes.length === 0 ? (
        <View style={styles.emptyAttributes}>
          <Layers size={48} color="#666" />
          <Text style={styles.emptyText}>No attributes added yet</Text>
          <Text style={styles.emptySubtext}>Tap on suggested attributes above or add custom ones</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>{variantAttributes.map((attr, i) => renderAttributeCard(attr, i))}</ScrollView>
      )}
    </View>
  );

  const renderPreview = () => {
    if (previewCombinations.length === 0) return null;
    const hasTwoAttributes = enabledAttrs.length === 2;

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Preview Combinations</Text>
          <View style={styles.previewCountBadge}><Text style={styles.previewCountText}>{previewCombinations.length}</Text></View>
        </View>
        <View style={styles.previewScrollWrapper} onTouchStart={() => setIsPreviewScrolling(true)} onTouchEnd={() => setIsPreviewScrolling(false)}>
          {hasTwoAttributes ? (
            <ScrollView style={styles.previewScrollInner} nestedScrollEnabled showsVerticalScrollIndicator>
              {enabledAttrs[0].values.map((primaryValue, pi) => {
                const secondaryAttr = enabledAttrs[1];
                const availableSecondary = getSecondaryValuesForPrimary(primaryValue, enabledAttrs[0].name, secondaryAttr);
                if (availableSecondary.length === 0) return null;
                const isColorPrimary = enabledAttrs[0].name === 'color' || enabledAttrs[0].label?.toLowerCase() === 'color';
                const hasPrimaryExisting = hasExistingVariantsForAttributeValue(enabledAttrs[0].name, primaryValue);
                
                return (
                  <View key={pi} style={styles.colorItem}>
                    <View style={styles.colorItemHeader}>
                      <View style={styles.colorInfo}>
                        {isColorPrimary && <View style={[styles.colorDot, { backgroundColor: COLOR_HEX_MAPPING[primaryValue] || '#808080' }]} />}
                        <Text style={styles.colorName}>{primaryValue}</Text>
                        <View style={styles.sizeCountBadge}><Text style={styles.sizeCountText}>{availableSecondary.length} {secondaryAttr.label}</Text></View>
                        {hasPrimaryExisting && <View style={styles.existingBadge}><Text style={styles.existingBadgeText}>Existing</Text></View>}
                      </View>
                      {hasPrimaryExisting ? (
                        <View style={[styles.colorRemoveButton, styles.disabledColorRemoveButton]}>
                          <X size={16} color="#999" />
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.colorRemoveButton} onPress={() => removeAllValuesForAttribute(enabledAttrs[0].name, primaryValue)}>
                          <X size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.sizeList}>
                        {availableSecondary.map((sv, si) => {
                          const combo = { [enabledAttrs[0].name]: primaryValue, [secondaryAttr.name]: sv };
                          const hasComboExisting = hasExistingVariantForCombination(combo);
                          
                          return hasComboExisting ? (
                            <View key={si} style={[styles.sizeBadgeRemovable, styles.disabledSizeBadge]}>
                              <Text style={[styles.sizeText, styles.disabledSizeText]}>{sv}</Text>
                              <View style={styles.existingDot} />
                            </View>
                          ) : (
                            <TouchableOpacity key={si} style={styles.sizeBadgeRemovable} onPress={() => removeSpecificCombination(primaryValue, sv, enabledAttrs[0].name, secondaryAttr.name)}>
                              <Text style={styles.sizeText}>{sv}</Text>
                              <View style={styles.sizeRemoveIcon}><X size={10} color="#fff" /></View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView style={styles.previewScrollInner} nestedScrollEnabled showsVerticalScrollIndicator>
              <View style={styles.previewList}>
                {previewCombinations.map((item, index) => {
                  const hasItemExisting = hasExistingVariantForCombination(item);
                  
                  return (
                    <View key={index} style={[styles.previewItem, hasItemExisting && styles.previewItemDisabled]}>
                      <View style={styles.previewItemContent}>
                        <View style={[styles.previewIndex, hasItemExisting && styles.previewIndexDisabled]}>
                          <Text style={[styles.previewIndexText, hasItemExisting && styles.previewIndexTextDisabled]}>{index + 1}</Text>
                        </View>
                        <View style={styles.previewValues}>
                          {Object.entries(item).map(([key, val], i) => {
                            const hasValueExisting = hasExistingVariantsForAttributeValue(key, String(val));
                            return (
                              <React.Fragment key={key}>
                                {i > 0 && <Text style={styles.previewSeparator}>•</Text>}
                                {hasValueExisting ? (
                                  <View style={[styles.removableValueBadge, styles.disabledValueBadge]}>
                                    <Text style={[styles.previewValue, styles.disabledPreviewValue]}>{String(val)}</Text>
                                    <View style={styles.existingDot} />
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.removableValueBadge} onPress={() => removeAllValuesForAttribute(key, String(val))}>
                                    <Text style={styles.previewValue}>{String(val)}</Text>
                                    <X size={12} color="#FF4444" />
                                  </TouchableOpacity>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </View>
                        {hasItemExisting && <View style={styles.existingBadge}><Text style={styles.existingBadgeText}>Existing</Text></View>}
                      </View>
                      {hasItemExisting ? (
                        <View style={styles.disabledRemoveIcon}>
                          <X size={16} color="#666" />
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => {
                          // Add to excluded combinations
                          setExcludedCombinations(p => [...p, JSON.stringify(item)]);
                          // Also remove the corresponding variant
                          setVariants(prev => prev.filter(v => {
                            const matches = Object.entries(item).every(([key, val]) => v.variantAttributes?.[key] === val);
                            return !matches;
                          }));
                        }}>
                          <X size={16} color="#FF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  const renderActions = () => {
    const hasValidMRP = parentProduct?.MRP && parseFloat(parentProduct.MRP) > 0;
    const hasValidSellingPrice = parentProduct?.productPrice && parseFloat(parentProduct.productPrice) > 0;
    const hasValidImages = parentProduct?.images?.filter(img => img.status === 'done').length > 0;
    const hasTitle = parentProduct?.title?.trim();
    const hasCombinations = previewCombinations.length > 0;
    
    // Check if there are any new combinations (not already existing as variants)
    const newCombinations = previewCombinations.filter(combo => !hasExistingVariantForCombination(combo));
    const hasNewCombinations = newCombinations.length > 0;
    
    // Check if all combinations already have existing variants
    const allCombinationsExist = hasCombinations && newCombinations.length === 0;
    
    const isDisabled = !hasTitle || !hasCombinations || !hasValidMRP || !hasValidSellingPrice || !hasValidImages || !hasNewCombinations;
    
    const getDisabledReasons = () => {
      const reasons: string[] = [];
      if (!hasValidImages) reasons.push('Upload at least one product image');
      if (!hasValidMRP) reasons.push('Enter MRP (Actual Price)');
      if (!hasValidSellingPrice) reasons.push('Enter Selling Price');
      if (!hasTitle) reasons.push('Enter product title');
      if (!hasCombinations) reasons.push('Add variant attributes with values');
      if (allCombinationsExist) reasons.push('All combinations already have existing variants - add new attribute values to generate more');
      return reasons;
    };
    
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.generateButton, isDisabled && styles.generateButtonDisabled]}
          onPress={generateVariants} disabled={isDisabled}>
          <LinearGradient colors={isDisabled ? ['#666', '#555'] : ['#EFBB16', '#FFA500']} style={styles.generateButtonGradient}>
            <Package size={20} color={isDisabled ? '#999' : '#000'} />
            <Text style={[styles.generateButtonText, isDisabled && styles.generateButtonTextDisabled]}>
              Generate {previewCombinations.length} Variant{previewCombinations.length !== 1 ? 's' : ''}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        {isDisabled && (
          <View style={styles.disabledReasonsContainer}>
            <AlertCircle size={16} color="#F59E0B" />
            <View style={styles.disabledReasonsList}>
              <Text style={styles.disabledReasonsTitle}>Complete these to enable:</Text>
              {getDisabledReasons().map((reason, index) => (
                <Text key={index} style={styles.disabledReasonText}>• {reason}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryHeader}>
        <Package size={20} color="#EFBB16" />
        <Text style={styles.summaryTitle}>Variants Summary</Text>
        <View style={styles.summaryCountBadge}><Text style={styles.summaryCountText}>{variants.length}</Text></View>
      </View>
      {validationIssues.length === 0 ? (
        <View style={styles.successMessage}><CheckCircle size={20} color="#4CAF50" /><Text style={styles.successText}>All variants configured correctly!</Text></View>
      ) : (
        <View style={styles.errorMessage}><AlertCircle size={20} color="#FF4444" /><Text style={styles.errorText}>{validationIssues.length} issue(s) need attention</Text></View>
      )}
      <TouchableOpacity style={styles.openEditorButton} onPress={openPanel}><Edit3 size={18} color="#000" /><Text style={styles.openEditorText}>Open Variant Editor</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderToggle()}
      {enableVariants && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!isPreviewScrolling} nestedScrollEnabled>
          {suggestedAttributes.length > 0 && renderSuggestedAttributes()}
          {renderAttributes()}
          {renderPreview()}
          {renderActions()}
          {variants.length > 0 && !isPanelOpen && renderSummary()}
        </ScrollView>
      )}
      <VariantEditor isVisible={isPanelOpen} onClose={closePanel} variants={variants} variantAttributes={variantAttributes}
        onUpdateVariant={updateVariant} onRemoveVariant={removeVariant} onPickImage={pickVariantImage} onRemoveImage={removeVariantImage}
        validationIssues={validationIssues} cdnURL={cdnURL} getVariantErrors={getVariantErrors} isEditMode={isEditMode} />
      <GlobalConfirmModal visible={alertModal.visible} onClose={hideAlertModal} onConfirm={alertModal.onConfirm}
        title={alertModal.title} content={alertModal.content} confirmText={alertModal.confirmText} cancelText={alertModal.cancelText} mode={alertModal.mode} showIcon={alertModal.showIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#EFBB16' },
  toggleContainer: { padding: 10, backgroundColor: '#1a1a1a', margin: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  toggleSwitchActive: { backgroundColor: '#EFBB16' },
  toggleContent: { flex: 1, gap: 15, flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  toggleDescription: { fontSize: 14, color: '#999', lineHeight: 20 },
  content: { flex: 1 },
  suggestedContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EFBB1680' },
  suggestedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  suggestedTitle: { fontSize: 14, fontWeight: '600', color: '#EFBB16' },
  suggestedList: { flexDirection: 'row', gap: 8 },
  suggestedButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFBB16', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  suggestedButtonDisabled: { backgroundColor: '#666', opacity: 0.5 },
  suggestedButtonText: { fontSize: 14, fontWeight: '600', color: '#000' },
  attributesContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 6, marginBottom: 16, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#EFBB16', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#999' },
  emptyAttributes: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#fff', marginTop: 12, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center' },
  attributeCard: { backgroundColor: '#222', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EFBB16' },
  attributeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  attributeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attributeName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  valueCountBadge: { backgroundColor: '#EFBB16', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  valueCountText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  removeAttributeButton: { padding: 4 },
  attributeValuesContainer: { gap: 16 },
  quickSelectTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  colorGridContainer: { flexDirection: 'column', gap: 8, paddingVertical: 8 },
  colorGridRow: { flexDirection: 'row', gap: 8 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: '#4CAF50' },
  valueGridContainer: { flexDirection: 'column', gap: 8, paddingVertical: 8 },
  valueGridRow: { flexDirection: 'row', gap: 8 },
  valueButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#EFBB16' },
  valueButtonSelected: { backgroundColor: '#EFBB16', borderColor: '#EFBB16' },
  valueButtonText: { fontSize: 14, color: '#EFBB16', fontWeight: '500' },
  valueButtonTextSelected: { color: '#000', fontWeight: '600' },
  addValueContainer: { gap: 8 },
  addValueLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  addValueInputRow: { flexDirection: 'row', gap: 8 },
  valueInput: { flex: 1, backgroundColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14 },
  addValueButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#EFBB16', justifyContent: 'center', alignItems: 'center' },
  selectedValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#000', borderRadius: 8, minHeight: 40 },
  selectedValueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFBB16', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  selectedValueText: { fontSize: 14, fontWeight: '600', color: '#000' },
  previewContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EFBB16' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  previewTitle: { fontSize: 16, fontWeight: 'bold', color: '#EFBB16' },
  previewCountBadge: { backgroundColor: '#EFBB16', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  previewCountText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  previewScrollWrapper: { maxHeight: 300, minHeight: 100 },
  previewScrollInner: { maxHeight: 300 },
  previewList: { gap: 8 },
  colorItem: { backgroundColor: '#000', padding: 12, borderRadius: 8, marginBottom: 8 },
  colorItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  colorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  colorName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  sizeCountBadge: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  sizeCountText: { fontSize: 12, color: '#fff' },
  colorRemoveButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center' },
  sizeList: { flexDirection: 'row', gap: 8 },
  sizeBadgeRemovable: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFBB16', paddingLeft: 12, paddingRight: 6, paddingVertical: 8, borderRadius: 20, minHeight: 36 },
  sizeRemoveIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4444', justifyContent: 'center', alignItems: 'center' },
  sizeText: { fontSize: 13, fontWeight: '600', color: '#000' },
  previewItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', padding: 12, borderRadius: 8, marginBottom: 8 },
  previewItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EFBB16', justifyContent: 'center', alignItems: 'center' },
  previewIndexText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  previewValues: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewSeparator: { fontSize: 14, color: '#666' },
  previewValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  removableValueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#333', borderRadius: 6 },
  actionsContainer: { marginHorizontal: 16, marginBottom: 16, gap: 12 },
  generateButton: { overflow: 'hidden', borderRadius: 12 },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  generateButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  generateButtonTextDisabled: { color: '#999' },
  disabledReasonsContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B', marginTop: 8 },
  disabledReasonsList: { flex: 1 },
  disabledReasonsTitle: { fontSize: 13, fontWeight: '600', color: '#F59E0B', marginBottom: 4 },
  disabledReasonText: { fontSize: 12, color: '#999', marginTop: 2 },
  summaryContainer: { backgroundColor: '#1a1a1a', marginHorizontal: 6, marginBottom: 16, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  summaryTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#EFBB16' },
  summaryCountBadge: { backgroundColor: '#EFBB16', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  summaryCountText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  successMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4CAF5010', borderWidth: 1, borderColor: '#4CAF5030', padding: 12, borderRadius: 8, marginBottom: 16 },
  successText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
  errorMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF444410', borderWidth: 1, borderColor: '#FF444430', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600', color: '#FF4444' },
  openEditorButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFBB16', paddingVertical: 12, borderRadius: 8 },
  openEditorText: { fontSize: 14, fontWeight: '600', color: '#000' },
  selectedValueBadgeDisabled: { backgroundColor: '#666', borderWidth: 1, borderColor: '#888' },
  selectedValueTextDisabled: { color: '#999' },
  existingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginLeft: 2 },
  disabledRemoveIcon: { opacity: 0.5 },
  existingBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 4 },
  existingBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  disabledColorRemoveButton: { backgroundColor: '#666', opacity: 0.5 },
  disabledSizeBadge: { backgroundColor: '#666', borderWidth: 1, borderColor: '#888' },
  disabledSizeText: { color: '#999' },
  disabledSizeRemoveIcon: { backgroundColor: '#888' },
  previewItemDisabled: { borderWidth: 1, borderColor: '#3B82F6', opacity: 0.8 },
  previewIndexDisabled: { backgroundColor: '#666' },
  previewIndexTextDisabled: { color: '#999' },
  disabledValueBadge: { backgroundColor: '#444', borderWidth: 1, borderColor: '#3B82F6' },
  disabledPreviewValue: { color: '#999' },
});

export default ProductVariantManager;
