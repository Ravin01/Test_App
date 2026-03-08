import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ToastAndroid,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../../Utils/Api';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  ActivityIndicator,
  Checkbox,
  ProgressBar,
  RadioButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../../Context/AuthContext';
import { useAzureUpload } from '../../../Utils/Azure';
import ProductTabShopaAble from './ProductsListing/ProductsforLS';
import Video from 'react-native-video';
import DatePicker from 'react-native-date-picker';
import { checkPermission } from '../../../Utils/Permission';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  uploadImageToS3,
  uploadVideoToS3,
  AWS_CDN_URL,
  deleteObjectFromS3,
} from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import { getUtcIsoStringFromLocal, Toast } from '../../../Utils/dateUtils';
import Header from '../../Reuse/Header';
import CohostSelector from './CoHost/CohostSelector';
import SponsorSelector from './SponsorSelector';
import {
  ArrowLeftCircle,
  EarthIcon,
  Eye,
  FileText,
  Gift,
  Settings,
  ShoppingCart,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import ProductTypeToggles from './ProductsListing/ProductTypeToggles';
import BundleSaleTabContent from './ProductsListing/BundleSaleTabContent';
import bgaAxiosInstance, {
  checkBgaHealth,
} from '../../../Utils/bgaAxiosInstance';
import { Package } from 'lucide-react-native';
import useConfirmModal from '../../../hooks/useAlertModal';
import GlobalConfirmModal from '../../Reuse/AlertModal';
import { useDebouncedGoBack } from '../../../Utils/useDebouncedGoBack';
import SellerHeader from '../SellerForm/Header';
import auctionService from '../../Shows/Services/auctionService';
import giveawayService from '../../Shows/Services/giveawayService';
import { useSellerContext } from '../../../Context/SellerContext';


const LiveStreamForm = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  // State to store form values
  const [formValues, setFormValues] = useState({
    showTitle: '',
    date: '',
    time: '',
    category: '',
    subcategory: '',
    showNotes: '',
    streamingLanguage: 'tamil',
    hasCoHost: false,
    coHosts: [], // Use coHosts consistently
    //notes: "",
    enabledProductTypes: {
      buyNow: false,
      auction: false,
      giveaway: false,
      bundleSale: false,
    },
  });
  const { categories, user }: any = useContext(AuthContext);
  const { sellerCategories, categoriesLoaded, categoriesError } = useSellerContext();
  const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
  // const {uploadFileToAzure} = useAzureUpload();
  const [imageUrl, setImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setloading] = useState(false);

  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
  });
  const [selectedBundleSales, setSelectedBundleSales] = useState([]);
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const isFormSavedRef = useRef(false); // Use ref to track save status synchronously

  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const supportedTypes = [
    'video/mp4',
    'video/mov',
    'video/webm',
    'video/x-matroska', // .mkv
    'video/x-msvideo', // .avi
    'video/x-m4v', // .m4v
    'video/quicktime', // Alternative MIME type for .mov
    'video/avi', // Alternative MIME type for .avi
  ];
  // console.log(selectedProducts)
  const allowedCategories = sellerCategories
  const selectedCategoryObj = allowedCategories.find(
    cat => cat.categoryName === selectedCategory,
  );
  const categoryData = allowedCategories.map(cat => ({
    label: cat.categoryName,
    value: cat.categoryName,
  }));
  // console.log( user?.sellerInfo?.productCategories||user)
  // Prepare subcategory data for dropdown
  const subcategoryData =
    selectedCategoryObj?.subcategories?.map(sub => ({
      label: sub.name,
      value: sub.name,
    })) || [];

  const handleCoHostSelected = coHostsData => {
    setFormValues(prev => ({
      ...prev,
      hasCoHost: coHostsData.length > 0,
      coHosts: coHostsData, // coHostsData now holds { userId, userName, role, profileURL, companyName, sellerType }
    }));
    if (errors.coHost) {
      setErrors(prev => ({ ...prev, coHost: '' }));
    }
  };

  const handleClearCoHost = () => {
    setFormValues(prev => ({
      ...prev,
      hasCoHost: false,
      coHosts: [], // Clear array
    }));
  };

  const handleSponsorSelected = sponsor => {
    setSelectedSponsor(sponsor);
  };

  const parseDate = dateStr => {
    if (!dateStr) return new Date();
    const [month, day, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  // To format the date as "MM/DD/YYYY"
  const formatDate = d => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Helper to format time as "HH:MM AM/PM"
  const formatTime = date => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 -> 12 for AM
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // Helper to parse time string like "02:30 PM" into a Date object
  const parseTime = timeStr => {
    if (!timeStr) return new Date();
    const [time, modifier] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let date = new Date();
    date.setHours(modifier === 'PM' ? (+hours % 12) + 12 : +hours % 12);
    date.setMinutes(+minutes);
    date.setSeconds(0);
    return date;
  };

  const toggleTagSelection = tag => {
    setSelectedTags(prevSelectedTags => {
      if (prevSelectedTags.includes(tag)) {
        // Deselect the tag
        return prevSelectedTags.filter(item => item !== tag);
      } else {
        // Select the tag
        return [...prevSelectedTags, tag];
      }
    });
  };
  const handleChange = (field, value) => {
    setFormValues({ ...formValues, [field]: value });
    validateField(field, value);
  };
  const selectMedia = async type => {
    const hasPermission = await checkPermission('gallery');
    if (!hasPermission) {
      return;
    }

    const options = { mediaType: type, quality: 1 };

    launchImageLibrary(options, async response => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        console.error('Image Picker Error try again:', response.errorMessage);
        return;
      }
      const img = response.assets[0];
      const file = {
        uri: img.uri,
        name: img.fileName || `image_${Date.now()}.jpg`,
        type: img.type || 'image/jpeg',
        size: img.fileSize,
      };

      if (type === 'photo') {
        if (imageUrl) {
          await deleteObjectFromS3(imageUrl);
        }
        setloading(true);

        // const url =(await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL)) || '';
        const url = await uploadImageToS3(img.uri, 'liveThumbnails') || '';
        // console.log(url)
        setImageUrl(url);
        setloading(false);
        setImageUploadProgress(0);
        // console.log()
      } else if (type === 'video') {
        //   const videoDuration = response.assets[0].duration;
        const maxSize = 1 * 1024 * 1024 * 1024; // 1GB
        const maxDuration = 90; // seconds
        const video = response.assets[0];
        // console.log(video)

        const videoSize = video.fileSize;
        const videoDuration = video.duration;
        if (!supportedTypes.includes(video.type)) {
          ToastAndroid.show(
            'Unsupported video format. Supported formats: MP4, MOV, WEBM, MKV, AVI, M4V',
            ToastAndroid.SHORT,
          );
          return;
        }

        if (!videoSize || !videoDuration) {
          ToastAndroid.show(
            'Unable to read video properties.',
            ToastAndroid.SHORT,
          );
          return;
        }

        if (videoDuration > maxDuration) {
          ToastAndroid.show(
            `Video duration exceeds ${maxDuration} seconds. Your video is ${Math.round(
              videoDuration,
            )} seconds.`,
            ToastAndroid.SHORT,
          );
          return;
        }

        if (videoSize > maxSize) {
          ToastAndroid.show(
            'Video is too large (Max 1GB).',
            ToastAndroid.SHORT,
          );
          return;
        }
        if (videoUrl) {
          await deleteObjectFromS3(videoUrl);
        }
        setloading(true);
        // const url = (await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL)) || '';
        const url =
          (await uploadVideoToS3(img.uri, 'liveThumbnails', progress => {
            setVideoUploadProgress(progress);
          })) || '';
        // console.log(url)
        setVideoUrl(url);
        setVideoUploadProgress(0);
        setloading(false);
      }
    });
  };
  const validateField = (name, value) => {
    let errorMessage = '';

    switch (name) {
      case 'showTitle':
        if (!value) {
          errorMessage = 'Title is required';
        } else if (value.length < 10) {
          errorMessage = `Title must be at least 10 characters (currently ${value.length})`;
        } else if (value.length > 150) {
          errorMessage = `Title cannot exceed 150 characters (currently ${value.length})`;
        }
        break;
      case 'showNotes':
        if (value) {
          if (value.length > 500) {
            errorMessage = `Notes cannot exceed 500 characters (currently ${value.length})`;
          }
        }
        break;
      case 'time':
        const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/; // Regex for HH:MM AM/PM format

        if (!value) {
          errorMessage = 'Time is required';
        } else if (!timeRegex.test(value)) {
          errorMessage = 'Invalid time format. Please use HH:MM AM/PM';
        }
        break;
      case 'date':
        if (!value) {
          errorMessage = 'Date is required';
        } else {
          // Check if the date is in the correct format (MM/DD/YYYY)
          const datePattern =
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;
          if (!datePattern.test(value)) {
            errorMessage = 'Date must be in the format MM/DD/YYYY';
          } else {
            // Convert the input date to a Date object
            const inputDate = new Date(value.split('/').reverse().join('-'));

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set the time to midnight for comparison

            // Check if the input date is today or in the future
            if (inputDate < today) {
              errorMessage = 'Date must be today or in the future';
            }
          }
        }
        break;
      default:
        break;
    }

    setErrors(prevState => ({ ...prevState, [name]: errorMessage }));
  };
  const parseDateTime = (dateStr, timeStr) => {
    // Example inputs:
    // dateStr = "11/24/2025"
    // timeStr = "04:25 PM"

    const [month, day, year] = dateStr.split('/').map(Number);

    let [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes);
  };
  const validateForm = () => {
    let validationErrors = {};

    if (!formValues.showTitle)
      validationErrors.showTitle = 'Show Title is required';
    if (!formValues.date)
      validationErrors.date = 'Date is required';
    if (!formValues.time)
      validationErrors.time = 'Time is required';

    if (!selectedCategory)
      validationErrors.category = 'Category is required';
    if (!selectedSubCategory)
      validationErrors.subcategory = 'Subcategory is required';
    if (!formValues.streamingLanguage)
      validationErrors.streamingLanguage = 'Streaming Language is required';
    if (formValues.showNotes) {
      if (formValues.showNotes.length > 500) {
        validationErrors.showNotes = `Notes cannot exceed 500 characters (currently ${formValues.showNotes.length})`;
      }
    }

    // ====== FIXED DATE + TIME FUTURE VALIDATION ======
    if (formValues.date && formValues.time) {
      const selectedDateTime = parseDateTime(formValues.date, formValues.time);
      const now = new Date();

      if (selectedDateTime < now) {
        validationErrors.datetime = 'Please select a present or future date and time';
      }
    }

    return validationErrors;
  };

  const [bgaHealthStatus, setBgaHealthStatus] = useState({
    healthy: true,
    checked: false,
  });

  useEffect(() => {
    const checkBgaConnection = async () => {
      try {
        await checkBgaHealth();
        setBgaHealthStatus({ healthy: true, checked: true });
      } catch (error) {
        console.error('BGA Backend not available:', error);
        setBgaHealthStatus({ healthy: false, checked: true });
        Toast(
          'BGA Giveaway service is currently unavailable. Giveaway features may not work properly.',
        );
      }
    };

    checkBgaConnection();
  }, []);

  // console.log(selectedProducts,"Ad")
  const handleSubmit = async () => {
    const validationErrors = validateForm();
    // console.log(validationErrors)
    if (!imageUrl) {
      ToastAndroid.show('Choose an Image for thumbnail', ToastAndroid.SHORT);
      return;
    }
    // if (selectedTags.length <= 0) {
    //   ToastAndroid.show('Choose some Tags', ToastAndroid.SHORT);
    //   return;
    // }

    // if (formValues.hasCoHost && formValues?.coHosts?.length <= 0) {
    //   ToastAndroid.show(
    //     'Please select a co-host or disable the option.',
    //     ToastAndroid.SHORT,
    //   );
    //   return;
    // }

    // Check if at least one product type is enabled
    const hasEnabledProductType =
      formValues.enabledProductTypes.buyNow ||
      formValues.enabledProductTypes.auction ||
      formValues.enabledProductTypes.giveaway ||
      formValues.enabledProductTypes.bundleSale;

    if (hasEnabledProductType) {
      const { buyNow, auction, giveaway, bundleSale } = formValues.enabledProductTypes;

      if (buyNow && selectedProducts.buyNow.length <= 0 && selectedBundleSales.length <= 0) {
        ToastAndroid.show(
          'Choose a Buy Now product for stream.',
          ToastAndroid.SHORT,
        );
        return;
      }

      if (auction && selectedProducts.auction.length <= 0) {
        ToastAndroid.show(
          'Choose an Auction product for stream.',
          ToastAndroid.SHORT,
        );
        return;
      }

      if (giveaway && selectedProducts.giveaway.length <= 0) {
        ToastAndroid.show(
          'Choose a Giveaway product for stream.',
          ToastAndroid.SHORT,
        );
        return;
      }

      // if (bundleSale && selectedBundleSales.length <= 0) {
      //   ToastAndroid.show(
      //     'Choose at least one Bundle Sale for stream.',
      //     ToastAndroid.SHORT,
      //   );
      //   return;
      // }
    }

    if (Object.keys(validationErrors).length === 0) {
      setloading(true);

      const scheduledAtUTC = getUtcIsoStringFromLocal(
        formValues.date,
        formValues.time,
      );

      if (!scheduledAtUTC) {
        ToastAndroid.show(
          'Invalid date/time for UTC conversion.',
          ToastAndroid.SHORT,
        );
        setloading(false);
        return;
      }

      // ✅ INSTANT CREATE: Send MINIMAL payload WITHOUT giveaway AND auction products
      const payload = {
        title: formValues.showTitle,
        scheduledAt: scheduledAtUTC,
        category: selectedCategory,
        subCategory: selectedSubCategory,
        tags: selectedTags,
        thumbnailImage: imageUrl,
        previewVideo: videoUrl || null,
        language: formValues.streamingLanguage,
        buyNowProducts: selectedProducts.buyNow,
        auctionProducts: [], // ✅ EMPTY - Will be added later in background
        giveawayProducts: [], // ✅ EMPTY - Will be added later in background
        bundleSaleProducts: selectedBundleSales.map((b) => ({ // ✅ ADD BUNDLE SALES
          bundleSaleId: b.bundleSaleId,
          bundleOwnerSellerId: b.bundleOwnerSellerId,
        })),
        hasCoHost: formValues.hasCoHost,
        notes: formValues.showNotes,
        enabledProductTypes: formValues.enabledProductTypes,
      };

      console.log(`🚀 Creating show with minimal payload (auctions/giveaways will be added in background)...`, payload);

      try {
        const response = await api.post(`/shows/create`, payload);
        const showId = response.data?.data?._id;

        if (!showId) throw new Error('Show ID not received in response');

        // ✅ CREATION CODE
        if (
          (selectedProducts.auction.length > 0 ||
            selectedProducts.giveaway.length > 0) &&
          bgaHealthStatus.healthy
        ) {
          console.log(`🔄 Starting background BGA preparation...`);

          // Fire and forget - don't block the UI
          (async () => {
            try {
              // ========== AUCTION PREPARATION ==========
              if (selectedProducts.auction.length > 0) {
                console.log(
                  `🔨 Preparing ${selectedProducts.auction.length} auctions in background...`,
                );

                // Group auctions by productId
                const auctionProductGroups = new Map();
                selectedProducts.auction.forEach(auction => {
                  const key = auction.productId;
                  if (!auctionProductGroups.has(key)) {
                    auctionProductGroups.set(key, []);
                  }
                  auctionProductGroups.get(key).push(auction);
                });

                // Prepare auctions for each unique product (import auctionService at top)
                // const auctionService = require('../../Shows/Services/auctionService').default;

                const auctionPromises = Array.from(
                  auctionProductGroups.entries(),
                ).map(async ([productId, auctions]) => {
                  const firstAuction = auctions[0];
                  const quantity =
                    parseInt(firstAuction.auctionQuantity) || auctions.length;

                  const response = await auctionService.prepareAuctions({
                    productId: productId,
                    productTitle: firstAuction.title,
                    productOwnerSellerId:
                      user.sellerInfo?._id || user.sellerInfo || user._id,
                    startingPrice: parseFloat(firstAuction.startingPrice) || 0,
                    reservedPrice: parseFloat(firstAuction.reservedPrice) || 0,
                    quantity: quantity,
                    streamId: showId,

                    preBidsEnabled: firstAuction.preBidsEnabled !== false, // Default to true if not specified
                    preBidMinIncrement: firstAuction.preBidsEnabled !== false ? (parseInt(firstAuction.preBidIncrement) || 50) : undefined
                  });

                  if (!response.success || !response.data?.auctions) {
                    console.error('Invalid BGA auction response:', response);
                    return [];
                  }

                  const auctionIds = response.data.auctions.map(a => a._id);
                  console.log(
                    `✅ Background: Created ${auctionIds.length} auction ID(s) for ${firstAuction.title}`,
                  );

                  return auctionIds;
                });

                const auctionResults = await Promise.all(auctionPromises);
                const allAuctionIds = auctionResults.flat();

                // Update show with auction product references
                if (allAuctionIds.length > 0) {
                  // Expand auction products based on auctionQuantity
                  const auctionProductsPayload = [];

                  selectedProducts.auction.forEach(a => {
                    const quantity = parseInt(a.auctionQuantity) || 1;

                    for (let i = 0; i < quantity; i++) {
                      auctionProductsPayload.push({
                        productId: a.productId,
                        productOwnerSellerId:
                          user.sellerInfo?._id || user.sellerInfo || user._id,
                        startingPrice: parseFloat(a.startingPrice) || 0,
                        reservedPrice: parseFloat(a.reservedPrice) || 0,
                        auctionObjectId: allAuctionIds.shift(), // consume next ID,

                        preBidsEnabled: a.preBidsEnabled !== false, // Default to true
                        preBidIncrement: parseInt(a.preBidIncrement) || 50, // Default increment 
                      });
                    }
                  });


                  await api.patch(`/shows/${showId}/products`, {
                    auctionProducts: auctionProductsPayload,
                  });
                  console.log(
                    `✅ Background: Added ${auctionProductsPayload.length} auction products to show`,
                  );
                }
              }

              // ========== GIVEAWAY PREPARATION ==========
              if (selectedProducts.giveaway.length > 0) {
                console.log(`🎁 Preparing ${selectedProducts.giveaway.length} giveaways in background...`);

                // 1️⃣ Duplicate giveaways by giveawayQuantity
                const expandedGiveaways = [];
                selectedProducts.giveaway.forEach(g => {
                  const count = parseInt(g.giveawayQuantity) || 1;

                  for (let i = 0; i < count; i++) {
                    expandedGiveaways.push({
                      ...g,
                      giveawayQuantity: 1, // each expanded is treated as single
                    });
                  }
                });

                console.log(`➡️ Expanded to ${expandedGiveaways.length} items`);

                // 2️⃣ Group by productId
                const productGroups = new Map();
                expandedGiveaways.forEach(giveaway => {
                  const key = giveaway.productId;
                  if (!productGroups.has(key)) productGroups.set(key, []);
                  productGroups.get(key).push(giveaway);
                });

                // 3️⃣ Process all groups
                const giveawayPromises = Array.from(productGroups.entries()).map(
                  async ([productId, giveaways]) => {
                    const first = giveaways[0];

                    const quantity = giveaways.length; // now correct (always expanded count)

                    const bgaPayload = {
                      productId,
                      productTitle: first.title,
                      productOwnerSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
                      scheduledAt: scheduledAtUTC,
                      quantity,
                      giveawayType: 'live',
                      giveawayTier: first.giveawayTier || 'silver',
                      isSponsored: first.isSponsored || false,
                      sponsoredBy: first.sponsoredBy || null,
                      sponsorType: first.sponsorType || null,
                      ...(first.giveawayTier === 'diamond' && first.minWatchDuration ? { minWatchDuration: first.minWatchDuration } : {}),
                    };

                    const response = await bgaAxiosInstance.post('prepare', bgaPayload);

                    if (!response.data.success || !response.data.data?.giveaways) {
                      console.error('Invalid BGA response:', response.data);
                      return [];
                    }

                    return response.data.data.giveaways.map(g => g._id);
                  },
                );

                const results = await Promise.all(giveawayPromises);
                const allGiveawayIds = results.flat();

                // 4️⃣ Bulk update with stream ID
                if (allGiveawayIds.length > 0) {
                  await giveawayService.bulkUpdateGiveaways(
                    allGiveawayIds,
                    showId,
                    { requireAutoFollow: false }
                  );

                  console.log(`✅ Background: Updated ${allGiveawayIds.length} giveaways with stream ID`);

                  // 5️⃣ Prepare show products payload
                  let idIndex = 0;
                  const giveawayProductsPayload = expandedGiveaways.map(g => ({
                    productId: g.productId,
                    productTitle: g.title,
                    productOwnerSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
                    giveawayObjectId: allGiveawayIds[idIndex++],
                    requireAutoFollow: g.requireAutoFollow || false,
                    isSponsored: g.isSponsored || false,
                    sponsoredBy: g.sponsoredBy || null,
                    sponsorType: g.sponsorType || null,
                  }));

                  await api.patch(`/shows/${showId}/products`, {
                    giveawayProducts: giveawayProductsPayload,
                  });

                  console.log(`✅ Background: Added ${giveawayProductsPayload.length} giveaway products to show`);
                }
              }

            } catch (bgaError) {
              console.log(
                '⚠️ Background preparation failed (non-critical):',
                bgaError,
              );
            }
          })();
        }

        // Send sponsor invitation if sponsor is selected
        if (selectedSponsor) {
          try {
            await bgaAxiosInstance.post('/api/sponsor/create', {
              streamId: showId,
              sponsorSellerId: selectedSponsor.sellerId,
              hostSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
              showDetails: {
                title: formValues.showTitle,
                scheduledAt: scheduledAtUTC,
                thumbnail: imageUrl,
              },
              hostDetails: {
                businessName: user.businessName,
                userName: user.userName,
              },
              invitationMessage: `You're invited to sponsor "${formValues.showTitle}"`,
            });
            console.log(
              `✅ Sponsor invitation sent to ${selectedSponsor.businessName || selectedSponsor.userName
              }`,
            );
          } catch (sponsorErr) {
            console.log('Sponsor invitation error:', sponsorErr);
            // Non-critical error - don't block success message
          }
        }

        // Send co-host invites
        if (formValues.hasCoHost && formValues.coHosts?.length > 0) {
          try {
            const cohostUserIds = formValues.coHosts.map(
              cohost => cohost.userId,
            );

            const inviteResponse = await api.post(`cohost/invite/${showId}`, {
              cohostUserIds,
            });

            if (
              inviteResponse.status !== 200 &&
              inviteResponse.status !== 201
            ) {
              throw new Error(
                inviteResponse.data?.message || 'Co-host invites failed',
              );
            }

            const messages = [];
            if (formValues.coHosts.length > 0)
              messages.push(
                `co-host invites sent to ${formValues.coHosts.length} co-host(s)`,
              );
            if (selectedSponsor)
              messages.push(
                `sponsor invitation sent to ${selectedSponsor.businessName || selectedSponsor.userName
                }`,
              );

            ToastAndroid.show(
              `Show created successfully! ${messages.join(' and ')}.`,
              ToastAndroid.LONG,
            );
          } catch (inviteErr) {
            console.log('Co-host invite error:', inviteErr);
            ToastAndroid.show(
              `Show created but co-host invites failed: ${inviteErr?.response?.data?.message || inviteErr.message
              }`,
              ToastAndroid.LONG,
            );
          }
        } else {
          const message = selectedSponsor
            ? `Live show scheduled successfully! Sponsor invitation sent to ${selectedSponsor.businessName || selectedSponsor.userName
            }.`
            : 'Live show scheduled successfully!';
          ToastAndroid.show(message, ToastAndroid.LONG);
        }

        // Mark form as saved BEFORE attempting navigation
        isFormSavedRef.current = true;

        // Now that LiveStream doesn't have unmountOnBlur, goBack will work correctly
        navigation.goBack();

        ToastAndroid.show(
          `Show Scheduled on ${formValues.time}`,
          ToastAndroid.SHORT,
        );
      } catch (error) {
        console.log('error creating live', error);
        ToastAndroid.show(
          `Submission failed: ${error?.response?.data?.message || error.message
          }`,
          ToastAndroid.LONG,
        );
      } finally {
        setloading(false);
      }
    } else {

      Toast('Please fix the errors in the form before submitting.');
      setErrors(validationErrors);
    }
  };
  // console.log(selectedProducts)
  // Intercept back button press
  useEffect(() => {
    const handleBeforeRemove = (e: any) => {
      // If form was saved, allow navigation without warning
      if (isFormSavedRef.current) {
        return;
      }

      // Prevent default behavior
      e.preventDefault();

      // Show confirmation modal
      showModal({
        title: 'Unsaved Changes',
        content:
          'You have modified your livestreaming selection. Are you sure you want to leave without saving?',
        mode: 'normal',
        confirmText: 'Leave',
        cancelText: 'Stay',
        showIcon: false,
        onConfirm: () => {
          // Mark as saved to allow navigation
          isFormSavedRef.current = true;
          // Navigate back
          navigation.dispatch(e.data.action);
        },
      });
    };

    const unsubscribe = navigation.addListener('beforeRemove', handleBeforeRemove);

    return () => {
      unsubscribe();
    };
  }, [navigation, showModal]);
  const handleBundleSelect = (bundle) => {
    setSelectedBundleSales(prev => [...prev, {
      ...bundle,
      bundleSaleId: bundle._id
    }]);
  };

  const handleBundleRemove = (bundleId) => {
    setSelectedBundleSales(prev =>
      prev.filter(b => b.bundleSaleId !== bundleId)
    );
  };

  // console.log("Selected Products:", selectedProducts);
  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.overlay}>
          <View style={styles.overlayContainer}>
            <ActivityIndicator color="gray" size={20} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      ) : null}

      <SellerHeader navigation={navigation} message={'Schedule Show'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <FlatList
          data={[{ key: 'form-content' }]}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 50, padding: 16 }}
          renderItem={() => (
            <View>
              {/* Category Dropdown - MOVED TO FIRST */}
              <View style={styles.dropdownContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <MaterialIcons name="category" color="#fff" size={22} />
                  <Text style={styles.label}>
                    Category <Text className="text-red-600">*</Text>
                  </Text>
                </View>
                <Dropdown
                  data={categoryData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Category"
                  value={selectedCategory}
                  style={styles.dropdown}
                  activeColor="#333"
                  itemTextStyle={{ color: '#fff' }}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  onChange={item => setSelectedCategory(item.value)}
                />
                {errors.category && (
                  <Text style={styles.errorText}>{errors.category}</Text>
                )}
              </View>

              {/* Subcategory Dropdown */}
              <View style={styles.dropdownContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <MaterialIcons name="filter-none" color="#fff" size={22} />
                  <Text style={styles.label}>
                    SubCategory <Text className="text-red-600">*</Text>
                  </Text>
                </View>
                <Dropdown
                  data={subcategoryData || []}
                  onChange={item => setSelectedSubCategory(item.value)}
                  labelField="label"
                  valueField="value"
                  activeColor="#333"
                  itemTextStyle={{ color: '#fff' }}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  style={styles.dropdown}
                  placeholder="Select Subcategory"
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  value={selectedSubCategory}
                />
                {errors.subcategory && (
                  <Text style={styles.errorText}>{errors.subcategory}</Text>
                )}
              </View>

              {/* Show Title - MOVED AFTER CATEGORY */}
              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <MaterialIcons name="title" color="#fff" size={22} />
                  <Text style={styles.label}>
                    Show Title <Text className="text-red-600">*</Text>
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter engaging title for show"
                  placeholderTextColor="#777"
                  value={formValues.showTitle}
                  onChangeText={text => handleChange('showTitle', text)}
                />
                <View style={styles.inputFooter}>

                  <Text
                    style={[
                      styles.characterCount,
                      formValues.showTitle.length < 10 && { color: '#ff4444' },
                      formValues.showTitle.length >= 10 &&
                      formValues.showTitle.length <= 150 && { color: '#4CAF50' },
                    ]}>
                    {formValues.showTitle.length}/150 characters
                  </Text>

                  {errors.showTitle && (
                    <Text style={styles.errorText}>{errors.showTitle}</Text>
                  )}
                </View>
              </View>

              {/* Date */}
              <View
                style={[
                  styles.headerContainer,
                  { alignSelf: 'flex-start', marginBottom: 10 },
                ]}>
                <MaterialIcons name="date-range" color="#fff" size={22} />
                <Text style={styles.label}>
                  Date <Text className="text-red-600">*</Text>
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <TouchableOpacity
                  onPress={() => setOpen(true)}
                  style={styles.input}>
                  <Text style={{ color: formValues.date ? '#fff' : '#777' }}>
                    {formValues.date ? formValues.date : 'DD/MM/YYYY'}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  open={open}
                  date={parseDate(formValues.date)}
                  mode="date"
                  minimumDate={new Date()}
                  onConfirm={selectedDate => {
                    setOpen(false);
                    const formatted = formatDate(selectedDate);
                    handleChange('date', formatted);
                  }}
                  onCancel={() => {
                    setOpen(false);
                  }}
                />


                {errors?.date || errors?.datetime && (
                  <Text style={styles.errorText}>{errors?.date || errors?.datetime}</Text>
                )}
              </View>

              {/* Time */}
              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <MaterialIcons name="access-time" color="#fff" size={22} />
                  <Text style={styles.label}>
                    Time <Text className="text-red-600">*</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setTimeOpen(true)}
                  style={styles.input}>
                  <Text style={{ color: formValues.time ? '#fff' : '#777' }}>
                    {formValues.time || 'HH:MM AM/PM'}
                  </Text>
                </TouchableOpacity>

                <DatePicker
                  modal
                  open={timeOpen}
                  date={parseTime(formValues.time)}
                  mode="time"
                  // minimumDate={new Date()}
                  onConfirm={selectedTime => {
                    setTimeOpen(false);
                    const formatted = formatTime(selectedTime);
                    handleChange('time', formatted);
                  }}
                  onCancel={() => {
                    setTimeOpen(false);
                  }}
                />

                {errors?.time || errors?.datetime && (
                  <Text style={styles.errorText}>{errors.time || errors?.datetime}</Text>
                )}
              </View>

              {/* Tags
              <View
                style={[
                  styles.headerContainer,
                  {alignSelf: 'flex-start', marginBottom: 10},
                ]}>
                <AntDesign name="tago" color="#fff" size={22} />
                <Text style={styles.label}>Tags <Text className='text-red-600'>*</Text></Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.SecondaryColor, //'#252932',// '#f0f7ff',
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  elevation: 4,
                }}>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(true)}
                  style={styles.tagButton}>
                  <AntDesign name="plus" size={25} />
                  <Text>Add Tags</Text>
                </TouchableOpacity>
              </View> 

              <View style={styles.selectedTagsContainer}>
                {selectedTags.length > 0 ? (
                  selectedTags.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.selectedTag}
                      onPress={() => setIsModalVisible(true)}>
                      <Text style={{fontSize: 16}}>{item}</Text>
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={17}
                        color="red"
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{color: '#fff'}}>No tags selected</Text>
                )}
              </View>*/}

              <View style={styles.toggleheader}>
                <Settings size={20} color="#FFF" />
                <Text style={styles.label}>Enable product types</Text>
              </View>
              <ProductTypeToggles
                formData={formValues}
                setFormData={setFormValues}
                isAnyLoading={false}
              />

              {/* Bundle Sale Section - Moved here from ProductsforLS 
              {formValues.enabledProductTypes.buyNow && (
                <View style={styles.bundleSaleSection}>
                  <View style={styles.toggleheader}>
                    <Package size={20} color="#FFD700" />
                    <Text style={styles.label}>Bundle Sales</Text>
                  </View>
                  <BundleSaleTabContent
                    selected={selectedBundleSales}
                    onSelect={handleBundleSelect}
                    onRemove={handleBundleRemove}
                  />
                </View>
              )}*/}

              {(formValues.enabledProductTypes.buyNow ||
                formValues.enabledProductTypes.auction ||
                formValues.enabledProductTypes.giveaway) && (
                  <>
                    <View style={styles.toggleheader}>
                      <ShoppingCart size={20} color="#FFF" />
                      <Text style={styles.label}>Tag product1s *</Text>
                    </View>
                    <ProductTabShopaAble
                      editMode={false}
                      onSelectProducts={setSelectedProducts}
                      enabledProductTypes={formValues.enabledProductTypes}
                      selectedBundleSales={selectedBundleSales}
                      setSelectedBundleSales={setSelectedBundleSales}
                    />
                  </>
                )}


              {/* Selected Products Display Section */}
              {(selectedProducts.buyNow.length > 0 ||
                selectedProducts.auction.length > 0 ||
                selectedProducts.giveaway.length > 0) && (
                  <View style={styles.selectedProductsContainer}>
                    <View style={styles.selectedProductsHeader}>
                      <ShoppingCart size={22} color={colors.primaryButtonColor} />
                      <Text style={styles.selectedProductsTitle}>
                        Selected Products (
                        {selectedProducts.buyNow.length +
                          selectedProducts.auction.length +
                          selectedProducts.giveaway.length}
                        )
                      </Text>
                    </View>

                    {/* Buy Now Products */}
                    {selectedProducts.buyNow.length > 0 && (
                      <View style={styles.productTypeSection}>
                        <View style={styles.productTypeHeader}>
                          <View style={styles.productTypeBadge}>
                            <Text style={styles.productTypeBadgeText}>
                              BUY NOW
                            </Text>
                          </View>
                          <Text style={styles.productTypeCount}>
                            {selectedProducts.buyNow.length}{' '}
                            {selectedProducts.buyNow.length === 1
                              ? 'Product'
                              : 'Products'}
                          </Text>
                        </View>
                        {selectedProducts.buyNow.map((product, index) => (
                          <View
                            key={`buynow-${product.productId}-${index}`}
                            style={styles.productCard}>
                            {/* {console.log(product)} */}
                            <View style={styles.productImageContainer}>
                              {product?.imageUrl ? (
                                <Image
                                  source={{ uri: product.imageUrl }}
                                  style={styles.productImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.productImagePlaceholder}>
                                  <ShoppingCart size={20} color="#888" />
                                </View>
                              )}
                            </View>
                            <View style={styles.productDetails}>
                              <Text style={styles.productTitle} numberOfLines={2}>
                                {product.title}
                              </Text>
                              <View style={styles.productMetaRow}>
                                <Text style={styles.productPrice}>
                                  ₹{product.productPrice?.toLocaleString('en-IN')}
                                </Text>
                                {product.stock && (
                                  <Text style={styles.productStock}>
                                    Stock: {product.stock}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.productStatusBadge}>
                              <View style={styles.statusDot} />
                              <Text style={styles.productStatusText}>Ready</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Auction Products */}
                    {selectedProducts.auction.length > 0 && (
                      <View style={styles.productTypeSection}>
                        <View style={styles.productTypeHeader}>
                          <View
                            style={[
                              styles.productTypeBadge,
                              styles.auctionBadge,
                            ]}>
                            <Text style={styles.productTypeBadgeText}>
                              AUCTION
                            </Text>
                          </View>
                          {/* <Text style={styles.productTypeCount}>
                          {selectedProducts.auction.length}{' '}
                          {selectedProducts.auction.length === 1
                            ? 'Product'
                            : 'Products'}
                        </Text> */}
                        </View>
                        {selectedProducts.auction.map((product, index) => (
                          <View
                            key={`auction-${product.productId}-${index}`}
                            style={styles.productCard}>
                            <View style={styles.productImageContainer}>
                              {product?.imageUrl ? (
                                <Image
                                  source={{ uri: product.imageUrl }}
                                  style={styles.productImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.productImagePlaceholder}>
                                  <MaterialIcons
                                    name="gavel"
                                    size={20}
                                    color="#888"
                                  />
                                </View>
                              )}
                            </View>
                            <View style={styles.productDetails}>
                              <Text style={styles.productTitle} numberOfLines={2}>
                                {product.title}
                              </Text>
                              <View style={styles.productMetaRow}>
                                {product.startingPrice && <View>
                                  <Text style={styles.productMetaLabel}>
                                    Starting
                                  </Text>
                                  <Text style={styles.productPrice}>
                                    ₹
                                    {product.startingPrice?.toLocaleString(
                                      'en-IN',
                                    )}
                                  </Text>
                                </View>}
                                {product.reservedPrice && (
                                  <View>
                                    <Text style={styles.productMetaLabel}>
                                      Reserved
                                    </Text>
                                    <Text style={styles.productPrice}>
                                      ₹
                                      {product.reservedPrice?.toLocaleString(
                                        'en-IN',
                                      )}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <View style={styles.productStatusBadge}>
                              <View style={styles.statusDot} />
                              <Text style={styles.productStatusText}>Ready</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Giveaway Products */}
                    {selectedProducts.giveaway.length > 0 && (
                      <View style={styles.productTypeSection}>
                        <View style={styles.productTypeHeader}>
                          <View
                            style={[
                              styles.productTypeBadge,
                              styles.giveawayBadge,
                            ]}>
                            <Text style={styles.productTypeBadgeText}>
                              GIVEAWAY
                            </Text>
                          </View>
                          {/* <Text style={styles.productTypeCount}>
                          {selectedProducts.giveaway.length}{' '}
                          {selectedProducts.giveaway.length === 1
                            ? 'Product'
                            : 'Products'}
                        </Text> */}
                          {bgaHealthStatus.healthy ? (
                            <View style={styles.bgaStatusBadge}>
                              <View style={styles.bgaStatusDot} />
                              <Text style={styles.bgaStatusText}>BGA Ready</Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.bgaStatusBadge,
                                styles.bgaStatusBadgeError,
                              ]}>
                              <View
                                style={[
                                  styles.bgaStatusDot,
                                  styles.bgaStatusDotError,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.bgaStatusText,
                                  styles.bgaStatusTextError,
                                ]}>
                                BGA Unavailable
                              </Text>
                            </View>
                          )}
                        </View>
                        {selectedProducts.giveaway.map((product, index) => (
                          <View
                            key={`giveaway-${product.productId}-${index}`}
                            style={styles.productCard}>
                            <View style={styles.productImageContainer}>
                              {product?.imageUrl ? (
                                <Image
                                  source={{ uri: product.imageUrl }}
                                  style={styles.productImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.productImagePlaceholder}>
                                  <Gift size={20} color="#888" />
                                </View>
                              )}
                            </View>
                            <View style={styles.productDetails}>
                              <Text style={styles.productTitle} numberOfLines={2}>
                                {product.title}
                              </Text>
                              <View style={styles.productMetaRow}>
                                <Text style={styles.productMetaLabel}>
                                  Free Giveaway Item
                                </Text>
                              </View>
                            </View>
                            <View style={styles.productStatusBadge}>
                              <View style={styles.statusDot} />
                              <Text style={styles.productStatusText}>Ready</Text>
                            </View>
                          </View>
                        ))}

                        {!bgaHealthStatus.healthy && bgaHealthStatus.checked && (
                          <View style={styles.bgaWarningContainer}>
                            <MaterialIcons
                              name="warning"
                              size={16}
                              color="#EF4444"
                            />
                            <Text style={styles.bgaWarningText}>
                              BGA Giveaway service is unavailable. Giveaways may
                              not work during live streams.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <FileText color="#fff" size={22} />
                  {/* <MaterialIcons name="file-document-plus-outline"  /> */}
                  <Text style={styles.label}>
                    Show Notes <Text className="text-gray-400">(optional)</Text>
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, { maxHeight: 100 }]}
                  placeholder="Add any additional notes about your show..."
                  placeholderTextColor="#777"
                  multiline={true}
                  value={formValues.showNotes}
                  onChangeText={text => handleChange('showNotes', text)}
                />
                {/* <Text style={styles.errorText}>{FormData.showNotes.len}</Text> */}
                {/* {errors.showTitle && (
                )} */}
                <View style={styles.inputFooter}>

                  <Text
                    style={[
                      styles.characterCount,
                      formValues.showNotes.length >= 500 && { color: '#ff4444' },
                      // formValues.showNotes.length >= 10 &&
                      //   formValues.showNotes.length <= 500 && {color: '#4CAF50'},
                    ]}>
                    {formValues.showNotes.length}/500 characters
                  </Text>
                  {errors.showNotes && (
                    <Text style={styles.errorText}>{errors.showNotes}</Text>
                  )}
                </View>
              </View>

              <View style={styles.dropdownContainer}>
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginBottom: 10 },
                  ]}>
                  <AntDesign name="earth" color="#fff" size={22} />
                  <Text style={styles.label}>
                    Streaming Language <Text className="text-red-600">*</Text>
                  </Text>
                </View>
                <Dropdown
                  data={[
                    { value: 'hindi', label: 'Hindi' },
                    { value: 'bengali', label: 'Bengali' },
                    { value: 'telugu', label: 'Telugu' },
                    { value: 'marathi', label: 'Marathi' },
                    { value: 'tamil', label: 'Tamil' },
                    { value: 'urdu', label: 'Urdu' },
                    { value: 'gujarati', label: 'Gujarati' },
                    { value: 'kannada', label: 'Kannada' },
                    { value: 'malayalam', label: 'Malayalam' },
                    { value: 'odia', label: 'Odia' },
                    { value: 'punjabi', label: 'Punjabi' },
                    { value: 'assamese', label: 'Assamese' },
                    { value: 'maithili', label: 'Maithili' },
                    { value: 'sanskrit', label: 'Sanskrit' },
                    { value: 'english', label: 'English' },
                  ]}
                  labelField="label"
                  valueField="value"
                  style={styles.dropdown}
                  activeColor="#333"
                  itemTextStyle={{ color: '#fff' }}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  placeholder="Select Language"
                  value={formValues.streamingLanguage}
                  onChange={item =>
                    handleChange('streamingLanguage', item.value)
                  }
                  search
                  searchPlaceholder="Search a Language"
                  searchPlaceholderTextColor="#777"
                  inputSearchStyle={{ color: '#fff' }}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  renderRightIcon={() => (
                    <AntDesign name="earth" size={20} color="#fcd34d" /> // Custom icon here
                  )}
                />
                {errors.streamingLanguage && (
                  <Text style={styles.errorText}>
                    {errors.streamingLanguage}
                  </Text>
                )}
                <View
                  style={[
                    styles.headerContainer,
                    { alignSelf: 'flex-start', marginTop: 10, marginBottom: 10 },
                  ]}>
                  <Feather name="image" color="#fff" size={22} />
                  <Text style={styles.label}>
                    Thumbnail Image <Text className="text-red-600">*</Text>
                  </Text>
                </View>
                {/* {console.log(videoUrl)} */}


                <TouchableOpacity
                  style={[styles.upload]}
                  onPress={() => selectMedia('photo')}>
                  {imageUrl ? (
                    <>
                      <Image
                        source={{ uri: `${AWS_CDN_URL}${imageUrl}` }}
                        style={{ height: '70%', width: '70%' }}
                      />
                    </>
                  ) : (
                    <Text style={{ color: '#fcd34d' }}>
                      Click to Upload a Thumbnail Image
                    </Text>
                  )}
                  {imageUploadProgress > 0 ? (
                    <ProgressBar
                      progress={imageUploadProgress}
                      color={colors.primaryButtonColor}
                    />
                  ) : null}
                </TouchableOpacity>
                {/* Preview Video Section - Commented out as per requirement
                <View
                  style={[
                    styles.headerContainer,
                    {alignSelf: 'flex-start', marginTop: 10, marginBottom: 10},
                  ]}>
                  <Feather name="video" color="#fff" size={22} />
                  <Text style={styles.label}>Preview Video (9:16)</Text>
                  <Text style={{color: '#ccc'}}>(optional)</Text>
                </View>
                <TouchableOpacity
                  style={[styles.upload]}
                  onPress={() => selectMedia('video')}>
                  {videoUrl ? (
                    <Video
                      style={{height: '90%', width: '70%'}}
                      source={{uri: `${AWS_CDN_URL}${videoUrl}`}}
                      resizeMode="cover"
                      repeat={true}
                    />
                  ) : (
                    <Text style={{color: '#fcd34d'}}>
                      Click to Upload a Preview Video
                    </Text>
                  )}
                  {videoUploadProgress > 0 ? (
                    <ProgressBar
                      progress={videoUploadProgress}
                      color={colors.primaryButtonColor}
                    />
                  ) : null}
                </TouchableOpacity>
                */}
              </View>

              <CohostSelector
                onCoHostSelect={handleCoHostSelected}
                onClearCoHost={handleClearCoHost}
                isSubmitting={loading}
                isUploading={loading}
              />

              <SponsorSelector
                onSponsorSelected={handleSponsorSelected}
                isSubmitting={loading}
              />

              {/* {errors.coHost && (
                <Text style={styles.errorText}>{errors.coHost}</Text>
              )} */}

              {/* Submit Button */}

              <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                <Feather name="video" size={20} />
                <Text style={styles.buttonText}>Schedule a Live Stream</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </KeyboardAvoidingView>
      <GlobalConfirmModal
        visible={modalConfig.visible}
        onClose={hideModal}
        onConfirm={handleConfirm}
        title={modalConfig.title}
        content={modalConfig.content}
        mode={modalConfig.mode}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showIcon={modalConfig.showIcon}
        isLoading={modalConfig.isLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 17,
    backgroundColor: '#121212',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 5,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: 45,
    flex: 1,
    marginLeft: 10,
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  removeButton: {
    flexDirection: 'row',
    backgroundColor: '#ff5861',
    paddingVertical: 5,
    gap: 10,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  avatar: { height: 100, width: '20%', borderRadius: 10 },
  avatar1: { height: 100, width: '30%', borderRadius: 10 },
  empty: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 18,
    color: '#ccc',
  },
  productContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-evenly',
    marginBottom: 10,
    alignItems: 'center',
  },
  prductLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    elevation: 5,
    width: '100%',
    marginTop: 2,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    // borderWidth:1,
    // borderColor:'blue'
    // borderBottomWidth: 1,
    // borderBottomColor: 'blue',
  },
  tab: {
    paddingVertical: 8,
    flexDirection: 'row',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    // marginBottom: 10,
  },
  selectedTab: {
    backgroundColor: '#fbdd74',
    alignItems: 'center',
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    textTransform: 'capitalize',
    // color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedTabText: {
    color: 'black',
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
  overlayContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  selectedTagsContainer: {
    marginTop: 20,
    padding: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // justifyContent: 'center',
    borderColor: '#ccc',
    gap: 10,
    width: '90%',
    marginBottom: 10,
  },
  selectedTagsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  selectedTag: {
    fontSize: 16,
    padding: 5,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  tagButton: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 5,
    elevation: 3,
    // paddingHorizontal:10,
    backgroundColor: '#fcd34d',
    borderRadius: 10,
    // marginBottom: 10,
    width: '35%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upload: {
    borderWidth: 1,
    borderRadius: 10,
    height: 150,
    backgroundColor: '#FDD1221A',
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dotted',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent:'c'
    // marginBottom:20,
    marginTop: 10,
    alignSelf: 'center',
    gap: 10,
  },

  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 300,
    height: '60%',
    padding: 20,
    backgroundColor: colors.SecondaryColor,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 15,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 10,
    flex: 1, // Ensures the checkbox and text take up the available space
  },
  tagText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#fff',
  },
  columnWrapper: {
    justifyContent: 'space-between', // Adds space between the columns
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: colors.primaryButtonColor,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  headerText: {
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#404040',
    padding: 12,
    marginBottom: 5,
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#404040',
    padding: 12,
    marginBottom: 6,
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    // fontWeight: '600',
    color: '#fff',
    // marginBottom: 5,
  },
  button: {
    backgroundColor: '#fcd34d',
    padding: 12,
    borderRadius: 5,
    gap: 10,
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    // color: '#fff',
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#fff', //'#111827',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  toggleheader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 14,
  },

  bundleSaleSection: {
    marginTop: 16,
    marginBottom: 8,
  },

  // Selected Products Display Styles
  selectedProductsContainer: {
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  selectedProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  selectedProductsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productTypeSection: {
    marginBottom: 20,
  },
  productTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  productTypeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  auctionBadge: {
    backgroundColor: '#F59E0B',
  },
  giveawayBadge: {
    backgroundColor: '#8B5CF6',
  },
  productTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productTypeCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#404040',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    marginRight: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 18,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  productMetaLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fcd34d',
  },
  productStock: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  productStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1FAE5',
  },
  bgaStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065F46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  bgaStatusBadgeError: {
    backgroundColor: '#7F1D1D',
  },
  bgaStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  bgaStatusDotError: {
    backgroundColor: '#EF4444',
  },
  bgaStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D1FAE5',
  },
  bgaStatusTextError: {
    color: '#FCA5A5',
  },
  bgaWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#991B1B',
  },
  bgaWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },

  inputFooter: {
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    // alignItems: 'center',
    // marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
});

export default LiveStreamForm;
