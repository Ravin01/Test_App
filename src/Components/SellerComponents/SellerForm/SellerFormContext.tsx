// SellerFormContext.tsx - Centralized form state management
import React, { createContext, useContext } from 'react';

// ============ TYPES ============
export interface SellingChannel {
  selected: boolean;
  name: string;
}

export interface SellerFormData {
  // Step 1: Personal Details
  name: string;
  mobileNumber: string;
  email: string;
  businessType: string;
  isAgeConfirmed: boolean;
  brand: string;

  // Step 2: KYC & Verification
  hasGST: boolean;
  gstNumber: string;
  gstVerified: boolean;
  gstDocument: string | null;
  gstDeclaration: string | null;
  aadhaarNumber: string;
  aadhaarFront: string | null;
  aadhaarBack: string | null;
  aadharVerified: boolean;
  panNumber: string;
  panFront: string | null;
  panVerified: boolean;

  // Step 2b: Address
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  state: string;
  pinCode: string;

  // Step 3: Business Profile
  sellerExperience: string;
  sellingChannels: {
    Instagram: SellingChannel;
    Facebook: SellingChannel;
    Shopify: SellingChannel;
    Amazon: SellingChannel;
    Flipkart: SellingChannel;
    Meesho: SellingChannel;
  };
  channels: string[];
  productCategories: string[];
  wantToSell: string[];
  productCatalog: string[];
  productCatalogLink: string;
  productCatalogFile: string[];
  hasCatlog: boolean;
  fssaiCertificate: string;
  bisCertificateFileName: string | null;
  qualityCertificateFileName: string | null;
  liveSellingFrequency: string;
  cameraSetup: boolean;
  wantBrandCollaborations: boolean;

  // Step 4: Logistics & Terms
  preferredShipping: string;
  courierPartner: string;
  dispatchTime: string;
  returnPolicy: string;
  isTermsandCondition: boolean;
  isDigitalsellerCondition: boolean;
  isSellerCondition: boolean;
}

export interface VerificationData {
  status?: string;
  data?: {
    gst?: {
      verificationStatus: string;
      businessName?: string;
      tradeName?: string;
      gstin?: string;
      gstNumber?: string;
      address?: {
        building?: string;
        street?: string;
        location?: string;
        city?: string;
        district?: string;
        state?: string;
        pincode?: string;
      };
    };
    aadhaar?: {
      verificationStatus: string;
      aadhaarNumber?: string;
    };
    pan?: {
      verificationStatus: string;
      panNumber?: string;
      number?: string;
      registeredName?: string;
      name?: string;
    };
  };
}

export interface SellerFormContextType {
  formData: SellerFormData;
  setFormData: React.Dispatch<React.SetStateAction<SellerFormData>>;
  updateField: (field: keyof SellerFormData, value: any) => void;
  updateFields: (fields: Partial<SellerFormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  brand: string;
  loading: boolean;
  verificationData: VerificationData;
  saveDraft: () => Promise<void>;
}

// ============ INITIAL STATE ============
export const INITIAL_FORM_DATA: SellerFormData = {
  // Step 1
  name: '',
  mobileNumber: '',
  email: '',
  businessType: '',
  isAgeConfirmed: false,
  brand: '',

  // Step 2
  hasGST: false,
  gstNumber: '',
  gstVerified: false,
  gstDocument: null,
  gstDeclaration: null,
  aadhaarNumber: '',
  aadhaarFront: null,
  aadhaarBack: null,
  aadharVerified: false,
  panNumber: '',
  panFront: null,
  panVerified: false,

  // Address
  streetAddress1: '',
  streetAddress2: '',
  city: '',
  state: '',
  pinCode: '',

  // Step 3
  sellerExperience: '',
  sellingChannels: {
    Instagram: { selected: false, name: '' },
    Facebook: { selected: false, name: '' },
    Shopify: { selected: false, name: '' },
    Amazon: { selected: false, name: '' },
    Flipkart: { selected: false, name: '' },
    Meesho: { selected: false, name: '' },
  },
  channels: [],
  productCategories: [],
  wantToSell: [],
  productCatalog: [],
  productCatalogLink: '',
  productCatalogFile: [],
  hasCatlog: false,
  fssaiCertificate: '',
  bisCertificateFileName: null,
  qualityCertificateFileName: null,
  liveSellingFrequency: '',
  cameraSetup: false,
  wantBrandCollaborations: false,

  // Step 4
  preferredShipping: '',
  courierPartner: '',
  dispatchTime: '',
  returnPolicy: '',
  isTermsandCondition: false,
  isDigitalsellerCondition: false,
  isSellerCondition: false,
};

// ============ CONTEXT ============
export const SellerFormContext = createContext<SellerFormContextType | null>(null);

// ============ HOOK ============
export const useSellerForm = (): SellerFormContextType => {
  const context = useContext(SellerFormContext);
  if (!context) {
    throw new Error('useSellerForm must be used within a SellerFormProvider');
  }
  return context;
};

// ============ VALIDATION UTILS ============
export const ValidationUtils = {
  isValidName: (value: string): string => {
    if (!value) return 'Name is required';
    if (value.length <= 3) return 'Enter a valid Name';
    return '';
  },

  isValidMobile: (value: string): string => {
    const phoneRegex = /^[0-9]{10}$/;
    if (!value) return 'Mobile number is required';
    if (!phoneRegex.test(value)) return 'Please enter a valid mobile number (10 digits)';
    return '';
  },

  isValidEmail: (value: string): string => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return '';
  },

  isValidBusinessType: (value: string): string => {
    if (!value) return 'Business Type is required';
    return '';
  },

  isValidAadhaar: (value: string): string => {
    const aadhaarRegex = /^[0-9]{12}$/;
    if (!value) return 'Aadhaar number is required';
    if (!aadhaarRegex.test(value)) return 'Aadhaar number must be 12 digits';
    return '';
  },

  isValidPAN: (value: string): string => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!value) return 'PAN number is required';
    if (!panRegex.test(value)) return 'Invalid PAN number format';
    return '';
  },

  isValidGST: (value: string): string => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!value) return 'GST number is required';
    if (!gstRegex.test(value)) return 'Invalid GST number format';
    return '';
  },

  isValidURL: (value: string): string => {
    if (!value || value.trim() === '') return '';
    const trimmedValue = value.trim();
    const urlRegex = /^(https?:\/\/|ftp:\/\/|www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
    const drivePatterns = [
      /^https?:\/\/(drive|docs)\.google\.com/i,
      /^https?:\/\/.*\.dropbox\.com/i,
      /^https?:\/\/.*\.onedrive\.live\.com/i,
    ];
    const isDriveLink = drivePatterns.some(pattern => pattern.test(trimmedValue));
    if (isDriveLink) return '';
    if (!urlRegex.test(trimmedValue)) {
      return 'Please enter a valid URL';
    }
    return '';
  },

  cleanMobileNumber: (mobile: string): string => {
    if (!mobile) return '';
    return mobile.replace(/^\+91\s*/, '').replace(/^\+91/, '').trim();
  },
};

// ============ STEP CONFIGURATION ============
export const STEPS = [
  { id: 1, title: 'Personal Details', key: 'personal' },
  { id: 2, title: 'Business & KYC', key: 'kyc' },
  { id: 3, title: 'Seller Info', key: 'business' },
  { id: 4, title: 'Logistics & Terms', key: 'logistics' },
];

export const TOTAL_STEPS = STEPS.length;
