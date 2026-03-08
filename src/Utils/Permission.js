import {Linking, Alert, PermissionsAndroid, Platform } from 'react-native';
import { permissions } from 'react-native-webrtc';

const permissionTypes = {
    camera: PermissionsAndroid.PERMISSIONS.CAMERA,
    gallery: PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    notification: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    microphone: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  };

export const requestAllPermissions= async ()=> {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      // PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      // PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      // PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA
    ])
    // console.log('granted',granted);
  }

export const checkPermission = async (permission) => {
  try {
    if(permission=='gallery')
      return true;
    const status = await PermissionsAndroid.check(permissionTypes[permission]);

    if (!status) {
      // ✅ Await the user's response to the permission request
      const requestStatus = await PermissionsAndroid.request(permissionTypes[permission]);

      // ✅ PermissionsAndroid.request returns 'granted' or 'denied' etc.
      if (requestStatus !== PermissionsAndroid.RESULTS.GRANTED) {
        await handleDeniedPermissions(permission);
        return false;
      }

      return true;
    }

    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}


export const handleDeniedPermissions = async (permissionType) => {
  console.log(permissionType)
  const readableName = permissionType.charAt(0).toUpperCase() + permissionType.slice(1);
  // console.log(readableName)

  Alert.alert(
    'Permission Required',
    `${readableName} permission was denied. Please enable it in settings to continue.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  };


//For Notifications
export const checkPermission1 = async (permission) => {
  try {
    const status = await PermissionsAndroid.check(permissionTypes[permission]);

    if (!status) {
      const requestStatus = await PermissionsAndroid.request(permissionTypes[permission]);

      if (requestStatus !== PermissionsAndroid.RESULTS.GRANTED) {
        return { granted: false, denied: permission };
      }

      return { granted: true };
    }

    return { granted: true };
  } catch (err) {
    console.log(err);
    return { granted: false };
  }
};

//For notifications
export const isPermissionGranted = async (permission) => {
  try {
    return await PermissionsAndroid.check(permissionTypes[permission]);
  } catch (err) {
    console.log(err);
    return false;
  }
};

// For Notifications
export const handleDeniedPermissions1 = async (permissionType) => {
  // Just return the permission that was denied
  return permissionType;
};
