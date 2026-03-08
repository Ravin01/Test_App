import React, {useContext, useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Octicons from 'react-native-vector-icons/Octicons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Image} from 'react-native-animatable';
import {Dropdown} from 'react-native-element-dropdown';
import {ActivityIndicator} from 'react-native-paper';
import {
  AWS_CDN_URL,
  deleteObjectFromS3,
  uploadImageToS3,
  uploadPdfToS3,
  generatePrivateSignedUrl,
} from '../../../Utils/aws';
import {checkPermission} from '../../../Utils/Permission';
import SellerHeader from './Header';
import HorizontalTimeline from './TimeLine';
import {UploadIcon, X} from 'lucide-react-native';
import {Toast} from '../../../Utils/dateUtils';
import DocumentPicker from 'react-native-document-picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../Utils/Colors';
import {AuthContext} from '../../../Context/AuthContext';
import {
  amazon,
  Facebook,
  flipkart,
  instagram,
  meesho,
  shopify,
} from '../../../assets/assets';
import useAutoSave from './useAutoSave';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {FABHelpButton, FAQHelpBottomSheet} from './HelpExample';
import OnboardingStatusWidget, {CompactProgressFAB} from './CompletionPercent';

// URL Validation utility
const ValidationUtils = {
  isValidURL: (value: string): string => {
    if (!value || value.trim() === '') return ''; // Empty is valid (optional field)
    
    const trimmedValue = value.trim();
    
    // Comprehensive URL regex that supports:
    // - http://, https://, ftp://
    // - www. prefix
    // - Domain names with subdomains
    // - IP addresses
    // - Ports
    // - Paths, query strings, and fragments
    // - Common file extensions
    const urlRegex = /^(https?:\/\/|ftp:\/\/|www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
    
    // Also support Google Drive, Dropbox, and other cloud storage links
    const drivePatterns = [
      /^https?:\/\/(drive|docs)\.google\.com/i,
      /^https?:\/\/.*\.dropbox\.com/i,
      /^https?:\/\/.*\.onedrive\.live\.com/i,
      /^https?:\/\/.*\.sharepoint\.com/i,
      /^https?:\/\/.*\.icloud\.com/i,
      /^https?:\/\/.*\.box\.com/i,
    ];
    
    // Check if it's a valid drive/cloud link
    const isDriveLink = drivePatterns.some(pattern => pattern.test(trimmedValue));
    if (isDriveLink) return '';
    
    // Check standard URL format
    if (!urlRegex.test(trimmedValue)) {
      return 'Please enter a valid URL (e.g., https://example.com or www.example.com)';
    }
    
    return '';
  },
};

function PreviewUploads({
  previewUrl,
  name: _name,
  isUploaded,
  onRemove,
  isPDF,
  isLocalPreview = false,
  s3Key,
}: {
  previewUrl?: string;
  onRemove: () => void;
  name: string;
  isUploaded?: boolean;
  isPDF?: boolean;
  isLocalPreview?: boolean;
  s3Key?: string;
}) {
  // Check if we have a valid local preview (file://, content://) or just a CDN URL
  const hasLocalPreview = previewUrl && (
    previewUrl.startsWith('file://') || 
    previewUrl.startsWith('content://') ||
    previewUrl.startsWith('/') ||
    isLocalPreview
  );
  
  // Generate CDN URL from S3 key if available and it's an image (not PDF)
  const cdnUrl = s3Key && !isPDF ? `${AWS_CDN_URL}${s3Key}` : null;
  
  // Determine the display URL - prefer local preview, fallback to CDN
  const displayUrl = hasLocalPreview && previewUrl ? previewUrl : cdnUrl;
  
  return (
    <View className="items-center mr-1">
      <View className="w-24 h-24 bg-black rounded-md items-center justify-center overflow-hidden mb-2 border border-gray-600">
        {isPDF ? (
          <View className="w-full h-full items-center justify-center bg-gray-800">
            <Text className="text-white font-semibold">{'PDF'}</Text>
          </View>
        ) : displayUrl ? (
          <Image
            source={{uri: displayUrl}}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : isUploaded ? (
          <View className="w-full h-full items-center justify-center bg-green-900/50">
            <Feather name="check-circle" size={24} color="#22c55e" />
            <Text className="text-green-400 text-xs mt-1 text-center px-1">Uploaded</Text>
          </View>
        ) : (
          <Feather name="file" size={24} color="#fff" />
        )}
      </View>
      <TouchableOpacity
        onPress={onRemove}
        className=" bg-red-500 p-1 rounded-full absolute right-0">
        <X color={'#fff'} size={13} />
      </TouchableOpacity>
    </View>
  );
}
const SellerRegisterTab3 = ({navigation, route}: any) => {
  // const route = useRoute();
  const rbSheetRef = useRef();
  const sellerExperienceDropdownRef = useRef<any>(null);

  const [showProgress, setShowProgress] = useState(false);
  const [catalogLinkError, setCatalogLinkError] = useState('');
  const [channelUrlErrors, setChannelUrlErrors] = useState<{[key: string]: string}>({});
  const openHelpSheet = () => {
    rbSheetRef.current?.open();
  };
  const data = route.params;
  const [loading, setloading] = useState(false);
  const [brand, setbrand] = useState('');
  const {categories}: any = useContext(AuthContext);
  // console.log(data.data.brand)
  const sellingTypes = [
    'Reselling Products (Curated from suppliers)',
    'Handmade/Customized Products',
    'Dropshipping',
    'Direct Brand Collaborations',
  ];

  // Local preview URIs - these are NOT saved, only used for display
  const [localPreviews, setLocalPreviews] = useState<{
    productCatalogFile: { [key: string]: string };
    fssaiCertificate: string | null;
    bisCertificateFileName: string | null;
    qualityCertificateFileName: string | null;
  }>({
    productCatalogFile: {},
    fssaiCertificate: null,
    bisCertificateFileName: null,
    qualityCertificateFileName: null,
  });

  // Signed URLs for S3 private bucket files (when local preview is not available)
  const [signedUrls, setSignedUrls] = useState<{
    productCatalogFile: { [key: string]: string };
    fssaiCertificate: string | null;
    bisCertificateFileName: string | null;
    qualityCertificateFileName: string | null;
  }>({
    productCatalogFile: {},
    fssaiCertificate: null,
    bisCertificateFileName: null,
    qualityCertificateFileName: null,
  });

  // Loading state for fetching signed URLs
  const [fetchingSignedUrls, setFetchingSignedUrls] = useState<{
    productCatalogFile: { [key: string]: boolean };
    fssaiCertificate: boolean;
    bisCertificateFileName: boolean;
    qualityCertificateFileName: boolean;
  }>({
    productCatalogFile: {},
    fssaiCertificate: false,
    bisCertificateFileName: false,
    qualityCertificateFileName: false,
  });

  const {formData, setFormData} = useAutoSave({
    ...data?.data,
    sellerExperience: '',
    sellingChannels: {
      Instagram: {selected: false, name: ''},
      Facebook: {selected: false, name: ''},
      Shopify: {selected: false, name: ''},
      Amazon: {selected: false, name: ''},
      Flipkart: {selected: false, name: ''},
      Meesho: {selected: false, name: ''},
    },
    fssaiCertificate: '',
    
  bisCertificateFileName: null,
  qualityCertificateFileName: null,
    channels: [''],
    productCategories: [],
    wantToSell: [],
    productCatalog: [],
    hasCatlog: false,
    productCatalogLink: '',
    productCatalogFile: [],
    liveSellingFrequency: '',
    cameraSetup: false,
    wantBrandCollaborations: false,
  });
  // console.log(formData)
  const handleSocialToggle = useCallback((channel) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      sellingChannels: {
        ...prevFormData.sellingChannels,
        [channel]: {
          ...prevFormData.sellingChannels[channel],
          selected: !prevFormData.sellingChannels[channel]?.selected,
        },
      },
    }));
  }, [setFormData]);

  const handleUsernameChange = useCallback((channel, value) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      sellingChannels: {
        ...prevFormData.sellingChannels,
        [channel]: {
          ...prevFormData.sellingChannels[channel],
          selected: true,
          name: value,
        },
      },
    }));
    // Validate channel URL
    const error = ValidationUtils.isValidURL(value);
    setChannelUrlErrors(prev => ({
      ...prev,
      [channel]: error,
    }));
  }, [setFormData]);

  const toggleCategory = useCallback((category) => {
    setFormData(prevFormData => {
      const updatedProductCategories = prevFormData.productCategories.includes(category)
        ? prevFormData.productCategories.filter(c => c !== category)
        : [...prevFormData.productCategories, category];

      return {
        ...prevFormData,
        productCategories: updatedProductCategories,
      };
    });
  }, [setFormData]);

  const togglesellingtypes = useCallback((type) => {
    setFormData(prevFormData => {
      const updatedWantToSell = prevFormData.wantToSell.includes(type)
        ? prevFormData.wantToSell.filter(c => c !== type)
        : [...prevFormData.wantToSell, type];

      return {
        ...prevFormData,
        wantToSell: updatedWantToSell,
      };
    });
  }, [setFormData]);

  const togglechannel = useCallback((category) => {
    setFormData(prevFormData => {
      const updatedInsideChannels = prevFormData.channels.includes(category)
        ? prevFormData.channels.filter(c => c !== category)
        : [...prevFormData.channels, category];
      return {
        ...prevFormData,
        channels: updatedInsideChannels,
      };
    });
  }, [setFormData]);

  const handleInputChange = useCallback((field, value) => {
    // Single setFormData call to prevent double updates
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'productCatalogLink' ? {hasCatlog: true} : {}),
    }));
  }, [setFormData]);
  const getSocialIcon = platform => {
    switch (platform) {
      case 'Instagram':
        return instagram;
      case 'Facebook':
        return Facebook;
      case 'Shopify':
        return shopify;
      case 'Amazon':
        return amazon;
      case 'Flipkart':
        return flipkart;
      case 'Meesho':
        return meesho;
      default:
        return null;
    }
  };

  const pickAny = async type => {
    try {
      const hasPermission = await checkPermission('gallery');
      if (!hasPermission) return;

      setloading(true);

      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf], // Try using predefined types
        copyTo: 'cachesDirectory',
        allowMultiSelection: true,
        presentationStyle: 'pageSheet', // Add this for better UX
      });

      // For safety: limit to max 10 files for productCatalog
      let selectedFiles = result;
      if (type == 'catlog') {
        selectedFiles = result.slice(0, 10);
      }

      // Upload all files
      for (const file of selectedFiles) {
        if (!file.fileCopyUri) {
          ToastAndroid.show('No file chosen', ToastAndroid.SHORT);
          continue;
        }
        // console.log(file)

        const fileType = file.type;
        let uploadedUrl = '';

        // Store local URI for preview
        const localUri = file.fileCopyUri;

        // PDF upload
        if (fileType === 'application/pdf') {
          if (type === 'fssai') {
            uploadedUrl = await uploadPdfToS3(
              file.fileCopyUri,
              'fssai-certificates',true
            );
            handleInputChange('fssaiCertificate', uploadedUrl);
            // Store local preview
            setLocalPreviews(prev => ({...prev, fssaiCertificate: localUri}));
          }        
          else {
            uploadedUrl = await uploadPdfToS3(
              file.fileCopyUri,
              'product-catalogs',true
            );
            setFormData(prev => ({
              ...prev,
              productCatalogFile: [
                ...(prev.productCatalogFile || []),
                uploadedUrl,
              ],
              hasCatlog: true,
            }));
            // Store local preview for catalog
            setLocalPreviews(prev => ({
              ...prev,
              productCatalogFile: {
                ...prev.productCatalogFile,
                [uploadedUrl]: localUri,
              },
            }));
          }
        }

        // Image upload
        else if (fileType.startsWith('image/')) {
          if (
            fileType === 'image/jpeg' ||
            fileType === 'image/jpg' ||
            fileType === 'image/png' ||
            fileType === 'image/webp'
          ) {
            if (type === 'fssai') {
              uploadedUrl = await uploadImageToS3(
                file.fileCopyUri,
                'fssai-certificates',
                true
              );
              handleInputChange('fssaiCertificate', uploadedUrl);
              // Store local preview
              setLocalPreviews(prev => ({...prev, fssaiCertificate: localUri}));
            } else if(type === 'quality'){ 
              console.log("tryingto upload")
              uploadedUrl = await uploadImageToS3(file.fileCopyUri, 'quality-certificates',true);
              console.log(uploadedUrl)
              handleInputChange('qualityCertificateFileName',uploadedUrl)
              // Store local preview
              setLocalPreviews(prev => ({...prev, qualityCertificateFileName: localUri}));
            } else if(type === 'bis'){
              uploadedUrl = await uploadImageToS3(file.fileCopyUri, 'bis-certificates',true);
              handleInputChange('bisCertificateFileName',uploadedUrl)
              // Store local preview
              setLocalPreviews(prev => ({...prev, bisCertificateFileName: localUri}));
            } else {
              uploadedUrl = await uploadImageToS3(
                file.fileCopyUri,
                'product-catalogs',
                true
              );
              setFormData(prev => ({
                ...prev,
                productCatalogFile: [
                  ...(prev.productCatalogFile || []),
                  uploadedUrl,
                ],
              }));
              // Store local preview for catalog
              setLocalPreviews(prev => ({
                ...prev,
                productCatalogFile: {
                  ...prev.productCatalogFile,
                  [uploadedUrl]: localUri,
                },
              }));
            }
          } else {
            ToastAndroid.show(
              'Unsupported image format. Please use JPG, JPEG, PNG, or WEBP.',
              ToastAndroid.SHORT,
            );
            continue;
          }
        }

        // Unsupported file type
        else {
          ToastAndroid.show(
            'Unsupported file type. Please select an image (JPG, JPEG, PNG, WEBP) or PDF.',
            ToastAndroid.SHORT,
          );
          continue;
        }
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled the picker');
      } else {
        console.log(err);
        ToastAndroid.show(`Error picking file: ${err}`, ToastAndroid.SHORT);
      }
    } finally {
      setloading(false);
    }
  };
  useEffect(() => {
    const get = async () => {
      const brand = await AsyncStorage.getItem('type');
      // console.log(brand)
      setbrand(brand);
    };
    get();
  }, []);

  // Fetch signed URLs for files that are uploaded but don't have local previews
  useEffect(() => {
    const fetchSignedUrlsForFiles = async () => {
      // Fetch for single file fields
      const singleFields = ['fssaiCertificate', 'bisCertificateFileName', 'qualityCertificateFileName'] as const;
      
      for (const field of singleFields) {
        const s3Key = formData[field];
        const hasLocalPreview = localPreviews[field];
        const hasSignedUrl = signedUrls[field];
        
        // Only fetch signed URL if we have an S3 key but no local preview and no existing signed URL
        if (s3Key && !hasLocalPreview && !hasSignedUrl) {
          try {
            // Set loading state for this field
            setFetchingSignedUrls(prev => ({...prev, [field]: true}));
            const signedUrl = await generatePrivateSignedUrl(s3Key);
            if (signedUrl) {
              setSignedUrls(prev => ({...prev, [field]: signedUrl}));
            }
          } catch (error) {
            console.log(`Error fetching signed URL for ${field}:`, error);
          } finally {
            setFetchingSignedUrls(prev => ({...prev, [field]: false}));
          }
        }
      }

      // Fetch for product catalog files (array of files)
      if (formData.productCatalogFile && formData.productCatalogFile.length > 0) {
        for (const s3Key of formData.productCatalogFile) {
          const hasLocalPreview = localPreviews.productCatalogFile[s3Key];
          const hasSignedUrl = signedUrls.productCatalogFile[s3Key];
          
          if (s3Key && !hasLocalPreview && !hasSignedUrl) {
            try {
              // Set loading state for this catalog file
              setFetchingSignedUrls(prev => ({
                ...prev,
                productCatalogFile: {
                  ...prev.productCatalogFile,
                  [s3Key]: true,
                },
              }));
              const signedUrl = await generatePrivateSignedUrl(s3Key);
              if (signedUrl) {
                setSignedUrls(prev => ({
                  ...prev,
                  productCatalogFile: {
                    ...prev.productCatalogFile,
                    [s3Key]: signedUrl,
                  },
                }));
              }
            } catch (error) {
              console.log(`Error fetching signed URL for catalog file ${s3Key}:`, error);
            } finally {
              setFetchingSignedUrls(prev => ({
                ...prev,
                productCatalogFile: {
                  ...prev.productCatalogFile,
                  [s3Key]: false,
                },
              }));
            }
          }
        }
      }
    };

    fetchSignedUrlsForFiles();
  }, [formData.fssaiCertificate, formData.bisCertificateFileName, formData.qualityCertificateFileName, formData.productCatalogFile, localPreviews, signedUrls]);
  // console.log(formData)

  // Check if Food & Beverages is selected
  const isFoodBeveragesSelected = (formData.productCategories || []).includes(
    'Food & Beverages',
  );
  const isJewelleryCategorySelected = (formData.productCategories || [])?.includes('Jewellery');
  const handleNext = () => {
    // navigation.navigate('FourthTabContent', formData);
    // console.log(formData);
    // return;
    if (isFoodBeveragesSelected && !formData.fssaiCertificate) {
      ToastAndroid.show('Upload an FSSAI Certificate', ToastAndroid.SHORT);
      return;
    }
    // if (!formData.liveSellingFrequency) {
    //   ToastAndroid.show(
    //     'All fields are required fill the missing details',
    //     ToastAndroid.SHORT,
    //   );
    //   return;
    // }

    // Validate seller channels - if selected, URL must be provided
    const selectedChannelsWithoutURL = Object.keys(formData.sellingChannels).filter(
      channel => 
        formData.sellingChannels[channel]?.selected && 
        (!formData.sellingChannels[channel]?.name || 
         formData.sellingChannels[channel]?.name.trim() === '')
    );

    if (selectedChannelsWithoutURL.length > 0) {
      Toast(`Please enter URL for: ${selectedChannelsWithoutURL.join(', ')}`);
      return;
    }

    // Validate channel URLs format for selected channels with URLs
    const channelsWithInvalidURLs: string[] = [];
    const newChannelErrors: {[key: string]: string} = {};
    Object.keys(formData.sellingChannels).forEach(channel => {
      const channelData = formData.sellingChannels[channel];
      if (channelData?.selected && channelData?.name && channelData.name.trim() !== '') {
        const urlError = ValidationUtils.isValidURL(channelData.name);
        if (urlError) {
          channelsWithInvalidURLs.push(channel);
          newChannelErrors[channel] = urlError;
        }
      }
    });

    if (channelsWithInvalidURLs.length > 0) {
      setChannelUrlErrors(prev => ({...prev, ...newChannelErrors}));
      Toast(`Invalid URL for: ${channelsWithInvalidURLs.join(', ')}`);
      return;
    }

if(isJewelleryCategorySelected){
  if(!formData.bisCertificateFileName)
  {
    Toast("Please upload your BIS Certificate")
    return;
  }
}
    if (!formData.sellerExperience) {
      Toast('Select the Seller Experience');
      return;
    }
    if (formData.productCategories.length == 0) {
      ToastAndroid.show(
        'Select atleast one product Categories',
        ToastAndroid.SHORT,
      );
      return;
    }
    // if (formData.brand == 'Social' && formData.channels.length == 0) {
    //   ToastAndroid.show(
    //     'please fill what do you want to sell field',
    //     ToastAndroid.SHORT,
    //   );
    //   return;
    // }
    if (!formData.productCatalogLink) {
      if (formData.productCatalogFile.length == 0) {
        ToastAndroid.show(
          'Product Catlog field is required',
          ToastAndroid.SHORT,
        );
        return;
      }
    } else {
      // Validate catalog link URL if provided
      const urlError = ValidationUtils.isValidURL(formData.productCatalogLink);
      if (urlError) {
        setCatalogLinkError(urlError);
        ToastAndroid.show(urlError, ToastAndroid.SHORT);
        return;
      }
    }

    navigation.navigate('FourthTabContent', formData);
  };
  const deleteFormDataKey = async key => {
    try {
      console.log('Deleting from S3:', key);
      await deleteObjectFromS3(key);

      setFormData(prev => {
        const updated = {...prev};

        // Filter out the deleted file from the array
        updated.productCatalogFile = prev.productCatalogFile.filter(
          item => item !== key,
        );

        return updated;
      });

      // Also remove from local previews and signed URLs
      setLocalPreviews(prev => {
        const updatedPreviews = {...prev.productCatalogFile};
        delete updatedPreviews[key];
        return {...prev, productCatalogFile: updatedPreviews};
      });
      setSignedUrls(prev => {
        const updatedUrls = {...prev.productCatalogFile};
        delete updatedUrls[key];
        return {...prev, productCatalogFile: updatedUrls};
      });

      console.log('Deleted from formData as well:', key);
    } catch (err) {
      console.log('Deletion failed:', err);
    }
  };
  const deleteFormDatafssaiKey = async (type) => {
    try {
      // console.log('Deleting from S3:', key);
      if(type=="fssai"){
        await deleteObjectFromS3(formData.fssaiCertificate);

        setFormData(prev => {
          const updated = {...prev};
          updated.fssaiCertificate = '';
          return updated;
        });
        // Clear local preview and signed URL
        setLocalPreviews(prev => ({...prev, fssaiCertificate: null}));
        setSignedUrls(prev => ({...prev, fssaiCertificate: null}));
      } else if(type=='bis'){
        await deleteObjectFromS3(formData.bisCertificateFileName);

        setFormData(prev => {
          const updated = {...prev};
          updated.bisCertificateFileName = '';
          return updated;
        });
        // Clear local preview and signed URL
        setLocalPreviews(prev => ({...prev, bisCertificateFileName: null}));
        setSignedUrls(prev => ({...prev, bisCertificateFileName: null}));
      } else {
        await deleteObjectFromS3(formData.qualityCertificateFileName);

        setFormData(prev => {
          const updated = {...prev};
          updated.qualityCertificateFileName = '';
          return updated;
        });
        // Clear local preview and signed URL
        setLocalPreviews(prev => ({...prev, qualityCertificateFileName: null}));
        setSignedUrls(prev => ({...prev, qualityCertificateFileName: null}));
      }
    } catch (err) {
      console.log('Deletion failed:', err);
    }
  };

  // console.log(formData.productCatalogFile)
  return (
    <>
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#777" size={'small'} />
        </View>
      ) : null}
      <FAQHelpBottomSheet
        rbSheetRef={rbSheetRef}
        currentTabIndex={2} // 0, 1, 2, or 3
      />
      <OnboardingStatusWidget
        title="Your Onboarding Status"
        tasksConfig={brand}
        formData={formData}
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
      />

      <SafeAreaView style={[styles.container]} edges={['top', 'left', 'right']}>
        <SellerHeader navigation={navigation} message={'Seller Info'} />
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
          <ScrollView 
            contentContainerStyle={{padding: 20, flexGrow: 1, paddingBottom: 20}}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/*  */}
            <HorizontalTimeline
              activeIndex={2}
              // totalDots={4}
              activeDotColor="#FFD700"
              inactiveDotColor="#9CA3AF"
              text="Business & KYC Verification"
              activeLineColor="#FFD700"
              inactiveLineColor="#333"
              showStepNumbers={true}
            />
            {/* Seller Experience */}
            <View style={styles.section}>
              <View style={{flexDirection: 'row', gap: 10}}>
                {/* <Ionicons name="time-outline" size={20} color="#333" /> */}
                <Text style={styles.sectionTitle}>
                  Years of Selling Experience{' '}
                  {/* <Text style={{color: 'red'}}>*</Text> */}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={1}
                onPress={() => sellerExperienceDropdownRef.current?.open()}>
                <Dropdown
                  ref={sellerExperienceDropdownRef}
                  data={[
                    {label: '3+ years', value: '3'},
                    {label: '1-3 years', value: '1'},
                    {label: 'New Seller (<1 year)', value: '0'},
                  ]}
                  labelField={'label'}
                  style={styles.dropdown}
                  activeColor="transparent"
                  value={formData.sellerExperience}
                  selectedTextStyle={{color: '#FFD700'}}
                  itemTextStyle={{color: '#fff'}}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  placeholder="select your experience"
                  placeholderStyle={{color: '#777'}}
                  onChange={item =>
                    handleInputChange('sellerExperience', item.value)
                  }
                  valueField={'value'}
                />
              </TouchableOpacity>
            </View>

            {/* Seller Channels */}
            <View style={styles.section}>
              <View style={{flexDirection: 'row', gap: 10}}>
                {/* <Ionicons name="earth" size={20} color="#333" /> */}
                <Text style={styles.sectionTitle}>Seller Channels </Text>
              </View>

              {/* Online Channels */}
              <View style={styles.channelSection}>
                <Text style={styles.sectionSubtitle}>Online Presence</Text>
                <View style={styles.channelList}>
                  {Object.keys(formData?.sellingChannels).map(platform => (
                    <View key={platform} style={styles.channelCard}>
                      <TouchableOpacity
                        onPress={() => handleSocialToggle(platform)}
                        style={styles.checkbox}>
                        {!formData?.sellingChannels[platform]?.selected ? (
                          <Ionicons
                            name="radio-button-off-sharp"
                            color="#FFD700"
                            size={16}
                          />
                        ) : (
                          <Octicons
                            name="check-circle-fill"
                            color="#FFD700"
                            size={16}
                          />
                        )}
                      </TouchableOpacity>
                      <Image
                        source={{uri: getSocialIcon(platform)}}
                        style={{width: 20, height: 20}}
                        resizeMode="contain"
                      />
                      {/* {} */}
                      <Text style={styles.channelName}>{platform}</Text>
                      {/* {&& ( 
                      // <View style={styles.usernameInput}>*/}
                      <View style={{width: '55%'}}>
                        <TextInput
                          style={[
                            styles.inputUsername,
                            {width: '100%'},
                            formData?.sellingChannels[platform]?.selected && {
                              borderColor: channelUrlErrors[platform] ? 'red' : '#FDD122',
                            },
                            channelUrlErrors[platform] && {borderColor: 'red'},
                          ]}
                          placeholder={`Enter ${platform} profile/store url`}
                          value={formData?.sellingChannels[platform]?.name}
                          placeholderTextColor={'#fff'}
                          onChangeText={text =>
                            handleUsernameChange(platform, text)
                          }
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                        {channelUrlErrors[platform] ? (
                          <Text style={styles.channelErrorText}>{channelUrlErrors[platform]}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Offline Channels */}
              <View>
                <Text style={styles.sectionSubtitle}>
                  Offline Presence
                  {/* <Text style={{color: 'red'}}>*</Text> */}
                </Text>
                {['Physical Store', 'Trade Faire', 'Direct Selling'].map(
                  item => (
                    <TouchableOpacity
                      key={item} // Add a key for performance and warning-free rendering
                      style={[styles.offlineChannelButton]}
                      onPress={() => togglechannel(item)}>
                      {!formData.channels.includes(item) ? (
                        <Ionicons
                          name="radio-button-off-sharp"
                          color="#FFD700"
                          size={23}
                        />
                      ) : (
                        <Octicons
                          name="check-circle-fill"
                          color="#FFD700"
                          size={20}
                        />
                      )}
                      <Text style={[styles.offlineChannelText]}>{item}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            {/* Product Catlog */}
            <View style={styles.section}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                <Text style={styles.sectionTitle}>
                  Upload Product Catalog
                  <Text style={{color: 'red'}}>*</Text>
                </Text>
                {/* {formData.productCatalogFile.length > 0 && (
                  <Text style={{color: '#FFD700', fontSize: 12}}>
                    {formData.productCatalogFile.length}/10 images
                  </Text>
                )} */}
              </View>
              {/* <Text style={{color: '#777', fontSize: 12, marginBottom: 10}}>
                Upload up to 10 images or PDF files
              </Text> */}
              <View style={[styles.uploadButton]}>
                {formData.productCatalogFile.length !== 0 ? (
                  <ScrollView
                    horizontal
                    style={{flex: 1}}
                    contentContainerStyle={{alignItems: 'center', paddingHorizontal: 10}}>
                    {formData.productCatalogFile.map((key, index) => {
                      const localPreviewUri = localPreviews.productCatalogFile[key];
                      const signedUrl = signedUrls.productCatalogFile[key];
                      const isFetchingSignedUrl = fetchingSignedUrls.productCatalogFile[key];
                      
                      // Show loader if fetching signed URL and no local preview
                      if (isFetchingSignedUrl && !localPreviewUri) {
                        return (
                          <View key={key || index} style={{alignItems: 'center', marginRight: 10, width: 96, height: 96, justifyContent: 'center', backgroundColor: '#1B1B1B', borderRadius: 8}}>
                            <ActivityIndicator color="#fff" size="small" />
                          </View>
                        );
                      }
                      
                      return (
                        <PreviewUploads
                          key={key || index}
                          previewUrl={localPreviewUri || signedUrl || undefined}
                          isPDF={key?.endsWith('.pdf')}
                          name="products catalog"
                          isUploaded={true}
                          isLocalPreview={!!(localPreviewUri || signedUrl)}
                          onRemove={() => deleteFormDataKey(key)}
                        />
                      );
                    })}
                    {formData.productCatalogFile.length < 10 && (
                      <TouchableOpacity
                        onPress={() => pickAny('catlog')}
                        style={styles.addMoreButton}>
                        <View style={styles.addMoreIcon}>
                          <Ionicons name="add" size={30} color="#000" />
                        </View>
                        <Text style={styles.addMoreText}>Add More</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                ) : (
                  <TouchableOpacity
                    style={{alignItems: 'center'}}
                    onPress={() => pickAny('catlog')}>
                    <>
                      <View style={styles.uploadIcon}>
                        <UploadIcon size={25} color="#000" />
                      </View>
                      <Text style={styles.uploadButtonText}>
                        Click to upload
                      </Text>
                      <Text style={styles.uploadButtonText}>
                        Supports JPG, JPEG, PNG, PDF
                      </Text>
                    </>
                  </TouchableOpacity>
                )}
              </View>
              {/* <Text style={{textAlign: 'center', color: '#777'}}>Or</Text> */}
              <TextInput
                placeholder="Enter product Catlog link (e.g., https://drive.google.com/...)"
                placeholderTextColor={'#777'}
                value={formData.productCatalogLink}
                onChangeText={text => {
                  handleInputChange('productCatalogLink', text);
                  // Validate URL on change
                  const error = ValidationUtils.isValidURL(text);
                  setCatalogLinkError(error);
                }}
                style={[
                  styles.dropdown,
                  catalogLinkError ? {borderColor: 'red'} : {},
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {catalogLinkError ? (
                <Text style={styles.errorText}>{catalogLinkError}</Text>
              ) : null}
            </View>

            {/* Product Categories */}
            <View style={styles.section}>
              <View style={styles.categoryContainer}>
                <View style={{flexDirection: 'row', gap: 10}}>
                  {/* <Ionicons name="pricetags-outline" size={20} color="#333" /> */}
                  <Text style={styles.sectionTitle}>
                    Select Product Categories{' '}
                    <Text style={{color: 'red'}}>*</Text>
                  </Text>
                </View>

                <View style={styles.categoryList}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category._id || category.categoryName} // use a unique property
                      onPress={() => toggleCategory(category.categoryName)}
                      style={[
                        styles.categoryItem,
                        formData.productCategories.includes(
                          category.categoryName,
                        ) && styles.categorySelected,
                      ]}>
                      <TouchableOpacity
                        onPress={() => toggleCategory(category.categoryName)}>
                        {!formData.productCategories.includes(
                          category.categoryName,
                        ) ? (
                          <Ionicons
                            name="radio-button-off-sharp"
                            color="#FFD700"
                            size={16}
                          />
                        ) : (
                          <Octicons
                            name="check-circle-fill"
                            color="#FFD700"
                            size={16}
                          />
                        )}
                      </TouchableOpacity>

                      <Text
                        style={[
                          styles.categoryText,
                          formData.productCategories.includes(
                            category.categoryName,
                          ) && {
                            color: '#fff',
                          },
                        ]}>
                        {category.categoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            {isFoodBeveragesSelected && (
              <>
                <Text style={styles.sectionTitle}>
                  Upload FSSAI Certification{' '}
                  {/* <Text style={{color: 'red'}}>*</Text> */}
                </Text>
                {/* <Text>Google Drive Link / Images / Videos Link</Text> */}
                <View style={[styles.uploadButton]}>
                  <TouchableOpacity
                    style={{alignItems: 'center'}}
                    onPress={() => pickAny('fssai')}>
                    {fetchingSignedUrls.fssaiCertificate ? (
                      <>
                        <ActivityIndicator color="#fff" size="large" />
                        {/* <Text style={{color: '#777', marginTop: 10}}>Loading preview...</Text> */}
                      </>
                    ) : formData.fssaiCertificate ? (
                      <PreviewUploads
                        previewUrl={localPreviews.fssaiCertificate || signedUrls.fssaiCertificate || undefined}
                        onRemove={() => deleteFormDatafssaiKey('fssai')}
                        isUploaded={true}
                        isLocalPreview={!!(localPreviews.fssaiCertificate || signedUrls.fssaiCertificate)}
                        isPDF={formData.fssaiCertificate?.endsWith('.pdf')}
                        name="fssai "
                        s3Key={formData.fssaiCertificate}
                      />
                    ) : (
                      // <Text style={{color: 'green'}}>Image Submitted ✔</Text>
                      <>
                        <View style={styles.uploadIcon}>
                          <UploadIcon size={25} color="#000" />
                        </View>
                        <Text style={styles.uploadButtonText}>
                          FSSAI Certification
                        </Text>
                        <Text style={styles.uploadButtonText}>
                          Click to upload Supports JPG, JPEG, PNG, PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

{isJewelleryCategorySelected && (
              <>
                <Text style={styles.sectionTitle}>
                  Quality Certification{' '}
                  <Text style={{color: 'red'}}>*</Text>
                </Text>
                {/* <Text>Google Drive Link / Images / Videos Link</Text> */}
                <View style={[styles.uploadButton]}>
                  <TouchableOpacity
                    style={{alignItems: 'center'}}
                    onPress={() => pickAny('quality')}>
                    {fetchingSignedUrls.qualityCertificateFileName ? (
                      <>
                        <ActivityIndicator color="#fff" size="large" />
                        {/* <Text style={{color: '#777', marginTop: 10}}>Loading preview...</Text> */}
                      </>
                    ) : formData.qualityCertificateFileName ? (
                      <PreviewUploads
                        previewUrl={localPreviews.qualityCertificateFileName || signedUrls.qualityCertificateFileName || undefined}
                        onRemove={() => deleteFormDatafssaiKey('quality')}
                        isUploaded={true}
                        isLocalPreview={!!(localPreviews.qualityCertificateFileName || signedUrls.qualityCertificateFileName)}
                        name="quality certificate"
                        s3Key={formData.qualityCertificateFileName}
                      />
                    ) : (
                      // <Text style={{color: 'green'}}>Image Submitted ✔</Text>
                      <>
                        <View style={styles.uploadIcon}>
                          <UploadIcon size={25} color="#000" />
                        </View>
                        <Text style={styles.uploadButtonText}>
                        Quality Certification
                        </Text>
                        <Text style={styles.uploadButtonText}>
                          Click to upload Supports JPG, JPEG, PNG
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionTitle}>
                    BIS Certification
                  <Text style={{color: 'red'}}>*</Text>
                </Text>
                {/* <Text>Google Drive Link / Images / Videos Link</Text> */}
                <View style={[styles.uploadButton]}>
                  <TouchableOpacity
                    style={{alignItems: 'center'}}
                    onPress={() => pickAny('bis')}>
                    {fetchingSignedUrls.bisCertificateFileName ? (
                      <>
                        <ActivityIndicator color="#fff" size="large" />
                        {/* <Text style={{color: '#777', marginTop: 10}}>Loading preview...</Text> */}
                      </>
                    ) : formData.bisCertificateFileName ? (
                      <PreviewUploads
                        previewUrl={localPreviews.bisCertificateFileName || signedUrls.bisCertificateFileName || undefined}
                        onRemove={() => deleteFormDatafssaiKey('bis')}
                        isUploaded={true}
                        isLocalPreview={!!(localPreviews.bisCertificateFileName || signedUrls.bisCertificateFileName)}
                        name="BIS certificate"
                        s3Key={formData.bisCertificateFileName}
                      />
                    ) : (
                      // <Text style={{color: 'green'}}>Image Submitted ✔</Text>
                      <>
                        <View style={styles.uploadIcon}>
                          <UploadIcon size={25} color="#000" />
                        </View>
                        <Text style={styles.uploadButtonText}>
                          BIS Certification
                        </Text>
                        <Text style={styles.uploadButtonText}>
                          Click to upload Supports JPG, JPEG, PNG
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Live Selling Readiness 
            <View style={styles.section}>
              <View style={{flexDirection: 'row', gap: 10}}>
                {/* <Ionicons name="camera-outline" size={25} color="#333" />
                <Text style={styles.sectionTitle}>
                  Live Selling Readiness
                   <Text style={{color: 'red'}}>*</Text> */}
            {/*  </Text>
              </View>

                       
              <View style={{flexDirection: 'row', gap: 10}}>
                <Ionicons name="reader" size={20} color="#333" />
                <Text> </Text>
              </View>
              <Dropdown
                data={question1}
                labelField={'value'}
                valueField={'name'}
                activeColor="transparent"
                selectedTextStyle={{color: '#FFD700'}}
                itemTextStyle={{color: '#fff'}}
                containerStyle={{
                  marginBottom: 10,
                  backgroundColor: '#212121',
                  borderColor: '#FFD700',
                  borderWidth: 1,
                  borderRadius: 10,
                }}
                placeholderStyle={{color: '#777'}}
                style={[styles.dropdown]}
                placeholder="How ofter can you go live?"
                value={formData.liveSellingFrequency}
                onChange={value =>
                  handleInputChange('liveSellingFrequency', value.name)
                }
              />

              <Text style={{color: '#fff'}}>
                Do you have a good camera & lighting setup
              </Text>
              <View style={[{marginTop: 10, flexDirection: 'row'}]}>
                <TouchableOpacity
                  style={[styles.backButton]}
                  onPress={() => handleInputChange('cameraSetup', true)}>
                  {!formData?.cameraSetup ? (
                    <Ionicons
                      name="radio-button-off-sharp"
                      color="#fff"
                      size={16}
                    />
                  ) : (
                    <Octicons
                      name="check-circle-fill"
                      color="#FFD700"
                      size={16}
                    />
                  )}
                  <Text
                    style={{
                      color: !formData.cameraSetup ? 'white' : '#FFD700',
                    }}>
                    {'Yes'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backButton]}
                  onPress={() => handleInputChange('cameraSetup', false)}>
                  {formData?.cameraSetup ? (
                    <Ionicons
                      name="radio-button-off-sharp"
                      color="#fff"
                      size={16}
                    />
                  ) : (
                    <Octicons
                      name="check-circle-fill"
                      color="#FFD700"
                      size={16}
                    />
                  )}
                  <Text
                    style={{
                      color: formData.cameraSetup ? 'white' : '#FFD700',
                    }}>
                    {'No'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>*/}

            {brand == 'Social' && (
              <>
                <Text style={styles.checkboxText}>
                  What do you want to sell?
                  <Text style={{fontSize: 14, color: '#777'}}>
                    {' '}
                    (select Multiple)
                    {/* <Text style={{color: 'red'}}>*</Text> */}
                  </Text>
                </Text>

                {sellingTypes.map(item => {
                  return (
                    <TouchableOpacity
                      style={[
                        styles.offlineChannelButton,
                        {
                          backgroundColor: formData.wantToSell.includes(item)
                            ? '#F7CE45'
                            : '#333',
                          padding: 10,
                          flexDirection: 'row',
                          gap: 5,
                        },
                      ]}
                      onPress={() => togglesellingtypes(item)}
                      key={item}>
                      <Text
                        style={[
                          styles.offlineChannelText,
                          {
                            color: !formData.wantToSell.includes(item)
                              ? 'white'
                              : 'black',
                          },
                        ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            {/* <View style={{flexDirection: 'row', gap: 10, width: '90%'}}> */}
            {/* <Ionicons name="beer" size={20} color="#333" /> 
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: '#fff',
                      marginTop: 15,
                    }}>
                    Want Flykup's help with brand deals?
                  </Text>
                  {/* </View> 
                  <View
                    style={[
                      {marginTop: 10, marginBottom: 10, flexDirection: 'row'},
                    ]}>
                    <TouchableOpacity
                      style={[styles.backButton]}
                      onPress={() =>
                        handleInputChange('wantBrandCollaborations', true)
                      }>
                      {!formData?.wantBrandCollaborations ? (
                        <Ionicons
                          name="radio-button-off-sharp"
                          color="#fff"
                          size={16}
                        />
                      ) : (
                        <Octicons
                          name="check-circle-fill"
                          color="#FFD700"
                          size={16}
                        />
                      )}
                      <Text
                        style={{
                          color: !formData.wantBrandCollaborations
                            ? 'white'
                            : '#FFD700',
                        }}>
                        {'Yes'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.backButton]}
                      onPress={() =>
                        handleInputChange('wantBrandCollaborations', false)
                      }>
                      {formData?.wantBrandCollaborations ? (
                        <Ionicons
                          name="radio-button-off-sharp"
                          color="#fff"
                          size={16}
                        />
                      ) : (
                        <Octicons
                          name="check-circle-fill"
                          color="#FFD700"
                          size={16}
                        />
                      )}
                      <Text
                        style={{
                          color: formData.wantBrandCollaborations
                            ? 'white'
                            : '#FFD700',
                        }}>
                        {'No'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              </>
            ) : null} */}
          </ScrollView>
          
          {/* Fixed buttons at the bottom */}
          <View style={styles.fixedButtonContainer}>
            <View style={[styles.buttonGroup]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.button, {paddingHorizontal: 50}]}>
                <Text style={[styles.buttonText]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: '#F7CE45',
                  },
                ]}
                onPress={handleNext}>
                <Text style={[styles.buttonText, {color: '#000'}]}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        <View className="absolute bottom-11 right-0">
          <CompactProgressFAB
            formData={formData}
            tasksConfig={brand}
            onPress={() => setShowProgress(true)}
          />
          <FABHelpButton onPress={() => openHelpSheet()} style={{bottom: 40}} />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    // padding: 15,
    flex: 1,
    backgroundColor: '#121212',
  },
  radioButton: {
    borderWidth: 2,
    borderColor: '#FFD700',
    height: 15,
    width: 15,
    borderRadius: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  subContainer: {
    backgroundColor: '#fde68a',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 10,
  },
  selectedButton: {
    backgroundColor: '#333',
  },
  uploadButtonText: {
    fontSize: 15,
    color: '#fcd34d',
    marginBottom: 10,
    // flexGrow:1,
    flexShrink:1
  },
  uploadIcon: {
    padding: 5,
    backgroundColor: '#FFD700',
    borderRadius: 40,
    alignItems: 'center',
  },
  uploadButton: {
     borderWidth: 1,
     marginBottom:10,
    borderRadius: 10,
    height: 150,
    backgroundColor: '#FDD1221A',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dotted',
  },

  progress: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  progressStep: {
    height: 10,
    width: 30,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  completed: {
    backgroundColor: '#333',
  },
  LSRT: {
    color: '#777',
    fontSize: 15,
  },
  sectionSubtitle: {
    color: '#777',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#333',
    gap: 10,
    // justifyContent: 'center',
    // paddingHorizontal: 10,
    marginRight: 15,
    borderRadius: 10,
    paddingVertical: 8,
    // width: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  dropdown: {
    height: 50,
    borderColor: '#1E1E1E',
    borderWidth: 1,
    backgroundColor: colors.primaryColor,
    elevation: 3,
    paddingRight: 10,
    color: '#fff',
    // backgroundColor: '#fff',
    borderRadius: 5,
    paddingLeft: 10,
  },
  section: {
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  fixedButtonContainer: {
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 10,
  },
  button: {
    borderWidth: 2,
    borderColor: '#F7CE45',

    paddingVertical: 8,
    paddingHorizontal: 50,
    flexDirection: 'row',
    gap: 10,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 14,
    color: '#F7CE45',
    fontWeight: 'bold',
  },
  channelSection: {
    marginBottom: 20,
  },
  channelList: {
    marginTop: 10,
  },
  channelCard: {
    // backgroundColor: '#fff',
    // padding: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  channelHeader: {
    flexDirection: 'row',
    // alignItems: 'center',
    // backgroundColor:'#fff'
  },
  checkbox: {
    // padding: 5,
    flexDirection: 'row',
    // alignItems: 'center',
    // gap: 10,
    // justifyContent:'space-evenly',
    // width:'100%'
  },
  checkboxText: {
    fontSize: 15,
    color: '#fff',
  },
  channelName: {
    // marginLeft: 10,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  usernameInput: {
    // marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputUsername: {
    color: '#fff',
    borderWidth: 1,
    // height:30,
    fontSize: 10,
    borderRadius: 5,
    paddingLeft: 10,
    width: '55%',
    borderColor: '#1E1E1E',
  },
  input: {
    borderWidth: 1,
    borderColor: '#777',
    padding: 8,
    marginLeft: 5,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#333',
    width: '90%',
  },
  offlineChannelButton: {
    // backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    // paddingVertical: 5,
    // paddingHorizontal: 10,
    // marginRight: 5,
    borderRadius: 5,
    marginVertical: 10,
  },
  offlineChannelText: {
    fontSize: 16,
    color: '#fff',
  },
  categoryContainer: {
    // backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  categoryInfo: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  categoryList: {
    marginTop: 5,
    // flexDirection: 'row',
    // flexWrap: 'wrap',
  },
  categoryItem: {
    paddingVertical: 5,
    // paddingHorizontal: 10,
    // borderWidth: 1,
    // borderColor: '#ccc',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 14,
    color: '#fff',
  },
  categorySelected: {
    // backgroundColor: '#333',
  },
  addMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  addMoreIcon: {
    width: 65,
    height: 65,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addMoreText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  channelErrorText: {
    color: 'red',
    fontSize: 9,
    marginTop: 2,
  },
});

export default SellerRegisterTab3;
