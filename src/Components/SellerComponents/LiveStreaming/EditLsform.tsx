import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  Modal,
  FlatList,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import ProductTypeToggles from './ProductsListing/ProductTypeToggles';
import { Dropdown } from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import api from '../../../Utils/Api';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Checkbox, ProgressBar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../Reuse/Header';

import {
  ArrowLeftCircle,
  EarthIcon,
  Eye,
  X,
  Settings,
  ShoppingCart,
  FileText,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAzureUpload } from '../../../Utils/Azure';
import { GENERATE_IMAGE_SAS_URL } from '../../../../Config';
import Video from 'react-native-video';
import DatePicker from 'react-native-date-picker';
import { checkPermission } from '../../../Utils/Permission';
import {
  deleteObjectFromS3,
  uploadImageToS3,
  uploadVideoToS3,
  AWS_CDN_URL,
} from '../../../Utils/aws';
import { colors } from '../../../Utils/Colors';
import { getUtcIsoStringFromEditLocal, getUtcIsoStringFromLocal, getUtcIsoStringFromLocalEdit, Toast } from '../../../Utils/dateUtils';
import ProductTab from './ProductsListing/ProductsforLS';
import CohostSelector from './CoHost/CohostSelector';
import { AuthContext } from '../../../Context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManufacturer } from 'react-native-device-info';
import EditTaggedProducts from './ProductsListing/ProductsforLSEdit';
import giveawayService from '../../Shows/Services/giveawayService';
import bgaAxiosInstance, { checkBgaHealth } from '../../../Utils/bgaAxiosInstance';
import SellerHeader from '../SellerForm/Header';
import BundleSaleTabContent from './ProductsListing/BundleSaleTabContent';
import useConfirmModal from '../../../hooks/useAlertModal';
import GlobalConfirmModal from '../../Reuse/AlertModal';
import auctionService from '../../Shows/Services/auctionService';
import { useSellerContext } from '../../../Context/SellerContext';

