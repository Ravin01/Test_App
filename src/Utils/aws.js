// utils/aws.js
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { Config } from '../../Config';
import axiosInstance from './Api';
export const AWS_CDN_URL='https://d2jp9e7w3mhbvf.cloudfront.net/';
import { Buffer } from 'buffer';
// --- Helper Functions ---
const getContentType = (filePath) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeMap = {
    'mp4': 'video/mp4', 
    'mov': 'video/quicktime', 
    'webm': 'video/webm', 
    'mkv': 'video/x-matroska',
    'jpg': 'image/jpeg', 
    'jpeg': 'image/jpeg', 
    'png': 'image/png', 
    'gif': 'image/gif',
    'pdf': 'application/pdf'
  };
  return mimeMap[extension] || 'application/octet-stream';
};

const validateVideoFile = (filePath) => {
  const supportedExtensions = ['mp4', 'mov', 'webm', 'mkv'];
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  return supportedExtensions.includes(fileExtension);
};

// --- Core Upload Logic ---

// Uploads small files like images using a single URL
const simpleUpload = async (filePath, bucket, path) => {
  try {
    // console.log("filebath",filePath)
    const filename = filePath.split('/').pop();
    const key = `${path}/${uuidv4()}_${filename.replace(/\s+/g, '_')}`;
    const contentType = getContentType(filePath);
    // console.log({ 
    //   key, 
    //   contentType, 
    //   bucket 
    // })
    const { data } = await axiosInstance.post('/s3/simple-upload-url', { 
      key, 
      contentType, 
      bucket 
    });
    // console.log(data)
    // Read file as base64 and convert to blob for upload
    
    const fileData = await RNFS.readFile(filePath, 'ascii');
    // Convert to Uint8Array for sending
    const buffer = Buffer.from(fileData, 'binary');
    // const fileData = await RNFS.readFile(filePath, 'base64');
    // const blob = await fetch(`data:${contentType};base64,${fileData}`).then(res => res.blob());
    
    await axios.put(data.signedUrl, buffer, { 
      headers: { 'Content-Type': contentType } 
    });
    
    return key;
  } catch (error) {
    console.log("Error response",error.response)
    console.error("Simple upload failed:", error.response.data);
    throw new Error("Failed to upload file.");
  }
};

