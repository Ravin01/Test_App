import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Dimensions
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {AuthContext} from '../Context/AuthContext';
import axiosInstance from "../Utils/Api";
import { useDebouncedGoBack } from '../Utils/useDebouncedGoBack';
import LinearGradient from 'react-native-linear-gradient';
import {ArrowLeftCircle, Heart, HeartOff} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const {width, height} = Dimensions.get('window');

const SellerSettings = ({navigation}) => {
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);
  const {user}: any = useContext(AuthContext);
  const [bankAccount, setBankAccount] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: "",
    ifscCode: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchBankAccount = async () => {
      try {
        const response = await axiosInstance.get(
          "/apply/verify-bank-account/status"
        );
        if (response.data.status === "success" && response.data.data) {
          const account = Array.isArray(response.data.data)
            ? response.data.data[0]
            : response.data.data;
            console.log("Fetched bank account:", account);
          setBankAccount(account);
        }
      } catch (error) {
        console.log("No existing verification found");
      } finally {
        setInitialLoading(false);
      }
    };

    if (user) fetchBankAccount();
    else setInitialLoading(false);
  }, [user]);

  

  const handleInputChange = (name, value) => {
    if (name === "name") {
      const cleanedValue = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    const { accountNumber, ifscCode, name } = formData;

    if (!accountNumber.trim() || !ifscCode.trim()) {
      setError("Account number and IFSC code are required");
      return false;
    }

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      setError("Account number must be 9-18 digits");
      return false;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      setError("Invalid IFSC format (e.g., SBIN0000123)");
      return false;
    }

    if (
      name.trim() &&
      (name.length < 2 || name.length > 50 || !/^[a-zA-Z\s]+$/.test(name))
    ) {
      setError("Name must be 2-50 characters, letters only");
      return false;
    }

    return true;
  };

  console.log('role', user.role)
  console.log('sellerId',user.sellerInfo._id);

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axiosInstance.post(
        "/apply/verify-bank-account",
        {
          accountNumber: formData.accountNumber.trim(),
          ifscCode: formData.ifscCode.trim().toUpperCase(),
          name: formData.name.trim() || undefined,
          role: user.role, // Get role from useAuth context
          sellerId: user.role === 'seller' ? user.sellerInfo._id : null
        }
      );

      console.log(response);

      if (response.data.status === "success") {
        setSuccess(response.data.message);
        setBankAccount(response.data.data);
        closeModal();
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    if (bankAccount) {
      setFormData({
        accountNumber: bankAccount.accountNumber || "",
        ifscCode: bankAccount.ifscCode || "",
        name: bankAccount.accountHolderName || "",
      });
    } else {
      setFormData({
        accountNumber: "",
        ifscCode: "",
        name: "",
      });
    }
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ accountNumber: "", ifscCode: "", name: "" });
    setError("");
    setSuccess("");
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return "";
    return `****${accountNumber.slice(-4)}`;
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapperContainer}>
      <View style={styles.header1}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}>
                <ArrowLeftCircle color={'#fff'} size={24} />
              </TouchableOpacity>
              <LinearGradient
                colors={['#B38728', '#FFD700']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.headerGradient}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title1}>Seller Settings</Text>
                </View>
              </LinearGradient>
              <View style={styles.headerSpacer} />
            </View>
    <ScrollView style={styles.container}>

        {/* Header */}
           
     
      <View style={styles.header}>
        <Ionicons name="card" size={28} color="#FFD700" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.title}>Bank Account</Text>
          <Text style={styles.subtitle}>Manage your banking details</Text>
        </View>
      </View>

      {/* Bank Account Card */}
      <TouchableOpacity
        style={[
          styles.card,
          bankAccount?.accountNumber && bankAccount?.verificationStatus !== "verified" && styles.cardActive,
        ]}
        disabled={bankAccount?.verificationStatus === "verified"}
        onPress={openModal}
      >
        {bankAccount?.accountNumber ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.accountNumber}>
                {bankAccount.verificationStatus === "verified"
                  ? maskAccountNumber(bankAccount.accountNumber)
                  : bankAccount.accountNumber}
              </Text>
              <View
                style={[
                  styles.status,
                  bankAccount.verificationStatus === "verified"
                    ? styles.verified
                    : styles.pending,
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={
                    bankAccount.verificationStatus === "verified"
                      ? "green"
                      : "orange"
                  }
                />
                <Text
                  style={{
                    color:
                      bankAccount.verificationStatus === "verified"
                        ? "green"
                        : "orange",
                  }}
                >
                  {bankAccount.verificationStatus === "verified"
                    ? "Verified"
                    : "Pending"}
                </Text>
              </View>
            </View>
            <Text style={styles.info}>{bankAccount.ifscCode}</Text>
            {bankAccount.bankName && (
              <Text style={styles.info}>{bankAccount.bankName}</Text>
            )}
            {bankAccount.verificationStatus !== "verified" && (
              <Text style={styles.errorNote}>Please verify bank account</Text>
            )}
          </>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Ionicons name="add-circle-outline" size={32} color="gray" />
            <Text style={styles.info}>
              {bankAccount ? "No account details found" : "Add Bank Account"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}>
                {bankAccount ? "Account Details" : "Add Bank Account"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="gray" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Account Number"
              style={styles.input}
              value={formData.accountNumber}
              onChangeText={(text) => handleInputChange("accountNumber", text)}
              keyboardType="numeric"
              maxLength={18}
            />
            <TextInput
              placeholder="IFSC Code"
              style={styles.input}
              value={formData.ifscCode}
              onChangeText={(text) => handleInputChange("ifscCode", text)}
              autoCapitalize="characters"
              maxLength={11}
            />
            <TextInput
              placeholder="Account Holder Name (Optional)"
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange("name", text)}
              maxLength={50}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text style={[styles.buttonText, { color: "black" }]}>
                    {bankAccount ? "Verify" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapperContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: { flex: 1, backgroundColor: "#121212", padding: 16, paddingTop: 0 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" },
  loadingText: { color: "#FFD700", marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  title: { color: "#FFD700", fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#aaa", fontSize: 14 },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardActive: { borderColor: "#FFD700", borderWidth: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  accountNumber: { color: "#FFD700", fontSize: 16, fontWeight: "600" },
  status: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  verified: { backgroundColor: "#003300" },
  pending: { backgroundColor: "#332200" },
  info: { color: "#ccc", marginTop: 4 },
  errorNote: { color: "red", marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 20,
    width: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#121212",
    borderColor: "#444",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFD700",
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "red", marginTop: 8 },
  successText: { color: "green", marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: { backgroundColor: "gray" },
  submitButton: { backgroundColor: "#FFD700" },
  buttonText: { color: "white", fontWeight: "600" },

  header1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.1,
    paddingVertical: height * 0.01,
    // paddingHorizontal: width * 0.02,
    marginBottom: 10,
  },
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
    backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
    titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
    title1: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
});

export default SellerSettings;
