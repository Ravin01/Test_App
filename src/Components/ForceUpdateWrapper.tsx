import React from 'react';
import ForceUpdate from './ForceUpdate';
import {useAuthContext} from '../Context/AuthContext';

/**
 * Wrapper component for ForceUpdate that properly passes params from AuthContext
 * This ensures params are available when the screen is set as initialRoute
 */
const ForceUpdateWrapper = ({route, navigation}: any) => {
  const {initialRoute} = useAuthContext();

  // If this screen was set as initialRoute, use params from AuthContext
  // Otherwise fall back to route params (for navigation.navigate calls)
  const params = route?.params || initialRoute?.params || {};

  console.log('ForceUpdateWrapper - Params:', JSON.stringify(params));
  console.log('ForceUpdateWrapper - Route:', JSON.stringify(route));

  // Create a new route object with the proper params
  const routeWithParams = {
    ...route,
    params,
  };

  return <ForceUpdate route={routeWithParams} navigation={navigation} />;
};

export default ForceUpdateWrapper;