// Uploads large files like videos using multipart flow for reliability
const multipartUpload = async (filePath, bucket, path, onProgress) => {
  if (!validateVideoFile(filePath)) {
    throw new Error("Unsupported video format.");
  }
  
  try {
    const filename = filePath.split('/').pop();
    const key = `${path}/${uuidv4()}_${filename.replace(/\s+/g, '_')}`;
    const contentType = getContentType(filePath);
    
    // Get file size
    const fileInfo = await RNFS.stat(filePath);
    const fileSize = fileInfo.size;
    
    const CHUNK_SIZE = 5 * 1024 * 1024; // Reduced to 5MB for better stability
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    let uploadedChunks = 0;
    
    console.log("Starting multipart upload:", { 
      key, 
      contentType, 
      bucket,
      fileSize,
      totalChunks
    });

    // 1. Create multipart upload
    const createResponse = await axiosInstance.post('/s3/create-multipart-upload', { 
      key, 
      contentType, 
      bucket 
    });
    
    const { uploadId } = createResponse.data;
    console.log("Created multipart upload with ID:", uploadId);
    
    const parts = [];
    const uploadPromises = [];

    // Upload chunks sequentially instead of all at once to avoid network issues
    for (let i = 0; i < totalChunks; i++) {
      const partNumber = i + 1;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkSize = end - start;
      
      try {
        console.log(`Uploading part ${partNumber}/${totalChunks}`);
        
        // Read chunk from file as base64
        const chunkBase64 = await RNFS.read(filePath, chunkSize, start, 'base64');
        
        // Convert base64 to buffer - FIXED: No more blob conversion
        const buffer = Buffer.from(chunkBase64, 'base64');

        // Get presigned URL for this part
        const partUrlResponse = await axiosInstance.post('/s3/get-upload-part-url', { 
          key, 
          uploadId, 
          partNumber, 
          bucket 
        });
        
        const { signedUrl } = partUrlResponse.data;
        console.log(`Got signed URL for part ${partNumber}`);

        // Upload the part directly with buffer
        const response = await axios.put(signedUrl, buffer, { 
          headers: { 
            'Content-Type': contentType,
            'Content-Length': chunkSize
          },
          timeout: 30000 // 30 second timeout per chunk
        });
        
        parts.push({ 
          ETag: response.headers.etag.replace(/"/g, ''), 
          PartNumber: partNumber 
        });
        
        uploadedChunks++;
        if (onProgress) {
          onProgress(Math.round((uploadedChunks / totalChunks) * 100));
        }
        
        console.log(`Completed part ${partNumber}/${totalChunks}`);
        
      } catch (error) {
        console.error(`Error uploading part ${partNumber}:`, error);
        throw new Error(`Failed to upload part ${partNumber}: ${error.message}`);
      }
    }

    // Complete the multipart upload
    console.log("Completing multipart upload...");
    await axiosInstance.post('/s3/complete-multipart-upload', {
      key,
      uploadId,
      parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      bucket,
    });

    console.log("Multipart upload completed successfully");
    return key;
    
  } catch (error) {
    console.error("Multipart upload failed:", error);
    console.log(error.response.data)
    
    // Attempt to abort the upload if it fails
   
    throw new Error(`Failed to upload video: ${error.message}`);
  }
};
// --- Exported Functions ---

export const uploadImageToS3 = (imagePath, path,privateKey=false) => {
  const bucket = privateKey ?Config.AWS_SHOPPABLE_BUCKET:Config.AWS_BUCKET;
  // const bucket =Config.AWS_BUCKET;
  // console.log(bucket)
  return simpleUpload(imagePath, bucket, path);
};

export const uploadVideoToS3 = (videoPath, path, onProgress) => {
  const bucket = Config.AWS_BUCKET;
  return multipartUpload(videoPath, bucket, path, onProgress);
};

export const uploadShoppableVideoToS3 = (videoPath, path, onProgress) => {
  const bucket = Config.AWS_SHOPPABLE_PUBLIC;
  return multipartUpload(videoPath, bucket, path, onProgress);
};

export const uploadPdfToS3 = (pdfPath, path,privateKey=false) => {

  const bucket = privateKey ?Config.AWS_SHOPPABLE_BUCKET:Config.AWS_BUCKET;
  return simpleUpload(pdfPath, bucket, path);
};

export const generateSignedUrl = async (key) => {
  try {
    const bucket = Config.AWS_BUCKET;
    const { data } = await axiosInstance.post('s3/download-url', { key, bucket });
    return data.signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

export const generatePrivateSignedUrl = async (key) => {
  try {
    const bucket = Config.AWS_SHOPPABLE_BUCKET;
    const { data } = await axiosInstance.post('s3/download-url', { key, bucket });
    return data.signedUrl;
  } catch (error) {
    console.error("Error generating private signed URL:", error);
    return null;
  }
};

export const deleteObjectFromS3 = async (key) => {
  try {
    const bucket = Config.AWS_BUCKET;
    await axiosInstance.delete('/s3/delete-object', { 
      data: { key, bucket } 
    });
    // console.log("deleted",key)
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete object.');
  }
};

export const generateSignedVideoUrl = generateSignedUrl;

// Batch upload function
export const uploadMultipleFiles = async (files, path, onProgress) => {
  try {
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const fileInfo = files[i];
      const fileProgress = (progress) => {
        if (onProgress) {
          const overallProgress = ((i * 100) + progress) / totalFiles;
          onProgress(overallProgress, i, progress);
        }
      };

      let result;
      if (fileInfo.contentType && fileInfo.contentType.startsWith('video/')) {
        result = await uploadVideoToS3(
          fileInfo.filePath, 
          path, 
          fileProgress
        );
      } else if (fileInfo.contentType && fileInfo.contentType.startsWith('image/')) {
        result = await uploadImageToS3(
          fileInfo.filePath, 
          path
        );
      } else if (fileInfo.contentType === 'application/pdf') {
        result = await uploadPdfToS3(
          fileInfo.filePath, 
          path
        );
      } else {
        result = await simpleUpload(
          fileInfo.filePath, 
          Config.AWS_BUCKET, 
          path
        );
      }
      
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
};

// Helper function to get CDN URL for a file
export const getCdnUrl = (key) => {
  const cdnUrl = Config.AWSCDNURL;
  
  if (!cdnUrl) {
    throw new Error('CDN URL not configured');
  }
  
  // Remove any trailing slash from CDN URL and add leading slash to key if needed
  const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
  const cleanKey = key.startsWith('/') ? key : `/${key}`;
  
  return `${cleanCdnUrl}${cleanKey}`;
};


// // Utility to set config from AuthContext
// export const setAwsConfig = (config) => {
//   if (config.AWS_BUCKET) Config.AWS_BUCKET = config.AWS_BUCKET;
//   if (config.AWS_SHOPPABLE_PUBLIC) Config.AWS_SHOPPABLE_PUBLIC = config.AWS_SHOPPABLE_PUBLIC;
//   if (config.AWSCDNURL) Config.AWSCDNURL = config.AWSCDNURL;
  
//   console.log('AWS Config updated:', Config);
// };