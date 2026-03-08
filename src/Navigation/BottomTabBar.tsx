/* eslint-disable react/no-unstable-nested-components */
import React, {useMemo, memo} from 'react';
import {StyleSheet, View, Image, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Dashboard from '../Components/Dashboard';
import ViewSellerProfile from '../Components/SellerProfile/ViewSellerProfile';
import Categories from '../Components/CategoriesScreen/Categories';
import MyActivityStack from './MyActivityStack';
import AboutUser from '../Components/Profile/AboutUser';
import GlobalSearch from '../Components/GloabalSearch/GlobalSearch';
import {SafeAreaView} from 'react-native-safe-area-context';
import { useTheme } from '../Theme/ResponsiveTheme';
import GuestLectureScreen from '../Components/Reels/ReelsComponent';
import { User } from 'lucide-react-native';
import AccessPage from '../Components/AccessControlPage/AccessPage';
import { bgaActive, bgaInActive, homeActive, homeInActive, playActive, playInActive, searchActive, searchInActive, userActive } from '../assets/assets';
import RoughWork from '../Components/RoughWork';

const Tab = createBottomTabNavigator();

// Memoized icon component to prevent re-renders
const TabIcon = memo(({focused, iconName}: {focused: boolean; iconName: string}) => {
  const iconMap = {
    homeActive: homeActive,
    homeInactive: homeInActive,
    playActive: playActive,
    playInactive: playInActive,
    bagActive: bgaActive,
    bagInactive: bgaInActive,
    searchActive: searchActive,
    searchInactive: searchInActive,
    userActive: userActive,
  };

  if (iconName === 'user' && !focused) {
    return <User color={'#fff'} size={24}/>;
  }

  const iconSource = iconMap[iconName];
  const size = iconName.includes('search') ? 22 : 20;
  
  return <Image source={{uri:iconSource}} style={{width: size, height: size}} />;
});

TabIcon.displayName = 'TabIcon';

const BottomTabBar = memo(() => {
  const { theme } = useTheme();

  // Memoize responsive styles
  const responsiveStyles = useMemo(() => StyleSheet.create({
    safeArea: {
      flexGrow: 1,
      backgroundColor: '#000000',
    },
    tabBar: {
      position: 'absolute',
      height: theme.sizes.buttonHeight + theme.spacing.md,
      backgroundColor: theme.colors.bottomTabBackground,
      borderTopWidth: 0,
      // borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: -3},
      shadowOpacity: theme.isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 15,
    },
    tabLabel: {
      fontSize: theme.typography.tiny,
      fontWeight: '600',
      marginTop: -2,
      marginBottom: 2,
      letterSpacing: 0.3,
    },
    iconContainer: {
      width: theme.sizes.iconSizeLarge,
      height: theme.sizes.iconSizeLarge,
      justifyContent: 'center',
      marginBottom:2,
      alignItems: 'center',
      borderRadius: theme.sizes.borderRadius,
    },
    activeIconContainer: {
      // backgroundColor: `${theme.colors.primary}20`,
    },
  }), [theme]);

  // Memoize screen options to prevent recreation
  const screenOptions = useMemo(() => ({route}: any) => ({
          tabBarShowLabel: true,
          headerShown: false,
          tabBarStyle: responsiveStyles.tabBar,
          tabBarActiveTintColor: '#F7CE45',
          tabBarInactiveTintColor: 'white',
          tabBarLabelStyle: responsiveStyles.tabLabel,

          
          tabBarIcon: ({focused}) => {
            const iconContainer = (iconName) => (
              <View
                style={[
                  responsiveStyles.iconContainer,
                  focused && responsiveStyles.activeIconContainer,
                ]}>
                <TabIcon focused={focused} iconName={iconName} />
              </View>
            );

            switch (route.name) {
              case 'Home':
                return iconContainer(focused ? 'homeActive' : 'homeInactive');
              case 'Reelz':
                return iconContainer(focused ? 'playActive' : 'playInactive');
              case 'myactivity':
                return iconContainer(focused ? 'bagActive' : 'bagInactive');
              case 'search':
                return iconContainer(focused ? 'searchActive' : 'searchInactive');
              case 'profile':
                return iconContainer(focused ? 'userActive' : 'user');
              default:
                return null;
            }
          },
        }), [responsiveStyles]);
// console.log("Rendering BottomTabBar");
  return (
    <SafeAreaView style={responsiveStyles.safeArea} edges={['bottom']}>
      <Tab.Navigator
        id={undefined}
        screenOptions={screenOptions}
        
        detachInactiveScreens={Platform.OS === 'android'}
        backBehavior="initialRoute"
        sceneContainerStyle={{
          backgroundColor: '#000000',
        }}>
        <Tab.Screen
          name="Home"
          component={Dashboard}
          options={{
            freezeOnBlur: true,
            tabBarLabel: 'Home',
          }}
        />

        <Tab.Screen
          name="Reelz"
          component={GuestLectureScreen}
          // component={RoughWork}
          options={() => ({
            unmountOnBlur: true,
            tabBarStyle: { display: 'none' },
          })}
        />

        <Tab.Screen 
          name="search" 
          component={Categories} 
          options={{
            tabBarLabel: 'Categories',
          }}
        />
        <Tab.Screen 
          name="myactivity" 
          component={MyActivityStack} 
          options={{
            tabBarLabel: 'Activity',
          }}
        />

        <Tab.Screen
          name="SellerInfo"
          component={ViewSellerProfile}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: {display: 'none'},
          }}
        />
        <Tab.Screen
          name="GlobalSearch"
          component={GlobalSearch}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: {display: 'none'},
          }}
        />
        <Tab.Screen
          name="reelz"
          component={GuestLectureScreen}
          options={() => ({
            unmountOnBlur: true,
            tabBarStyle: { display: 'none' },
            tabBarItemStyle: {display: 'none'},
          })}
        />

         <Tab.Screen
          name="AccessControlPage"
          component={AccessPage}
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: {display: 'none'},
            tabBarStyle: { display: 'none' },
          }}
        />

        <Tab.Screen 
          name="profile" 
          component={AboutUser} 
          options={{
            tabBarLabel: 'Profile',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
});

BottomTabBar.displayName = 'BottomTabBar';

export default BottomTabBar;
