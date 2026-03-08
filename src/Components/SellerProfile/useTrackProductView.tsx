import { useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axiosInstance from '../../Utils/Api';

export const useTrackProductView = (productId) => {
    useEffect(() => {
        if (!productId) return;

        const controller = new AbortController();

        const trackView = async () => {
            try {
                const netState = await NetInfo.fetch();
                const ip = netState.details?.ipAddress || 'unknown';

                await axiosInstance.post(
                    `/productInteraction/${productId}/view`,
                    null,
                    {
                        signal: controller.signal,
                        timeout: 5000, 
                        headers: {
                            // Use lowercase header names
                            'x-client-ip': ip,
                            'x-client-platform': Platform.OS, // 'ios' or 'android'
                        },
                    }
                );
                // console.log("works")
            } catch (error) {
                // error handling
                console.log(error,"error ")
            }
        };

        const timeoutId = setTimeout(trackView, 1000);
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [productId]);
};