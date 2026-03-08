// Step2KYCVerification.tsx - KYC & Verification Step
import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ActivityIndicator, RadioButton } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { AlertTriangle, UploadIcon } from 'lucide-react-native';
import DocumentPicker from 'react-native-document-picker';

import { useSellerForm, ValidationUtils } from '../SellerFormContext';
import HorizontalTimeline from '../TimeLine';
import OTPVerificationModal from '../OtpVerificaitonModal';
import downloadPDFToDownloads from '../download';
import { colors } from '../../../../Utils/Colors';
import { checkPermission } from '../../../../Utils/Permission';
import { uploadImageToS3, uploadPdfToS3 } from '../../../../Utils/aws';
import axiosInstance from '../../../../Utils/Api';

interface Step2Props {
  navigation?: any;
}

const Step2KYCVerification: React.FC<Step2Props> = ({ navigation: _navigation }) => {
  const { formData, updateField, updateFields, goToNextStep, goToPreviousStep } = useSellerForm();
  
  const [loading, setLoading] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpReferenceId, setOtpReferenceId] = useState<string | null>(null);
  const [errors, setErrors] = useState({ gstNumber: '', aadhaarNumber: '', panNumber: '' });
  const [_gstVerificationData, setGstVerificationData] = useState<any>(null);
  const [panVerificationData, setPanVerificationData] = useState<any>(null);
  
  const [aadhaarAttempts, setAadhaarAttempts] = useState(0);
  const [gstAttempts, setGstAttempts] = useState(0);
  const [panAttempts, setPanAttempts] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<any>({});

  // Handlers
  const handleInputChange = useCallback((field: string, value: any) => {
    updateField(field as any, value);
    if (field === 'gstNumber') setErrors(prev => ({ ...prev, gstNumber: ValidationUtils.isValidGST(value) }));
    if (field === 'aadhaarNumber') setErrors(prev => ({ ...prev, aadhaarNumber: ValidationUtils.isValidAadhaar(value) }));
    if (field === 'panNumber') setErrors(prev => ({ ...prev, panNumber: ValidationUtils.isValidPAN(value) }));
  }, [updateField]);

  const handleVerifyGST = useCallback(async () => {
    if (gstAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/verify-gst', { gstNumber: formData.gstNumber });
      updateField('gstVerified', true);
      setGstVerificationData(response.data?.data);
      setGstAttempts(prev => prev + 1);
      const address = response.data?.data?.address;
      if (address) {
        updateFields({
          streetAddress1: [address.building, address.street].filter(Boolean).join(', '),
          streetAddress2: address.location || '',
          city: address.district,
          state: address.state,
          pinCode: address.pincode,
        });
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, gstNumber: error?.response?.data?.message || 'Verification failed' }));
    } finally { setLoading(false); }
  }, [formData.gstNumber, gstAttempts, updateField, updateFields]);

  const handleVerifyPAN = useCallback(async () => {
    if (panAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/verify-pan', { panNumber: formData.panNumber });
      setPanAttempts(prev => prev + 1);
      updateField('panVerified', true);
      setPanVerificationData(response.data?.data);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, panNumber: error?.response?.data?.error || 'Verification failed' }));
    } finally { setLoading(false); }
  }, [formData.panNumber, panAttempts, updateField]);

  const handleSendOTP = useCallback(async () => {
    if (aadhaarAttempts >= 3) { ToastAndroid.show('Max attempts exceeded', ToastAndroid.SHORT); return; }
    setLoading(true);
    try {
      const response = await axiosInstance.post('/apply/kyc/send-otp', { aadhaarNumber: formData.aadhaarNumber });
      setAadhaarAttempts(prev => prev + 1);
      setOtpReferenceId(response.data?.refId);
      setOtpModalVisible(true);
    } catch (error: any) {
      setErrors(prev => ({ ...prev, aadhaarNumber: error?.response?.data?.message || 'Error sending OTP' }));
    } finally { setLoading(false); }
  }, [aadhaarAttempts, formData.aadhaarNumber]);

  const pickFile = useCallback(async (field: string) => {
    try {
      const hasPermission = await checkPermission('gallery');
      if (!hasPermission) return;
      setUploadingFiles((prev: any) => ({ ...prev, [field]: true }));
      const result = await DocumentPicker.pick({ type: ['image/*', 'application/pdf'], copyTo: 'cachesDirectory' });
      if (!result?.[0]) return;
      const file = result[0];
      let uploadUrl = '';
      if (file.type === 'application/pdf') uploadUrl = await uploadPdfToS3(file.fileCopyUri || file.uri, 'KYC', true);
      else uploadUrl = await uploadImageToS3(file.fileCopyUri || file.uri, 'KYC', true) || '';
      if (uploadUrl) updateField(field as any, uploadUrl);
    } catch (err: any) {
      if (!DocumentPicker.isCancel(err)) ToastAndroid.show('Error picking file', ToastAndroid.SHORT);
    } finally { setUploadingFiles((prev: any) => ({ ...prev, [field]: false })); }
  }, [updateField]);

  const handleDownload = useCallback(() => { downloadPDFToDownloads(); }, []);

  const handleContinue = useCallback(() => {
    if (formData.hasGST && !formData.gstVerified && gstAttempts <= 3) {
      ToastAndroid.show('Please verify GST first', ToastAndroid.SHORT); return;
    }
    if (!formData.hasGST && !formData.gstDeclaration) {
      ToastAndroid.show('Please upload GST declaration', ToastAndroid.SHORT); return;
    }
    if (!formData.aadharVerified && aadhaarAttempts < 3) {
      ToastAndroid.show('Please verify Aadhaar first', ToastAndroid.SHORT); return;
    }
    if (!formData.panVerified && panAttempts < 3) {
      ToastAndroid.show('Please verify PAN first', ToastAndroid.SHORT); return;
    }
    goToNextStep();
  }, [formData, gstAttempts, aadhaarAttempts, panAttempts, goToNextStep]);

  return (
    <>
      {loading && <View style={styles.overlay}><ActivityIndicator size="small" color="gray" /></View>}
      <OTPVerificationModal
        visible={otpModalVisible}
        phoneNumber={otpReferenceId}
        formdata={formData}
        handlesendOtp={handleSendOTP}
        setFormdata={(fn: any) => { const result = fn(formData); updateFields(result); }}
        onVerify={() => updateField('aadharVerified', true)}
        onClose={() => setOtpModalVisible(false)}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <HorizontalTimeline activeIndex={1} activeDotColor="#FFD700" inactiveDotColor="#9CA3AF" text="Business & KYC" activeLineColor="#FFD700" inactiveLineColor="#333" showStepNumbers />
          
          {/* GST Section */}
          <Text style={styles.label}>Do you Have GST? <Text style={styles.required}>*</Text></Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleInputChange('hasGST', true)}>
              <RadioButton value="yes" status={formData.hasGST ? 'checked' : 'unchecked'} color="#F7CE45" onPress={() => handleInputChange('hasGST', true)} />
              <Text style={{ color: 'white' }}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleInputChange('hasGST', false)}>
              <RadioButton value="no" status={!formData.hasGST ? 'checked' : 'unchecked'} color="#F7CE45" onPress={() => handleInputChange('hasGST', false)} />
              <Text style={{ color: 'white' }}>No</Text>
            </TouchableOpacity>
          </View>

          {formData.hasGST ? (
            <>
              <Text style={styles.label}>GST Number <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, formData.gstVerified && styles.verifiedInput]} placeholder="Enter GST number" autoCapitalize="characters" value={formData.gstNumber} onChangeText={text => handleInputChange('gstNumber', text)} placeholderTextColor="#777" />
              {errors.gstNumber ? <Text style={styles.errorText}>{errors.gstNumber}</Text> : null}
              {formData.gstNumber?.length === 15 && !formData.gstVerified && (
                <TouchableOpacity onPress={handleVerifyGST} style={styles.verifyButton}>
                  <MaterialIcons name="verified" size={20} color="#000" />
                  <Text style={styles.verifyButtonText}>Verify GST</Text>
                </TouchableOpacity>
              )}
              {formData.gstVerified && <View style={styles.verifiedBox}><Text style={styles.verifiedText}>✓ GST verified successfully</Text></View>}
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                <MaterialIcons name="download" size={30} color="#FFC100" />
                <View style={{ width: '80%' }}><Text style={{ fontWeight: 'bold', color: '#fff' }}>Download GST Declaration Form</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile('gstDeclaration')}>
                {uploadingFiles.gstDeclaration ? <ActivityIndicator color="#fff" size="large" /> : formData.gstDeclaration ? <Text style={{ color: 'green' }}>✔ Uploaded</Text> : <><UploadIcon size={25} color="#000" /><Text style={styles.label}>Upload Declaration</Text></>}
              </TouchableOpacity>
            </>
          )}

          {/* Aadhaar Section */}
          <Text style={styles.label}>Aadhaar Number <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, formData.aadharVerified && styles.verifiedInput]} placeholder="Enter Aadhaar number" maxLength={12} keyboardType="numeric" value={formData.aadhaarNumber} onChangeText={text => handleInputChange('aadhaarNumber', text)} placeholderTextColor="#777" />
          {formData.aadharVerified && <Text style={{ color: 'green', fontSize: 12 }}>✓ Aadhaar Verified</Text>}
          {errors.aadhaarNumber ? <Text style={styles.errorText}>{errors.aadhaarNumber}</Text> : null}
          {formData.aadhaarNumber?.length === 12 && !formData.aadharVerified && aadhaarAttempts < 3 && (
            <TouchableOpacity onPress={handleSendOTP} style={styles.verifyButton}>
              <MaterialIcons name="verified-user" size={20} color="#000" />
              <Text style={styles.verifyButtonText}>Verify OTP</Text>
            </TouchableOpacity>
          )}

          {/* PAN Section */}
          <Text style={styles.label}>PAN Number <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.input, formData.panVerified && styles.verifiedInput]} placeholder="Enter PAN Number" autoCapitalize="characters" value={formData.panNumber} onChangeText={text => handleInputChange('panNumber', text)} placeholderTextColor="#777" />
          {panVerificationData?.registeredName && <Text style={{ color: 'green', fontSize: 10 }}>{panVerificationData.registeredName} ✓</Text>}
          {errors.panNumber ? <Text style={styles.errorText}>{errors.panNumber}</Text> : null}
          {formData.panNumber?.length === 10 && !formData.panVerified && (
            <TouchableOpacity onPress={handleVerifyPAN} style={styles.verifyButton}>
              <MaterialIcons name="verified" size={20} color="#000" />
              <Text style={styles.verifyButtonText}>Verify PAN</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={goToPreviousStep} style={[styles.navButton, { backgroundColor: 'transparent' }]}>
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleContinue} style={[styles.navButton, { backgroundColor: '#F7CE45' }]}>
            <Text style={[styles.navButtonText, { color: '#000' }]}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 20 },
  label: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, color: '#fff' },
  required: { color: 'red' },
  input: { height: 50, borderColor: '#1E1E1E', borderWidth: 1, backgroundColor: colors.primaryColor, elevation: 3, marginBottom: 10, color: '#fff', borderRadius: 10, paddingLeft: 10 },
  verifiedInput: { borderColor: '#74FF8DBF' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 10 },
  radioButton: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7CE45', paddingVertical: 12, borderRadius: 10, marginBottom: 15, gap: 8 },
  verifyButtonText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  verifiedBox: { backgroundColor: 'rgba(0,200,83,0.1)', borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)', borderRadius: 10, padding: 12, marginBottom: 15 },
  verifiedText: { color: '#00c853', fontSize: 14, fontWeight: 'bold' },
  downloadButton: { flexDirection: 'row', padding: 10, backgroundColor: '#FDD1221A', borderWidth: 1, borderColor: '#FDD122', borderStyle: 'dashed', marginBottom: 10, borderRadius: 10, gap: 10, alignItems: 'center' },
  uploadButton: { height: 150, backgroundColor: '#1B1B1B', alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderRadius: 10, elevation: 3 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-evenly', padding: 16, borderTopWidth: 1, borderTopColor: '#333' },
  navButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F7CE45', paddingHorizontal: 50, borderRadius: 30, paddingVertical: 10 },
  navButtonText: { color: '#F7CE45', fontWeight: 'bold', fontSize: 16 },
});

export default memo(Step2KYCVerification);
