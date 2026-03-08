// draftService.js
import { useContext } from "react";
import axiosInstance from "../../../Utils/Api";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../../Context/AuthContext";
export const saveSellerDraft = async (draftData) => {
  try{
    const id = (await AsyncStorage.getItem('userId')) || '';
    
    const token = await AsyncStorage.getItem("token");
    // console.log(draftData,"hee")
    const payload= {
     
      userId: id,
      name: draftData?.name,
      mobileNumber:`${draftData?.mobileNumber}`,
      email: draftData?.email,
      sellerType: draftData?.brand?.toLowerCase(),
      businessType: draftData?.businessType,
      productCategories: draftData?.productCategories || [],
      isAdult: draftData?.isAgeConfirmed,
      productCatalog: {
        link: draftData?.productCatalogLink,
        files: draftData?.productCatalogFile||[],
      },
      fssaiCertificateFileName: draftData?.fssaiCertificate,
          bisCertificateFileName: draftData?.bisCertificateFileName,
    qualityCertificateFileName: draftData?.qualityCertificateFileName,
      sellerExperienceInfo: {
        online: (Array.isArray(draftData?.sellingChannels)
          ? draftData.sellingChannels
          : Object.keys(draftData?.sellingChannels || {})
        )
          .filter(channel =>
            [
              'Amazon',
              'Flipkart',
              'Meesho',
              'Shopify',
              'Instagram',
              'Facebook',
            ].includes(channel),
          )
          .map(platform => {
            const platdraftData = draftData?.sellingChannels?.[platform]; // Get the platform's data from draftData

            return platdraftData?.selected
              ? {
                  platform: platform.toLowerCase(), // Ensure the platform name is lowercase
                  profile: platdraftData.name || '', // Set profile from name, or empty if not available
                }
              : null; // If not selected, return null
          })
          .filter(Boolean),

        offline: draftData?.channels || [],
        experience: draftData?.sellerExperience,
      },
      gstInfo: {
        hasGST: draftData?.hasGST,
        gstDeclaration: draftData?.gstDeclaration,
        gstNumber: draftData?.gstNumber,
        gstDocument: draftData?.gstDocument,
      },
      aadhaarInfo: {
        aadhaarNumber: draftData?.aadhaarNumber,
        aadhaarFront: draftData?.aadhaarFront,
        aadhaarBack: draftData?.aadhaarBack,
      },
      panInfo: {
        panNumber: draftData?.panNumber,
        panFront: draftData?.panFront,
      },
      shippingInfo: {
        preferredShipping: draftData?.preferredShipping,
        dispatchTime: draftData?.dispatchTime,
        returnPolicy: draftData?.returnPolicy,
        courierPartner: draftData?.courierPartner,
      },
      readiness: {
        liveSellingFrequency: draftData?.liveSellingFrequency,
        cameraSetup: draftData?.cameraSetup,
        isWillingToGoLive: Boolean(draftData?.liveSellingFrequency),
      },
      promotions: {
        promoteLiveSelling: Boolean(draftData?.liveSellingFrequency),
        brandPromotion: false,
        flykupCollab: draftData?.wantBrandCollaborations,
      },
      address: {
        addressLine1: draftData?.streetAddress1,
        addressLine2: draftData?.streetAddress2,
        city: draftData?.city,
        state: draftData?.state,
        pincode: draftData?.pinCode,
      },
    };
    // console.log(payload.sellerType)
  const res = await axiosInstance.put("/apply/draft",payload, {
    headers: { Authorization: `Bearer ${token}` }});
  // console.log(res.data.message)
  return res.data;
}
catch(error)
{
  console.log(error)
}
}
function transformResponseToFormat(response) {
  // console.log( response,"response")
  return {
    aadhaarBack: response?.aadhaarInfo?.aadhaarBack || null,
    aadhaarFront: response?.aadhaarInfo?.aadhaarFront || null,
    aadhaarNumber: response?.aadhaarInfo?.aadhaarNumber || "",

    brand: response?.sellerType || "",
    businessType: response?.businessType || "",
    cameraSetup: response?.readiness?.cameraSetup || false,

    channels: response?.sellerExperienceInfo?.offline || [],

    city: response?.address?.city || "",
    courierPartner: response?.shippingInfo?.courierPartner || "",
    dispatchTime: response?.shippingInfo?.dispatchTime || "",

    email: response?.email || "",
    fssaiCertificate: response?.fssaiCertificateFileName || "",
    bisCertificateFileName: response?.bisCertificateFileName,
    qualityCertificateFileName: response?.qualityCertificateFileName,
    gstDeclaration: response?.gstInfo?.gstDeclaration || null,
    gstDocument: response?.gstInfo?.gstDocument || null,
    gstNumber: response?.gstInfo?.gstNumber || "",
    hasGST: response?.gstInfo?.hasGST || false,

    isAgeConfirmed: response?.isAdult || false,
    isDigitalsellerCondition: false, // not in response, set default
    isSellerCondition: false,        // not in response, set default
    isTermsandCondition: false,      // not in response, set default

    liveSellingFrequency: response?.readiness?.liveSellingFrequency || "",
    mobileNumber: response?.mobileNumber || "",
    name: response?.companyName ||response?.name|| "",

    panFront: response?.panInfo?.panFront || null,
    panNumber: response?.panInfo?.panNumber || "",

    pinCode: response?.address?.pincode || "",
    preferredShipping: response?.shippingInfo?.preferredShipping || "",

    productCatalog: response?.productCatalog?.files || [],
    productCatalogFile: response?.productCatalog?.files || [],
    productCatalogLink: response?.productCatalog?.link || "",

    productCategories: response?.productCategories || [],
    returnPolicy: response?.shippingInfo?.returnPolicy || "",

    sellerExperience: response?.sellerExperienceInfo?.experience || "",

    sellingChannels: {
      Amazon: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "amazon")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "amazon"))
      },
      Flipkart: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "flipkart")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "flipkart"))
      },
      Meesho: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "meesho")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "meesho"))
      },
      Shopify: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "shopify")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "shopify"))
      },
      Instagram: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "instagram")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "instagram"))
      },
      Facebook: {
        name: response?.sellerExperienceInfo?.online?.find(p => p.platform === "facebook")?.profile || "",
        selected: Boolean(response?.sellerExperienceInfo?.online?.find(p => p.platform === "facebook"))
      }
    },

    state: response?.address?.state || "",
    streetAddress1: response?.address?.addressLine1 || "",
    streetAddress2: response?.address?.addressLine2 || "",

    wantBrandCollaborations: response?.promotions?.flykupCollab || false,
    wantToSell: [] // not in response, set default
  };
}
  export const fetchVerificationStatus = async (user) => {
    
        // console.log('🔍 Fetching verification status...', { 
        //     userId: user?.id || user?._id,
        //     hasUser: !!user 
        // });
        
        if (!user?.id && !user?._id) {
            console.log('❌ No user ID found, skipping fetch');
            return;
        }
        
        try {
            const response = await axiosInstance.get(`/apply/verification-status/${user.id || user._id}`);
            // console.log(response.data,"verification status")
        return  response.data;
          
        } catch (error) {
            console.error('❌ Error fetching verification status:', error);
        }
    };

export const getSellerDraft = async () => {
  try{
  // console.log("Fetching seller draft...");
  const token = await AsyncStorage.getItem("token");
  const res = await axiosInstance.get("/apply/draft", {
    headers: { Authorization: `Bearer ${token}` },
  });

  
  // console.log("Fetched draft response:", res.data);
  return await transformResponseToFormat(res.data.data);
}
  catch(error){
    console.log("error getting drafts",error)
  }
};
