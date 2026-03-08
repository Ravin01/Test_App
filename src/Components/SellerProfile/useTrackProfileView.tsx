import { useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axiosInstance from '../../Utils/Api';

export const useTrackProfileView = (profileData) => {
    useEffect(() => {
        const controller = new AbortController();
        const trackedRef = { current: false };

        const trackView = async () => {
            if (!profileData?.user?._id || trackedRef.current) return;
            trackedRef.current = true;

            try {
                const netState = await NetInfo.fetch();
                const ip = netState?.details?.ipAddress || 'unknown';

                await axiosInstance.post(
                    `profile-analytics/${profileData?.user?._id}/view`,
                    null,
                    {
                        signal: controller.signal,
                        timeout: 3000,
                        headers: {
                            // Use lowercase header names
                            'x-client-ip': ip,
                            'x-client-platform': Platform.OS, // 'ios' or 'android'
                        },
                    }
                );
              //  console.log("works")
            } catch (error) {
                // error handling
                console.log(error, "error ")
            }
        };

        const timer = setTimeout(trackView, 500);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [profileData?.user?._id]);

}