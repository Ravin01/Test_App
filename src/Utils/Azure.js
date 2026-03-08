import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useState } from 'react';
import axiosInstance from './Api';

export const useAzureUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

 // Modify your upload function like this:
const uploadFileToAzure = async (file,generateSasEndpoint,additionalPayload = {}) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    
    try {
      // 1. Get SAS URL from your backend
      const sasResponse = await axiosInstance.post(generateSasEndpoint, {
        originalFilename: file.name,
        ...additionalPayload,
      });
      
      const { sasUrl, blobName } = sasResponse.data;
      console.log(sasResponse.data)
      // 2. Use RNFetchBlob to upload directly instead of reading as base64 first
      const path = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
      
      // 3. Upload using ReactNativeBlobUtil's fetch
      const uploadResponse = await ReactNativeBlobUtil.fetch(
        'PUT',
        sasUrl,
        {
          'Content-Type': file.type,
          'x-ms-blob-type': 'BlockBlob',
        },
        ReactNativeBlobUtil.wrap(path) // This uses the file path directly, avoiding base64 conversion issues
      );
      // console.log(uploadResponse)
      // if (uploadResponse.respInfo.status >= 200 && uploadResponse.respInfo.status < 300) {
        return sasResponse.data
      // } else {
        // console.error(`Upload failed with status: ${uploadResponse.respInfo.status}`);
      // }
    } catch (error) {
      console.error(`Upload failed with status: ${error}`);
      setUploadError(error.message || 'Upload failed');
      // throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFileToAzure, uploadProgress, isUploading, uploadError };
};
