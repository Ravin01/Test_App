import React, { useEffect, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, BackHandler } from 'react-native';
import { colors } from '../../Utils/Colors';
import ProfileSetup from './ProfileSetup';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../Context/AuthContext';

interface ProfileSetupScreenProps {
  navigation: any;
  route?: any;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  navigation,
  route,
}) => {
  const { clearPendingAction }: any = useContext(AuthContext);
  const pendingAction = route?.params?.pendingAction;

  // Prevent hardware back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
          // navigation.goBack();
        // Return true to prevent default back behavior
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  const handleComplete = async () => {
    // After profile setup is complete, check for pending action
    if (pendingAction && pendingAction.screen === 'LiveScreen') {
      console.log('🔄 ProfileSetup complete - Navigating to LiveScreen with params:', pendingAction.params);
      await clearPendingAction();
      navigation.replace('LiveScreen', pendingAction.params);
    } else {
      // Navigate to dashboard
      navigation.replace('bottomtabbar');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Optional back button - uncomment if needed */}
        {/* <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color="#F7CE45" size={24} />
        </TouchableOpacity> */}
        
        {/* <Text style={styles.headerTitle}>Complete Profile Setup</Text> */}
      </View>

      {/* Profile Setup Component */}
      <ProfileSetup navigation={navigation} onClose={handleComplete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryColor,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7CE45',
  },
});

export default ProfileSetupScreen;
