import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import SellerProfile from './AboutSellerProfile';
import UserProfile from './AboutUserProfile';
import { AuthContext } from '../../Context/AuthContext';
import Profile from './ProfileViewer';
import { User } from 'lucide-react-native';

function ProfileContainer({ navigation }) {

  const { user }: any = useContext(AuthContext);

  // Get role directly from AuthContext
  const userRole = user?.role;

  // Dynamically choose which component to render based on role
  const ProfileComponent = userRole === 'seller' ? SellerProfile : UserProfile;

  // Show error if profile component couldn't be determined
  if (!ProfileComponent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Profile type not supported</Text>
      </View>
    );
  }

  return <Profile ProfileComponent={ProfileComponent} />;
}

export default ProfileContainer;
