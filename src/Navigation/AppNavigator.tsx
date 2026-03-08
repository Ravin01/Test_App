import React, {memo} from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import CustomDrawerContent from './CustomDrawerContent';
import BottomTabBar from './BottomTabBar';
import useUserAppInfo from '../hooks/useUserAppInfo';
import { SafeAreaView } from 'react-native-safe-area-context';

const Drawer = createDrawerNavigator();

const AppNavigator = memo(() => {
  useUserAppInfo();
  
  return (
    <SafeAreaView style={{flex:1}}  edges={['top', 'left', 'right']}>
    <Drawer.Navigator
      id={undefined}
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'front', 
        drawerPosition: 'right',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        headerShown: false,
        drawerActiveTintColor: '#F7CE45',
        drawerStyle: {
          width: 250,
          backgroundColor: '#000000',
          borderRadius: 0,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        },
        swipeEnabled: false,
        // Performance optimizations
        lazy: true,
        // No animation for drawer
        drawerStatusBarAnimation: 'none',
      }}>
      <Drawer.Screen name="HomeTabs" component={BottomTabBar} />
    </Drawer.Navigator>
    </SafeAreaView>
  );
});

AppNavigator.displayName = 'AppNavigator';

export default AppNavigator;
