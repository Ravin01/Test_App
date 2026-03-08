import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../Utils/Colors';
import { AWS_CDN_URL } from '../../Utils/aws';
import LinearGradient from 'react-native-linear-gradient';
import ImageModal from './ImageModal';

const { width } = Dimensions.get('window');

// Responsive breakpoints based on your config
const getScreenSize = () => {
  if (width >= 1280) return 'xl';      // Laptops and desktops
  if (width >= 1024) return 'lg';      // Tablets landscape and small laptops
  if (width >= 768) return 'md';       // Tablets in portrait mode
  if (width >= 430) return 'sm';       // Large mobile phones
  if (width >= 375) return 'xs';       // Small mobile phones
  return 'xs';                         // Very small screens
};

const UserItem = ({ user, onFollow, onUnfollow ,isActionVisible}) => {
  const navigation = useNavigation();
  const screenSize = getScreenSize();

  const handleProfileClick = () => {
    navigation.navigate('ViewSellerProdile', { id: user?.userName });
  };
  const [isImageModal,setisIamgeModal]=useState(false)

  // Responsive class generators
  const getContainerClasses = () => {
    const baseClasses = 'flex-row items-center border-b';
    switch (screenSize) {
      case 'xl':
      case 'lg':
        return `${baseClasses} py-4 px-6 lg:py-5 lg:px-8`;
      case 'md':
        return `${baseClasses} py-3 px-5 md:py-4 md:px-6`;
      case 'sm':
        return `${baseClasses} py-2.5 px-4 sm:py-3 sm:px-5`;
      default:
        return `${baseClasses} py-2 px-3 xs:py-2.5 xs:px-4`;
    }
  };

  const getAvatarSize = () => {
    switch (screenSize) {
      case 'xl': return { width: 56, height: 56, borderRadius: 28 ,backgroundColor:'#333'};
      case 'lg': return { width: 52, height: 52, borderRadius: 26  ,backgroundColor:'#333'};
      case 'md': return { width: 48, height: 48, borderRadius: 24  ,backgroundColor:'#333'};
      case 'sm': return { width: 44, height: 44, borderRadius: 22  ,backgroundColor:'#333'};
      default: return { width: 40, height: 40, borderRadius: 20  ,backgroundColor:'#333'};
    }
  };

  const getTextSizes = () => {
    switch (screenSize) {
      case 'xl': return { userName: 'text-xl', role: 'text-base', follow: 'text-base' };
      case 'lg': return { userName: 'text-lg', role: 'text-base', follow: 'text-base' };
      case 'md': return { userName: 'text-lg', role: 'text-sm', follow: 'text-sm' };
      case 'sm': return { userName: 'text-base', role: 'text-sm', follow: 'text-sm' };
      default: return { userName: 'text-base', role: 'text-xs', follow: 'text-xs' };
    }
  };

  const getIconSize = () => {
    switch (screenSize) {
      case 'xl': case 'lg': return 20;
      case 'md': return 18;
      case 'sm': return 16;
      default: return 14;
    }
  };

  const avatarSize = getAvatarSize();
  const textSizes = getTextSizes();
  const iconSize = getIconSize();

  const renderFollowButton = () => {
    const baseButtonClasses = 'flex-row items-center rounded-xl';
    const paddingClasses = screenSize === 'xl' || screenSize === 'lg' 
      ? 'py-3 px-4' 
      : screenSize === 'md' 
      ? 'py-2.5 px-3.5' 
      : 'py-2 px-3';
// console.log(user.followStatus)
    if (!user.followStatus) return null;

    if (user.followStatus === 'Following') {
      return (
        <TouchableOpacity
          onPress={() => onUnfollow(user.userId)}
          className={`${baseButtonClasses} ${paddingClasses} bg-gray-800`}
          style={{ gap: screenSize === 'xs' ? 4 : 6 }}
        >
          <Icon name="person-remove" size={iconSize} color="white" />
          <Text className={`${textSizes.follow} text-white font-medium`}>
            Following
          </Text>
        </TouchableOpacity>
      );
    }

    if (user.followStatus === 'Followback') {
      return (
        <TouchableOpacity
          onPress={() => onFollow(user.userId)}
          className={`${baseButtonClasses} ${paddingClasses} bg-brand-yellow`}
          style={{ gap: screenSize === 'xs' ? 4 : 6 }}
        >
          <Icon name="person-add-alt-1" size={iconSize} color="#000" />
          <Text className={`${textSizes.follow} text-black font-medium`}>
            Follow Back
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => onFollow(user.userId)}
        className={`${baseButtonClasses} ${paddingClasses}`}
        style={{ 
          backgroundColor: '#e4b640',
          gap: screenSize === 'xs' ? 4 : 6 
        }}
      >
        <Icon name="person-add" size={iconSize} color="#000" />
        <Text className={`${textSizes.follow} text-black font-medium`}>
          Follow
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View 
      className={getContainerClasses()}
      style={{ 
        borderColor: colors.SecondaryColor,
        paddingBottom: screenSize === 'xl' || screenSize === 'lg' ? 20 : screenSize === 'md' ? 16 : 12
      }}
    >
      <ImageModal visible={isImageModal} onClose={()=>setisIamgeModal(false)} imageUri={`${AWS_CDN_URL}${user?.profileURL}`}/>
      {/* Avatar Container */}
     <TouchableOpacity
  className={`
    border-3 rounded-full
    ${screenSize === 'xl' || screenSize === 'lg' ? 'mr-6' : 
      screenSize === 'md' ? 'mr-5' : 
      screenSize === 'sm' ? 'mr-4' : 'mr-3'}
  `}
  style={{
    borderRadius: avatarSize.borderRadius + 4
  }}
  onPress={handleProfileClick}
>
  <LinearGradient
    colors={['#ffd700', '#fced9c', '#fafafa']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{
      padding: 2, // thickness of border
      borderRadius: avatarSize.borderRadius + 4,
    }}
  >
    {user?.profileURL ? (
      <TouchableOpacity onPress={()=>setisIamgeModal(true)}>
      <Image
        source={{ uri: `${AWS_CDN_URL}${user?.profileURL}` }}
        style={{
          ...avatarSize,
          borderRadius: avatarSize.borderRadius,
        }}
      />
      </TouchableOpacity>
    ) : (
      // <View
      //   className="bg-gray-800 items-center justify-center"
      
      // >
        <LinearGradient
                        style={{
          ...avatarSize,
          borderRadius: avatarSize.borderRadius,alignItems:'center',justifyContent:'center'
        }}
                                          colors={['#ffd700', '#fced9c', '#FF8453']}
                                          start={{ x: 0, y: 0 }}
                                          end={{ x: 1, y: 1 }}>
                                             <Text
          className={`
            text-black font-medium capitalize
            ${screenSize === 'xl' ? 'text-xl' : 
              screenSize === 'lg' ? 'text-lg' : 
              screenSize === 'md' ? 'text-base' : 'text-sm'}
          `}
        >
          {user?.userName?.charAt(0)}
          {user?.userName?.charAt(1)}
        </Text>
                                          </LinearGradient>
       
      // </View>
    )}
  </LinearGradient>
</TouchableOpacity>


      {/* User Info Container */}
      <TouchableOpacity
        className={`
          flex-1
          ${screenSize === 'xl' || screenSize === 'lg' ? 'gap-2' : 'gap-1.5'}
        `}
        onPress={handleProfileClick}
      >
        <Text 
          className={`
            ${textSizes.userName} text-white font-medium capitalize
            ${screenSize === 'xl' || screenSize === 'lg' ? 'font-semibold' : ''}
          `}
        >
          @{user.name || user.userName}
        </Text>
        <Text 
          className={`
            ${textSizes.role} text-gray-400 capitalize
            ${screenSize === 'xl' || screenSize === 'lg' ? 'font-medium' : ''}
          `}
        >
           {user.role}
        </Text>
      </TouchableOpacity>

      {/* Follow Button */}
      {isActionVisible && renderFollowButton()}
    </View>
  );
};

// Custom hook for UserItem responsive utilities
export const useUserItemResponsive = () => {
  const { width, height } = Dimensions.get('window');
  
  const getScreenSize = () => {
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 430) return 'sm';
    if (width >= 375) return 'xs';
    return 'xs';
  };

  const screenSize = getScreenSize();

  return {
    width,
    height,
    screenSize,
    isXL: screenSize === 'xl',
    isLG: screenSize === 'lg',
    isMD: screenSize === 'md',
    isSM: screenSize === 'sm',
    isXS: screenSize === 'xs',
    
    // Get responsive avatar size
    getAvatarSize: () => {
      switch (screenSize) {
        case 'xl': return 56;
        case 'lg': return 52;
        case 'md': return 48;
        case 'sm': return 44;
        default: return 40;
      }
    },
    
    // Get responsive icon size
    getIconSize: () => {
      switch (screenSize) {
        case 'xl': case 'lg': return 20;
        case 'md': return 18;
        case 'sm': return 16;
        default: return 14;
      }
    },
    
    // Get responsive gap size
    getGapSize: () => {
      switch (screenSize) {
        case 'xl': case 'lg': return 8;
        case 'md': return 6;
        case 'sm': return 5;
        default: return 4;
      }
    }
  };
};

// Alternative optimized version with better performance
export const UserItemOptimized = React.memo(({ user, onFollow, onUnfollow }) => {
  const navigation = useNavigation();
  const { screenSize, getAvatarSize, getIconSize } = useUserItemResponsive();

  const handleProfileClick = React.useCallback(() => {
    navigation.navigate('ViewSellerProdile', { id: user?.userName });
  }, [navigation, user?.userName]);

  const handleFollow = React.useCallback(() => {
    onFollow(user.userId);
  }, [onFollow, user.userId]);

  const handleUnfollow = React.useCallback(() => {
    onUnfollow(user.userId);
  }, [onUnfollow, user.userId]);

  return (
    <UserItem 
      user={user} 
      onFollow={handleFollow} 
      onUnfollow={handleUnfollow} 
    />
  );
});

export default UserItem;