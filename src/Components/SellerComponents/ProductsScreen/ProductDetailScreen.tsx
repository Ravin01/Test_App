import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftCircle, Box, Info, ImageIcon, IndianRupee, Gavel, UserCircle, Phone, FileText, Hash, Archive, Package, MapPin, Weight, Ruler, CalendarDays, Clock, Factory, Globe, Container, Shield, AlertCircle, Recycle, Settings as SettingsIcon, Truck, Zap } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import moment from 'moment';
import { getFieldsForCategory } from './FieldMapping';
import { AWS_CDN_URL } from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import SellerHeader from '../SellerForm/Header';

const { width, height } = Dimensions.get('window');

// Flash Sale Timer Component
const FlashSaleTimer = ({ endsAt }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, days: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endDate = new Date(endsAt);
      if (isNaN(endDate.getTime())) {
        setIsExpired(true);
        return;
      }

      const difference = endDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (isExpired) {
    return (
      <Text style={styles.flashSaleExpired}>Flash Sale Ended</Text>
    );
  }

  return (
    <View style={styles.timerContainer}>
      {timeLeft.days > 0 && (
        <View style={styles.timerBox}>
          <Text style={styles.timerValue}>{String(timeLeft.days).padStart(2, '0')}</Text>
          <Text style={styles.timerLabel}>Days</Text>
        </View>
      )}
      <View style={styles.timerBox}>
        <Text style={styles.timerValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
        <Text style={styles.timerLabel}>Hours</Text>
      </View>
      <Text style={styles.timerColon}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
        <Text style={styles.timerLabel}>Min</Text>
      </View>
      <Text style={styles.timerColon}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
        <Text style={styles.timerLabel}>Sec</Text>
      </View>
    </View>
  );
};

const ProductDetailScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const [requiredFields, setRequiredFields] = useState([]);
  const [optionalFields, setOptionalFields] = useState([]);

  useEffect(() => {
    if (product) {
      const fields = getFieldsForCategory(product.category, product.subcategory);
      setRequiredFields(fields.required);
      setOptionalFields(fields.optional);
    }
  }, [product]);

  const shouldRenderField = useCallback(
    (fieldName) => {
      return requiredFields.includes(fieldName) || optionalFields.includes(fieldName);
    },
    [requiredFields, optionalFields]
  );

  const getHazardousMessage = (value) => {
    switch (value) {
      case 'no hazardous materials':
        return 'No hazardous materials.';
      case 'fragrances':
        return 'Fragrances (May require special handling).';
      case 'lithium batteries':
        return 'Lithium batteries (Requires special handling and labeling).';
      case 'other hazardous materials':
        return 'Other hazardous materials (Compliance required).';
      default:
        return 'Not specified.';
    }
  };

  const showImporterFields = useMemo(() => {
    return (
      product?.countryOfOrigin &&
      product.countryOfOrigin.toLowerCase() !== 'india' &&
      (shouldRenderField('importerName') ||
        shouldRenderField('importerAddress') ||
        shouldRenderField('importerGSTIN'))
    );
  }, [product, shouldRenderField]);

  if (!product?._id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primaryButtonColor} size="large" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  // Helper function to check if value exists and is not empty
  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  };

  // Helper to render a detail field
  const DetailField = ({ label, value, icon: Icon, iconColor = '#FFD700' }: { 
    label: string; 
    value: any; 
    icon?: any; 
    iconColor?: string;
  }) => {
    // Don't render if no value
    if (!hasValue(value)) return null;

    // Convert value to displayable format
    const getDisplayValue = () => {
      // Handle primitives (string, number, boolean)
      if (typeof value === 'string' || typeof value === 'number') {
        return <Text style={styles.valueText}>{value}</Text>;
      }
      
      if (typeof value === 'boolean') {
        return <Text style={styles.valueText}>{value ? 'Yes' : 'No'}</Text>;
      }
      
      // Handle React elements (already rendered)
      if (React.isValidElement(value)) {
        return value;
      }
      
      // Handle objects - convert to JSON string
      if (typeof value === 'object') {
        try {
          return <Text style={styles.valueText}>{JSON.stringify(value, null, 2)}</Text>;
        } catch (e) {
          return <Text style={styles.valueText}>{String(value)}</Text>;
        }
      }
      
      // Fallback
      return <Text style={styles.valueText}>{String(value)}</Text>;
    };

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldLabel}>
          {Icon && <Icon size={16} color={iconColor} style={styles.fieldIcon} />}
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <View style={styles.fieldValue}>
          {getDisplayValue()}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <SellerHeader message={'Product Details'} navigation={navigation}/>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* 1. PRODUCT IMAGES - FIRST */}
        {product.images && product.images.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ImageIcon size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>Product Images</Text>
            </View>

            <View style={styles.sectionContent}>
              <View style={styles.imagesContainer}>
                {product.images.map((image, index) => (
                  <View key={`${image.key || 'image'}-${index}`} style={styles.imageWrapper}>
                    <Image
                      source={{
                        uri: image?.key
                          ? `${AWS_CDN_URL}${image.key}`
                          : 'https://via.placeholder.com/150',
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverText}>Cover</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 2. BASIC INFORMATION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.sectionContent}>
            <View style={styles.twoColumnRow}>
              <View style={styles.halfWidth}>
                <DetailField label="Category" value={product.category} icon={Box} />
              </View>
              <View style={styles.halfWidth}>
                <DetailField label="Subcategory" value={product.subcategory} icon={Box} />
              </View>
            </View>

            <DetailField label="Product Title" value={product.title} />
            
            {hasValue(product.description) && (
              <View style={styles.fieldContainer}>
                <View style={styles.fieldLabel}>
                  <Text style={styles.labelText}>Description</Text>
                </View>
                <View style={styles.fieldValue}>
                  <Text style={styles.valueText}>{product.description}</Text>
                </View>
              </View>
            )}

            <View style={styles.twoColumnRow}>
              <View style={styles.halfWidth}>
                <DetailField
                  label="Stock Quantity"
                  value={product.quantity}
                  icon={Archive}
                />
              </View>
              {shouldRenderField('hsnNo') && (
                <View style={styles.halfWidth}>
                  <DetailField label="HSN No" value={product.hsnNo} icon={Hash} />
                </View>
              )}
            </View>

            {shouldRenderField('brand') && <DetailField label="Brand" value={product.brand} />}
            {shouldRenderField('size') && <DetailField label="Size" value={product.size} />}
          </View>
        </View>

        {/* 3. COURIER & SHIPPING */}
        {(shouldRenderField('weight') || shouldRenderField('dimensions') || 
          shouldRenderField('packagingType') || shouldRenderField('netQuantity')) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>Courier & Shipping</Text>
            </View>

            <View style={styles.sectionContent}>
              {shouldRenderField('weight') && product.weight && hasValue(product.weight.value) && (
                <DetailField
                  label="Weight"
                  value={`${product.weight.value} ${product.weight.unit}`}
                  icon={Weight}
                />
              )}
              {shouldRenderField('dimensions') && product.dimensions && 
                hasValue(product.dimensions.length) && (
                <DetailField
                  label="Dimensions (L x W x H)"
                  value={`${product.dimensions.length} x ${product.dimensions.width} x ${product.dimensions.height} ${product.dimensions.unit}`}
                  icon={Ruler}
                />
              )}
              {shouldRenderField('packagingType') && (
                <DetailField
                  label="Packaging Type"
                  value={product.packagingType}
                  icon={Container}
                />
              )}
              {shouldRenderField('netQuantity') && (
                <DetailField label="Net Quantity" value={product.netQuantity} />
              )}
            </View>
          </View>
        )}

        {/* 4. PRICE */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IndianRupee size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Price</Text>
          </View>

          <View style={styles.sectionContent}>
            {/* Flash Sale Section */}
            {product.flashSale?.isActive && (
              <View style={styles.flashSaleSection}>
                <LinearGradient
                  colors={['rgba(255, 0, 0, 0.15)', 'rgba(255, 0, 0, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.flashSaleGradient}>
                  <View style={styles.flashSaleHeader}>
                    <View style={styles.flashSaleBadge}>
                      <Zap size={16} color="#fff" fill="#fff" />
                      <Text style={styles.flashSaleBadgeText}>FLASH SALE ACTIVE</Text>
                    </View>
                  </View>

                  <FlashSaleTimer endsAt={product.flashSale.endsAt} />

                  <View style={styles.flashSalePrices}>
                    <View style={styles.flashSalePriceRow}>
                      <Text style={styles.flashSalePriceLabel}>Flash Price:</Text>
                      <Text style={styles.flashSalePrice}>
                        ₹ {product.flashSale.flashPrice}
                      </Text>
                    </View>
                    <View style={styles.flashSalePriceRow}>
                      <Text style={styles.flashSalePriceLabel}>Original Price:</Text>
                      <Text style={styles.flashSaleOriginalPrice}>
                        ₹ {product.flashSale.originalPrice}
                      </Text>
                    </View>
                    {product.flashSale.originalPrice > product.flashSale.flashPrice && (
                      <View style={styles.flashSaleDiscountRow}>
                        <Text style={styles.flashSaleDiscount}>
                          Save {Math.round(((product.flashSale.originalPrice - product.flashSale.flashPrice) / product.flashSale.originalPrice) * 100)}%
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.flashSaleDates}>
                    <Text style={styles.flashSaleDateText}>
                      Started: {moment(product.flashSale.startsAt).format('MMM Do, h:mm A')}
                    </Text>
                    <Text style={styles.flashSaleDateText}>
                      Ends: {moment(product.flashSale.endsAt).format('MMM Do, h:mm A')}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            <DetailField label="Actual Price (MRP)" value={`₹ ${product.MRP}`} />
            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabel}>
                <Text style={styles.labelText}>Selling Price</Text>
              </View>
              <View style={styles.fieldValue}>
                <Text style={[styles.valueText, styles.sellingPrice]}>
                  ₹ {product.productPrice}
                </Text>
              </View>
            </View>

            {product.allowDropshipping && hasValue(product.commissionRate) && (
              <DetailField
                label="Commission Rate"
                value={`${product.commissionRate}%`}
              />
            )}
  {product.gstRate&&
            <DetailField label="GST Rate" value={`${product.gstRate}%`} />}

            {(product.startingPrice || product.reservedPrice) && (
              <View style={styles.auctionContainer}>
                <View style={styles.auctionHeader}>
                  <Gavel size={18} color="#FFD700" />
                  <Text style={styles.auctionTitle}>Auction Settings</Text>
                </View>
                {product.startingPrice && (
                  <DetailField
                    label="Starting Bid"
                    value={`₹ ${product.startingPrice}`}
                  />
                )}
                {product.reservedPrice && (
                  <DetailField
                    label="Reserved Price"
                    value={`₹ ${product.reservedPrice}`}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* 5. SETTINGS (Seller Information, Manufacturer, Country of Origin) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <View style={styles.sectionContent}>
            {/* Seller Information */}
            <DetailField
              label="Seller Name"
              value={product.sellerName}
              icon={UserCircle}
            />
            <DetailField
              label="Seller Contact"
              value={product.sellerContact}
              icon={Phone}
            />
            <DetailField
              label="Seller GSTIN"
              value={product.sellerGSTIN}
              icon={FileText}
            />

            {/* Manufacturer Details */}
            {shouldRenderField('manufacturer') && (
              <DetailField
                label="Manufacturer"
                value={product.manufacturer}
                icon={Factory}
              />
            )}
            {shouldRenderField('manufacturerAddress') && (
              <DetailField
                label="Manufacturer Address"
                value={product.manufacturerAddress}
                icon={MapPin}
              />
            )}
            {shouldRenderField('countryOfOrigin') && (
              <DetailField
                label="Country of Origin"
                value={product.countryOfOrigin}
                icon={Globe}
              />
            )}

            {/* Importer Details (if applicable) */}
            {showImporterFields && (
              <>
                {shouldRenderField('importerName') && (
                  <DetailField label="Importer Name" value={product.importerName} />
                )}
                {shouldRenderField('importerAddress') && (
                  <DetailField
                    label="Importer Address"
                    value={product.importerAddress}
                  />
                )}
                {/* {shouldRenderField('importerGSTIN') && (
                  <DetailField
                    label="Importer GSTIN"
                    value={product.importerGSTIN||1}
                  />
                )} */}
              </>
            )}

            {/* Return Policy */}
            {shouldRenderField('hasReturn') && (
              <DetailField
                label="Return Policy"
                value={
                  product.hasReturn
                    ? `Yes, within ${product.returnDays} days`
                    : 'No Returns'
                }
              />
            )}
          </View>
        </View>

        {/* 6. ADDITIONAL SETTINGS (Compliance, Lifecycle, Additional Info) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Additional Settings</Text>
          </View>

          <View style={styles.sectionContent}>
            {/* Compliance & Certifications */}
            {shouldRenderField('bisCertification') && hasValue(product.bisCertification) && (
              <DetailField
                label="BIS Certification"
                value={product.bisCertification}
                icon={Shield}
              />
            )}
            {shouldRenderField('fssaiLicenseNo') && (
              <DetailField
                label="FSSAI License No"
                value={product.fssaiLicenseNo}
                icon={FileText}
              />
            )}
            {shouldRenderField('eWasteCompliance') && hasValue(product.eWasteCompliance) && (
              <DetailField
                label="E-Waste Compliant"
                value={product.eWasteCompliance}
                icon={Recycle}
              />
            )}
            {shouldRenderField('hazardousMaterials') && hasValue(product.hazardousMaterials) && (
              <DetailField
                label="Hazardous Materials"
                value={getHazardousMessage(product.hazardousMaterials)}
                icon={AlertCircle}
              />
            )}
            {shouldRenderField('recyclablePackaging') && hasValue(product.recyclablePackaging) && (
              <DetailField
                label="Recyclable Packaging"
                value={product.recyclablePackaging}
                icon={Recycle}
              />
            )}

            {/* Product Lifecycle */}
            {shouldRenderField('shelfLife') && (
              <DetailField
                label="Shelf Life"
                value={product.shelfLife}
                icon={CalendarDays}
              />
            )}
            {shouldRenderField('expiryDate') && product.expiryDate && (
              <DetailField
                label="Expiry Date"
                value={moment(product.expiryDate).format('MMMM Do YYYY')}
                icon={CalendarDays}
              />
            )}
            {shouldRenderField('batchNumber') && (
              <DetailField
                label="Batch Number"
                value={product.batchNumber}
                icon={Hash}
              />
            )}
            {shouldRenderField('warranty') && (
              <DetailField label="Warranty" value={product.warranty.duration} />
            )}

            {/* Additional Information */}
            <DetailField
              label="Product Active"
              value={product.isActive ? 'Yes' : 'No'}
            />
            {product.allowDropshipping && (
              <DetailField
                label="Allow Dropshipping"
                value="Yes"
              />
            )}
            {hasValue(product.createdAt) && (
              <DetailField
                label="Created At"
                value={moment(product.createdAt).format('MMMM Do YYYY, h:mm A')}
              />
            )}
            {product.updatedAt && hasValue(product.updatedAt) && (
              <DetailField
                label="Last Updated"
                value={moment(product.updatedAt).format('MMMM Do YYYY, h:mm A')}
              />
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryColor,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  section: {
    backgroundColor: colors.SecondaryColor,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 15,
  },
  fieldContainer: {
    marginBottom: 15,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldIcon: {
    marginRight: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  fieldValue: {
    backgroundColor: colors.primaryColor,
    borderRadius: 8,
    padding: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#fff',
  },
  notProvidedText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  halfWidth: {
    flex: 1,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    position: 'relative',
    width: (width - 70) / 3,
    height: (width - 70) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.primaryColor,
    borderWidth: 1,
    borderColor: '#333',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 2,
  },
  coverText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  sellingPrice: {
    color: '#4ADE80',
    fontWeight: 'bold',
    fontSize: 16,
  },
  auctionContainer: {
    backgroundColor: colors.primaryColor,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  auctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  auctionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 30,
  },
  // Flash Sale Styles
  flashSaleSection: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  flashSaleGradient: {
    padding: 15,
  },
  flashSaleHeader: {
    marginBottom: 15,
  },
  flashSaleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  flashSaleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  timerBox: {
    backgroundColor: colors.primaryColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  timerValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timerLabel: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2,
  },
  timerColon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  flashSalePrices: {
    marginBottom: 12,
  },
  flashSalePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flashSalePriceLabel: {
    color: '#ccc',
    fontSize: 14,
  },
  flashSalePrice: {
    color: '#FF0000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  flashSaleOriginalPrice: {
    color: '#999',
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  flashSaleDiscountRow: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  flashSaleDiscount: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: '600',
  },
  flashSaleDates: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  flashSaleDateText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  flashSaleExpired: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
});

export default ProductDetailScreen;
