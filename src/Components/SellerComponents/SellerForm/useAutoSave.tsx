// useSellerDraft.js
import { useState, useEffect, useCallback, useContext } from "react";
import { Alert } from "react-native";
import { saveSellerDraft, getSellerDraft, fetchVerificationStatus } from './draftService';
import { AuthContext } from "../../../Context/AuthContext";

// Helper function to clean mobile number - remove country code prefix if present
const cleanMobileNumber = (mobile: string): string => {
  if (!mobile) return '';
  // Remove '+91' prefix if it exists (handles both '+91' and '+91 ' with space)
  const cleaned = mobile.replace(/^\+91\s*/, '').trim();
  return cleaned;
};

export default function useAutoSave(initialState = {}, autosave = true) {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [verificationData,setVerficationData]=useState({})
  const {user}=useContext(AuthContext)
 const loadDraft = async () => {
      setLoading(true);
      try {
        // console.log('loading data')
        const res = await getSellerDraft();
        // console.log(res,"draft response")
        const cleanedRes = {
          ...res,
          mobileNumber: !user?.mobile ? cleanMobileNumber(res.mobileNumber) :cleanMobileNumber(user?.mobile),
        };
        
   setFormData(prev => ({
        ...prev,
        ...cleanedRes,
      }));
      // console.log("Draft loaded:", cleanedRes);
      } catch (err) {
        console.log("No draft found:", err.message);
      } finally {
        setLoading(false);
      }
    };
  // Load draft from API
  useEffect(() => {
   
    loadDraft();
  }, []);

  // Manual save draft
  const saveDraft = useCallback(async () => {
    try {
      const res = await saveSellerDraft(formData);
      console.log("Draft saved:");
      // if (res.status) {
      //   Alert.alert("✅ Draft Saved", "Your seller application draft was saved.");
      // }
    } catch (err) {
      console.error("error from draft",err);
    }
  }, [formData]);

  // 🔄 Autosave with debounce
  useEffect(() => {
    // console.log(autosave)
    if (!autosave) return; // skip if autosave disabled
    if (!formData) return;
// console.log(formData,"from savve")
    const timeout = setTimeout(() => {
      saveSellerDraft(formData).catch((err) =>
        console.log("Autosave failed:", err.message)
      );
    }, 2000); // save 2s after last change

    return () => clearTimeout(timeout);
  }, [formData, autosave]);
  const fetchVerifiedData=async()=>{
    try{
const data = await fetchVerificationStatus(user)
setVerficationData(data)
    }catch(error){
      console.log(error,"fromverification")
    }

  }
  useEffect(()=>{fetchVerifiedData()},[formData.aadhaarNumber,formData.gstNumber,user])

  return {
    formData,
    setFormData,
    verificationData,
    saveDraft,
    loadDraft,
    loading,
  };
}
