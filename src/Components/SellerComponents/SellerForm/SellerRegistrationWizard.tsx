// SellerRegistrationWizard.tsx - Main parent component with unified state management
import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  ToastAndroid,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';

// Context & Services
import { AuthContext } from '../../../Context/AuthContext';
import { saveSellerDraft, getSellerDraft, fetchVerificationStatus } from './draftService';
import {
  SellerFormContext,
  SellerFormData,
  INITIAL_FORM_DATA,
  ValidationUtils,
  TOTAL_STEPS,
  VerificationData,
} from './SellerFormContext';

// Step Components
import Step1PersonalDetails from './steps/Step1PersonalDetails';
import Step2KYCVerification from './steps/Step2KYCVerification';
import Step3BusinessProfile from './steps/Step3BusinessProfile';
import Step4LogisticsTerms from './steps/Step4LogisticsTerms';

// Common Components
import SellerHeader from './Header';
import OnboardingStatusWidget, { CompactProgressFAB } from './CompletionPercent';
import { FABHelpButton, FAQHelpBottomSheet } from './HelpExample';
import { colors } from '../../../Utils/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SellerRegistrationWizardProps {
  navigation: any;
}

const SellerRegistrationWizard: React.FC<SellerRegistrationWizardProps> = ({ navigation }) => {
  const route = useRoute();
  const { user, fetchuser }: any = useContext(AuthContext);
  const rbSheetRef = useRef<any>(null);
  
  // Get brand type from route params or AsyncStorage
  const initialBrand = (route.params as any)?.type || '';
  
  // ============ STATE ============
  const [formData, setFormData] = useState<SellerFormData>({
    ...INITIAL_FORM_DATA,
    brand: initialBrand,
    email: user?.emailId || '',
    mobileNumber: ValidationUtils.cleanMobileNumber(user?.mobile || ''),
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<VerificationData>({});
  const [showProgress, setShowProgress] = useState(false);
  const [brand, setBrand] = useState(initialBrand);
  
  // Animation for step transitions
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ============ LOAD DRAFT ON MOUNT ============
  useEffect(() => {
    const initializeForm = async () => {
      setLoading(true);
      try {
        // Load brand from AsyncStorage if not in params
        let storedBrand = initialBrand;
        if (!storedBrand) {
          storedBrand = await AsyncStorage.getItem('type') || '';
          setBrand(storedBrand);
        }

        // Load saved draft
        const draftData = await getSellerDraft();
        if (draftData) {
          setFormData(prev => ({
            ...prev,
            ...draftData,
            brand: storedBrand || draftData.brand,
            email: user?.emailId || draftData.email,
            mobileNumber: ValidationUtils.cleanMobileNumber(user?.mobile || draftData.mobileNumber || ''),
          }));
        }

        // Fetch verification status
        if (user?.id || user?._id) {
          const verData = await fetchVerificationStatus(user);
          if (verData) {
            setVerificationData(verData);
            // Apply verification data to form
            applyVerificationData(verData);
          }
        }
      } catch (error) {
        console.log('Error initializing form:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeForm();
  }, [user]);

  // ============ APPLY VERIFICATION DATA ============
  const applyVerificationData = useCallback((verData: VerificationData) => {
    if (verData?.status !== 'success') return;

    setFormData(prev => {
      const updates: Partial<SellerFormData> = {};

      // GST Verification
      if (verData.data?.gst?.verificationStatus === 'verified') {
        updates.gstVerified = true;
        updates.hasGST = true;
        const gstNumber = verData.data.gst.gstin || verData.data.gst.gstNumber;
        if (gstNumber && !prev.gstNumber) updates.gstNumber = gstNumber;
        
        // Apply GST address if not already filled
        const address = verData.data.gst.address;
        if (address) {
          if (!prev.streetAddress1) {
            const addressLine1Parts: string[] = [];
            if (address.building) addressLine1Parts.push(address.building);
            if (address.street) addressLine1Parts.push(address.street);
            updates.streetAddress1 = addressLine1Parts.join(', ');
          }
          if (!prev.streetAddress2 && address.location) updates.streetAddress2 = address.location;
          if (!prev.city) updates.city = address.city || address.district || '';
          if (!prev.state) updates.state = address.state || '';
          if (!prev.pinCode) updates.pinCode = address.pincode || '';
        }
      }

      // Aadhaar Verification
      if (verData.data?.aadhaar?.verificationStatus === 'verified') {
        updates.aadharVerified = true;
        if (verData.data.aadhaar.aadhaarNumber && !prev.aadhaarNumber) {
          updates.aadhaarNumber = verData.data.aadhaar.aadhaarNumber;
        }
      }

      // PAN Verification
      if (verData.data?.pan?.verificationStatus === 'verified') {
        updates.panVerified = true;
        const panNumber = verData.data.pan.panNumber || verData.data.pan.number;
        if (panNumber && !prev.panNumber) updates.panNumber = panNumber;
        const panName = verData.data.pan.registeredName || verData.data.pan.name;
        if (panName && !prev.name) updates.name = panName;
      }

      return { ...prev, ...updates };
    });
  }, []);

  // ============ AUTO-SAVE ============
  useEffect(() => {
    if (loading) return;
    
    const saveTimeout = setTimeout(() => {
      saveSellerDraft(formData).catch(err => 
        console.log('Autosave failed:', err.message)
      );
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [formData, loading]);

  // ============ MANUAL SAVE ============
  const saveDraft = useCallback(async () => {
    try {
      await saveSellerDraft(formData);
      console.log('Draft saved manually');
    } catch (err) {
      console.error('Manual save failed:', err);
    }
  }, [formData]);

  // ============ STEP NAVIGATION ============
  const animateStepChange = useCallback((direction: 'next' | 'prev') => {
    const targetValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: targetValue * 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(direction === 'next' ? SCREEN_WIDTH * 0.3 : -SCREEN_WIDTH * 0.3);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const goToNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      animateStepChange('next');
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, animateStepChange]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      animateStepChange('prev');
      setCurrentStep(prev => prev - 1);
    } else {
      // Go back to seller type selection
      navigation.goBack();
    }
  }, [currentStep, animateStepChange, navigation]);

  // ============ FIELD UPDATES ============
  const updateField = useCallback((field: keyof SellerFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((fields: Partial<SellerFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  // ============ BACK HANDLER ============
  useEffect(() => {
    const backAction = () => {
      if (currentStep > 1) {
        goToPreviousStep();
        return true;
      }
      return false; // Let default behavior handle it
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentStep, goToPreviousStep]);

  // ============ CONTEXT VALUE ============
  const contextValue = useMemo(() => ({
    formData,
    setFormData,
    updateField,
    updateFields,
    currentStep,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    totalSteps: TOTAL_STEPS,
    brand,
    loading,
    verificationData,
    saveDraft,
  }), [
    formData,
    updateField,
    updateFields,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    brand,
    loading,
    verificationData,
    saveDraft,
  ]);

  // ============ STEP TITLES ============
  const getStepTitle = useCallback(() => {
    switch (currentStep) {
      case 1: return 'Personal Details';
      case 2: return 'Business & KYC';
      case 3: return 'Seller Info';
      case 4: return 'Logistics & Terms';
      default: return 'Seller Registration';
    }
  }, [currentStep]);

  // ============ RENDER CURRENT STEP ============
  const renderCurrentStep = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <Step1PersonalDetails navigation={navigation} />;
      case 2:
        return <Step2KYCVerification navigation={navigation} />;
      case 3:
        return <Step3BusinessProfile navigation={navigation} />;
      case 4:
        return <Step4LogisticsTerms navigation={navigation} />;
      default:
        return <Step1PersonalDetails navigation={navigation} />;
    }
  }, [currentStep, navigation]);

  // ============ HELP SHEET ============
  const openHelpSheet = useCallback(() => {
    rbSheetRef.current?.open();
  }, []);

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.brandYellow} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SellerFormContext.Provider value={contextValue}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <SellerHeader navigation={navigation} message={getStepTitle()} />

        {/* Step Content with Animation */}
        <Animated.View 
          style={[
            styles.stepContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {renderCurrentStep}
        </Animated.View>

        {/* Progress Widget */}
        <OnboardingStatusWidget
          title="Your Onboarding Status"
          tasksConfig={brand}
          formData={formData}
          isOpen={showProgress}
          onClose={() => setShowProgress(false)}
        />

        {/* FAB Buttons */}
        <View style={styles.fabContainer}>
          <CompactProgressFAB
            formData={formData}
            tasksConfig={brand}
            onPress={() => setShowProgress(true)}
          />
          <FABHelpButton onPress={openHelpSheet} style={styles.helpFab} />
        </View>

        {/* Help Bottom Sheet */}
        <FAQHelpBottomSheet
          rbSheetRef={rbSheetRef}
          currentTabIndex={currentStep - 1}
        />
      </SafeAreaView>
    </SellerFormContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 72,
    right: 0,
  },
  helpFab: {
    marginTop: 8,
  },
});

export default SellerRegistrationWizard;
