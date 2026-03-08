// utils/privateaws.js
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { Config } from '../../Config';
import axiosInstance from './Api';

// Define the private bucket from config
const PRIVATE_BUCKET = Config.AWS_BUCKET_PRIVATE;

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

// --- Exported Functions for PRIVATE bucket ---

/**
 * Uploads an image to the PRIVATE bucket.
 */
export const uploadImageToS3Private = async (imagePath, path) => {
  const filename = imagePath.split('/').pop();
  const key = `${path}/${uuidv4()}_${filename.replace(/\s+/g, '_')}`;
  const contentType = getContentType(imagePath);

  try {
    const { data } = await axiosInstance.post('/s3/simple-upload-url', {
      key,
      contentType,
      bucket: PRIVATE_BUCKET,
    });
    
    // Read file as base64 and convert to buffer for upload
    const fileData = await RNFS.readFile(imagePath, 'base64');
    const buffer = Buffer.from(fileData, 'base64');
    
    await axios.put(data.signedUrl, buffer, { 
      headers: { 'Content-Type': contentType } 
    });
    
    return key;
  } catch (error) {
    console.error("Private image upload failed:", error.response);
    throw new Error("Failed to upload private image.");
  }
};

/**
 * Uploads a video to the PRIVATE bucket using multipart flow.
 */
export const uploadVideoToS3Private = async (videoPath, path, onProgress) => {
  const filename = videoPath.split('/').pop();
  const key = `${path}/${uuidv4()}_${filename.replace(/\s+/g, '_')}`;
  const contentType = getContentType(videoPath);
  
  // Get file size
  const fileInfo = await RNFS.stat(videoPath);
  const fileSize = fileInfo.size;
  
  const CHUNK_SIZE = 15 * 1024 * 1024; // 15MB
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  let uploadedChunks = 0;

  try {
    // 1. Start multipart upload
    const { data: { uploadId } } = await axiosInstance.post('/s3/create-multipart-upload', {
      key,
      contentType,
      bucket: PRIVATE_BUCKET,
    });

    const parts = [];
    const uploadPromises = [];

    for (let i = 0; i < totalChunks; i++) {
      const partNumber = i + 1;
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      
      const promise = (async () => {
        // Read chunk from file as base64 and convert to buffer
        const chunkBase64 = await RNFS.read(videoPath, end - start, start, 'base64');
        const buffer = Buffer.from(chunkBase64, 'base64');
        
        // 2. Get presigned URL for the part
        const { data: { signedUrl } } = await axiosInstance.post('/s3/get-upload-part-url', {
          key,
          uploadId,
          partNumber,
          bucket: PRIVATE_BUCKET,
        });
        
        // 3. Upload the part to S3
        const response = await axios.put(signedUrl, buffer, { 
          headers: { 'Content-Type': contentType } 
        });
        
        // 4. Collect the ETag and PartNumber
        parts.push({ 
          ETag: response.headers.etag.replace(/"/g, ''), 
          PartNumber: partNumber 
        });
        
        // 5. Update progress
        uploadedChunks++;
        if (onProgress) {
          onProgress(Math.round((uploadedChunks / totalChunks) * 100));
        }
      })();
      
      uploadPromises.push(promise);
    }

    await Promise.all(uploadPromises);

    // 6. Complete the upload
    await axiosInstance.post('/s3/complete-multipart-upload', {
      key,
      uploadId,
      parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      bucket: PRIVATE_BUCKET,
    });

    return key;
  } catch (error) {
    console.error("Private video upload failed:", error);
    throw new Error("Failed to upload private video.");
  }
};

/**
 * Uploads a PDF to the PRIVATE bucket.
 */
export const uploadPdfToS3Private = async (pdfPath, path) => {
  const filename = pdfPath.split('/').pop();
  const key = `${path}/${uuidv4()}_${filename.replace(/\s+/g, '_')}`;
  const contentType = 'application/pdf';

  try {
    const { data } = await axiosInstance.post('/s3/simple-upload-url', {
      key,
      contentType,
      bucket: PRIVATE_BUCKET,
    });
    
    // Read file as base64 and convert to buffer for upload
    const fileData = await RNFS.readFile(pdfPath, 'base64');
    const buffer = Buffer.from(fileData, 'base64');
    
    await axios.put(data.signedUrl, buffer, { 
      headers: { 'Content-Type': contentType } 
    });
    
    return key;
  } catch (error) {
    console.error("Private PDF upload failed:", error);
    throw new Error("Failed to upload private PDF.");
  }
};

/**
 * Generates a temporary URL to view a private object.
 */
export const generateSignedUrlPrivate = async (key) => {
  try {
    const { data } = await axiosInstance.post('/s3/download-url', {
      key,
      bucket: PRIVATE_BUCKET,
    });
    return data.signedUrl;
  } catch (error) {
    console.error("Error generating private signed URL:", error);
    return null;
  }
};

/**
 * Deletes an object from the PRIVATE bucket.
 */
export const deleteObjectFromS3Private = async (key) => {
  try {
    await axiosInstance.delete('/s3/delete-object', {
      data: { key, bucket: PRIVATE_BUCKET }
    });
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete private object.');
  }
};

// Alias for consistency
export const generateSignedVideoUrlPrivate = generateSignedUrlPrivate;

// Batch upload function for private bucket
export const uploadMultipleFilesPrivate = async (files, path, onProgress) => {
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
        result = await uploadVideoToS3Private(
          fileInfo.filePath, 
          path, 
          fileProgress
        );
      } else if (fileInfo.contentType && fileInfo.contentType.startsWith('image/')) {
        result = await uploadImageToS3Private(
          fileInfo.filePath, 
          path
        );
      } else if (fileInfo.contentType === 'application/pdf') {
        result = await uploadPdfToS3Private(
          fileInfo.filePath, 
          path
        );
      } else {
        result = await uploadImageToS3Private(
          fileInfo.filePath, 
          path
        );
      }
      
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error('Private batch upload error:', error);
    throw error;
  }
};
