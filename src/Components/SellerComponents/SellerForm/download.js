import RNFS, { downloadFile } from 'react-native-fs';
import { Platform, ToastAndroid, Linking } from 'react-native';

const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};


const generateCustomUUID = () => {
  let d = new Date().getTime();
  let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

export const downloadPDF = async () => {
  const filePath = 'bundle-assets://Flykup_GST_Exemption_Social_Seller.pdf';
  // Using generateUniqueId instead of uuidv4
  const destination = `${RNFS.DocumentDirectoryPath}/Flykup_GST_Exemption_Social_Seller${generateUniqueId()}.pdf`;

  try {
    await downloadFile(filePath, destination);
    console.log('PDF downloaded successfully');
  } catch (error) {
    console.error('Error downloading PDF:', error);
  }
};

const pdfUrl1 = `https://d2jp9e7w3mhbvf.cloudfront.net/assets/documents/a3141735-33fd-4b3f-9477-ffe976c490ab_Flykup_GST_Exemption_Social_Seller.pdf`;
const downloadPDFToDownloads = async (pdfUrl=pdfUrl1,name="FlykupGst") => {
  try {
    // Using generateUniqueId instead of uuidv4
    const pdfName = `${name}${generateUniqueId()}.pdf`;
    const destinationPath = `${RNFS.DownloadDirectoryPath}/${pdfName}`;

    if (Platform.OS === 'android') {
      const options = {
        fromUrl: pdfUrl,
        toFile: destinationPath,
        background: true,
        discretionary: true,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          // You can use this progress value to show download progress
        },
      };

      const downloadResult = await RNFS.downloadFile(options).promise;

      if (downloadResult.statusCode === 200) {
        ToastAndroid.show('File downloaded successfully to Downloads folder', ToastAndroid.SHORT);

        // Improved file opening logic
        try {
          // First try with FileViewer (more reliable for PDFs)
          // await FileViewer.open(destinationPath, { 
          //   showOpenWithDialog: true,
          //   showAppsSuggestions: true 
          // });
              await Linking.openURL(pdfUrl);
          console.log('File opened successfully with FileViewer');
        } catch (fileViewerError) {
          console.log('FileViewer failed, trying with Linking...', fileViewerError);
          
          // Fallback to Linking
          try {
            const fileUrl = `file://${destinationPath}`;
            const canOpen = await Linking.canOpenURL(pdfUrl);

            if (canOpen) {
              await Linking.openURL(pdfUrl);
              console.log('File opened successfully with Linking');
            } else {
              console.log('No app available to open the PDF');
              ToastAndroid.show('Please install a PDF reader app to view this file', ToastAndroid.LONG);
            }
          } catch (linkingError) {
            console.error('Error opening PDF with Linking:', linkingError);
            ToastAndroid.show('Error opening file: ' + linkingError.message, ToastAndroid.LONG);
          }
        }

        return true;
      } else {
        throw new Error('Server responded with status code: ' + downloadResult.statusCode);
      }
    } else {
      // For iOS - improved handling
      try {
        // Try to download and open locally on iOS too
        const options = {
          fromUrl: pdfUrl,
          toFile: destinationPath,
        };

        const downloadResult = await RNFS.downloadFile(options).promise;
        
        // if (downloadResult.statusCode === 200) {
        //   // await FileViewer.open(destinationPath);
        // } else {
          // Fallback to opening URL directly
          Linking.openURL(pdfUrl);
        // }
      } catch (iosError) {
        console.log('iOS local download failed, opening URL directly:', iosError);
        Linking.openURL(pdfUrl);
      }
    }

    return true;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    ToastAndroid.show('Error downloading file: ' + error.message, ToastAndroid.LONG);
    return false;
  }
};

export default downloadPDFToDownloads;