const EditLsform = ({ navigation }) => {
  const { sellerCategories, } = useSellerContext();
  const [formValues, setFormValues] = useState({
    showTitle: '',
    date: '',
    time: '',
    streamingLanguage: '',
    hasCoHost: false,
    coHost: null,
    showNotes: "",
    enabledProductTypes: {
      buyNow: false,
      auction: false,
      bundleSale: false,
      showNotes: '',
      giveaway: false,
    },
  });


  const [show, setShow] = useState({});
  const { modalConfig, showModal, hideModal, handleConfirm } = useConfirmModal();
  const [imageUrl, setImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setloading] = useState(false);
  const route = useRoute();
  const data = route.params
  const { user } = useContext(AuthContext);

  const [selectedProducts, setSelectedProducts] = useState({
    buyNow: [],
    auction: [],
    giveaway: [],
  });

  // ✅ Store initial state to track what was removed
  const [initialGiveaways, setInitialGiveaways] = useState([]);
  const [bgaHealthStatus, setBgaHealthStatus] = useState({
    healthy: true,
    checked: false,
  });

  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const isFormSavedRef = useRef(false); // Use ref to track save status synchronously
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
  // Wrap setSelectedProducts in useCallback to prevent render-phase updates
  const handleProductsChange = useCallback(products => {
    setSelectedProducts(products);
  }, []);
  const removeImage = async key => {
    await deleteObjectFromS3(key);
    setImageUrl(null);
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
  // This now uses the selected date from formValues to avoid conflicts
  const parseTime = timeStr => {
    if (!timeStr) return new Date();

    const [time, modifier] = timeStr.split(' ');
    if (!time || !modifier) return new Date();

    const [hoursStr, minutesStr] = time.split(':');
    if (!hoursStr || !minutesStr) return new Date();

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return new Date();

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    // Use the selected date if available, otherwise use current date
    let date;
    if (formValues.date) {
      date = parseDate(formValues.date);
    } else {
      date = new Date();
    }

    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  };





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

  const [selectedBundleSales, setSelectedBundleSales] = useState([]);
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
        console.error('Image Picker Error: ', response.errorMessage);
        return;
      }
      const img = response.assets[0];

      if (type === 'photo') {
        if (imageUrl) {
          await deleteObjectFromS3(imageUrl);
        }
        setloading(true);
        const url =
          (await uploadImageToS3(img.uri, 'liveThumbnails')) || '';
        // const url =(await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL)) || '';
        // console.log(url)
        setImageUrl(url);
        setloading(false);
        setImageUploadProgress(0);
        // console.log()
      } else if (type === 'video') {
        //   const videoDuration = response.assets[0].duration;
        if (videoUrl) {
          await deleteObjectFromS3(videoUrl);
        }
        setloading(true);
        // const url =
        //   (await uploadFileToAzure(file, GENERATE_IMAGE_SAS_URL, {
        //     documentType: 'video/mp4',
        //     // other metadata as needed
        //   })) || '';
        const url =
          (await uploadVideoToS3(img.uri, 'liveThumbnails', progress => {
            setVideoUploadProgress(progress);
          })) || '';
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
          errorMessage = 'Title must be at least 10 characters';
        } else if (value.length > 150) {
          errorMessage = 'Title must not exceed 150 characters';
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
      case 'showNotes':
        if (value) {
          if (value.length > 500) {
            errorMessage = `Notes cannot exceed 500 characters (currently ${value.length})`;
          }
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
            // Validate that the date is not in the past
            const inputDate = new Date(value.split('/').reverse().join('-'));
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set the time to midnight for comparison

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


  function normalizeTime(input) {
    return input
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/\u202f/g, ' ')
      .replace(/：/g, ':')
      .trim()
      .toUpperCase();
  }

  function padDateToMMDDYYYY(input) {
    // Input is already in MM/DD/YYYY format, just ensure padding
    const [month, day, year] = input.split('/');
    return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year}`;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD for backend
  function convertToBackendDateFormat(dateStr) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Convert HH:MM AM/PM to HH:mm (24-hour format) for backend
  function convertToBackendTimeFormat(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let hours24 = parseInt(hours, 10);

    if (modifier === 'PM' && hours24 !== 12) {
      hours24 += 12;
    } else if (modifier === 'AM' && hours24 === 12) {
      hours24 = 0;
    }

    return `${String(hours24).padStart(2, '0')}:${minutes}`;
  }

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    // console.log(validationErrors)
    // return
    if (!imageUrl) {
      ToastAndroid.show('Choose an Image for thumbnail', ToastAndroid.SHORT);
      return;
    }
    if (formValues.hasCoHost && !formValues.coHost) {
      ToastAndroid.show("Please select a co-host or disable the option.", ToastAndroid.SHORT);
      return;
    }

    const hasEnabledProductType =
      formValues.enabledProductTypes.buyNow ||
      formValues.enabledProductTypes.auction ||
      formValues.enabledProductTypes.giveaway ||
      formValues.enabledProductTypes.bundleSale;

    if (hasEnabledProductType) {
      const { auction, giveaway } = formValues.enabledProductTypes;
      if (auction && selectedProducts.auction.length <= 0) {
        ToastAndroid.show('Choose an Auction product for stream.', ToastAndroid.SHORT);
        return;
      }
      if (giveaway && selectedProducts.giveaway.length <= 0) {
        ToastAndroid.show('Choose a Giveaway product for stream.', ToastAndroid.SHORT);
        return;
      }
    }

    if (Object.keys(validationErrors).length === 0) {
      setloading(true);
      try {
        const formattedDate = padDateToMMDDYYYY(formValues.date);
        const formattedTime = normalizeTime(formValues.time);


        // Convert date and time to backend format (YYYY-MM-DD and HH:mm)
        const backendDate = convertToBackendDateFormat(formattedDate);
        const backendTime = convertToBackendTimeFormat(formattedTime);
        const scheduledAtUTC = getUtcIsoStringFromEditLocal(backendDate, backendTime);

        // Extract coHost userId safely
        // let coHostId = null;
        // if (formValues.hasCoHost && formValues.coHost) {
        //   coHostId = formValues.coHost.userId || formValues.coHost._id || formValues.coHost;
        // }

        const showPayload = {
          title: formValues.showTitle,
          scheduledAt: scheduledAtUTC,
          tags: [],
          category: selectedCategory,
          date: backendDate,
          time: backendTime,
          subCategory: selectedSubCategory,
          thumbnailImage: imageUrl,
          notes: formValues.showNotes,
          previewVideo: videoUrl ? videoUrl : null,
          language: formValues.streamingLanguage,
          hasCoHost: formValues.hasCoHost || false,
          coHost: data?.item?.cohosts,
        };
        // console.log(showPayload)
        // 
        try {
          const showUpdateResponse = await api.put(`/shows/update/${show?._id}`, showPayload);
          //               // ========== API UPDATES ==========
        }
        catch (error) { console.log('Error updating show:', error.response.data); }


        // ===== FIND EXISTING & NEW AUCTION ITEMS =====
        // const currentAuctionIds = selectedProducts.auction
        //   .filter(a => a.auctionObjectId)
        //   .map(a => a.auctionObjectId);

        // Items that were removed
        // const removedAuctions = initialAuctions.filter(
        //   initial => initial.auctionObjectId && !currentAuctionIds.includes(initial.auctionObjectId)
        // );
        // const initialProductIds = initialAuctions.map(a => a.productId);
        // console.log("initial",initialProductIds)
        // const newAuctions = selectedProducts.auction.filter(
        //   a => !initialProductIds.includes(a.productId)
        // );

        // console.log("[newAuctions]",newAuctions.length);
        // // return;

        // if (newAuctions.length > 0 && bgaHealthStatus.healthy) {
        //   const auctionProductGroups = new Map();

        //   newAuctions.forEach(auction => {
        //     const key = auction.productId;
        //     if (!auctionProductGroups.has(key)) auctionProductGroups.set(key, []);
        //     auctionProductGroups.get(key).push(auction);
        //   });

        //   const auctionPromises = Array.from(auctionProductGroups.entries()).map(
        //     async ([productId, auctions]) => {
        //       const first = auctions[0];
        //       const quantity = parseInt(first.auctionQuantity) || auctions.length;
        // console.log("[AUCTION GROUP]",productId,quantity)
        //       const response = await auctionService.prepareAuctions({
        //         productId,
        //         productTitle: first.title,
        //         productOwnerSellerId: user.sellerInfo?._id || user._id,
        //         startingPrice: parseFloat(first.startingPrice) || 0,
        //         reservedPrice: parseFloat(first.reservedPrice) || 0,
        //         quantity,
        //         streamId: show?._id,
        //         preBidsEnabled: first.preBidsEnabled !== false,
        //         preBidMinIncrement: first.preBidsEnabled !== false
        //           ? parseInt(first.preBidIncrement) || 50
        //           : undefined
        //       });

        //       if (!response.success || !response.data?.auctions) {
        //         console.log("Invalid BGA auction response:", response);
        //         return [];
        //       }

        //       return response.data.auctions.map(a => a._id);
        //     }
        //   );

        //   const auctionResults = await Promise.all(auctionPromises);
        //   const newAuctionIds = auctionResults.flat();

        //   // ===== ASSIGN ONLY NEW IDs TO NEW AUCTIONS =====
        //   const auctionProductsPayload = [];

        //   newAuctions.forEach(a => {
        //     const qty = parseInt(a.auctionQuantity) || 1;

        //     for (let i = 0; i < qty; i++) {
        //       auctionProductsPayload.push({
        //         productId: a.productId,
        //         productOwnerSellerId: user.sellerInfo?._id || user._id,
        //         startingPrice: parseFloat(a.startingPrice) || 0,
        //         reservedPrice: parseFloat(a.reservedPrice) || 0,
        //         auctionObjectId: newAuctionIds.shift()
        //       });
        //     }
        //   });

        //   if (auctionProductsPayload.length > 0) {
        //     await api.patch(`/shows/${show?._id}/products`, {
        //       auctionProducts: auctionProductsPayload,
        //     });
        //   }
        // }
        // ========== DELETION LOGIC (ONLY DELETE IF ACTUALLY REMOVED) ==========

        // ✅ Delete removed giveaways (compare against initial state)
        const currentGiveawayIds = selectedProducts.giveaway
          .filter(g => g.giveawayObjectId)
          .map(g => g.giveawayObjectId);

        const removedGiveaways = initialGiveaways.filter(
          initial => initial.giveawayObjectId && !currentGiveawayIds.includes(initial.giveawayObjectId)
        );

        if (removedGiveaways.length > 0 && bgaHealthStatus.healthy) {
          const deleteGiveawayPromises = removedGiveaways.map(async (giveaway) => {
            try {
              await giveawayService.deleteGiveaway(giveaway.giveawayObjectId);
            } catch (error) {
              // Don't fail the whole operation if one delete fails
            }
          });

          await Promise.all(deleteGiveawayPromises);
        }
        // return
        // // ✅ Delete removed auctions (compare against initial state)
        // const currentAuctionIds = selectedProducts.auction
        //   .filter(a => a.auctionObjectId)
        //   .map(a => a.auctionObjectId);

        // const removedAuctions = initialAuctions.filter(
        //   initial => initial.auctionObjectId && !currentAuctionIds.includes(initial.auctionObjectId)
        // );

        // console.log("[REMOVED AUCTION]",initialAuctions)
        // console.log("[REMOVED AUCTION]",currentAuctionIds)
        // console.log("[REMOVED AUCTION]",removedAuctions)
        // return
        // if (removedAuctions.length > 0 && bgaHealthStatus.healthy) {
        //   console.log(`🗑️ Deleting ${removedAuctions.length} removed auctions...`);

        //   const deleteAuctionPromises = removedAuctions.map(async (auction) => {
        //     try {
        //       await auctionService.deleteAuction(auction.auctionObjectId);
        //       console.log(`✅ Deleted auction: ${auction.auctionObjectId}`);
        //     } catch (error) {
        //       console.error(`Failed to delete auction ${auction.auctionObjectId}:`, error);
        //       // Don't fail the whole operation if one delete fails
        //     }
        //   });

        //   await Promise.all(deleteAuctionPromises);
        //   console.log(`✅ Completed deletion of ${removedAuctions.length} auctions`);
        // }



        // 
        // }
        // ========== TAG PRODUCT PAYLOAD CREATION ==========


        // ========== AUCTION PREPARATION (NEW/UPDATED) ==========
        if (selectedProducts.auction.length > 0 && bgaHealthStatus.healthy) {
          const newAuctions = selectedProducts.auction.filter(a => !a.auctionObjectId);
          if (newAuctions.length > 0) {
            const auctionProductGroups = new Map();
            newAuctions.forEach(auction => {
              const key = auction.productId;
              if (!auctionProductGroups.has(key)) auctionProductGroups.set(key, []);
              auctionProductGroups.get(key).push(auction);
            });

            const auctionPromises = Array.from(auctionProductGroups.entries()).map(
              async ([productId, auctions]) => {
                const firstAuction = auctions[0];
                const quantity = parseInt(firstAuction.auctionQuantity) || auctions.length;
                const response = await auctionService.prepareAuctions({
                  productId,
                  productTitle: firstAuction.title,
                  productOwnerSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
                  startingPrice: parseFloat(firstAuction.startingPrice) || 0,
                  reservedPrice: parseFloat(firstAuction.reservedPrice) || 0,

                  quantity,
                  streamId: show?._id,
                  preBidsEnabled: firstAuction.preBidsEnabled !== false, // Default to true if not specified
                  preBidMinIncrement: firstAuction.preBidsEnabled !== false ? (parseInt(firstAuction.preBidIncrement) || 50) : undefined
                });
                if (!response.success || !response.data?.auctions) {
                  return [];
                }
                return response.data.auctions.map(a => a._id);
              }
            );

            const auctionResults = await Promise.all(auctionPromises);
            const allAuctionIds = auctionResults.flat();
            if (allAuctionIds.length > 0) {
              const auctionProductsPayload = [];
              newAuctions.forEach(async a => {
                const quantity = parseInt(a.auctionQuantity) || 1;
                for (let i = 0; i < quantity; i++) {
                  auctionProductsPayload.push({
                    productId: a.productId,
                    productOwnerSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
                    startingPrice: parseFloat(a.startingPrice) || 0,
                    reservedPrice: parseFloat(a.reservedPrice) || 0,
                    auctionObjectId: allAuctionIds.shift(),
                  });
                }
                await api.patch(`/shows/${show?._id}/products`, { auctionProducts: auctionProductsPayload });
              })
            }
          }

        }
        const tagProducts = {
          buyNowProducts: [],
          auctionProducts: [],
          giveawayProducts: [],
          bundleSaleProducts: selectedBundleSales.map(b => ({
            bundleSaleId: b.bundleSaleId,
            bundleOwnerSellerId: b.bundleOwnerSellerId,
          })),
        };

        // ---- BUY NOW (NO EXPANSION) ----
        selectedProducts.buyNow.forEach(p => {
          tagProducts.buyNowProducts.push({
            productId: p.productId,
            productPrice: parseFloat(p.productPrice),
          });
        });

        // ---- AUCTION (EXPAND BY auctionQuantity) ----
        selectedProducts.auction.forEach(a => {
          const qty = parseInt(a.auctionQuantity) || 1;
          // console.log("[AUCTION INSIDE]",a,qty)
          for (let i = 0; i < qty; i++) {
            tagProducts.auctionProducts.push({
              productId: a.productId,
              auctionObjectId: a.auctionObjectIdList
                ? a.auctionObjectIdList[i]
                : a.auctionObjectId,
              startingPrice: parseFloat(a.startingPrice),
              reservedPrice: parseFloat(a.reservedPrice),

              preBidsEnabled: a.preBidsEnabled !== false, // Default to true
              preBidIncrement: parseInt(a.preBidIncrement) || 50, // Default increment
            });
          }
        });

        // ---- GIVEAWAY (EXPAND BY giveawayQuantity) ----
        selectedProducts.giveaway.forEach(g => {
          const qty = parseInt(g.giveawayQuantity) || 1;

          for (let i = 0; i < qty; i++) {
            tagProducts.giveawayProducts.push({
              productId: g.productId,
              giveawayObjectId: g.giveawayObjectIdList
                ? g.giveawayObjectIdList[i]
                : g.giveawayObjectId,
              requireAutoFollow: Boolean(g.requireAutoFollow),
              giveawayTier: g.giveawayTier || 'silver',
              ...(g.giveawayTier === 'diamond' && g.minWatchDuration ? { minWatchDuration: g.minWatchDuration } : {}),
            });
          }
        });

        // ====== SEND FINAL TAG UPDATE ======
        const productTagResponse = await api.put(
          `/shows/tag/${show?._id}`,
          tagProducts
        );
        isFormSavedRef.current = true;

        // Now that LiveStream doesn't have unmountOnBlur, goBack will work correctly
        navigation.goBack();

        ToastAndroid.show('Show Updated Successfully', ToastAndroid.SHORT);
        // ========== GIVEAWAY PREPARATION (NEW/UPDATED) ==========
        if (selectedProducts.giveaway.length > 0 && bgaHealthStatus.healthy) {
          const newGiveaways = selectedProducts.giveaway.filter(g => !g.giveawayObjectId);
          if (newGiveaways.length > 0) {
            const expandedGiveaways = [];
            newGiveaways.forEach(g => {
              const count = parseInt(g.giveawayQuantity) || 1;
              for (let i = 0; i < count; i++) expandedGiveaways.push({ ...g, giveawayQuantity: 1 });
            });

            const productGroups = new Map();
            expandedGiveaways.forEach(giveaway => {
              const key = giveaway.productId;
              if (!productGroups.has(key)) productGroups.set(key, []);
              productGroups.get(key).push(giveaway);
            });

            const giveawayPromises = Array.from(productGroups.entries()).map(
              async ([productId, giveaways]) => {
                const first = giveaways[0];
                const quantity = giveaways.length;
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
              }
            );

            const results = await Promise.all(giveawayPromises);
            const allGiveawayIds = results.flat();
            if (allGiveawayIds.length > 0) {
              await giveawayService.bulkUpdateGiveaways(allGiveawayIds, show?._id, { requireAutoFollow: false });
              const giveawayProductsPayload = expandedGiveaways.map((g, i) => ({
                productId: g.productId,
                productTitle: g.title,
                productOwnerSellerId: user.sellerInfo?._id || user.sellerInfo || user._id,
                giveawayObjectId: allGiveawayIds[i],
                requireAutoFollow: g.requireAutoFollow || false,
                giveawayTier: g.giveawayTier || 'silver',
                ...(g.giveawayTier === 'diamond' && g.minWatchDuration ? { minWatchDuration: g.minWatchDuration } : {}),
                isSponsored: g.isSponsored || false,
                sponsoredBy: g.sponsoredBy || null,
                sponsorType: g.sponsorType || null,
              }));
              await api.patch(`/shows/${show?._id}/products`, { giveawayProducts: giveawayProductsPayload });
            }
          }
        }


      } catch (error) {
        // Error handling
        console.log('Error updating show:', error.response.data);
      } finally {
        setloading(false);
      }
    } else {
      setErrors(validationErrors);
      Toast('Please fix the errors in the form before submitting.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/shows/get/${data?.item?._id}`);
        const url = response.data.data.thumbnailImage;
        setShow(response.data.data);

        // Format date explicitly as MM/DD/YYYY to avoid locale issues
        const scheduledDate = new Date(data?.item?.scheduledAt);
        const formattedDate = formatDate(scheduledDate);
        const formattedTime = formatTime(scheduledDate);

        setFormValues({
          showTitle: data?.item?.title,
          date: formattedDate,
          time: formattedTime,
          streamingLanguage: data?.item?.language,
          hasCoHost: data?.item?.hasCoHost,
          showNotes: response.data.data?.notes || '',
          coHost: data?.item?.cohosts,
          enabledProductTypes: {
            buyNow:
              response?.data?.data?.enabledProductTypes?.buyNow ||
              response?.data?.data?.buyNowProducts?.length > 0 ||
              false,
            auction:
              response?.data?.data?.enabledProductTypes?.auction ||
              response?.data?.data?.auctionProducts?.length > 0 ||
              false,
            giveaway:
              response?.data?.data?.enabledProductTypes?.giveaway ||
              response?.data?.data?.giveawayProducts?.length > 0 ||
              false,
            bundleSale:
              response?.data?.data?.enabledProductTypes?.bundleSale ||
              response?.data?.data?.bundleSales?.length > 0 ||
              false,
          },
        });

        setSelectedCategory(data?.item?.category);
        setSelectedSubCategory(data?.item?.subCategory);
        setImageUrl(url);
        setVideoUrl(data?.item?.videoUrl);

        // ========== PROCESS AUCTIONS WITH GROUPING =========
        const auctionProducts = response.data.data.auctionProducts || [];
        const groupedAuctions = [];

        if (auctionProducts.length > 0) {
          // Group by productId
          const auctionMap = new Map();

          auctionProducts.forEach(auction => {
            const productId = auction.productId?._id || auction.productId;
            // console.log("[auction]",auction)
            if (!auctionMap.has(productId)) {

              auctionMap.set(productId, {
                productId: productId,
                title: auction.productId?.title || 'Unknown Product',
                startingPrice: auction.startingPrice,
                reservedPrice: auction.reservedPrice,
                productOwnerSellerId: auction.productOwnerSellerId,
                auctionQuantity: 1,
                auctionObjectIds: [auction.auctionObjectId], // Array of all IDs
                auctionObjectId: auction.auctionObjectId, // Keep first one for backward compatibility
                // Store full product object if needed
                ...auction.productId,
              });
            } else {
              // Additional occurrence - increment quantity and add ID
              const existing = auctionMap.get(productId);
              existing.auctionQuantity += 1;
              existing.auctionObjectIds.push(auction.auctionObjectId);
            }
          });

          // Convert Map to array
          groupedAuctions.push(...Array.from(auctionMap.values()));

          console.log('📦 Grouped Auctions:', groupedAuctions);
        }

        // ========== PROCESS GIVEAWAYS WITH GROUPING ==========
        const giveawayProducts = response.data.data.giveawayProducts || [];
        const groupedGiveaways = [];

        if (giveawayProducts.length > 0) {
          // Group by productId
          const giveawayMap = new Map();

          giveawayProducts.forEach(giveaway => {
            const productId = giveaway.productId?._id || giveaway.productId;

            if (!giveawayMap.has(productId)) {
              // First occurrence
              giveawayMap.set(productId, {
                productId: productId,
                title: giveaway.productId?.title || giveaway.productTitle || 'Unknown Product',
                productOwnerSellerId: giveaway.productOwnerSellerId,
                requireAutoFollow: giveaway.requireAutoFollow || false,
                giveawayTier: giveaway.giveawayTier || 'silver',
                isSponsored: giveaway.isSponsored || false,
                sponsoredBy: giveaway.sponsoredBy || null,
                sponsorType: giveaway.sponsorType || null,
                giveawayQuantity: 1,
                giveawayObjectIds: [giveaway.giveawayObjectId], // Array of all IDs
                giveawayObjectId: giveaway.giveawayObjectId, // Keep first one for backward compatibility
                // Store full product object if needed
                productData: giveaway.productId,
              });
            } else {
              // Additional occurrence
              const existing = giveawayMap.get(productId);
              existing.giveawayQuantity += 1;
              existing.giveawayObjectIds.push(giveaway.giveawayObjectId);
            }
          });

          // Convert Map to array
          groupedGiveaways.push(...Array.from(giveawayMap.values()));

          console.log('🎁 Grouped Giveaways:', groupedGiveaways);
        }

        // ========== SET ALL PRODUCTS ==========
        setSelectedProducts({
          buyNow: response.data.data.buyNowProducts || [],
          auction: groupedAuctions,
          giveaway: groupedGiveaways,
        });

        // ✅ Store initial state for deletion comparison
        setInitialGiveaways(groupedGiveaways);

        setSelectedBundleSales(response.data.data.bundleSales || []);

        console.log('✅ Loaded products for editing with quantities');
      } catch (error) {
        console.log('❌ Error loading show data:', error);
      }
    };

    fetchData();
  }, []);

  // Intercept back button press for unsaved changes warning
  useEffect(() => {
    let navigationUnsubscribe: (() => void) | null = null;

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
          'You have unsaved changes. Are you sure you want to leave without saving?',
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

    navigationUnsubscribe = navigation.addListener(
      'beforeRemove',
      handleBeforeRemove,
    );

    return () => {
      if (navigationUnsubscribe) {
        navigationUnsubscribe();
      }
    };
  }, [navigation, showModal]);

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // If form was saved, allow default back behavior
        if (isFormSavedRef.current) {
          return false;
        }

        // Show confirmation modal for unsaved changes
        showModal({
          title: 'Unsaved Changes',
          content:
            'You have unsaved changes. Are you sure you want to leave without saving?',
          mode: 'normal',
          confirmText: 'Leave',
          cancelText: 'Stay',
          showIcon: false,
          onConfirm: () => {
            // Mark as saved to allow navigation
            isFormSavedRef.current = true;
            // Navigate back
            navigation.goBack();
          },
        });

        // Return true to prevent default back behavior
        return true;
      },
    );

    return () => backHandler.remove();
  }, [navigation, showModal]);
  // console.log(show)

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
      {/* <Header /> */}
      <SellerHeader message="Edit Live Show" navigation={navigation} />
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back-circle-outline" size={30} color="white" />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Update Schedule</Text>
          </View>
        </LinearGradient>
      </View> */}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <FlatList
            data={[]}
            ListHeaderComponent={
              <View style={{ padding: 10 }}>
                <View style={styles.headerContainer}>
                  <Text style={[styles.headerText, { fontSize: 18 }]}>
                    Update a Scheduled Live Show
                  </Text>
                </View>

                <View>
                  {/* Show Title */}
                  <View style={styles.inputContainer}>
                    <View
                      style={[
                        styles.headerContainer,
                        { alignSelf: 'flex-start', marginBottom: 10 },
                      ]}>
                      {/* <MaterialIcons name="title" color="#fcd34d" size={25} /> */}
                      <Text style={styles.label}>Show Title *</Text>
                    </View>

                    <TextInput
                      style={[
                        styles.input,
                        errors.showTitle && { borderColor: '#ff4444', borderWidth: 2 },
                      ]}
                      placeholder="Enter engaging title (10-150 characters)"
                      placeholderTextColor={'#777'}
                      value={formValues.showTitle}
                      maxLength={150}
                      onChangeText={text => handleChange('showTitle', text)}
                    />
                    <View style={styles.inputFooter}>
                      {errors.showTitle && (
                        <Text style={styles.errorText}>{errors.showTitle}</Text>
                      )}
                      <Text
                        style={[
                          styles.characterCount,
                          formValues.showTitle.length < 10 && { color: '#ff4444' },
                          formValues.showTitle.length >= 10 &&
                          formValues.showTitle.length <= 150 && { color: '#4CAF50' },
                        ]}>
                        {formValues.showTitle.length}/150 characters
                      </Text>
                    </View>
                  </View>

                  {/* Date */}
                  <View
                    style={[
                      styles.headerContainer,
                      { alignSelf: 'flex-start', marginBottom: 10 },
                    ]}>
                    <MaterialIcons name="date-range" color="#eee" size={25} />
                    <Text style={styles.label}>Date *</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TouchableOpacity
                      onPress={() => setOpen(true)}
                      style={styles.input}>
                      <Text style={{ color: formValues.date ? '#fff' : '#777' }}>
                        {formValues.date ? formValues.date : 'MM/DD/YYYY'}
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
                      <MaterialIcons
                        name="access-time"
                        color="#eee"
                        size={25}
                      />
                      <Text style={styles.label}>Time *</Text>
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
                      minimumDate={(() => {
                        // Only restrict time if selected date is today
                        if (formValues.date) {
                          const selectedDate = parseDate(formValues.date);
                          const today = new Date();

                          // Check if selected date is today
                          if (
                            selectedDate.getDate() === today.getDate() &&
                            selectedDate.getMonth() === today.getMonth() &&
                            selectedDate.getFullYear() === today.getFullYear()
                          ) {
                            // Return current time as minimum
                            return today;
                          }
                        }
                        // No restriction for future dates
                        return undefined;
                      })()}
                      onConfirm={selectedTime => {
                        setTimeOpen(false);

                        // Validate that selected time is not in the past if date is today
                        if (formValues.date) {
                          const selectedDate = parseDate(formValues.date);
                          const today = new Date();

                          // Check if selected date is today
                          if (
                            selectedDate.getDate() === today.getDate() &&
                            selectedDate.getMonth() === today.getMonth() &&
                            selectedDate.getFullYear() === today.getFullYear()
                          ) {
                            // Check if selected time is in the past
                            if (selectedTime < today) {
                              ToastAndroid.show(
                                'Please select a future time for today',
                                ToastAndroid.SHORT
                              );
                              return;
                            }
                          }
                        }

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

                  {/* Category Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <View
                      style={[
                        styles.headerContainer,
                        { alignSelf: 'flex-start', marginBottom: 10 },
                      ]}>
                      {/* <MaterialIcons name="category" color="#fcd34d" size={25} /> */}
                      <Text style={styles.label}>Category *</Text>
                    </View>
                    <Dropdown
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
                      data={categoryData}
                      activeColor="#333"
                      itemTextStyle={{ color: '#fff' }}
                      containerStyle={{
                        marginBottom: 10,
                        backgroundColor: '#212121',
                        borderColor: '#FFD700',
                        borderWidth: 1,
                        borderRadius: 10,
                      }}
                      labelField="label"
                      valueField="value"
                      placeholder="Select Category"
                      value={selectedCategory}
                      style={styles.dropdown}
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
                      {/* <MaterialIcons name="filter-none" color="#fcd34d" size={25} /> */}
                      <Text style={styles.label}>SubCategory *</Text>
                    </View>
                    <Dropdown
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
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
                      value={selectedSubCategory}
                    />
                    {errors.subcategory && (
                      <Text style={styles.errorText}>{errors.subcategory}</Text>
                    )}
                  </View>
                  {/* <EditTaggedProducts showId={data?.item?._id}/> */}

                  {/* <View
                  style={[
                    styles.headerContainer,
                    {alignSelf: 'flex-start', marginBottom: 10},
                  ]}>
                  <Text style={styles.label}>Tags *</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(true)}
                  style={styles.tagButton}>
                  <AntDesign name="plus" size={25} />
                  <Text>Add Tags</Text>
                </TouchableOpacity>
                <View style={styles.selectedTagsContainer}>
                  {selectedTags.length > 0 ? (
                    selectedTags.map((item, index) => (
                      <Text key={index} style={styles.selectedTag}>
                        {item}
                      </Text>
                    ))
                  ) : (
                    <Text style={{color: '#fff'}}>No tags selected</Text>
                  )}
                </View> */}
                  <View style={styles.inputContainer}>
                    <View
                      style={[
                        styles.headerContainer,
                        { alignSelf: 'flex-start', marginBottom: 10 },
                      ]}>
                      <FileText color="#fff" size={22} />
                      {/* <MaterialIcons name="file-document-plus-outline"  /> */}
                      <Text style={styles.label}>
                        Show Notes{' '}
                        <Text className="text-gray-400">(optional)</Text>
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

                  <View>
                    <View style={styles.toggleheader}>
                      <Settings size={20} color="#FFF" />
                      <Text style={styles.label}>Enable product types</Text>
                    </View>
                    <ProductTypeToggles
                      formData={formValues}
                      setFormData={setFormValues}
                      isAnyLoading={false}
                    />
                  </View>
                  {data?.item &&
                    (formValues?.enabledProductTypes?.buyNow ||
                      formValues?.enabledProductTypes?.auction ||
                      formValues?.enabledProductTypes?.giveaway) ? (
                    <>
                      <View style={styles.toggleheader}>
                        <ShoppingCart size={20} color="#FFF" />
                        <Text style={styles.label}>Tag products *</Text>
                      </View>
                      <ProductTab
                        editMode={true}
                        initialData={selectedProducts}
                        setSelectedBundleSales={setSelectedBundleSales}
                        selectedBundleSales={selectedBundleSales}
                        onSelectProducts={handleProductsChange}
                        show={show}
                        enabledProductTypes={formValues.enabledProductTypes}
                      />
                    </>
                  ) : null}
                  {/* {formValues?.enabledProductTypes?.bundleSale &&<BundleSaleTabContent
onRemove={handleBundleRemove}
onSelect={handleBundleSelect}
selected={selectedBundleSales}
/>} */}
                  {/* Streaming Language Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <View
                      style={[
                        styles.headerContainer,
                        { alignSelf: 'flex-start', marginBottom: 10 },
                      ]}>
                      {/* <AntDesign name="earth" color="#fcd34d" size={25} /> */}
                      <Text style={styles.label}>Streaming Language *</Text>
                    </View>
                    <Dropdown
                      placeholderStyle={styles.placeholderStyle}
                      selectedTextStyle={styles.selectedTextStyle}
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
                      activeColor="#333"
                      itemTextStyle={{ color: '#fff' }}
                      inputSearchStyle={{ color: '#fff' }}
                      containerStyle={{
                        marginBottom: 10,
                        backgroundColor: '#212121',
                        borderColor: '#FFD700',
                        borderWidth: 1,
                        borderRadius: 10,
                      }}
                      style={styles.dropdown}
                      placeholder="Select Language"
                      value={formValues.streamingLanguage}
                      onChange={item =>
                        handleChange('streamingLanguage', item.value)
                      }
                      search
                      searchPlaceholder="Search a Language"
                      searchPlaceholderTextColor="#777"
                      renderRightIcon={() => (
                        <AntDesign name="earth" size={20} color="#fff" /> // Custom icon here
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
                        {
                          alignSelf: 'flex-start',
                          marginTop: 10,
                          marginBottom: 10,
                        },
                      ]}>
                      {/* <Feather name="image" color="#fcd34d" size={25} /> */}
                      <Text style={styles.label}>Thumbnail Image *</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.upload,
                        {
                          borderColor: imageUrl ? 'green' : '#ccc',
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => selectMedia('photo')}>
                      {imageUrl ? (
                        <>
                          <Image
                            source={{ uri: `${AWS_CDN_URL}${imageUrl}` }}
                            style={{ height: '70%', width: '70%' }}
                          />
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeImage(imageUrl)}>
                            <X color={'#fff'} size={10} />
                          </TouchableOpacity>
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
                        {
                          alignSelf: 'flex-start',
                          marginTop: 10,
                          marginBottom: 10,
                        },
                      ]}>
                      <Text style={styles.label}>Preview Video (9:16)</Text>
                      <Text style={{color: '#ccc'}}>(optional)</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.upload,
                        {
                          borderColor: videoUrl ? 'green' : '#ccc',
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => selectMedia('video')}>
                      {videoUrl ? (
                        <Video
                          style={{height: '90%', width: '70%'}}
                          source={{uri: `${AWS_CDN_URL}${videoUrl}`}}
                          resizeMode="cover"
                          repeat={true}
                          controls={true}
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

                  {/* <CohostSelector
                    onCoHostSelect={handleCoHostSelected}
                    onClearCoHost={handleClearCoHost}
                    isSubmitting={loading}
                    isUploading={loading}
                    initialHasCoHost={formValues.hasCoHost}
                    initialCoHost={formValues.coHost}
                  /> */}
                  {/* {console.log(formValuest,"cohost in ")} */}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}>
                    <Feather name="video" size={20} />
                    <Text style={styles.buttonText}>Update a Show</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            renderItem={null}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        </TouchableWithoutFeedback>
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
    padding: 10,
    backgroundColor: '#121212',
  },
  removeButton: {
    borderRadius: 40,
    backgroundColor: 'red',
    padding: 3,
    position: 'absolute',
    top: 15,
    right: 45,
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
    // padding: 5,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  tagButton: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 5,
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
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dotted',
  },
  headerContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent:'c'
    // marginBottom:20,
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
    marginBottom: 10,
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
    backgroundColor: '#fcd34d',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 16,
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
    fontSize: 20,
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
    marginBottom: 6,
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
    marginTop: 10,
    gap: 10,
    flexDirection: 'row',
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
  placeholderStyle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#fff',
  },

  toggleheader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 14,
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

export default EditLsform;
