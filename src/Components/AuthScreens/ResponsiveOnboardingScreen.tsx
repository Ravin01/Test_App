import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  BackHandler, 
  Animated,
  Dimensions,
  FlatList 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton } from '../ResponsiveComponents/ResponsiveComponents';

const onboardingData = [
  {
    id: 1,
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly and efficiently',
    image: require('../../assets/images/bro.png'),
  },
  {
    id: 2,
    title: 'Wide Selection',
    description: 'Choose from thousands of products and services',
    image: require('../../assets/images/bro.png'),
  },
  {
    id: 3,
    title: 'Easy Payments',
    description: 'Multiple payment options for your convenience',
    image: require('../../assets/images/bro.png'),
  },
];

export default function ResponsiveOnboardingScreen() {
  const { theme } = useTheme();
  const { createStyles } = useThemedStyles();
  const navigation = useNavigation();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { width } = Dimensions.get('window');

  const styles = createStyles((theme, accessibility) => ({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    slideContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    imageContainer: {
      flex: 0.6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    onboardingImage: {
      width: theme.isTablet ? 300 : 250,
      height: theme.isTablet ? 300 : 250,
      resizeMode: 'contain',
    },
    contentContainer: {
      flex: 0.4,
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
    },
    title: {
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    description: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.xl,
    },
    navigationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    paginationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    activeDot: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
    inactiveDot: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.3,
    },
    skipButton: {
      padding: theme.spacing.sm,
    },
    nextButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
  }));

  useEffect(() => {
    const backAction = () => {
      if (currentIndex > 0) {
        goToPrevious();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentIndex]);

  const goToNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
    }
  };

  const handleGetStarted = () => {
    Animated.fadeOut(fadeAnim, {
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate('ResponsiveLogin');
    });
  };

  const handleSkip = () => {
    navigation.navigate('ResponsiveLogin');
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slideContainer, { width }]}>
      <View style={styles.imageContainer}>
        <Image 
          source={item.image} 
          style={styles.onboardingImage}
          {...getAccessibilityProps(`Onboarding illustration ${item.id}`, item.description)}
        />
      </View>
      
      <View style={styles.contentContainer}>
        <ResponsiveText variant="title" style={styles.title}>
          {item.title}
        </ResponsiveText>
        
        <ResponsiveText variant="body" style={styles.description}>
          {item.description}
        </ResponsiveText>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex ? styles.activeDot : styles.inactiveDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={onboardingData}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          bounces={false}
        />

        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkip}
            {...getAccessibilityProps('Skip button', 'Skip onboarding and go to login')}
          >
            <ResponsiveText variant="body" style={{ color: theme.colors.textSecondary }}>
              Skip
            </ResponsiveText>
          </TouchableOpacity>

          {renderPagination()}

          <ResponsiveButton
            variant="primary"
            style={styles.nextButton}
            onPress={goToNext}
            {...getAccessibilityProps(
              currentIndex === onboardingData.length - 1 ? 'Get started button' : 'Next button',
              currentIndex === onboardingData.length - 1 ? 'Get started with the app' : 'Go to next onboarding slide'
            )}
          >
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </ResponsiveButton>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}