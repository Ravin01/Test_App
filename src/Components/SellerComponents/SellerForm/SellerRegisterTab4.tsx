import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Icons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ActivityIndicator, Checkbox} from 'react-native-paper';
import {useRoute} from '@react-navigation/native';
import api from '../../../Utils/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DigitalAgreementModal from './Terms&Condition/DigitalAgreementModal';
import SocialandBrandCondition from './Terms&Condition/SocialandBrandCondition';
import TermsAgreementModal from './Terms&Condition/TermsandCondition';
import SellerHeader from './Header';
import HorizontalTimeline from './TimeLine';
import {Dropdown} from 'react-native-element-dropdown';

import Octicons from 'react-native-vector-icons/Octicons';
import {AuthContext} from '../../../Context/AuthContext';
import {resetCache} from '../../../../metro.config';
import {getStatusBarHeight} from '../../../Utils/dateUtils';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../../Utils/Colors';
import useAutoSave from './useAutoSave';
import {FABHelpButton, FAQHelpBottomSheet} from './HelpExample';
import OnboardingStatusWidget, {CompactProgressFAB} from './CompletionPercent';
import { appicon } from '../../../assets/assets';

const SellerRegisterTab4 = ({navigation}) => {
  const route = useRoute();
  // const [user, setUser] = useState({});
  const {user, fetchuser} = useContext(AuthContext);
  const data = route.params;

  const [showProgress, setShowProgress] = useState(false);
  const [loading, setloading] = useState(false);
  const [isGeneralModalOpen, setGeneralModalOpen] = useState(false);
  const [isSellerModalOpen, setSellerModalOpen] = useState(false);
  const [isDigitalModalOpen, setDigitalModalOpen] = useState(false);
  const {formData, setFormData} = useAutoSave({
    ...data,
    preferredShipping: '',
    courierPartner: '',
    dispatchTime: '',
    returnPolicy: '',
    isTermsandCondition: false,
    isDigitalsellerCondition: false,
    isSellerCondition: false,
  });
  // console.log(formData)
  const errors = {
    courierPartner: '',
    preferredShipping: '',
    returnPolicy: '',
    dispatchTime: '',
  };
  const shippingMethods = [
    {
      name: 'Flykup Logistics',
      value: 'flykup',
      icon: <Feather name="truck" size={24} color="purple" />,
      description: 'We handle shipping & fulfillment',
    },
    {
      name: 'Self-shipping',
      value: 'self',
      icon: <Feather name="package" size={24} color="purple" />,
      description: 'Use your own courier partner',
    },
  ];
  const dispatchOptions = [
    {label: 'Same Day', value: 'same_day'},
    {label: '1-3 Days', value: '1-3_days'},
    {label: '3-5 Days', value: '3-5_days'},
  ];
  const returnOptions = [
    {label: '7 Days Return', value: '7_days'},
    {label: '15 Days Return', value: '15_days'},
    {label: 'No Return', value: 'no_return'},
    {label: 'Warranty Available', value: 'warranty'},
  ];
    
  const formatSubmissionData = async () => {
    return {
      companyName: formData?.name,
      mobileNumber: `+91${formData?.mobileNumber}`,
      email: user?.emailId,
      sellerType: brand?.toLowerCase(),
      businessType: formData?.businessType,
      productCategories: formData?.productCategories || [],
      isAdult: true||formData?.isAgeConfirmed,
      productCatalog: {
        link: formData?.productCatalogLink,
        files: formData?.productCatalogFile || [],
      },
      fssaiCertificateFileName: formData?.fssaiCertificate,

      bisCertificateFileName: formData?.bisCertificateFileName,
      qualityCertificateFileName: formData?.qualityCertificateFileName,
      sellerExperienceInfo: {
        online: (Array.isArray(formData?.sellingChannels)
          ? formData.sellingChannels
          : Object.keys(formData?.sellingChannels || {})
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
            const platformData = formData?.sellingChannels?.[platform]; // Get the platform's data from formData

            return platformData?.selected
              ? {
                  platform: platform.toLowerCase(), // Ensure the platform name is lowercase
                  profile: platformData.name || '', // Set profile from name, or empty if not available
                }
              : null; // If not selected, return null
          })
          .filter(Boolean),

        offline: formData?.channels || [],
        experience: formData?.sellerExperience,
      },
      gstInfo: {
        hasGST: formData?.hasGST,
        gstDeclaration: formData?.gstDeclaration,
        gstNumber: formData?.gstNumber,
        gstDocument: formData?.gstDocument,
      },
      aadhaarInfo: {
        aadhaarNumber: formData?.aadhaarNumber,
        aadhaarFront: formData?.aadhaarFront,
        aadhaarBack: formData?.aadhaarBack,
      },
      panInfo: {
        panNumber: formData?.panNumber,
        panFront: formData?.panFront,
      },
      shippingInfo: {
        preferredShipping: formData?.preferredShipping,
        dispatchTime: formData?.dispatchTime,
        returnPolicy: formData?.returnPolicy,
        courierPartner: formData?.courierPartner,
      },
      readiness: {
        liveSellingFrequency: formData?.liveSellingFrequency,
        cameraSetup: formData?.cameraSetup,
        isWillingToGoLive: Boolean(formData?.liveSellingFrequency),
      },
      promotions: {
        promoteLiveSelling: Boolean(formData?.liveSellingFrequency),
        brandPromotion: false,
        flykupCollab: formData?.wantBrandCollaborations,
      },
      address: {
        addressLine1: formData?.streetAddress1,
        addressLine2: formData?.streetAddress2,
        city: formData?.city,
        state: formData?.state,
        pincode: formData?.pinCode,
      },
    };
  };
  const handleSubmit = async () => {
    //  navigation.navigate('successScreen');
    if (
      !formData.isTermsandCondition ||
      !formData.isSellerCondition ||
      !formData.isDigitalsellerCondition
    ) {
      ToastAndroid.show('Accept the Terms and Condition', ToastAndroid.SHORT);
      return;
    }
    // if (formData.preferredShipping == 'self') {
    //   if (!formData.courierPartner) {
    //     ToastAndroid.show(
    //       'Courier Partner is missing fill it now to continue. ',
    //       ToastAndroid.SHORT,
    //     );
    //     return;
    //   }
    // }
    // if (
    //   !formData.dispatchTime ||
    //   !formData.preferredShipping ||
    //   !formData.returnPolicy
    // ) {
    //   ToastAndroid.show(
    //     'Some fields are missing fill it now to continue. ',
    //     ToastAndroid.SHORT,
    //   );
    //   return;
    // }
    setloading(true);
    try {
      const submissionData = await formatSubmissionData();
      // console.log('Submission Data:', submissionData);
      if (
        user?.sellerInfo?.approvalStatus == 'auto_rejected' ||
        user?.sellerInfo?.approvalStatus == 'rejected'
      ) {
        // console.log('this ',submissionData)
        const response = await api.put(`/apply/seller`, submissionData);
        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
        // ToastAndroid.show('Successfully Updated new Data. ',ToastAndroid.SHORT);
        console.log(response.data);
      } else {
        const response = await api.post(`/apply/seller`, submissionData);
        ToastAndroid.show(response.data.message, ToastAndroid.SHORT);
      }

      navigation.navigate('successScreen');
      // navigation.goback();
      await fetchuser();
    } catch (err) {
      ToastAndroid.show(err?.response?.data?.message, ToastAndroid.SHORT);
      console.log(err.response);
    } finally {
      setloading(false);
    }
  };
  const handleCloseModal = () => {
    setGeneralModalOpen(false);
    setSellerModalOpen(false);
    setDigitalModalOpen(false);
  };

  const handleAcceptGeneralTerms = () => {
    // setGeneralAccepted(true);
    setFormData(prev => ({
      ...prev,
      ['isTermsandCondition']: !formData.isTermsandCondition,
    }));
    setGeneralModalOpen(false);
  };

  const handleAcceptSellerTerms = () => {
    // setSellerAccepted(true);
    setFormData(prev => ({
      ...prev,
      ['isSellerCondition']: !formData.isSellerCondition,
    }));
    setSellerModalOpen(false);
  };

  const handleAcceptDigitalTerms = () => {
    // setDigitalAccepted(true);
    setFormData(prev => ({
      ...prev,
      ['isDigitalsellerCondition']: !formData.isDigitalsellerCondition,
    }));
    setDigitalModalOpen(false);
  };

  const [brand, setbrand] = useState('');
  useEffect(() => {
    const get = async () => {
      const brand = await AsyncStorage.getItem('type');
      setbrand(brand);
    };
    get();
  }, []);
  const rbSheetRef = useRef();
  const dispatchTimeDropdownRef = useRef<any>(null);
  const returnPolicyDropdownRef = useRef<any>(null);

  const openHelpSheet = () => {
    rbSheetRef.current?.open();
  };

  return (
    <>
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#777" size={'small'} />
        </View>
      ) : null}
      <FAQHelpBottomSheet
        rbSheetRef={rbSheetRef}
        currentTabIndex={3} // 0, 1, 2, or 3
      />
      <OnboardingStatusWidget
        title="Your Onboarding Status"
        tasksConfig={brand}
        formData={formData}
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
      />
      {/* <CompactProgressFAB
       formData={formData}
       tasksConfig={brand}
       onPress={()=>setShowProgress(true)}
       /> */}
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <SellerHeader
            navigation={navigation}
            message={'Logistics & Fulfillment'}
          />
          <ScrollView contentContainerStyle={[{padding: 15}]}>
            <HorizontalTimeline
              activeIndex={3}
              // totalDots={4}
              activeDotColor="#FFD700"
              inactiveDotColor="#9CA3AF"
              text="Business & KYC Verification"
              activeLineColor="#FFD700"
              inactiveLineColor="#333"
              showStepNumbers={true}
            />
            {/* <Text style={styles.heading}></Text> */}

            {/* Shipping Method */}
            <View style={styles.section}>
              <Text style={styles.label}>Preferred Shipping Method</Text>

              {shippingMethods.map(method => (
                <TouchableOpacity
                  key={method.value}
                  onPress={() =>
                    setFormData({...formData, preferredShipping: method.value})
                  }
                  style={[styles.button]}>
                  {formData.preferredShipping !== method.value ? (
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

                  <Text
                    style={[
                      styles.buttonText,
                      formData.preferredShipping === method.value
                        ? styles.selectedButtonText
                        : {},
                    ]}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.preferredShipping && (
              <Text style={styles.errorText}>{errors.preferredShipping}</Text>
            )}

            {/* Self-shipping Courier Partner */}
            {formData.preferredShipping === 'self' && (
              <View style={styles.section}>
                <View style={{flexDirection: 'row', gap: 10}}>
                  {/* <Icons name="truck-fast" size={20} /> */}
                  <Text style={styles.label}>Courier Partner</Text>
                </View>
                <TextInput
                  value={formData.courierPartner}
                  onChangeText={text =>
                    setFormData({...formData, courierPartner: text})
                  }
                  style={styles.input}
                  placeholder="Enter courier partner name"
                  placeholderTextColor={'#777'}
                />
                {errors.courierPartner && (
                  <Text style={styles.errorText}>{errors.courierPartner}</Text>
                )}
              </View>
            )}

            {/* Dispatch Time */}
            <View style={styles.section}>
              <Text style={styles.label}>No. of shipping days</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => dispatchTimeDropdownRef.current?.open()}>
                <Dropdown
                  ref={dispatchTimeDropdownRef}
                  data={dispatchOptions}
                  style={[styles.input, {paddingRight: 10}]}
                  labelField="label"
                  valueField="value"
                  placeholderStyle={{color: '#777'}}
                  placeholder="Select Dispatch Time"
                  value={formData.dispatchTime}
                  activeColor="transparent"
                  selectedTextStyle={{color: '#F7CE45'}}
                  itemTextStyle={{color: '#fff'}}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  onChange={item =>
                    setFormData({...formData, dispatchTime: item.value})
                  }
                />
              </TouchableOpacity>

              {errors.dispatchTime && (
                <Text style={styles.errorText}>{errors.dispatchTime}</Text>
              )}
            </View>

            {/* Return Policy */}
            <View style={styles.section}>
              <View>
                <Text style={styles.label}>Return & Warranty Policy</Text>
              </View>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => returnPolicyDropdownRef.current?.open()}>
                <Dropdown
                  ref={returnPolicyDropdownRef}
                  data={returnOptions}
                  style={[styles.input, {paddingRight: 10}]}
                  labelField="label"
                  valueField="value"
                  placeholderStyle={{color: '#777'}}
                  placeholder="Select returnPolicy"
                  value={formData.returnPolicy}
                  activeColor="transparent"
                  selectedTextStyle={{color: '#F7CE45'}}
                  itemTextStyle={{color: '#fff'}}
                  containerStyle={{
                    marginBottom: 10,
                    backgroundColor: '#212121',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    borderRadius: 10,
                  }}
                  onChange={item =>
                    setFormData({...formData, returnPolicy: item.value})
                  }
                />
              </TouchableOpacity>

              {errors.returnPolicy && (
                <Text style={styles.errorText}>{errors.returnPolicy}</Text>
              )}
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                width: '80%',
                marginBottom: 10,
              }}>
              <Checkbox
                status={formData.isTermsandCondition ? 'checked' : 'unchecked'}
                color={formData.isTermsandCondition ? '#F7CE45' : 'red'}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    ['isTermsandCondition']: !formData.isTermsandCondition,
                  }))
                }
              />
              {/**/}
              <TouchableOpacity onPress={() => setGeneralModalOpen(true)}>
                <Text style={{color: '#fff', fontSize: 12}}>
                  I accept the{' '}
                  <Text style={{color: '#F7CE45'}}>
                    General Terms and Conditions{' '}
                  </Text>
                  <Text className="text-red-600"> *</Text>
                </Text>
              </TouchableOpacity>
            </View>
            <TermsAgreementModal
              isOpen={isGeneralModalOpen}
              onClose={handleCloseModal}
              onAccept={handleAcceptGeneralTerms}
            />
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                width: '85%',
                marginBottom: 10,
              }}>
              <Checkbox
                status={formData.isSellerCondition ? 'checked' : 'unchecked'}
                color={formData.isSellerCondition ? '#F7CE45' : 'red'}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    ['isSellerCondition']: !formData.isSellerCondition,
                  }))
                }
              />
              <TouchableOpacity onPress={() => setSellerModalOpen(true)}>
                <Text style={{color: '#fff', fontSize: 12}}>
                  I accept the{' '}
                  <Text style={{color: '#F7CE45'}}>
                    Seller and Social Seller Agreement{' '}
                  </Text>
                  <Text className="text-red-600">*</Text>
                </Text>
              </TouchableOpacity>
            </View>
            <SocialandBrandCondition
              isOpen={isSellerModalOpen}
              onClose={handleCloseModal}
              onAccept={handleAcceptSellerTerms}
            />
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                width: '85%',
                marginBottom: 40,
              }}>
              <Checkbox
                status={
                  formData.isDigitalsellerCondition ? 'checked' : 'unchecked'
                }
                color={formData.isDigitalsellerCondition ? '#F7CE45' : 'red'}
                onPress={() =>
                  setFormData(prev => ({
                    ...prev,
                    ['isDigitalsellerCondition']:
                      !formData.isDigitalsellerCondition,
                  }))
                }
              />
              <TouchableOpacity onPress={() => setDigitalModalOpen(true)}>
                <Text style={{color: '#fff', fontSize: 12}}>
                  I accept the{' '}
                  <Text style={{color: '#F7CE45'}}>
                    Digital Consent & Audit Trail Policy{' '}
                    <Text className="text-red-600"> *</Text>
                  </Text>
                </Text>
              </TouchableOpacity>
              <DigitalAgreementModal
                isOpen={isDigitalModalOpen}
                onClose={handleCloseModal}
                onAccept={handleAcceptDigitalTerms}
              />
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}>
              <Text style={{color: '#000', fontWeight: 'bold', fontSize: 18}}>
                Submit
              </Text>
            </TouchableOpacity>
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
    // padding: 16,
    backgroundColor: '#121212',
    flex: 1,
    // height:'100%'
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
  selectedHeader: {backgroundColor: '#333', borderColor: '#333'},
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9dd7c',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    paddingVertical: 8,
    width: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#F7CE45',
    // flexDirection: 'row',
    // gap: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 30,
    paddingRight: 20,
    paddingLeft: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    padding: 10,
    // backgroundColor: '#fff',
    gap: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    // justifyContent: 'center',
    // marginBottom: 10,
  },
  selectedButton: {
    backgroundColor: '#333',
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 14,
    color: '#fff',
  },
  selectedButtonText: {
    color: '#F7CE45',
  },
  iconAndLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  input: {
    height: 50,
    borderColor: '#1E1E1E',
    borderWidth: 1,
    elevation: 3,
    color: '#fff',
    backgroundColor: colors.primaryColor,
    borderRadius: 10,
    paddingLeft: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 6,
  },
  buttonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: 10,
  },
});

export default SellerRegisterTab4;
